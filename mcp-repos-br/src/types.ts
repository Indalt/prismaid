import { z } from "zod";

// ─── Registry Types ───────────────────────────────────────────

export const InstitutionTypeSchema = z.enum([
    "federal",
    "estadual",
    "privada",
    "comunitaria",
    "instituto_federal",
]);
export type InstitutionType = z.infer<typeof InstitutionTypeSchema>;

export const PlatformSchema = z.enum(["dspace", "tede", "ojs", "other"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const ContentTypeSchema = z.enum(["mixed", "theses", "articles"]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const RepoStatusSchema = z.enum(["active", "inactive", "unreachable"]);
export type RepoStatus = z.infer<typeof RepoStatusSchema>;

export const RepositoryEntrySchema = z.object({
    id: z.string(),
    institution: z.object({
        name: z.string(),
        acronym: z.string(),
        type: InstitutionTypeSchema,
        state: z.string(),
        city: z.string(),
    }),
    repository: z.object({
        name: z.string(),
        url: z.string().url(),
        platform: PlatformSchema,
        contentType: ContentTypeSchema,
    }),
    access: z.object({
        oaiPmh: z.object({
            available: z.boolean(),
            endpoint: z.string().nullable(),
            verified: z.boolean(),
            lastVerified: z.string().nullable(),
        }),
        restApi: z.object({
            available: z.boolean(),
            endpoint: z.string().nullable(),
            version: z.number().nullable(),
        }),
        searchEndpoints: z.array(z.string()),
    }),
    status: RepoStatusSchema,
});
export type RepositoryEntry = z.infer<typeof RepositoryEntrySchema>;

// ─── OAI-PMH Types ───────────────────────────────────────────

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

// ─── Search Result Types ──────────────────────────────────────

export interface SearchResult {
    repositoryId: string;
    repositoryName: string;
    identifier: string;
    title: string;
    creators: string[];
    description: string;
    date: string;
    type: string;
    url: string;            // HTTP URL obrigatória
    doi?: string;           // DOI quando disponível
    pdfUrl?: string;        // link direto ao PDF
    degreeType?: string;    // mestrado, doutorado, etc.
    institution?: string;   // universidade/instituição
    state?: string;         // UF (SP, RJ, MG, etc.)
    journal?: string;       // nome do periódico
    issn?: string;          // ISSN do periódico
    subjectAreas?: string[];// áreas do conhecimento
    language?: string;      // idioma principal
    accessMethod: "oai-pmh" | "dspace-rest" | "html-scraper" | "bdtd-vufind" | "scielo-articlemeta" | "usp-custom";
}

export interface SearchOptions {
    query?: string;         // busca textual livre
    title?: string;         // busca por título
    author?: string;        // busca por autor
    dateFrom?: string;      // data início (YYYY-MM-DD)
    dateUntil?: string;     // data fim (YYYY-MM-DD)
    degreeType?: "graduacao" | "mestrado" | "doutorado" | "pos-doutorado" | "livre-docencia";
    institution?: string;   // universidade/instituição
    state?: string;         // estado (SP, RJ, MG, etc.)
    subjectArea?: string;   // área do conhecimento
    issn?: string;          // ISSN do periódico (SciELO)
    contentType?: string[]; // tipos de conteúdo
    maxResults?: number;
    set?: string;           // OAI-PMH set
}

// ─── DSpace REST Types ────────────────────────────────────────

export interface DSpaceSearchResult {
    totalElements: number;
    page: { size: number; totalElements: number; totalPages: number; number: number };
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

// ─── Validation Types ─────────────────────────────────────────

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
