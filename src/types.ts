// MrDoc API response types

export interface MrDocApiResponse<T = any> {
  status?: number;
  data?: T;
  msg?: string;
  results?: T;
  count?: number;
}

// Project types
export interface Project {
  id: number;
  name: string;
  desc?: string;
  role: number;
  create_time: string;
  modify_time: string;
}

export interface ProjectListResponse {
  status: number;
  data: Project[];
  page: number;
  page_size: number;
  count: number;
}

// Document types
export interface DocMeta {
  id: number;
  title: string;
  create_time: string;
  modify_time: string;
  editor: string;
}

export interface DocContent extends DocMeta {
  md_content: string;
  content: string;
}

export interface DocListItem {
  id: number;
  title: string;
  parent: number | null;
  sort: number;
  children?: DocListItem[];
}

export interface DocListResponse {
  status: number;
  data: DocMeta[];
  page: number;
  limit: number;
  count: number;
}

export interface SearchDocItem {
  id: number;
  title: string;
  excerpt: string;
  project_name: string;
  project_id: number;
}

export interface SearchResponse {
  status: number;
  data: SearchDocItem[];
  page: number;
  page_size: number;
  count: number;
}

// Create/Update response
export interface CreateDocResponse {
  status: number;
  data: {
    id: number;
  };
  msg?: string;
}

export interface UpdateDocResponse {
  status: number;
  msg?: string;
}

export interface CreateProjectResponse {
  status: number;
  data: {
    id: number;
  };
  msg?: string;
}

export interface UploadImgResponse {
  status: number;
  data: {
    url: string;
  };
  msg?: string;
}
