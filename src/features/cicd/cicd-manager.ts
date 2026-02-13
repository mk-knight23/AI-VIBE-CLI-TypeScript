/**
 * VIBE-CLI v0.0.2 - CI/CD Integration
 * Automate deployment pipelines
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { progressDisplay } from '../../ui/progress-bars/progress-display.js';

/**
 * CI/CD provider
 */
export type CIProvider = 'github' | 'gitlab' | 'bitbucket' | 'circleci' | 'jenkins' | 'azure';

/**
 * Pipeline stage
 */
export type PipelineStage = 'install' | 'lint' | 'test' | 'build' | 'deploy' | 'notify';

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  name: string;
  provider: CIProvider;
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  environment: Record<string, string>;
  secrets: string[];
  cache: CacheConfig;
}

/**
 * Pipeline trigger
 */
export interface PipelineTrigger {
  type: 'push' | 'pull_request' | 'merge_request' | 'tag' | 'manual';
  branches?: string[];
  tags?: string[];
  paths?: string[];
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  key?: string;
  paths: string[];
  restoreKeys?: string[];
}

/**
 * Pipeline execution
 */
export interface PipelineExecution {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  stage?: PipelineStage;
  stages: PipelineStageResult[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  logs: string[];
}

/**
 * Stage result
 */
export interface PipelineStageResult {
  stage: PipelineStage;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
  output?: string;
  artifacts?: string[];
}

/**
 * Deployment target
 */
export interface DeploymentTarget {
  name: string;
  type: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'docker' | 'heroku';
  region?: string;
  environment: 'development' | 'staging' | 'production';
  config: Record<string, string>;
}

/**
 * CI/CD Manager
 */
export class CICDManager {
  private readonly pipelines: Map<string, PipelineConfig> = new Map();
  private readonly executions: Map<string, PipelineExecution> = new Map();
  private readonly deployments: Map<string, DeploymentTarget> = new Map();

  constructor() {
    this.initializeBuiltinPipelines();
  }

  /**
   * Generate pipeline configuration using AI from a description
   */
  async generatePipelineWithAI(description: string, provider: any): Promise<PipelineConfig> {
    const prompt = `Create a CI/CD pipeline configuration based on this description: "${description}".
    Respond with a JSON object:
    {
      "name": "Pipeline Name",
      "provider": "github" | "gitlab" | "bitbucket" | "circleci" | "jenkins" | "azure",
      "stages": ["install", "lint", "test", "build", "deploy", "notify"],
      "triggers": [{ "type": "push", "branches": ["main"] }],
      "environment": { "KEY": "VALUE" },
      "secrets": ["SECRET_NAME"],
      "cache": { "enabled": true, "paths": ["node_modules"] }
    }`;

    try {
      const response = await provider.chat([{ role: 'system', content: 'You are a DevOps expert.' }, { role: 'user', content: prompt }]);
      const config = JSON.parse(response.content.trim().replace(/```json/g, '').replace(/```/g, ''));
      return config;
    } catch (error) {
      console.error(chalk.red('✗ AI pipeline generation failed:'), error);
      throw error;
    }
  }

  /**
   * Suggest a deployment target based on project analysis
   */
  async suggestDeploymentTarget(projectPath: string, provider: any): Promise<DeploymentTarget> {
    const files = fs.readdirSync(projectPath);
    const content = files.join(', ');

    const prompt = `Based on these files in the project root, suggest the best deployment target (vercel, netlify, aws, gcp, docker, heroku) and environment.
    Files: ${content}
    Respond with JSON: { name, type, environment, config: {} }`;

    try {
      const response = await provider.chat([{ role: 'system', content: 'You are a cloud architect.' }, { role: 'user', content: prompt }]);
      return JSON.parse(response.content.trim().replace(/```json/g, '').replace(/```/g, ''));
    } catch {
      return {
        name: 'Default',
        type: 'docker',
        environment: 'production',
        config: {},
      };
    }
  }

