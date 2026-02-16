/**
 * DSpace REST API client — secondary access layer.
 * Supports DSpace 7 REST API for search and item retrieval.
 */
import { fetchText } from "../utils/http.js";
import { rateLimiter } from "../utils/rate-limiter.js";
export class DSpaceRestClient {
    /**
     * Detect if a DSpace 7 REST API is available at the given base URL.
     */
    async detect(baseUrl) {
        try {
            const apiUrl = this.resolveApiUrl(baseUrl);
            await rateLimiter.acquire(apiUrl);
            const text = await fetchText(apiUrl, { timeout: 10_000, maxRetries: 1 });
            const data = JSON.parse(text);
            return data?._links !== undefined;
        }
        catch {
            return false;
        }
    }
    /**
     * Search for items in a DSpace 7 repository.
     */
    async search(baseUrl, query, opts) {
        const apiUrl = this.resolveApiUrl(baseUrl);
        const searchUrl = new URL(`${apiUrl}/discover/search/objects`);
        searchUrl.searchParams.set("query", query);
        searchUrl.searchParams.set("dsoType", "ITEM");
        searchUrl.searchParams.set("page", String(opts?.page ?? 0));
        searchUrl.searchParams.set("size", String(opts?.size ?? 20));
        if (opts?.scope)
            searchUrl.searchParams.set("scope", opts.scope);
        if (opts?.sort)
            searchUrl.searchParams.set("sort", opts.sort);
        await rateLimiter.acquire(searchUrl.toString());
        const text = await fetchText(searchUrl.toString(), {
            timeout: 30_000,
            headers: { Accept: "application/json" },
        });
        const data = JSON.parse(text);
        const embedded = data?._embedded?.searchResult?._embedded?.objects ?? [];
        const items = embedded.map((obj) => {
            const indexObj = obj._embedded;
            const item = indexObj?.indexableObject;
            if (!item)
                return null;
            return {
                uuid: item.uuid,
                name: item.name,
                handle: item.handle,
                metadata: item.metadata,
                type: item.type ?? "item",
            };
        }).filter(Boolean);
        return {
            totalElements: data?.page?.totalElements ?? items.length,
            page: data?.page ?? { size: 20, totalElements: items.length, totalPages: 1, number: 0 },
            items,
        };
    }
    /**
     * Get a single item by UUID.
     */
    async getItem(baseUrl, uuid) {
        const apiUrl = this.resolveApiUrl(baseUrl);
        const url = `${apiUrl}/core/items/${uuid}`;
        await rateLimiter.acquire(url);
        const text = await fetchText(url, {
            timeout: 15_000,
            headers: { Accept: "application/json" },
        });
        return JSON.parse(text);
    }
    /**
     * Get bitstreams (files) for an item.
     */
    async getBitstreams(baseUrl, itemUuid) {
        const apiUrl = this.resolveApiUrl(baseUrl);
        const url = `${apiUrl}/core/items/${itemUuid}/bitstreams`;
        await rateLimiter.acquire(url);
        const text = await fetchText(url, {
            timeout: 15_000,
            headers: { Accept: "application/json" },
        });
        const data = JSON.parse(text);
        const embedded = data?._embedded?.bitstreams ?? [];
        return embedded.map((b) => ({
            uuid: b.uuid,
            name: b.name,
            sizeBytes: b.sizeBytes ?? 0,
            mimeType: (b._format?.mimetype) ?? "application/octet-stream",
            retrieveLink: `${apiUrl}/core/bitstreams/${b.uuid}/content`,
        }));
    }
    /**
     * Resolve the REST API base URL from a repository base URL.
     * DSpace 7 typically serves REST at /server/api
     */
    resolveApiUrl(baseUrl) {
        const clean = baseUrl.replace(/\/+$/, "");
        if (clean.endsWith("/server/api"))
            return clean;
        if (clean.endsWith("/server"))
            return `${clean}/api`;
        return `${clean}/server/api`;
    }
}
//# sourceMappingURL=dspace-rest.js.map