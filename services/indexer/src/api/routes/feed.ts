import { Router, Request, Response } from "express";
import { Pool } from "pg";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function createFeedRouter(pg: Pool): Router {
  const router = Router();

  /**
   * GET /feed/explore?limit=<n>&cursor=<score>
   * Returns posts ordered by weighted score (recency + likes + tips)
   */
  router.get("/explore", async (req: Request, res: Response): Promise<void> => {
    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : DEFAULT_LIMIT;
    const rawCursor = req.query.cursor !== undefined ? Number(req.query.cursor) : undefined;

    if (!Number.isInteger(rawLimit) || rawLimit < 1) {
      res.status(400).json({ error: "limit must be a positive integer", code: "INVALID_QUERY" });
      return;
    }
    if (rawLimit > MAX_LIMIT) {
      res.status(400).json({ error: `limit cannot exceed ${MAX_LIMIT}`, code: "LIMIT_EXCEEDED" });
      return;
    }
    if (rawCursor !== undefined && (isNaN(rawCursor) || rawCursor < 0)) {
      res
        .status(400)
        .json({ error: "cursor must be a non-negative number", code: "INVALID_QUERY" });
      return;
    }

    let query = `
      SELECT 
        id,
        author,
        content,
        tip_total,
        like_count,
        created_at,
        score
      FROM post_scores
    `;
    const params: (number | string)[] = [];
    let paramIndex = 1;

    if (rawCursor !== undefined) {
      query += ` WHERE score < $${paramIndex}`;
      params.push(rawCursor);
      paramIndex++;
    }

    query += ` ORDER BY score DESC LIMIT $${paramIndex}`;
    params.push(rawLimit);

    const result = await pg.query(query, params);

    res.json({
      posts: result.rows.map((row) => ({
        id: row.id,
        author: row.author,
        content: row.content,
        tip_total: row.tip_total,
        like_count: row.like_count,
        created_at: row.created_at,
        score: row.score,
      })),
      has_more: result.rows.length === rawLimit,
      next_cursor: result.rows.length > 0 ? result.rows[result.rows.length - 1].score : null,
    });
  });

  /**
   * GET /feed/following/:address?limit=<n>&cursor=<timestamp>
   * Returns posts from followed accounts ordered by recency
   */
  router.get("/following/:address", async (req: Request, res: Response): Promise<void> => {
    const address = req.params.address;
    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : DEFAULT_LIMIT;
    const rawCursor = req.query.cursor !== undefined ? req.query.cursor : undefined;

    if (!address || typeof address !== "string") {
      res.status(400).json({ error: "address is required", code: "INVALID_ADDRESS" });
      return;
    }

    if (!Number.isInteger(rawLimit) || rawLimit < 1) {
      res.status(400).json({ error: "limit must be a positive integer", code: "INVALID_QUERY" });
      return;
    }
    if (rawLimit > MAX_LIMIT) {
      res.status(400).json({ error: `limit cannot exceed ${MAX_LIMIT}`, code: "LIMIT_EXCEEDED" });
      return;
    }

    let query = `
      SELECT 
        p.id,
        p.author,
        p.content,
        p.tip_total,
        p.like_count,
        p.created_at
      FROM posts p
      INNER JOIN follows f ON p.author = f.followee
      WHERE f.follower = $1 AND p.deleted_at IS NULL
    `;
    const params: (string | Date)[] = [address];
    let paramIndex = 2;

    if (rawCursor !== undefined) {
      query += ` AND p.created_at < $${paramIndex}`;
      params.push(new Date(rawCursor as string));
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex}`;
    params.push(rawLimit);

    const result = await pg.query(query, params);

    res.json({
      posts: result.rows.map((row) => ({
        id: row.id,
        author: row.author,
        content: row.content,
        tip_total: row.tip_total,
        like_count: row.like_count,
        created_at: row.created_at,
      })),
      has_more: result.rows.length === rawLimit,
      next_cursor: result.rows.length > 0 ? result.rows[result.rows.length - 1].created_at : null,
    });
  });

  return router;
}
