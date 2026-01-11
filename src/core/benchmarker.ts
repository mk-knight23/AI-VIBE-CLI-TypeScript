import { VibeProviderRouter } from '../providers/router';
import { Spinner } from '../ui/progress/spinner';
import { formatTable } from '../ui/formatters/table';

export class Benchmarker {
    static async run(providerId: string): Promise<void> {
        const spinner = new Spinner(`Benchmarking ${providerId}...`);
        spinner.start();

        const router = new VibeProviderRouter();
        router.setProvider(providerId);

        const startTime = Date.now();
        try {
            const response = await router.complete('Write a 50-word poem about coding.');
            const duration = Date.now() - startTime;
            const tokens = response.usage?.totalTokens || 0;
            const tps = tokens / (duration / 1000);

            spinner.succeed(`Benchmark complete for ${providerId}`);

            console.log(formatTable(
                ['Metric', 'Value'],
                [
                    ['Latency', `${duration}ms`],
                    ['Tokens', tokens.toString()],
                    ['Throughput', `${tps.toFixed(2)} tokens/sec`],
                    ['Model', response.model]
                ]
            ));
        } catch (error: any) {
            spinner.fail(`Benchmark failed: ${error.message}`);
        }
    }
}
