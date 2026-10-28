// MrDoc API Client
const DEFAULT_TIMEOUT_MS = 15000;
export class MrDocClient {
    config;
    sessionCookies = "";
    constructor(config) {
        this.config = config;
    }
    // ----- internal helpers -----
    getTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        // Avoid keeping the process alive because of this timer
        if (typeof timer.unref === "function")
            timer.unref();
        // Clear timer when signal is aborted externally to avoid leak
        controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
        return controller.signal;
    }
    getSetCookieHeaders(response) {
        const maybeGetSetCookie = response.headers.getSetCookie;
        if (typeof maybeGetSetCookie === "function") {
            try {
                const arr = maybeGetSetCookie.call(response.headers);
                if (Array.isArray(arr) && arr.length)
                    return arr;
            }
            catch {
                // fall through to manual parsing
            }
        }
        const raw = response.headers.get("set-cookie");
        if (!raw)
            return [];
        // Manual split — must handle Expires attribute which contains a comma
        const parts = raw.split(/,\s*/);
        const cookies = [];
        let current = "";
        for (const part of parts) {
            const looksLikeNewCookie = /^\s*[^=\s]+=/.test(part);
            if (looksLikeNewCookie || current === "") {
                if (current)
                    cookies.push(current);
                current = part;
            }
            else {
                // Continuation of Expires date, e.g. " 21 Oct 2015 07:28:00 GMT"
                current += ", " + part;
            }
        }
        if (current)
            cookies.push(current);
        return cookies;
    }
    updateCookies(response) {
        const headers = this.getSetCookieHeaders(response);
        if (!headers.length)
            return;
        const pairs = headers.map((c) => c.split(";")[0].trim()).filter(Boolean);
        if (pairs.length)
            this.sessionCookies = pairs.join("; ");
    }
    async fetchCsrfTokenFromUrl(url) {
        try {
            const response = await fetch(url, {
                headers: { Cookie: this.sessionCookies },
                signal: this.getTimeoutSignal(),
            });
            if (!response.ok)
                return null;
            this.updateCookies(response);
            const html = await response.text();
            let match = html.match(/csrfmiddlewaretoken[^>]*value="([^"]*)"/);
            if (match)
                return match[1];
            match = html.match(/name=['"]csrfmiddlewaretoken['"][^>]*value=['"]([^'"]*)['"]/);
            if (match)
                return match[1];
            return null;
        }
        catch {
            return null;
        }
    }
    // Get CSRF token — tries target URL first, then falls back to HTML pages
    async getCsrfToken(url) {
        let token = await this.fetchCsrfTokenFromUrl(url);
        if (token)
            return token;
        // API endpoints return JSON, not HTML — fall back to known HTML pages
        token = await this.fetchCsrfTokenFromUrl(`${this.config.baseUrl}/`);
        if (token)
            return token;
        token = await this.fetchCsrfTokenFromUrl(`${this.config.baseUrl}/login/`);
        if (token)
            return token;
        throw new Error("Could not find CSRF token");
    }
    // Login to MrDoc
    async login() {
        if (!this.config.username || !this.config.password) {
            throw new Error("MRDOC_USERNAME / MRDOC_PASSWORD not configured — cannot perform session login");
        }
        const loginUrl = `${this.config.baseUrl}/login/`;
        const csrfToken = await this.getCsrfToken(loginUrl);
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
            signal: this.getTimeoutSignal(),
        });
        this.updateCookies(response);
    }
    /**
     * API call with token in URL.
     * NOTE: MrDoc authenticates via `?token=` query parameter; this inevitably
     * exposes the token in server access logs and should only be used over HTTPS.
     */
    async fetchWithToken(endpoint, options = {}) {
        const separator = endpoint.includes("?") ? "&" : "?";
        const url = `${this.config.baseUrl}${endpoint}${separator}token=${encodeURIComponent(this.config.token)}`;
        const headers = {
            ...(options.headers || {}),
        };
        const response = await fetch(url, {
            ...options,
            headers,
            signal: options.signal ?? this.getTimeoutSignal(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MrDoc API error (${response.status}): ${errorText}`);
        }
        return response.json();
    }
    // Form submission with CSRF token
    async formSubmit(endpoint, data) {
        if (!this.sessionCookies) {
            await this.login();
        }
        const url = `${this.config.baseUrl}${endpoint}`;
        const csrfToken = await this.getCsrfToken(url);
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
            signal: this.getTimeoutSignal(),
        });
        this.updateCookies(response);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MrDoc form submit error (${response.status}): ${errorText}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
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
        const data = result && typeof result === "object" && "data" in result ? result.data : result;
        if (data && typeof data === "object" && "md_content" in data) {
            const md = data.md_content;
            if (typeof md === "string" && md.length > 0)
                return md;
        }
        // Explicit failure instead of silently returning JSON dump
        throw new Error(`MrDoc API returned unexpected structure for doc ${docId} — missing md_content field. Raw: ${JSON.stringify(result).slice(0, 500)}`);
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
    async listDocs(projectId, page = 1, pageSize = 20) {
        const params = new URLSearchParams({
            pid: String(projectId),
            page: String(page),
            page_size: String(pageSize),
        });
        return this.fetchWithToken(`/api/get_level_docs/?${params}`);
    }
    // Get project documents (paginated)
    async getProjectDocs(projectId, page = 1, pageSize = 20) {
        const params = new URLSearchParams({
            pid: String(projectId),
            page: String(page),
            page_size: String(pageSize),
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
        let finalTitle = title || "";
        if (title === undefined || title === null) {
            try {
                const docInfo = await this.getDoc(docId);
                if (docInfo && typeof docInfo === "object") {
                    if ("data" in docInfo &&
                        docInfo.data &&
                        typeof docInfo.data === "object" &&
                        "title" in docInfo.data) {
                        finalTitle = docInfo.data.title;
                    }
                    else if ("title" in docInfo) {
                        finalTitle = docInfo.title;
                    }
                }
            }
            catch (e) {
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
    // Upload an image — strips data URI prefix if present
    async uploadImage(imageBase64) {
        let payload = imageBase64.trim();
        // Handle data URI like "data:image/png;base64,iVBORw0..."
        const commaIdx = payload.indexOf(",");
        if (payload.startsWith("data:") && commaIdx !== -1) {
            payload = payload.slice(commaIdx + 1);
        }
        // Remove whitespace/newlines that may have been introduced
        payload = payload.replace(/\s/g, "");
        if (!payload)
            throw new Error("image_base64 is empty after stripping data URI prefix");
        return this.formSubmit("/api/upload_img/", {
            img: payload,
            data: payload, // keep both keys for backward compatibility with different MrDoc versions
        });
    }
}
