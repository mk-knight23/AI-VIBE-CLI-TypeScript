import os from 'os';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { formatTable } from '../ui/formatters/table.js';

export class Diagnostics {
    static check(): void {
        console.log(chalk.bold('\n🔍 VIBE CLI Diagnostics\n'));

        const checks = this.getDiagnosticsData();

        const table = formatTable(
            ['Check', 'Result', 'Status'],
            checks.map(c => [c.name, c.value, c.status])
        );

        console.log(table);
    }

    static getDiagnosticsData() {
        return [
            { name: 'OS', value: `${os.type()} ${os.release()} (${os.arch()})`, status: 'OK' },
            { name: 'Node.js', value: process.version, status: 'OK' },
            { name: 'Git', value: this.getGitVersion(), status: this.getGitVersion() !== 'Not found' ? 'OK' : 'FAIL' },
            { name: 'VIBE Config', value: this.checkConfig(), status: 'OK' },
            { name: 'Workspace', value: process.cwd(), status: 'OK' },
        ];
    }

    private static getGitVersion(): string {
        try {
            return execSync('git --version').toString().trim();
        } catch {
            return 'Not found';
        }
    }

    private static checkConfig(): string {
        const projectConfig = require('path').join(process.cwd(), '.vibe', 'config.json');
        const globalConfig = require('path').join(os.homedir(), '.vibe', 'config.json');

        let info = '';
        if (require('fs').existsSync(projectConfig)) info += 'Project-local ';
        if (require('fs').existsSync(globalConfig)) info += 'Global ';

        return info || 'None (using defaults)';
    }
}
