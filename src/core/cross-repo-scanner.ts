import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('CrossRepoScanner');

export interface RepoInfo {
    repo: string;
    path: string;
    hasVibe: boolean;
    hasGit: boolean;
    fileCount: number;
    languages: string[];
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

const LANGUAGE_INDICATORS: Record<string, string> = {
    'tsconfig.json': 'TypeScript',
    'package.json': 'JavaScript/Node',
    'Cargo.toml': 'Rust',
    'go.mod': 'Go',
    'requirements.txt': 'Python',
    'Gemfile': 'Ruby',
    'pom.xml': 'Java',
    'build.gradle': 'Java/Kotlin',
};

const PACKAGE_MANAGERS: Record<string, 'npm' | 'yarn' | 'pnpm' | 'bun'> = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm',
    'bun.lockb': 'bun',
};

export class CrossRepoScanner {
    static scan(rootDirs: string[]): RepoInfo[] {
        const results: RepoInfo[] = [];

        for (const dir of rootDirs) {
            if (!fs.existsSync(dir)) {
                logger.warn({ dir }, 'Directory does not exist, skipping');
                continue;
            }

            try {
                const files = fs.readdirSync(dir);
                const languages: string[] = [];
                let packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | undefined;

                for (const [file, lang] of Object.entries(LANGUAGE_INDICATORS)) {
                    if (files.includes(file)) languages.push(lang);
                }

                for (const [file, pm] of Object.entries(PACKAGE_MANAGERS)) {
                    if (files.includes(file)) {
                        packageManager = pm;
                        break;
                    }
                }

                results.push({
                    repo: path.basename(dir),
                    path: dir,
                    hasVibe: fs.existsSync(path.join(dir, '.vibe')),
                    hasGit: fs.existsSync(path.join(dir, '.git')),
                    fileCount: files.length,
                    languages: [...new Set(languages)],
                    packageManager,
                });
            } catch (e: unknown) {
                logger.warn({ dir }, 'Failed to scan directory');
            }
        }

        logger.info({ reposScanned: results.length }, 'Cross-repo scan complete');
        return results;
    }

    static discoverRepos(parentDir: string): RepoInfo[] {
        if (!fs.existsSync(parentDir)) return [];

        const entries = fs.readdirSync(parentDir, { withFileTypes: true });
        const repoDirs = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('.'))
            .map(e => path.join(parentDir, e.name))
            .filter(d => fs.existsSync(path.join(d, '.git')) || fs.existsSync(path.join(d, 'package.json')));

        return this.scan(repoDirs);
    }
}
