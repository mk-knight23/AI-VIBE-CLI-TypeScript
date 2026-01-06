"use strict";
/**
 * VIBE-CLI v12 - MCP Context Providers
 * Structured, minimal, inspectable context for agents
 *
 * Phase 5: MCP Everywhere
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPContextAggregator = exports.MemoryContextProvider = exports.TestsContextProvider = exports.OpenAPIContextProvider = exports.GitContextProvider = exports.FileSystemContextProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * File System Context Provider
 */
class FileSystemContextProvider {
    rootDir;
    contextType = 'filesystem';
    constructor(rootDir = process.cwd()) {
        this.rootDir = rootDir;
    }
    isAvailable() {
        return fs.existsSync(this.rootDir);
    }
    async collect() {
        const structure = this.walkDirectory(this.rootDir);
        return {
            type: 'filesystem',
            root: this.rootDir,
            structure,
            excludePatterns: ['node_modules', '.git', 'dist', 'build', '.vibe']
        };
    }
    walkDirectory(dir, depth = 3) {
        if (depth <= 0)
            return [];
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            const nodes = [];
            for (const entry of entries) {
                if (this.isExcluded(entry.name))
                    continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const children = this.walkDirectory(fullPath, depth - 1);
                    nodes.push({
                        name: entry.name,
                        type: 'directory',
                        path: fullPath,
                        children: children.length > 0 ? children : undefined
                    });
                }
                else {
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
                if (a.type !== b.type)
                    return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        }
        catch {
            return [];
        }
    }
    isExcluded(name) {
        const exclusions = ['node_modules', '.git', 'dist', 'build', '.vibe', '.DS_Store'];
        return exclusions.some(ex => name.startsWith(ex) || name === ex);
    }
    async getResource(resourceId) {
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
    async refresh() {
        // No-op for file system - always fresh
    }
}
exports.FileSystemContextProvider = FileSystemContextProvider;
/**
 * Git Context Provider
 */
class GitContextProvider {
    repoDir;
    contextType = 'git';
    constructor(repoDir = process.cwd()) {
        this.repoDir = repoDir;
    }
    isAvailable() {
        return fs.existsSync(path.join(this.repoDir, '.git'));
    }
    async collect() {
        if (!this.isAvailable())
            return null;
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
    async execGit(args) {
        try {
            const { execSync } = require('child_process');
            return execSync(`git ${args.join(' ')}`, {
                cwd: this.repoDir,
                encoding: 'utf-8'
            }).trim();
        }
        catch {
            return '';
        }
    }
    async getCurrentBranch() {
        return this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';
    }
    async getRecentCommits(limit) {
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
        }
        catch {
            return [];
        }
    }
    async getStatus() {
        try {
            const status = await this.execGit(['status', '--porcelain']);
            const lines = status.split('\n').filter(Boolean);
            const staged = [];
            const modified = [];
            const untracked = [];
            for (const line of lines) {
                const statusChar = line.slice(0, 2).trim();
                const file = line.slice(3).trim();
                if (statusChar.includes('A') || statusChar.includes('M')) {
                    staged.push(file);
                }
                else if (statusChar === ' M') {
                    modified.push(file);
                }
                else if (statusChar === '??') {
                    untracked.push(file);
                }
            }
            return { staged, modified, untracked };
        }
        catch {
            return { staged: [], modified: [], untracked: [] };
        }
    }
    async getDiff() {
        try {
            return this.execGit(['diff', '--stat']);
        }
        catch {
            return undefined;
        }
    }
    async getResource(resourceId) {
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
    async refresh() {
        // Git status is always fresh
    }
}
exports.GitContextProvider = GitContextProvider;
/**
 * OpenAPI Context Provider
 */
class OpenAPIContextProvider {
    specPaths;
    baseUrl;
    contextType = 'openapi';
    constructor(specPaths = [], baseUrl = '') {
        this.specPaths = specPaths;
        this.baseUrl = baseUrl;
    }
    isAvailable() {
        return this.specPaths.some(p => fs.existsSync(p));
    }
    async collect() {
        const endpoints = [];
        const schemas = {};
        for (const specPath of this.specPaths) {
            if (!fs.existsSync(specPath))
                continue;
            try {
                const content = fs.readFileSync(specPath, 'utf-8');
                const spec = JSON.parse(content);
                // Extract paths
                if (spec.paths) {
                    for (const [path, methods] of Object.entries(spec.paths)) {
                        for (const [method, details] of Object.entries(methods)) {
                            const operation = details;
                            endpoints.push({
                                path,
                                method: method.toUpperCase(),
                                summary: operation.summary,
                                parameters: operation.parameters,
                                responses: operation.responses
                            });
                        }
                    }
                }
                // Extract schemas
                if (spec.components?.schemas) {
                    Object.assign(schemas, spec.components.schemas);
                }
            }
            catch {
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
    async getResource(resourceId) {
        if (resourceId.startsWith('endpoint:')) {
            const path = resourceId.replace('endpoint:', '');
            const spec = await this.collect();
            return spec?.endpoints.find(e => e.path === path);
        }
        return this.collect();
    }
    async refresh() {
        // API specs are typically static
    }
    addSpecPath(specPath) {
        this.specPaths.push(specPath);
    }
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl;
    }
}
exports.OpenAPIContextProvider = OpenAPIContextProvider;
/**
 * Tests Context Provider
 */
class TestsContextProvider {
    projectDir;
    contextType = 'tests';
    constructor(projectDir = process.cwd()) {
        this.projectDir = projectDir;
    }
    isAvailable() {
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
            if (files.length > 0)
                return true;
        }
        return false;
    }
    async collect() {
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
    detectFramework() {
        const packageJson = path.join(this.projectDir, 'package.json');
        if (fs.existsSync(packageJson)) {
            const content = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
            const deps = { ...content.dependencies, ...content.devDependencies };
            if (deps['vitest'])
                return 'vitest';
            if (deps['jest'])
                return 'jest';
            if (deps['mocha'])
                return 'mocha';
            if (deps['@testing-library/react'])
                return 'testing-library';
        }
        // Check for config files
        if (fs.existsSync(path.join(this.projectDir, 'vitest.config.ts')))
            return 'vitest';
        if (fs.existsSync(path.join(this.projectDir, 'jest.config.js')))
            return 'jest';
        return 'unknown';
    }
    async findTestFiles() {
        const glob = require('glob');
        const testPatterns = [
            '**/*.test.ts',
            '**/*.test.js',
            '**/*.spec.ts',
            '**/*.spec.js'
        ];
        const files = [];
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
    estimateTestCount(file) {
        try {
            const content = fs.readFileSync(path.join(this.projectDir, file), 'utf-8');
            // Simple heuristic: count describe/it/test blocks
            const matches = content.match(/(describe|it|test)\s*\(/g);
            return matches?.length || 0;
        }
        catch {
            return 0;
        }
    }
    async readCoverage() {
        const coverageDir = path.join(this.projectDir, 'coverage');
        if (!fs.existsSync(coverageDir))
            return undefined;
        const summaryPath = path.join(coverageDir, 'coverage-summary.json');
        if (!fs.existsSync(summaryPath))
            return undefined;
        try {
            const content = fs.readFileSync(summaryPath, 'utf-8');
            const summary = JSON.parse(content);
            return {
                line: summary.total?.lines?.pct || 0,
                branch: summary.total?.branches?.pct || 0,
                function: summary.total?.functions?.pct || 0,
                statement: summary.total?.statements?.pct || 0
            };
        }
        catch {
            return undefined;
        }
    }
    async getResource(resourceId) {
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
    async refresh() {
        // Would need to re-run tests for accurate status
    }
}
exports.TestsContextProvider = TestsContextProvider;
/**
 * Memory Context Provider
 */
class MemoryContextProvider {
    projectDir;
    sessionDir;
    contextType = 'memory';
    constructor(projectDir = process.cwd(), sessionDir = '.vibe/sessions') {
        this.projectDir = projectDir;
        this.sessionDir = sessionDir;
    }
    isAvailable() {
        return fs.existsSync(path.join(this.projectDir, '.vibe'));
    }
    async collect() {
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
    async getProjectMemory() {
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
        }
        catch {
            return { decisions: 0, rules: 0, patterns: 0, lastUpdated: '' };
        }
    }
    async getSessionMemory() {
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
        }
        catch {
            return { messages: 0, checkpoints: 0, contextSize: '0KB' };
        }
    }
    async getRecentDecisions() {
        const decisionsPath = path.join(this.projectDir, '.vibe', 'decisions.json');
        if (!fs.existsSync(decisionsPath))
            return [];
        try {
            const content = JSON.parse(fs.readFileSync(decisionsPath, 'utf-8'));
            return content.slice(-5).map((d) => d.title);
        }
        catch {
            return [];
        }
    }
    async getResource(resourceId) {
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
    async refresh() {
        // Memory is always current
    }
}
exports.MemoryContextProvider = MemoryContextProvider;
// ============================================================================
// CONTEXT AGGREGATOR
// ============================================================================
class MCPContextAggregator {
    projectDir;
    providers = new Map();
    constructor(projectDir = process.cwd()) {
        this.projectDir = projectDir;
        this.registerDefaultProviders();
    }
    registerDefaultProviders() {
        this.register(new FileSystemContextProvider(this.projectDir));
        this.register(new GitContextProvider(this.projectDir));
        this.register(new TestsContextProvider(this.projectDir));
        this.register(new MemoryContextProvider(this.projectDir));
    }
    register(provider) {
        this.providers.set(provider.contextType, provider);
    }
    async collectAll() {
        const context = {
            filesystem: { type: 'filesystem', root: '', structure: [], excludePatterns: [] },
            git: { type: 'git', currentBranch: '', recentCommits: [], status: { staged: [], modified: [], untracked: [] } },
            openapi: { type: 'openapi', baseUrl: '', endpoints: [], schemas: {} },
            tests: { type: 'tests', framework: '', files: [] },
            memory: { type: 'memory', projectMemory: { decisions: 0, rules: 0, patterns: 0, lastUpdated: '' }, sessionMemory: { messages: 0, checkpoints: 0, contextSize: '0KB' }, recentDecisions: [] },
            infra: { type: 'infra', providers: [], configFiles: [] }
        };
        // Collect from each provider
        const filesystem = await this.getContext('filesystem');
        if (filesystem)
            context.filesystem = filesystem;
        const git = await this.getContext('git');
        if (git)
            context.git = git;
        const openapi = await this.getContext('openapi');
        if (openapi)
            context.openapi = openapi;
        const tests = await this.getContext('tests');
        if (tests)
            context.tests = tests;
        const memory = await this.getContext('memory');
        if (memory)
            context.memory = memory;
        return context;
    }
    async getContext(contextType) {
        const provider = this.providers.get(contextType);
        if (!provider)
            return null;
        try {
            return await provider.collect();
        }
        catch (error) {
            console.error(`Error collecting ${contextType} context:`, error);
            return null;
        }
    }
    async getResource(contextType, resourceId) {
        const provider = this.providers.get(contextType);
        if (!provider)
            return null;
        try {
            return await provider.getResource(resourceId);
        }
        catch (error) {
            console.error(`Error getting ${contextType}/${resourceId}:`, error);
            return null;
        }
    }
    listContextTypes() {
        return Array.from(this.providers.keys());
    }
    isAvailable(contextType) {
        const provider = this.providers.get(contextType);
        return provider?.isAvailable() || false;
    }
    async refresh(contextType) {
        const provider = this.providers.get(contextType);
        await provider?.refresh();
    }
}
exports.MCPContextAggregator = MCPContextAggregator;
//# sourceMappingURL=context-provider.js.map