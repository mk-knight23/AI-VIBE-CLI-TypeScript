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
        let packed = '';
        let currentLength = 0;

        for (const snip of sorted) {
            const estimatedTokens = Math.ceil(snip.content.length / 4);
            if (currentLength + estimatedTokens > this.MAX_TOKENS) break;

            packed += `\n--- START SNIPPET: ${snip.id} ---\n${snip.content}\n--- END SNIPPET ---\n`;
            currentLength += estimatedTokens;
        }

        return packed;
    }
}
