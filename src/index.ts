#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PortainerClient } from "./client.js";
import { allTools, handleToolCall } from "./tools/index.js";

// Environment validation
const PORTAINER_URL = process.env.PORTAINER_URL;
const PORTAINER_API_KEY = process.env.PORTAINER_API_KEY;
const WRITE_ENABLED = process.env.PORTAINER_WRITE_ENABLED === "true";

if (!PORTAINER_URL || !PORTAINER_API_KEY) {
  console.error(
    "Error: PORTAINER_URL and PORTAINER_API_KEY environment variables are required"
  );
  process.exit(1);
}

const client = new PortainerClient(PORTAINER_URL, PORTAINER_API_KEY, WRITE_ENABLED);

// Server setup
const server = new Server(
  { name: "portainer-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(client, name, args);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Portainer MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
