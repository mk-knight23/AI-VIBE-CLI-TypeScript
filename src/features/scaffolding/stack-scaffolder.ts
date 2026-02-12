/**
 * VIBE-CLI v0.0.1 - Full-Stack Scaffolder
 * Generate complete applications from templates
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { progressDisplay } from '../../ui/progress-bars/progress-display.js';

/**
 * Project type
 */
export type ProjectType = 'react' | 'vue' | 'angular' | 'nextjs' | 'express' | 'fastify' | 'nestjs' | 'fullstack';

/**
 * Database type
 */
export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'none';

/**
 * Auth type
 */
export type AuthType = 'jwt' | 'session' | 'oauth' | 'none';

/**
 * Scaffolding options
 */
export interface ScaffoldingOptions {
  projectName: string;
  projectType: ProjectType;
  database: DatabaseType;
  auth: AuthType;
  features?: string[];
  typescript?: boolean;
  styling?: 'css' | 'scss' | 'tailwind' | 'none';
  testing?: 'jest' | 'vitest' | 'playwright' | 'none';
  outputDir?: string;
  description?: string;
}

/**
 * Generated project structure
 */
export interface ProjectStructure {
  rootDir: string;
  files: GeneratedFile[];
  directories: string[];
  packageJson?: any;
  configFiles: GeneratedFile[];
}

/**
 * Generated file
 */
export interface GeneratedFile {
  path: string;
  content: string;
  template?: string;
}

/**
 * Template variables
 */
export interface TemplateVariables {
  projectName: string;
  projectType: string;
  database: string;
  auth: string;
  typescript: boolean;
  styling: string;
  testing: string;
  features: string[];
  date: string;
}

/**
 * Full-Stack Scaffolder
 */
export class StackScaffolder {
  private readonly templates: Map<string, string>;
  private readonly generatedProjects: ProjectStructure[] = [];

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Initialize templates
   */
  private initializeTemplates(): void {
    // React + Express Full-Stack Template
    this.templates.set('fullstack-react-express', `
# Full-Stack React + Express Project

## Structure
client/          # React frontend
  src/
    components/  # React components
    pages/       # Page components
    hooks/       # Custom hooks
    services/    # API services
    utils/       # Utility functions
  public/
server/          # Express backend
  src/
    routes/      # API routes
    controllers/ # Route controllers
    models/      # Data models
    middleware/  # Express middleware
    utils/       # Server utilities
  tests/
    `);

    // Next.js Template
    this.templates.set('nextjs-app', `
# Next.js Project

## Structure
src/
  app/           # App Router pages
    (routes)/    # Route groups
  components/    # React components
  lib/           # Utilities
  hooks/         # Custom hooks
  types/         # TypeScript types
  tests/
    `);

    // Express API Template
    this.templates.set('express-api', `
# Express API Project

## Structure
src/
  routes/        # API endpoints
  controllers/   # Business logic
  models/        # Data models
  middleware/    # Custom middleware
  services/      # Business services
  utils/         # Helper functions
  config/        # Configuration
  tests/
    `);
  }

