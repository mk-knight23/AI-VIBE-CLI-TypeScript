import chalk from 'chalk';

export class ErrorEnhancer {
    static enhance(error: string): string {
        let fix = '';

        if (error.includes('ENOENT')) {
            fix = 'The file or directory was not found. Check the path and try again.';
        } else if (error.includes('EACCES') || error.includes('EPERM')) {
            fix = 'Permission denied. Try running with sudo or check file permissions.';
        } else if (error.includes('401') || error.includes('Unauthorized')) {
            fix = 'Authentication failed. Check your API keys with /config.';
        } else if (error.includes('socket hang up') || error.includes('ETIMEDOUT')) {
            fix = 'Network error. Check your internet connection or use /mode local.';
        }

        if (fix) {
            return `\n${chalk.red('✗ Error:')} ${error}\n${chalk.cyan('💡 Suggestion:')} ${fix}\n`;
        }

        return `\n${chalk.red('✗ Error:')} ${error}\n`;
    }
}
