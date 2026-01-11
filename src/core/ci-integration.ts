import axios from 'axios';
import { secretsManager } from '../security/secrets-manager';

export class CIIntegration {
    async triggerGitHubAction(owner: string, repo: string, workflowId: string, ref: string = 'main'): Promise<any> {
        const token = await secretsManager.getSecret('GITHUB_TOKEN');
        const response = await axios.post(
            `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
            { ref },
            { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
        );
        return response.data;
    }

    async getBuildStatus(owner: string, repo: string, runId: string): Promise<string> {
        const token = await secretsManager.getSecret('GITHUB_TOKEN');
        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
            { headers: { Authorization: `token ${token}` } }
        );
        return response.data.status; // e.g., 'completed', 'in_progress'
    }
}
