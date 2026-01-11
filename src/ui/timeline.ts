import chalk from 'chalk';
import { themeManager } from '../ui/themes/theme-manager';

export interface VibeEvent {
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error' | 'start' | 'end';
    message: string;
}

export class EventTimeline {
    private events: VibeEvent[] = [];

    add(type: VibeEvent['type'], message: string): void {
        this.events.push({ timestamp: new Date(), type, message });
    }

    render(): void {
        const theme = themeManager.getCurrentTheme();
        console.log(theme.accent('\n📜 Event Timeline\n'));

        this.events.forEach((event, i) => {
            const time = event.timestamp.toLocaleTimeString([], { hour12: false });
            let icon = '•';
            let color = theme.text;

            switch (event.type) {
                case 'start': icon = '🚀'; color = theme.primary; break;
                case 'end': icon = '🏁'; color = theme.success; break;
                case 'success': icon = '✓'; color = theme.success; break;
                case 'warning': icon = '⚠'; color = theme.warning; break;
                case 'error': icon = '✗'; color = theme.error; break;
            }

            console.log(`${theme.dim(time)} ${color(icon)} ${event.message}`);
            if (i < this.events.length - 1) {
                console.log(theme.dim('│'));
            }
        });
        console.log('');
    }

    clear(): void {
        this.events = [];
    }
}

export const timeline = new EventTimeline();
