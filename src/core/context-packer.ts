export interface ContextSnippet {
    id: string;
    content: string;
    relevance: number;
}

export class ContextWindowPacker {
    private static MAX_TOKENS = 120000; // Example for GPT-4o

    static pack(snippets: ContextSnippet[]): string {
        // 1. Sort by relevance
        const sorted = snippets.sort((a, b) => b.relevance - a.relevance);

        // 2. Pack up to limit
        const packedParts: string[] = [];
        let currentLength = 0;

        for (const snip of sorted) {
            const estimatedTokens = Math.ceil(snip.content.length / 4);

            // Bounds check to prevent integer overflow (P4-101)
            if (currentLength > Number.MAX_SAFE_INTEGER - estimatedTokens) {
                break;
            }

            if (currentLength + estimatedTokens > this.MAX_TOKENS) {
                break;
            }

            packedParts.push(`\n--- START SNIPPET: ${snip.id} ---\n${snip.content}\n--- END SNIPPET ---\n`);
            currentLength += estimatedTokens;
        }

        return packedParts.join('');
    }
}
