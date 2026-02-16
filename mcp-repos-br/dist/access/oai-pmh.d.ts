/**
 * OAI-PMH client — primary access layer.
 * Implements the six OAI-PMH verbs against DSpace/TEDE endpoints.
 */
import type { OaiIdentifyResponse, OaiListRecordsResponse, OaiRecord, OaiSetInfo, MetadataFormat } from "../types.js";
export interface ListRecordsOptions {
    metadataPrefix?: string;
    from?: string;
    until?: string;
    set?: string;
    resumptionToken?: string;
}
export declare class OaiPmhClient {
    /**
     * OAI-PMH Identify verb.
     */
    identify(endpoint: string): Promise<OaiIdentifyResponse>;
    /**
     * OAI-PMH ListRecords verb (single page).
     */
    listRecords(endpoint: string, opts?: ListRecordsOptions): Promise<OaiListRecordsResponse>;
    /**
     * OAI-PMH ListRecords with automatic pagination.
     * Yields records up to maxRecords.
     */
    listAllRecords(endpoint: string, opts?: Omit<ListRecordsOptions, "resumptionToken"> & {
        maxRecords?: number;
    }): Promise<OaiRecord[]>;
    /**
     * OAI-PMH GetRecord verb.
     */
    getRecord(endpoint: string, identifier: string, metadataPrefix?: string): Promise<OaiRecord>;
    /**
     * OAI-PMH ListSets verb.
     */
    listSets(endpoint: string): Promise<OaiSetInfo[]>;
    /**
     * OAI-PMH ListMetadataFormats verb.
     */
    listMetadataFormats(endpoint: string): Promise<MetadataFormat[]>;
    /**
     * Build OAI-PMH request URL.
     */
    private buildUrl;
}
//# sourceMappingURL=oai-pmh.d.ts.map