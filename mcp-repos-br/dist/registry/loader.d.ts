/**
 * Registry loader — reads the JSON repository database,
 * validates with Zod, and provides query methods.
 */
import { type RepositoryEntry, type Platform, type InstitutionType } from "../types.js";
export declare class Registry {
    private entries;
    constructor(entries: RepositoryEntry[]);
    /**
     * Load registry from the bundled JSON file.
     */
    static loadDefault(): Registry;
    /**
     * Load registry from a custom JSON file path.
     */
    static loadFromFile(path: string): Registry;
    getAll(): RepositoryEntry[];
    getById(id: string): RepositoryEntry | undefined;
    getByState(uf: string): RepositoryEntry[];
    getByPlatform(platform: Platform): RepositoryEntry[];
    getByInstitutionType(type: InstitutionType): RepositoryEntry[];
    getActive(): RepositoryEntry[];
    getWithOaiPmh(): RepositoryEntry[];
    /**
     * Stats summary for the repos://stats resource.
     */
    getStats(): Record<string, unknown>;
    count(): number;
}
//# sourceMappingURL=loader.d.ts.map