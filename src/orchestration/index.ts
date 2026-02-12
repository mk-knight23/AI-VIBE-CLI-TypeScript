/**
 * VIBE-CLI v0.0.1 Orchestrator
 * Multi-agent orchestration for intent-driven execution
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { VibeIntent, VibeSession, IProviderRouter } from '../types.js';
import { VibeProviderRouter } from '../providers/router.js';
import { VibeMemoryManager } from '../memory/index.js';
import { VibeApprovalManager } from '../approvals/index.js';
import { CodeAssistantModule } from '../modules/code-assistant/index.js';
import { TestingModule } from '../modules/testing/index.js';
import { DebuggingModule } from '../modules/debugging/index.js';
import { SecurityModule } from '../modules/security/index.js';
import { DeploymentModule } from '../modules/deployment/index.js';

export interface OrchestratorConfig {
  provider?: IProviderRouter;
  memory?: VibeMemoryManager;
  approvals?: VibeApprovalManager;
  session?: VibeSession;
}

export interface ExecutionPlan {
  steps: Array<{
    description: string;
    action: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    files?: string[];
    commands?: string[];
  }>;
  risks: string[];
}

export interface ExecutionResult {
  success: boolean;
  summary?: string;
  error?: string;
  changes?: Array<{
    file: string;
    type: 'created' | 'modified' | 'deleted';
  }>;
  suggestion?: string;
  output?: string;
}

/**
 * V0.0.1 Orchestrator - manages agent execution
 */
export class Orchestrator {
  private provider: VibeProviderRouter;
  private memory: VibeMemoryManager;
  private approvals: VibeApprovalManager;
  private session: VibeSession;

  // VIBE Modules for specialized tasks
  private codeAssistant: CodeAssistantModule;
  private testing: TestingModule;
  private debugging: DebuggingModule;
  private security: SecurityModule;
  private deployment: DeploymentModule;

