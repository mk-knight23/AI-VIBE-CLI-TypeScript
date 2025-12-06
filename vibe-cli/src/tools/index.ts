import * as filesystem from './filesystem';
import * as shell from './shell';
import * as web from './web';
import * as memory from './extras';
import * as sandbox from './extras';
import * as enhanced from './enhanced';
import * as advanced from './advanced';

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  parameters: any;
  handler: (...args: any[]) => Promise<any>;
  requiresConfirmation?: boolean;
  category?: string;
}

export const tools: ToolDefinition[] = [
  // File Operations
  {
    name: 'list_directory',
    displayName: 'ReadFolder',
    description: 'List files and directories in a path',
    parameters: {
      path: { type: 'string', required: true },
      ignore: { type: 'array', required: false },
      respect_git_ignore: { type: 'boolean', required: false }
    },
    handler: filesystem.listDirectory,
    requiresConfirmation: false,
    category: 'filesystem'
  },
  {
    name: 'read_file',
    displayName: 'ReadFile',
    description: 'Read file contents (text, images, PDFs)',
    parameters: {
      path: { type: 'string', required: true },
      offset: { type: 'number', required: false },
      limit: { type: 'number', required: false }
    },
    handler: filesystem.readFile,
    requiresConfirmation: false,
    category: 'filesystem'
  },
  {
    name: 'write_file',
    displayName: 'WriteFile',
    description: 'Write content to a file',
    parameters: {
      file_path: { type: 'string', required: true },
      content: { type: 'string', required: true }
    },
    handler: filesystem.writeFile,
    requiresConfirmation: true,
    category: 'filesystem'
  },
  {
    name: 'glob',
    displayName: 'FindFiles',
    description: 'Find files matching glob patterns',
    parameters: {
      pattern: { type: 'string', required: true },
      path: { type: 'string', required: false },
      case_sensitive: { type: 'boolean', required: false },
      respect_git_ignore: { type: 'boolean', required: false }
    },
    handler: filesystem.globFiles,
    requiresConfirmation: false,
    category: 'filesystem'
  },
  {
    name: 'search_file_content',
    displayName: 'SearchText',
    description: 'Search for text patterns in files (uses rg/grep)',
    parameters: {
      pattern: { type: 'string', required: true },
      path: { type: 'string', required: false },
      include: { type: 'string', required: false }
    },
    handler: filesystem.searchFileContent,
    requiresConfirmation: false,
    category: 'filesystem'
  },
  {
    name: 'replace',
    displayName: 'Edit',
    description: 'Replace text in a file',
    parameters: {
      file_path: { type: 'string', required: true },
      old_string: { type: 'string', required: true },
      new_string: { type: 'string', required: true },
      expected_replacements: { type: 'number', required: false }
    },
    handler: filesystem.replaceInFile,
    requiresConfirmation: true,
    category: 'filesystem'
  },
  
  // Shell Operations
  {
    name: 'run_shell_command',
    displayName: 'Shell',
    description: 'Execute shell commands',
    parameters: {
      command: { type: 'string', required: true },
      description: { type: 'string', required: false },
      directory: { type: 'string', required: false }
    },
    handler: shell.runShellCommand,
    requiresConfirmation: true,
    category: 'shell'
  },
  
  // Web Operations
  {
    name: 'web_fetch',
    displayName: 'WebFetch',
    description: 'Fetch content from URLs',
    parameters: {
      url: { type: 'string', required: true }
    },
    handler: web.webFetch,
    requiresConfirmation: false,
    category: 'web'
  },
  {
    name: 'google_web_search',
    displayName: 'WebSearch',
    description: 'Search the web',
    parameters: {
      query: { type: 'string', required: true },
      num_results: { type: 'number', required: false }
    },
    handler: web.googleWebSearch,
    requiresConfirmation: false,
    category: 'web'
  },
  
  // Memory Operations
  {
    name: 'save_memory',
    displayName: 'SaveMemory',
    description: 'Save information to memory',
    parameters: {
      key: { type: 'string', required: true },
      value: { type: 'any', required: true }
    },
    handler: memory.saveMemory,
    requiresConfirmation: false,
    category: 'memory'
  },
  {
    name: 'write_todos',
    displayName: 'WriteTodos',
    description: 'Manage task list',
    parameters: {
      todos: { type: 'array', required: true }
    },
    handler: memory.writeTodos,
    requiresConfirmation: false,
    category: 'memory'
  },
  
  // Git Operations
  {
    name: 'git_status',
    displayName: 'GitStatus',
    description: 'Check git status (non-paginated)',
    parameters: {},
    handler: enhanced.gitStatus,
    requiresConfirmation: false,
    category: 'git'
  },
  {
    name: 'git_diff',
    displayName: 'GitDiff',
    description: 'Show git diff (non-paginated)',
    parameters: {
      file: { type: 'string', required: false }
    },
    handler: enhanced.gitDiff,
    requiresConfirmation: false,
    category: 'git'
  },
  {
    name: 'git_log',
    displayName: 'GitLog',
    description: 'Show git log (non-paginated)',
    parameters: {
      count: { type: 'number', required: false }
    },
    handler: enhanced.gitLog,
    requiresConfirmation: false,
    category: 'git'
  },
  {
    name: 'git_blame',
    displayName: 'GitBlame',
    description: 'Show git blame for file',
    parameters: {
      file: { type: 'string', required: true },
      lineStart: { type: 'number', required: false },
      lineEnd: { type: 'number', required: false }
    },
    handler: enhanced.gitBlame,
    requiresConfirmation: false,
    category: 'git'
  },
  
  // Enhanced File Operations
  {
    name: 'rg_search',
    displayName: 'RipgrepSearch',
    description: 'Fast search with ripgrep (fallback to grep)',
    parameters: {
      pattern: { type: 'string', required: true },
      path: { type: 'string', required: false },
      options: { type: 'object', required: false }
    },
    handler: enhanced.ripgrepSearch,
    requiresConfirmation: false,
    category: 'filesystem'
  },
  {
    name: 'list_files_rg',
    displayName: 'ListFilesRg',
    description: 'List all files using rg --files',
    parameters: {
      path: { type: 'string', required: false }
    },
    handler: enhanced.listFilesRg,
    requiresConfirmation: false,
    category: 'filesystem'
  },
  {
    name: 'get_file_info',
    displayName: 'FileInfo',
    description: 'Get detailed file information',
    parameters: {
      file_path: { type: 'string', required: true }
    },
    handler: enhanced.getFileInfo,
    requiresConfirmation: false,
    category: 'filesystem'
  },
  {
    name: 'create_directory',
    displayName: 'MakeDir',
    description: 'Create directory (recursive by default)',
    parameters: {
      dir_path: { type: 'string', required: true },
      recursive: { type: 'boolean', required: false }
    },
    handler: enhanced.createDirectory,
    requiresConfirmation: true,
    category: 'filesystem'
  },
  {
    name: 'delete_file',
    displayName: 'DeleteFile',
    description: 'Delete a file',
    parameters: {
      file_path: { type: 'string', required: true }
    },
    handler: enhanced.deleteFile,
    requiresConfirmation: true,
    category: 'filesystem'
  },
  {
    name: 'move_file',
    displayName: 'MoveFile',
    description: 'Move or rename a file',
    parameters: {
      source: { type: 'string', required: true },
      destination: { type: 'string', required: true }
    },
    handler: enhanced.moveFile,
    requiresConfirmation: true,
    category: 'filesystem'
  },
  {
    name: 'copy_file',
    displayName: 'CopyFile',
    description: 'Copy a file',
    parameters: {
      source: { type: 'string', required: true },
      destination: { type: 'string', required: true }
    },
    handler: enhanced.copyFile,
    requiresConfirmation: true,
    category: 'filesystem'
  },
  {
    name: 'append_to_file',
    displayName: 'AppendFile',
    description: 'Append content to file',
    parameters: {
      file_path: { type: 'string', required: true },
      content: { type: 'string', required: true }
    },
    handler: enhanced.appendToFile,
    requiresConfirmation: true,
    category: 'filesystem'
  },
  
  // Project Operations
  {
    name: 'check_dependency',
    displayName: 'CheckDep',
    description: 'Check if package exists in project',
    parameters: {
      package_name: { type: 'string', required: true }
    },
    handler: enhanced.checkDependency,
    requiresConfirmation: false,
    category: 'project'
  },
  {
    name: 'get_project_info',
    displayName: 'ProjectInfo',
    description: 'Get project metadata (framework, language, package manager)',
    parameters: {},
    handler: enhanced.getProjectInfo,
    requiresConfirmation: false,
    category: 'project'
  },
  {
    name: 'run_tests',
    displayName: 'RunTests',
    description: 'Run project tests',
    parameters: {
      test_command: { type: 'string', required: false }
    },
    handler: enhanced.runTests,
    requiresConfirmation: false,
    category: 'project'
  },
  {
    name: 'run_lint',
    displayName: 'RunLint',
    description: 'Run linter',
    parameters: {
      lint_command: { type: 'string', required: false }
    },
    handler: enhanced.runLint,
    requiresConfirmation: false,
    category: 'project'
  },
  {
    name: 'run_typecheck',
    displayName: 'TypeCheck',
    description: 'Run TypeScript type checking',
    parameters: {},
    handler: enhanced.runTypeCheck,
    requiresConfirmation: false,
    category: 'project'
  },
  
  // Advanced AI-Powered Tools
  {
    name: 'analyze_code_quality',
    displayName: 'CodeQuality',
    description: 'Analyze code quality metrics (complexity, duplicates, long functions)',
    parameters: {
      file_path: { type: 'string', required: true }
    },
    handler: advanced.analyzeCodeQuality,
    requiresConfirmation: false,
    category: 'analysis'
  },
  {
    name: 'smart_refactor',
    displayName: 'Refactor',
    description: 'AI-powered code refactoring (extract, inline, rename)',
    parameters: {
      file_path: { type: 'string', required: true },
      type: { type: 'string', required: true }
    },
    handler: advanced.smartRefactor,
    requiresConfirmation: true,
    category: 'refactor'
  },
  {
    name: 'generate_tests',
    displayName: 'GenTests',
    description: 'Auto-generate test files for functions',
    parameters: {
      file_path: { type: 'string', required: true },
      framework: { type: 'string', required: false }
    },
    handler: advanced.generateTests,
    requiresConfirmation: true,
    category: 'testing'
  },
  {
    name: 'optimize_bundle',
    displayName: 'OptimizeBundle',
    description: 'Analyze and optimize bundle size',
    parameters: {
      project_path: { type: 'string', required: false }
    },
    handler: advanced.optimizeBundle,
    requiresConfirmation: false,
    category: 'optimization'
  },
  {
    name: 'security_scan',
    displayName: 'SecurityScan',
    description: 'Scan for security vulnerabilities and secrets',
    parameters: {
      project_path: { type: 'string', required: false }
    },
    handler: advanced.securityScan,
    requiresConfirmation: false,
    category: 'security'
  },
  {
    name: 'performance_benchmark',
    displayName: 'Benchmark',
    description: 'Benchmark file operations and parsing',
    parameters: {
      file_path: { type: 'string', required: true }
    },
    handler: advanced.performanceBenchmark,
    requiresConfirmation: false,
    category: 'performance'
  },
  {
    name: 'generate_documentation',
    displayName: 'GenDocs',
    description: 'Auto-generate documentation from code',
    parameters: {
      file_path: { type: 'string', required: true }
    },
    handler: advanced.generateDocumentation,
    requiresConfirmation: true,
    category: 'documentation'
  },
  {
    name: 'migrate_code',
    displayName: 'Migrate',
    description: 'Migrate code between formats (CommonJS→ESM, JS→TS)',
    parameters: {
      file_path: { type: 'string', required: true },
      from: { type: 'string', required: true },
      to: { type: 'string', required: true }
    },
    handler: advanced.migrateCode,
    requiresConfirmation: true,
    category: 'migration'
  }
];

export async function executeTool(toolName: string, params: any): Promise<any> {
  const tool = tools.find(t => t.name === toolName);
  if (!tool) throw new Error(`Tool not found: ${toolName}`);
  
  return await tool.handler(...Object.values(params));
}

export function getToolSchemas() {
  return tools.map(t => ({
    name: t.name,
    displayName: t.displayName,
    description: t.description,
    parameters: t.parameters,
    category: t.category
  }));
}

export function getToolsByCategory(category: string) {
  return tools.filter(t => t.category === category);
}

export { filesystem, shell, web, memory, sandbox, enhanced, advanced };

