import * as fs from 'fs';
import * as path from 'path';

export class CrossRepoScanner {
    static scan(rootDirs: string[]): any {
        const results: any[] = [];
        for (const dir of rootDirs) {
            if (fs.existsSync(dir)) {
                results.push({
                    repo: path.basename(dir),
                    hasVibe: fs.existsSync(path.join(dir, '.vibe')),
                    files: fs.readdirSync(dir).length,
                });
            }
        }
        return results;
    }
}
