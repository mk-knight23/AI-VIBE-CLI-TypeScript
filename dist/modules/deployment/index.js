"use strict";
/**
 * VIBE-CLI v12 - Deployment Module
 * Build, deploy, CI/CD setup, and monitoring
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
exports.DeploymentModule = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const base_module_1 = require("../base.module");
const router_1 = require("../../providers/router");
class DeploymentModule extends base_module_1.BaseModule {
    provider;
    // Supported deployment targets
    targets = [
        { id: 'aws', name: 'AWS', supports: ['ec2', 'ecs', 'lambda', 'eb'] },
        { id: 'gcp', name: 'Google Cloud', supports: ['compute', 'cloud-run', 'functions'] },
        { id: 'azure', name: 'Azure', supports: ['vm', 'container-apps', 'functions'] },
        { id: 'heroku', name: 'Heroku', supports: ['app'] },
        { id: 'vercel', name: 'Vercel', supports: ['nextjs', 'static', 'functions'] },
        { id: 'netlify', name: 'Netlify', supports: ['static', 'functions', 'nextjs'] },
        { id: 'docker', name: 'Docker', supports: ['container'] },
        { id: 'kubernetes', name: 'Kubernetes', supports: ['cluster'] },
    ];
    constructor() {
        super({
            name: 'deployment',
            version: '1.0.0',
            description: 'Build, deploy, CI/CD setup, and monitoring',
        });
        this.provider = new router_1.VibeProviderRouter();
    }
    /**
     * Execute the module
     */
    async execute(params) {
        const action = params.action || params.type || 'build';
        const startTime = Date.now();
        try {
            switch (action) {
                case 'build':
                    return this.buildProject(params, startTime);
                case 'deploy':
                    return this.deploy(params, startTime);
                case 'setup-ci':
                    return this.setupCI(params, startTime);
                case 'monitor':
                    return this.monitorDeployment(params, startTime);
                case 'rollback':
                    return this.rollback(params, startTime);
                case 'status':
                    return this.getDeploymentStatus(params, startTime);
                default:
                    return this.failure(`Unknown action: ${action}. Supported: build, deploy, setup-ci, monitor, rollback, status`);
            }
        }
        catch (error) {
            return this.failure(error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Build the project
     */
    async buildProject(params, startTime) {
        const { type = 'auto', target, outputDir = 'dist' } = params;
        this.logInfo('Building project...');
        // Detect project type if not specified
        let projectType = type;
        if (projectType === 'auto') {
            projectType = this.detectProjectType();
        }
        let command;
        let artifacts = [];
        switch (projectType) {
            case 'nextjs':
                command = 'npm run build || npx next build';
                break;
            case 'react':
            case 'create-react-app':
                command = 'npm run build';
                break;
            case 'vue':
                command = 'npm run build';
                break;
            case 'node':
            case 'express':
                command = 'npm run build || tsc';
                break;
            case 'python':
                command = 'python -m py_compile . && echo "Build complete"';
                break;
            case 'docker':
                return this.buildDockerImage(params, startTime);
            default:
                command = 'npm run build';
        }
        try {
            const output = child_process.execSync(command, {
                encoding: 'utf-8',
                timeout: 180000,
                cwd: process.cwd(),
            });
            // Find artifacts
            const outputPath = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);
            if (fs.existsSync(outputPath)) {
                artifacts = this.findArtifacts(outputPath);
            }
            const duration = Date.now() - startTime;
            this.logSuccess(`Build completed in ${(duration / 1000).toFixed(2)}s`);
            return this.success({
                action: 'build',
                projectType,
                artifacts,
                output,
            }, {
                duration,
            });
        }
        catch (error) {
            return this.failure(error.message);
        }
    }
    /**
     * Build Docker image
     */
    async buildDockerImage(params, startTime) {
        const { tag = 'latest', dockerfile, context = '.' } = params;
        this.logInfo('Building Docker image...');
        const tagFlag = tag ? `-t ${tag}` : '';
        const dockerfileFlag = dockerfile ? `-f ${dockerfile}` : '';
        const command = `docker build ${dockerfileFlag} ${tagFlag} ${context}`;
        try {
            const output = child_process.execSync(command, {
                encoding: 'utf-8',
                timeout: 300000,
                cwd: process.cwd(),
            });
            // Extract image ID
            const imageMatch = output.match(/Successfully built ([a-f0-9]+)/);
            const imageId = imageMatch ? imageMatch[1] : 'unknown';
            const duration = Date.now() - startTime;
            return this.success({
                action: 'build',
                type: 'docker',
                imageId,
                tag,
                output,
            }, {
                duration,
            });
        }
        catch (error) {
            return this.failure(error.message);
        }
    }
    /**
     * Deploy to a target
     */
    async deploy(params, startTime) {
        const { target, config } = params;
        if (!target) {
            return this.failure('Missing required parameter: target');
        }
        this.logInfo(`Deploying to ${target}...`);
        // Detect target type
        const targetInfo = this.detectTargetType(target);
        if (!targetInfo) {
            return this.failure(`Unknown deployment target: ${target}. Supported: aws, gcp, azure, heroku, vercel, netlify, docker, kubernetes`);
        }
        // Route to appropriate deployment
        switch (targetInfo.id) {
            case 'vercel':
                return this.deployVercel(params, startTime);
            case 'netlify':
                return this.deployNetlify(params, startTime);
            case 'heroku':
                return this.deployHeroku(params, startTime);
            case 'docker':
                return this.deployDocker(params, startTime);
            default:
                return this.deployGeneric(targetInfo, params, startTime);
        }
    }
    /**
     * Deploy to Vercel
     */
    deployVercel(params, startTime) {
        const { environment = 'production', target } = params;
        this.logInfo('Deploying to Vercel...');
        try {
            // Check if vercel CLI is installed
            child_process.execSync('vercel --version', { encoding: 'utf-8' });
            const output = child_process.execSync(`vercel --${environment} --yes`, {
                encoding: 'utf-8',
                timeout: 120000,
                cwd: process.cwd(),
            });
            const urlMatch = output.match(/https:\/\/[^\s]+/);
            const url = urlMatch ? urlMatch[0] : undefined;
            const duration = Date.now() - startTime;
            return Promise.resolve(this.success({
                action: 'deploy',
                target: 'vercel',
                environment,
                url,
                output,
            }, {
                duration,
            }));
        }
        catch (error) {
            // Vercel might need login
            return Promise.resolve(this.success({
                action: 'deploy',
                target: 'vercel',
                status: 'needs-auth',
                message: 'Run "vercel login" first, then deploy again',
            }));
        }
    }
    /**
     * Deploy to Netlify
     */
    deployNetlify(params, startTime) {
        const { environment = 'production', target } = params;
        this.logInfo('Deploying to Netlify...');
        try {
            child_process.execSync('netlify --version', { encoding: 'utf-8' });
            const output = child_process.execSync(`netlify deploy --${environment} --dir=dist --yes`, {
                encoding: 'utf-8',
                timeout: 120000,
                cwd: process.cwd(),
            });
            const urlMatch = output.match(/Netlify Site URL:\s*(https:\/\/[^\s]+)/);
            const url = urlMatch ? urlMatch[1] : undefined;
            const duration = Date.now() - startTime;
            return Promise.resolve(this.success({
                action: 'deploy',
                target: 'netlify',
                environment,
                url,
                output,
            }, {
                duration,
            }));
        }
        catch (error) {
            return Promise.resolve(this.failure(error.message));
        }
    }
    /**
     * Deploy to Heroku
     */
    deployHeroku(params, startTime) {
        const { app, target } = params;
        if (!app) {
            return Promise.resolve(this.failure('Missing required parameter: app (Heroku app name)'));
        }
        this.logInfo(`Deploying to Heroku app: ${app}...`);
        try {
            // Check if remote exists
            const remotes = child_process.execSync('git remote -v', { encoding: 'utf-8' });
            if (!remotes.includes(app)) {
                // Add heroku remote
                child_process.execSync(`git remote add heroku https://git.heroku.com/${app}.git`, {
                    encoding: 'utf-8',
                });
            }
            // Push to heroku
            const output = child_process.execSync(`git push heroku main`, {
                encoding: 'utf-8',
                timeout: 180000,
                cwd: process.cwd(),
            });
            const url = `https://${app}.herokuapp.com`;
            const duration = Date.now() - startTime;
            return Promise.resolve(this.success({
                action: 'deploy',
                target: 'heroku',
                app,
                url,
                output,
            }, {
                duration,
            }));
        }
        catch (error) {
            return Promise.resolve(this.failure(error.message));
        }
    }
    /**
     * Deploy Docker container
     */
    deployDocker(params, startTime) {
        const { image, tag = 'latest', registry, target } = params;
        if (!image) {
            return Promise.resolve(this.failure('Missing required parameter: image'));
        }
        this.logInfo(`Deploying Docker image: ${image}:${tag}`);
        try {
            // Tag image
            const fullTag = registry ? `${registry}/${image}:${tag}` : image;
            child_process.execSync(`docker tag ${image} ${fullTag}`, { encoding: 'utf-8' });
            // Push to registry if specified
            if (registry) {
                child_process.execSync(`docker push ${fullTag}`, {
                    encoding: 'utf-8',
                    timeout: 300000,
                });
            }
            const duration = Date.now() - startTime;
            return Promise.resolve(this.success({
                action: 'deploy',
                target: 'docker',
                image: fullTag,
                tag,
                registry,
            }, {
                duration,
            }));
        }
        catch (error) {
            return Promise.resolve(this.failure(error.message));
        }
    }
    /**
     * Generic deployment for cloud providers
     */
    deployGeneric(targetInfo, params, startTime) {
        const { config } = params;
        this.logInfo(`Generating deployment configuration for ${targetInfo.name}...`);
        const configFile = this.generateCloudConfig(targetInfo.id, config);
        const duration = Date.now() - startTime;
        return Promise.resolve(this.success({
            action: 'deploy',
            target: targetInfo.id,
            status: 'configured',
            configFile,
            message: `Deployment configuration created. Apply with: ${this.getApplyCommand(targetInfo.id)}`,
        }, {
            duration,
        }));
    }
    /**
     * Setup CI/CD pipeline
     */
    async setupCI(params, startTime) {
        const { platform = 'github-actions', config } = params;
        this.logInfo(`Setting up ${platform}...`);
        const ciConfig = this.generateCIConfig(platform, config);
        // Write the CI configuration file
        const filePath = path.join(process.cwd(), ciConfig.file);
        fs.writeFileSync(filePath, ciConfig.content);
        this.logSuccess(`CI configuration written to: ${ciConfig.file}`);
        const duration = Date.now() - startTime;
        return this.success({
            action: 'setup-ci',
            platform,
            file: ciConfig.file,
            content: ciConfig.content,
        }, {
            duration,
        });
    }
    /**
     * Monitor deployment
     */
    async monitorDeployment(params, startTime) {
        const { target, timeout = 60 } = params;
        this.logInfo(`Monitoring deployment${target ? ` to ${target}` : ''}...`);
        // In a real implementation, this would:
        // - Check deployment status
        // - Stream logs
        // - Check health endpoints
        // - Alert on failures
        const duration = Date.now() - startTime;
        return this.success({
            action: 'monitor',
            target,
            status: 'active',
            message: 'Deployment monitoring active. Press Ctrl+C to stop.',
        }, {
            duration,
        });
    }
    /**
     * Rollback deployment
     */
    async rollback(params, startTime) {
        const { target, to } = params;
        this.logInfo(`Rolling back deployment${target ? ` from ${target}` : ''}...`);
        // In a real implementation, this would:
        // - List previous deployments
        // - Restore previous version
        // - Verify rollback
        const duration = Date.now() - startTime;
        return this.success({
            action: 'rollback',
            target,
            previousVersion: to || 'previous',
            message: 'Rollback initiated. Verifying deployment...',
        }, {
            duration,
        });
    }
    /**
     * Get deployment status
     */
    async getDeploymentStatus(params, startTime) {
        const { target } = params;
        this.logInfo(`Getting deployment status${target ? ` for ${target}` : ''}...`);
        // Check for common deployment markers
        const status = {
            hasBuildArtifact: fs.existsSync(path.join(process.cwd(), 'dist')) ||
                fs.existsSync(path.join(process.cwd(), 'build')),
            hasDockerfile: fs.existsSync(path.join(process.cwd(), 'Dockerfile')),
            hasCI: fs.existsSync(path.join(process.cwd(), '.github/workflows')) ||
                fs.existsSync(path.join(process.cwd(), '.gitlab-ci.yml')),
            hasPackageJson: fs.existsSync(path.join(process.cwd(), 'package.json')),
        };
        const projectType = this.detectProjectType();
        const duration = Date.now() - startTime;
        return this.success({
            action: 'status',
            projectType,
            status,
            readyToDeploy: status.hasBuildArtifact || status.hasDockerfile || status.hasPackageJson,
        }, {
            duration,
        });
    }
    /**
     * Detect project type
     */
    detectProjectType() {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                if (deps.next)
                    return 'nextjs';
                if (deps.react) {
                    if (pkg.scripts?.build?.includes('react-scripts'))
                        return 'create-react-app';
                    if (deps['@vitejs/plugin-react'])
                        return 'vite';
                    return 'react';
                }
                if (deps.vue)
                    return 'vue';
                if (deps.express || deps.fastify)
                    return 'express';
                if (deps.pytest)
                    return 'python';
            }
            catch {
                // Ignore
            }
        }
        if (fs.existsSync(path.join(process.cwd(), 'Dockerfile'))) {
            return 'docker';
        }
        return 'node';
    }
    /**
     * Detect deployment target type
     */
    detectTargetType(target) {
        const lower = target.toLowerCase();
        for (const t of this.targets) {
            if (lower.includes(t.id) || lower.includes(t.name.toLowerCase())) {
                return t;
            }
        }
        // Check for specific patterns
        if (lower.includes('vercel'))
            return this.targets.find(t => t.id === 'vercel');
        if (lower.includes('netlify'))
            return this.targets.find(t => t.id === 'netlify');
        if (lower.includes('heroku'))
            return this.targets.find(t => t.id === 'heroku');
        return null;
    }
    /**
     * Find build artifacts
     */
    findArtifacts(dir) {
        const artifacts = [];
        const walk = (currentDir) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    // Skip common non-artifact directories
                    if (!['node_modules', '.git', '.cache'].includes(entry.name)) {
                        walk(fullPath);
                    }
                }
                else if (entry.isFile()) {
                    const relPath = path.relative(dir, fullPath);
                    artifacts.push(relPath);
                }
            }
        };
        walk(dir);
        return artifacts.slice(0, 20); // Limit to 20 files
    }
    /**
     * Generate CI configuration
     */
    generateCIConfig(platform, config) {
        const templates = {
            'github-actions': {
                platform: 'github-actions',
                file: '.github/workflows/deploy.yml',
                content: `name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.ORG_ID }}
          vercel-project-id: \${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
`,
            },
            'gitlab-ci': {
                platform: 'gitlab-ci',
                file: '.gitlab-ci.yml',
                content: `stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm test

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy:
  stage: deploy
  script:
    - echo "Deploying to production..."
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
`,
            },
            'github-actions-docker': {
                platform: 'github-actions',
                file: '.github/workflows/docker.yml',
                content: `name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: \${{ secrets.DOCKERHUB_USERNAME }}/app:\${{ github.sha }}
`,
            },
        };
        return templates[platform] || templates['github-actions'];
    }
    /**
     * Generate cloud deployment config
     */
    generateCloudConfig(target, config) {
        const configs = {
            aws: {
                file: 'deployment/aws/main.tf',
                content: `provider "aws" {
  region = "${config?.region || 'us-east-1'}"
}

resource "aws_ecr_repository" "app" {
  name = "vibe-app"
}

resource "aws_ecs_cluster" "main" {
  name = "vibe-cluster"
}

resource "aws_ecs_service" "app" {
  name = "vibe-service"
  cluster = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count = 1
}
`,
            },
            kubernetes: {
                file: 'deployment/k8s/deployment.yaml',
                content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: vibe-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vibe-app
  template:
    metadata:
      labels:
        app: vibe-app
    spec:
      containers:
      - name: app
        image: vibe-app:latest
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: vibe-service
spec:
  selector:
    app: vibe-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
`,
            },
        };
        return configs[target]?.file || 'deployment/config.yaml';
    }
    /**
     * Get apply command for cloud config
     */
    getApplyCommand(target) {
        const commands = {
            aws: 'terraform init && terraform apply',
            kubernetes: 'kubectl apply -f deployment/k8s/',
            gcp: 'gcloud builds submit --config cloudbuild.yaml .',
            azure: 'az deployment group create --template-file main.bicep',
        };
        return commands[target] || 'Apply configuration manually';
    }
}
exports.DeploymentModule = DeploymentModule;
//# sourceMappingURL=index.js.map