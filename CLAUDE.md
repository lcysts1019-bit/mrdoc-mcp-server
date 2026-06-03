# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MrDoc MCP Server (v2.0.0) — an MCP server bridging Claude Code and MrDoc (觅思文档), a self-hosted document management system. Communicates over stdio transport. Uses ES Modules (`"type": "module"`).

## Commands

```bash
npm run build          # tsc compile
npm run dev            # tsc && node dist/index.js
npm start              # node dist/index.js
npm run clean          # rm -rf dist
```

No test suite or linter is configured.

## Architecture

Layered design in `src/`:

- **index.ts** — Entry point. Creates MCP `Server`, registers `ListToolsRequestSchema` and `CallToolRequestSchema` handlers, starts `StdioServerTransport`.
- **tools.ts** — Defines all 12 MCP tools and `handleToolCall()` dispatcher. Each tool validates input via Zod then delegates to the client.
- **client.ts** — `MrDocClient` class. All MrDoc HTTP API interactions. Handles both token auth (`?token=`) and session-based auth (CSRF + login flow with cookies).
- **schemas.ts** — Zod schemas for tool input validation.
- **types.ts** — TypeScript interfaces for MrDoc API responses.
- **config.ts** — Loads env vars: `MRDOC_BASE_URL`, `MRDOC_TOKEN`, `MRDOC_USERNAME`, `MRDOC_PASSWORD`.

Data flow: `index.ts` → `tools.ts` (validate with `schemas.ts`) → `client.ts` (HTTP to MrDoc API).

## Key Patterns

- HTTP client uses native `fetch` (no axios).
- Tool errors are caught and returned as MCP error results (`isError: true`), never thrown.
- Auth: primary is token-based (query param); session auth is used for form submissions requiring CSRF tokens.
- TypeScript strict mode, target ES2022, outputs `.js` + `.d.ts` to `dist/`.

## Configuration

Set via environment variables when registering the MCP server:

```bash
claude mcp add mrdoc \
  -e MRDOC_BASE_URL=http://your-mrdoc-host:port \
  -e MRDOC_TOKEN=your_token \
  -- node path/to/dist/index.js
```

`MRDOC_TOKEN` is required. `MRDOC_BASE_URL` defaults to `http://192.168.9.38:10086`.
