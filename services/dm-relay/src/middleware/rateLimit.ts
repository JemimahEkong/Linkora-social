/**
 * Rate limiting middleware using express-rate-limit.
 *
 * Environment variables:
 *   RATE_LIMIT_ANON_RPM  - requests per minute for anonymous IPs (default: 100)
 *   RATE_LIMIT_AUTH_RPM  - requests per minute for authenticated users (default: 300)
 */

import { rateLimit } from "express-rate-limit";
import { NextFunction, Request, Response } from "express";

function getClientIP(req: Request): string {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string") {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

const RATE_LIMIT_ANON_RPM = parseInt(process.env.RATE_LIMIT_ANON_RPM || "100", 10);
const RATE_LIMIT_AUTH_RPM = parseInt(process.env.RATE_LIMIT_AUTH_RPM || "300", 10);

export const anonLimiter = rateLimit({
  windowMs: 60_000,
  limit: RATE_LIMIT_ANON_RPM,
  keyGenerator: (req: Request) => getClientIP(req),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Rate Limit Exceeded",
      message: `Max ${RATE_LIMIT_ANON_RPM} requests per minute per IP`,
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: RATE_LIMIT_AUTH_RPM,
  keyGenerator: (req: Request) => (req as any).stellarAddress || getClientIP(req),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Rate Limit Exceeded",
      message: `Max ${RATE_LIMIT_AUTH_RPM} requests per minute per authenticated user`,
    });
  },
});

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  if ((req as any).stellarAddress) {
    return authLimiter(req, res, next);
  }
  return anonLimiter(req, res, next);
}
