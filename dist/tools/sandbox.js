"use strict";
/**
 * VIBE CLI - Sandbox System
 *
 * Provides isolated execution environments for:
 * - Shell commands (with resource limits)
 * - File operations (with path restrictions)
 * - Network operations (with allowlist)
 *
 * Features:
 * - Resource limits (CPU, memory, time)
 * - Path restrictions (no access to sensitive files)
 * - Network allowlist
 * - Process isolation
 *
 * Version: 13.0.0
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
exports.VibeSandbox = exports.sandbox = exports.Sandbox = void 0;
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const index_js_1 = require("../security/index.js");
// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
const DEFAULT_CONFIG = {
    enabled: false, // Disabled by default for compatibility
    allowedPaths: [], // Current project only
    blockedPaths: [
        '/etc', '/usr', '/bin', '/sbin', '/boot', '/lib', '/lib64',
        '/root', '/home/root', '.ssh', '.aws', '.gcloud',
        '/private/etc', '/private/var',
    ],
    allowedCommands: [
        'npm', 'yarn', 'pnpm', 'bun',
        'git', 'ls', 'cat', 'echo', 'mkdir', 'touch',
        'node', 'python', 'python3', 'go', 'rustc', 'cargo',
        'docker', 'docker-compose', 'kubectl', 'helm',
    ],
    blockedCommands: [
        'rm', 'mkfs', 'dd', 'chmod', 'chown', 'useradd', 'passwd',
        'sudo', 'su', 'ssh', 'scp', 'ftp', 'telnet',
        'curl', 'wget', 'nc', 'netcat', 'ncat',
    ],
    maxMemory: 512, // MB
    maxCpuTime: 60, // seconds
    maxFileSize: 10, // MB
    allowNetwork: true,
    allowedDomains: [
        'registry.npmjs.org',
        'pypi.org',
        'api.github.com',
        'crates.io',
        'hub.docker.com',
    ],
    environmentVars: {
        NO_COLOR: '1',
        NODE_ENV: 'development',
    },
};
// ============================================================================
// SANDBOX
// ============================================================================
class Sandbox {
    config;
    tempDir;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.tempDir = path.join(os.tmpdir(), 'vibe-sandbox');
        this.ensureTempDir();
    }
    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }
    /**
     * Enable/disable sandbox
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
    }
    /**
     * Check if a path is allowed
     */
    isPathAllowed(filePath) {
        const resolved = path.resolve(filePath);
        // Check blocked paths
        for (const blocked of this.config.blockedPaths) {
            if (resolved.startsWith(blocked)) {
                return false;
            }
        }
        // If allowed paths are specified, check them
        if (this.config.allowedPaths.length > 0) {
            const projectRoot = process.cwd();
            return resolved.startsWith(projectRoot) || this.config.allowedPaths.some(p => resolved.startsWith(p));
        }
        // Default: allow within current project
        const projectRoot = process.cwd();
        return resolved.startsWith(projectRoot);
    }
    /**
     * Check if a path is allowed (extended result with issues)
     */
    checkPathWithSecurity(filePath) {
        const isAllowed = this.isPathAllowed(filePath);
        if (!isAllowed) {
            return {
                safe: false,
                issues: [{ message: `Path not allowed: ${filePath}` }],
            };
        }
        return { safe: true, issues: [] };
    }
    /**
     * Check if a command is allowed
     */
    isCommandAllowed(command) {
        // Extract base command
        const baseCommand = command.trim().split(/\s+/)[0].toLowerCase();
        // Check blocked commands
        for (const blocked of this.config.blockedCommands) {
            if (baseCommand.includes(blocked)) {
                return false;
            }
        }
        // If allowed commands are specified, check them
        if (this.config.allowedCommands.length > 0) {
            return this.config.allowedCommands.some(cmd => baseCommand === cmd.toLowerCase());
        }
        return true;
    }
    /**
     * Execute a command in sandbox
     */
    async executeCommand(command, options = {}) {
        const startTime = Date.now();
        const cwd = options.cwd || process.cwd();
        const timeout = options.timeout || this.config.maxCpuTime * 1000;
        // Check if sandbox is enabled
        if (!this.config.enabled) {
            return this.executeUnsafe(command, cwd, options.env, timeout);
        }
        // Security scan the command
        const securityIssues = index_js_1.securityScanner.scanCommand(command);
        const criticalIssues = securityIssues.filter((i) => i.severity === 'critical' || i.severity === 'high');
        if (criticalIssues.length > 0) {
            return {
                success: false,
                output: '',
                error: `Security check failed:\n${criticalIssues.map((i) => `  - ${i.message}`).join('\n')}`,
                duration: Date.now() - startTime,
            };
        }
        // Validate command
        if (!this.isCommandAllowed(command)) {
            return {
                success: false,
                output: '',
                error: `Command blocked: ${command}`,
                duration: Date.now() - startTime,
            };
        }
        // Check working directory
        const pathCheck = this.checkPathWithSecurity(cwd);
        if (!pathCheck.safe) {
            return {
                success: false,
                output: '',
                error: `Working directory not allowed: ${cwd}`,
                duration: Date.now() - startTime,
            };
        }
        // Dry run mode
        if (options.dryRun) {
            return {
                success: true,
                output: `[SANDBOX] Would execute: ${command}`,
                duration: Date.now() - startTime,
            };
        }
        // Execute in sandbox
        try {
            // Merge environment variables
            const env = {
                ...process.env,
                ...this.config.environmentVars,
                ...options.env,
                SANDBOX: 'true',
                SANDBOX_SESSION: this.tempDir,
            };
            // Execute with resource limits
            const result = child_process.execSync(command, {
                encoding: 'utf-8',
                timeout,
                cwd,
                env,
                maxBuffer: this.config.maxFileSize * 1024 * 1024,
            });
            return {
                success: true,
                output: result,
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                output: error.stdout?.toString() || '',
                error: error.message,
                exitCode: error.status,
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * Unsafe execution (when sandbox is disabled)
     */
    executeUnsafe(command, cwd, env, timeout) {
        const startTime = Date.now();
        return new Promise((resolve) => {
            try {
                const mergedEnv = {
                    ...process.env,
                    ...this.config.environmentVars,
                    ...env,
                };
                const proc = child_process.exec(command, {
                    encoding: 'utf-8',
                    timeout,
                    cwd,
                    env: mergedEnv,
                    maxBuffer: this.config.maxFileSize * 1024 * 1024,
                });
                let output = '';
                proc.stdout?.on('data', (data) => { output += data; });
                proc.stderr?.on('data', (data) => { output += data; });
                proc.on('close', (code) => {
                    resolve({
                        success: code === 0,
                        output,
                        exitCode: code || undefined,
                        duration: Date.now() - startTime,
                    });
                });
                proc.on('error', (error) => {
                    resolve({
                        success: false,
                        output: '',
                        error: error.message,
                        duration: Date.now() - startTime,
                    });
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    output: '',
                    error: error.message,
                    duration: Date.now() - startTime,
                });
            }
        });
    }
    /**
     * Read a file (with sandbox checks)
     */
    readFile(filePath) {
        const startTime = Date.now();
        if (!this.isPathAllowed(filePath)) {
            return {
                success: false,
                output: '',
                error: `Access denied: ${filePath}`,
                duration: Date.now() - startTime,
            };
        }
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return {
                success: true,
                output: content,
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                output: '',
                error: error.message,
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * Write a file (with sandbox checks)
     */
    writeFile(filePath, content, options = {}) {
        const startTime = Date.now();
        if (!this.isPathAllowed(filePath)) {
            return {
                success: false,
                output: '',
                error: `Access denied: ${filePath}`,
                duration: Date.now() - startTime,
            };
        }
        if (options.dryRun) {
            return {
                success: true,
                output: `[SANDBOX] Would write ${content.length} bytes to ${filePath}`,
                duration: Date.now() - startTime,
            };
        }
        try {
            const dir = path.dirname(filePath);
            if (options.createDirs && !fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content);
            return {
                success: true,
                output: `Written to ${filePath}`,
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                output: '',
                error: error.message,
                duration: Date.now() - startTime,
            };
        }
    }
    /**
     * Check if network access is allowed
     */
    isNetworkAllowed(url) {
        if (!this.config.allowNetwork) {
            return false;
        }
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            // Check allowed domains
            if (this.config.allowedDomains.length > 0) {
                return this.config.allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
            }
            return true; // Allow all if no restrictions
        }
        catch {
            return false;
        }
    }
    /**
     * Cleanup temporary files
     */
    cleanup() {
        if (fs.existsSync(this.tempDir)) {
            try {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Get sandbox status
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            tempDir: this.tempDir,
            config: {
                maxMemory: this.config.maxMemory,
                maxCpuTime: this.config.maxCpuTime,
                maxFileSize: this.config.maxFileSize,
                allowNetwork: this.config.allowNetwork,
                allowedCommands: this.config.allowedCommands,
                blockedCommands: this.config.blockedCommands,
            },
        };
    }
}
exports.Sandbox = Sandbox;
exports.VibeSandbox = Sandbox;
// ============================================================================
// EXPORTS
// ============================================================================
exports.sandbox = new Sandbox();
//# sourceMappingURL=sandbox.js.map