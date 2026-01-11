import { stateManager } from './state-manager';

export interface VibeSession {
    id: string;
    startTime: number;
    interactions: Array<{ input: string; output: any; timestamp: number }>;
}

export class SessionManager {
    private currentSession: VibeSession;

    constructor() {
        this.currentSession = {
            id: Math.random().toString(36).substring(7),
            startTime: Date.now(),
            interactions: [],
        };
    }

    record(input: string, output: any): void {
        this.currentSession.interactions.push({
            input,
            output,
            timestamp: Date.now(),
        });
        this.save();
    }

    private save(): void {
        stateManager.set(`session_${this.currentSession.id}`, this.currentSession);
    }

    async replay(sessionId: string): Promise<void> {
        const session = stateManager.get<VibeSession>(`session_${sessionId}`);
        if (!session) throw new Error('Session not found');

        for (const inter of session.interactions) {
            console.log(`\nReplaying: ${inter.input}`);
            // In a real TUI, we would simulate the output display
        }
    }

    listSessions(): string[] {
        // Queries state keys starting with session_
        return [];
    }
}
