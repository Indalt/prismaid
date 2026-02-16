
import { z } from "zod";
import { Registry } from "../registry/loader.js";
import { AccessStrategy } from "../access/strategy.js";
import { program } from "commander";

// CLI Definition
program
    .requiredOption("-q, --query <string>", "Search query")
    .option("-t, --title", "Search in title only")
    .option("-a, --author <string>", "Filter by author")
    .option("-f, --from <date>", "Date from (YYYY-MM-DD)")
    .option("-u, --until <date>", "Date until (YYYY-MM-DD)")
    .option("--max <number>", "Max results", "20")
    .parse(process.argv);

const options = program.opts();

async function main() {
    try {
        // Initialize
        const registry = Registry.loadDefault();
        const strategy = new AccessStrategy();

        // Filter Repos (optional logic can be added here, for now searching all active)
        const repos = registry.getActive();

        if (repos.length === 0) {
            console.log(JSON.stringify({ error: "No active repositories found" }));
            return;
        }

        const allResults: any[] = [];
        const errors: any[] = [];

        // Execute Search in Parallel (with limit?) or Sequential
        // Doing sequential for safety/logging in prototype
        for (const repo of repos) {
            try {
                // Determine capabilities (cached inside strategy)
                // strategy.search handles the switching Logic (BDTD -> OAI -> Scraper)
                const results = await strategy.search(repo, options.query, {
                    title: options.title ? options.query : undefined, // specific strategy logic might need adjustment
                    author: options.author,
                    dateFrom: options.from,
                    dateUntil: options.until,
                    maxResults: parseInt(options.max),
                });

                // Tag results with repo metadata
                const tagged = results.map(r => ({ ...r, _origin: repo.id }));
                allResults.push(...tagged);

            } catch (e: any) {
                errors.push({ repo: repo.id, msg: e.message });
            }
        }

        // Output JSON for the UI to consume
        console.log(JSON.stringify({
            stats: {
                total: allResults.length,
                repos_queried: repos.length,
                errors: errors
            },
            results: allResults
        }, null, 2));

    } catch (e: any) {
        console.error(JSON.stringify({ error: e.message }));
        process.exit(1);
    }
}

main();
