import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

export class DependencyManager {
    static audit(projectPath: string = process.cwd()): string {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return 'No package.json found.';
        }

        try {
            console.log(chalk.cyan('Running npm audit...'));
            const output = execSync('npm audit --json', { encoding: 'utf-8' });
            return output;
        } catch (e: any) {
            return e.stdout || e.message;
        }
    }

    static async suggestUpdates(projectPath: string = process.cwd()): Promise<string[]> {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return [];

        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // In a real implementation, we would check registry for newer versions
        return Object.keys(deps).map(d => `${d}: latest available`);
    }
}
