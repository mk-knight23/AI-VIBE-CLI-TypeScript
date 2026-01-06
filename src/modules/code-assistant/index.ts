/**
 * VIBE-CLI v12 - Code Assistant Module
 * AI-powered code generation, completion, refactoring, and explanation
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { BaseModule, ModuleResult } from '../base.module';
import { VibeProviderRouter } from '../../providers/router';

interface CodeAssistantConfig {
  generateTokens: number;
  completeTokens: number;
  explainTokens: number;
  defaultModel: string;
}

export class CodeAssistantModule extends BaseModule {
  private provider: VibeProviderRouter;
  private config: CodeAssistantConfig;

  constructor() {
    super({
      name: 'code_assistant',
      version: '1.0.0',
      description: 'AI-powered code generation, completion, refactoring, and explanation',
    });

    this.provider = new VibeProviderRouter();
    this.config = {
      generateTokens: 4096,
      completeTokens: 2048,
      explainTokens: 2048,
      defaultModel: 'claude-opus-4-20250514',
    };
  }

  /**
   * Execute the module - routes to appropriate action
   */
  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'generate';

    const startTime = Date.now();

    try {
      switch (action) {
        case 'generate':
          return this.generate(params, startTime);
        case 'complete':
          return this.complete(params, startTime);
        case 'explain':
          return this.explain(params, startTime);
        case 'refactor':
          return this.refactor(params, startTime);
        case 'translate':
          return this.translate(params, startTime);
        case 'debug':
          return this.debug(params, startTime);
        case 'review':
          return this.review(params, startTime);
        default:
          return this.failure(`Unknown action: ${action}. Supported: generate, complete, explain, refactor, translate, debug, review`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate code from a description
   */
  private async generate(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    if (!this.validateParams(params, ['prompt'])) {
      return this.failure('Missing required parameter: prompt');
    }

    const {
      prompt,
      language = 'typescript',
      framework,
      context = [],
      withTests = false,
      withComments = true,
    } = params;

    this.logInfo(`Generating ${language} code...`);

    // Build the prompt
    const systemPrompt = `You are an expert ${language} developer. Generate clean, production-quality code.

${framework ? `Framework: ${framework}` : ''}
${withComments ? 'Include inline comments explaining complex logic.' : 'No comments needed.'}
${withTests ? 'Also generate unit tests using Jest.' : ''}

Return code in this format:
=== FILENAME ===
[filename.ext]
=== CODE ===
[your code here]
=== END ===

For tests (if requested):
=== FILENAME ===
[filename.test.ext]
=== CODE ===
[test code here]
=== END ===

Only output the code blocks, no explanations.`;

    const fullPrompt = `${prompt}

${context.length > 0 ? `Context files:\n${context.map((f: string) => `- ${f}`).join('\n')}` : ''}`;

    try {
      const response = await this.provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt },
        ],
        {
          model: params.model || this.config.defaultModel,
          maxTokens: params.tokens || this.config.generateTokens,
        }
      );

      // Parse and write files
      const files = this.parseCodeBlocks(response.content);
      const writtenFiles = this.writeFiles(files);

      const duration = Date.now() - startTime;

      return this.success({
        action: 'generate',
        language,
        filesGenerated: writtenFiles.length,
        files: writtenFiles,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Generation failed');
    }
  }

  /**
   * Auto-complete code
   */
  private async complete(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    if (!this.validateParams(params, ['code', 'language'])) {
      return this.failure('Missing required parameters: code, language');
    }

    const { code, language, position, maxLines = 10 } = params;

    this.logInfo(`Completing ${language} code...`);

    const prompt = `Complete the following ${language} code. Provide only the completion, no explanations:

\`\`\`${language}
${code}
\`\`\`

Complete from where it ends. Max ${maxLines} lines.`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: params.model || 'gpt-4o',
          maxTokens: params.tokens || this.config.completeTokens,
        }
      );

      const duration = Date.now() - startTime;

      return this.success({
        action: 'complete',
        language,
        completion: response.content,
        position: position || code.length,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Completion failed');
    }
  }

  /**
   * Explain code
   */
  private async explain(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    if (!this.validateParams(params, ['code'])) {
      return this.failure('Missing required parameter: code');
    }

    const { code, detailLevel = 'medium', language } = params;

    this.logInfo(`Explaining code...`);

    const detailPrompts = {
      low: 'Briefly explain what this code does in 2-3 sentences.',
      medium: 'Explain this code in detail, including what each function does and how it works.',
      high: 'Provide a comprehensive explanation of this code, including architecture, patterns used, potential issues, and improvements.',
    };

    const prompt = `Explain this code:
\`\`\`${language || 'text'}
${code}
\`\`\`

${detailPrompts[detailLevel as keyof typeof detailPrompts] || detailPrompts.medium}`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: params.model || 'claude-sonnet-4-20250514',
          maxTokens: params.tokens || this.config.explainTokens,
        }
      );

      const duration = Date.now() - startTime;

      return this.success({
        action: 'explain',
        explanation: response.content,
        detailLevel,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Explanation failed');
    }
  }

  /**
   * Refactor code
   */
  private async refactor(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    if (!this.validateParams(params, ['code', 'goal'])) {
      return this.failure('Missing required parameters: code, goal');
    }

    const { code, goal, language, files = [] } = params;

    this.logInfo(`Refactoring code: ${goal}`);

    // Read additional context files
    const contextContent: string[] = [];
    for (const file of files) {
      if (fs.existsSync(file)) {
        contextContent.push(`\n=== ${file} ===\n${fs.readFileSync(file, 'utf-8')}`);
      }
    }

    const prompt = `Refactor this code to: ${goal}

\`\`\`${language || 'text'}
${code}
\`\`\`
${contextContent.join('\n')}

Return the refactored code in this format:
=== FILENAME ===
[filename.ext or leave empty if same file]
=== CODE ===
[refactored code]
=== END ===

Also provide:
1. What changed
2. Why this is better
3. Any potential concerns`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: params.model || this.config.defaultModel,
          maxTokens: params.tokens || this.config.generateTokens,
        }
      );

      // Parse refactored code
      const codeBlocks = this.parseCodeBlocks(response.content);
      const writtenFiles = this.writeFiles(codeBlocks);

      // Parse summary (everything after === END ===)
      const summaryMatch = response.content.match(/=== END ===\s*([\s\S]*)/);
      const summary = summaryMatch ? summaryMatch[1].trim() : '';

      const duration = Date.now() - startTime;

      return this.success({
        action: 'refactor',
        goal,
        filesModified: writtenFiles.length,
        files: writtenFiles,
        summary,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Refactoring failed');
    }
  }

  /**
   * Translate code between languages
   */
  private async translate(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    if (!this.validateParams(params, ['code', 'targetLanguage'])) {
      return this.failure('Missing required parameters: code, targetLanguage');
    }

    const { code, sourceLanguage, targetLanguage } = params;

    this.logInfo(`Translating ${sourceLanguage || 'code'} to ${targetLanguage}`);

    const prompt = `Translate this code from ${sourceLanguage || 'unknown'} to ${targetLanguage}.

\`\`\`${sourceLanguage || 'text'}
${code}
\`\`\`

Return the translated code in this format:
=== FILENAME ===
[filename.ext]
=== CODE ===
[translated code]
=== END ===

Preserve:
- Functionality
- Error handling
- Comments (translate them too)
- Code style idiomatic to ${targetLanguage}`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: params.model || this.config.defaultModel,
          maxTokens: params.tokens || this.config.generateTokens,
        }
      );

      const files = this.parseCodeBlocks(response.content);
      const writtenFiles = this.writeFiles(files);

      const duration = Date.now() - startTime;

      return this.success({
        action: 'translate',
        sourceLanguage: sourceLanguage || 'unknown',
        targetLanguage,
        filesGenerated: writtenFiles.length,
        files: writtenFiles,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Translation failed');
    }
  }

  /**
   * Debug code
   */
  private async debug(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    if (!this.validateParams(params, ['code'])) {
      return this.failure('Missing required parameter: code');
    }

    const { code, error, language } = params;

    this.logInfo('Analyzing code for issues...');

    const prompt = `Analyze this ${language || 'code'} for bugs and issues:

\`\`\`${language || 'text'}
${code}
\`\`\`

${error ? `Error message:\n${error}` : ''}

Provide:
1. List of potential issues (with line numbers if possible)
2. Suggested fixes for each issue
3. Best practices that could improve the code`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: params.model || 'claude-sonnet-4-20250514',
          maxTokens: params.tokens || this.config.generateTokens,
        }
      );

      const duration = Date.now() - startTime;

      return this.success({
        action: 'debug',
        analysis: response.content,
        issues: this.extractIssues(response.content),
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Debug analysis failed');
    }
  }

  /**
   * Review code
   */
  private async review(params: Record<string, any>, startTime: number): Promise<ModuleResult> {
    if (!this.validateParams(params, ['code'])) {
      return this.failure('Missing required parameter: code');
    }

    const { code, language, focus = ['correctness', 'performance', 'security', 'readability'] } = params;

    this.logInfo('Reviewing code...');

    const prompt = `Review this ${language || 'code'} for:

${Array.isArray(focus) ? focus.map(f => `- ${f}`).join('\n') : focus}

\`\`\`${language || 'text'}
${code}
\`\`\`

Provide a structured review with:
1. Summary score (1-10)
2. Strengths
3. Areas for improvement
4. Specific suggestions`;

    try {
      const response = await this.provider.chat(
        [{ role: 'user', content: prompt }],
        {
          model: params.model || 'claude-opus-4-20250514',
          maxTokens: params.tokens || this.config.generateTokens,
        }
      );

      const duration = Date.now() - startTime;

      return this.success({
        action: 'review',
        review: response.content,
        focus,
      }, {
        tokens: response.usage?.totalTokens,
        duration,
        model: response.model,
      });

    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Code review failed');
    }
  }

  /**
   * Parse code blocks from LLM response
   */
  private parseCodeBlocks(content: string): Array<{ filename: string; code: string }> {
    const blocks: Array<{ filename: string; code: string }> = [];
    const filePattern = /===\s*FILENAME\s*===\s*\n([^\n]+)\s*\n=== CODE ===\s*([\s\S]*?)(?=== END ===|$)/g;

    let match;
    while ((match = filePattern.exec(content)) !== null) {
      const filename = match[1].trim();
      const code = match[2].trim();
      if (filename && code) {
        blocks.push({ filename, code });
      }
    }

    return blocks;
  }

  /**
   * Write files to disk
   */
  private writeFiles(files: Array<{ filename: string; code: string }>): Array<{ path: string; type: 'created' | 'modified' }> {
    const written: Array<{ path: string; type: 'created' | 'modified' }> = [];

    for (const file of files) {
      if (!file.filename) continue;

      const filePath = path.isAbsolute(file.filename)
        ? file.filename
        : path.join(process.cwd(), file.filename);

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const exists = fs.existsSync(filePath);
      fs.writeFileSync(filePath, file.code);

      written.push({
        path: file.filename,
        type: exists ? 'modified' : 'created',
      });

      this.logSuccess(`Written: ${file.filename}`);
    }

    return written;
  }

  /**
   * Extract issues from analysis
   */
  private extractIssues(content: string): Array<{ type: string; description: string; line?: number }> {
    const issues: Array<{ type: string; description: string; line?: number }> = [];

    // Simple pattern matching for issues
    const issuePatterns = [
      /(?:issue|problem|bug)\s*(\d+)[:\s]+(.+?)(?=\n|$)/gi,
      /(line\s*#?\s*(\d+))[:\s]+(.+?)(?=\n|$)/gi,
    ];

    for (const pattern of issuePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        issues.push({
          type: `Issue ${match[1] || match[2]}`,
          description: match[3] || match[0],
          line: match[2] ? parseInt(match[2], 10) : undefined,
        });
      }
    }

    return issues;
  }
}
