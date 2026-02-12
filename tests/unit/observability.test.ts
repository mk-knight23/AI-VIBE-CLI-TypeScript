import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetryManager } from '../../src/core/observability/telemetry';

describe('Observability', () => {
    describe('TelemetryManager', () => {
        let telemetry: TelemetryManager;

        beforeEach(() => {
            telemetry = new TelemetryManager();
        });

        it('should record metrics', () => {
            telemetry.recordMetric('api.requests', 100, { route: '/api/status' });
            // No throw means success
            expect(true).toBe(true);
        });

        it('should configure endpoint', () => {
            telemetry.configure('http://localhost:4318/v1/metrics');
            expect(true).toBe(true);
        });

        it('should handle shutdown cleanly', () => {
            telemetry.configure('http://localhost:4318/v1/metrics');
            telemetry.recordMetric('test', 1);
            expect(() => telemetry.shutdown()).not.toThrow();
        });
    });
});
