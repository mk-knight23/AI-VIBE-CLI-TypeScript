/**
 * VIBE-CLI v0.0.2 - Test Command
 * Generate comprehensive unit tests for code files
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { SearchPrimitive } from '../domain/primitives/search.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { MultiEditPrimitive } from '../domain/primitives/multi-edit.js';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('TestCommand');

/**
 * Supported test frameworks
 */
export const TEST_FRAMEWORKS = {
  vitest: {
    name: 'Vitest',
    description: 'Modern, fast test framework',
    import: "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';",
    mockSyntax: 'vi.fn()',
    runCommand: 'vitest',
  },
  jest: {
    name: 'Jest',
    description: 'Popular testing framework',
    import: "import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';",
    mockSyntax: 'jest.fn()',
    runCommand: 'jest',
  },
};

/**
 * Language-specific test patterns
 */
const LANGUAGE_PATTERNS = {
  typescript: {
    extensions: ['.ts', '.tsx'],
    testExtensions: ['.test.ts', '.spec.ts', '.test.tsx', '.spec.tsx'],
    comment: '//',
  },
  javascript: {
    extensions: ['.js', '.jsx'],
    testExtensions: ['.test.js', '.spec.js', '.test.jsx', '.spec.jsx'],
    comment: '//',
  },
  python: {
    extensions: ['.py'],
    testExtensions: ['_test.py', '_spec.py'],
    comment: '#',
  },
  go: {
    extensions: ['.go'],
    testExtensions: ['_test.go'],
    comment: '//',
  },
};

/**
 * Generate tests for a file or directory
 */
