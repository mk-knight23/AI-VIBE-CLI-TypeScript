/**
 * LSP Auto-Detection - Automatically load language servers
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LSPConfig {
  language: string;
  extensions: string[];
  server?: string;
  command?: string[];
  detected: boolean;
}

const LSP_CONFIGS: Record<string, Omit<LSPConfig, 'detected'>> = {
  typescript: {
    language: 'typescript',
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    server: 'typescript-language-server',
    command: ['typescript-language-server', '--stdio']
  },
  python: {
    language: 'python',
    extensions: ['.py'],
    server: 'pylsp',
    command: ['pylsp']
  },
  rust: {
    language: 'rust',
    extensions: ['.rs'],
    server: 'rust-analyzer',
    command: ['rust-analyzer']
  },
  go: {
    language: 'go',
    extensions: ['.go'],
    server: 'gopls',
    command: ['gopls']
  },
  java: {
    language: 'java',
    extensions: ['.java'],
    server: 'jdtls',
    command: ['jdtls']
  },
  ruby: {
    language: 'ruby',
    extensions: ['.rb'],
    server: 'solargraph',
    command: ['solargraph', 'stdio']
  },
  cpp: {
    language: 'cpp',
    extensions: ['.cpp', '.c', '.h', '.hpp'],
    server: 'clangd',
    command: ['clangd']
  }
};

export function detectProjectLanguages(projectPath: string = process.cwd()): LSPConfig[] {
  const detected: LSPConfig[] = [];
  const files = getProjectFiles(projectPath);

  for (const [lang, config] of Object.entries(LSP_CONFIGS)) {
    const hasFiles = files.some(f => config.extensions.some(ext => f.endsWith(ext)));
    if (hasFiles) {
      detected.push({ ...config, detected: true });
    }
  }

  // Check for specific config files
  if (fs.existsSync(path.join(projectPath, 'package.json'))) {
    if (!detected.find(d => d.language === 'typescript')) {
      detected.push({ ...LSP_CONFIGS.typescript, detected: true });
    }
  }
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
    if (!detected.find(d => d.language === 'rust')) {
      detected.push({ ...LSP_CONFIGS.rust, detected: true });
    }
  }
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
    if (!detected.find(d => d.language === 'go')) {
      detected.push({ ...LSP_CONFIGS.go, detected: true });
    }
  }
  if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || 
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
    if (!detected.find(d => d.language === 'python')) {
      detected.push({ ...LSP_CONFIGS.python, detected: true });
    }
  }

  return detected;
}

function getProjectFiles(dir: string, depth = 3): string[] {
  const files: string[] = [];
  
  function scan(currentDir: string, currentDepth: number) {
    if (currentDepth > depth) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          scan(fullPath, currentDepth + 1);
        }
      }
    } catch {}
  }

  scan(dir, 0);
  return files.slice(0, 1000); // Limit for performance
}

export function getLSPStatus(): { language: string; available: boolean }[] {
  const detected = detectProjectLanguages();
  return detected.map(config => ({
    language: config.language,
    available: config.detected
  }));
}
