/**
 * VIBE-CLI v0.0.1 - Context Module
 * MCP-based context management for AI agents
 */
import * as fs from 'fs';
import * as path from 'path';
export { VibeContextManager as VibeContext };
export class VibeContextManager {
    projectRoot;
    entries = new Map();
    constructor(projectRoot) {
        this.projectRoot = projectRoot || process.cwd();
    }
    /**
     * Load project context
     */
    async loadProjectContext() {
        const pkgPath = path.join(this.projectRoot, 'package.json');
        let language = 'typescript';
        let framework;
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                // Detect language/framework from dependencies
                if (pkg.dependencies?.['next'] || pkg.dependencies?.['react']) {
                    framework = 'nextjs';
                }
                else if (pkg.dependencies?.['vue']) {
                    language = 'javascript';
                    framework = 'vue';
                }
                else if (pkg.dependencies?.['@nestjs/core']) {
                    framework = 'nestjs';
                }
                else if (pkg.dependencies?.['express']) {
                    language = 'javascript';
                    framework = 'express';
                }
            }
            catch {
                // Ignore parse errors
            }
        }
        return {
            root: this.projectRoot,
            language,
            framework,
            files: 0,
            tests: 0,
        };
    }
    /**
     * Load file contents
     */
    async loadFiles(patterns) {
        const files = [];
        for (const pattern of patterns) {
            const resolved = path.join(this.projectRoot, pattern);
            if (fs.existsSync(resolved)) {
                if (fs.statSync(resolved).isFile()) {
                    const content = fs.readFileSync(resolved, 'utf-8');
                    files.push({
                        path: pattern,
                        content,
                        language: this.detectLanguage(pattern),
                        size: content.length,
                    });
                }
            }
        }
        return files;
    }
    /**
     * Load git context
     */
    async loadGitContext() {
        const gitDir = path.join(this.projectRoot, '.git');
        if (!fs.existsSync(gitDir)) {
            return undefined;
        }
        return {
            type: 'git',
            currentBranch: 'main',
            recentCommits: [],
            status: { staged: [], modified: [], untracked: [] },
        };
    }
    /**
     * Add a context entry
     */
    addContext(type, content) {
        const id = `${type}-${Date.now()}`;
        this.entries.set(id, {
            id,
            type,
            content,
            source: 'system',
            timestamp: new Date(),
        });
    }
    /**
     * Get context by type
     */
    getContext(type) {
        const results = [];
        for (const entry of this.entries.values()) {
            if (entry.type === type) {
                results.push(entry);
            }
        }
        return results;
    }
    /**
     * Get all context
     */
    getAllContext() {
        return Array.from(this.entries.values());
    }
    /**
     * Clear context
     */
    clear() {
        this.entries.clear();
    }
    /**
     * Detect programming language from file extension
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const langMap = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.md': 'markdown',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
        };
        return langMap[ext] || 'unknown';
    }
    /**
     * Get project root
     */
    getProjectRoot() {
        return this.projectRoot;
    }
    /**
     * Check if file exists
     */
    fileExists(relativePath) {
        return fs.existsSync(path.join(this.projectRoot, relativePath));
    }
    /**
     * Read file content
     */
    readFile(relativePath) {
        const fullPath = path.join(this.projectRoot, relativePath);
        if (!fs.existsSync(fullPath)) {
            return null;
        }
        return fs.readFileSync(fullPath, 'utf-8');
    }
    /**
     * Write file content
     */
    writeFile(relativePath, content) {
        const fullPath = path.join(this.projectRoot, relativePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content);
    }
    /**
     * Get MCP-compatible context
     */
    async getMCPContext() {
        const projectContext = await this.loadProjectContext();
        const gitContext = await this.loadGitContext();
        return {
            project: projectContext,
            git: gitContext,
            files: await this.loadFiles(['**/*.ts', '**/*.js', '**/*.json']),
        };
    }
}
//# sourceMappingURL=index.js.map