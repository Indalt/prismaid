/**
 * DSpace REST API client — secondary access layer.
 * Supports DSpace 7 REST API for search and item retrieval.
 */
import type { DSpaceSearchResult, DSpaceItem, Bitstream } from "../types.js";
export declare class DSpaceRestClient {
    /**
     * Detect if a DSpace 7 REST API is available at the given base URL.
     */
    detect(baseUrl: string): Promise<boolean>;
    /**
     * Search for items in a DSpace 7 repository.
     */
    search(baseUrl: string, query: string, opts?: {
        scope?: string;
        page?: number;
        size?: number;
        sort?: string;
    }): Promise<DSpaceSearchResult>;
    /**
     * Get a single item by UUID.
     */
    getItem(baseUrl: string, uuid: string): Promise<DSpaceItem>;
    /**
     * Get bitstreams (files) for an item.
     */
    getBitstreams(baseUrl: string, itemUuid: string): Promise<Bitstream[]>;
    /**
     * Resolve the REST API base URL from a repository base URL.
     * DSpace 7 typically serves REST at /server/api
     */
    private resolveApiUrl;
}
//# sourceMappingURL=dspace-rest.d.ts.map