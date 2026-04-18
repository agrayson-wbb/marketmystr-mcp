/**
 * MCP Server instance creation and tool registration.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GHLClient } from "./ghl-client.js";
import { registerLocationTools } from "./tools/location.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerConversationTools } from "./tools/conversations.js";
import { registerWorkflowTools } from "./tools/workflows.js";
import { registerFormTools } from "./tools/forms.js";
import { registerCustomFieldTools } from "./tools/custom-fields.js";

export function createMcpServer(pit: string, locationId: string): McpServer {
  const server = new McpServer({
    name: "marketmystr-mcp-server",
    version: "1.0.0"
  });

  const client = new GHLClient({ pit, locationId });

  // Register all tool groups
  registerLocationTools(server, client);
  registerContactTools(server, client);
  registerConversationTools(server, client);
  registerWorkflowTools(server, client);
  registerFormTools(server, client);
  registerCustomFieldTools(server, client);

  return server;
}
