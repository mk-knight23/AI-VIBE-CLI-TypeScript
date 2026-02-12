import { BasePrimitive, PrimitiveResult } from './types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../utils/pino-logger.js';

const execAsync = promisify(exec);
const logger = createLogger('SearchPrimitive');

export class SearchPrimitive extends BasePrimitive {
    public id = 'search';
    public name = 'Search Primitive';

    public async execute(input: {
        query?: string;
        path?: string;
        task?: string;
        step?: number;
        primitive?: string;
    }): Promise<PrimitiveResult> {
        // Use task as query if query is not provided (for orchestration)
        const query = input.query || this.extractSearchTermFromTask(input.task);

        if (!query) {
            return {
                success: false,
                error: 'No query or task provided for search primitive',
            };
        }

        logger.info(`Searching for: "${query}"`);
        const searchPath = input.path || '.';

        try {
            // Use grep -r for cross-platform basic search (should work on mac/linux)
            // Excluding node_modules and .git
            const { stdout } = await execAsync(
                `grep -rIl "${query}" ${searchPath} --exclude-dir={node_modules,.git,.vibe,dist}`
            );

            const files = stdout.split('\n').filter(f => f.trim().length > 0);

            return {
                success: true,
                data: {
                    query,
                    files: files.slice(0, 20), // Limit to top 20 files
                    matchCount: files.length
                }
            };
        } catch (error: any) {
            // grep returns exit code 1 if no matches found
            if (error.code === 1) {
                return {
                    success: true,
                    data: {
                        query,
                        files: [],
                        matchCount: 0
                    }
                };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract search terms from a task description.
     * Examples:
     * - "Search for index.html file" -> "index.html"
     * - "Find documentation for Stripe integration" -> "Stripe"
     * - "Search for payment processing" -> "payment"
     */
    private extractSearchTermFromTask(task?: string): string | undefined {
        if (!task) return undefined;

        const taskLower = task.toLowerCase();

        // Priority 1: Look for file names (e.g., index.html, app.js)
        const fileMatch = task.match(/(\w+\.\w+)/);
        if (fileMatch) {
            return fileMatch[1];
        }

        // Priority 2: Common patterns with stop words removed
        // "find X", "search for X", "read X", "look for X"
        const patterns = [
            /(?:find|search for|look for|read|examine|analyze|check)\s+(?:the\s+)?(?:current\s+)?["']?([a-zA-Z0-9_.-]+)/i,
            /(?:documentation for|integrate|integrating)\s+["']?([a-zA-Z0-9_-]+)/i,
            /([a-zA-Z0-9_-]+)\s+(?:documentation|integration|api|sdk|file)/i,
        ];

        // Stop words to skip
        const stopWords = ['and', 'the', 'for', 'to', 'in', 'on', 'at', 'of', 'a', 'an', 'is', 'are', 'was', 'were'];

        for (const pattern of patterns) {
            const match = task.match(pattern);
            if (match && match[1] && !stopWords.includes(match[1].toLowerCase())) {
                return match[1];
            }
        }

        // Fallback: extract notable keywords
        const keywords = ['stripe', 'paypal', 'auth', 'database', 'api', 'payment', 'login', 'user', 'html', 'css', 'javascript', 'index'];
        for (const keyword of keywords) {
            if (taskLower.includes(keyword)) {
                return keyword;
            }
        }

        // Last resort: use first significant word (not a stop word and > 4 chars)
        const words = task.split(/\s+/).filter(w => w.length > 4 && !stopWords.includes(w.toLowerCase()));
        return words[0] || undefined;
    }
}

