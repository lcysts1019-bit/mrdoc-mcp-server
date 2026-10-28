// Configuration management for MrDoc MCP Server
export function loadConfig() {
    const baseUrl = process.env.MRDOC_BASE_URL || "http://192.168.9.38:10086";
    const token = process.env.MRDOC_TOKEN || "";
    const username = process.env.MRDOC_USERNAME || "";
    const password = process.env.MRDOC_PASSWORD || "";
    if (!token) {
        console.error("Warning: MRDOC_TOKEN is not set. API calls may fail.");
    }
    if (!username || !password) {
        console.error("Warning: MRDOC_USERNAME / MRDOC_PASSWORD not set. Session-based operations (create_project, upload_img) will fail if login is required.");
    }
    return {
        baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
        token,
        username,
        password,
    };
}
