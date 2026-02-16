/**
 * OAI-PMH client — primary access layer.
 * Implements the six OAI-PMH verbs against DSpace/TEDE endpoints.
 */
import { fetchText } from "../utils/http.js";
import { rateLimiter } from "../utils/rate-limiter.js";
import { parseIdentifyResponse, parseListRecordsResponse, parseGetRecordResponse, parseListSetsResponse, parseListMetadataFormatsResponse, } from "../utils/xml-parser.js";
export class OaiPmhClient {
    /**
     * OAI-PMH Identify verb.
     */
    async identify(endpoint) {
        const url = this.buildUrl(endpoint, "Identify");
        await rateLimiter.acquire(url);
        const xml = await fetchText(url, { timeout: 15_000 });
        return parseIdentifyResponse(xml);
    }
    /**
     * OAI-PMH ListRecords verb (single page).
     */
    async listRecords(endpoint, opts = {}) {
        let url;
        if (opts.resumptionToken) {
            url = this.buildUrl(endpoint, "ListRecords", {
                resumptionToken: opts.resumptionToken,
            });
        }
        else {
            const params = {
                metadataPrefix: opts.metadataPrefix ?? "oai_dc",
            };
            if (opts.from)
                params.from = opts.from;
            if (opts.until)
                params.until = opts.until;
            if (opts.set)
                params.set = opts.set;
            url = this.buildUrl(endpoint, "ListRecords", params);
        }
        await rateLimiter.acquire(url);
        const xml = await fetchText(url, { timeout: 60_000 });
        return parseListRecordsResponse(xml);
    }
    /**
     * OAI-PMH ListRecords with automatic pagination.
     * Yields records up to maxRecords.
     */
    async listAllRecords(endpoint, opts = {}) {
        const maxRecords = opts.maxRecords ?? 100;
        const allRecords = [];
        let resumptionToken = null;
        let isFirst = true;
        while (allRecords.length < maxRecords) {
            const response = await this.listRecords(endpoint, {
                ...opts,
                resumptionToken: isFirst ? undefined : (resumptionToken ?? undefined),
            });
            allRecords.push(...response.records);
            resumptionToken = response.resumptionToken;
            isFirst = false;
            if (!resumptionToken || allRecords.length >= maxRecords)
                break;
        }
        return allRecords.slice(0, maxRecords);
    }
    /**
     * OAI-PMH GetRecord verb.
     */
    async getRecord(endpoint, identifier, metadataPrefix = "oai_dc") {
        const url = this.buildUrl(endpoint, "GetRecord", {
            identifier,
            metadataPrefix,
        });
        await rateLimiter.acquire(url);
        const xml = await fetchText(url, { timeout: 30_000 });
        return parseGetRecordResponse(xml);
    }
    /**
     * OAI-PMH ListSets verb.
     */
    async listSets(endpoint) {
        const url = this.buildUrl(endpoint, "ListSets");
        await rateLimiter.acquire(url);
        const xml = await fetchText(url, { timeout: 30_000 });
        return parseListSetsResponse(xml);
    }
    /**
     * OAI-PMH ListMetadataFormats verb.
     */
    async listMetadataFormats(endpoint) {
        const url = this.buildUrl(endpoint, "ListMetadataFormats");
        await rateLimiter.acquire(url);
        const xml = await fetchText(url, { timeout: 15_000 });
        return parseListMetadataFormatsResponse(xml);
    }
    /**
     * Build OAI-PMH request URL.
     */
    buildUrl(endpoint, verb, params) {
        const base = endpoint.includes("?") ? endpoint.split("?")[0] : endpoint;
        const url = new URL(base);
        url.searchParams.set("verb", verb);
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.set(key, value);
            }
        }
        return url.toString();
    }
}
//# sourceMappingURL=oai-pmh.js.map