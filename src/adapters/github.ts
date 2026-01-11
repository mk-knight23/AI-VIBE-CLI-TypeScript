import axios from 'axios';
import { secretsManager } from '../security/secrets-manager';

export class GitHubAdapter {
    private token: string;

    constructor() {
        this.token = secretsManager.getSecret('GITHUB_TOKEN') || '';
    }

    private get headers() {
        return {
            Authorization: `token ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
        };
    }

    async getIssues(owner: string, repo: string): Promise<any[]> {
        if (!this.token) throw new Error('GITHUB_TOKEN not set.');
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            headers: this.headers,
        });
        return response.data;
    }

    async createPR(owner: string, repo: string, title: string, head: string, base: string, body: string): Promise<any> {
        if (!this.token) throw new Error('GITHUB_TOKEN not set.');
        const response = await axios.post(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
            title, head, base, body,
        }, { headers: this.headers });
        return response.data;
    }
}
