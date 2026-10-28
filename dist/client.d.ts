import { MrDocConfig } from "./config.js";
import type { ProjectListResponse, DocContent, DocListResponse, SearchResponse, CreateDocResponse, UpdateDocResponse, CreateProjectResponse, UploadImgResponse, DocListItem, GetSelfDocsResponse } from "./types.js";
export declare class MrDocClient {
    private config;
    private sessionCookies;
    constructor(config: MrDocConfig);
    private getTimeoutSignal;
    private getSetCookieHeaders;
    private updateCookies;
    private fetchCsrfTokenFromUrl;
    private getCsrfToken;
    login(): Promise<void>;
    /**
     * API call with token in URL.
     * NOTE: MrDoc authenticates via `?token=` query parameter; this inevitably
     * exposes the token in server access logs and should only be used over HTTPS.
     */
    fetchWithToken<T>(endpoint: string, options?: RequestInit): Promise<T>;
    formSubmit<T>(endpoint: string, data: Record<string, any>): Promise<T>;
    searchDocs(keyword: string, projectId?: number, page?: number, pageSize?: number): Promise<SearchResponse>;
    getDoc(docId: number): Promise<DocContent>;
    getDocContent(docId: number): Promise<string>;
    listProjects(page?: number, pageSize?: number): Promise<ProjectListResponse>;
    getProject(projectId: number): Promise<ProjectListResponse>;
    listDocs(projectId: number, page?: number, pageSize?: number): Promise<DocListItem[]>;
    getProjectDocs(projectId: number, page?: number, pageSize?: number): Promise<DocListResponse>;
    createDoc(projectId: number, title: string, content: string): Promise<CreateDocResponse>;
    updateDoc(projectId: number, docId: number, title?: string, content?: string): Promise<UpdateDocResponse>;
    getSelfDocs(): Promise<GetSelfDocsResponse>;
    createProject(name: string, desc?: string, role?: number): Promise<CreateProjectResponse>;
    uploadImage(imageBase64: string): Promise<UploadImgResponse>;
}
