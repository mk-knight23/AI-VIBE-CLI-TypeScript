import { stateManager } from './state-manager';

export class AnalyticsManager {
    static trackEvent(type: string, data: any): void {
        const events = stateManager.get<any[]>('analytics_events') || [];
        events.push({ type, data, timestamp: Date.now() });
        stateManager.set('analytics_events', events);
    }

    static getReport(): any {
        const events = stateManager.get<any[]>('analytics_events') || [];
        return {
            totalEvents: events.length,
            byType: events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {}),
        };
    }
}
