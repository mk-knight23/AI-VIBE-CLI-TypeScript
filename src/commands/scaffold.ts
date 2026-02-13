/**
 * VIBE-CLI v0.0.2 - Scaffold Command
 * Generate projects and components using AI-powered scaffolding
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { PlanningPrimitive } from '../domain/primitives/planning.js';
import { CompletionPrimitive } from '../domain/primitives/completion.js';
import { MultiEditPrimitive } from '../domain/primitives/multi-edit.js';
import { ExecutionPrimitive } from '../domain/primitives/execution.js';
import { SearchPrimitive } from '../domain/primitives/search.js';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('ScaffoldCommand');

/**
 * Template definitions for quick scaffolding
 */
export const TEMPLATES = {
  // Full project templates
  'nextjs': {
    name: 'Next.js App',
    description: 'Modern Next.js 14 app with App Router, TypeScript, and Tailwind',
    type: 'project',
    files: [
      'package.json',
      'tsconfig.json',
      'tailwind.config.ts',
      'postcss.config.js',
      'next.config.js',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/globals.css',
      '.gitignore',
      'README.md',
    ],
    dependencies: ['next', 'react', 'react-dom', 'typescript', 'tailwindcss', 'autoprefixer', 'postcss'],
    devCommands: ['npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"'],
  },
  'react': {
    name: 'React + Vite',
    description: 'React app with Vite, TypeScript, and modern tooling',
    type: 'project',
    files: [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'src/App.tsx',
      'src/main.tsx',
      'src/index.css',
      '.gitignore',
    ],
    dependencies: ['react', 'react-dom'],
    devDependencies: ['@types/react', '@types/react-dom', '@vitejs/plugin-react', 'typescript', 'vite'],
    devCommands: ['npm create vite@latest . -- --template react-ts'],
  },
  'express': {
    name: 'Express API',
    description: 'RESTful API with Express, TypeScript, and structured folders',
    type: 'project',
    files: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/routes/index.ts',
      'src/routes/health.ts',
      'src/middleware/error.ts',
      '.gitignore',
    ],
    dependencies: ['express', 'cors', 'dotenv', 'helmet'],
    devDependencies: ['@types/express', '@types/cors', 'typescript', 'ts-node', 'nodemon'],
    devCommands: [],
  },
  'vitest': {
    name: 'Vitest Test Project',
    description: 'Testing setup with Vitest and coverage',
    type: 'project',
    files: [
      'package.json',
      'vitest.config.ts',
      'tests/example.test.ts',
      'src/math.ts',
    ],
    dependencies: [],
    devDependencies: ['vitest', '@vitest/coverage-v8'],
    devCommands: [],
  },

  // Component templates
  'react-component': {
    name: 'React Component',
    description: 'TypeScript React component with props and exports',
    type: 'component',
    extension: 'tsx',
    template: `import React from 'react';

interface {{ComponentName}}Props {
  // Define your props here
  title?: string;
  children?: React.ReactNode;
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({
  title,
  children,
}) => {
  return (
    <div className="{{component-name}}">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
};

export default {{ComponentName}};
`,
  },
  'nextjs-component': {
    name: 'Next.js Component',
    description: 'Client-side React component for Next.js App Router',
    type: 'component',
    extension: 'tsx',
    template: `'use client';

import React from 'react';

interface {{ComponentName}}Props {
  // Define your props here
  title?: string;
  children?: React.ReactNode;
}

export default function {{ComponentName}}({
  title,
  children,
}: {{ComponentName}}Props) {
  return (
    <div className="{{component-name}}">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}
`,
  },
  'express-route': {
    name: 'Express Route',
    description: 'TypeScript Express route handler',
    type: 'component',
    extension: 'ts',
    template: `import { Router, Request, Response } from 'express';

const router = Router();

// GET /{{routeName}}
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '{{routeName}} endpoint working',
  });
});

// POST /{{routeName}}
router.post('/', (req: Request, res: Response) => {
  const { body } = req;
  // Handle POST request
  res.json({
    success: true,
    data: body,
  });
});

export default router;
`,
  },
  'vitest-test': {
    name: 'Vitest Test',
    description: 'Vitest test file for a function/component',
    type: 'component',
    extension: 'test.ts',
    template: `import { describe, it, expect } from 'vitest';

describe('{{testName}}', () => {
  it('should work correctly', () => {
    // Add your test here
    expect(true).toBe(true);
  });

  it('should handle edge cases', () => {
    // Add edge case tests
    expect(true).toBe(true);
  });
});
`,
  },
};

