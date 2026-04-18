/**
 * Contact tools: search, get, create, upsert, update, add tags.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GHLClient } from "../ghl-client.js";

const SearchContactsInputSchema = z
  .object({
    query: z.string().describe("Search string (name, email, phone)"),
    limit: z.number().int().min(1).max(100).default(20).describe("Results per page")
  })
  .strict();

const GetContactInputSchema = z
  .object({
    contactId: z.string().describe("Contact ID")
  })
  .strict();

const CreateContactInputSchema = z
  .object({
    firstName: z.string().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    tags: z.array(z.string()).optional().describe("Tags to assign"),
    customFields: z.record(z.string()).optional().describe("Custom field values (key-value)"),
    source: z.string().optional().describe("Source/channel")
  })
  .strict();

const UpsertContactInputSchema = z
  .object({
    firstName: z.string().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    tags: z.array(z.string()).optional().describe("Tags to assign"),
    customFields: z.record(z.string()).optional().describe("Custom field values"),
    source: z.string().optional().describe("Source/channel")
  })
  .strict();

const UpdateContactInputSchema = z
  .object({
    contactId: z.string().describe("Contact ID"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    customFields: z.record(z.string()).optional().describe("Custom field values")
  })
  .strict();

const AddContactTagsInputSchema = z
  .object({
    contactId: z.string().describe("Contact ID"),
    tags: z.array(z.string()).describe("Tags to add")
  })
  .strict();

export function registerContactTools(server: McpServer, client: GHLClient) {
  server.registerTool(
    "marketmystr_search_contacts",
    {
      title: "Search Contacts",
      description: "Search for contacts by name, email, or phone.",
      inputSchema: SearchContactsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const body = {
          locationId: client.locationId,
          query: params.query,
          pageLimit: params.limit
        };
        const result = await client.request<any>("/contacts/search", "POST", body);

        const contacts = result.contacts || [];
        const total = result.total || contacts.length;

        const output = {
          total,
          count: contacts.length,
          contacts: contacts.map((c: any) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            tags: c.tags || []
          }))
        };

        let text = `# Contact Search: "${params.query}"\n\nFound ${total} contacts (showing ${contacts.length})\n\n`;
        for (const c of contacts) {
          text += `## ${c.firstName} ${c.lastName || ""} (${c.id})\n`;
          text += `- Email: ${c.email || "N/A"}\n`;
          text += `- Phone: ${c.phone || "N/A"}\n`;
          if (c.tags?.length) text += `- Tags: ${c.tags.join(", ")}\n`;
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
    "marketmystr_get_contact",
    {
      title: "Get Contact",
      description: "Retrieve a single contact by ID.",
      inputSchema: GetContactInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const result = await client.request<any>(`/contacts/${params.contactId}`, "GET");
        const contact = result.contact || result;

        const output = {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          tags: contact.tags || [],
          customFields: contact.customFields || {},
          source: contact.source
        };

        let text = `# Contact: ${contact.firstName} ${contact.lastName || ""}\n\n`;
        text += `**ID**: ${contact.id}\n`;
        text += `**Email**: ${contact.email || "N/A"}\n`;
        text += `**Phone**: ${contact.phone || "N/A"}\n`;
        if (contact.tags?.length) text += `**Tags**: ${contact.tags.join(", ")}\n`;

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
    "marketmystr_create_contact",
    {
      title: "Create Contact",
      description:
        "Create a new contact. Not idempotent — will create duplicates if called multiple times with same data.",
      inputSchema: CreateContactInputSchema,
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
          locationId: client.locationId,
          firstName: params.firstName
        };
        if (params.lastName) body.lastName = params.lastName;
        if (params.email) body.email = params.email;
        if (params.phone) body.phone = params.phone;
        if (params.tags?.length) body.tags = params.tags;
        if (params.customFields) body.customFields = params.customFields;
        if (params.source) body.source = params.source;

        const result = await client.request<any>("/contacts/", "POST", body);
        const contact = result.contact || result;

        const output = {
          id: contact.id,
          firstName: contact.firstName,
          email: contact.email
        };

        return {
          content: [
            {
              type: "text",
              text: `Created contact "${contact.firstName}" (ID: ${contact.id})`
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

  server.registerTool(
    "marketmystr_upsert_contact",
    {
      title: "Upsert Contact",
      description:
        "Create or update a contact (idempotent by email/phone). Preferred over create when duplicates must be avoided.",
      inputSchema: UpsertContactInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const body: any = {
          locationId: client.locationId,
          firstName: params.firstName
        };
        if (params.lastName) body.lastName = params.lastName;
        if (params.email) body.email = params.email;
        if (params.phone) body.phone = params.phone;
        if (params.tags?.length) body.tags = params.tags;
        if (params.customFields) body.customFields = params.customFields;
        if (params.source) body.source = params.source;

        const result = await client.request<any>("/contacts/upsert", "POST", body);
        const contact = result.contact || result;
        const isNew = result.new === true;

        const output = {
          id: contact.id,
          firstName: contact.firstName,
          email: contact.email,
          action: isNew ? "created" : "updated"
        };

        return {
          content: [
            {
              type: "text",
              text: `Contact ${output.action}: "${contact.firstName}" (ID: ${contact.id})`
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

  server.registerTool(
    "marketmystr_update_contact",
    {
      title: "Update Contact",
      description: "Partially update an existing contact by ID.",
      inputSchema: UpdateContactInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        const body: any = {};
        if (params.firstName) body.firstName = params.firstName;
        if (params.lastName) body.lastName = params.lastName;
        if (params.email) body.email = params.email;
        if (params.phone) body.phone = params.phone;
        if (params.customFields) body.customFields = params.customFields;

        const result = await client.request<any>(
          `/contacts/${params.contactId}`,
          "PUT",
          body
        );
        const contact = result.contact || result;

        return {
          content: [
            {
              type: "text",
              text: `Updated contact "${contact.firstName}" (ID: ${contact.id})`
            }
          ],
          structuredContent: { id: contact.id, firstName: contact.firstName }
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
    "marketmystr_add_contact_tags",
    {
      title: "Add Contact Tags",
      description: "Add tags to an existing contact.",
      inputSchema: AddContactTagsInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params) => {
      try {
        await client.request<any>(
          `/contacts/${params.contactId}/tags`,
          "POST",
          { tags: params.tags }
        );

        return {
          content: [
            {
              type: "text",
              text: `Added ${params.tags.length} tag(s) to contact ${params.contactId}`
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