export async function generateTests(
  args: string[],
  primitives: {
    search: SearchPrimitive;
    completion: CompletionPrimitive;
    multiEdit: MultiEditPrimitive;
  },
  options: {
    framework?: 'vitest' | 'jest';
    coverage?: boolean;
    update?: boolean;
  } = {}
): Promise<{ success: boolean; error?: string; filesCreated?: string[] }> {
  try {
    // Parse arguments
    const [target, ...rest] = args;
    const framework = options.framework || 'vitest';

    if (!target) {
      showTestHelp();
      return { success: true };
    }

    console.log(chalk.cyan(`\n🧪 Generating tests with ${TEST_FRAMEWORKS[framework].name}...\n`));

    // Resolve target path
    const targetPath = path.resolve(target);

    if (!fs.existsSync(targetPath)) {
      console.log(chalk.red(`❌ Path not found: ${target}\n`));
      return { success: false, error: `Path not found: ${target}` };
    }

    const filesCreated: string[] = [];

    // Check if it's a file or directory
    if (fs.statSync(targetPath).isFile()) {
      // Generate tests for single file
      const result = await generateTestsForFile(targetPath, framework, primitives);
      if (result.success && result.testFile) {
        filesCreated.push(result.testFile);
      }
    } else {
      // Find all testable files in directory
      const files = await findTestableFiles(targetPath);
      console.log(chalk.blue(`📁 Found ${files.length} testable files\n`));

      for (const file of files) {
        const result = await generateTestsForFile(file, framework, primitives, options.update);
        if (result.success && result.testFile) {
          filesCreated.push(result.testFile);
        }
      }
    }

    // Show summary
    console.log(chalk.cyan('\n📊 Summary:\n'));
    console.log(chalk.green(`✅ ${filesCreated.length} test file(s) created\n`));

    for (const file of filesCreated) {
      console.log(chalk.gray(`   ${file}`));
    }

    console.log(chalk.cyan('\n💡 Next steps:\n'));
    console.log(chalk.white(`   ${TEST_FRAMEWORKS[framework].runCommand}`));
    console.log();

    return { success: true, filesCreated };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Test generation failed: ${message}`);
    console.log(chalk.red(`\n❌ Test generation failed: ${message}\n`));
    return { success: false, error: message };
  }
}

/**
 * Generate tests for a single file
 */
async function generateTestsForFile(
  filePath: string,
  framework: 'vitest' | 'jest',
  primitives: {
    search: SearchPrimitive;
    completion: CompletionPrimitive;
    multiEdit: MultiEditPrimitive;
  },
  update = false
): Promise<{ success: boolean; testFile?: string; error?: string }> {
  try {
    // Read the source file
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const fileName = path.basename(filePath, ext);

    // Detect language
    const language = detectLanguage(filePath);
    if (!language) {
      return { success: false, error: `Unsupported file type: ${ext}` };
    }

    console.log(chalk.blue(`📄 Analyzing: ${path.basename(filePath)}`));

    // Generate test content using AI
    const testPrompt = buildTestGenerationPrompt(sourceCode, fileName, framework, language);

    const completionResult = await primitives.completion.execute({
      prompt: testPrompt,
      options: {
        systemPrompt: `You are an expert test writer. Generate comprehensive, well-structured unit tests.
Follow these best practices:
- Test all public functions and methods
- Include edge cases and error conditions
- Use descriptive test names
- Group related tests with describe blocks
- Mock external dependencies
- Test both success and failure cases
- Follow AAA pattern (Arrange, Act, Assert)
- Add comments explaining complex tests

Return ONLY the test code, no explanations.`,
      },
    });

    if (!completionResult.success) {
      return { success: false, error: completionResult.error };
    }

    let testContent = completionResult.data;

    // Clean up the AI response (remove markdown code blocks if present)
    testContent = testContent
      .replace(/^```typescript\n?/gm, '')
      .replace(/^```javascript\n?/gm, '')
      .replace(/^```\n?$/gm, '')
      .trim();

    // Add framework-specific imports at the top
    if (!testContent.includes("from 'vitest'") && !testContent.includes("from '@jest/globals'")) {
      testContent = `${TEST_FRAMEWORKS[framework].import}\n\n${testContent}`;
    }

    // Determine test file path
    const testFilePath = getTestFilePath(filePath, language);

    // Check if test file already exists
    if (fs.existsSync(testFilePath) && !update) {
      console.log(chalk.yellow(`⚠️  Test file already exists: ${testFilePath}`));
      console.log(chalk.gray(`   Use --update to overwrite\n`));
      return { success: true, testFile: testFilePath };
    }

    // Create directory if needed
    const testDir = path.dirname(testFilePath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Write test file
    fs.writeFileSync(testFilePath, testContent, 'utf-8');
    console.log(chalk.green(`✓ Created: ${testFilePath}`));

    return { success: true, testFile: testFilePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to generate tests for ${filePath}: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Build prompt for test generation
 */
function buildTestGenerationPrompt(
  sourceCode: string,
  fileName: string,
  framework: string,
  language: string
): string {
  return `Generate comprehensive unit tests for this ${language} file.

File name: ${fileName}
Test framework: ${framework}

Source code:
\`\`\`
${sourceCode}
\`\`\`

Requirements:
1. Test ALL exported functions, classes, and methods
2. Include edge cases (null, undefined, empty values, boundaries)
3. Test error handling and failure paths
4. Use mocks/stubs for external dependencies
5. Group related tests with describe()
6. Use descriptive test names (should do X when Y)
7. Follow AAA pattern (Arrange, Act, Assert)
8. Add comments for complex test logic
9. Use ${framework === 'vitest' ? 'vi' : 'jest'} for mocking

Generate the complete test file content only.`;
}

/**
 * Find all testable files in a directory
 */
async function findTestableFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  const walk = (currentPath: string) => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist, build
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const isTestFile = entry.name.includes('.test.') || entry.name.includes('.spec.') ||
          entry.name.includes('_test.') || entry.name.includes('_spec.');

        // Include source files but not existing test files
        if ((ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') && !isTestFile) {
          files.push(fullPath);
        }
      }
    }
  };

  walk(dirPath);
  return files;
}

