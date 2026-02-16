import { z } from "zod";
export declare const InstitutionTypeSchema: z.ZodEnum<{
    federal: "federal";
    estadual: "estadual";
    privada: "privada";
    comunitaria: "comunitaria";
    instituto_federal: "instituto_federal";
}>;
export type InstitutionType = z.infer<typeof InstitutionTypeSchema>;
export declare const PlatformSchema: z.ZodEnum<{
    dspace: "dspace";
    tede: "tede";
    ojs: "ojs";
    other: "other";
}>;
export type Platform = z.infer<typeof PlatformSchema>;
export declare const ContentTypeSchema: z.ZodEnum<{
    mixed: "mixed";
    theses: "theses";
    articles: "articles";
}>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export declare const RepoStatusSchema: z.ZodEnum<{
    active: "active";
    inactive: "inactive";
    unreachable: "unreachable";
}>;
export type RepoStatus = z.infer<typeof RepoStatusSchema>;
export declare const RepositoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    institution: z.ZodObject<{
        name: z.ZodString;
        acronym: z.ZodString;
        type: z.ZodEnum<{
            federal: "federal";
            estadual: "estadual";
            privada: "privada";
            comunitaria: "comunitaria";
            instituto_federal: "instituto_federal";
        }>;
        state: z.ZodString;
        city: z.ZodString;
    }, z.core.$strip>;
    repository: z.ZodObject<{
        name: z.ZodString;
        url: z.ZodString;
        platform: z.ZodEnum<{
            dspace: "dspace";
            tede: "tede";
            ojs: "ojs";
            other: "other";
        }>;
        contentType: z.ZodEnum<{
            mixed: "mixed";
            theses: "theses";
            articles: "articles";
        }>;
    }, z.core.$strip>;
    access: z.ZodObject<{
        oaiPmh: z.ZodObject<{
            available: z.ZodBoolean;
            endpoint: z.ZodNullable<z.ZodString>;
            verified: z.ZodBoolean;
            lastVerified: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
        restApi: z.ZodObject<{
            available: z.ZodBoolean;
            endpoint: z.ZodNullable<z.ZodString>;
            version: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>;
        searchEndpoints: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    status: z.ZodEnum<{
        active: "active";
        inactive: "inactive";
        unreachable: "unreachable";
    }>;
}, z.core.$strip>;
export type RepositoryEntry = z.infer<typeof RepositoryEntrySchema>;
export interface OaiIdentifyResponse {
    repositoryName: string;
    baseURL: string;
    protocolVersion: string;
    earliestDatestamp: string;
    deletedRecord: string;
    granularity: string;
    adminEmail: string[];
}
export interface OaiRecord {
    identifier: string;
    datestamp: string;
    sets: string[];
    metadata: DublinCoreMetadata;
}
export interface DublinCoreMetadata {
    title: string[];
    creator: string[];
    subject: string[];
    description: string[];
    date: string[];
    type: string[];
    format: string[];
    identifier: string[];
    language: string[];
    rights: string[];
    publisher: string[];
    source: string[];
    relation: string[];
    coverage: string[];
    contributor: string[];
}
export interface OaiListRecordsResponse {
    records: OaiRecord[];
    resumptionToken: string | null;
    completeListSize: number | null;
}
export interface OaiSetInfo {
    setSpec: string;
    setName: string;
}
export interface MetadataFormat {
    metadataPrefix: string;
    schema: string;
    metadataNamespace: string;
}
export interface SearchResult {
    repositoryId: string;
    repositoryName: string;
    identifier: string;
    title: string;
    creators: string[];
    description: string;
    date: string;
    type: string;
    url: string;
    accessMethod: "oai-pmh" | "dspace-rest" | "html-scraper" | "bdtd-vufind" | "scielo-search" | "usp-custom";
}
export interface SearchOptions {
    dateFrom?: string;
    dateUntil?: string;
    contentType?: string[];
    maxResults?: number;
    set?: string;
}
export interface DSpaceSearchResult {
    totalElements: number;
    page: {
        size: number;
        totalElements: number;
        totalPages: number;
        number: number;
    };
    items: DSpaceItem[];
}
export interface DSpaceItem {
    uuid: string;
    name: string;
    handle: string;
    metadata: Record<string, DSpaceMetadataValue[]>;
    type: string;
}
export interface DSpaceMetadataValue {
    value: string;
    language: string | null;
    authority: string | null;
    confidence: number;
    place: number;
}
export interface Bitstream {
    uuid: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
    retrieveLink: string;
}
export interface ValidationResult {
    repositoryId: string;
    repositoryName: string;
    timestamp: string;
    checks: ValidationCheck[];
    overallStatus: "healthy" | "degraded" | "unreachable";
}
export interface ValidationCheck {
    type: "connectivity" | "oai_pmh" | "rest_api" | "search";
    status: "pass" | "fail" | "skip";
    latencyMs: number | null;
    details: string;
}
//# sourceMappingURL=types.d.ts.map