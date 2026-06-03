import { z } from "zod";
export declare const SearchDocsSchema: z.ZodObject<{
    keyword: z.ZodString;
    project_id: z.ZodOptional<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
    keyword: string;
    project_id?: number | undefined;
}, {
    keyword: string;
    page?: number | undefined;
    page_size?: number | undefined;
    project_id?: number | undefined;
}>;
export declare const GetDocSchema: z.ZodObject<{
    doc_id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    doc_id: number;
}, {
    doc_id: number;
}>;
export declare const GetDocContentSchema: z.ZodObject<{
    doc_id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    doc_id: number;
}, {
    doc_id: number;
}>;
export declare const ListProjectsSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
}, {
    page?: number | undefined;
    page_size?: number | undefined;
}>;
export declare const ListDocsSchema: z.ZodObject<{
    project_id: z.ZodNumber;
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
    project_id: number;
}, {
    project_id: number;
    page?: number | undefined;
    page_size?: number | undefined;
}>;
export declare const GetProjectDocsSchema: z.ZodObject<{
    project_id: z.ZodNumber;
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    page_size: number;
    project_id: number;
}, {
    project_id: number;
    page?: number | undefined;
    page_size?: number | undefined;
}>;
export declare const CreateDocSchema: z.ZodObject<{
    project_id: z.ZodNumber;
    title: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    project_id: number;
    title: string;
    content: string;
}, {
    project_id: number;
    title: string;
    content: string;
}>;
export declare const UpdateDocSchema: z.ZodObject<{
    project_id: z.ZodNumber;
    doc_id: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    project_id: number;
    doc_id: number;
    title?: string | undefined;
    content?: string | undefined;
}, {
    project_id: number;
    doc_id: number;
    title?: string | undefined;
    content?: string | undefined;
}>;
export declare const GetProjectSchema: z.ZodObject<{
    project_id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    project_id: number;
}, {
    project_id: number;
}>;
export declare const GetSelfDocsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const CreateProjectSchema: z.ZodObject<{
    name: z.ZodString;
    desc: z.ZodOptional<z.ZodString>;
    role: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    role: number;
    desc?: string | undefined;
}, {
    name: string;
    role?: number | undefined;
    desc?: string | undefined;
}>;
export declare const UploadImgSchema: z.ZodObject<{
    image_base64: z.ZodString;
}, "strip", z.ZodTypeAny, {
    image_base64: string;
}, {
    image_base64: string;
}>;
export type SearchDocsInput = z.infer<typeof SearchDocsSchema>;
export type GetDocInput = z.infer<typeof GetDocSchema>;
export type GetDocContentInput = z.infer<typeof GetDocContentSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;
export type ListDocsInput = z.infer<typeof ListDocsSchema>;
export type GetProjectDocsInput = z.infer<typeof GetProjectDocsSchema>;
export type CreateDocInput = z.infer<typeof CreateDocSchema>;
export type UpdateDocInput = z.infer<typeof UpdateDocSchema>;
export type GetProjectInput = z.infer<typeof GetProjectSchema>;
export type GetSelfDocsInput = z.infer<typeof GetSelfDocsSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UploadImgInput = z.infer<typeof UploadImgSchema>;