/**
 * Detect language from file extension
 */
function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath);

  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (patterns.extensions.includes(ext)) {
      return lang;
    }
  }

  return null;
}

/**
 * Get the test file path for a source file
 */
function getTestFilePath(sourcePath: string, language: string): string {
  const dir = path.dirname(sourcePath);
  const ext = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, ext);
  const patterns = LANGUAGE_PATTERNS[language as keyof typeof LANGUAGE_PATTERNS];

  // Try different test file patterns
  const testPatterns = [
    // Next to source file
    path.join(dir, `${baseName}.test.ts`),
    path.join(dir, `${baseName}.spec.ts`),
    // In tests directory (mirrored structure)
    path.join(process.cwd(), 'tests', dir.replace(process.cwd(), '').slice(1), `${baseName}.test.ts`),
    path.join(process.cwd(), 'tests', dir.replace(process.cwd(), '').slice(1), `${baseName}.spec.ts`),
    // In __tests__ directory
    path.join(dir, '__tests__', `${baseName}.test.ts`),
  ];

  // Return the first valid pattern or default to next to source
  return testPatterns[0];
}

/**
 * Show test command help
 */
export function showTestHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Test Generator - Create comprehensive unit tests        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe test <file-or-directory> [options]                    ║
║                                                               ║
║  ${chalk.bold('Arguments')}                                                   ║
║    <file-or-directory>    Path to file or directory to test   ║
║                                                               ║
║  ${chalk.bold('Options')}                                                    ║
║    --framework <name>     Test framework (vitest, jest)       ║
║    --coverage             Include coverage metrics            ║
║    --update               Overwrite existing test files       ║
║                                                               ║
║  ${chalk.bold('Supported Frameworks')}                                        ║
║    vitest                Modern, fast test framework         ║
║    jest                  Popular testing framework            ║
║                                                               ║
║  ${chalk.bold('Supported Languages')}                                        ║
║    TypeScript (.ts, .tsx)                                     ║
║    JavaScript (.js, .jsx)                                     ║
║    Python (.py)                                               ║
║    Go (.go)                                                   ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe test src/utils/helpers.ts                             ║
║    vibe test src/components                                   ║
║    vibe test src --framework jest                             ║
║    vibe test src/utils --update                               ║
║                                                               ║
║  ${chalk.bold('How It Works')}                                                ║
║    1. Analyzes your source code                                ║
║    2. Identifies functions, classes, methods                  ║
║    3. Generates comprehensive tests using AI                  ║
║    4. Creates test files with proper structure                ║
║    5. Tests all paths including edge cases                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}

/**
 * Analyze code and show what would be tested
 */
export async function analyzeForTests(
  filePath: string,
  primitives: { search: SearchPrimitive }
): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const sourceCode = fs.readFileSync(filePath, 'utf-8');

    console.log(chalk.cyan(`\n🔍 Test Analysis for: ${path.basename(filePath)}\n`));

    // Simple analysis (can be enhanced with AI)
    const functions = sourceCode.match(/export\s+(function|const|class)\s+(\w+)/g) || [];
    const arrowFunctions = sourceCode.match(/export\s+const\s+(\w+)\s*=\s*\(/g) || [];

    console.log(chalk.white('Functions to test:'));
    console.log(chalk.gray('─'.repeat(60)));

    const allExports = [...functions, ...arrowFunctions];
    if (allExports.length === 0) {
      console.log(chalk.yellow('  No exported functions found'));
    } else {
      allExports.forEach((match) => {
        console.log(chalk.green(`  ✓ ${match}`));
      });
    }

    console.log(chalk.gray('─'.repeat(60)));

    // Estimate test coverage
    const estimatedTests = allExports.length * 4; // 4 tests per function avg
    console.log(chalk.cyan(`\n📊 Estimated: ${estimatedTests} test cases needed\n`));

    return {
      success: true,
      analysis: {
        functions: allExports,
        estimatedTests,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
