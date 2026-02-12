import { DeterminismContext } from '../../types/contracts/determinism.js';
import { createLogger } from '../../utils/pino-logger.js';

const logger = createLogger('determinism');

export interface RecordedCall {
    tool: string;
    input: any;
    output: any;
    timestamp: string;
}

export class DeterminismManager {
    private context: DeterminismContext;
    private isReplay: boolean;
    private history: RecordedCall[] = [];
    private replayIndex: number = 0;

    constructor(context?: DeterminismContext) {
        this.context = context || {
            isReplay: false,
            recordedIO: []
        };
        this.isReplay = !!this.context.isReplay;
        this.history = this.context.recordedIO || [];
    }

    public async executeProxy<T>(
        toolName: string,
        input: any,
        fn: () => Promise<T>
    ): Promise<T> {
        if (this.isReplay) {
            return this.replay(toolName, input);
        }

        const result = await fn();

        // Always record if not in replay mode (could be filtered later)
        this.record(toolName, input, result);

        return result;
    }

    private record(toolName: string, input: any, output: any) {
        this.history.push({
            tool: toolName,
            input,
            output,
            timestamp: new Date().toISOString()
        });
        logger.debug({ tool: toolName }, 'Recorded tool call');
    }

    private async replay(toolName: string, input: any): Promise<any> {
        const call = this.history[this.replayIndex];

        if (!call || call.tool !== toolName) {
            throw new Error(`Determinism Replay Mismatch: Expected ${toolName} but found ${call?.tool || 'end of history'} at index ${this.replayIndex}`);
        }

        this.replayIndex++;
        logger.info({ tool: toolName, index: this.replayIndex - 1 }, 'Replaying tool call from history');
        return call.output;
    }

    public getContext(): DeterminismContext {
        return {
            isReplay: this.isReplay,
            seed: this.context.seed,
            recordedIO: this.history
        };
    }

    public setReplayMode(enabled: boolean) {
        this.isReplay = enabled;
    }
}
