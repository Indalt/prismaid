/**
 * HTML scraper — fallback access layer.
 * Scrapes DSpace search pages and item metadata from HTML.
 * Equivalent of direct_search.go but in TypeScript.
 */
import type { SearchResult, DublinCoreMetadata } from "../types.js";
export declare class HtmlScraper {
    /**
     * Search a repository by trying multiple search endpoints.
     */
    search(repoUrl: string, repoId: string, repoName: string, query: string, maxResults?: number): Promise<SearchResult[]>;
    /**
     * Extract metadata from an item page (handle page).
     */
    getItemMetadata(itemUrl: string): Promise<Partial<DublinCoreMetadata>>;
    /**
     * Find PDF download URL from an item page.
     */
    findPdfUrl(itemUrl: string): Promise<string | null>;
    /**
     * Parse search result page HTML.
     */
    private parseSearchResults;
    /**
     * Parse item page HTML for metadata (using meta tags and DSpace tables).
     */
    private parseItemPage;
    /**
     * Resolve a potentially relative URL against a base.
     */
    private resolveUrl;
}
//# sourceMappingURL=html-scraper.d.ts.map