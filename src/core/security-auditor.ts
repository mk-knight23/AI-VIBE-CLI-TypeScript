import * as fs from 'fs';
import * as path from 'path';
import { PIIScrubber } from '../security/pii-scrubber.js';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('SecurityAuditor');

const SECRET_PATTERNS = [
    { pattern: /sk-[a-zA-Z0-9]{32,}/, label: 'OpenAI API key' },
    { pattern: /sk-ant-[a-zA-Z0-9-]{80,}/, label: 'Anthropic API key' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, label: 'GitHub personal access token' },
    { pattern: /glpat-[a-zA-Z0-9\-_]{20}/, label: 'GitLab personal access token' },
    { pattern: /xoxb-[a-zA-Z0-9\-]+/, label: 'Slack bot token' },
    { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS access key ID' },
    { pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, label: 'Private key' },
    { pattern: /password\s*[:=]\s*['"][^'"]{4,}['"]/, label: 'Hardcoded password' },
];

const RISKY_PATTERNS = [
    { pattern: /\beval\s*\(/, label: 'eval() usage' },
    { pattern: /\bnew Function\s*\(/, label: 'new Function() usage' },
    { pattern: /child_process\.exec\s*\(/, label: 'Unsanitized exec()' },
    { pattern: /innerHTML\s*=/, label: 'innerHTML assignment (XSS risk)' },
];

const SCAN_EXTENSIONS = new Set(['.ts', '.js', '.json', '.env', '.yaml', '.yml', '.toml', '.cfg', '.conf']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vibe', 'coverage', '.next', 'build']);

export class SecurityAuditor {
    static auditFile(filePath: string): string[] {
        const content = fs.readFileSync(filePath, 'utf-8');
        const issues: string[] = [];

        for (const { pattern, label } of SECRET_PATTERNS) {
            if (pattern.test(content)) {
                issues.push(`Possible ${label} detected.`);
            }
        }

        for (const { pattern, label } of RISKY_PATTERNS) {
            if (pattern.test(content)) {
                issues.push(`Risky code: ${label}`);
            }
        }

        const scrubbed = PIIScrubber.scrub(content);
        if (scrubbed !== content) {
            issues.push('Possible PII detected in source code.');
        }

        return issues;
    }

    static auditProject(dir: string = process.cwd()): Record<string, string[]> {
        const results: Record<string, string[]> = {};

        const scanDir = (currentDir: string): void => {
            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(currentDir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    if (!SKIP_DIRS.has(entry.name)) {
                        scanDir(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (SCAN_EXTENSIONS.has(ext)) {
                        try {
                            const issues = this.auditFile(fullPath);
                            if (issues.length > 0) {
                                const relativePath = path.relative(dir, fullPath);
                                results[relativePath] = issues;
                            }
                        } catch (e: unknown) {
                            logger.warn({ file: fullPath }, 'Failed to audit file');
                        }
                    }
                }
            }
        };

        scanDir(dir);
        logger.info({ filesWithIssues: Object.keys(results).length }, 'Security audit complete');
        return results;
    }
}
