import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('telemetry');

export interface MetricEvent {
    name: string;
    value: number;
    labels?: Record<string, string>;
    timestamp?: string;
}

/**
 * A lightweight telemetry hook for OpenTelemetry-ready metrics.
 * This implementation buffers events for later export to an OTLP endpoint.
 */
export class TelemetryManager {
    private buffer: MetricEvent[] = [];
    private flushInterval: NodeJS.Timeout | null = null;
    private endpoint: string | null = null;

    public configure(endpoint: string) {
        this.endpoint = endpoint;
        this.startAutoFlush();
    }

    public recordMetric(name: string, value: number, labels?: Record<string, string>) {
        this.buffer.push({
            name,
            value,
            labels,
            timestamp: new Date().toISOString()
        });
        logger.debug({ name, value }, 'Metric recorded');
    }

    private startAutoFlush() {
        if (this.flushInterval) return;
        this.flushInterval = setInterval(() => this.flush(), 30000);
    }

    public async flush() {
        if (this.buffer.length === 0 || !this.endpoint) return;

        const batch = [...this.buffer];
        this.buffer = [];

        // Placeholder: In production, send to OTLP endpoint
        logger.info({ count: batch.length, endpoint: this.endpoint }, 'Flushing metrics');
        // await fetch(this.endpoint, { method: 'POST', body: JSON.stringify(batch) });
    }

    public shutdown() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        this.flush();
    }
}

export const telemetry = new TelemetryManager();
