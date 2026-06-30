import { TransactionQueue, TxStatusEvent, QueueSigner, RpcClient } from "../queue";

function makeSigner(signFn?: (xdr: string) => Promise<string>): QueueSigner {
  return {
    signTransaction: signFn ?? ((xdr) => Promise.resolve(`signed:${xdr}`)),
  };
}

function makeRpc(opts?: {
  sendStatus?: string;
  confirmStatus?: string;
  failAfterSteps?: number;
}): RpcClient & { sendCalls: string[]; getCalls: string[] } {
  let stepsSent = 0;
  const sendCalls: string[] = [];
  const getCalls: string[] = [];
  return {
    sendCalls,
    getCalls,
    async sendTransaction(signedXdr) {
      sendCalls.push(signedXdr);
      stepsSent++;
      if (opts?.failAfterSteps !== undefined && stepsSent > opts.failAfterSteps) {
        return { hash: "HASH_FAIL", status: "ERROR", errorResultXdr: "bad-xdr" };
      }
      return { hash: `HASH_${stepsSent}`, status: opts?.sendStatus ?? "PENDING" };
    },
    async getTransaction(hash) {
      getCalls.push(hash);
      return { status: opts?.confirmStatus ?? "SUCCESS" };
    },
  };
}

describe("TransactionQueue", () => {
  it("runs a single step: pending → submitted → confirmed", async () => {
    const events: TxStatusEvent[] = [];
    const rpc = makeRpc();
    const queue = new TransactionQueue({ signer: makeSigner(), rpc, pollIntervalMs: 0 });
    queue.on("status", (e) => events.push(e));
    queue.enqueue("XDR_A");

    await queue.run();

    expect(events.map((e) => e.status)).toEqual(["pending", "submitted", "confirmed"]);
    expect(rpc.sendCalls).toHaveLength(1);
    expect(rpc.sendCalls[0]).toBe("signed:XDR_A");
  });

  it("runs multiple steps in order", async () => {
    const events: TxStatusEvent[] = [];
    const rpc = makeRpc();
    const queue = new TransactionQueue({ signer: makeSigner(), rpc, pollIntervalMs: 0 });
    queue.on("status", (e) => events.push(e));
    queue.enqueue("XDR_1").enqueue("XDR_2").enqueue("XDR_3");

    await queue.run();

    const confirmed = events.filter((e) => e.status === "confirmed");
    expect(confirmed).toHaveLength(3);
    expect(confirmed.map((e) => e.index)).toEqual([0, 1, 2]);
  });

  it("emits failed and calls rollbacks on step failure", async () => {
    const rollbackCalls: number[] = [];
    const rpc = makeRpc({ failAfterSteps: 1 }); // step 0 succeeds, step 1 fails
    const queue = new TransactionQueue({ signer: makeSigner(), rpc, pollIntervalMs: 0 });
    const events: TxStatusEvent[] = [];
    queue.on("status", (e) => events.push(e));

    queue.enqueue("XDR_0", async () => {
      rollbackCalls.push(0);
    });
    queue.enqueue("XDR_1", async () => {
      rollbackCalls.push(1);
    });

    await expect(queue.run()).rejects.toThrow(/Step 1 submission failed/);

    const failedEvents = events.filter((e) => e.status === "failed");
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].index).toBe(1);

    // Rollback for completed step 0 must have been called; step 1 never completed
    expect(rollbackCalls).toEqual([0]);
  });

  it("emits failed when signer throws", async () => {
    const failSigner = makeSigner(() => Promise.reject(new Error("user rejected")));
    const rpc = makeRpc();
    const queue = new TransactionQueue({ signer: failSigner, rpc, pollIntervalMs: 0 });
    const events: TxStatusEvent[] = [];
    queue.on("status", (e) => events.push(e));
    queue.enqueue("XDR_X");

    await expect(queue.run()).rejects.toThrow(/Step 0 signing failed: user rejected/);

    expect(events.find((e) => e.status === "failed")?.error).toBe("user rejected");
  });

  it("emits failed when confirmation times out", async () => {
    const rpc = makeRpc({ confirmStatus: "PENDING" });
    const queue = new TransactionQueue({
      signer: makeSigner(),
      rpc,
      pollIntervalMs: 0,
      maxPollAttempts: 2,
    });
    queue.enqueue("XDR_TIMEOUT");

    await expect(queue.run()).rejects.toThrow(/not confirmed after 2 attempts/);
  });

  it("rollbacks are called in reverse order", async () => {
    const order: number[] = [];
    const rpc = makeRpc({ failAfterSteps: 2 }); // steps 0,1 succeed; step 2 fails
    const queue = new TransactionQueue({ signer: makeSigner(), rpc, pollIntervalMs: 0 });

    queue
      .enqueue("XDR_0", () => {
        order.push(0);
      })
      .enqueue("XDR_1", () => {
        order.push(1);
      })
      .enqueue("XDR_2"); // no rollback

    await expect(queue.run()).rejects.toThrow();

    expect(order).toEqual([1, 0]); // reversed
  });
});
