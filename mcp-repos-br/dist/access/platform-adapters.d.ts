/**
 * Platform-specific API adapters for repositories that don't follow
 * standard OAI-PMH or DSpace REST patterns.
 *
 * Informed by:
 * - ApoenaX/bdtd-scraper (GitHub): BDTD uses VuFind API
 * - SciELO ArticleMeta API: http://articlemeta.scielo.org/api/v1/
 * - USP uses custom result.php (not DSpace)
 * - DSpace 7 OAI-PMH is at /server/oai/request (not /oai/request)
 */
import type { SearchResult, DublinCoreMetadata } from "../types.js";
export declare class BdtdAdapter {
    private baseUrl;
    /**
     * Search BDTD via VuFind REST API.
     * Pattern from ApoenaX/bdtd-scraper on GitHub.
     */
    search(query: string, opts?: {
        limit?: number;
        page?: number;
        type?: string;
    }): Promise<SearchResult[]>;
    getRecord(id: string): Promise<Partial<DublinCoreMetadata>>;
}
export declare class ScieloAdapter {
    private baseUrl;
    /**
     * Search SciELO articles via ArticleMeta API.
     * Pattern from scieloorg/articles_meta on GitHub.
     */
    search(query: string, opts?: {
        limit?: number;
        offset?: number;
        collection?: string;
    }): Promise<SearchResult[]>;
    private parseSearchResults;
    /**
     * Get article metadata from ArticleMeta API.
     */
    getArticle(pid: string, collection?: string): Promise<Partial<DublinCoreMetadata>>;
    /**
     * List collections available in SciELO.
     */
    listCollections(): Promise<Array<{
        code: string;
        name: string;
    }>>;
}
export declare class UspAdapter {
    private baseUrl;
    /**
     * Search USP repository via custom result.php endpoint.
     * USP doesn't use DSpace — it has a custom PHP system.
     */
    search(query: string, opts?: {
        limit?: number;
    }): Promise<SearchResult[]>;
    private parseResults;
    getItemMetadata(itemUrl: string): Promise<Partial<DublinCoreMetadata>>;
}
/**
 * DSpace 7 serves OAI-PMH at /server/oai/request, not /oai/request.
 * This function resolves the correct OAI-PMH endpoint for a given platform version.
 */
export declare function resolveOaiEndpoint(baseUrl: string, platform?: string): string[];
//# sourceMappingURL=platform-adapters.d.ts.map