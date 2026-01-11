import * as fs from 'fs';

export class IaCHelper {
    static generateDockerfile(lang: string): string {
        switch (lang.toLowerCase()) {
            case 'node':
                return `FROM node:18-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nCMD ["npm", "start"]`;
            case 'python':
                return `FROM python:3.10-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD ["python", "main.py"]`;
            default:
                return 'FROM scratch';
        }
    }

    static generateDockerCompose(services: string[]): string {
        return `version: '3.8'\nservices:\n` + services.map(s => `  ${s}:\n    build: ./${s}`).join('\n');
    }

    static validateTerraform(filePath: string): boolean {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.includes('resource') && content.includes('provider');
    }
}
