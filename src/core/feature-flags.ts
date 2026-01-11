import { configManager } from './config-system';

export class FeatureFlags {
    private static readonly FLAGS: Record<string, boolean> = {
        'new-tui': true,
        'agent-mode': true,
        'local-models': true,
        'experimental-search': false,
    };

    static isEnabled(flag: string): boolean {
        const config = configManager.getConfig();
        // Allow overrides in config
        if ((config as any).featureFlags?.[flag] !== undefined) {
            return (config as any).featureFlags[flag];
        }
        return this.FLAGS[flag] || false;
    }

    static listFlags(): string[] {
        return Object.keys(this.FLAGS);
    }
}
