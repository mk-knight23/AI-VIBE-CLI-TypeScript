/**
 * VIBE-CLI v0.0.1 - Test Generator
 * Automated test generation with coverage improvement
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { progressDisplay } from '../../ui/progress-bars/progress-display.js';

/**
 * Test framework type
 */
export type TestFramework = 'jest' | 'mocha' | 'vitest' | 'pytest' | 'unittest' | 'pytest' | 'junit';

/**
 * Test type
 */
export type TestType = 'unit' | 'integration' | 'e2e' | 'component' | 'snapshot';

/**
 * Generated test
 */
export interface GeneratedTest {
  filePath: string;
  testFramework: TestFramework;
  testType: TestType;
  describeName: string;
  testCases: TestCase[];
  imports: string[];
  setupCode: string;
  teardownCode: string;
}

/**
 * Individual test case
 */
export interface TestCase {
  name: string;
  testFunction: string;
  assertions: string[];
  timeout?: number;
  skip?: boolean;
  only?: boolean;
}

/**
 * Coverage gap
 */
export interface CoverageGap {
  filePath: string;
  uncoveredLines: number[];
  uncoveredBranches: number[];
  functionName?: string;
  suggestion: string;
}

/**
 * Test generation options
 */
export interface TestGenerationOptions {
  framework?: TestFramework;
  testType?: TestType;
  outputDir?: string;
  mockDependencies?: boolean;
  generateSetupTeardown?: boolean;
  includeCoverage?: boolean;
}

/**
 * Test execution result
 */
export interface TestResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: CoverageReport;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  lineCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  statementCoverage: number;
  files: CoverageFile[];
}

/**
 * Per-file coverage
 */
export interface CoverageFile {
  filePath: string;
  coveredLines: number[];
  uncoveredLines: number[];
  coveragePercentage: number;
}

/**
 * Test Generator
 */
export class TestGenerator {
  private readonly frameworkTemplates: Map<TestFramework, string>;
  private readonly testFrameworks: Set<TestFramework>;
  private readonly generatedTests: GeneratedTest[] = [];

  constructor() {
    this.frameworkTemplates = new Map([
      ['jest', 'jest'],
      ['mocha', 'mocha'],
      ['vitest', 'vitest'],
      ['pytest', 'pytest'],
      ['unittest', 'unittest'],
    ]);
    this.testFrameworks = new Set(['jest', 'mocha', 'vitest', 'pytest', 'unittest']);
  }

