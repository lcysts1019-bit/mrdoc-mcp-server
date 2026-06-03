import { MrDocClient } from "./client.js";
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}
export interface ToolResult {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
    [key: string]: unknown;
}
export declare function getToolDefinitions(): ToolDefinition[];
export declare function handleToolCall(client: MrDocClient, name: string, args: Record<string, any>): Promise<ToolResult>;
