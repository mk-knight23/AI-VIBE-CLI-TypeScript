"use strict";
/**
 * VIBE-CLI v12 - Documentation Module
 * Generate and maintain project documentation
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
exports.DocumentationModule = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const base_module_1 = require("../base.module");
const router_1 = require("../../providers/router");
class DocumentationModule extends base_module_1.BaseModule {
    provider;
    constructor() {
        super({
            name: 'documentation',
            version: '1.0.0',
            description: 'Generate and maintain project documentation',
        });
        this.provider = new router_1.VibeProviderRouter();
    }
    async execute(params) {
        const action = params.action || params.type || 'generate';
        try {
            switch (action) {
                case 'generate':
                    return this.generateDocs(params);
                case 'readme':
                    return this.generateReadme(params);
                case 'api':
                    return this.generateAPIDocs(params);
                case 'update':
                    return this.updateDocs(params);
                default:
                    return this.failure(`Unknown action: ${action}`);
            }
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    async generateDocs(params) {
        const { scope = 'project', format = 'markdown' } = params;
        this.logInfo(`Generating ${scope} documentation...`);
        switch (scope) {
            case 'project':
                return this.generateProjectDocs();
            case 'module':
                return this.generateModuleDocs(params.module);
            case 'file':
                return this.generateFileDocs(params.file);
            default:
                return this.failure(`Unknown scope: ${scope}`);
        }
    }
    async generateProjectDocs() {
        const structure = this.analyzeProjectStructure();
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a technical writer. Create comprehensive project documentation.' },
            { role: 'user', content: `Create a comprehensive README.md for this project with this structure: ${JSON.stringify(structure)}` },
        ]);
        return this.success({
            type: 'project',
            documentation: response.content,
            structure,
        });
    }
    async generateModuleDocs(moduleName) {
        if (!moduleName) {
            return this.failure('Missing required parameter: module');
        }
        this.logInfo(`Generating documentation for ${moduleName}...`);
        const modulePath = path.join(process.cwd(), 'src', 'modules', moduleName);
        if (!fs.existsSync(modulePath)) {
            return this.failure(`Module not found: ${moduleName}`);
        }
        const files = this.collectFiles(modulePath);
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a technical writer. Create detailed module documentation.' },
            { role: 'user', content: `Create comprehensive documentation for this module: ${moduleName}. Files: ${JSON.stringify(files)}` },
        ]);
        return this.success({
            type: 'module',
            module: moduleName,
            documentation: response.content,
        });
    }
    async generateFileDocs(filePath) {
        if (!filePath) {
            return this.failure('Missing required parameter: file');
        }
        this.logInfo(`Generating documentation for ${filePath}...`);
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), filePath);
        if (!fs.existsSync(absolutePath)) {
            return this.failure(`File not found: ${filePath}`);
        }
        const content = fs.readFileSync(absolutePath, 'utf-8');
        const fileName = path.basename(absolutePath);
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a technical writer. Create detailed code documentation.' },
            { role: 'user', content: `Create comprehensive documentation for this file: ${fileName}\n\nCode:\n${content}` },
        ]);
        return this.success({
            type: 'file',
            file: filePath,
            documentation: response.content,
        });
    }
    async generateReadme(params) {
        this.logInfo('Generating README.md...');
        const structure = this.analyzeProjectStructure();
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a technical writer. Create a professional README.md.' },
            { role: 'user', content: `Create a comprehensive README.md for this project:\n\nStructure:\n${JSON.stringify(structure, null, 2)}\n\nInclude: Installation, Usage, Features, Configuration, Contributing, License.` },
        ]);
        // Save to file
        const readmePath = path.join(process.cwd(), 'README.md');
        fs.writeFileSync(readmePath, response.content);
        return this.success({
            file: 'README.md',
            content: response.content,
        });
    }
    async generateAPIDocs(params) {
        const { format = 'markdown' } = params;
        this.logInfo('Generating API documentation...');
        const apiFiles = this.findAPIFiles();
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a technical writer. Create API documentation.' },
            { role: 'user', content: `Create API documentation from these files: ${JSON.stringify(apiFiles)}` },
        ]);
        return this.success({
            type: 'api',
            documentation: response.content,
            files: apiFiles,
        });
    }
    async updateDocs(params) {
        const { file, content } = params;
        if (!file) {
            return this.failure('Missing required parameter: file');
        }
        this.logInfo(`Updating documentation for ${file}...`);
        const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
            return this.failure(`File not found: ${file}`);
        }
        const currentContent = fs.readFileSync(filePath, 'utf-8');
        const response = await this.provider.chat([
            { role: 'system', content: 'You are a technical writer. Update documentation to reflect changes.' },
            { role: 'user', content: `Update this documentation:\n\nCurrent:\n${currentContent}\n\nNew content to incorporate:\n${content || 'See file changes'}` },
        ]);
        fs.writeFileSync(filePath, response.content);
        return this.success({
            file,
            updated: true,
            content: response.content,
        });
    }
    analyzeProjectStructure() {
        const structure = {
            name: path.basename(process.cwd()),
            files: [],
            languages: {},
            mainFiles: [],
            directories: [],
        };
        const collectStats = (dir, prefix = '') => {
            if (!fs.existsSync(dir))
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        structure.directories = structure.directories || [];
                        structure.directories.push(relativePath);
                        collectStats(fullPath, relativePath);
                    }
                }
                else {
                    structure.files.push(relativePath);
                    const ext = path.extname(entry.name);
                    structure.languages[ext] = (structure.languages[ext] || 0) + 1;
                    if (['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js'].includes(entry.name)) {
                        structure.mainFiles.push(relativePath);
                    }
                }
            }
        };
        collectStats(process.cwd());
        return structure;
    }
    collectFiles(dir) {
        const files = [];
        const walk = (currentDir) => {
            if (!fs.existsSync(currentDir))
                return;
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
                    files.push({
                        name: entry.name,
                        path: fullPath,
                        content: fs.readFileSync(fullPath, 'utf-8').substring(0, 500),
                    });
                }
                else if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    walk(fullPath);
                }
            }
        };
        walk(dir);
        return files;
    }
    findAPIFiles() {
        const patterns = ['**/*.api.ts', '**/types.ts', '**/interfaces.ts', '**/*.d.ts'];
        const files = [];
        const walk = (dir) => {
            if (!fs.existsSync(dir))
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isFile() && patterns.some(p => new RegExp(p.replace('**/', '.*')).test(fullPath))) {
                    files.push(fullPath);
                }
                else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    walk(fullPath);
                }
            }
        };
        walk(process.cwd());
        return files;
    }
}
exports.DocumentationModule = DocumentationModule;
//# sourceMappingURL=index.js.map