/**
 * Scaffold a new project or component
 */
export async function scaffold(
  args: string[],
  primitives: {
    planning: PlanningPrimitive;
    completion: CompletionPrimitive;
    multiEdit: MultiEditPrimitive;
    execution: ExecutionPrimitive;
    search: SearchPrimitive;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Parse arguments
    const [templateType, ...nameParts] = args;
    let targetName = nameParts.join(' ') || '.';

    if (!templateType) {
      showScaffoldHelp();
      return { success: true };
    }

    // Validate template type against allowed templates
    const validTemplates = Object.keys(TEMPLATES);
    if (!validTemplates.includes(templateType)) {
      console.log(chalk.red(`\n❌ Template "${templateType}" not found.\n`));
      console.log(chalk.gray('Run "vibe scaffold" to see available templates.\n'));
      return { success: false, error: `Template not found: ${templateType}` };
    }

    // Validate and sanitize target name to prevent path traversal
    // Allow only alphanumeric characters, hyphens, underscores, and dots
    const sanitizedTargetName = targetName.replace(/[^a-zA-Z0-9._-]/g, '');
    if (sanitizedTargetName !== targetName && targetName !== '.') {
      console.log(chalk.yellow(`\n⚠️  Target name contains invalid characters. Using: ${sanitizedTargetName}\n`));
    }
    targetName = sanitizedTargetName || '.';

    // Check if template exists
    const template = TEMPLATES[templateType as keyof typeof TEMPLATES];

    console.log(chalk.cyan(`\n🚀 Scaffolding ${template.name}...\n`));

    if (template.type === 'project') {
      await scaffoldProject(templateType, template, targetName, primitives);
    } else {
      await scaffoldComponent(templateType, template, targetName, primitives);
    }

    console.log(chalk.green('\n✅ Scaffolding complete!\n'));
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Scaffolding failed: ${message}`);
    console.log(chalk.red(`\n❌ Scaffolding failed: ${message}\n`));
    return { success: false, error: message };
  }
}

/**
 * Scaffold a full project
 */
async function scaffoldProject(
  templateKey: string,
  template: any,
  targetName: string,
  primitives: any
): Promise<void> {
  const projectPath = path.resolve(targetName);

  // Create project directory if it doesn't exist
  if (!fs.existsSync(projectPath)) {
    console.log(chalk.blue(`📁 Creating directory: ${projectPath}`));
    fs.mkdirSync(projectPath, { recursive: true });
  }

  // Change to project directory
  process.chdir(projectPath);

  // Use AI to generate project files based on template
  console.log(chalk.blue('🤖 Generating project files...'));

  const generatePrompt = `Generate a ${template.name} project with these specifications:
${JSON.stringify(template, null, 2)}

Create all necessary files with proper content. Use modern best practices and TypeScript.
Return the result as a JSON object with this structure:
{
  "files": [
    {"path": "relative/path/to/file", "content": "file content"}
  ]
}

Only return the JSON, no other text.`;

  const completionResult = await primitives.completion.execute({
    prompt: generatePrompt,
    systemPrompt: 'You are an expert developer scaffolding code. Generate clean, modern, production-ready code.',
  });

  if (completionResult.success && completionResult.data) {
    try {
      // Parse the generated files
      const generated = JSON.parse(completionResult.data);

      // Write each file
      for (const file of generated.files || []) {
        const filePath = path.join(projectPath, file.path);
        const dir = path.dirname(filePath);

        // Create directory if needed
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, file.content, 'utf-8');
        console.log(chalk.green(`  ✓ ${file.path}`));
      }
    } catch (parseError) {
      // If AI generation fails, use template commands
      console.log(chalk.yellow('⚠️  AI generation failed, using template commands...'));

      if (template.devCommands && template.devCommands.length > 0) {
        for (const cmd of template.devCommands) {
          console.log(chalk.blue(`  → ${cmd}`));
          const result = await primitives.execution.execute({
            command: cmd,
            cwd: projectPath,
          });

          if (!result.success) {
            console.log(chalk.yellow(`  ⚠️  Command failed: ${result.error}`));
          }
        }
      }
    }
  }

  // Install dependencies
  console.log(chalk.blue('\n📦 Installing dependencies...'));

  const allDeps = [
    ...(template.dependencies || []),
    ...(template.devDependencies || []).map((d: string) => `-D ${d}`),
  ].join(' ');

  if (allDeps) {
    const installResult = await primitives.execution.execute({
      command: `npm install ${allDeps}`,
      cwd: projectPath,
    });

    if (installResult.success) {
      console.log(chalk.green('  ✓ Dependencies installed'));
    } else {
      console.log(chalk.yellow(`  ⚠️  Installation failed: ${installResult.error}`));
    }
  }

  // Show next steps
  console.log(chalk.cyan('\n📋 Next steps:\n'));
  console.log(chalk.white(`  cd ${targetName}`));
  console.log(chalk.white('  npm run dev'));
  console.log();
}

/**
 * Scaffold a single component
 */
async function scaffoldComponent(
  templateKey: string,
  template: any,
  targetName: string,
  primitives: any
): Promise<void> {
  // Convert target name to proper format
  const componentName = toPascalCase(targetName);
  const componentFileName = toKebabCase(targetName);
  const testName = toCamelCase(targetName); // For test files, use camelCase

  // Determine file path
  let filePath: string;
  if (templateKey.includes('react') || templateKey.includes('next')) {
    // Check if we're in a components directory
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'components', `${componentFileName}.${template.extension}`),
      path.join(process.cwd(), 'components', `${componentFileName}.${template.extension}`),
      path.join(process.cwd(), `${componentFileName}.${template.extension}`),
    ];

    filePath = possiblePaths.find((p) => {
      const dir = path.dirname(p);
      return fs.existsSync(dir) || dir === process.cwd();
    }) || possiblePaths[0];
  } else {
    filePath = path.join(process.cwd(), `${componentFileName}.${template.extension}`);
  }

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(chalk.yellow(`⚠️  File already exists: ${filePath}`));
    const overwrite = await promptUser('Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log(chalk.gray('Cancelled.\n'));
      return;
    }
  }

  // Generate component content
  const content = template.template
    .replace(/\{\{ComponentName\}\}/g, componentName)
    .replace(/\{\{component-name\}\}/g, componentFileName)
    .replace(/\{\{routeName\}\}/g, componentFileName)
    .replace(/\{\{targetName\}\}/g, componentName) // For backwards compatibility
    .replace(/\{\{testName\}\}/g, testName); // For test files, use camelCase

  // Create directory if needed
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(chalk.blue(`📁 Created directory: ${dir}`));
  }

  // Write component file
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(chalk.green(`✓ Created: ${filePath}`));

  // If it's a test, also suggest creating a test directory
  if (templateKey === 'vitest-test') {
    console.log(chalk.cyan('\n💡 Tip: Place this test file in your tests/ directory\n'));
  }
}

/**
 * Show scaffold help and available templates
 */
export function showScaffoldHelp(): void {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Scaffolder - Generate projects & components             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe scaffold <template> [name]                            ║
║                                                               ║
║  ${chalk.bold('Project Templates')}                                          ║
`));

  const projectTemplates = Object.entries(TEMPLATES)
    .filter(([_, t]: [string, any]) => t.type === 'project')
    .sort();

  for (const entry of projectTemplates) {
    const [key, template]: [string, any] = entry;
    console.log(chalk.cyan(`    ${chalk.green(key.padEnd(20))} ${template.description}`));
  }

  console.log(chalk.cyan(`
║  ${chalk.bold('Component Templates')}                                        ║
`));

  const componentTemplates = Object.entries(TEMPLATES)
    .filter(([_, t]: [string, any]) => t.type === 'component')
    .sort();

  for (const entry of componentTemplates) {
    const [key, template]: [string, any] = entry;
    console.log(chalk.cyan(`    ${chalk.green(key.padEnd(20))} ${template.description}`));
  }

  console.log(chalk.cyan(`
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe scaffold nextjs my-app                               ║
║    vibe scaffold react-component Button                    ║
║    vibe scaffold express-api user-service                    ║
║    vibe scaffold vitest-test utils/helpers                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  // Handle camelCase, PascalCase, kebab-case, snake_case, and space separated
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  // Handle camelCase, PascalCase, snake_case, and space separated
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  // Handle kebab-case, snake_case, and space separated
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (c) => c.toLowerCase()); // lowercase first letter
}

/**
 * Prompt user for input
 */
async function promptUser(question: string): Promise<string> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}
