/**
 * HTTP client utility with retry, timeout, and polite user-agent.
 * Shared across all access layers.
 */
export interface HttpOptions {
    timeout?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
    acceptSelfSigned?: boolean;
}
/**
 * Fetch with retry (exponential backoff) and configurable timeout.
 * Uses NODE_TLS_REJECT_UNAUTHORIZED for self-signed cert support.
 */
export declare function fetchWithRetry(url: string, options?: HttpOptions & {
    method?: string;
    body?: string;
}): Promise<Response>;
/**
 * Fetch text content with retry.
 */
export declare function fetchText(url: string, options?: HttpOptions): Promise<string>;
/**
 * Fetch and return response + body as buffer (for downloads).
 */
export declare function fetchBuffer(url: string, options?: HttpOptions): Promise<{
    buffer: ArrayBuffer;
    contentType: string;
}>;
//# sourceMappingURL=http.d.ts.map