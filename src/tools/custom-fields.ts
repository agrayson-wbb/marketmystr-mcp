/**
 * Custom field tools: list custom fields for mapping.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GHLClient } from "../ghl-client.js";

const ListCustomFieldsInputSchema = z.object({}).strict();

export function registerCustomFieldTools(server: McpServer, client: GHLClient) {
  server.registerTool(
    "marketmystr_list_custom_fields",
    {
      title: "List Custom Fields",
      description:
        "Retrieve all custom fields for this location. Useful for mapping rental agreement data into CRM fields.",
      inputSchema: ListCustomFieldsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const result = await client.request<any>("/locations/customFields", "GET");

        const fields = result.customFields || result.data || [];

        const output = {
          count: fields.length,
          customFields: fields.map((f: any) => ({
            id: f.id,
            name: f.name,
            dataType: f.dataType,
            fieldKey: f.fieldKey,
            placeholder: f.placeholder
          }))
        };

        let text = `# Custom Fields (${fields.length})\n\n`;
        for (const f of fields) {
          text += `## ${f.name} (${f.fieldKey})\n`;
          text += `- Type: ${f.dataType || "text"}\n`;
          if (f.placeholder) text += `- Placeholder: ${f.placeholder}\n`;
          text += "\n";
        }

        return {
          content: [{ type: "text", text }],
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
