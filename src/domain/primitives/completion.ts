import { BasePrimitive, PrimitiveResult } from './types.js';
import { providerRouter } from '../../infrastructure/adapters/router.js';
import { ProviderOptions } from '../../infrastructure/adapters/types.js';
import { createLogger } from '../../utils/pino-logger.js';
import fs from 'fs-extra';
import path from 'path';

const logger = createLogger('CompletionPrimitive');

export class CompletionPrimitive extends BasePrimitive {
    public id = 'completion';
    public name = 'Completion Primitive';

    public async execute(input: {
        prompt?: string;
        options?: ProviderOptions;
        task?: string;
        step?: number;
        primitive?: string;
    }): Promise<PrimitiveResult> {
        try {
            // Use task as prompt if prompt is not provided (for orchestration)
            const prompt = input.prompt || input.task;

            if (!prompt) {
                return {
                    success: false,
                    error: 'No prompt or task provided for completion primitive',
                };
            }

            logger.info(`Completion task: ${prompt}`);

            // Determine if this is a code generation task
            const isCodeGenTask = this.isCodeGenerationTask(prompt);

            let systemPrompt = input.options?.systemPrompt;
            if (isCodeGenTask && !systemPrompt) {
                systemPrompt = `You are an expert software developer. Generate complete, working code based on the user's requirements.
When creating files, output them in this JSON format:
{
  "files": {
    "path/to/file1.ext": "complete file content here",
    "path/to/file2.ext": "complete file content here"
  },
  "summary": "Brief description of what was created"
}

Create production-quality code with proper structure, error handling, and comments.
For web projects, use modern HTML5, CSS3, and vanilla JavaScript unless specified otherwise.`;
            }

            const response = await providerRouter.completion(prompt, {
                ...input.options,
                systemPrompt,
            });
            logger.info(`LLM Response: ${response.content.substring(0, 100)}...`);

            // If code generation task, try to extract and write files
            if (isCodeGenTask) {
                const filesWritten = await this.extractAndWriteFiles(response.content);
                if (filesWritten.length > 0) {
                    return {
                        success: true,
                        data: {
                            response: response.content,
                            filesWritten,
                        },
                    };
                }
            }

            return {
                success: true,
                data: response,
            };
        } catch (error: any) {
            logger.error(`Completion failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    private isCodeGenerationTask(prompt: string): boolean {
        const codeKeywords = [
            'create', 'build', 'generate', 'implement', 'make',
            'website', 'app', 'application', 'game', 'component',
            'html', 'css', 'javascript', 'typescript', 'python',
            'file', 'code', 'script', 'page', 'layout'
        ];
        const promptLower = prompt.toLowerCase();
        return codeKeywords.some(keyword => promptLower.includes(keyword));
    }

    private async extractAndWriteFiles(response: string): Promise<string[]> {
        const filesWritten: string[] = [];

        try {
            // Try to extract JSON with files
            const jsonMatch = response.match(/\{[\s\S]*"files"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.files && typeof parsed.files === 'object') {
                    for (const [filePath, content] of Object.entries(parsed.files)) {
                        const absolutePath = path.isAbsolute(filePath)
                            ? filePath
                            : path.join(process.cwd(), filePath);
                        await fs.mkdirp(path.dirname(absolutePath));
                        await fs.writeFile(absolutePath, content as string);
                        filesWritten.push(filePath);
                        logger.info(`Created file: ${filePath}`);
                    }
                }
            }
        } catch (e) {
            // JSON parsing failed, try to extract code blocks
            const codeBlocks = response.matchAll(/```(\w+)?\s*\n([\s\S]*?)```/g);
            let blockIndex = 0;
            for (const match of codeBlocks) {
                const lang = match[1] || 'txt';
                const code = match[2];
                const fileName = `generated_${blockIndex}.${this.getExtension(lang)}`;
                const filePath = path.join(process.cwd(), fileName);
                await fs.writeFile(filePath, code);
                filesWritten.push(fileName);
                logger.info(`Created file: ${fileName}`);
                blockIndex++;
            }
        }

        return filesWritten;
    }

    private getExtension(lang: string): string {
        const extensions: Record<string, string> = {
            javascript: 'js', js: 'js',
            typescript: 'ts', ts: 'ts',
            html: 'html',
            css: 'css',
            python: 'py',
            json: 'json',
            markdown: 'md', md: 'md',
        };
        return extensions[lang.toLowerCase()] || 'txt';
    }
}

