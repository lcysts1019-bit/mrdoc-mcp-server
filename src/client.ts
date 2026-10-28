// MrDoc API Client

import { MrDocConfig } from "./config.js";
import type {
  ProjectListResponse,
  DocContent,
  DocListResponse,
  SearchResponse,
  CreateDocResponse,
  UpdateDocResponse,
  CreateProjectResponse,
  UploadImgResponse,
  DocListItem,
  GetSelfDocsResponse,
} from "./types.js";

const DEFAULT_TIMEOUT_MS = 15000;

export class MrDocClient {
  private sessionCookies: string = "";

  constructor(private config: MrDocConfig) {}

  // ----- internal helpers -----

  private getTimeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS): AbortSignal {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Avoid keeping the process alive because of this timer
    if (typeof (timer as any).unref === "function") (timer as any).unref();
    // Clear timer when signal is aborted externally to avoid leak
    controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
    return controller.signal;
  }

  private getSetCookieHeaders(response: Response): string[] {
    const maybeGetSetCookie = (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof maybeGetSetCookie === "function") {
      try {
        const arr = maybeGetSetCookie.call(response.headers);
        if (Array.isArray(arr) && arr.length) return arr;
      } catch {
        // fall through to manual parsing
      }
    }
    const raw = response.headers.get("set-cookie");
    if (!raw) return [];
    // Manual split — must handle Expires attribute which contains a comma
    const parts = raw.split(/,\s*/);
    const cookies: string[] = [];
    let current = "";
    for (const part of parts) {
      const looksLikeNewCookie = /^\s*[^=\s]+=/.test(part);
      if (looksLikeNewCookie || current === "") {
        if (current) cookies.push(current);
        current = part;
      } else {
        // Continuation of Expires date, e.g. " 21 Oct 2015 07:28:00 GMT"
        current += ", " + part;
      }
    }
    if (current) cookies.push(current);
    return cookies;
  }

  private updateCookies(response: Response): void {
    const headers = this.getSetCookieHeaders(response);
    if (!headers.length) return;
    const pairs = headers.map((c) => c.split(";")[0].trim()).filter(Boolean);
    if (pairs.length) this.sessionCookies = pairs.join("; ");
  }

  private async fetchCsrfTokenFromUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: { Cookie: this.sessionCookies },
        signal: this.getTimeoutSignal(),
      });
      if (!response.ok) return null;
      this.updateCookies(response);
      const html = await response.text();
      let match = html.match(/csrfmiddlewaretoken[^>]*value="([^"]*)"/);
      if (match) return match[1];
      match = html.match(/name=['"]csrfmiddlewaretoken['"][^>]*value=['"]([^'"]*)['"]/);
      if (match) return match[1];
      return null;
    } catch {
      return null;
    }
  }

  // Get CSRF token — tries target URL first, then falls back to HTML pages
  private async getCsrfToken(url: string): Promise<string> {
    let token = await this.fetchCsrfTokenFromUrl(url);
    if (token) return token;
    // API endpoints return JSON, not HTML — fall back to known HTML pages
    token = await this.fetchCsrfTokenFromUrl(`${this.config.baseUrl}/`);
    if (token) return token;
    token = await this.fetchCsrfTokenFromUrl(`${this.config.baseUrl}/login/`);
    if (token) return token;
    throw new Error("Could not find CSRF token");
  }

  // Login to MrDoc
  async login(): Promise<void> {
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
  async fetchWithToken<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${this.config.baseUrl}${endpoint}${separator}token=${encodeURIComponent(this.config.token)}`;

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      signal: (options as any).signal ?? this.getTimeoutSignal(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MrDoc API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // Form submission with CSRF token
  async formSubmit<T>(endpoint: string, data: Record<string, any>): Promise<T> {
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
      return response.json() as Promise<T>;
    }

    return { status: true, data: "Operation successful" } as T;
  }

  // ============ API Methods ============

  // Search documents
  async searchDocs(
    keyword: string,
    projectId?: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: keyword,
      page: String(page),
      page_size: String(pageSize),
    });
    if (projectId) {
      params.append("project_id", String(projectId));
    }
    return this.fetchWithToken<SearchResponse>(`/api/doc/search/?${params}`);
  }

  // Get document metadata
  async getDoc(docId: number): Promise<DocContent> {
    return this.fetchWithToken<DocContent>(`/api/get_doc/?did=${docId}`);
  }

  // Get document content (markdown)
  async getDocContent(docId: number): Promise<string> {
    const result = await this.getDoc(docId);
    const data =
      result && typeof result === "object" && "data" in result ? (result as any).data : result;
    if (data && typeof data === "object" && "md_content" in data) {
      const md = (data as any).md_content;
      if (typeof md === "string" && md.length > 0) return md;
    }
    // Explicit failure instead of silently returning JSON dump
    throw new Error(
      `MrDoc API returned unexpected structure for doc ${docId} — missing md_content field. Raw: ${JSON.stringify(result).slice(0, 500)}`
    );
  }

  // List all projects
  async listProjects(page: number = 1, pageSize: number = 20): Promise<ProjectListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    return this.fetchWithToken<ProjectListResponse>(`/api/get_projects/?${params}`);
  }

  // Get project details
  async getProject(projectId: number): Promise<ProjectListResponse> {
    return this.fetchWithToken<ProjectListResponse>(`/api/get_projects/?project_id=${projectId}`);
  }

  // List documents in a project (hierarchical)
  async listDocs(projectId: number, page: number = 1, pageSize: number = 20): Promise<DocListItem[]> {
    const params = new URLSearchParams({
      pid: String(projectId),
      page: String(page),
      page_size: String(pageSize),
    });
    return this.fetchWithToken<DocListItem[]>(`/api/get_level_docs/?${params}`);
  }

  // Get project documents (paginated)
  async getProjectDocs(
    projectId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<DocListResponse> {
    const params = new URLSearchParams({
      pid: String(projectId),
      page: String(page),
      page_size: String(pageSize),
    });
    return this.fetchWithToken<DocListResponse>(`/api/get_docs/?${params}`);
  }

  // Create a new document
  async createDoc(projectId: number, title: string, content: string): Promise<CreateDocResponse> {
    const formData = new URLSearchParams();
    formData.append("pid", String(projectId));
    formData.append("title", title);
    formData.append("doc", content);

    return this.fetchWithToken<CreateDocResponse>("/api/create_doc/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  }

  // Update an existing document
  async updateDoc(
    projectId: number,
    docId: number,
    title?: string,
    content?: string
  ): Promise<UpdateDocResponse> {
    let finalTitle: string = title || "";
    if (title === undefined || title === null) {
      try {
        const docInfo = await this.getDoc(docId);
        if (docInfo && typeof docInfo === "object") {
          if (
            "data" in docInfo &&
            (docInfo as any).data &&
            typeof (docInfo as any).data === "object" &&
            "title" in (docInfo as any).data
          ) {
            finalTitle = (docInfo as any).data.title;
          } else if ("title" in docInfo) {
            finalTitle = (docInfo as any).title;
          }
        }
      } catch (e) {
        console.error("Failed to fetch current document title:", e);
      }
    }

    const formData = new URLSearchParams();
    formData.append("pid", String(projectId));
    formData.append("did", String(docId));
    formData.append("title", finalTitle);
    if (content !== undefined) formData.append("doc", content);

    return this.fetchWithToken<UpdateDocResponse>("/api/modify_doc/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  }

  // Get current user's documents
  async getSelfDocs(): Promise<GetSelfDocsResponse> {
    return this.fetchWithToken<GetSelfDocsResponse>("/api/get_self_docs/");
  }

  // Create a new project
  async createProject(name: string, desc?: string, role: number = 2): Promise<CreateProjectResponse> {
    const data: Record<string, any> = { name, role };
    if (desc) data.desc = desc;

    return this.formSubmit<CreateProjectResponse>("/api/create_project/", data);
  }

  // Upload an image — strips data URI prefix if present
  async uploadImage(imageBase64: string): Promise<UploadImgResponse> {
    let payload = imageBase64.trim();
    // Handle data URI like "data:image/png;base64,iVBORw0..."
    const commaIdx = payload.indexOf(",");
    if (payload.startsWith("data:") && commaIdx !== -1) {
      payload = payload.slice(commaIdx + 1);
    }
    // Remove whitespace/newlines that may have been introduced
    payload = payload.replace(/\s/g, "");
    if (!payload) throw new Error("image_base64 is empty after stripping data URI prefix");
    return this.formSubmit<UploadImgResponse>("/api/upload_img/", {
      img: payload,
      data: payload, // keep both keys for backward compatibility with different MrDoc versions
    });
  }
}
