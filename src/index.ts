#!/usr/bin/env node
/**
 * MarketMySTR MCP Server - Production Entry Point
 *
 * Stateless HTTP server that integrates with GoHighLevel API.
 * Requires GHL_PIT_TOKEN, GHL_LOCATION_ID, and MCP_AUTH_TOKEN env vars.
 * Listens on PORT (default 3000).
 */

import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import { createAuthMiddleware } from "./auth.js";

// Validate required env vars at startup
function validateEnv(): { pit: string; locationId: string; mcpAuthToken: string; port: number } {
  const pit = process.env.GHL_PIT_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  const mcpAuthToken = process.env.MCP_AUTH_TOKEN;
  const port = parseInt(process.env.PORT || "3000", 10);

  const errors: string[] = [];
  if (!pit) errors.push("GHL_PIT_TOKEN not set");
  if (!locationId) errors.push("GHL_LOCATION_ID not set");
  if (!mcpAuthToken) errors.push("MCP_AUTH_TOKEN not set");

  if (errors.length > 0) {
    console.error("Configuration errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  return { pit, locationId, mcpAuthToken, port };
}

async function main() {
  const { pit, locationId, mcpAuthToken, port } = validateEnv();

  // Create Express app
  const app = express();
  app.use(express.json());

  // Auth middleware for all /mcp requests
  const authMiddleware = createAuthMiddleware(mcpAuthToken);

  // Health check (no auth required)
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "marketmystr-mcp-server" });
  });

  // MCP handler with stateless transport
  app.post("/mcp", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Create new transport for each request (stateless)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });

      // Clean up transport on connection close
      res.on("close", () => {
        transport.close();
      });

      // Create MCP server with GHL credentials
      const server = createMcpServer(pit, locationId);

      // Connect server to transport
      await server.connect(transport);

      // Handle the request
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP handler error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Start server
  app.listen(port, () => {
    console.error(`MarketMySTR MCP Server listening on port ${port}`);
    console.error(`Health check: GET http://localhost:${port}/health`);
    console.error(`MCP endpoint: POST http://localhost:${port}/mcp`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
