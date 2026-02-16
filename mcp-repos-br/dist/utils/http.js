/**
 * HTTP client utility with retry, timeout, and polite user-agent.
 * Shared across all access layers.
 */
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];
const DEFAULT_OPTIONS = {
    timeout: 30_000,
    maxRetries: 3,
    headers: {},
    acceptSelfSigned: true,
};
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Fetch with retry (exponential backoff) and configurable timeout.
 * Uses NODE_TLS_REJECT_UNAUTHORIZED for self-signed cert support.
 */
export async function fetchWithRetry(url, options) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    // Allow self-signed certificates for Brazilian repos
    if (opts.acceptSelfSigned) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    let lastError = null;
    for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
        // Create fresh controller per attempt (previous bug: shared across retries)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
        try {
            const response = await fetch(url, {
                method: options?.method ?? "GET",
                headers: {
                    "User-Agent": getRandomUserAgent(),
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                    ...opts.headers,
                },
                signal: controller.signal,
                body: options?.body,
                redirect: "follow",
            });
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            lastError = error;
            if (attempt < opts.maxRetries - 1) {
                const backoffMs = Math.pow(2, attempt) * 1000;
                await sleep(backoffMs);
            }
        }
    }
    // Restore TLS setting
    if (opts.acceptSelfSigned) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
    throw new Error(`Failed after ${opts.maxRetries} attempts for ${url}: ${lastError?.message}`);
}
/**
 * Fetch text content with retry.
 */
export async function fetchText(url, options) {
    const response = await fetchWithRetry(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.text();
}
/**
 * Fetch and return response + body as buffer (for downloads).
 */
export async function fetchBuffer(url, options) {
    const response = await fetchWithRetry(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const buffer = await response.arrayBuffer();
    return {
        buffer,
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
    };
}
//# sourceMappingURL=http.js.map