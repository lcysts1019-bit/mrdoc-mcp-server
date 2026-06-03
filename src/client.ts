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
} from "./types.js";

export class MrDocClient {
  private sessionCookies: string = "";

  constructor(private config: MrDocConfig) {}

  // Get CSRF token from a page
  private async getCsrfToken(url: string): Promise<string> {
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
  async login(): Promise<void> {
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
  async fetchWithToken<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${this.config.baseUrl}${endpoint}${separator}token=${this.config.token}`;

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MrDoc API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // Form submission with CSRF token
  async formSubmit<T>(endpoint: string, data: Record<string, any>): Promise<T> {
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
      return response.json() as Promise<T>;
    }

    // Return success status for non-JSON responses
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
    const data = result && typeof result === "object" && "data" in result
      ? (result as any).data
      : result;
    const mdContent = data && typeof data === "object" && "md_content" in data
      ? (data as any).md_content
      : null;
    return mdContent || JSON.stringify(result, null, 2);
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
    return this.fetchWithToken<ProjectListResponse>(
      `/api/get_projects/?project_id=${projectId}`
    );
  }

  // List documents in a project (hierarchical)
  async listDocs(projectId: number): Promise<DocListItem[]> {
    const params = new URLSearchParams({
      pid: String(projectId),
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
      limit: String(pageSize),
    });
    return this.fetchWithToken<DocListResponse>(`/api/get_docs/?${params}`);
  }

  // Create a new document
  async createDoc(
    projectId: number,
    title: string,
    content: string
  ): Promise<CreateDocResponse> {
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
    // If title is not provided, fetch the current document title to prevent it from being cleared
    let finalTitle: string = title || "";
    if (title === undefined || title === null) {
      try {
        const docInfo = await this.getDoc(docId);
        // Try multiple possible data structures to find the title
        if (docInfo && typeof docInfo === "object") {
          // Case 1: { status, data: { title, ... } }
          if ("data" in docInfo && (docInfo as any).data && typeof (docInfo as any).data === "object" && "title" in (docInfo as any).data) {
            finalTitle = (docInfo as any).data.title;
          }
          // Case 2: { title, ... } (direct)
          else if ("title" in docInfo) {
            finalTitle = (docInfo as any).title;
          }
        }
      } catch (e) {
        // If fetching fails, keep the empty string
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
  async getSelfDocs(): Promise<any> {
    return this.fetchWithToken("/api/get_self_docs/");
  }

  // Create a new project
  async createProject(
    name: string,
    desc?: string,
    role: number = 2
  ): Promise<CreateProjectResponse> {
    const data: Record<string, any> = { name, role };
    if (desc) data.desc = desc;

    return this.formSubmit<CreateProjectResponse>("/api/create_project/", data);
  }

  // Upload an image
  async uploadImage(imageBase64: string): Promise<UploadImgResponse> {
    return this.formSubmit<UploadImgResponse>("/api/upload_img/", {
      data: imageBase64,
    });
  }
}
