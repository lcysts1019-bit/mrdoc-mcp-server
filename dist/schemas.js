// Zod schemas for MrDoc MCP tools
import { z } from "zod";
// Search documents
export const SearchDocsSchema = z.object({
    keyword: z.string().describe("Search keyword"),
    project_id: z.number().optional().describe("Project/knowledge space ID to limit search scope"),
    page: z.number().default(1).describe("Page number"),
    page_size: z.number().default(20).describe("Items per page"),
});
// Get document metadata
export const GetDocSchema = z.object({
    doc_id: z.number().describe("Document ID"),
});
// Get document content
export const GetDocContentSchema = z.object({
    doc_id: z.number().describe("Document ID"),
});
// List projects
export const ListProjectsSchema = z.object({
    page: z.number().default(1).describe("Page number"),
    page_size: z.number().default(20).describe("Items per page"),
});
// List documents in a project
export const ListDocsSchema = z.object({
    project_id: z.number().describe("Project/knowledge space ID"),
    page: z.number().default(1).describe("Page number"),
    page_size: z.number().default(20).describe("Items per page"),
});
// Get project documents (paginated)
export const GetProjectDocsSchema = z.object({
    project_id: z.number().describe("Project/knowledge space ID"),
    page: z.number().default(1).describe("Page number"),
    page_size: z.number().default(20).describe("Items per page"),
});
// Create a new document
export const CreateDocSchema = z.object({
    project_id: z.number().describe("Project/knowledge space ID"),
    title: z.string().describe("Document title"),
    content: z.string().describe("Document content (Markdown format)"),
});
// Update an existing document
export const UpdateDocSchema = z.object({
    project_id: z.number().describe("Project/knowledge space ID"),
    doc_id: z.number().describe("Document ID"),
    title: z.string().optional().describe("Document title"),
    content: z.string().optional().describe("Document content (Markdown format)"),
});
// Get project details
export const GetProjectSchema = z.object({
    project_id: z.number().describe("Project/knowledge space ID"),
});
// Get current user's documents
export const GetSelfDocsSchema = z.object({});
// Create a new project
export const CreateProjectSchema = z.object({
    name: z.string().describe("Project name"),
    desc: z.string().optional().describe("Project description"),
    role: z.number().default(2).describe("Project permission: 1=public, 2=private"),
});
// Upload an image
export const UploadImgSchema = z.object({
    image_base64: z.string().describe("Base64 encoded image string"),
});
