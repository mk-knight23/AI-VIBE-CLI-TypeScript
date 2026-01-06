"use strict";
/**
 * VIBE-CLI v12 - Testing Module
 * Test generation, execution, and coverage analysis
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
exports.TestingModule = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const base_module_1 = require("../base.module");
const router_1 = require("../../providers/router");
class TestingModule extends base_module_1.BaseModule {
    provider;
    // Supported test frameworks
    frameworks = [
        {
            name: 'jest',
            testCommand: 'npx jest --passWithNoTests',
            coverageCommand: 'npx jest --coverage --passWithNoTests',
            testPattern: /\.test\.(js|ts|jsx|tsx)$/,
            filePattern: '**/*.test.{js,ts,jsx,tsx}',
        },
        {
            name: 'vitest',
            testCommand: 'npx vitest run',
            coverageCommand: 'npx vitest run --coverage',
            testPattern: /\.test\.(js|ts|jsx|tsx)$/,
            filePattern: '**/*.test.{js,ts,jsx,tsx}',
        },
        {
            name: 'mocha',
            testCommand: 'npx mocha',
            coverageCommand: 'npx nyc mocha',
            testPattern: /\.test\.(js|ts|js\.snap)$/,
            filePattern: '**/*.test.{js,ts}',
        },
        {
            name: 'pytest',
            testCommand: 'python -m pytest',
            coverageCommand: 'python -m pytest --cov',
            testPattern: /test_.*\.py$/,
            filePattern: 'test_*.py',
        },
    ];
    constructor() {
        super({
            name: 'testing',
            version: '1.0.0',
            description: 'Test generation, execution, and coverage analysis',
        });
        this.provider = new router_1.VibeProviderRouter();
    }
    /**
     * Execute the module
     */
    async execute(params) {
        const action = params.action || params.type || 'run';
        const startTime = Date.now();
        try {
            switch (action) {
                case 'generate':
                    return this.generateTests(params, startTime);
                case 'run':
                    return this.runTests(params, startTime);
                case 'coverage':
                    return this.getCoverage(params, startTime);
                case 'watch':
                    return this.watchTests(params, startTime);
                case 'analyze':
                    return this.analyzeCoverage(params, startTime);
                default:
                    return this.failure(`Unknown action: ${action}. Supported: generate, run, coverage, watch, analyze`);
            }
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Generate tests for a file
     */
    async generateTests(params, startTime) {
        if (!this.validateParams(params, ['file'])) {
            return this.failure('Missing required parameter: file');
        }
        const { file, framework = 'jest', testType = 'unit' } = params;
        // Read the source file
        const sourcePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
        if (!fs.existsSync(sourcePath)) {
            return this.failure(`File not found: ${sourcePath}`);
        }
        const sourceCode = fs.readFileSync(sourcePath, 'utf-8');
        const language = path.extname(sourcePath).replace('.', '');
        this.logInfo(`Generating ${testType} tests for ${file} using ${framework}...`);
        const frameworkConfig = this.getFrameworkConfig(framework);
        if (!frameworkConfig) {
            return this.failure(`Unsupported framework: ${framework}. Supported: jest, vitest, mocha, pytest`);
        }
        // Generate tests using AI
        const prompt = `Generate ${testType} tests for this ${language} code using ${framework}.

File: ${file}
Test Type: ${testType}

${this.getFrameworkTestTemplate(framework, testType)}

Source code:
\`\`\`${language}
${sourceCode}
\`\`\`

Return the test code in this format:
=== FILENAME ===
[filename with .test.${language} extension]
=== CODE ===
[test code]
=== END ===

Include:
- Proper imports/setup
- Descriptive test names
- Arrange-Act-Assert pattern
- Edge case tests
- Error handling tests`;
        try {
            const response = await this.provider.chat([{ role: 'user', content: prompt }], {
                model: 'claude-sonnet-4-20250514',
                maxTokens: 4096,
            });
            // Parse and write test file
            const codeBlocks = this.parseCodeBlocks(response.content);
            const writtenFiles = this.writeTestFiles(codeBlocks, language);
            const duration = Date.now() - startTime;
            return this.success({
                action: 'generate',
                framework,
                testType,
                file,
                testsGenerated: writtenFiles.length,
                files: writtenFiles,
            }, {
                tokens: response.usage?.totalTokens,
                duration,
                model: response.model,
            });
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Test generation failed');
        }
    }
    /**
     * Run the test suite
     */
    async runTests(params, startTime) {
        const { framework, file, grep, verbose = true } = params;
        // Detect framework if not specified
        let detectedFramework = framework;
        if (!detectedFramework) {
            detectedFramework = this.detectFramework();
        }
        const frameworkConfig = this.getFrameworkConfig(detectedFramework);
        if (!frameworkConfig) {
            return this.failure(`No test framework detected. Supported: jest, vitest, mocha, pytest`);
        }
        this.logInfo(`Running tests with ${detectedFramework}...`);
        let command = frameworkConfig.testCommand;
        // Add file filter if specified
        if (file) {
            const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                command += ` "${filePath}"`;
            }
        }
        // Add grep filter if specified
        if (grep) {
            if (detectedFramework === 'jest' || detectedFramework === 'vitest') {
                command += ` --testNamePattern="${grep}"`;
            }
            else if (detectedFramework === 'mocha') {
                command += ` --grep "${grep}"`;
            }
        }
        try {
            const output = child_process.execSync(command, {
                encoding: 'utf-8',
                timeout: 120000,
                cwd: process.cwd(),
            });
            const result = this.parseTestOutput(output, detectedFramework);
            const duration = Date.now() - startTime;
            if (result.passed > 0) {
                this.logSuccess(`${result.passed} tests passed`);
            }
            if (result.failed > 0) {
                this.logError(`${result.failed} tests failed`);
            }
            return this.success({
                action: 'run',
                framework: detectedFramework,
                ...result,
            }, {
                duration,
            });
        }
        catch (error) {
            // Test failure still gives us output
            const output = error.stdout?.toString() || error.message;
            const result = this.parseTestOutput(output, detectedFramework);
            const duration = Date.now() - startTime;
            // Still return results even if tests failed
            return this.success({
                action: 'run',
                framework: detectedFramework,
                ...result,
                exitCode: error.status,
            }, {
                duration,
            });
        }
    }
    /**
     * Get coverage report
     */
    async getCoverage(params, startTime) {
        const { framework, target = 80, file } = params;
        // Detect framework if not specified
        let detectedFramework = framework;
        if (!detectedFramework) {
            detectedFramework = this.detectFramework();
        }
        const frameworkConfig = this.getFrameworkConfig(detectedFramework);
        if (!frameworkConfig) {
            return this.failure(`No test framework detected. Supported: jest, vitest, mocha, pytest`);
        }
        this.logInfo(`Running coverage with ${detectedFramework}...`);
        let command = frameworkConfig.coverageCommand;
        // Add file filter if specified
        if (file) {
            const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                command += ` "${filePath}"`;
            }
        }
        try {
            const output = child_process.execSync(command, {
                encoding: 'utf-8',
                timeout: 180000,
                cwd: process.cwd(),
            });
            const coverage = this.parseCoverageOutput(output, detectedFramework);
            const duration = Date.now() - startTime;
            const meetsTarget = coverage.lines >= target;
            if (meetsTarget) {
                this.logSuccess(`Coverage: ${coverage.lines}% (target: ${target}%)`);
            }
            else {
                this.logWarning(`Coverage: ${coverage.lines}% (target: ${target}%)`);
            }
            return this.success({
                action: 'coverage',
                framework: detectedFramework,
                target,
                meetsTarget,
                ...coverage,
            }, {
                duration,
            });
        }
        catch (error) {
            return this.failure(error.message);
        }
    }
    /**
     * Watch mode for tests
     */
    async watchTests(params, startTime) {
        const { framework } = params;
        let detectedFramework = framework;
        if (!detectedFramework) {
            detectedFramework = this.detectFramework();
        }
        const frameworkConfig = this.getFrameworkConfig(detectedFramework);
        if (!frameworkConfig) {
            return this.failure(`No test framework detected. Supported: jest, vitest, mocha, pytest`);
        }
        this.logInfo(`Starting test watch mode with ${detectedFramework}...`);
        this.logWarning('Press Ctrl+C to exit watch mode');
        // In watch mode, we just spawn the process
        const watchCommand = detectedFramework === 'jest'
            ? frameworkConfig.testCommand.replace('run', 'watch')
            : detectedFramework === 'vitest'
                ? frameworkConfig.testCommand.replace('run', 'watch')
                : frameworkConfig.testCommand + ' --watch';
        try {
            child_process.exec(watchCommand, {
                encoding: 'utf-8',
                cwd: process.cwd(),
            });
            return this.success({
                action: 'watch',
                framework: detectedFramework,
                message: 'Watch mode started. Press Ctrl+C to exit.',
            });
        }
        catch (error) {
            return this.failure(error.message);
        }
    }
    /**
     * Analyze coverage and suggest improvements
     */
    async analyzeCoverage(params, startTime) {
        const { target = 80 } = params;
        // Get current coverage
        const coverageResult = await this.getCoverage({ target }, startTime);
        if (!coverageResult.success) {
            return coverageResult;
        }
        const coverage = coverageResult.data;
        // Find files with low coverage
        const lowCoverageFiles = (coverage.files || []).filter((f) => f.coverage < target);
        // Generate suggestions
        const suggestions = [];
        if (coverage.lines < target) {
            suggestions.push(`Overall coverage is ${coverage.lines}%. Add tests to cover untested lines.`);
        }
        if (lowCoverageFiles.length > 0) {
            suggestions.push(`${lowCoverageFiles.length} files have coverage below ${target}%:`);
            lowCoverageFiles.slice(0, 5).forEach((f) => {
                suggestions.push(`  - ${f.path} (${f.coverage}%)`);
            });
        }
        return this.success({
            action: 'analyze',
            ...coverage,
            target,
            suggestions,
            filesNeedingTests: lowCoverageFiles,
        });
    }
    /**
     * Get framework configuration
     */
    getFrameworkConfig(framework) {
        return this.frameworks.find(f => f.name === framework);
    }
    /**
     * Detect test framework from project
     */
    detectFramework() {
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                const devDeps = { ...pkg.devDependencies, ...pkg.dependencies };
                if (devDeps.jest || pkg.scripts?.test?.includes('jest'))
                    return 'jest';
                if (devDeps.vitest || pkg.scripts?.test?.includes('vitest'))
                    return 'vitest';
                if (devDeps.mocha || pkg.scripts?.test?.includes('mocha'))
                    return 'mocha';
            }
            catch {
                // Ignore
            }
        }
        // Check for pytest
        if (fs.existsSync(path.join(process.cwd(), 'pytest.ini')) ||
            fs.existsSync(path.join(process.cwd(), 'pyproject.toml'))) {
            return 'pytest';
        }
        return null;
    }
    /**
     * Get framework-specific test template
     */
    getFrameworkTestTemplate(framework, testType) {
        const templates = {
            jest: `
Use Jest describe/it/test syntax.
Example:
describe('FunctionName', () => {
  test('should do something', () => {
    expect(fn()).toBe(value);
  });
});
      `.trim(),
            vitest: `
Use Vitest describe/it/test expect syntax.
Example:
import { describe, it, expect } from 'vitest';
describe('FunctionName', () => {
  test('should do something', () => {
    expect(fn()).toBe(value);
  });
});
      `.trim(),
            mocha: `
Use Mocha describe/it syntax with Chai assertions.
Example:
describe('FunctionName', () => {
  it('should do something', () => {
    expect(fn()).to.equal(value);
  });
});
      `.trim(),
            pytest: `
Use pytest functions with assert.
Example:
def test_should_do_something():
    assert fn() == value
      `.trim(),
        };
        return templates[framework] || templates.jest;
    }
    /**
     * Parse code blocks from response
     */
    parseCodeBlocks(content) {
        const blocks = [];
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
     * Write test files
     */
    writeTestFiles(files, language) {
        const written = [];
        for (const file of files) {
            if (!file.filename)
                continue;
            // Ensure proper test file naming
            let filename = file.filename;
            if (!filename.includes('.test.') && !filename.includes('.spec.')) {
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                const dir = path.dirname(filename);
                filename = path.join(dir, `${base}.test.${language || ext.replace('.', '')}`);
            }
            const filePath = path.isAbsolute(filename) ? filename : path.join(process.cwd(), filename);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const exists = fs.existsSync(filePath);
            fs.writeFileSync(filePath, file.code);
            written.push({
                path: filename,
                type: exists ? 'modified' : 'created',
            });
            this.logSuccess(`Test file: ${filename}`);
        }
        return written;
    }
    /**
     * Parse test output
     */
    parseTestOutput(output, framework) {
        const result = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            duration: 0,
            output,
            failedTests: [],
        };
        // Jest output parsing
        if (framework === 'jest' || framework === 'vitest') {
            const passMatch = output.match(/Tests:\s*(\d+)\s+passed/);
            const failMatch = output.match(/Tests:\s*(\d+)\s+failed/);
            const skipMatch = output.match(/Tests:\s*(\d+)\s+skipped/);
            const totalMatch = output.match(/Tests:\s*(\d+)\s+total/);
            const timeMatch = output.match(/Time:\s*([\d.]+)s/);
            result.passed = passMatch ? parseInt(passMatch[1], 10) : 0;
            result.failed = failMatch ? parseInt(failMatch[1], 10) : 0;
            result.skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0;
            result.total = totalMatch ? parseInt(totalMatch[1], 10) : result.passed + result.failed;
            result.duration = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0;
            // Extract failed test names
            const failBlocks = output.match(/FAIL\s+[^\n]+\n[\s\S]*?(?=\nPASS|\nFAIL|$)/g) || [];
            for (const block of failBlocks) {
                const testName = block.match(/●\s+(.+)/);
                if (testName) {
                    result.failedTests?.push(testName[1]);
                }
            }
        }
        // Mocha output parsing
        if (framework === 'mocha') {
            const passMatch = output.match(/(\d+)\s+passing/);
            const failMatch = output.match(/(\d+)\s+failing/);
            const skipMatch = output.match(/(\d+)\s+pending/);
            const timeMatch = output.match(/(\d+)ms/);
            result.passed = passMatch ? parseInt(passMatch[1], 10) : 0;
            result.failed = failMatch ? parseInt(failMatch[1], 10) : 0;
            result.skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0;
            result.total = result.passed + result.failed + result.skipped;
            result.duration = timeMatch ? parseInt(timeMatch[1], 10) : 0;
        }
        return result;
    }
    /**
     * Parse coverage output
     */
    parseCoverageOutput(output, framework) {
        const result = {
            lines: 0,
            statements: 0,
            functions: 0,
            branches: 0,
            files: [],
        };
        // Jest coverage report parsing
        const coverageMatch = output.match(/All files\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*([\d.]+)/);
        if (coverageMatch) {
            result.lines = parseFloat(coverageMatch[1]);
        }
        // Parse detailed coverage
        const fileLines = output.match(/│\s+[^│]+\s+│\s+[\d.]+\s+│\s+[\d.]+\s+│\s+[\d.]+\s+│\s+[\d.]+\s+│/g) || [];
        for (const line of fileLines.slice(0, 10)) {
            const parts = line.split('│').map(p => p.trim());
            if (parts.length >= 6) {
                const filePath = parts[0].trim();
                if (filePath && filePath !== 'All files') {
                    result.files.push({
                        path: filePath,
                        coverage: parseFloat(parts[5]) || 0,
                        lines: parseFloat(parts[1]) || 0,
                        hits: 0,
                    });
                }
            }
        }
        return result;
    }
}
exports.TestingModule = TestingModule;
//# sourceMappingURL=index.js.map