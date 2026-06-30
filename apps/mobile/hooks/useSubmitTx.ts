import { useCallback } from "react";
import { useNetwork } from "./useNetwork";
import { useToast } from "../context/ToastContext";

interface WalletKitWithSigning {
  signAndSubmitTransaction?: (opts: {
    txXdr: string;
  }) => Promise<{ hash?: string; txHash?: string }>;
  signTransaction?: (opts: { txXdr: string }) => Promise<{
    signedTxXdr?: string;
    signedXdr?: string;
    signedTx?: string;
  }>;
}

interface StellarServerWithSubmit {
  submitTransaction: (signedXdr: string) => Promise<{ hash?: string }>;
}

export function useSubmitTx() {
  const { rpcUrl } = useNetwork();
  const { showPending, showSuccess, showError } = useToast();

  const submitTx = useCallback(
    async (txXdr: string): Promise<string> => {
      showPending();
      try {
        const kit = (
          globalThis as unknown as {
            __LINKORA_WALLET_KIT__?: WalletKitWithSigning;
          }
        ).__LINKORA_WALLET_KIT__;

        let txHash = "";

        if (kit && typeof kit.signAndSubmitTransaction === "function") {
          const res = await kit.signAndSubmitTransaction({ txXdr });
          txHash = res?.hash ?? res?.txHash ?? "";
        } else if (kit && typeof kit.signTransaction === "function") {
          const signed = await kit.signTransaction({ txXdr });
          const signedXdr = signed?.signedTxXdr ?? signed?.signedXdr ?? signed?.signedTx;
          if (!signedXdr) throw new Error("Wallet did not return signed transaction XDR");

          const { rpc } = await import("@stellar/stellar-sdk");
          const server = new rpc.Server(rpcUrl);
          const submitRes = await (server as unknown as StellarServerWithSubmit).submitTransaction(
            signedXdr
          );
          txHash = submitRes?.hash ?? "";
        } else {
          throw new Error("Wallet signing not available in this environment");
        }

        showSuccess(txHash);
        return txHash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to submit transaction";
        showError(msg);
        throw err;
      }
    },
    [rpcUrl, showPending, showSuccess, showError]
  );

  return submitTx;
}
