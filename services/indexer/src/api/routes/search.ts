import { Router, Request, Response } from "express";
import { Database } from "../../db";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

/**
 * GET /search/posts?q=<query>&limit=<n>&offset=<n>
 *
 * Full-text search over post content.  Results are ordered by ts_rank
 * (relevance descending), then recency.
 *
 * Query parameters:
 *   q       - required, non-empty search string (sanitised server-side)
 *   limit   - optional, 1–100, default 20
 *   offset  - optional, ≥0, default 0
 *
 * Response matches the existing list shape: { posts, total, limit, offset, has_more }
 */
export function createSearchRouter(db: Database): Router {
  const router = Router();

  router.get("/posts", async (req: Request, res: Response): Promise<void> => {
    const rawQ = req.query.q;
    if (typeof rawQ !== "string" || rawQ.trim() === "") {
      res.status(400).json({ error: "q is required and must be a non-empty string", code: "INVALID_QUERY" });
      return;
    }

    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : DEFAULT_LIMIT;
    const rawOffset = req.query.offset !== undefined ? Number(req.query.offset) : DEFAULT_OFFSET;

    if (!Number.isInteger(rawLimit) || rawLimit < 1) {
      res.status(400).json({ error: "limit must be a positive integer", code: "INVALID_QUERY" });
      return;
    }
    if (rawLimit > MAX_LIMIT) {
      res.status(400).json({ error: `limit cannot exceed ${MAX_LIMIT}`, code: "LIMIT_EXCEEDED" });
      return;
    }
    if (!Number.isInteger(rawOffset) || rawOffset < 0) {
      res.status(400).json({ error: "offset must be a non-negative integer", code: "INVALID_QUERY" });
      return;
    }

    const { posts, total } = await db.searchPosts({
      q: rawQ,
      limit: rawLimit,
      offset: rawOffset,
    });

    // Serialise BigInt fields to strings so JSON.stringify does not throw.
    // This mirrors what the pg driver returns for BIGINT columns in production.
    const serialised = posts.map((p) => ({
      ...p,
      id: p.id.toString(),
      tip_total: p.tip_total.toString(),
      like_count: p.like_count.toString(),
    }));

    res.json({
      posts: serialised,
      total,
      limit: rawLimit,
      offset: rawOffset,
      has_more: rawOffset + posts.length < total,
    });
  });

  return router;
}
