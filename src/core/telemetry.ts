/**
 * VIBE CLI - Telemetry Service
 * Handles anonymous usage tracking and error reporting
 */

import axios from 'axios';
import { VibeConfigManager } from '../config.js';
import { VibeProviderRouter } from '../providers/router.js';
import { createLogger } from '../utils/pino-logger.js';
import { VIBE_VERSION } from '../version.js';

const logger = createLogger('telemetry');
const TELEMETRY_ENDPOINT = process.env.VIBE_TELEMETRY_URL || 'https://telemetry.vibe-cli.dev/api/telemetry';

export class TelemetryService {
    private configManager: VibeConfigManager;
    private enabled: boolean = false;

    constructor() {
        const router = new VibeProviderRouter();
        this.configManager = new VibeConfigManager(router);
        this.enabled = this.configManager.loadConfig().telemetry || false;
    }

    /**
     * Track a CLI event
     */
    async trackEvent(event: string, properties: Record<string, any> = {}) {
        if (!this.enabled) return;

        try {
            await axios.post(TELEMETRY_ENDPOINT, {
                type: 'event',
                event,
                version: VIBE_VERSION,
                platform: process.platform,
                arch: process.arch,
                timestamp: new Date().toISOString(),
                ...properties
            });
        } catch (error) {
            // Silently fail telemetry
            logger.debug({ error }, 'Telemetry event failed');
        }
    }

    /**
     * Report an error or crash
     */
    async reportError(error: Error, context: string) {
        if (!this.enabled) return;

        try {
            await axios.post(TELEMETRY_ENDPOINT, {
                type: 'error',
                message: error.message,
                stack: error.stack,
                context,
                version: VIBE_VERSION,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            logger.debug({ err }, 'Telemetry error report failed');
        }
    }

    /**
     * Toggle telemetry status
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        const config = this.configManager.loadConfig();
        this.configManager.saveConfig({ ...config, telemetry: enabled });
    }

    /**
     * Get current status
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}

export const telemetry = new TelemetryService();