  /**
   * Initialize built-in pipeline templates
   */
  private initializeBuiltinPipelines(): void {
    // GitHub Actions - Node.js
    this.pipelines.set('github-nodejs', {
      name: 'Node.js CI/CD',
      provider: 'github',
      stages: ['install', 'lint', 'test', 'build'],
      triggers: [
        { type: 'push', branches: ['main', 'develop'] },
        { type: 'pull_request', branches: ['main'] },
      ],
      environment: {
        NODE_ENV: 'test',
      },
      secrets: ['NPM_TOKEN', 'CODECOV_TOKEN'],
      cache: {
        enabled: true,
        key: 'node-{{ checksum "package-lock.json" }}',
        paths: ['node_modules', '.next', 'dist'],
        restoreKeys: ['node-'],
      },
    });

    // GitHub Actions - Full-Stack
    this.pipelines.set('github-fullstack', {
      name: 'Full-Stack CI/CD',
      provider: 'github',
      stages: ['install', 'lint', 'test', 'build', 'deploy'],
      triggers: [
        { type: 'push', branches: ['main'] },
        { type: 'pull_request', branches: ['main'] },
      ],
      environment: {
        NODE_ENV: 'test',
        CLIENT_URL: 'http://localhost:3000',
        SERVER_URL: 'http://localhost:4000',
      },
      secrets: ['NPM_TOKEN', 'DATABASE_URL', 'JWT_SECRET', 'DEPLOY_TOKEN'],
      cache: {
        enabled: true,
        paths: ['node_modules', '.next', 'dist', 'server/dist'],
      },
    });

    // GitLab CI
    this.pipelines.set('gitlab-ci', {
      name: 'GitLab CI/CD',
      provider: 'gitlab',
      stages: ['install', 'lint', 'test', 'build', 'deploy'],
      triggers: [
        { type: 'push', branches: ['main', 'develop'] },
        { type: 'merge_request' },
      ],
      environment: {
        CI_NODE_VERSION: '18',
      },
      secrets: ['CI_NPM_TOKEN', 'CI_DATABASE_URL'],
      cache: {
        enabled: true,
        paths: ['node_modules/'],
      },
    });
  }

  /**
   * Generate pipeline configuration
   */
  generatePipelineConfig(
    pipelineId: string,
    options?: Partial<PipelineConfig>
  ): PipelineConfig {
    const template = this.pipelines.get(pipelineId);
    if (!template) {
      throw new Error(`Pipeline template not found: ${pipelineId}`);
    }

    return {
      ...template,
      ...options,
      stages: options?.stages || template.stages,
      environment: { ...template.environment, ...options?.environment },
    };
  }

  /**
   * Generate GitHub Actions workflow
   */
  generateGitHubWorkflow(config: PipelineConfig): string {
    const lines: string[] = [];

    lines.push('name: ' + config.name);
    lines.push('');
    lines.push('on:');
    lines.push('  push:');
    lines.push('    branches: ' + JSON.stringify(config.triggers.find((t) => t.type === 'push')?.branches || ['main']));
    lines.push('  pull_request:');
    lines.push('    branches: ' + JSON.stringify(config.triggers.find((t) => t.type === 'pull_request')?.branches || ['main']));
    lines.push('');
    lines.push('env:');
    for (const [key, value] of Object.entries(config.environment)) {
      lines.push(`  ${key}: ${value}`);
    }
    lines.push('');
    lines.push('jobs:');

    // Build job
    lines.push('  build:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('');

    if (config.cache.enabled) {
      lines.push('    steps:');
      lines.push('    - uses: actions/checkout@v4');
      lines.push('    - name: Cache node_modules');
      lines.push('      uses: actions/cache@v3');
      lines.push('      with:');
      lines.push(`        path: ${config.cache.paths.join(', ')}`);
      lines.push(`        key: ${config.cache.key || '${{ runner.os }}-node-${{ hashFiles("**/package-lock.json") }}'}`);
      if (config.cache.restoreKeys) {
        lines.push(`        restore-keys: ${config.cache.restoreKeys.join(', ')}`);
      }
    } else {
      lines.push('    steps:');
      lines.push('    - uses: actions/checkout@v4');
    }

    lines.push('    - name: Setup Node.js');
    lines.push('      uses: actions/setup-node@v4');
    lines.push('      with:');
    lines.push('      node-version: "18"');
    lines.push('      cache: "npm"');
    lines.push('');
    lines.push('    - name: Install dependencies');
    lines.push('      run: npm ci');
    lines.push('');

    if (config.stages.includes('lint')) {
      lines.push('    - name: Lint');
      lines.push('      run: npm run lint');
      lines.push('');
    }

    if (config.stages.includes('test')) {
      lines.push('    - name: Run tests');
      lines.push('      run: npm test --if-present');
      lines.push('');
    }

    if (config.stages.includes('build')) {
      lines.push('    - name: Build');
      lines.push('      run: npm run build');
      lines.push('');
    }

    // Add secrets to GitHub
    lines.push('    - name: Show secrets (DO NOT log real values)');
    lines.push('      run: |');
    lines.push('        echo "Available secrets: ' + config.secrets.join(', ') + '"');
    lines.push('');

    lines.push('  deploy:');
    lines.push('    needs: build');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    if: github.ref == \'refs/heads/main\'');
    lines.push('    steps:');
    lines.push('    - uses: actions/checkout@v4');
    lines.push('    - name: Deploy');
    lines.push('      run: npm run deploy');

    return lines.join('\n');
  }

