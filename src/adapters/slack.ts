import axios from 'axios';
import { secretsManager } from '../security/secrets-manager';

export class SlackAdapter {
    private async getWebhookUrl(): Promise<string> {
        return await secretsManager.getSecret('SLACK_WEBHOOK_URL') || '';
    }

    async sendMessage(text: string, channel?: string): Promise<void> {
        const url = await this.getWebhookUrl();
        if (!url) throw new Error('SLACK_WEBHOOK_URL not set.');

        await axios.post(url, {
            text,
            channel: channel || '#vibe-cli',
        });
    }

    async sendReport(title: string, data: any): Promise<void> {
        const text = `*VIBE Report: ${title}*\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``;
        await this.sendMessage(text);
    }
}