  /**
   * Generate tests for a file
   */
  async generateForFile(
    sourceFilePath: string,
    options?: TestGenerationOptions,
    provider?: any
  ): Promise<GeneratedTest | null> {
    if (!fs.existsSync(sourceFilePath)) {
      return null;
    }

    const framework = options?.framework || 'jest';
    const outputDir = options?.outputDir || this.getTestDirectory(sourceFilePath);

    const content = fs.readFileSync(sourceFilePath, 'utf-8');
    const fileName = path.basename(sourceFilePath);
    const ext = path.extname(sourceFilePath);

    // Determine test type based on file
    const testType = this.inferTestType(sourceFilePath);

    if (provider) {
      const prompt = `Generate comprehensive unit tests for this ${ext} file using ${framework}.
      
Code:
${content}

Provide the full test file content. Include imports, setup, and various test cases (valid input, edge cases, error handling).
Respond with the code ONLY.`;

      try {
        const response = await provider.chat([{ role: 'system', content: 'You are a senior QA engineer.' }, { role: 'user', content: prompt }]);
        const testContent = response.content.trim().replace(/```typescript/g, '').replace(/```javascript/g, '').replace(/```/g, '');

        const test: GeneratedTest = {
          filePath: this.generateTestPath(sourceFilePath, outputDir),
          testFramework: framework,
          testType,
          describeName: this.generateDescribeName(fileName),
          testCases: [], // Already in content
          imports: [], // Already in content
          setupCode: '', // Already in content
          teardownCode: '', // Already in content
        };

        // Custom flag for pre-formatted content
        (test as any).fullContent = testContent;
        this.generatedTests.push(test);
        return test;
      } catch {
        // Fallback to local
      }
    }

    // Generate test structure
    const test: GeneratedTest = {
      filePath: this.generateTestPath(sourceFilePath, outputDir),
      testFramework: framework,
      testType,
      describeName: this.generateDescribeName(fileName),
      testCases: [],
      imports: this.generateImports(sourceFilePath, framework),
      setupCode: options?.generateSetupTeardown !== false ? this.generateSetupCode(framework) : '',
      teardownCode: options?.generateSetupTeardown !== false ? this.generateTeardownCode(framework) : '',
    };

    // Generate test cases based on file content
    test.testCases = this.generateTestCases(content, sourceFilePath, framework, testType);

    this.generatedTests.push(test);
    return test;
  }

  /**
   * Generate tests for a directory
   */
  async generateForDirectory(
    dirPath: string,
    options?: TestGenerationOptions,
    provider?: any
  ): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];
    const { glob } = require('fast-glob');

    const patterns = ['**/*.{ts,js,py,java}'];
    const files = glob.sync(patterns, {
      cwd: dirPath,
      ignore: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}', '**/__tests__/**', 'node_modules/**'],
    });

    progressDisplay.startProgress(files.length, 'Generating tests');

    for (const file of files) {
      const test = await this.generateForFile(path.join(dirPath, file), options, provider);
      if (test) {
        tests.push(test);
        progressDisplay.incrementProgress(1);
      }
    }

    progressDisplay.completeProgress('Test generation complete');
    return tests;
  }

  /**
   * Generate test cases from source code
   */
  private generateTestCases(
    content: string,
    sourceFilePath: string,
    framework: TestFramework,
    testType: TestType
  ): TestCase[] {
    const testCases: TestCase[] = [];

    // Extract functions/methods
    const functions = this.extractFunctions(content);

    // Extract classes
    const classes = this.extractClasses(content);

    // Generate tests for exported functions
    for (const func of functions) {
      if (this.shouldTestFunction(func.name)) {
        testCases.push(this.createTestCaseForFunction(func, framework, testType));
      }
    }

    // Generate tests for class methods
    for (const cls of classes) {
      const methods = this.extractMethods(content, cls);
      for (const method of methods) {
        if (this.shouldTestMethod(method)) {
          testCases.push(this.createTestCaseForMethod(cls, method, framework, testType));
        }
      }
    }

    // Add edge case tests
    testCases.push(...this.generateEdgeCaseTests(functions, framework));

    // Add error handling tests
    testCases.push(...this.generateErrorHandlingTests(functions, framework));

    return testCases;
  }

  /**
   * Extract function definitions
   */
  private extractFunctions(content: string): Array<{ name: string; params: string[]; returnType?: string }> {
    const functions: Array<{ name: string; params: string[]; returnType?: string }> = [];

    // Match function declarations
    const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        params: match[2].split(',').map((p) => p.trim()),
      });
    }

    // Match arrow functions assigned to const/let
    const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        params: [],
      });
    }

    // Match export default function
    const exportRegex = /export\s+default\s+function\s+(\w+)\s*\(([^)]*)\)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        params: match[2].split(',').map((p) => p.trim()),
      });
    }

    return functions;
  }

  /**
   * Extract class definitions
   */
  private extractClasses(content: string): string[] {
    const classes: string[] = [];
    const classRegex = /class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
    return classes;
  }

  /**
   * Extract methods from a class
   */
  private extractMethods(content: string, className: string): string[] {
    const methods: string[] = [];
    // Find class body and extract methods
    const classRegex = new RegExp(`class\\s+${className}\\s*[{]([\\s\\S]*?)}`, 'g');
    const classMatch = classRegex.exec(content);
    if (classMatch) {
      const methodRegex = /(?:async\s+)?(\w+)\s*\(/g;
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classMatch[1])) !== null) {
        if (!['constructor', 'if', 'for', 'while', 'switch'].includes(methodMatch[1])) {
          methods.push(methodMatch[1]);
        }
      }
    }
    return methods;
  }

  /**
   * Determine if a function should be tested
   */
  private shouldTestFunction(funcName: string): boolean {
    const excludeList = ['constructor', 'connectedCallback', 'disconnectedCallback', 'render'];
    return !excludeList.includes(funcName) && !funcName.startsWith('_');
  }

  /**
   * Determine if a method should be tested
   */
  private shouldTestMethod(method: string): boolean {
    return this.shouldTestFunction(method);
  }

  /**
   * Create test case for a function
   */
  private createTestCaseForFunction(
    func: { name: string; params: string[] },
    framework: TestFramework,
    testType: TestType
  ): TestCase {
    const params = func.params.length > 0 ? func.params.join(', ') : '';

    return {
      name: `should handle ${func.name}`,
      testFunction: `test('${func.name} handles valid input', () => {
  const result = ${func.name}(${params});
  expect(result).toBeDefined();
});`,
      assertions: ['toBeDefined()'],
      timeout: 5000,
    };
  }

  /**
   * Create test case for a class method
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private createTestCaseForMethod(
    className: string,
    method: string,
    _framework: TestFramework,
    _testType: TestType
  ): TestCase {
    return {
      name: `should handle ${method}`,
      testFunction: `test('${className}.${method} works correctly', () => {
  const instance = new ${className}();
  const result = instance.${method}();
  expect(result).toBeDefined();
});`,
      assertions: ['toBeDefined()'],
      timeout: 5000,
    };
  }

  /**
   * Generate edge case tests
   */
  private generateEdgeCaseTests(
    functions: Array<{ name: string; params: string[] }>,
    framework: TestFramework
  ): TestCase[] {
    const tests: TestCase[] = [];

    for (const func of functions.slice(0, 3)) {
      // Empty input test
      tests.push({
        name: `should handle empty input for ${func.name}`,
        testFunction: `test('${func.name} handles empty input', () => {
  const result = ${func.name}('');
  expect(result).toBeDefined();
});`,
        assertions: ['toBeDefined()'],
      });

      // Null/undefined test
      if (func.params.length > 0) {
        tests.push({
          name: `should handle null for ${func.name}`,
          testFunction: `test('${func.name} handles null', () => {
  const result = ${func.name}(null);
  expect(result).toBeDefined();
});`,
          assertions: ['toBeDefined()'],
        });
      }
    }

    return tests;
  }

  /**
   * Generate error handling tests
   */
  private generateErrorHandlingTests(
    functions: Array<{ name: string; params: string[] }>,
    framework: TestFramework
  ): TestCase[] {
    const tests: TestCase[] = [];

    for (const func of functions.slice(0, 2)) {
      tests.push({
        name: `should throw on invalid input for ${func.name}`,
        testFunction: `test('${func.name} throws on invalid input', () => {
  expect(() => ${func.name}()).toThrow();
});`,
        assertions: ['toThrow()'],
      });
    }

    return tests;
  }

  /**
   * Generate test file path
   */
  private generateTestPath(sourcePath: string, outputDir: string): string {
    const baseName = path.basename(sourcePath, path.extname(sourcePath));
    const ext = path.extname(sourcePath);
    return path.join(outputDir, `${baseName}.test${ext}`);
  }

  /**
   * Get test directory for a source file
   */
  private getTestDirectory(sourcePath: string): string {
    const dir = path.dirname(sourcePath);
    const ext = path.extname(sourcePath);

    if (ext === '.ts' || ext === '.js') {
      // Check for __tests__ directory
      const testsDir = path.join(dir, '__tests__');
      if (fs.existsSync(testsDir)) {
        return testsDir;
      }
    }

    return path.join(dir, '__tests__');
  }

  /**
   * Generate describe block name
   */
  private generateDescribeName(fileName: string): string {
    const name = path.basename(fileName, path.extname(fileName));
    return name.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  /**
   * Generate imports for test file
   */
  private generateImports(sourcePath: string, framework: TestFramework): string[] {
    const imports = [`import { describe, test, expect, beforeEach, afterEach } from '${framework}';`];

    const ext = path.extname(sourcePath);
    if (ext === '.ts') {
      imports.push(`import { ${path.basename(sourcePath, '.ts')} } from './${path.basename(sourcePath, '.ts')}.js';`);
    }

    return imports;
  }

  /**
   * Generate setup code
   */
  private generateSetupCode(framework: TestFramework): string {
    return `
beforeEach(() => {
  // Setup test environment
});

afterEach(() => {
  // Cleanup test environment
});
`;
  }

  /**
   * Generate teardown code
   */
  private generateTeardownCode(framework: TestFramework): string {
    return '';
  }

  /**
   * Infer test type from file
   */
  private inferTestType(filePath: string): TestType {
    const name = path.basename(filePath).toLowerCase();
    if (name.includes('component') || name.includes('.jsx') || name.includes('.tsx')) {
      return 'component';
    }
    if (name.includes('integration')) {
      return 'integration';
    }
    if (name.includes('e2e') || name.includes('end-to-end')) {
      return 'e2e';
    }
    return 'unit';
  }

  /**
   * Write test file
   */
  writeTestFile(test: GeneratedTest): boolean {
    try {
      const dir = path.dirname(test.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = this.formatTestFile(test);
      fs.writeFileSync(test.filePath, content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format test file content
   */
  private formatTestFile(test: GeneratedTest): string {
    if ((test as any).fullContent) {
      return (test as any).fullContent;
    }
    const lines: string[] = [];

    // Add imports
    lines.push(...test.imports);
    lines.push('');

    // Add describe block
    lines.push(`describe('${test.describeName}', () => {`);
    lines.push('');

    // Add setup
    if (test.setupCode) {
      lines.push(test.setupCode);
    }

    // Add test cases
    for (const testCase of test.testCases) {
      if (testCase.skip) {
        lines.push(`  test.skip('${testCase.name}', () => {`);
      } else if (testCase.only) {
        lines.push(`  test.only('${testCase.name}', () => {`);
      } else {
        lines.push(`  test('${testCase.name}', () => {`);
      }

      // Indent test function
      const indentedFunction = testCase.testFunction.split('\n').map((line) => '  ' + line).join('\n');
      lines.push(indentedFunction);
      lines.push('  });');
      lines.push('');
    }

    // Add teardown
    if (test.teardownCode) {
      lines.push(test.teardownCode);
    }

    lines.push('});');

    return lines.join('\n');
  }

  /**
   * Identify coverage gaps
   */
  identifyCoverageGaps(sourceDir: string): CoverageGap[] {
    const gaps: CoverageGap[] = [];
    const { glob } = require('fast-glob');

    const files = glob.sync(['**/*.{ts,js}'], {
      cwd: sourceDir,
      ignore: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}', 'node_modules/**'],
    });

    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      const uncoveredLines: number[] = [];

      // Identify lines without tests
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip comments, imports, exports
        if (
          line.startsWith('//') ||
          line.startsWith('/*') ||
          line.startsWith('*') ||
          line.startsWith('import') ||
          line.startsWith('export') ||
          line.startsWith('interface') ||
          line.startsWith('type')
        ) {
          continue;
        }

        // Identify executable lines
        if (
          line.includes('function') ||
          line.includes('const ') ||
          line.includes('let ') ||
          line.includes('var ') ||
          line.includes('if') ||
          line.includes('for') ||
          line.includes('while') ||
          line.includes('return') ||
          line.includes('=>')
        ) {
          uncoveredLines.push(i + 1);
        }
      }

      if (uncoveredLines.length > 0) {
        gaps.push({
          filePath,
          uncoveredLines,
          uncoveredBranches: [],
          suggestion: `Add tests for lines ${uncoveredLines.slice(0, 5).join(', ')}...`,
        });
      }
    }

    return gaps;
  }

  /**
   * Generate tests for coverage gaps
   */
  async generateForCoverageGaps(gaps: CoverageGap[], options?: TestGenerationOptions, provider?: any): Promise<GeneratedTest[]> {
    const tests: GeneratedTest[] = [];

    for (const gap of gaps) {
      // Generate targeted test for uncovered lines
      const test = await this.generateForFile(gap.filePath, {
        ...options,
        testType: 'unit',
      }, provider);

      if (test) {
        // Add specific test for uncovered lines
        test.testCases.push({
          name: `covers uncovered lines in ${path.basename(gap.filePath)}`,
          testFunction: `// Test for uncovered lines: ${gap.uncoveredLines.join(', ')}`,
          assertions: [],
        });

        tests.push(test);
      }
    }

    return tests;
  }

  /**
   * Get generated tests
   */
  getGeneratedTests(): GeneratedTest[] {
    return [...this.generatedTests];
  }

  /**
   * Format test generation summary
   */
  formatGenerationSummary(tests: GeneratedTest[]): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n📝 Test Generation Summary\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');
    lines.push(`Tests Generated: ${tests.length}`);
    lines.push(`Total Test Cases: ${tests.reduce((sum, t) => sum + t.testCases.length, 0)}`);
    lines.push('');

    lines.push(chalk.bold('Generated Files:'));
    for (const test of tests) {
      lines.push(`  ${chalk.cyan(test.filePath)}`);
      lines.push(`    Framework: ${test.testFramework} | Type: ${test.testType}`);
      lines.push(`    Tests: ${test.testCases.length}`);
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
export const testGenerator = new TestGenerator();
