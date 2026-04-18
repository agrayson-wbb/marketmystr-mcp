/**
 * Workflow tools: list workflows, add contact to workflow.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GHLClient } from "../ghl-client.js";

const ListWorkflowsInputSchema = z.object({}).strict();

const AddContactToWorkflowInputSchema = z
  .object({
    contactId: z.string().describe("Contact ID"),
    workflowId: z.string().describe("Workflow ID"),
    eventStartTime: z.number().optional().describe("Unix timestamp to start workflow")
  })
  .strict();

export function registerWorkflowTools(server: McpServer, client: GHLClient) {
  server.registerTool(
    "marketmystr_list_workflows",
    {
      title: "List Workflows",
      description: "Retrieve all workflows for this location.",
      inputSchema: ListWorkflowsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const result = await client.request<any>("/workflows", "GET");

        const workflows = result.workflows || result.data || [];

        const output = {
          count: workflows.length,
          workflows: workflows.map((w: any) => ({
            id: w.id,
            name: w.name,
            status: w.status,
            description: w.description
          }))
        };

        let text = `# Workflows (${workflows.length})\n\n`;
        for (const w of workflows) {
          text += `## ${w.name} (${w.id})\n`;
          text += `- Status: ${w.status || "active"}\n`;
          if (w.description) text += `- Description: ${w.description}\n`;
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

  server.registerTool(
    "marketmystr_add_contact_to_workflow",
    {
      title: "Add Contact to Workflow",
      description:
        "Enroll a contact in a workflow. Optionally specify when the workflow should start.",
      inputSchema: AddContactToWorkflowInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const body: any = {};
        if (params.eventStartTime) {
          body.eventStartTime = params.eventStartTime;
        }

        await client.request<any>(
          `/contacts/${params.contactId}/workflow/${params.workflowId}`,
          "POST",
          body
        );

        return {
          content: [
            {
              type: "text",
              text: `Added contact ${params.contactId} to workflow ${params.workflowId}`
            }
          ]
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
