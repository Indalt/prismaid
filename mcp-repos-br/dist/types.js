import { z } from "zod";
// ─── Registry Types ───────────────────────────────────────────
export const InstitutionTypeSchema = z.enum([
    "federal",
    "estadual",
    "privada",
    "comunitaria",
    "instituto_federal",
]);
export const PlatformSchema = z.enum(["dspace", "tede", "ojs", "other"]);
export const ContentTypeSchema = z.enum(["mixed", "theses", "articles"]);
export const RepoStatusSchema = z.enum(["active", "inactive", "unreachable"]);
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
//# sourceMappingURL=types.js.map