  constructor(config: OrchestratorConfig = {}) {
    this.provider = config.provider as VibeProviderRouter || new VibeProviderRouter();
    this.memory = config.memory as VibeMemoryManager || new VibeMemoryManager();
    this.approvals = config.approvals as VibeApprovalManager || new VibeApprovalManager();
    this.session = config.session || {
      id: `session-${Date.now()}`,
      projectRoot: process.cwd(),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Initialize modules
    this.codeAssistant = new CodeAssistantModule();
    this.testing = new TestingModule();
    this.debugging = new DebuggingModule();
    this.security = new SecurityModule();
    this.deployment = new DeploymentModule();
  }

  /**
   * Create an execution plan from an intent
   */
  createPlan(intent: VibeIntent, _context: object): ExecutionPlan {
    const steps: ExecutionPlan['steps'] = [];
    const risks: string[] = [];

    // Map intent category to steps
    switch (intent.category) {
      case 'code_generation':
        steps.push({
          description: 'Analyze requirements and context',
          action: 'analyze',
          risk: 'low',
        });
        steps.push({
          description: 'Generate code',
          action: 'generate',
          risk: 'medium',
          files: intent.context.files,
        });
        steps.push({
          description: 'Review generated code',
          action: 'review',
          risk: 'low',
        });
        break;

      case 'refactor':
        steps.push({
          description: 'Analyze current code structure',
          action: 'analyze',
          risk: 'low',
          files: intent.context.files,
        });
        steps.push({
          description: 'Refactor code',
          action: 'refactor',
          risk: 'medium',
          files: intent.context.files,
        });
        steps.push({
          description: 'Verify refactoring',
          action: 'test',
          risk: 'low',
        });
        risks.push('Code behavior may change');
        risks.push('May require test updates');
        break;

      case 'debug':
        steps.push({
          description: 'Analyze error and context',
          action: 'diagnose',
          risk: 'low',
          files: intent.context.files,
        });
        steps.push({
          description: 'Fix the issue',
          action: 'fix',
          risk: 'medium',
          files: intent.context.files,
        });
        steps.push({
          description: 'Verify fix',
          action: 'test',
          risk: 'low',
        });
        break;

      case 'testing':
        steps.push({
          description: 'Run tests',
          action: 'test',
          risk: 'low',
        });
        break;

      case 'deploy':
        steps.push({
          description: 'Build project',
          action: 'build',
          risk: 'medium',
        });
        steps.push({
          description: 'Deploy to infrastructure',
          action: 'deploy',
          risk: 'high',
        });
        risks.push('This will modify production resources');
        risks.push('Rollback may not be immediate');
        break;

      case 'question':
        steps.push({
          description: 'Analyze question',
          action: 'analyze',
          risk: 'low',
        });
        steps.push({
          description: 'Generate answer using AI',
          action: 'answer',
          risk: 'low',
        });
        break;

      case 'memory':
        steps.push({
          description: 'Store in memory',
          action: 'remember',
          risk: 'low',
        });
        break;

      case 'api':
        steps.push({
          description: 'Analyze API requirements',
          action: 'analyze',
          risk: 'low',
        });
        steps.push({
          description: 'Generate API code',
          action: 'generate',
          risk: 'medium',
          files: intent.context.files,
        });
        break;

      case 'ui':
        steps.push({
          description: 'Design UI component',
          action: 'design',
          risk: 'low',
        });
        steps.push({
          description: 'Generate UI code',
          action: 'generate',
          risk: 'medium',
          files: intent.context.files,
        });
        break;

      default:
        steps.push({
          description: `Execute: ${intent.query}`,
          action: 'execute',
          risk: intent.risk as 'low' | 'medium' | 'high' | 'critical',
        });
    }

    return { steps, risks };
  }

  /**
   * Execute an intent
   */
  async execute(
    intent: VibeIntent,
    _context: object,
    approval: { approved: boolean }
  ): Promise<ExecutionResult> {
    if (!approval.approved) {
      return { success: false, error: 'Not approved' };
    }

    try {
      // Execute based on category - routing to appropriate modules
      switch (intent.category) {
        case 'question':
          return await this.handleQuestion(intent);
        case 'memory':
          return await this.handleMemory(intent);
        case 'code_generation':
        case 'code_assistant':
          return await this.handleCodeGeneration(intent);
        case 'refactor':
          return await this.handleRefactor(intent);
        case 'debug':
          return await this.handleDebug(intent);
        case 'testing':
          return await this.handleTesting(intent);
        case 'security':
          return await this.handleSecurity(intent);
        case 'deploy':
          return await this.handleDeploy(intent);
        case 'git':
          return await this.handleGit(intent);
        case 'analysis':
          return await this.handleAnalysis(intent);
        default:
          return await this.handleGeneric(intent);
      }
    } catch (error) {
      // Provide user-friendly error messages based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for common error patterns and provide helpful suggestions
      if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
        return {
          success: false,
          error: 'API authentication failed',
          suggestion: 'Your API key may be invalid or expired. Use /config to update it.',
        };
      }

      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          suggestion: 'Too many requests. Wait a moment and try again, or switch to a different provider.',
        };
      }

