/**
 * OAI-PMH XML response parser.
 * Converts XML responses from OAI-PMH endpoints into typed objects.
 */
import type { OaiIdentifyResponse, OaiRecord, OaiListRecordsResponse, OaiSetInfo, MetadataFormat } from "../types.js";
/**
 * Parse OAI-PMH Identify response.
 */
export declare function parseIdentifyResponse(xml: string): OaiIdentifyResponse;
/**
 * Parse OAI-PMH ListRecords response.
 */
export declare function parseListRecordsResponse(xml: string): OaiListRecordsResponse;
/**
 * Parse OAI-PMH GetRecord response.
 */
export declare function parseGetRecordResponse(xml: string): OaiRecord;
/**
 * Parse OAI-PMH ListSets response.
 */
export declare function parseListSetsResponse(xml: string): OaiSetInfo[];
/**
 * Parse OAI-PMH ListMetadataFormats response.
 */
export declare function parseListMetadataFormatsResponse(xml: string): MetadataFormat[];
//# sourceMappingURL=xml-parser.d.ts.map