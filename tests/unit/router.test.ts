import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VibeProviderRouter } from '../../src/infrastructure/adapters/router';

describe('VibeProviderRouter', () => {
    let router: VibeProviderRouter;

    beforeEach(() => {
        router = new VibeProviderRouter();
    });

    it('should list providers', () => {
        const providers = router.listProviders();
        expect(Array.isArray(providers)).toBe(true);
    });

    it('should get status', () => {
        const status = router.getStatus();
        expect(status).toHaveProperty('provider');
        expect(status).toHaveProperty('model');
        expect(status).toHaveProperty('available');
        expect(status).toHaveProperty('configured');
    });

    it('should get usage stats', () => {
        const usage = router.getUsage();
        expect(usage).toHaveProperty('totalTokens');
        expect(usage).toHaveProperty('totalCost');
    });

    // Note: To properly test completion/chat, we'd need actual API keys.
    // These tests verify the router interface.
});
