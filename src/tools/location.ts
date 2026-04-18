/**
 * Location tools: get location info (identity check).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GHLClient } from "../ghl-client.js";

export function registerLocationTools(server: McpServer, client: GHLClient) {
  server.registerTool(
    "marketmystr_get_location",
    {
      title: "Get Location Info",
      description:
        "Retrieve details about the current GHL location. Useful as an identity check to confirm API connection and location setup.",
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const location = await client.request<any>("/locations", "GET");

        const output = {
          id: location.id || "unknown",
          name: location.name || "unknown",
          email: location.email,
          phone: location.phone,
          website: location.website
        };

        return {
          content: [
            {
              type: "text",
              text: `# Location Info\n\n**Name**: ${output.name}\n**ID**: ${output.id}\n**Email**: ${
                output.email || "N/A"
              }\n**Phone**: ${output.phone || "N/A"}\n**Website**: ${output.website || "N/A"}`
            }
          ],
          structuredContent: output
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          isError: true
        };
      }
    }
  );
}
