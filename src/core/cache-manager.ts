import { stateManager } from './state-manager';
import crypto from 'crypto';

export class CacheManager {
    static get(key: string): any | null {
        const hash = this.hash(key);
        const entry = stateManager.get<any>(`cache_${hash}`);

        if (!entry) return null;

        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            stateManager.set(`cache_${hash}`, null);
            return null;
        }

        return entry.value;
    }

    static set(key: string, value: any, ttlSeconds: number = 3600): void {
        const hash = this.hash(key);
        const entry = {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        };
        stateManager.set(`cache_${hash}`, entry);
    }

    private static hash(key: string): string {
        return crypto.createHash('md5').update(key).digest('hex');
    }

    static clean(): void {
        // Logic to remove expired entries would go here
    }
}
