import { Router, Request, Response } from "express";
import { Database } from "../../db";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export function createPostsRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /posts?author=<address>&limit=<n>&cursor=<timestamp>
   * Lists posts with optional author filter and cursor-based pagination.
   * Cursor is a Unix timestamp (seconds) - returns posts created before the cursor.
   */
  router.get("/", async (req: Request, res: Response): Promise<void> => {
    const author = typeof req.query.author === "string" ? req.query.author : undefined;

    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : DEFAULT_LIMIT;
    const cursor = req.query.cursor !== undefined ? Number(req.query.cursor) : undefined;

    if (!Number.isInteger(rawLimit) || rawLimit < 1) {
      res.status(400).json({ error: "limit must be a positive integer", code: "INVALID_QUERY" });
      return;
    }
    if (rawLimit > MAX_LIMIT) {
      res.status(400).json({ error: `limit cannot exceed ${MAX_LIMIT}`, code: "LIMIT_EXCEEDED" });
      return;
    }
    if (cursor !== undefined && (!Number.isFinite(cursor) || cursor < 0)) {
      res.status(400).json({
        error: "cursor must be a non-negative number (unix timestamp)",
        code: "INVALID_QUERY",
      });
      return;
    }

    const { posts, total, hasMore } = await db.listPostsCursor({ author, limit: rawLimit, cursor });
    res.json({
      posts,
      total,
      limit: rawLimit,
      cursor: cursor ?? null,
      has_more: hasMore,
    });
  });

  /**
   * GET /posts/:id
   * Returns a single post by its numeric ID.
   */
  router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;

    let postId: bigint;
    try {
      postId = BigInt(rawId);
      if (postId < BigInt(0)) throw new Error();
    } catch {
      res.status(400).json({ error: "id must be a non-negative integer", code: "INVALID_ID" });
      return;
    }

    const post = await db.getPost(postId);
    if (!post) {
      res.status(404).json({ error: "Post not found", code: "NOT_FOUND" });
      return;
    }

    res.json(post);
  });

  /**
   * GET /posts/:id/reports
   * Returns all reports for a specific post.
   */
  router.get("/:id/reports", async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;

    let postId: bigint;
    try {
      postId = BigInt(rawId);
      if (postId < BigInt(0)) throw new Error();
    } catch {
      res.status(400).json({ error: "id must be a non-negative integer", code: "INVALID_ID" });
      return;
    }

    try {
      const reports = await db.getPostReports(postId);
      res.json({
        post_id: postId.toString(),
        reports,
        total: reports.length,
      });
    } catch (error) {
      console.error(`Error fetching reports for post ${postId}:`, error);
      res.status(500).json({ error: "Failed to fetch reports", code: "INTERNAL_ERROR" });
    }
  });

  return router;
}
