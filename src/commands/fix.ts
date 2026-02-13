/**
 * VIBE-CLI v0.0.2 - Fix Command
 * Autonomous bug detection, analysis, and fixing
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { SearchPrimitive } from '../domain/primitives/search.js';
import { PlanningPrimitive } from '../domain/primitives/planning.js';
import { MultiEditPrimitive } from '../domain/primitives/multi-edit.js';
import { ExecutionPrimitive } from '../domain/primitives/execution.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('FixCommand');

/**
 * Fix options
 */
export interface FixOptions {
  file?: string;
  error?: string;
  line?: number;
  test?: boolean;
  rollback?: boolean;
  dryRun?: boolean;
}

/**
 * Fix result
 */
export interface FixResult {
  success: boolean;
  file?: string;
  originalCode?: string;
  fixedCode?: string;
  changes?: string[];
  error?: string;
  tested?: boolean;
  testPassed?: boolean;
}

/**
 * Fix bugs in code autonomously
 */
export async function fix(
  args: string[],
  primitives: {
    search: SearchPrimitive;
    planning: PlanningPrimitive;
    multiEdit: MultiEditPrimitive;
    execution: ExecutionPrimitive;
    completion: CompletionPrimitive;
  },
  options: FixOptions = {}
): Promise<{ success: boolean; fixes?: FixResult[]; error?: string }> {
  try {
    // Parse arguments
    const [target, ...rest] = args;

    if (!target && !options.error) {
      showFixHelp();
      return { success: true };
    }

    console.log(chalk.cyan(`\n🔧 Autonomous Bug Fixing\n`));

    const fixes: FixResult[] = [];

    // Case 1: Fix based on error message
    if (options.error || target.startsWith('error:')) {
      const errorMessage = options.error || target.replace(/^error:/, '');
      console.log(chalk.blue(`📛 Error message: ${errorMessage}\n`));

      const fixResult = await fixByError(errorMessage, primitives, options);
      fixes.push(fixResult);
    }
    // Case 2: Fix specific file
    else if (options.file || target.endsWith('.ts') || target.endsWith('.js') || target.endsWith('.tsx') || target.endsWith('.jsx')) {
      const filePath = options.file || target;
      console.log(chalk.blue(`📄 Fixing file: ${filePath}\n`));

      const fixResult = await fixFile(filePath, primitives, options);
      fixes.push(fixResult);
    }
    // Case 3: Search and fix in directory
    else {
      const targetPath = path.resolve(target);
      if (!fs.existsSync(targetPath)) {
        return { success: false, error: `Path not found: ${target}` };
      }

      console.log(chalk.blue(`🔍 Scanning for issues in: ${target}\n`));

      const scanResult = await scanAndFix(targetPath, primitives, options);
      fixes.push(...scanResult);
    }

    // Show summary
    console.log(chalk.cyan('\n📊 Fix Summary:\n'));
    const successful = fixes.filter((f) => f.success).length;
    const failed = fixes.filter((f) => !f.success).length;

    console.log(chalk.green(`✅ Fixed: ${successful} file(s)`));
    if (failed > 0) {
      console.log(chalk.red(`❌ Failed: ${failed} file(s)`));
    }
    console.log();

    for (const fix of fixes) {
      if (fix.success) {
        console.log(chalk.green(`   ✓ ${fix.file}`));
        if (fix.changes && fix.changes.length > 0) {
          fix.changes.forEach((change) => {
            console.log(chalk.gray(`     • ${change}`));
          });
        }
      } else {
        console.log(chalk.red(`   ✗ ${fix.file || 'Unknown'}: ${fix.error}`));
      }
    }

    console.log();

    return { success: true, fixes };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Fix command failed: ${message}`);
    console.log(chalk.red(`\n❌ Fix failed: ${message}\n`));
    return { success: false, error: message };
  }
}

/**
 * Fix based on error message
 */
async function fixByError(
  errorMessage: string,
  primitives: {
    search: SearchPrimitive;
    planning: PlanningPrimitive;
    multiEdit: MultiEditPrimitive;
    execution: ExecutionPrimitive;
    completion: CompletionPrimitive;
  },
  options: FixOptions
): Promise<FixResult> {
  try {
    console.log(chalk.blue('🧠 Analyzing error...\n'));

    // Step 1: Understand the error with AI
    const analysisPrompt = `Analyze this error message and explain:
1. What type of error it is
2. What likely caused it
3. What file/function to look for
4. How to fix it

Error: ${errorMessage}

Respond in JSON format:
{
  "errorType": "type of error",
  "likelyCause": "what caused it",
  "searchPattern": "file pattern or function name to search",
  "fixStrategy": "how to fix",
  "confidence": "high/medium/low"
}`;

    const analysisResult = await primitives.completion.execute({
      prompt: analysisPrompt,
      options: {
        systemPrompt: 'You are an expert debugger. Analyze errors precisely and provide actionable guidance.',
      },
    });

    if (!analysisResult.success) {
      return { success: false, error: analysisResult.error };
    }

    // Parse analysis
    let analysis: any;
    try {
      const jsonMatch = analysisResult.data?.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisResult.data);
    } catch {
      return {
        success: false,
        error: 'Could not analyze error. Please provide more details or the specific file.',
      };
    }

    console.log(chalk.gray(`Error Type: ${analysis.errorType || 'Unknown'}`));
    console.log(chalk.gray(`Likely Cause: ${analysis.likelyCause || 'Unknown'}`));
    console.log(chalk.gray(`Confidence: ${analysis.confidence || 'medium'}`));
    console.log();

    // Step 2: Search for the problematic code
    if (!analysis.searchPattern) {
      return {
        success: false,
        error: 'Could not determine where to look. Please specify the file with --file',
      };
    }

    console.log(chalk.blue(`🔍 Searching for: ${analysis.searchPattern}\n`));

    const searchResult = await primitives.search.execute({
      query: analysis.searchPattern,
    });

    if (!searchResult.success || !searchResult.data || searchResult.data.files.length === 0) {
      return {
        success: false,
        error: `Could not find code matching: ${analysis.searchPattern}`,
      };
    }

    const foundFile = searchResult.data.files[0];
    console.log(chalk.green(`✓ Found in: ${foundFile}\n`));

    // Step 3: Fix the file
    return await fixFile(foundFile, primitives, {
      ...options,
      error: errorMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Fix issues in a specific file
 */
async function fixFile(
  filePath: string,
  primitives: {
    search: SearchPrimitive;
    planning: PlanningPrimitive;
    multiEdit: MultiEditPrimitive;
    execution: ExecutionPrimitive;
    completion: CompletionPrimitive;
  },
  options: FixOptions
): Promise<FixResult> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    // Read the file
    const originalCode = fs.readFileSync(filePath, 'utf-8');

    console.log(chalk.blue(`🔍 Analyzing: ${path.basename(filePath)}\n`));

    // Analyze the code for issues
    const analyzePrompt = `Analyze this code for bugs, issues, and improvements:

File: ${filePath}
${options.error ? `Error context: ${options.error}` : ''}

Code:
\`\`\`
${originalCode}
\`\`\`

Identify:
1. Bugs or logic errors
2. Type errors
3. Missing error handling
4. Edge cases not covered
5. Performance issues
6. Code smells

For each issue found:
- Describe the problem
- Provide the exact fix
- Show the before/after code

Respond in JSON format:
{
  "issues": [
    {
      "type": "bug|error-handling|type|performance|code-smell",
      "description": "what's wrong",
      "line": <line number if applicable>,
      "severity": "critical|high|medium|low",
      "fix": "fixed code snippet",
      "explanation": "why this fixes it"
    }
  ],
  "fixedCode": "complete fixed file content"
}

If no issues found, return: {"issues": [], "fixedCode": "<original code>"}`;

    const analysisResult = await primitives.completion.execute({
      prompt: analyzePrompt,
      options: {
        systemPrompt:
          'You are an expert code reviewer and debugger. Find real issues, provide working fixes.',
      },
    });

    if (!analysisResult.success) {
      return { success: false, error: analysisResult.error };
    }

    // Parse the analysis
    let analysis: any;
    try {
      const jsonMatch = analysisResult.data?.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisResult.data);
    } catch {
      return {
        success: false,
        error: 'Could not analyze file. Make sure it has valid syntax.',
      };
    }

    if (!analysis.issues || analysis.issues.length === 0) {
      console.log(chalk.green('✅ No issues found!\n'));
      return {
        success: true,
        file: filePath,
        originalCode,
        fixedCode: originalCode,
        changes: [],
      };
    }

    // Show issues found
    console.log(chalk.yellow(`Found ${analysis.issues.length} issue(s):\n`));

    const changes: string[] = [];
    for (const issue of analysis.issues) {
      const severityColor =
        issue.severity === 'critical'
          ? chalk.red
          : issue.severity === 'high'
            ? chalk.yellow
            : issue.severity === 'medium'
              ? chalk.blue
              : chalk.gray;

      console.log(severityColor(`  [${issue.severity.toUpperCase()}] ${issue.type}`));
      console.log(chalk.gray(`    ${issue.description}`));
      if (issue.line) {
        console.log(chalk.gray(`    Line ${issue.line}`));
      }
      console.log();
      changes.push(`${issue.type}: ${issue.description}`);
    }

    // Dry run mode
    if (options.dryRun) {
      console.log(chalk.yellow('🔍 Dry run mode - no changes will be made\n'));
      return {
        success: true,
        file: filePath,
        originalCode,
        fixedCode: analysis.fixedCode,
        changes,
      };
    }

    // Create backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, originalCode, 'utf-8');
    console.log(chalk.gray(`✓ Backup created: ${backupPath}\n`));

    // Apply the fix
    console.log(chalk.blue('🔧 Applying fixes...\n'));
    fs.writeFileSync(filePath, analysis.fixedCode, 'utf-8');
    console.log(chalk.green(`✓ Fixed: ${filePath}\n`));

    // Test the fix if requested
    let tested = false;
    let testPassed = false;

    if (options.test !== false) {
      console.log(chalk.blue('🧪 Testing fix...\n'));

      const testResult = await testFix(filePath, primitives);
      tested = true;
      testPassed = testResult.success;

      if (testPassed) {
        console.log(chalk.green('✓ Tests passed!\n'));
      } else {
        console.log(chalk.yellow(`⚠️  Tests failed: ${testResult.error}\n`));

        // Rollback if tests failed
        if (options.rollback !== false) {
          console.log(chalk.yellow('↩️  Rolling back...\n'));
          fs.writeFileSync(filePath, originalCode, 'utf-8');
          fs.unlinkSync(backupPath);
          console.log(chalk.yellow('✓ Rolled back to original\n'));

          return {
            success: false,
            file: filePath,
            originalCode,
            fixedCode: analysis.fixedCode,
            changes,
            error: 'Tests failed, changes rolled back',
            tested,
            testPassed,
          };
        }
      }
    }

    // Clean up backup on success
    if (tested && testPassed && fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    return {
      success: true,
      file: filePath,
      originalCode,
      fixedCode: analysis.fixedCode,
      changes,
      tested,
      testPassed,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Scan directory for issues and fix them
 */
async function scanAndFix(
  dirPath: string,
  primitives: {
    search: SearchPrimitive;
    planning: PlanningPrimitive;
    multiEdit: MultiEditPrimitive;
    execution: ExecutionPrimitive;
    completion: CompletionPrimitive;
  },
  options: FixOptions
): Promise<FixResult[]> {
  const fixes: FixResult[] = [];

  // Find all source files
  const files = findSourceFiles(dirPath);

  console.log(chalk.blue(`📁 Found ${files.length} file(s) to scan\n`));

  for (const file of files) {
    // Skip test files
    if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
      continue;
    }

    const result = await fixFile(file, primitives, { ...options, test: false });
    fixes.push(result);
  }

  return fixes;
}

/**
 * Test a fix by running relevant tests
 */
async function testFix(
  filePath: string,
  primitives: { execution: ExecutionPrimitive }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Determine test file
    const testFile = filePath.replace('.ts', '.test.ts').replace('.js', '.test.js');
    const testDir = path.dirname(filePath);
    const testName = path.basename(testFile);

    // Check if test file exists
    const testPath = path.join(testDir, testName);
    if (fs.existsSync(testPath)) {
      // Run specific test file
      const result = await primitives.execution.execute({
        command: `npm test -- ${testPath} 2>&1 | head -50`,
        cwd: process.cwd(),
      });

      return {
        success: result.success,
        error: result.error,
      };
    }

    // Try TypeScript compilation check
    const ext = path.extname(filePath);
    if (ext === '.ts' || ext === '.tsx') {
      const result = await primitives.execution.execute({
        command: `npx tsc --noEmit ${filePath} 2>&1`,
        cwd: process.cwd(),
      });

      // TypeScript returns error if there are issues
      return {
        success: !result.data?.includes('error'),
        error: result.data?.includes('error') ? result.data : undefined,
      };
    }

    // No test available
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Find all source files in a directory
 */
function findSourceFiles(dirPath: string): string[] {
  const files: string[] = [];

  const walk = (currentPath: string) => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist, build
        if (['node_modules', '.git', 'dist', 'build', 'coverage', '__tests__'].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          // Skip test files
          if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            files.push(fullPath);
          }
        }
      }
    }
  };

  walk(dirPath);
  return files;
}

