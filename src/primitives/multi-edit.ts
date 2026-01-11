import { BasePrimitive, PrimitiveResult } from './types';
import { providerRouter } from '../adapters/router';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('MultiEditPrimitive');

export class MultiEditPrimitive extends BasePrimitive {
    public id = 'multi-edit';
    public name = 'Multi-Edit Primitive';

    public async execute(input: { files: string[]; description: string }): Promise<PrimitiveResult> {
        logger.info(`Editing ${input.files.length} files: ${input.description}`);

        try {
            // 1. Read files
            const fileContents: Record<string, string> = {};
            for (const file of input.files) {
                if (fs.existsSync(file)) {
                    fileContents[file] = await fs.readFile(file, 'utf-8');
                }
            }

            // 2. Prepare LLM prompt
            const systemPrompt = `You are a surgical code editor. 
Given a set of files and a transformation request, output the UPDATED content for EACH modified file.
Format your output as a JSON object where keys are file paths and values are the NEW content of the entire file.

IMPORTANT: Preserve original indentation and coding style exactly.
If a file does not need changes, do not include it in the JSON.`;

            const userPrompt = `Request: ${input.description}\n\nFiles:\n${JSON.stringify(fileContents, null, 2)}`;

            const response = await providerRouter.completion(userPrompt, {
                systemPrompt,
            });

            // 3. Parse and apply changes
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { success: false, error: 'Could not parse changes from LLM output' };
            }

            const updates = JSON.parse(jsonMatch[0]);
            const appliedFiles = [];

            // Before applying, create a checkpoint
            try {
                const { execSync } = require('child_process');
                execSync('git add .');
                execSync(`git commit -m "VIBE_AUTO_CHECKPOINT: Before ${input.description.slice(0, 30)}" --allow-empty`);
            } catch (e) {
                logger.warn('Git checkpoint failed before multi-edit');
            }

            for (const [filePath, newContent] of Object.entries(updates)) {
                const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
                await fs.mkdirp(path.dirname(absolutePath));
                await fs.writeFile(absolutePath, newContent as string);
                appliedFiles.push(filePath);
            }

            return {
                success: true,
                data: { appliedFiles },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
