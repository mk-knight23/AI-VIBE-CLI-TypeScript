import { execSync } from 'child_process';
import chalk from 'chalk';
import { Spinner } from '../ui/progress/spinner';

export class UpdateManager {
    static async update(): Promise<void> {
        const spinner = new Spinner('Checking for updates...');
        spinner.start();

        try {
            // Check npm for latest version
            const latest = execSync('npm show @vibe/cli version').toString().trim();
            const current = require('../../package.json').version;

            if (latest === current) {
                spinner.succeed(`VIBE is already up to date (v${current})`);
                return;
            }

            spinner.text = `Updating VIBE from v${current} to v${latest}...`;
            execSync('npm install -g @vibe/cli@latest');
            spinner.succeed(`Successfully updated VIBE to v${latest}`);
        } catch (error: any) {
            spinner.fail(`Update failed: ${error.message}`);
            console.log(chalk.gray('\nTry running: npm install -g @vibe/cli@latest\n'));
        }
    }
}
