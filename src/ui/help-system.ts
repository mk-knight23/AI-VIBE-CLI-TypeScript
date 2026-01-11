import chalk from 'chalk';
import { themeManager } from './themes/theme-manager';

export class HelpSystem {
    static show(context?: string): void {
        const theme = themeManager.getCurrentTheme();
        console.log(theme.accent('\n📖 VIBE Help System\n'));

        if (context === 'config') {
            console.log(`${theme.primary('/config')} - Configure providers and API keys`);
            console.log(`${theme.primary('/use <provider>')} - Switch default provider`);
            console.log(`${theme.primary('/model <model>')} - Switch default model`);
        } else if (context === 'mode') {
            console.log(`${theme.primary('/mode agent')} - Full autonomy mode`);
            console.log(`${theme.primary('/mode code')} - Focused code generation`);
            console.log(`${theme.primary('/mode ask')} - Chat-only mode`);
        } else {
            console.log(theme.text('Full command list:'));
            console.log(`${theme.primary('/help')} - Show this help`);
            console.log(`${theme.primary('/status')} - View CLI status`);
            console.log(`${theme.primary('/clear')} - Clear terminal`);
            console.log(`${theme.primary('/exit')} - Exit VIBE`);
        }
        console.log('');
    }
}
