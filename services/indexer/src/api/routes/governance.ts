import { Router, Request, Response } from "express";
import { Database } from "../../db";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

export function createGovernanceRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /api/governance/proposals
   * Returns a paginated list of governance proposals.
   */
  router.get("/proposals", async (req: Request, res: Response): Promise<void> => {
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
      res
        .status(400)
        .json({ error: "offset must be a non-negative integer", code: "INVALID_QUERY" });
      return;
    }

    try {
      const { proposals, total } = await db.listGovernanceProposals({
        limit: rawLimit,
        offset: rawOffset,
      });

      // Stringify BigInt values to avoid JSON.stringify crash if no global polyfill is active
      const serializedProposals = proposals.map((p) => ({
        ...p,
        proposal_id: p.proposal_id.toString(),
        new_value: p.new_value.toString(),
        votes_for: p.votes_for.toString(),
        votes_against: p.votes_against.toString(),
      }));

      res.json({
        proposals: serializedProposals,
        total,
        limit: rawLimit,
        offset: rawOffset,
        has_more: rawOffset + proposals.length < total,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to list proposals", code: "DATABASE_ERROR" });
    }
  });

  return router;
}
