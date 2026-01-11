export interface Template {
    name: string;
    description: string;
    files: Record<string, string>;
}

export const templates: Record<string, Template> = {
    'nodejs-basic': {
        name: 'Node.js Basic',
        description: 'A simple Node.js project with TypeScript and Vitest',
        files: {
            'package.json': JSON.stringify({
                name: 'vibe-project',
                version: '1.0.0',
                scripts: { test: 'vitest' },
                devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' }
            }, null, 2),
            'tsconfig.json': JSON.stringify({
                compilerOptions: { target: 'ESNext', module: 'NodeNext', strict: true }
            }, null, 2),
            'src/index.ts': 'console.log("Hello from VIBE!");\n',
        },
    },
    'web-vanilla': {
        name: 'Vanilla Web',
        description: 'A basic HTML/JS/CSS project',
        files: {
            'index.html': '<!DOCTYPE html><html><body><h1>Vibe App</h1><script src="app.js"></script></body></html>',
            'style.css': 'body { font-family: sans-serif; }',
            'app.js': 'console.log("Vibe is active!");',
        },
    },
};
