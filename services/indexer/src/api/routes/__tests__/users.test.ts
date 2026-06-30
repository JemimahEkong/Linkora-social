import { createUsersRouter } from "../users";
import { Database } from "../../../db";

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
}

async function getBlocked(address: string, query: Record<string, unknown>, db: Database) {
  const router = createUsersRouter(db);
  const layer = router.stack.find((item) => item.route?.path === "/:address/blocked");
  const handler = layer?.route?.stack[0].handle;
  if (!handler) {
    throw new Error("blocked route handler not found");
  }

  const req = { params: { address }, query };
  const res = createMockResponse();
  await handler(req as never, res as never, jest.fn());
  return res;
}

async function getDmKey(address: string, db: Database) {
  const router = createUsersRouter(db);
  const layer = router.stack.find((item) => item.route?.path === "/:address/dm-key");
  const handler = layer?.route?.stack[0].handle;
  if (!handler) {
    throw new Error("dm-key route handler not found");
  }

  const req = { params: { address } };
  const res = createMockResponse();
  await handler(req as never, res as never, jest.fn());
  return res;
}

describe("users API", () => {
  let db: jest.Mocked<Database>;

  beforeEach(() => {
    db = {
      getBlockedUsers: jest.fn().mockResolvedValue({
        blocked: ["GBLOCKED1", "GBLOCKED2"],
        total: 2,
      }),
      getDmKey: jest.fn().mockResolvedValue("x25519keyhexvalue"),
    } as unknown as jest.Mocked<Database>;
  });

  describe("GET /users/:address/blocked", () => {
    it("returns blocked users with default limit and offset", async () => {
      const res = await getBlocked("GUSER123", {}, db);

      expect(db.getBlockedUsers).toHaveBeenCalledWith("GUSER123", 20, 0);
      expect(res.json).toHaveBeenCalledWith({
        address: "GUSER123",
        blocked: ["GBLOCKED1", "GBLOCKED2"],
        total: 2,
        limit: 20,
        offset: 0,
        has_more: false,
      });
    });

    it("returns blocked users with custom limit and offset", async () => {
      const res = await getBlocked("GUSER123", { limit: "5", offset: "10" }, db);

      expect(db.getBlockedUsers).toHaveBeenCalledWith("GUSER123", 5, 10);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 10,
        })
      );
    });

    it("rejects invalid limit or offset", async () => {
      const res1 = await getBlocked("GUSER123", { limit: "-1" }, db);
      expect(res1.status).toHaveBeenCalledWith(400);

      const res2 = await getBlocked("GUSER123", { offset: "abc" }, db);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it("rejects missing address", async () => {
      const res = await getBlocked("", {}, db);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("GET /users/:address/dm-key", () => {
    it("returns DM key if found", async () => {
      const res = await getDmKey("GUSER123", db);

      expect(db.getDmKey).toHaveBeenCalledWith("GUSER123");
      expect(res.json).toHaveBeenCalledWith({
        address: "GUSER123",
        x25519_pubkey: "x25519keyhexvalue",
      });
    });

    it("returns 404 if not found", async () => {
      db.getDmKey.mockResolvedValueOnce(null);
      const res = await getDmKey("GUSER123", db);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "DM key not found",
        code: "NOT_FOUND",
      });
    });

    it("rejects missing address", async () => {
      const res = await getDmKey("", db);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