      if (errorMessage.includes('model') && errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Model not available',
          suggestion: 'The model you requested is not available. Try /providers to see available options.',
        };
      }

      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ENOTFOUND')) {
        return {
          success: false,
          error: 'Network error',
          suggestion: 'Could not reach the AI provider. Check your connection or try a different provider.',
        };
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        return {
          success: false,
          error: 'Request timed out',
          suggestion: 'The AI provider took too long to respond. Try again or use a faster model.',
        };
      }

      // Default friendly error
      return {
        success: false,
        error: 'Something went wrong',
        suggestion: 'Try rephrasing your request or use /status to check your configuration.',
      };
    }
  }

  private async handleQuestion(intent: VibeIntent): Promise<ExecutionResult> {
    // Use the LLM to answer the question
    const response = await this.provider.chat([
      { role: 'user', content: intent.query }
    ]);

    return {
      success: true,
      summary: response.content.slice(0, 100) + (response.content.length > 100 ? '...' : ''),
      output: response.content,
    };
  }

  private async handleMemory(intent: VibeIntent): Promise<ExecutionResult> {
    // Store the memory
    this.memory.add({
      type: 'context',
      content: intent.query.replace(/^(remember|store|note that)/i, '').trim(),
      tags: [intent.category],
      confidence: intent.confidence,
      source: 'user',
    });

    return {
      success: true,
      summary: 'Memory stored successfully',
    };
  }

  private async handleCodeGeneration(intent: VibeIntent): Promise<ExecutionResult> {
    const files = intent.context.files || [];

    // Generate code using LLM
    const prompt = `Generate code for: ${intent.query}

Context:
${files.length > 0 ? `Files to modify: ${files.join(', ')}` : 'Create new files as needed'}

Return the code with file paths in this format:
=== FILENAME ===
[code here]
=== END ===

Only output the code, no explanations.`;

    const response = await this.provider.chat([
      { role: 'user', content: prompt }
    ]);

    // Parse and write files
    const changes = await this.parseAndWriteFiles(response.content);

    return {
      success: changes.length > 0,
      summary: `Generated code for ${changes.length} file(s)`,
      changes,
      output: response.content,
    };
  }

  private async handleRefactor(intent: VibeIntent): Promise<ExecutionResult> {
    const files = intent.context.files || [];

    if (files.length === 0) {
      return {
        success: false,
        error: 'No files specified for refactoring',
        suggestion: 'Specify which files to refactor',
      };
    }

    // Read current files and generate refactored code
    const fileContents: string[] = [];
    for (const file of files) {
      const absolutePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
      if (fs.existsSync(absolutePath)) {
        fileContents.push(`\n=== ${file} ===\n${fs.readFileSync(absolutePath, 'utf-8')}`);
      }
    }

    const prompt = `Refactor the following code for: ${intent.query}

${fileContents.join('\n')}

Return the refactored code with file paths:
=== FILENAME ===
[refactored code here]
=== END ===

Keep the same functionality but improve: ${intent.query.includes('clean') ? 'cleanliness and readability' : 'code quality'}`;

    const response = await this.provider.chat([
      { role: 'user', content: prompt }
    ]);

    const changes = await this.parseAndWriteFiles(response.content);

    return {
      success: changes.length > 0,
      summary: `Refactored ${changes.length} file(s)`,
      changes,
    };
  }

  private async handleDebug(intent: VibeIntent): Promise<ExecutionResult> {
    const files = intent.context.files || [];

    // Read error context if available
    let errorContext = '';
    if (intent.context.target) {
      errorContext = `\nError/Issue: ${intent.context.target}`;
    }

    const prompt = `Debug the following issue: ${intent.query}
${errorContext}
${files.length > 0 ? `Files to analyze: ${files.join(', ')}` : ''}

Provide:
1. Root cause analysis
2. Suggested fix
3. Code snippet for the fix (if applicable)

Be concise and practical.`;

    const response = await this.provider.chat([
      { role: 'user', content: prompt }
    ]);

    return {
      success: true,
      summary: 'Debug analysis complete',
      output: response.content,
    };
  }

  private async handleTesting(intent: VibeIntent): Promise<ExecutionResult> {
    // Run tests if there's a test command
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let testCommand = 'npm test';

    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (pkg.scripts?.test) {
          testCommand = pkg.scripts.test;
        }
      } catch {
        // Ignore
      }
    }

    try {
      const output = child_process.execSync(testCommand, {
        encoding: 'utf-8',
        timeout: 120000,
        cwd: process.cwd(),
      });

      return {
        success: true,
        summary: 'Tests passed',
        output,
      };
    } catch (error: any) {
      return {
        success: false,
        summary: 'Tests failed',
        output: error.stdout?.toString() || error.message,
        error: 'Test execution failed',
      };
    }
  }

  private async handleDeploy(intent: VibeIntent): Promise<ExecutionResult> {
    const target = intent.query.match(/(gcp|aws|azure|heroku|vercel|netlify|docker|kubernetes|k8s)/i);

    if (target) {
      return {
        success: true,
        summary: `Deployment to ${target[0]} prepared`,
        output: `Run \`vibe deploy ${target[0]}\` to continue with deployment.`,
      };
    }

    return {
      success: false,
      error: 'Deployment target not recognized',
      suggestion: 'Specify deployment target: gcp, aws, azure, heroku, vercel, etc.',
    };
  }

  private async handleGit(intent: VibeIntent): Promise<ExecutionResult> {
    const query = intent.query.toLowerCase();

    if (query.includes('status')) {
      try {
        const output = child_process.execSync('git status', {
          encoding: 'utf-8',
          cwd: process.cwd(),
        });
        return {
          success: true,
          summary: 'Git status',
          output,
        };
      } catch {
        return {
          success: false,
          error: 'Not a git repository or git not installed',
        };
      }
    }

    if (query.includes('commit')) {
      const commitMatch = intent.query.match(/commit\s+(.+)/i);
      if (commitMatch) {
        try {
          child_process.execSync(`git add -A && git commit -m "${commitMatch[1]}"`, {
            encoding: 'utf-8',
            cwd: process.cwd(),
          });
          return {
            success: true,
            summary: `Committed: ${commitMatch[1]}`,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            suggestion: 'Check git configuration and try again',
          };
        }
      }
    }

    return {
      success: false,
      error: 'Git command not recognized',
      suggestion: 'Try: git status, git commit <message>',
    };
  }

  private async handleSecurity(intent: VibeIntent): Promise<ExecutionResult> {
    // Use the SecurityModule for security-related tasks
    const result = await this.security.execute({ action: 'scan', query: intent.query });

    if (result.success) {
      return {
        success: true,
        summary: result.data?.summary || 'Security scan complete',
        output: JSON.stringify(result.data?.vulnerabilities || [], null, 2),
        changes: result.data?.vulnerabilities?.map((v: any) => ({
          file: v.location?.file || 'unknown',
          type: 'modified' as const,
        })),
      };
    }

    return {
      success: false,
      error: result.error || 'Security scan failed',
    };
  }

  private async handleAnalysis(intent: VibeIntent): Promise<ExecutionResult> {
    // Use LLM for analysis tasks
    const response = await this.provider.chat([
      { role: 'user', content: `Analyze the following and provide insights:\n\n${intent.query}` }
    ]);

    return {
      success: true,
      summary: 'Analysis complete',
      output: response.content,
    };
  }

  private async handleGeneric(intent: VibeIntent): Promise<ExecutionResult> {
    // Use LLM to handle generic requests
    const response = await this.provider.chat([
      { role: 'user', content: intent.query }
    ]);

    return {
      success: true,
      summary: 'Completed',
      output: response.content,
    };
  }

  /**
   * Parse LLM response and write files
   */
  private async parseAndWriteFiles(content: string): Promise<Array<{ file: string; type: 'created' | 'modified' }>> {
    const changes: Array<{ file: string; type: 'created' | 'modified' }> = [];
    const filePattern = /===\s*(.+?)\s*===\n([\s\S]*?)(?===\s|\n*$)/g;
    const createdFiles = new Set<string>();

    let match;
    while ((match = filePattern.exec(content)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2].trim();

      if (!filePath || !fileContent) continue;

      const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      const dir = path.dirname(absolutePath);

      // Create directory if needed
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const exists = fs.existsSync(absolutePath);
      fs.writeFileSync(absolutePath, fileContent);

      if (!exists) {
        createdFiles.add(filePath);
        changes.push({ file: filePath, type: 'created' });
      } else {
        changes.push({ file: filePath, type: 'modified' });
      }
    }

    return changes;
  }
}
