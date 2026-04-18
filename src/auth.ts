/**
 * Express middleware for MCP auth token validation.
 * Rejects requests without a valid Authorization header.
 */

import { Request, Response, NextFunction } from "express";

export function createAuthMiddleware(mcpAuthToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch || tokenMatch[1] !== mcpAuthToken) {
      res.status(401).json({ error: "Invalid or missing bearer token" });
      return;
    }

    next();
  };
}
