/**
 * Access strategy — orchestrates access layers with platform-specific routing.
 * Chooses the best method for each repository automatically:
 * - BDTD → VuFind API (from ApoenaX/bdtd-scraper pattern)
 * - SciELO → ArticleMeta/Search API (from scieloorg/articles_meta)
 * - USP → Custom result.php scraper
 * - DSpace 7 → REST API + /server/oai/request
 * - DSpace 5/6 → OAI-PMH + /oai/request
 * - Others → HTML scraper fallback
 */
import { OaiPmhClient } from "./oai-pmh.js";
import { DSpaceRestClient } from "./dspace-rest.js";
import type { RepositoryEntry, SearchResult, SearchOptions, DublinCoreMetadata } from "../types.js";
export declare class AccessStrategy {
    private oai;
    private rest;
    private scraper;
    private bdtd;
    private scielo;
    private usp;
    private capabilities;
    /**
     * Search a repository using the best available method.
     */
    search(repo: RepositoryEntry, query: string, opts?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Get metadata for a specific record.
     */
    getMetadata(repo: RepositoryEntry, identifier: string): Promise<Partial<DublinCoreMetadata>>;
    /**
     * Find PDF download URL for a record.
     */
    findPdfUrl(repo: RepositoryEntry, identifier: string): Promise<string | null>;
    /**
     * Get the OAI-PMH client for direct access (used by harvest tool).
     */
    getOaiClient(): OaiPmhClient;
    /**
     * Get the DSpace REST client for direct access.
     */
    getRestClient(): DSpaceRestClient;
    /**
     * Detect which access methods work for a repository.
     * Results are cached for 1 hour.
     *
     * Key improvement: tries multiple OAI-PMH endpoint paths,
     * because DSpace 7 uses /server/oai/request, not /oai/request.
     */
    private detectCapabilities;
    /**
     * Check if an OAI record matches a search query (simple text matching).
     */
    private matchesQuery;
    /**
     * Convert OAI-PMH record to SearchResult.
     */
    private oaiRecordToSearchResult;
    /**
     * Convert DSpace REST item to SearchResult.
     */
    private dspaceItemToSearchResult;
}
//# sourceMappingURL=strategy.d.ts.map