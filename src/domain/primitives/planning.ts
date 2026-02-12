import { BasePrimitive, PrimitiveResult } from './types.js';
import { providerRouter } from '../../infrastructure/adapters/router.js';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('PlanningPrimitive');

export class PlanningPrimitive extends BasePrimitive {
    public id = 'planning';
    public name = 'Planning Primitive';

    public async execute(input: { task: string; context?: string }, onChunk?: (chunk: string) => void): Promise<PrimitiveResult> {
        const systemPrompt = `You are the VIBE Planning Engine.
Your goal is to decompose a coding task into actionable steps using these primitives:

PRIMITIVES AND THEIR USAGE:
- COMPLETION: Generate and create NEW code files. Use for: creating HTML, CSS, JS files, writing new components, generating code from scratch.
- MULTI-EDIT: Modify EXISTING files or create multiple related files. Use for: updating code, refactoring, adding features to existing files.
- EXECUTION: Run SHELL COMMANDS ONLY. Use for: mkdir, npm install, git commands, running tests, ls, cat. NOT for creating files with content.
- APPROVAL: Get user confirmation for important decisions.
- MEMORY: Store or retrieve information about the project.
- SEARCH: Find files or content in the codebase.

IMPORTANT RULES:
1. For "Create file X with content" -> Use COMPLETION, NOT EXECUTION
2. For "Run command X" or "Make folder" -> Use EXECUTION
3. For "Update/modify existing file" -> Use MULTI-EDIT
4. Keep plans concise - 3-5 steps for simple tasks
5. Use double quotes for all JSON strings

OUTPUT FORMAT: JSON array only, no extra text
[{ "step": 1, "task": "description", "primitive": "PRIMITIVE_NAME", "rationale": "why" }]`;

        const userPrompt = `Task: ${input.task}\nContext: ${input.context || 'None'}`;

        try {
            let fullText = '';
            const stream = providerRouter.stream(userPrompt, {
                systemPrompt,
            });

            for await (const chunk of stream) {
                fullText += chunk;
                if (onChunk) onChunk(chunk);
            }

            // Extract JSON array from response
            const jsonMatch = fullText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return {
                    success: false,
                    error: 'Failed to parse plan from LLM response',
                    data: fullText
                };
            }

            // Sanitize and parse JSON
            const plan = this.parseJsonSafely(jsonMatch[0]);
            if (!plan) {
                return {
                    success: false,
                    error: 'Failed to parse plan JSON - invalid format',
                    data: jsonMatch[0]
                };
            }

            return {
                success: true,
                data: plan,
            };
        } catch (error: any) {
            logger.error(`Planning failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Safely parse JSON with sanitization for common LLM output issues.
     */
    private parseJsonSafely(jsonStr: string): any[] | null {
        try {
            // First, try direct parsing
            return JSON.parse(jsonStr);
        } catch (e) {
            // Sanitization steps for common LLM JSON issues
            let sanitized = jsonStr;

            try {
                // Step 1: Replace single quotes with double quotes (but not inside strings)
                // This is a simple approach that works for most cases
                sanitized = sanitized.replace(/'/g, '"');

                // Step 2: Remove trailing commas before ] or }
                sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');

                // Step 3: Fix unquoted property names
                sanitized = sanitized.replace(/(\{|\,)\s*(\w+)\s*:/g, '$1"$2":');

                // Step 4: Remove any control characters
                sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');

                // Step 5: Try parsing again
                return JSON.parse(sanitized);
            } catch (e2) {
                logger.error(`JSON sanitization failed: ${(e2 as Error).message}`);
                logger.error(`Original: ${jsonStr.substring(0, 200)}...`);
                return null;
            }
        }
    }
}

