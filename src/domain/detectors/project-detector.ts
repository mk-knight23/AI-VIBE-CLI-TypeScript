/**
 * Project Detector
 *
 * Detects project type, framework, and language for context building.
 */

export interface ProjectInfo {
  type: string;
  framework: string;
  language: string;
  hasTests: boolean;
  buildTool: string;
  packageManager: string;
}

export class ProjectDetector {
  async detect(projectPath: string): Promise<ProjectInfo | null> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      // Check if directory exists
      await fs.access(projectPath);
    } catch {
      return null;
    }

    const info: ProjectInfo = {
      type: 'unknown',
      framework: 'unknown',
      language: 'unknown',
      hasTests: false,
      buildTool: 'unknown',
      packageManager: 'unknown',
    };

    // Detect package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      // Detect language/framework from dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.react) {
        info.type = 'frontend';
        info.framework = 'React';
        info.language = 'TypeScript';
      } else if (deps.vue) {
        info.type = 'frontend';
        info.framework = 'Vue';
        info.language = 'JavaScript';
      } else if (deps.next || deps['nextjs']) {
        info.type = 'frontend';
        info.framework = 'Next.js';
        info.language = 'TypeScript';
      } else if (deps.express) {
        info.type = 'backend';
        info.framework = 'Express';
        info.language = 'JavaScript';
      } else if (deps['@nestjs/core']) {
        info.type = 'backend';
        info.framework = 'NestJS';
        info.language = 'TypeScript';
      }

      // Detect package manager
      if (await fileExists(path.join(projectPath, 'yarn.lock'))) {
        info.packageManager = 'yarn';
      } else if (await fileExists(path.join(projectPath, 'package-lock.json'))) {
        info.packageManager = 'npm';
      } else if (await fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
        info.packageManager = 'pnpm';
      }

      // Detect build tool
      if (deps.vite) {
        info.buildTool = 'Vite';
      } else if (deps.webpack) {
        info.buildTool = 'Webpack';
      }
    } catch {
      // No package.json found
    }

    // Detect tests
    const testDirs = ['tests', '__tests__', 'test', 'spec'];
    for (const testDir of testDirs) {
      if (await directoryExists(path.join(projectPath, testDir))) {
        info.hasTests = true;
        break;
      }
    }

    // Detect Python
    if (await fileExists(path.join(projectPath, 'requirements.txt')) ||
        await fileExists(path.join(projectPath, 'pyproject.toml'))) {
      info.language = 'Python';
      if (await fileExists(path.join(projectPath, 'manage.py'))) {
        info.framework = 'Django';
      } else if (await fileExists(path.join(projectPath, 'app.py'))) {
        info.framework = 'Flask';
      }
    }

    return info;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  const fs = await import('fs/promises');
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  const fs = await import('fs/promises');
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