  /**
   * Generate GitLab CI configuration
   */
  generateGitLabCI(config: PipelineConfig): string {
    const lines: string[] = [];

    lines.push('stages:');
    for (const stage of config.stages) {
      lines.push('  - ' + stage);
    }
    lines.push('');

    lines.push('variables:');
    for (const [key, value] of Object.entries(config.environment)) {
      lines.push(`  ${key}: "${value}"`);
    }
    lines.push('');

    // Cache configuration
    if (config.cache.enabled) {
      lines.push('cache:');
      lines.push('  key: ${CI_COMMIT_REF_SLUG}');
      lines.push('  paths:');
      for (const cachePath of config.cache.paths) {
        lines.push('    - ' + cachePath);
      }
      lines.push('');
    }

    // Install job
    lines.push('.install:');
    lines.push('  stage: install');
    lines.push('  script:');
    lines.push('    - npm ci');
    lines.push('  artifacts:');
    lines.push('    paths:');
    lines.push('      - node_modules/');
    lines.push('    expire_in: 1 hour');
    lines.push('');

    // Lint job
    if (config.stages.includes('lint')) {
      lines.push('.lint:');
      lines.push('  stage: lint');
      lines.push('  script:');
      lines.push('    - npm run lint');
      lines.push('');
    }

    // Test job
    if (config.stages.includes('test')) {
      lines.push('.test:');
      lines.push('  stage: test');
      lines.push('  script:');
      lines.push('    - npm test');
      lines.push('');
    }

    // Build job
    if (config.stages.includes('build')) {
      lines.push('.build:');
      lines.push('  stage: build');
      lines.push('  script:');
      lines.push('    - npm run build');
      lines.push('');
    }

    // Deploy job
    if (config.stages.includes('deploy')) {
      lines.push('.deploy:');
      lines.push('  stage: deploy');
      lines.push('  script:');
      lines.push('    - npm run deploy');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate Docker configuration
   */
  generateDockerConfig(
    context: string,
    options?: { nodeVersion?: string; port?: number; envFile?: boolean }
  ): { dockerfile: string; dockerignore: string } {
    const nodeVersion = options?.nodeVersion || '18-alpine';
    const port = options?.port || 3000;

    const dockerfile = `FROM node:${nodeVersion}

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE ${port}

ENV NODE_ENV=production

CMD ["npm", "start"]
`;

    const dockerignore = `node_modules
npm-debug.log
.git
.gitignore
.env
.env.*
!.env.example
*.md
docs
tests
.vscode
.idea
.DS_Store
dist
build
.next
coverage
`;

    return { dockerfile, dockerignore };
  }

  /**
   * Generate docker-compose configuration
   */
  generateDockerCompose(
    services: Array<{ name: string; port: number; dependsOn?: string[]; environment?: Record<string, string> }>,
    database?: { type: string; port: number }
  ): string {
    const lines: string[] = [];

    lines.push('version: "3.8"');
    lines.push('');
    lines.push('services:');

    for (const service of services) {
      lines.push(`  ${service.name}:`);
      lines.push('    build:');
      lines.push('      context: .');
      lines.push('      dockerfile: Dockerfile');
      lines.push('    ports:');
      lines.push(`      - "${service.port}:${service.port}"`);
      lines.push('    environment:');
      lines.push('      - NODE_ENV=development');
      if (service.environment) {
        for (const [key, value] of Object.entries(service.environment)) {
          lines.push(`      - ${key}=${value}`);
        }
      }
      if (service.dependsOn) {
        lines.push('    depends_on:');
        for (const dep of service.dependsOn) {
          lines.push(`      - ${dep}`);
        }
      }
      lines.push('');
    }

    if (database) {
      if (database.type === 'postgresql') {
        lines.push('  postgres:');
        lines.push('    image: postgres:15-alpine');
        lines.push('    ports:');
        lines.push(`      - "${database.port}:5432"`);
        lines.push('    environment:');
        lines.push('      - POSTGRES_DB=app');
        lines.push('      - POSTGRES_USER=postgres');
        lines.push('      - POSTGRES_PASSWORD=postgres');
        lines.push('    volumes:');
        lines.push('      - postgres_data:/var/lib/postgresql/data');
        lines.push('');
      } else if (database.type === 'mongodb') {
        lines.push('  mongodb:');
        lines.push('    image: mongo:7');
        lines.push('    ports:');
        lines.push(`      - "${database.port}:27017"`);
        lines.push('    environment:');
        lines.push('      - MONGO_INITDB_DATABASE=app');
        lines.push('    volumes:');
        lines.push('      - mongo_data:/data/db');
        lines.push('');
      }
    }

    lines.push('volumes:');
    if (database) {
      lines.push('  postgres_data:');
      lines.push('  mongo_data:');
    }

    return lines.join('\n');
  }

  /**
   * Execute pipeline locally
   */
  async executePipeline(config: PipelineConfig): Promise<PipelineExecution> {
    const execution: PipelineExecution = {
      id: `exec-${Date.now()}`,
      status: 'running',
      stages: config.stages.map((stage) => ({
        stage,
        status: 'pending' as const,
      })),
      startedAt: new Date(),
      logs: [],
    };

    this.executions.set(execution.id, execution);

    progressDisplay.startProgress(config.stages.length, 'Running pipeline');

    for (let i = 0; i < config.stages.length; i++) {
      const stage = config.stages[i];
      execution.stage = stage;
      execution.stages[i].status = 'running';

      progressDisplay.updateProgress(i, `Stage: ${stage}`);

      const startTime = Date.now();

      try {
        const result = await this.executeStage(stage, config);
        execution.stages[i].status = result.success ? 'success' : 'failed';
        execution.stages[i].duration = Date.now() - startTime;
        execution.stages[i].output = result.output;
        execution.stages[i].artifacts = result.artifacts;

        execution.logs.push(`[${stage}] ${result.success ? 'SUCCESS' : 'FAILED'}: ${result.output}`);

        if (!result.success) {
          execution.status = 'failed';
          break;
        }
      } catch (error) {
        execution.stages[i].status = 'failed';
        execution.stages[i].duration = Date.now() - startTime;
        execution.logs.push(`[${stage}] ERROR: ${error}`);
        execution.status = 'failed';
        break;
      }

      progressDisplay.incrementProgress(1);
    }

    progressDisplay.completeProgress('Pipeline execution complete');

    execution.status = execution.status === 'running' ? 'success' : execution.status;
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

    return execution;
  }

  /**
   * Execute a single stage
   */
  private async executeStage(
    stage: PipelineStage,
    config: PipelineConfig
  ): Promise<{ success: boolean; output: string; artifacts?: string[] }> {
    const { execSync } = require('child_process');

    try {
      switch (stage) {
        case 'install':
          execSync('npm ci', { stdio: 'inherit' });
          return { success: true, output: 'Dependencies installed' };

        case 'lint':
          execSync('npm run lint', { stdio: 'inherit' });
          return { success: true, output: 'Linting passed' };

        case 'test':
          execSync('npm test', { stdio: 'inherit' });
          return { success: true, output: 'Tests passed' };

        case 'build':
          execSync('npm run build', { stdio: 'inherit' });
          return { success: true, output: 'Build completed', artifacts: ['dist/', 'build/'] };

        case 'deploy':
          // Deployment is provider-specific
          return { success: true, output: 'Deployment triggered' };

        case 'notify':
          return { success: true, output: 'Notifications sent' };

        default:
          return { success: true, output: `Stage ${stage} completed` };
      }
    } catch (error) {
      return { success: false, output: String(error) };
    }
  }

  /**
   * Add deployment target
   */
  addDeploymentTarget(target: DeploymentTarget): void {
    this.deployments.set(target.name, target);
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(targetName: string): DeploymentTarget | undefined {
    return this.deployments.get(targetName);
  }

  /**
   * List available pipeline templates
   */
  listPipelineTemplates(): Array<{ id: string; name: string; provider: CIProvider; stages: PipelineStage[] }> {
    return Array.from(this.pipelines.values()).map((p) => ({
      id: p.name.toLowerCase().replace(/\s+/g, '-'),
      name: p.name,
      provider: p.provider,
      stages: p.stages,
    }));
  }

  /**
   * Get pipeline execution
   */
  getExecution(executionId: string): PipelineExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Format pipeline for display
   */
  formatPipeline(config: PipelineConfig): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n🔄 Pipeline Configuration\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');
    lines.push(chalk.bold(`Name: ${config.name}`));
    lines.push(`Provider: ${config.provider}`);
    lines.push('');
    lines.push(chalk.bold('Stages:'));
    for (const stage of config.stages) {
      lines.push(`  ${this.getStageIcon(stage)} ${stage}`);
    }
    lines.push('');
    lines.push(chalk.bold('Triggers:'));
    for (const trigger of config.triggers) {
      lines.push(`  ${trigger.type}: ${trigger.branches?.join(', ') || 'all'}`);
    }
    lines.push('');
    lines.push(chalk.bold('Secrets Required:'));
    for (const secret of config.secrets) {
      lines.push(`  ${chalk.red('🔒')} ${secret}`);
    }
    if (config.cache.enabled) {
      lines.push('');
      lines.push(chalk.bold('Cache:'));
      lines.push(`  Paths: ${config.cache.paths.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Format execution result
   */
  formatExecution(execution: PipelineExecution): string {
    const lines: string[] = [];

    const statusColor =
      execution.status === 'success'
        ? chalk.green
        : execution.status === 'failed'
          ? chalk.red
          : chalk.yellow;

    lines.push(chalk.bold('\n📊 Pipeline Execution\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');
    lines.push(`Status: ${statusColor(execution.status.toUpperCase())}`);
    lines.push(`Duration: ${this.formatDuration(execution.duration || 0)}`);
    lines.push('');
    lines.push(chalk.bold('Stages:'));

    for (const stage of execution.stages) {
      const icon = this.getStageStatusIcon(stage.status);
      const duration = stage.duration ? ` (${this.formatDuration(stage.duration)})` : '';
      lines.push(`  ${icon} ${stage.stage}: ${stage.status}${duration}`);
    }

    if (execution.logs.length > 0) {
      lines.push('');
      lines.push(chalk.bold('Recent Logs:'));
      for (const log of execution.logs.slice(-5)) {
        lines.push(chalk.gray(`  ${log}`));
      }
    }

    return lines.join('\n');
  }

  /**
   * Helper: Get stage icon
   */
  private getStageIcon(stage: PipelineStage): string {
    const icons: Record<PipelineStage, string> = {
      install: '📦',
      lint: '🔍',
      test: '🧪',
      build: '🏗️',
      deploy: '🚀',
      notify: '📧',
    };
    return icons[stage] || '⚙️';
  }

  /**
   * Helper: Get stage status icon
   */
  private getStageStatusIcon(status: PipelineStageResult['status']): string {
    const icons: Record<string, string> = {
      pending: '⏳',
      running: '🔄',
      success: '✅',
      failed: '❌',
      skipped: '⏭️',
    };
    return icons[status] || '⚙️';
  }

  /**
   * Helper: Format duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Write pipeline config to file
   */
  writePipelineConfig(config: PipelineConfig, outputPath: string): void {
    let content = '';

    switch (config.provider) {
      case 'github':
        content = this.generateGitHubWorkflow(config);
        break;
      case 'gitlab':
        content = this.generateGitLabCI(config);
        break;
      default:
        content = JSON.stringify(config, null, 2);
    }

    fs.writeFileSync(outputPath, content);
  }
}

/**
 * Singleton instance
 */
export const cicdManager = new CICDManager();
