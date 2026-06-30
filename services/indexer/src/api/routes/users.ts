import { Router, Request, Response } from "express";
import { Database } from "../../db";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

function parsePagination(
  query: Record<string, unknown>
): { limit: number; offset: number } | { error: string; code: string } {
  const rawLimit = query.limit !== undefined ? Number(query.limit) : DEFAULT_LIMIT;
  const rawOffset = query.offset !== undefined ? Number(query.offset) : DEFAULT_OFFSET;

  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    return { error: "limit must be a positive integer", code: "INVALID_QUERY" };
  }
  if (rawLimit > MAX_LIMIT) {
    return { error: `limit cannot exceed ${MAX_LIMIT}`, code: "LIMIT_EXCEEDED" };
  }
  if (!Number.isInteger(rawOffset) || rawOffset < 0) {
    return { error: "offset must be a non-negative integer", code: "INVALID_QUERY" };
  }

  return { limit: rawLimit, offset: rawOffset };
}

export function createUsersRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /users/:address/blocked
   * Returns accounts blocked by the given address.
   */
  router.get("/:address/blocked", async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;

    if (!address || typeof address !== "string" || address.trim() === "") {
      res.status(400).json({ error: "address is required", code: "INVALID_ADDRESS" });
      return;
    }

    const pagination = parsePagination(req.query as Record<string, unknown>);

    if ("error" in pagination) {
      res.status(400).json(pagination);
      return;
    }

    const { limit, offset } = pagination;
    const { blocked, total } = await db.getBlockedUsers(address, limit, offset);

    res.json({
      address,
      blocked,
      total,
      limit,
      offset,
      has_more: offset + blocked.length < total,
    });
  });

  /**
   * GET /users/:address/dm-key
   * Returns the x25519 public key hex for the given address.
   */
  router.get("/:address/dm-key", async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;

    if (!address || typeof address !== "string" || address.trim() === "") {
      res.status(400).json({ error: "address is required", code: "INVALID_ADDRESS" });
      return;
    }

    const pubkey = await db.getDmKey(address);
    if (!pubkey) {
      res.status(404).json({ error: "DM key not found", code: "NOT_FOUND" });
      return;
    }

    res.json({ address, x25519_pubkey: pubkey });
  });

  return router;
}
