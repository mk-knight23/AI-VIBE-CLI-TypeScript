import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { Spinner } from '../ui/progress/spinner';

export class Bootstrapper {
    static async init(projectPath: string = process.cwd()): Promise<boolean> {
        const spinner = new Spinner('Bootstrapping VIBE project...');
        spinner.start();

        try {
            const vibeDir = path.join(projectPath, '.vibe');
            if (!fs.existsSync(vibeDir)) {
                fs.mkdirSync(vibeDir, { recursive: true });
            }

            // Create default config if not exists
            const configPath = path.join(vibeDir, 'config.json');
            if (!fs.existsSync(configPath)) {
                const defaultConfig = {
                    model: { defaultTier: 'balanced' },
                    approval: { defaultPolicy: 'prompt' },
                    theme: 'vibe'
                };
                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            }

            // Create .vibeignore
            const ignorePath = path.join(projectPath, '.vibeignore');
            if (!fs.existsSync(ignorePath)) {
                const defaultIgnore = 'node_modules\n.git\n.vibe\ndist\n';
                fs.writeFileSync(ignorePath, defaultIgnore);
            }

            spinner.succeed('Project bootstrapped successfully');
            return true;
        } catch (error: any) {
            spinner.fail(`Bootstrapping failed: ${error.message}`);
            return false;
        }
    }
}