  /**
   * Generate a custom project based on description using AI
   */
  async generateCustom(options: ScaffoldingOptions, provider: any): Promise<ProjectStructure> {
    console.log(chalk.bold('\n🧠 AI Custom Scaffolding'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(chalk.cyan(`Description: ${options.description}`));

    const prompt = `Define a project structure for this description: "${options.description}".
    Respond with a JSON object:
    {
      "directories": ["dir1", "dir2/sub"],
      "files": [
        { "path": "file1.ts", "content": "..." },
        { "path": "dir1/file2.js", "content": "..." }
      ],
      "packageJson": { "name": "...", "dependencies": { ... } }
    }`;

    try {
      const response = await provider.chat([{ role: 'system', content: 'You are an expert software architect.' }, { role: 'user', content: prompt }]);
      const customData = JSON.parse(response.content.trim().replace(/```json/g, '').replace(/```/g, ''));

      const outputDir = options.outputDir || process.cwd();
      const projectDir = path.join(outputDir, options.projectName);

      const structure: ProjectStructure = {
        rootDir: projectDir,
        files: customData.files.map((f: any) => ({ ...f, path: path.join(projectDir, f.path) })),
        directories: customData.directories.map((d: any) => path.join(projectDir, d)),
        packageJson: customData.packageJson,
        configFiles: [],
      };

      progressDisplay.startProgress(structure.directories.length + structure.files.length, 'Creating custom project');

      // Create directories
      for (const dir of structure.directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        progressDisplay.incrementProgress(1);
      }

      // Add package.json to files
      structure.files.push({
        path: path.join(projectDir, 'package.json'),
        content: JSON.stringify(structure.packageJson, null, 2),
      });

      // Write files
      for (const file of structure.files) {
        fs.writeFileSync(file.path, file.content);
        progressDisplay.incrementProgress(1);
      }

      progressDisplay.completeProgress('Custom project generation complete');
      this.generatedProjects.push(structure);
      return structure;
    } catch (error) {
      console.error(chalk.red('✗ Custom scaffolding failed:'), error);
      throw error;
    }
  }

  /**
   * Generate a full-stack project
   */
  async generate(options: ScaffoldingOptions): Promise<ProjectStructure> {
    const outputDir = options.outputDir || process.cwd();
    const projectDir = path.join(outputDir, options.projectName);

    console.log(chalk.bold('\n🚀 Generating Project'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(chalk.cyan(`Project: ${options.projectName}`));
    console.log(chalk.cyan(`Type: ${options.projectType}`));
    console.log(chalk.cyan(`Database: ${options.database}`));
    console.log(chalk.cyan(`Auth: ${options.auth}`));
    console.log('');

    // Create project structure
    const structure: ProjectStructure = {
      rootDir: projectDir,
      files: [],
      directories: [],
      configFiles: [],
    };

    progressDisplay.startProgress(10, 'Creating project structure');

    // Create directory structure based on project type
    this.createProjectStructure(structure, options);

    // Generate package.json
    progressDisplay.incrementProgress(1, 'Generating package.json');
    const packageJson = this.generatePackageJson(options);
    structure.packageJson = packageJson;
    structure.configFiles.push({
      path: path.join(projectDir, 'package.json'),
      content: JSON.stringify(packageJson, null, 2),
    });

    // Generate config files
    this.generateConfigFiles(structure, options);

    // Generate source files based on project type
    this.generateSourceFiles(structure, options);

    // Generate database setup if needed
    if (options.database !== 'none') {
      progressDisplay.incrementProgress(1, 'Setting up database');
      this.generateDatabaseSetup(structure, options);
    }

    // Generate auth if needed
    if (options.auth !== 'none') {
      progressDisplay.incrementProgress(1, 'Setting up authentication');
      this.generateAuthSetup(structure, options);
    }

    progressDisplay.completeProgress('Project generation complete');

    // Write all files
    this.writeProjectFiles(structure);

    this.generatedProjects.push(structure);

    return structure;
  }

  /**
   * Create project directory structure
   */
  private createProjectStructure(structure: ProjectStructure, options: ScaffoldingOptions): void {
    const dirs: string[] = [];

    if (options.projectType === 'fullstack') {
      dirs.push(`${options.projectName}`);
      dirs.push(`${options.projectName}/client/src/components`);
      dirs.push(`${options.projectName}/client/src/pages`);
      dirs.push(`${options.projectName}/client/src/services`);
      dirs.push(`${options.projectName}/client/src/hooks`);
      dirs.push(`${options.projectName}/server/src/routes`);
      dirs.push(`${options.projectName}/server/src/controllers`);
      dirs.push(`${options.projectName}/server/src/models`);
      dirs.push(`${options.projectName}/server/src/middleware`);
      dirs.push(`${options.projectName}/server/src/config`);
      dirs.push(`${options.projectName}/server/tests`);
    } else if (options.projectType === 'nextjs') {
      dirs.push(`${options.projectName}/src/app`);
      dirs.push(`${options.projectName}/src/components`);
      dirs.push(`${options.projectName}/src/lib`);
      dirs.push(`${options.projectName}/src/hooks`);
      dirs.push(`${options.projectName}/src/types`);
      dirs.push(`${options.projectName}/tests`);
    } else {
      // Express/Fastify/NestJS
      dirs.push(`${options.projectName}/src/routes`);
      dirs.push(`${options.projectName}/src/controllers`);
      dirs.push(`${options.projectName}/src/models`);
      dirs.push(`${options.projectName}/src/middleware`);
      dirs.push(`${options.projectName}/src/services`);
      dirs.push(`${options.projectName}/src/utils`);
      dirs.push(`${options.projectName}/src/config`);
      dirs.push(`${options.projectName}/tests`);
    }

    for (const dir of dirs) {
      const fullPath = path.join(options.outputDir || process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        structure.directories.push(dir);
      }
    }
  }

  /**
   * Generate package.json
   */
  private generatePackageJson(options: ScaffoldingOptions): any {
    const scripts: Record<string, string> = {
      dev: 'concurrently "npm run dev:client" "npm run dev:server"',
      build: 'npm run build:client && npm run build:server',
      test: 'npm run test:client && npm run test:server',
      lint: 'eslint . --ext .ts,.tsx',
    };

    const deps: Record<string, string> = {};

    if (options.projectType === 'fullstack') {
      // Client deps
      deps['react'] = '^18.2.0';
      deps['react-dom'] = '^18.2.0';
      deps['axios'] = '^1.6.0';

      if (options.styling === 'tailwind') {
        deps['tailwindcss'] = '^3.4.0';
      }

      // Server deps
      deps['express'] = '^4.18.0';
      deps['cors'] = '^2.8.5';
      deps['dotenv'] = '^16.3.0';
    } else if (options.projectType === 'nextjs') {
      deps['next'] = '^14.0.0';
      deps['react'] = '^18.2.0';
      deps['react-dom'] = '^18.2.0';
    } else if (options.projectType === 'express') {
      deps['express'] = '^4.18.0';
      deps['cors'] = '^2.8.5';
      deps['dotenv'] = '^16.3.0';
    }

    if (options.database === 'postgresql' || options.database === 'mysql') {
      deps['sequelize'] = '^6.35.0';
      deps['pg'] = '^8.11.0';
    } else if (options.database === 'mongodb') {
      deps['mongoose'] = '^8.0.0';
    }

    if (options.auth === 'jwt') {
      deps['jsonwebtoken'] = '^9.0.0';
      deps['bcryptjs'] = '^2.4.3';
    }

    const devDeps: Record<string, string> = {
      'concurrently': '^8.2.0',
      'typescript': '^5.3.0',
    };

    if (options.typescript) {
      if (options.projectType === 'fullstack') {
        devDeps['@types/react'] = '^18.2.0';
        devDeps['@types/node'] = '^20.10.0';
        devDeps['@types/express'] = '^4.17.0';
      } else if (options.projectType === 'nextjs') {
        devDeps['@types/node'] = '^20.10.0';
      }
    }

    if (options.testing === 'jest') {
      devDeps['jest'] = '^29.7.0';
      devDeps['@types/jest'] = '^29.5.0';
    } else if (options.testing === 'vitest') {
      devDeps['vitest'] = '^1.0.0';
    }

    return {
      name: options.projectName,
      version: '1.0.0',
      description: `Generated ${options.projectType} project`,
      scripts,
      dependencies: deps,
      devDependencies: devDeps,
    };
  }

  /**
   * Generate config files
   */
  private generateConfigFiles(structure: ProjectStructure, options: ScaffoldingOptions): void {
    const vars: TemplateVariables = {
      projectName: options.projectName,
      projectType: options.projectType,
      database: options.database,
      auth: options.auth,
      typescript: options.typescript ?? true,
      styling: options.styling || 'css',
      testing: options.testing || 'jest',
      features: options.features || [],
      date: new Date().toISOString().split('T')[0],
    };

    // tsconfig.json
    if (options.typescript) {
      structure.configFiles.push({
        path: path.join(structure.rootDir, 'tsconfig.json'),
        content: this.renderTemplate('tsconfig', vars),
      });
    }

    // .env.example
    structure.configFiles.push({
      path: path.join(structure.rootDir, '.env.example'),
      content: this.renderTemplate('env', vars),
    });

    // .gitignore
    structure.configFiles.push({
      path: path.join(structure.rootDir, '.gitignore'),
      content: this.renderTemplate('gitignore', vars),
    });
  }

  /**
   * Generate source files
   */
  private generateSourceFiles(structure: ProjectStructure, options: ScaffoldingOptions): void {
    const vars: TemplateVariables = {
      projectName: options.projectName,
      projectType: options.projectType,
      database: options.database,
      auth: options.auth,
      typescript: options.typescript ?? true,
      styling: options.styling || 'css',
      testing: options.testing || 'jest',
      features: options.features || [],
      date: new Date().toISOString().split('T')[0],
    };

    if (options.projectType === 'fullstack') {
      // Generate React components
      this.generateReactFiles(structure, options, vars);

      // Generate Express server
      this.generateExpressFiles(structure, options, vars);
    } else if (options.projectType === 'nextjs') {
      this.generateNextjsFiles(structure, options, vars);
    } else if (options.projectType === 'express') {
      this.generateExpressFiles(structure, options, vars);
    }
  }

  /**
   * Generate React files
   */
  private generateReactFiles(structure: ProjectStructure, options: ScaffoldingOptions, vars: TemplateVariables): void {
    const ext = options.typescript ? 'tsx' : 'jsx';

    // App component
    structure.files.push({
      path: path.join(structure.rootDir, `client/src/App.${ext}`),
      content: this.renderTemplate('react-app', vars),
    });

    // index file
    structure.files.push({
      path: path.join(structure.rootDir, `client/src/index.${options.typescript ? 'ts' : 'js'}`),
      content: this.renderTemplate('react-index', vars),
    });

    // API service
    structure.files.push({
      path: path.join(structure.rootDir, `client/src/services/api.ts`),
      content: this.renderTemplate('api-service', vars),
    });
  }

  /**
   * Generate Express files
   */
  private generateExpressFiles(structure: ProjectStructure, options: ScaffoldingOptions, vars: TemplateVariables): void {
    const ext = options.typescript ? 'ts' : 'js';

    // Main server file
    structure.files.push({
      path: path.join(structure.rootDir, `server/src/index.${ext}`),
      content: this.renderTemplate('express-server', vars),
    });

    // Routes
    structure.files.push({
      path: path.join(structure.rootDir, `server/src/routes/index.${ext}`),
      content: this.renderTemplate('express-routes', vars),
    });

    // App controller
    structure.files.push({
      path: path.join(structure.rootDir, `server/src/controllers/app.controller.${ext}`),
      content: this.renderTemplate('express-controller', vars),
    });
  }

  /**
   * Generate Next.js files
   */
  private generateNextjsFiles(structure: ProjectStructure, options: ScaffoldingOptions, vars: TemplateVariables): void {
    // page.tsx
    structure.files.push({
      path: path.join(structure.rootDir, 'src/app/page.tsx'),
      content: this.renderTemplate('nextjs-page', vars),
    });

    // layout.tsx
    structure.files.push({
      path: path.join(structure.rootDir, 'src/app/layout.tsx'),
      content: this.renderTemplate('nextjs-layout', vars),
    });
  }

  /**
   * Generate database setup
   */
  private generateDatabaseSetup(structure: ProjectStructure, options: ScaffoldingOptions): void {
    const ext = options.typescript ? 'ts' : 'js';

    structure.files.push({
      path: path.join(structure.rootDir, `server/src/config/database.${ext}`),
      content: this.renderTemplate('database-config', {
        ...variablesFromOptions(options),
        database: options.database,
      }),
    });
  }

  /**
   * Generate auth setup
   */
  private generateAuthSetup(structure: ProjectStructure, options: ScaffoldingOptions): void {
    const ext = options.typescript ? 'ts' : 'js';

    structure.files.push({
      path: path.join(structure.rootDir, `server/src/middleware/auth.${ext}`),
      content: this.renderTemplate('auth-middleware', variablesFromOptions(options)),
    });

    if (options.auth === 'jwt') {
      structure.files.push({
        path: path.join(structure.rootDir, `server/src/utils/jwt.${ext}`),
        content: this.renderTemplate('jwt-util', variablesFromOptions(options)),
      });
    }
  }

  /**
   * Write project files to disk
   */
  private writeProjectFiles(structure: ProjectStructure): void {
    for (const file of structure.files) {
      const dir = path.dirname(file.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file.path, file.content);
    }

    for (const file of structure.configFiles) {
      const dir = path.dirname(file.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file.path, file.content);
    }
  }

  /**
   * Render template string
   */
  private renderTemplate(templateName: string, vars: TemplateVariables): string {
    const templates: Record<string, string> = {
      tsconfig: `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`,
      env: `# Environment variables
PORT=3000
NODE_ENV=development
DATABASE_URL=
API_KEY=
${vars.auth !== 'none' ? 'JWT_SECRET=' : ''}
`,
      gitignore: `# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`,
      'react-app': `import React from 'react';
${vars.typescript ? "import { useState, useEffect } from 'react';" : ''}
${vars.styling === 'tailwind' ? "import './App.css';" : ''}

${vars.typescript ? 'interface AppProps {}' : ''}
function App(${vars.typescript ? '_props: AppProps' : ''}) {
  return (
    <div className="App">
      <h1>${vars.projectName}</h1>
      <p>Welcome to your new React app!</p>
    </div>
  );
}

export default App;
`,
      'react-index': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
${vars.styling === 'tailwind' ? "import './index.css';" : ''}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      'api-service': `import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
`,
      'express-server': `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
`,
      'express-routes': `import { Router } from 'express';
import appController from '../controllers/app.controller.js';

const router = Router();

// Health check
router.get('/health', appController.health);

// Add more routes here

export default router;
`,
      'express-controller': `export const health = (req: any, res: any) => {
  res.json({ status: 'ok' });
};

export default { health };
`,
      'nextjs-page': `export default function Home() {
  return (
    <main>
      <h1>${vars.projectName}</h1>
      <p>Welcome to your Next.js app!</p>
    </main>
  );
}
`,
      'nextjs-layout': `export const metadata = {
  title: '${vars.projectName}',
  description: 'Generated by Vibe CLI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      'database-config': `export const config = {
  database: {
    type: '${vars.database}',
    url: process.env.DATABASE_URL || '',
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
  },
};
`,
      'auth-middleware': `export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Verify token logic here
  req.user = { id: '1' }; // Placeholder
  next();
};

export default authenticate;
`,
      'jwt-util': `import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

export const signToken = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
`,
    };

    let content = templates[templateName] || '';

    // Simple template variable substitution
    for (const [key, value] of Object.entries(vars)) {
      content = content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
    }

    return content;
  }

  /**
   * Get generated projects
   */
  getGeneratedProjects(): ProjectStructure[] {
    return [...this.generatedProjects];
  }

  /**
   * Format generation summary
   */
  formatGenerationSummary(structure: ProjectStructure): string {
    const lines: string[] = [];

    lines.push(chalk.bold('\n✅ Project Generated Successfully!\n'));
    lines.push(chalk.gray('='.repeat(50)));
    lines.push('');
    lines.push(chalk.bold(`Project: ${path.basename(structure.rootDir)}`));
    lines.push(chalk.cyan(`Location: ${structure.rootDir}`));
    lines.push('');
    lines.push(chalk.bold('Files Created:'));
    lines.push(`  Directories: ${structure.directories.length}`);
    lines.push(`  Source Files: ${structure.files.length}`);
    lines.push(`  Config Files: ${structure.configFiles.length}`);
    lines.push('');
    lines.push(chalk.bold('Next Steps:'));
    lines.push('  1. cd ' + path.basename(structure.rootDir));
    lines.push('  2. npm install');
    lines.push('  3. npm run dev');
    lines.push('');

    return lines.join('\n');
  }
}

/**
 * Helper to create template variables
 */
function variablesFromOptions(options: ScaffoldingOptions): TemplateVariables {
  return {
    projectName: options.projectName,
    projectType: options.projectType,
    database: options.database,
    auth: options.auth,
    typescript: options.typescript ?? true,
    styling: options.styling || 'css',
    testing: options.testing || 'jest',
    features: options.features || [],
    date: new Date().toISOString().split('T')[0],
  };
}

/**
 * Singleton instance
 */
export const stackScaffolder = new StackScaffolder();
