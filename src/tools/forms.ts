/**
 * Form tools: list form submissions.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GHLClient } from "../ghl-client.js";

const ListFormSubmissionsInputSchema = z
  .object({
    formId: z.string().optional().describe("Filter by form ID"),
    page: z.number().int().min(1).default(1).describe("Page number"),
    limit: z.number().int().min(1).max(100).default(20).describe("Results per page")
  })
  .strict();

export function registerFormTools(server: McpServer, client: GHLClient) {
  server.registerTool(
    "marketmystr_list_form_submissions",
    {
      title: "List Form Submissions",
      description:
        "Retrieve form submissions for this location. Optionally filter by form ID.",
      inputSchema: ListFormSubmissionsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const queryParams: Record<string, any> = {
          page: params.page,
          limit: params.limit
        };
        if (params.formId) {
          queryParams.formId = params.formId;
        }

        const result = await client.request<any>(
          "/forms/submissions",
          "GET",
          undefined,
          queryParams
        );

        const submissions = result.submissions || result.data || [];
        const total = result.total || submissions.length;

        const output = {
          total,
          count: submissions.length,
          page: params.page,
          limit: params.limit,
          submissions: submissions.map((s: any) => ({
            id: s.id,
            formId: s.formId,
            contactId: s.contactId,
            email: s.email,
            createdAt: s.createdAt,
            data: s.data || {}
          }))
        };

        let text = `# Form Submissions (Page ${params.page})\n\n`;
        text += `Found ${total} total submissions (showing ${submissions.length})\n\n`;

        for (const s of submissions) {
          const date = new Date(s.createdAt).toLocaleDateString();
          text += `## ${s.email} - ${date} (${s.id})\n`;
          if (s.formId) text += `- Form: ${s.formId}\n`;
          if (s.contactId) text += `- Contact: ${s.contactId}\n`;
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
