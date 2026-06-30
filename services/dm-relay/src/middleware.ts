/**
 * Express middleware for the DM relay service.
 */

import { Request, Response, NextFunction } from 'express';
import { generateRequestId } from './utils';
import { logger } from './logger';

// Extend Express Request type to include custom properties
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      userId?: string;
    }
  }
}

/**
 * Add request ID for logging and tracing.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

/**
 * Log incoming requests and response summaries at info level.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  logger.info({ requestId: req.requestId, method: req.method, path: req.path, ip: req.ip }, 'Incoming request');

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ...(req.userId && { userId: req.userId }),
    }, 'Request completed');
  });

  next();
}

/**
 * Global error handler — logs full stack trace at error level.
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({ requestId: req.requestId, err: error }, 'Unhandled error');

  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment ? error.message : 'Internal server error';

  res.status(500).json({
    error: 'Internal Server Error',
    message,
    requestId: req.requestId,
  });
}

/**
 * Handle 404 errors.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.requestId,
  });
}

/**
 * Validate content type for POST requests.
 */
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'POST') {
    if (!req.is('application/json')) {
      return res.status(400).json({
        error: 'Invalid Content-Type',
        message: 'Content-Type must be application/json',
        requestId: req.requestId,
      });
    }
  }
  next();
}
