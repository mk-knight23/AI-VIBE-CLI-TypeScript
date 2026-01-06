/**
 * VIBE-CLI v12 - MCP Context Providers
 * Structured, minimal, inspectable context for agents
 * 
 * Phase 5: MCP Everywhere
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface MCPContext {
  filesystem: FileSystemContext;
  git: GitContext;
  openapi: OpenAPIContext;
  tests: TestsContext;
  memory: MemoryContext;
  infra: InfraContext;
}

export interface FileSystemContext {
  type: 'filesystem';
  root: string;
  structure: FileNode[];
  excludePatterns: string[];
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileNode[];
  extensions?: string[];
}

export interface GitContext {
  type: 'git';
  currentBranch: string;
  recentCommits: GitCommit[];
  status: GitStatus;
  diff?: string;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files?: string[];
}

export interface GitStatus {
  staged: string[];
  modified: string[];
  untracked: string[];
  ahead?: number;
  behind?: number;
}

export interface OpenAPIContext {
  type: 'openapi';
  baseUrl: string;
  endpoints: APIEndpoint[];
  schemas: Record<string, unknown>;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  summary?: string;
  parameters?: APIParameter[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
}

export interface APIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'body';
  type: string;
  required: boolean;
  description?: string;
}

export interface TestsContext {
  type: 'tests';
  framework: string;
  files: TestFile[];
  coverage?: TestCoverage;
}

export interface TestFile {
  path: string;
  testCount: number;
  status: 'passing' | 'failing' | 'pending';
  failures?: TestFailure[];
}

export interface TestFailure {
  testName: string;
  error: string;
  line?: number;
}

export interface TestCoverage {
  line: number;
  branch: number;
  function: number;
  statement: number;
}

export interface MemoryContext {
  type: 'memory';
  projectMemory: ProjectMemorySummary;
  sessionMemory: SessionMemorySummary;
  recentDecisions: string[];
}

export interface ProjectMemorySummary {
  decisions: number;
  rules: number;
  patterns: number;
  lastUpdated: string;
}

export interface SessionMemorySummary {
  messages: number;
  checkpoints: number;
  contextSize: string;
}

export interface InfraContext {
  type: 'infra';
  providers: InfraProvider[];
  configFiles: ConfigFile[];
}

export interface InfraProvider {
  name: string;
  type: 'aws' | 'gcp' | 'azure' | 'kubernetes' | 'docker';
  status: 'configured' | 'partial' | 'not configured';
}

export interface ConfigFile {
  name: string;
  path: string;
  format: 'json' | 'yaml' | 'hcl' | 'toml';
}

// ============================================================================
// CONTEXT PROVIDERS
// ============================================================================

export interface IContextProvider {
  /** Get context type identifier */
  contextType: string;
  
  /** Check if context is available */
  isAvailable(): boolean;
  
  /** Collect context data */
  collect(): Promise<unknown>;
  
  /** Get specific resource by ID */
  getResource(resourceId: string): Promise<unknown>;
  
  /** Refresh context */
  refresh(): Promise<void>;
}

/**
 * File System Context Provider
 */
export class FileSystemContextProvider implements IContextProvider {
  contextType = 'filesystem';
  
  constructor(private rootDir: string = process.cwd()) {}
  
  isAvailable(): boolean {
    return fs.existsSync(this.rootDir);
  }
  
  async collect(): Promise<FileSystemContext> {
    const structure = this.walkDirectory(this.rootDir);
    return {
      type: 'filesystem',
      root: this.rootDir,
      structure,
      excludePatterns: ['node_modules', '.git', 'dist', 'build', '.vibe']
    };
  }
  
