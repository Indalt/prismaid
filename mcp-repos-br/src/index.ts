/**
 * MCP Server entry point.
 * Registers all tools, resources, and starts the stdio transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Registry } from "./registry/loader.js";
import { AccessStrategy } from "./access/strategy.js";

// ─── Initialize ───────────────────────────────────────────────

const registry = Registry.loadDefault();
const strategy = new AccessStrategy();

const server = new McpServer({
    name: "mcp-repos-br",
    version: "1.0.0",
});

// ─── Resources ────────────────────────────────────────────────

server.resource(
    "registry",
    "repos://registry",
    { description: "Cadastro mestre de repositórios acadêmicos brasileiros" },
    async () => ({
        contents: [{
            uri: "repos://registry",
            mimeType: "application/json",
            text: JSON.stringify(registry.getAll(), null, 2),
        }],
    })
);

server.resource(
    "stats",
    "repos://stats",
    { description: "Estatísticas agregadas do cadastro de repositórios" },
    async () => ({
        contents: [{
            uri: "repos://stats",
            mimeType: "application/json",
            text: JSON.stringify(registry.getStats(), null, 2),
        }],
    })
);

// ─── Tools ────────────────────────────────────────────────────

server.tool(
    "search_repository",
    "Busca artigos/teses em repositórios acadêmicos brasileiros. Usa OAI-PMH, DSpace REST ou scraping conforme disponibilidade.",
    {
        query: z.string().describe("Termo(s) de busca por tema (ex: 'bebida fermentada', 'inteligência artificial')"),
        repositories: z.array(z.string()).optional()
            .describe("IDs dos repos (ex: ['BR-FED-0001', 'BR-AGG-0001']). Omita para buscar em todos os ativos."),
        title: z.string().optional().describe("Buscar especificamente no título"),
        author: z.string().optional().describe("Filtrar por autor"),
        state: z.string().optional().describe("Filtrar por UF (ex: 'BA', 'SP')"),
        institutionType: z.enum(["federal", "estadual", "privada", "comunitaria", "instituto_federal"]).optional()
            .describe("Filtrar por tipo de instituição"),
        institution: z.string().optional().describe("Filtrar por universidade (ex: 'Universidade Federal da Bahia')"),
        degreeType: z.enum(["graduacao", "mestrado", "doutorado", "pos-doutorado", "livre-docencia"]).optional()
            .describe("Tipo de grau (mestrado, doutorado, etc.) — funciona em BDTD"),
        subjectArea: z.string().optional().describe("Área do conhecimento (ex: 'ciências agrárias')"),
        issn: z.string().optional().describe("ISSN do periódico — funciona em SciELO"),
        dateFrom: z.string().optional().describe("Data inicial (ISO: '2020-01-01')"),
        dateUntil: z.string().optional().describe("Data final (ISO: '2025-12-31')"),
        maxResults: z.number().default(50).describe("Máximo de resultados por repositório"),
    },
    async (params) => {
        let repos = registry.getActive();

        if (params.repositories && params.repositories.length > 0) {
            repos = params.repositories
                .map((id) => registry.getById(id))
                .filter((r): r is NonNullable<typeof r> => r !== undefined);
        } else {
            if (params.state) {
                repos = repos.filter((r) => r.institution.state.toUpperCase() === params.state!.toUpperCase());
            }
            if (params.institutionType) {
                repos = repos.filter((r) => r.institution.type === params.institutionType);
            }
        }

        if (repos.length === 0) {
            return { content: [{ type: "text", text: "Nenhum repositório encontrado com os filtros especificados." }] };
        }

        const allResults = [];
        const errors: string[] = [];

        for (const repo of repos) {
            try {
                const results = await strategy.search(repo, params.query, {
                    title: params.title,
                    author: params.author,
                    dateFrom: params.dateFrom,
                    dateUntil: params.dateUntil,
                    degreeType: params.degreeType,
                    institution: params.institution,
                    state: params.state,
                    subjectArea: params.subjectArea,
                    issn: params.issn,
                    maxResults: params.maxResults,
                });
                allResults.push(...results);
            } catch (error) {
                errors.push(`${repo.id} (${repo.institution.acronym}): ${(error as Error).message}`);
            }
        }

        const summary = [
            `## Resultados da Busca: "${params.query}"`,
            `**Repositórios consultados:** ${repos.length}`,
            `**Resultados encontrados:** ${allResults.length}`,
            errors.length > 0 ? `**Erros:** ${errors.length}\n${errors.map((e) => `- ${e}`).join("\n")}` : "",
            "",
            ...allResults.map((r, i) => [
                `### ${i + 1}. ${r.title}`,
                r.creators.length > 0 ? `**Autores:** ${r.creators.join("; ")}` : "",
                r.description ? `**Resumo:** ${r.description.slice(0, 300)}${r.description.length > 300 ? "..." : ""}` : "",
                r.date ? `**Data:** ${r.date}` : "",
                r.doi ? `**DOI:** [${r.doi}](https://doi.org/${r.doi})` : "",
                r.journal ? `**Periódico:** ${r.journal}${r.issn ? ` (ISSN: ${r.issn})` : ""}` : "",
                r.degreeType ? `**Tipo:** ${r.degreeType}` : "",
                r.institution ? `**Instituição:** ${r.institution}${r.state ? ` (${r.state})` : ""}` : "",
                r.subjectAreas?.length ? `**Áreas:** ${r.subjectAreas.join(", ")}` : "",
                `**Repositório:** ${r.repositoryName}`,
                `**URL:** ${r.url}`,
                r.pdfUrl ? `**PDF:** ${r.pdfUrl}` : "",
                `**Método:** ${r.accessMethod}`,
                "",
            ].filter(Boolean).join("\n")),
        ].filter(Boolean).join("\n");

        return { content: [{ type: "text", text: summary }] };
    }
);

server.tool(
    "get_record_metadata",
    "Obtém metadados completos (Dublin Core) de um registro específico em um repositório.",
    {
        repositoryId: z.string().describe("ID do repositório (ex: 'BR-FED-0001')"),
        recordIdentifier: z.string()
            .describe("Identificador OAI ou URL/handle do registro (ex: 'oai:repositorio.ufba.br:ri/36884' ou 'https://repositorio.ufba.br/handle/ri/36884')"),
    },
    async (params) => {
        const repo = registry.getById(params.repositoryId);
        if (!repo) {
            return { content: [{ type: "text", text: `Repositório ${params.repositoryId} não encontrado.` }] };
        }

        const metadata = await strategy.getMetadata(repo, params.recordIdentifier);
        return {
            content: [{
                type: "text",
                text: JSON.stringify(metadata, null, 2),
            }],
        };
    }
);

server.tool(
    "harvest_records",
    "Coleta registros em massa via OAI-PMH de um repositório específico. Ideal para harvesting completo ou por coleção.",
    {
        repositoryId: z.string().describe("ID do repositório"),
        set: z.string().optional().describe("Coleção/comunidade OAI-PMH (setSpec)"),
        dateFrom: z.string().optional().describe("Data inicial (ISO)"),
        dateUntil: z.string().optional().describe("Data final (ISO)"),
        maxRecords: z.number().default(100).describe("Máximo de registros a coletar"),
        metadataPrefix: z.string().default("oai_dc").describe("Formato de metadados"),
    },
    async (params) => {
        const repo = registry.getById(params.repositoryId);
        if (!repo) {
            return { content: [{ type: "text", text: `Repositório ${params.repositoryId} não encontrado.` }] };
        }

        if (!repo.access.oaiPmh.available || !repo.access.oaiPmh.endpoint) {
            return { content: [{ type: "text", text: `Repositório ${params.repositoryId} não tem OAI-PMH disponível. Use search_repository como alternativa.` }] };
        }

        const oai = strategy.getOaiClient();
        const records = await oai.listAllRecords(repo.access.oaiPmh.endpoint, {
            set: params.set,
            from: params.dateFrom,
            until: params.dateUntil,
            metadataPrefix: params.metadataPrefix,
            maxRecords: params.maxRecords,
        });

        const summary = [
            `## Harvest: ${repo.repository.name}`,
            `**Registros coletados:** ${records.length}`,
            "",
            ...records.slice(0, 20).map((r, i) => [
                `### ${i + 1}. ${r.metadata.title[0] ?? "(sem título)"}`,
                r.metadata.creator.length > 0 ? `**Autores:** ${r.metadata.creator.join("; ")}` : "",
                r.metadata.date[0] ? `**Data:** ${r.metadata.date[0]}` : "",
                `**ID:** ${r.identifier}`,
                "",
            ].filter(Boolean).join("\n")),
            records.length > 20 ? `\n... e mais ${records.length - 20} registros (use maxRecords para controlar)` : "",
        ].join("\n");

        return { content: [{ type: "text", text: summary }] };
    }
);

server.tool(
    "validate_repository",
    "Verifica a saúde e capacidades de um ou mais repositórios (conectividade, OAI-PMH, REST API).",
    {
        repositoryId: z.string().optional()
            .describe("ID específico ou omita para validar todos os ativos"),
        checks: z.array(z.enum(["connectivity", "oai_pmh", "rest_api", "search"]))
            .default(["connectivity", "oai_pmh"])
            .describe("Tipos de verificação a executar"),
    },
    async (params) => {
        const repos = params.repositoryId
            ? [registry.getById(params.repositoryId)].filter(Boolean) as NonNullable<ReturnType<Registry['getById']>>[]
            : registry.getActive();

        if (repos.length === 0) {
            return { content: [{ type: "text", text: "Nenhum repositório encontrado." }] };
        }

        const oai = strategy.getOaiClient();
        const rest = strategy.getRestClient();
        const results: string[] = [];

        for (const repo of repos) {
            const checks: string[] = [];

            // Connectivity
            if (params.checks.includes("connectivity")) {
                const start = Date.now();
                try {
                    const res = await fetch(repo.repository.url, {
                        signal: AbortSignal.timeout(10_000),
                    });
                    checks.push(`✅ Conectividade: HTTP ${res.status} (${Date.now() - start}ms)`);
                } catch (e) {
                    checks.push(`❌ Conectividade: ${(e as Error).message}`);
                }
            }

            // OAI-PMH
            if (params.checks.includes("oai_pmh") && repo.access.oaiPmh.endpoint) {
                const start = Date.now();
                try {
                    const identify = await oai.identify(repo.access.oaiPmh.endpoint);
                    checks.push(`✅ OAI-PMH: ${identify.repositoryName} (${Date.now() - start}ms)`);
                } catch (e) {
                    checks.push(`❌ OAI-PMH: ${(e as Error).message}`);
                }
            } else if (params.checks.includes("oai_pmh")) {
                checks.push("⏭️ OAI-PMH: sem endpoint configurado");
            }

            // REST API
            if (params.checks.includes("rest_api")) {
                const start = Date.now();
                const works = await rest.detect(repo.repository.url);
                if (works) {
                    checks.push(`✅ REST API: DSpace 7 detectado (${Date.now() - start}ms)`);
                } else {
                    checks.push(`❌ REST API: não detectado (${Date.now() - start}ms)`);
                }
            }

            // Search
            if (params.checks.includes("search")) {
                const start = Date.now();
                try {
                    const searchResults = await strategy.search(repo, "teste", { maxResults: 1 });
                    checks.push(`✅ Busca: ${searchResults.length > 0 ? "funcional" : "sem resultados"} (${Date.now() - start}ms)`);
                } catch (e) {
                    checks.push(`❌ Busca: ${(e as Error).message}`);
                }
            }

            results.push([
                `### ${repo.institution.acronym} — ${repo.repository.name}`,
                `**ID:** ${repo.id} | **URL:** ${repo.repository.url}`,
                ...checks,
            ].join("\n"));
        }

        return {
            content: [{
                type: "text",
                text: `# Relatório de Validação\n\n${results.join("\n\n---\n\n")}`,
            }],
        };
    }
);

// ─── Start Server ─────────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("mcp-repos-br server ready");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
