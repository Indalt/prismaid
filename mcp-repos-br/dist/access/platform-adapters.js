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
import * as cheerio from "cheerio";
import { fetchText } from "../utils/http.js";
import { rateLimiter } from "../utils/rate-limiter.js";
export class BdtdAdapter {
    baseUrl = "https://bdtd.ibict.br/vufind";
    /**
     * Search BDTD via VuFind REST API.
     * Pattern from ApoenaX/bdtd-scraper on GitHub.
     */
    async search(query, opts) {
        const limit = opts?.limit ?? 20;
        const page = opts?.page ?? 1;
        const type = opts?.type ?? "AllFields";
        const url = `${this.baseUrl}/api/v1/search?lookfor=${encodeURIComponent(query)}&type=${type}&limit=${limit}&page=${page}`;
        await rateLimiter.acquire(url);
        const text = await fetchText(url, {
            timeout: 30_000,
            headers: { Accept: "application/json" },
        });
        const data = JSON.parse(text);
        return data.records.map((r) => {
            const authors = r.authors?.primary ? Object.keys(r.authors.primary) : [];
            const recordUrl = r.urls?.[0]?.url ?? `${this.baseUrl}/Record/${r.id}`;
            return {
                repositoryId: "BR-AGG-0001",
                repositoryName: "BDTD (IBICT)",
                identifier: r.id,
                title: r.title ?? "",
                creators: authors,
                description: r.abstract?.[0] ?? "",
                date: r.publicationDates?.[0] ?? "",
                type: "thesis/dissertation",
                url: recordUrl,
                accessMethod: "bdtd-vufind",
            };
        });
    }
    async getRecord(id) {
        const url = `${this.baseUrl}/api/v1/record?id=${encodeURIComponent(id)}`;
        await rateLimiter.acquire(url);
        const text = await fetchText(url, {
            timeout: 15_000,
            headers: { Accept: "application/json" },
        });
        const data = JSON.parse(text);
        const r = data.records?.[0];
        if (!r)
            throw new Error(`BDTD record not found: ${id}`);
        return {
            title: [r.title],
            creator: r.authors?.primary ? Object.keys(r.authors.primary) : [],
            date: r.publicationDates ?? [],
            description: r.abstract ?? [],
            subject: r.subjects?.flat() ?? [],
            language: r.languages ?? [],
            type: ["thesis/dissertation"],
        };
    }
}
export class ScieloAdapter {
    baseUrl = "http://articlemeta.scielo.org/api/v1";
    /**
     * Search SciELO articles via ArticleMeta API.
     * Pattern from scieloorg/articles_meta on GitHub.
     */
    async search(query, opts) {
        const limit = opts?.limit ?? 20;
        const offset = opts?.offset ?? 0;
        const collection = opts?.collection ?? "scl"; // scl = SciELO Brazil
        // ArticleMeta doesn't have a search endpoint — use article listing with filters.
        // For fulltext search, we use the BDTD-style approach via the SciELO website search.
        // Actually, SciELO search API at search.scielo.org blocks programmatic access (403),
        // so we use the ArticleMeta listing endpoint which returns metadata.
        // Strategy: use the website search with HTML scraping as fallback
        const searchUrl = `https://search.scielo.org/?q=${encodeURIComponent(query)}&lang=pt&count=${limit}&from=${offset}`;
        await rateLimiter.acquire(searchUrl);
        try {
            const html = await fetchText(searchUrl, { timeout: 30_000 });
            return this.parseSearchResults(html, query);
        }
        catch {
            // Fallback: return empty if blocked
            return [];
        }
    }
    parseSearchResults(html, query) {
        const $ = cheerio.load(html);
        const results = [];
        // SciELO search results use specific CSS classes
        $(".item").each((_, el) => {
            const titleEl = $(el).find(".title a, .titulo a, h2 a, h3 a").first();
            const title = titleEl.text().trim();
            const href = titleEl.attr("href");
            if (!title || !href)
                return;
            const authorsText = $(el).find(".author, .autor").text().trim();
            const dateText = $(el).find(".date, .data").text().trim();
            results.push({
                repositoryId: "BR-AGG-0002",
                repositoryName: "SciELO",
                identifier: href,
                title,
                creators: authorsText ? [authorsText] : [],
                description: "",
                date: dateText,
                type: "article",
                url: href.startsWith("http") ? href : `https://scielo.br${href}`,
                accessMethod: "scielo-search",
            });
        });
        return results;
    }
    /**
     * Get article metadata from ArticleMeta API.
     */
    async getArticle(pid, collection = "scl") {
        const url = `${this.baseUrl}/article/?code=${pid}&collection=${collection}`;
        await rateLimiter.acquire(url);
        const text = await fetchText(url, {
            timeout: 15_000,
            headers: { Accept: "application/json" },
        });
        const data = JSON.parse(text);
        return {
            title: data.title ? Object.values(data.title) : [],
            creator: data.authors?.map(a => `${a.given_names} ${a.surname}`) ?? [],
            date: data.publication_date ? [data.publication_date] : [],
            description: data.abstract ? Object.values(data.abstract) : [],
            subject: data.subject_areas ?? [],
        };
    }
    /**
     * List collections available in SciELO.
     */
    async listCollections() {
        const url = `${this.baseUrl}/collection/identifiers/`;
        await rateLimiter.acquire(url);
        const text = await fetchText(url, {
            timeout: 15_000,
            headers: { Accept: "application/json" },
        });
        return JSON.parse(text);
    }
}
// ─── USP Custom Scraper ──────────────────────────────────────
export class UspAdapter {
    baseUrl = "https://repositorio.usp.br";
    /**
     * Search USP repository via custom result.php endpoint.
     * USP doesn't use DSpace — it has a custom PHP system.
     */
    async search(query, opts) {
        const url = `${this.baseUrl}/result.php?q=${encodeURIComponent(query)}`;
        await rateLimiter.acquire(url);
        const html = await fetchText(url, { timeout: 30_000 });
        return this.parseResults(html, query);
    }
    parseResults(html, query) {
        const $ = cheerio.load(html);
        const results = [];
        const seen = new Set();
        // USP result.php has links to individual records with result.php?id=
        $("a").each((_, el) => {
            const href = $(el).attr("href");
            if (!href)
                return;
            // USP item links contain result.php?id= or specific record patterns
            if (!href.includes("result.php?id=") && !href.includes("/result.php?"))
                return;
            if (href.includes("&q="))
                return; // Skip search form links
            const title = $(el).text().trim();
            if (!title || title.length < 5)
                return;
            // Resolve URL
            const finalUrl = href.startsWith("http") ? href : `${this.baseUrl}/${href.replace(/^\//, "")}`;
            if (seen.has(finalUrl))
                return;
            seen.add(finalUrl);
            results.push({
                repositoryId: "USP-001",
                repositoryName: "Repositório USP",
                identifier: href,
                title,
                creators: [],
                description: "",
                date: "",
                type: "",
                url: finalUrl,
                accessMethod: "usp-custom",
            });
        });
        return results;
    }
    async getItemMetadata(itemUrl) {
        await rateLimiter.acquire(itemUrl);
        const html = await fetchText(itemUrl, { timeout: 30_000 });
        const $ = cheerio.load(html);
        const meta = {};
        // USP uses standard DC meta tags
        const tagMap = {
            "DC.title": "title",
            "DC.creator": "creator",
            "DC.date": "date",
            "DC.description": "description",
            "DC.subject": "subject",
            "DC.language": "language",
            "DC.type": "type",
            "DC.publisher": "publisher",
            citation_title: "title",
            citation_author: "creator",
            citation_date: "date",
        };
        for (const [tagName, field] of Object.entries(tagMap)) {
            const values = [];
            $(`meta[name='${tagName}']`).each((_, el) => {
                const content = $(el).attr("content")?.trim();
                if (content)
                    values.push(content);
            });
            if (values.length > 0) {
                meta[field] = [...(meta[field] ?? []), ...values];
            }
        }
        return meta;
    }
}
// ─── DSpace 7 OAI-PMH Path Fix ──────────────────────────────
/**
 * DSpace 7 serves OAI-PMH at /server/oai/request, not /oai/request.
 * This function resolves the correct OAI-PMH endpoint for a given platform version.
 */
export function resolveOaiEndpoint(baseUrl, platform) {
    const clean = baseUrl.replace(/\/+$/, "");
    // Return multiple candidates in priority order
    const candidates = [];
    // DSpace 7 pattern
    candidates.push(`${clean}/server/oai/request`);
    // DSpace 5/6 pattern (standard)
    candidates.push(`${clean}/oai/request`);
    // JSPUI/XMLUI variants
    candidates.push(`${clean}/jspui/oai/request`);
    candidates.push(`${clean}/xmlui/oai/request`);
    return candidates;
}
//# sourceMappingURL=platform-adapters.js.map