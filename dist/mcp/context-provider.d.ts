/**
 * VIBE-CLI v12 - MCP Context Providers
 * Structured, minimal, inspectable context for agents
 *
 * Phase 5: MCP Everywhere
 */
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
export declare class FileSystemContextProvider implements IContextProvider {
    private rootDir;
    contextType: string;
    constructor(rootDir?: string);
    isAvailable(): boolean;
    collect(): Promise<FileSystemContext>;
    private walkDirectory;
    private isExcluded;
    getResource(resourceId: string): Promise<unknown>;
    refresh(): Promise<void>;
}
/**
 * Git Context Provider
 */
export declare class GitContextProvider implements IContextProvider {
    private repoDir;
    contextType: string;
    constructor(repoDir?: string);
    isAvailable(): boolean;
    collect(): Promise<GitContext | null>;
    private execGit;
    private getCurrentBranch;
    private getRecentCommits;
    private getStatus;
    private getDiff;
    getResource(resourceId: string): Promise<unknown>;
    refresh(): Promise<void>;
}
/**
 * OpenAPI Context Provider
 */
export declare class OpenAPIContextProvider implements IContextProvider {
    private specPaths;
    private baseUrl;
    contextType: string;
    constructor(specPaths?: string[], baseUrl?: string);
    isAvailable(): boolean;
    collect(): Promise<OpenAPIContext | null>;
    getResource(resourceId: string): Promise<unknown>;
    refresh(): Promise<void>;
    addSpecPath(specPath: string): void;
    setBaseUrl(baseUrl: string): void;
}
/**
 * Tests Context Provider
 */
export declare class TestsContextProvider implements IContextProvider {
    private projectDir;
    contextType: string;
    constructor(projectDir?: string);
    isAvailable(): boolean;
    collect(): Promise<TestsContext>;
    private detectFramework;
    private findTestFiles;
    private estimateTestCount;
    private readCoverage;
    getResource(resourceId: string): Promise<unknown>;
    refresh(): Promise<void>;
}
/**
 * Memory Context Provider
 */
export declare class MemoryContextProvider implements IContextProvider {
    private projectDir;
    private sessionDir;
    contextType: string;
    constructor(projectDir?: string, sessionDir?: string);
    isAvailable(): boolean;
    collect(): Promise<MemoryContext | null>;
    private getProjectMemory;
    private getSessionMemory;
    private getRecentDecisions;
    getResource(resourceId: string): Promise<unknown>;
    refresh(): Promise<void>;
}
export declare class MCPContextAggregator {
    private projectDir;
    private providers;
    constructor(projectDir?: string);
    private registerDefaultProviders;
    register(provider: IContextProvider): void;
    collectAll(): Promise<MCPContext>;
    getContext(contextType: string): Promise<unknown | null>;
    getResource(contextType: string, resourceId: string): Promise<unknown | null>;
    listContextTypes(): string[];
    isAvailable(contextType: string): boolean;
    refresh(contextType: string): Promise<void>;
}
//# sourceMappingURL=context-provider.d.ts.map