/**
 * Show fix command help
 */
export function showFixHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Fix - Autonomous Bug Detection & Fixing                ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe fix <target> [options]                                ║
║    vibe fix error:"<error message>" [options]                 ║
║                                                               ║
║  ${chalk.bold('Arguments')}                                                   ║
║    <target>               File or directory to fix             ║
║    error:"<message>"      Fix based on error message          ║
║                                                               ║
║  ${chalk.bold('Options')}                                                    ║
║    --file <path>          Specify file to fix                 ║
║    --error <message>      Error message to analyze            ║
║    --line <number>        Line number (for context)           ║
║    --no-test              Skip testing after fix              ║
║    --no-rollback          Don't rollback on test failure      ║
║    --dry-run              Show what would be fixed            ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    # Fix a specific file                                      ║
║    vibe fix src/utils/helpers.ts                             ║
║                                                               ║
║    # Fix based on error message                               ║
║    vibe fix error:"TypeError: Cannot read property 'x' of    ║
║    undefined"                                                 ║
║                                                               ║
║    # Fix all files in directory                               ║
║    vibe fix src/utils                                         ║
║                                                               ║
║    # Dry run (see what would be fixed)                        ║
║    vibe fix src/components --dry-run                          ║
║                                                               ║
║  ${chalk.bold('What It Detects')}                                            ║
║    • Bugs and logic errors                                     ║
║    • Type errors                                              ║
║    • Missing error handling                                   ║
║    • Edge cases not covered                                   ║
║    • Performance issues                                       ║
║    • Code smells and anti-patterns                            ║
║                                                               ║
║  ${chalk.bold('How It Works')}                                                ║
║    1. Analyzes code/error with AI                              ║
║    2. Identifies issues with severity ratings                 ║
║    3. Generates fixes with explanations                        ║
║    4. Creates backup                                          ║
║    5. Applies fixes                                            ║
║    6. Tests the fix                                            ║
║    7. Rolls back if tests fail                                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}

/**
 * Show common error patterns and how to fix them
 */
export function showCommonErrors(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  Common Error Patterns                                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.yellow('TypeError: Cannot read property')}                               ║
║    Missing null check or accessing undefined property       ║
║    Fix: Add optional chaining or null checks                ║
║    Example: vibe fix error:"TypeError: Cannot read"         ║
║                                                               ║
║  ${chalk.yellow('ReferenceError: X is not defined')}                             ║
║    Using variable before declaration                         ║
║    Fix: Check variable scope and imports                     ║
║                                                               ║
║  ${chalk.yellow('SyntaxError: Unexpected token')}                                  ║
║    Invalid syntax, missing brackets/semicolons               ║
║    Fix: Correct syntax errors                                ║
║                                                               ║
║  ${chalk.yellow('Promise rejection handled')}                                   ║
║    Missing .catch() or await in async function               ║
║    Fix: Add error handling                                   ║
║                                                               ║
║  ${chalk.yellow('Type X is not assignable to type Y')}                          ║
║    TypeScript type mismatch                                  ║
║    Fix: Correct types or add type assertions                 ║
║                                                               ║
║  ${chalk.yellow('Cannot find module')}                                         ║
║    Missing import or dependency                              ║
║    Fix: Install package or fix import path                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}
