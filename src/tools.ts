// Tool definitions and handlers for MrDoc MCP Server

import { MrDocClient } from "./client.js";
import {
  SearchDocsSchema,
  GetDocSchema,
  GetDocContentSchema,
  ListProjectsSchema,
  ListDocsSchema,
  GetProjectDocsSchema,
  CreateDocSchema,
  UpdateDocSchema,
  GetProjectSchema,
  GetSelfDocsSchema,
  CreateProjectSchema,
  UploadImgSchema,
} from "./schemas.js";

// Tool definition type
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// Tool result type (compatible with MCP SDK)
export interface ToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

// Helper to create success result
function success(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

// Helper to create error result
function error(message: string): ToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

// Get all tool definitions
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "search_docs",
      description: "Search documents in MrDoc. Returns a list of matching documents with ID, title, and excerpt.",
      inputSchema: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "Search keyword" },
          project_id: { type: "number", description: "Project/knowledge space ID to limit search scope" },
          page: { type: "number", default: 1, description: "Page number" },
          page_size: { type: "number", default: 20, description: "Items per page" },
        },
        required: ["keyword"],
      },
    },
    {
      name: "get_doc",
      description: "Get document metadata (title, creation time, modification time, etc.) without content.",
      inputSchema: {
        type: "object",
        properties: {
          doc_id: { type: "number", description: "Document ID" },
        },
        required: ["doc_id"],
      },
    },
    {
      name: "get_doc_content",
      description: "Get the full document content in Markdown format. Used for reading and analyzing documents.",
      inputSchema: {
        type: "object",
        properties: {
          doc_id: { type: "number", description: "Document ID" },
        },
        required: ["doc_id"],
      },
    },
    {
      name: "list_projects",
      description: "List all projects/knowledge spaces. Returns project list with ID, name, description, etc.",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "number", default: 1, description: "Page number" },
          page_size: { type: "number", default: 20, description: "Items per page" },
        },
      },
    },
    {
      name: "get_project",
      description: "Get detailed project information, including document directory structure.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "Project/knowledge space ID" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "list_docs",
      description: "List all documents in a project. Returns hierarchical document structure.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "Project/knowledge space ID" },
          page: { type: "number", default: 1, description: "Page number" },
          page_size: { type: "number", default: 20, description: "Items per page" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "get_project_docs",
      description: "Get paginated document list for a project. Returns document ID, title, creation time, modification time, etc.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "Project/knowledge space ID" },
          page: { type: "number", default: 1, description: "Page number" },
          page_size: { type: "number", default: 20, description: "Items per page" },
        },
        required: ["project_id"],
      },
    },
    {
      name: "create_doc",
      description: "Create a new document in MrDoc. Requires project ID and document content. Returns the created document ID.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "Project/knowledge space ID" },
          title: { type: "string", description: "Document title" },
          content: { type: "string", description: "Document content (Markdown format)" },
        },
        required: ["project_id", "title", "content"],
      },
    },
    {
      name: "update_doc",
      description: "Update an existing document in MrDoc. Can update title and/or content.",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "number", description: "Project/knowledge space ID" },
          doc_id: { type: "number", description: "Document ID" },
          title: { type: "string", description: "Document title" },
          content: { type: "string", description: "Document content (Markdown format)" },
        },
        required: ["project_id", "doc_id"],
      },
    },
    {
      name: "get_self_docs",
      description: "Get current user's personal document list. Returns all documents created or participated by the user.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "create_project",
      description: "Create a new project/knowledge space. Returns the created project ID.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Project name" },
          desc: { type: "string", description: "Project description" },
          role: { type: "number", description: "Project permission: 1=public, 2=private", default: 2 },
        },
        required: ["name"],
      },
    },
    {
      name: "upload_img",
      description: "Upload an image to MrDoc. Returns the image access URL.",
      inputSchema: {
        type: "object",
        properties: {
          image_base64: { type: "string", description: "Base64 encoded image string" },
        },
        required: ["image_base64"],
      },
    },
  ];
}

// Handle tool calls
export async function handleToolCall(
  client: MrDocClient,
  name: string,
  args: Record<string, any>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "search_docs": {
        const { keyword, project_id, page, page_size } = SearchDocsSchema.parse(args);
        const result = await client.searchDocs(keyword, project_id, page, page_size);
        return success(JSON.stringify(result, null, 2));
      }

      case "get_doc": {
        const { doc_id } = GetDocSchema.parse(args);
        const result = await client.getDoc(doc_id);
        return success(JSON.stringify(result, null, 2));
      }

      case "get_doc_content": {
        const { doc_id } = GetDocContentSchema.parse(args);
        const content = await client.getDocContent(doc_id);
        return success(content);
      }

      case "list_projects": {
        const { page, page_size } = ListProjectsSchema.parse(args);
        const result = await client.listProjects(page, page_size);
        return success(JSON.stringify(result, null, 2));
      }

      case "get_project": {
        const { project_id } = GetProjectSchema.parse(args);
        const result = await client.getProject(project_id);
        return success(JSON.stringify(result, null, 2));
      }

      case "list_docs": {
        const { project_id } = ListDocsSchema.parse(args);
        const result = await client.listDocs(project_id);
        return success(JSON.stringify(result, null, 2));
      }

      case "get_project_docs": {
        const { project_id, page, page_size } = GetProjectDocsSchema.parse(args);
        const result = await client.getProjectDocs(project_id, page, page_size);
        return success(JSON.stringify(result, null, 2));
      }

      case "create_doc": {
        const { project_id, title, content } = CreateDocSchema.parse(args);
        const result = await client.createDoc(project_id, title, content);
        return success(`Document created successfully!\n\n${JSON.stringify(result, null, 2)}`);
      }

      case "update_doc": {
        const { project_id, doc_id, title, content } = UpdateDocSchema.parse(args);
        const result = await client.updateDoc(project_id, doc_id, title, content);
        return success(`Document updated successfully!\n\n${JSON.stringify(result, null, 2)}`);
      }

      case "get_self_docs": {
        const result = await client.getSelfDocs();
        return success(JSON.stringify(result, null, 2));
      }

      case "create_project": {
        const { name, desc, role } = CreateProjectSchema.parse(args);
        const result = await client.createProject(name, desc, role);
        return success(`Project created successfully!\n\n${JSON.stringify(result, null, 2)}`);
      }

      case "upload_img": {
        const { image_base64 } = UploadImgSchema.parse(args);
        const result = await client.uploadImage(image_base64);
        return success(`Image uploaded successfully!\n\n${JSON.stringify(result, null, 2)}`);
      }

      default:
        return error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return error(`Tool call failed: ${message}`);
  }
}
