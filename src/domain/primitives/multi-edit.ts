import { BasePrimitive, PrimitiveResult } from './types.js';
import { providerRouter } from '../../infrastructure/adapters/router.js';
import fs from 'fs-extra';
import path from 'path';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('MultiEditPrimitive');

export class MultiEditPrimitive extends BasePrimitive {
    public id = 'multi-edit';
    public name = 'Multi-Edit Primitive';

    public async execute(input: {
        files?: string[];
        description?: string;
        task?: string;
        step?: number;
        primitive?: string;
        dryRun?: boolean;
    }): Promise<PrimitiveResult> {
        // Use task as description if description is not provided (for orchestration)
        const description = input.description || input.task;

        if (!description) {
            return {
                success: false,
                error: 'No description or task provided for multi-edit primitive',
            };
        }

        // If no files specified, this is a creation task from orchestration
        const files = input.files || [];
        const isCreationTask = files.length === 0;

        logger.info(`${isCreationTask ? 'Creating' : 'Editing'} files: ${description} `);

        try {
            // 1. Read existing files (if any)
            const fileContents: Record<string, string> = {};
            for (const file of files) {
                if (fs.existsSync(file)) {
                    fileContents[file] = await fs.readFile(file, 'utf-8');
                }
            }

            // 2. Prepare LLM prompt with clear JSON formatting instructions
            const systemPrompt = isCreationTask
                ? `You are an expert software developer.Create complete, working code files based on the requirements.

OUTPUT FORMAT: You MUST output a single JSON object and nothing else.
The JSON object should have file paths as keys and file contents as values.

EXAMPLE OUTPUT:
\`\`\`json
{
  "index.html": "<!DOCTYPE html>\\n<html>...</html>",
  "style.css": "body { margin: 0; }"
}
\`\`\`

RULES:
- Output ONLY the JSON object
- Use double quotes for all strings
- Escape newlines as \\n in content strings
- No text before or after the JSON`
                : `You are a surgical code editor.

OUTPUT FORMAT: You MUST output a single JSON object and nothing else.
The JSON object should have file paths as keys and the NEW complete file contents as values.

EXAMPLE OUTPUT:
\`\`\`json
{
  "index.html": "<!DOCTYPE html>\\n<html>...</html>"
}
\`\`\`

RULES:
- Output ONLY the JSON object
- Use double quotes for all strings  
- Escape newlines as \\n in content strings
- No text before or after the JSON
- Preserve original coding style`;

            const userPrompt = isCreationTask
                ? `Create these files: ${description}\n\nRespond with ONLY a JSON object.`
                : `Request: ${description}\n\nFiles:\n${JSON.stringify(fileContents, null, 2)}\n\nRespond with ONLY a JSON object containing the updated files.`;

            const response = await providerRouter.completion(userPrompt, {
                systemPrompt,
            });

            // 3. Extract and parse JSON from response
            const updates = this.extractJsonFromResponse(response.content);
            if (!updates) {
                logger.error(`Failed to extract JSON. Response preview: ${response.content.substring(0, 300)}`);
                return { success: false, error: 'Failed to parse JSON from LLM output - invalid format' };
            }

            const appliedFiles = [];

            // Before applying, create a checkpoint
            try {
                const { execSync } = require('child_process');
                execSync('git add .');
                execSync(`git commit -m "VIBE_AUTO_CHECKPOINT: Before ${description.slice(0, 30)}" --allow-empty`);
            } catch (e) {
                logger.warn('Git checkpoint failed before multi-edit');
            }

            for (const [filePath, newContent] of Object.entries(updates)) {
                const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

                if (input.dryRun) {
                    logger.info(`[DRY-RUN] Would write to: ${filePath} (${(newContent as string).length} bytes)`);
                    appliedFiles.push(filePath);
                    continue;
                }

                await fs.mkdirp(path.dirname(absolutePath));
                await fs.writeFile(absolutePath, newContent as string);
                appliedFiles.push(filePath);
                logger.info(`Written file: ${filePath}`);
            }

            return {
                success: true,
                data: { appliedFiles },
            };
        } catch (error: any) {
            logger.error(`Multi-edit failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract JSON object from LLM response using multiple strategies.
     */
    private extractJsonFromResponse(text: string): Record<string, string> | null {
        // Strategy 1: Look for JSON inside code blocks first
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
            const result = this.parseJsonSafely(codeBlockMatch[1]);
            if (result) return result;
        }

        // Strategy 2: Try to find a balanced JSON object
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
            let depth = 0;
            let inString = false;
            let escape = false;
            let jsonEnd = -1;

            for (let i = jsonStart; i < text.length; i++) {
                const char = text[i];

                if (escape) {
                    escape = false;
                    continue;
                }

                if (char === '\\' && inString) {
                    escape = true;
                    continue;
                }

                if (char === '"' && !escape) {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === '{') depth++;
                    else if (char === '}') {
                        depth--;
                        if (depth === 0) {
                            jsonEnd = i + 1;
                            break;
                        }
                    }
                }
            }

            if (jsonEnd !== -1) {
                const jsonStr = text.substring(jsonStart, jsonEnd);
                const result = this.parseJsonSafely(jsonStr);
                if (result) return result;
            }
        }

        // Strategy 3: Try all { to } matches and find one that parses
        const allMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (allMatches) {
            for (const match of allMatches) {
                const result = this.parseJsonSafely(match);
                if (result && Object.keys(result).length > 0) {
                    // Verify it looks like file mappings (keys should look like file paths)
                    const hasFilePaths = Object.keys(result).some(k =>
                        k.includes('.') || k.includes('/') || k.includes('\\')
                    );
                    if (hasFilePaths) return result;
                }
            }
        }

        return null;
    }

    /**
     * Safely parse JSON with sanitization for common LLM output issues.
     */
    private parseJsonSafely(jsonStr: string): Record<string, string> | null {
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            let sanitized = jsonStr;

            try {
                // Replace single quotes with double quotes
                sanitized = sanitized.replace(/'/g, '"');

                // Remove trailing commas before } or ]
                sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');

                // Fix unquoted property names
                sanitized = sanitized.replace(/(\{|\,)\s*(\w+)\s*:/g, '$1"$2":');

                // Remove control characters
                sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');

                return JSON.parse(sanitized);
            } catch (e2) {
                logger.error(`JSON sanitization failed: ${(e2 as Error).message}`);
                return null;
            }
        }
    }
}


