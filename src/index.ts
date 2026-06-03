#!/usr/bin/env node

// MrDoc MCP Server - Entry Point

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { MrDocClient } from "./client.js";
import { getToolDefinitions, handleToolCall } from "./tools.js";

// Load configuration
const config = loadConfig();

// Create MrDoc client
const client = new MrDocClient(config);

// Create server instance
const server = new Server(
  {
    name: "mrdoc-mcp-server",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getToolDefinitions(),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(client, name, args || {});
});

// Start the server
async function main() {
  if (!config.token) {
    console.error("Error: MRDOC_TOKEN environment variable is not set");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MrDoc MCP Server v2.0.0 started");
}

main().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
