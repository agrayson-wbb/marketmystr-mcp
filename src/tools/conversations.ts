/**
 * Conversation tools: send SMS and email messages.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GHLClient } from "../ghl-client.js";

const SendSMSInputSchema = z
  .object({
    contactId: z.string().describe("Contact ID"),
    message: z.string().describe("SMS message text")
  })
  .strict();

const SendEmailInputSchema = z
  .object({
    contactId: z.string().describe("Contact ID"),
    subject: z.string().describe("Email subject"),
    message: z.string().optional().describe("Plain text message body"),
    html: z.string().optional().describe("HTML message body")
  })
  .strict();

export function registerConversationTools(server: McpServer, client: GHLClient) {
  server.registerTool(
    "marketmystr_send_sms",
    {
      title: "Send SMS",
      description: "Send an SMS message to a contact.",
      inputSchema: SendSMSInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const body = {
          type: "SMS",
          contactId: params.contactId,
          message: params.message
        };

        const result = await client.request<any>("/conversations/messages", "POST", body);

        return {
          content: [
            {
              type: "text",
              text: `SMS sent to contact ${params.contactId}`
            }
          ],
          structuredContent: { messageId: result.id || result.messageId }
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
    "marketmystr_send_email",
    {
      title: "Send Email",
      description: "Send an email message to a contact. Provide either plain text or HTML.",
      inputSchema: SendEmailInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const body: any = {
          type: "Email",
          contactId: params.contactId,
          subject: params.subject
        };

        if (params.html) {
          body.html = params.html;
        } else if (params.message) {
          body.message = params.message;
        } else {
          throw new Error("Either 'message' or 'html' must be provided");
        }

        const result = await client.request<any>("/conversations/messages", "POST", body);

        return {
          content: [
            {
              type: "text",
              text: `Email sent to contact ${params.contactId}: "${params.subject}"`
            }
          ],
          structuredContent: { messageId: result.id || result.messageId }
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
