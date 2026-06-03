// Configuration management for MrDoc MCP Server

export interface MrDocConfig {
  baseUrl: string;
  token: string;
  username: string;
  password: string;
}

export function loadConfig(): MrDocConfig {
  const baseUrl = process.env.MRDOC_BASE_URL || "http://192.168.9.38:10086";
  const token = process.env.MRDOC_TOKEN || "";
  const username = process.env.MRDOC_USERNAME || "admin";
  const password = process.env.MRDOC_PASSWORD || "admin";

  if (!token) {
    console.error("Warning: MRDOC_TOKEN is not set. API calls may fail.");
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    token,
    username,
    password,
  };
}
