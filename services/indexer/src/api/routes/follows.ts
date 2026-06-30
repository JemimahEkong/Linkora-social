import { Router, Request, Response } from "express";
import { Database } from "../../db";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parsePagination(
  query: Record<string, unknown>
): { limit: number; cursor?: number } | { error: string; code: string } {
  const rawLimit = query.limit !== undefined ? Number(query.limit) : DEFAULT_LIMIT;
  const rawCursor = query.cursor !== undefined ? Number(query.cursor) : undefined;

  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    return { error: "limit must be a positive integer", code: "INVALID_QUERY" };
  }
  if (rawLimit > MAX_LIMIT) {
    return { error: `limit cannot exceed ${MAX_LIMIT}`, code: "LIMIT_EXCEEDED" };
  }
  if (rawCursor !== undefined && (!Number.isFinite(rawCursor) || rawCursor < 0)) {
    return {
      error: "cursor must be a non-negative number (unix timestamp)",
      code: "INVALID_QUERY",
    };
  }

  return { limit: rawLimit, cursor: rawCursor };
}

export function createFollowsRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /follows/:address/followers?limit=<n>&cursor=<timestamp>
   * Returns accounts that follow the given address with cursor-based pagination.
   * Cursor is a Unix timestamp (seconds) - returns entries created before the cursor.
   */
  router.get("/:address/followers", async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    if ("error" in pagination) {
      res.status(400).json(pagination);
      return;
    }

    const { limit, cursor } = pagination;
    const { followers, total, nextCursor } = await db.getFollowers(address, { limit, cursor });
    res.json({
      address,
      followers,
      total,
      limit,
      cursor: cursor ?? null,
      next_cursor: nextCursor ?? null,
    });
  });

  /**
   * GET /follows/:address/following?limit=<n>&cursor=<timestamp>
   * Returns accounts that the given address follows with cursor-based pagination.
   * Cursor is a Unix timestamp (seconds) - returns entries created before the cursor.
   */
  router.get("/:address/following", async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;
    const pagination = parsePagination(req.query as Record<string, unknown>);

    if ("error" in pagination) {
      res.status(400).json(pagination);
      return;
    }

    const { limit, cursor } = pagination;
    const { following, total, nextCursor } = await db.getFollowing(address, { limit, cursor });
    res.json({
      address,
      following,
      total,
      limit,
      cursor: cursor ?? null,
      next_cursor: nextCursor ?? null,
    });
  });

  return router;
}
