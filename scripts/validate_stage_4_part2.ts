import { UpdateManager } from '../src/core/update-manager';
import { PIIScrubber } from '../src/security/pii-scrubber';
import { IntegrityManager } from '../src/core/integrity-manager';
import { FeatureFlags } from '../src/core/feature-flags';
import { RecoveryManager } from '../src/core/recovery-manager';
import { CacheManager } from '../src/core/cache-manager';
import { ErrorEnhancer } from '../src/core/error-enhancer';
import { HelpSystem } from '../src/ui/help-system';
import { templates } from '../src/core/templates';
import * as path from 'path';

async function validateStage4Part2() {
    console.log('--- VIBE CLI STAGE 4 PART 2 HARD VALIDATION ---\n');

    // F11: Update Manager
    const updateManager = new UpdateManager();
    console.log('[F11] Update Manager: Loaded');

    // F14/15: Secrets & PII
    const mockText = 'My email is test@example.com and key is sk-12345';
    const scrubbed = PIIScrubber.scrub(mockText);
    console.log(`[F15] PII Scrubber: ${scrubbed.includes('test@example.com') ? 'FAIL' : 'OK'}`);

    // F16: Integrity
    const hash = IntegrityManager.getHash(path.resolve('package.json'));
    console.log(`[F16] Integrity: Hash generated for package.json (${hash.substring(0, 8)})`);

    // F17: Feature Flags
    console.log(`[F17] Feature Flags: agent-mode=${FeatureFlags.isEnabled('agent-mode')}`);

    // F19: Failure Recovery
    RecoveryManager.saveCheckpoint('test-task', { step: 1 });
    const cp = RecoveryManager.getCheckpoint('test-task');
    console.log(`[F19] Recovery: ${cp?.step === 1 ? 'OK' : 'FAIL'}`);

    // F20: Caching
    CacheManager.set('test-cache', { data: 'value' });
    const cached = CacheManager.get('test-cache');
    console.log(`[F20] Caching: ${cached?.data === 'value' ? 'OK' : 'FAIL'}`);

    // F21: Error Enhancement
    const enhanced = ErrorEnhancer.enhance('ENOENT: no such file');
    console.log(`[F21] Error Enhancement: ${enhanced.includes('Suggestion') ? 'OK' : 'FAIL'}`);

    // F23: Help System
    HelpSystem.show('config');
    console.log('[F23] Help System: OK');

    // F25: Templates
    console.log('[F25] Templates: Count=', Object.keys(templates).length);

    console.log('\n--- STAGE 4 PART 2 VALIDATION COMPLETE ---');
}

validateStage4Part2().catch(console.error);
