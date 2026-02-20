import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createLogger } from '../utils/pino-logger.js';

const logger = createLogger('SharedContext');
const SHARED_PATH = path.join(os.homedir(), '.vibe', 'shared_context.json');

export class SharedContext {
    private static instance: SharedContext;
    private data: Record<string, any> = {};

    private constructor() {
        this.load();
    }

    public static getInstance(): SharedContext {
        if (!SharedContext.instance) {
            SharedContext.instance = new SharedContext();
        }
        return SharedContext.instance;
    }

    public load(): void {
        try {
            if (fs.existsSync(SHARED_PATH)) {
                this.data = fs.readJsonSync(SHARED_PATH);
            }
        } catch (error: any) {
            logger.error(`Failed to load shared context: ${error.message}`);
        }
    }

    public save(): void {
        try {
            fs.ensureDirSync(path.dirname(SHARED_PATH));
            fs.writeJsonSync(SHARED_PATH, this.data, { spaces: 2 });
        } catch (error: any) {
            logger.error(`Failed to save shared context: ${error.message}`);
        }
    }

    public get(key: string): any {
        this.load(); // Ensure fresh data
        return this.data[key];
    }

    public set(key: string, value: any): void {
        this.data[key] = value;
        this.data['last_updated'] = new Date().toISOString();
        this.data['updated_by'] = 'vibe-cli';
        this.save();
    }

    public update(updates: Record<string, any>): void {
        this.load();
        this.data = { ...this.data, ...updates, last_updated: new Date().toISOString(), updated_by: 'vibe-cli' };
        this.save();
    }
}