  private walkDirectory(dir: string, depth: number = 3): FileNode[] {
    if (depth <= 0) return [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const nodes: FileNode[] = [];
      
      for (const entry of entries) {
        if (this.isExcluded(entry.name)) continue;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const children = this.walkDirectory(fullPath, depth - 1);
          nodes.push({
            name: entry.name,
            type: 'directory',
            path: fullPath,
            children: children.length > 0 ? children : undefined
          });
        } else {
          const stats = fs.statSync(fullPath);
          nodes.push({
            name: entry.name,
            type: 'file',
            path: fullPath,
            size: stats.size,
            extensions: [path.extname(entry.name)]
          });
        }
      }
      
      return nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } catch {
      return [];
    }
  }
  
  private isExcluded(name: string): boolean {
    const exclusions = ['node_modules', '.git', 'dist', 'build', '.vibe', '.DS_Store'];
    return exclusions.some(ex => name.startsWith(ex) || name === ex);
  }
  
  async getResource(resourceId: string): Promise<unknown> {
    if (resourceId === 'root') {
      return { root: this.rootDir };
    }
    
    const fullPath = path.join(this.rootDir, resourceId);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Resource not found: ${resourceId}`);
    }
    
    const stats = fs.statSync(fullPath);
    return {
      path: fullPath,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      content: stats.isFile() ? fs.readFileSync(fullPath, 'utf-8') : undefined
    };
  }
  
  async refresh(): Promise<void> {
    // No-op for file system - always fresh
  }
}

/**
 * Git Context Provider
 */
export class GitContextProvider implements IContextProvider {
  contextType = 'git';
  
  constructor(private repoDir: string = process.cwd()) {}
  
  isAvailable(): boolean {
    return fs.existsSync(path.join(this.repoDir, '.git'));
  }
  
  async collect(): Promise<GitContext | null> {
    if (!this.isAvailable()) return null;
    
    const currentBranch = await this.getCurrentBranch();
    const recentCommits = await this.getRecentCommits(10);
    const status = await this.getStatus();
    const diff = await this.getDiff();
    
    return {
      type: 'git',
      currentBranch,
      recentCommits,
      status,
      diff
    };
  }
  
  private async execGit(args: string[]): Promise<string> {
    try {
      const { execSync } = require('child_process');
      return execSync(`git ${args.join(' ')}`, { 
        cwd: this.repoDir,
        encoding: 'utf-8' 
      }).trim();
    } catch {
      return '';
    }
  }
  
  private async getCurrentBranch(): Promise<string> {
    return this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';
  }
  
  private async getRecentCommits(limit: number): Promise<GitCommit[]> {
    try {
      const log = await this.execGit([
        'log',
        `--pretty=format:%h|%s|%an|%ad`,
        `-${limit}`,
        '--date=iso'
      ]);
      
      return log.split('\n').filter(Boolean).map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
    } catch {
      return [];
    }
  }
  
  private async getStatus(): Promise<GitStatus> {
    try {
      const status = await this.execGit(['status', '--porcelain']);
      const lines = status.split('\n').filter(Boolean);
      
      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];
      
      for (const line of lines) {
        const statusChar = line.slice(0, 2).trim();
        const file = line.slice(3).trim();
        
        if (statusChar.includes('A') || statusChar.includes('M')) {
          staged.push(file);
        } else if (statusChar === ' M') {
          modified.push(file);
        } else if (statusChar === '??') {
          untracked.push(file);
        }
      }
      
      return { staged, modified, untracked };
    } catch {
      return { staged: [], modified: [], untracked: [] };
    }
  }
  
  private async getDiff(): Promise<string | undefined> {
    try {
      return this.execGit(['diff', '--stat']);
    } catch {
      return undefined;
    }
  }
  
  async getResource(resourceId: string): Promise<unknown> {
    switch (resourceId) {
      case 'commits':
        return this.getRecentCommits(50);
      case 'status':
        return this.getStatus();
      case 'diff':
        return this.getDiff();
      case 'branch':
        return { current: await this.getCurrentBranch() };
      default:
        return this.collect();
    }
  }
  
  async refresh(): Promise<void> {
    // Git status is always fresh
  }
}

/**
 * OpenAPI Context Provider
 */
export class OpenAPIContextProvider implements IContextProvider {
  contextType = 'openapi';
  
  constructor(
    private specPaths: string[] = [],
    private baseUrl: string = ''
  ) {}
  
  isAvailable(): boolean {
    return this.specPaths.some(p => fs.existsSync(p));
  }
  
  async collect(): Promise<OpenAPIContext | null> {
    const endpoints: APIEndpoint[] = [];
    const schemas: Record<string, unknown> = {};
    
    for (const specPath of this.specPaths) {
      if (!fs.existsSync(specPath)) continue;
      
      try {
        const content = fs.readFileSync(specPath, 'utf-8');
        const spec = JSON.parse(content);
        
        // Extract paths
        if (spec.paths) {
          for (const [path, methods] of Object.entries(spec.paths as Record<string, unknown>)) {
            for (const [method, details] of Object.entries(methods as Record<string, unknown>)) {
              const operation = details as Record<string, unknown>;
              endpoints.push({
                path,
                method: method.toUpperCase() as APIEndpoint['method'],
                summary: operation.summary as string | undefined,
                parameters: operation.parameters as APIParameter[] | undefined,
                responses: operation.responses as Record<string, unknown>
              });
            }
          }
        }
        
        // Extract schemas
        if (spec.components?.schemas) {
          Object.assign(schemas, spec.components.schemas);
        }
      } catch {
        // Skip invalid specs
      }
    }
    
    return {
      type: 'openapi',
      baseUrl: this.baseUrl,
      endpoints,
      schemas
    };
  }
  
  async getResource(resourceId: string): Promise<unknown> {
    if (resourceId.startsWith('endpoint:')) {
      const path = resourceId.replace('endpoint:', '');
      const spec = await this.collect();
      return spec?.endpoints.find(e => e.path === path);
    }
    return this.collect();
  }
  
  async refresh(): Promise<void> {
    // API specs are typically static
  }
  
  addSpecPath(specPath: string): void {
    this.specPaths.push(specPath);
  }
  
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }
}

/**
 * Tests Context Provider
 */
export class TestsContextProvider implements IContextProvider {
  contextType = 'tests';
  
  constructor(private projectDir: string = process.cwd()) {}
  
  isAvailable(): boolean {
    const testPatterns = [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/__tests__/**'
    ];
    
    for (const pattern of testPatterns) {
      const glob = require('glob');
      const files = glob.sync(pattern, { cwd: this.projectDir });
      if (files.length > 0) return true;
    }
    
    return false;
  }
  
  async collect(): Promise<TestsContext> {
    const framework = this.detectFramework();
    const files = await this.findTestFiles();
    const coverage = await this.readCoverage();
    
    return {
      type: 'tests',
      framework,
      files,
      coverage
    };
  }
  
  private detectFramework(): string {
    const packageJson = path.join(this.projectDir, 'package.json');
    if (fs.existsSync(packageJson)) {
      const content = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      const deps = { ...content.dependencies, ...content.devDependencies };
      
      if (deps['vitest']) return 'vitest';
      if (deps['jest']) return 'jest';
      if (deps['mocha']) return 'mocha';
      if (deps['@testing-library/react']) return 'testing-library';
    }
    
    // Check for config files
    if (fs.existsSync(path.join(this.projectDir, 'vitest.config.ts'))) return 'vitest';
    if (fs.existsSync(path.join(this.projectDir, 'jest.config.js'))) return 'jest';
    
    return 'unknown';
  }
  
  private async findTestFiles(): Promise<TestFile[]> {
    const glob = require('glob');
    const testPatterns = [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js'
    ];
    
    const files: TestFile[] = [];
    
    for (const pattern of testPatterns) {
      const matches = glob.sync(pattern, { cwd: this.projectDir });
      
      for (const file of matches) {
        files.push({
          path: file,
          testCount: this.estimateTestCount(file),
          status: 'passing' // Would require running tests to know
        });
      }
    }
    
    return files;
  }
  
  private estimateTestCount(file: string): number {
    try {
      const content = fs.readFileSync(path.join(this.projectDir, file), 'utf-8');
      // Simple heuristic: count describe/it/test blocks
      const matches = content.match(/(describe|it|test)\s*\(/g);
      return matches?.length || 0;
    } catch {
      return 0;
    }
  }
  
  private async readCoverage(): Promise<TestCoverage | undefined> {
    const coverageDir = path.join(this.projectDir, 'coverage');
    if (!fs.existsSync(coverageDir)) return undefined;
    
    const summaryPath = path.join(coverageDir, 'coverage-summary.json');
    if (!fs.existsSync(summaryPath)) return undefined;
    
    try {
      const content = fs.readFileSync(summaryPath, 'utf-8');
      const summary = JSON.parse(content);
      
      return {
        line: summary.total?.lines?.pct || 0,
        branch: summary.total?.branches?.pct || 0,
        function: summary.total?.functions?.pct || 0,
        statement: summary.total?.statements?.pct || 0
      };
    } catch {
      return undefined;
    }
  }
  
  async getResource(resourceId: string): Promise<unknown> {
    switch (resourceId) {
      case 'files':
        return this.findTestFiles();
      case 'coverage':
        return this.readCoverage();
      case 'framework':
        return { name: this.detectFramework() };
      default:
        return this.collect();
    }
  }
  
  async refresh(): Promise<void> {
    // Would need to re-run tests for accurate status
  }
}

/**
 * Memory Context Provider
 */
export class MemoryContextProvider implements IContextProvider {
  contextType = 'memory';
  
  constructor(
    private projectDir: string = process.cwd(),
    private sessionDir: string = '.vibe/sessions'
  ) {}
  
  isAvailable(): boolean {
    return fs.existsSync(path.join(this.projectDir, '.vibe'));
  }
  
  async collect(): Promise<MemoryContext | null> {
    const projectMemory = await this.getProjectMemory();
    const sessionMemory = await this.getSessionMemory();
    const recentDecisions = await this.getRecentDecisions();
    
    return {
      type: 'memory',
      projectMemory,
      sessionMemory,
      recentDecisions
    };
  }
  
  private async getProjectMemory(): Promise<ProjectMemorySummary> {
    const vibeDir = path.join(this.projectDir, '.vibe');
    
    try {
      const decisionsPath = path.join(vibeDir, 'decisions.json');
      const rulesPath = path.join(vibeDir, 'rules.json');
      const patternsPath = path.join(vibeDir, 'patterns.json');
      
      const decisions = fs.existsSync(decisionsPath) 
        ? JSON.parse(fs.readFileSync(decisionsPath, 'utf-8')).length 
        : 0;
      const rules = fs.existsSync(rulesPath) 
        ? JSON.parse(fs.readFileSync(rulesPath, 'utf-8')).length 
        : 0;
      const patterns = fs.existsSync(patternsPath) 
        ? JSON.parse(fs.readFileSync(patternsPath, 'utf-8')).length 
        : 0;
      
      return {
        decisions,
        rules,
        patterns,
        lastUpdated: new Date().toISOString()
      };
    } catch {
      return { decisions: 0, rules: 0, patterns: 0, lastUpdated: '' };
    }
  }
  
  private async getSessionMemory(): Promise<SessionMemorySummary> {
    const sessionsDir = path.join(this.projectDir, this.sessionDir);
    
    try {
      if (!fs.existsSync(sessionsDir)) {
        return { messages: 0, checkpoints: 0, contextSize: '0KB' };
      }
      
      const sessions = fs.readdirSync(sessionsDir);
      let totalMessages = 0;
      let totalCheckpoints = 0;
      let totalSize = 0;
      
      for (const session of sessions) {
        const sessionPath = path.join(sessionsDir, session);
        if (fs.statSync(sessionPath).isDirectory()) {
          const files = fs.readdirSync(sessionPath);
          totalMessages += files.filter(f => f.endsWith('.json')).length;
          totalCheckpoints += files.filter(f => f.startsWith('checkpoint')).length;
          
          for (const file of files) {
            totalSize += fs.statSync(path.join(sessionPath, file)).size;
          }
        }
      }
      
      return {
        messages: totalMessages,
        checkpoints: totalCheckpoints,
        contextSize: `${(totalSize / 1024).toFixed(1)}KB`
      };
    } catch {
      return { messages: 0, checkpoints: 0, contextSize: '0KB' };
    }
  }
  
  private async getRecentDecisions(): Promise<string[]> {
    const decisionsPath = path.join(this.projectDir, '.vibe', 'decisions.json');
    
    if (!fs.existsSync(decisionsPath)) return [];
    
    try {
      const content = JSON.parse(fs.readFileSync(decisionsPath, 'utf-8'));
      return content.slice(-5).map((d: { title: string }) => d.title);
    } catch {
      return [];
    }
  }
  
  async getResource(resourceId: string): Promise<unknown> {
    switch (resourceId) {
      case 'decisions':
        return this.getRecentDecisions();
      case 'project':
        return this.getProjectMemory();
      case 'session':
        return this.getSessionMemory();
      default:
        return this.collect();
    }
  }
  
  async refresh(): Promise<void> {
    // Memory is always current
  }
}

// ============================================================================
// CONTEXT AGGREGATOR
// ============================================================================

export class MCPContextAggregator {
  private providers: Map<string, IContextProvider> = new Map();
  
  constructor(private projectDir: string = process.cwd()) {
    this.registerDefaultProviders();
  }
  
  private registerDefaultProviders(): void {
    this.register(new FileSystemContextProvider(this.projectDir));
    this.register(new GitContextProvider(this.projectDir));
    this.register(new TestsContextProvider(this.projectDir));
    this.register(new MemoryContextProvider(this.projectDir));
  }
  
  register(provider: IContextProvider): void {
    this.providers.set(provider.contextType, provider);
  }
  
  async collectAll(): Promise<MCPContext> {
    const context: MCPContext = {
      filesystem: { type: 'filesystem', root: '', structure: [], excludePatterns: [] },
      git: { type: 'git', currentBranch: '', recentCommits: [], status: { staged: [], modified: [], untracked: [] } },
      openapi: { type: 'openapi', baseUrl: '', endpoints: [], schemas: {} },
      tests: { type: 'tests', framework: '', files: [] },
      memory: { type: 'memory', projectMemory: { decisions: 0, rules: 0, patterns: 0, lastUpdated: '' }, sessionMemory: { messages: 0, checkpoints: 0, contextSize: '0KB' }, recentDecisions: [] },
      infra: { type: 'infra', providers: [], configFiles: [] }
    };
    
    // Collect from each provider
    const filesystem = await this.getContext('filesystem');
    if (filesystem) context.filesystem = filesystem as FileSystemContext;
    
    const git = await this.getContext('git');
    if (git) context.git = git as GitContext;
    
    const openapi = await this.getContext('openapi');
    if (openapi) context.openapi = openapi as OpenAPIContext;
    
    const tests = await this.getContext('tests');
    if (tests) context.tests = tests as TestsContext;
    
    const memory = await this.getContext('memory');
    if (memory) context.memory = memory as MemoryContext;
    
    return context;
  }
  
  async getContext(contextType: string): Promise<unknown | null> {
    const provider = this.providers.get(contextType);
    if (!provider) return null;
    
    try {
      return await provider.collect();
    } catch (error) {
      console.error(`Error collecting ${contextType} context:`, error);
      return null;
    }
  }
  
  async getResource(contextType: string, resourceId: string): Promise<unknown | null> {
    const provider = this.providers.get(contextType);
    if (!provider) return null;
    
    try {
      return await provider.getResource(resourceId);
    } catch (error) {
      console.error(`Error getting ${contextType}/${resourceId}:`, error);
      return null;
    }
  }
  
  listContextTypes(): string[] {
    return Array.from(this.providers.keys());
  }
  
  isAvailable(contextType: string): boolean {
    const provider = this.providers.get(contextType);
    return provider?.isAvailable() || false;
  }
  
  async refresh(contextType: string): Promise<void> {
    const provider = this.providers.get(contextType);
    await provider?.refresh();
  }
}
