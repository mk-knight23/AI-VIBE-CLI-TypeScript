/**
 * VIBE-CLI v12 - Core CLI Entry Point
 * Unified command interface with full MCP backbone
 */

import pc from 'picocolors';
import { VibeMemoryManager } from '../memory';
import { VibeApprovalManager } from '../approvals';
import { VibeProviderRouter } from '../providers/router';

export const VERSION = '12.0.0';

export interface VibeConfig {
  provider: string;
  model: string;
  autoApprove: boolean;
}

export interface VibeCLIBase {
  getMemory(): VibeMemoryManager;
  getApprovals(): VibeApprovalManager;
  getProviders(): VibeProviderRouter;
  getConfig(): VibeConfig;
}

export class VibeCLI implements VibeCLIBase {
  private config: VibeConfig;
  private memory: VibeMemoryManager;
  private approvals: VibeApprovalManager;
  private providers: VibeProviderRouter;

  constructor() {
    this.config = this.loadV12Config();
    this.memory = new VibeMemoryManager();
    this.approvals = new VibeApprovalManager();
    this.providers = new VibeProviderRouter();
  }

  private loadV12Config(): VibeConfig {
    return {
      provider: process.env.VIBE_PROVIDER || 'openrouter',
      model: process.env.VIBE_MODEL || 'anthropic/claude-sonnet-4',
      autoApprove: process.env.VIBE_AUTO_APPROVE === 'true'
    };
  }

  async run(args: string[]): Promise<void> {
    const command = args[0] || 'interactive';

    if (args.includes('--version') || args.includes('-v')) {
      console.log(`VIBE v${VERSION}`);
      return;
    }

    if (args.includes('--help') || args.includes('-h')) {
      this.printHelp();
      return;
    }

    console.log(pc.cyan(`\n🎨 VIBE v${VERSION}`));
    console.log(pc.gray(`Command: ${command}`));
    console.log(pc.gray(`Args: ${args.slice(1).join(' ')}\n`));
  }

  private printHelp(): void {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  VIBE v12 - The Advanced AI Coding Agent                  ║
║  Commands: ask, code, agent, plan, test, debug...         ║
╚═══════════════════════════════════════════════════════════╝
`);
  }

  getMemory() { return this.memory; }
  getApprovals() { return this.approvals; }
  getProviders() { return this.providers; }
  getConfig() { return this.config; }
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cli = new VibeCLI();
  
  try {
    await cli.run(args);
  } catch (error) {
    console.error(pc.red(`\n❌ Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
