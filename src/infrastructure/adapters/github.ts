import axios from 'axios';
import { secretsManager } from '../../security/secrets-manager.js';

export class GitHubAdapter {
    private token: string | null = null;
    private initialized = false;

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return;
        this.token = await secretsManager.getSecret('GITHUB_TOKEN');
        this.initialized = true;
    }

    private get headers() {
        return {
            Authorization: `token ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
        };
    }

    async getIssues(owner: string, repo: string): Promise<any[]> {
        await this.ensureInitialized();
        if (!this.token) throw new Error('GITHUB_TOKEN not set.');
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            headers: this.headers,
        });
        return response.data;
    }

    async createPR(owner: string, repo: string, title: string, head: string, base: string, body: string): Promise<any> {
        await this.ensureInitialized();
        if (!this.token) throw new Error('GITHUB_TOKEN not set.');
        const response = await axios.post(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            title, head, base, body,
        }, { headers: this.headers });
        return response.data;
    }
}

