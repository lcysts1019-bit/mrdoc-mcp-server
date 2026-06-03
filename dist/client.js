// MrDoc API Client
export class MrDocClient {
    config;
    sessionCookies = "";
    constructor(config) {
        this.config = config;
    }
    // Get CSRF token from a page
    async getCsrfToken(url) {
        const response = await fetch(url, {
            headers: {
                Cookie: this.sessionCookies,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get CSRF token: ${response.status}`);
        }
        const html = await response.text();
        const match = html.match(/csrfmiddlewaretoken[^>]*value="([^"]*)"/);
        if (match) {
            // Extract and store cookies
            const setCookies = response.headers.get("set-cookie");
            if (setCookies) {
                this.sessionCookies = setCookies
                    .split(",")
                    .map((c) => c.split(";")[0])
                    .join("; ");
            }
            return match[1];
        }
        throw new Error("Could not find CSRF token");
    }
    // Login to MrDoc
    async login() {
        const loginUrl = `${this.config.baseUrl}/login/`;
        // Get login page CSRF token
        const csrfToken = await this.getCsrfToken(loginUrl);
        // Login with credentials
        const formData = new URLSearchParams();
        formData.append("csrfmiddlewaretoken", csrfToken);
        formData.append("username", this.config.username);
        formData.append("password", this.config.password);
        const response = await fetch(loginUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: this.sessionCookies,
                Referer: loginUrl,
            },
            body: formData.toString(),
            redirect: "manual",
        });
        // Update cookies from login response
        const setCookies = response.headers.get("set-cookie");
        if (setCookies) {
            this.sessionCookies = setCookies
                .split(",")
                .map((c) => c.split(";")[0])
                .join("; ");
        }
    }
    // API call with token in URL
    async fetchWithToken(endpoint, options = {}) {
        const separator = endpoint.includes("?") ? "&" : "?";
        const url = `${this.config.baseUrl}${endpoint}${separator}token=${this.config.token}`;
        const headers = {
            ...(options.headers || {}),
        };
        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MrDoc API error (${response.status}): ${errorText}`);
        }
        return response.json();
    }
    // Form submission with CSRF token
    async formSubmit(endpoint, data) {
        // Ensure we are logged in
        if (!this.sessionCookies) {
            await this.login();
        }
        const url = `${this.config.baseUrl}${endpoint}`;
        // Get CSRF token from the target page
        const csrfToken = await this.getCsrfToken(url);
        // Prepare form data with CSRF token
        const formData = new URLSearchParams();
        formData.append("csrfmiddlewaretoken", csrfToken);
        for (const [key, value] of Object.entries(data)) {
            formData.append(key, String(value));
        }
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: this.sessionCookies,
                Referer: url,
            },
            body: formData.toString(),
        });
        // Update cookies
        const setCookies = response.headers.get("set-cookie");
        if (setCookies) {
            this.sessionCookies = setCookies
                .split(",")
                .map((c) => c.split(";")[0])
                .join("; ");
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MrDoc form submit error (${response.status}): ${errorText}`);
        }
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        // Return success status for non-JSON responses
        return { status: true, data: "Operation successful" };
    }
    // ============ API Methods ============
    // Search documents
    async searchDocs(keyword, projectId, page = 1, pageSize = 20) {
        const params = new URLSearchParams({
            q: keyword,
            page: String(page),
            page_size: String(pageSize),
        });
        if (projectId) {
            params.append("project_id", String(projectId));
        }
        return this.fetchWithToken(`/api/doc/search/?${params}`);
    }
    // Get document metadata
    async getDoc(docId) {
        return this.fetchWithToken(`/api/get_doc/?did=${docId}`);
    }
    // Get document content (markdown)
    async getDocContent(docId) {
        const result = await this.getDoc(docId);
        const data = result && typeof result === "object" && "data" in result
            ? result.data
            : result;
        const mdContent = data && typeof data === "object" && "md_content" in data
            ? data.md_content
            : null;
        return mdContent || JSON.stringify(result, null, 2);
    }
    // List all projects
    async listProjects(page = 1, pageSize = 20) {
        const params = new URLSearchParams({
            page: String(page),
            page_size: String(pageSize),
        });
        return this.fetchWithToken(`/api/get_projects/?${params}`);
    }
    // Get project details
    async getProject(projectId) {
        return this.fetchWithToken(`/api/get_projects/?project_id=${projectId}`);
    }
    // List documents in a project (hierarchical)
    async listDocs(projectId) {
        const params = new URLSearchParams({
            pid: String(projectId),
        });
        return this.fetchWithToken(`/api/get_level_docs/?${params}`);
    }
    // Get project documents (paginated)
    async getProjectDocs(projectId, page = 1, pageSize = 20) {
        const params = new URLSearchParams({
            pid: String(projectId),
            page: String(page),
            limit: String(pageSize),
        });
        return this.fetchWithToken(`/api/get_docs/?${params}`);
    }
    // Create a new document
    async createDoc(projectId, title, content) {
        const formData = new URLSearchParams();
        formData.append("pid", String(projectId));
        formData.append("title", title);
        formData.append("doc", content);
        return this.fetchWithToken("/api/create_doc/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
        });
    }
    // Update an existing document
    async updateDoc(projectId, docId, title, content) {
        // If title is not provided, fetch the current document title to prevent it from being cleared
        let finalTitle = title || "";
        if (title === undefined || title === null) {
            try {
                const docInfo = await this.getDoc(docId);
                // Try multiple possible data structures to find the title
                if (docInfo && typeof docInfo === "object") {
                    // Case 1: { status, data: { title, ... } }
                    if ("data" in docInfo && docInfo.data && typeof docInfo.data === "object" && "title" in docInfo.data) {
                        finalTitle = docInfo.data.title;
                    }
                    // Case 2: { title, ... } (direct)
                    else if ("title" in docInfo) {
                        finalTitle = docInfo.title;
                    }
                }
            }
            catch (e) {
                // If fetching fails, keep the empty string
                console.error("Failed to fetch current document title:", e);
            }
        }
        const formData = new URLSearchParams();
        formData.append("pid", String(projectId));
        formData.append("did", String(docId));
        formData.append("title", finalTitle);
        if (content !== undefined)
            formData.append("doc", content);
        return this.fetchWithToken("/api/modify_doc/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData.toString(),
        });
    }
    // Get current user's documents
    async getSelfDocs() {
        return this.fetchWithToken("/api/get_self_docs/");
    }
    // Create a new project
    async createProject(name, desc, role = 2) {
        const data = { name, role };
        if (desc)
            data.desc = desc;
        return this.formSubmit("/api/create_project/", data);
    }
    // Upload an image
    async uploadImage(imageBase64) {
        return this.formSubmit("/api/upload_img/", {
            data: imageBase64,
        });
    }
}
