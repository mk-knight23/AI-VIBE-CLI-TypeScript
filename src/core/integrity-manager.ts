import crypto from 'crypto';
import fs from 'fs';

export class IntegrityManager {
    static verify(filePath: string, signature: string, publicKey: string): boolean {
        try {
            const data = fs.readFileSync(filePath);
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            return verify.verify(publicKey, signature, 'hex');
        } catch {
            return false;
        }
    }

    static getHash(filePath: string): string {
        const data = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
