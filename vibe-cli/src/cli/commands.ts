import inquirer from 'inquirer';
import pc from 'picocolors';
import { ApiClient } from '../core/api';
import { loadConfig, saveConfig } from '../core/config';
import { logger } from '../utils/logger';
import { startInteractive } from './interactive';
import { workflowCommand } from '../commands/workflow';
import { agentCommand } from '../commands/misc';

const client = new ApiClient();

interface ProgramCommand {
  name: string;
  description: string;
  action: (...args: any[]) => Promise<void>;
}

const commands: ProgramCommand[] = [
  {
    name: 'help',
    description: 'Show help information',
    action: async () => {
      logger.box('Vibe CLI v6.0', 'Next-Gen AI Development Platform');
      console.log('\n' + pc.bold('Usage:') + ' vibe [command] [options]\n');
      console.log(pc.bold('Commands:'));
      commands.forEach(c => {
        console.log(`  ${pc.cyan(c.name.padEnd(12))} ${c.description}`);
      });
      console.log('\n' + pc.bold('Interactive Commands:'));
      console.log('  /help       - Show interactive help');
      console.log('  /model      - Change AI model (dropdown)');
      console.log('  /provider   - Change provider (dropdown)');
      console.log('  /create     - Force create files from last response');
      console.log('  /tools      - List available tools');
      console.log('  /clear      - Clear conversation');
      console.log('  /quit       - Exit');
      console.log('\n' + pc.bold('Examples:'));
      console.log('  vibe                    # Start interactive chat');
      console.log('  vibe models             # List available models');
      console.log('  vibe provider megallm   # Switch to MegaLLM');
      console.log('  vibe config list        # Show configuration');
      console.log('  vibe version            # Show version\n');
    }
  },
  {
    name: 'chat',
    description: 'Start interactive chat session',
    action: async () => {
      await startInteractive(client);
    }
  },
  {
    name: 'config',
    description: 'Manage configuration',
    action: async (subcommand?: string, key?: string, value?: string) => {
      const cfg = loadConfig();
      
      if (subcommand === 'set' && key && value) {
        saveConfig({ ...cfg, [key]: value });
        logger.success(`✓ Set ${key} = ${value}`);
      } else if (subcommand === 'get' && key) {
        const val = cfg[key];
        if (val) {
          console.log(`${key} = ${val}`);
        } else {
          logger.warn(`${key} is not set`);
        }
      } else if (subcommand === 'list') {
        console.log('\n' + pc.bold('Configuration:'));
        console.log(JSON.stringify(cfg, null, 2) + '\n');
      } else if (subcommand === 'reset') {
        saveConfig({});
        logger.success('✓ Configuration reset');
      } else {
        logger.error('Usage: vibe config <set|get|list|reset> [key] [value]');
        console.log('\nExamples:');
        console.log('  vibe config list');
        console.log('  vibe config set openrouter.apiKey sk-...');
        console.log('  vibe config get openrouter.apiKey');
        console.log('  vibe config reset\n');
      }
    }
  },
  {
    name: 'models',
    description: 'List available models',
    action: async (provider?: string) => {
      try {
        if (provider) {
          const validProviders = ['openrouter', 'megallm', 'agentrouter', 'routeway'];
          if (!validProviders.includes(provider)) {
            logger.error(`Invalid provider: ${provider}`);
            console.log(`Valid providers: ${validProviders.join(', ')}\n`);
            return;
          }
          client.setProvider(provider as any);
        }
        
        const currentProvider = client.getProvider();
        const models = await client.fetchModels();
        
        console.log(`\n${pc.bold(`${currentProvider.toUpperCase()} Models`)} (${models.length}):\n`);
        models.forEach((m: any) => {
          const tokens = m.contextLength ? `${(m.contextLength / 1000).toFixed(0)}k` : 'N/A';
          console.log(`  ${pc.cyan(m.id || m.name)} ${pc.gray(`(${tokens} tokens)`)}`);
        });
        console.log();
      } catch (error: any) {
        logger.error(`Failed to fetch models: ${error.message}`);
      }
    }
  },
  {
    name: 'provider',
    description: 'Switch provider',
    action: async (name?: string) => {
      const providers = ['openrouter', 'megallm', 'agentrouter', 'routeway'];
      
      if (name && providers.includes(name)) {
        client.setProvider(name as any);
        logger.success(`✓ Switched to ${name}`);
        
        // Show available models
        const models = await client.fetchModels();
        console.log(`\n${models.length} models available\n`);
      } else if (name) {
        logger.error(`Invalid provider: ${name}`);
        console.log(`Valid providers: ${providers.join(', ')}\n`);
      } else {
        const { selected } = await inquirer.prompt<{ selected: string }>([{
          type: 'list',
          name: 'selected',
          message: 'Select provider:',
          choices: providers.map(p => ({
            name: p === 'megallm' ? `${p} (recommended)` : p,
            value: p
          }))
        }]);
        client.setProvider(selected as any);
        logger.success(`✓ Switched to ${selected}`);
      }
    }
  },
  {
    name: 'version',
    description: 'Show version information',
    action: async () => {
      console.log('\n' + pc.bold('Vibe CLI'));
      console.log('Version: ' + pc.cyan('6.0.0'));
      console.log('Node: ' + pc.gray(process.version));
      console.log('Platform: ' + pc.gray(process.platform));
      console.log();
    }
  },
  {
    name: 'status',
    description: 'Show system status',
    action: async () => {
      const cfg = loadConfig();
      const currentProvider = client.getProvider();
      
      console.log('\n' + pc.bold('System Status:'));
      console.log(`Provider: ${pc.cyan(currentProvider)}`);
      console.log(`Config: ${Object.keys(cfg).length} setting(s)`);
      console.log(`Working Directory: ${pc.gray(process.cwd())}`);
      console.log();
      
      // Test provider connection
      try {
        const models = await client.fetchModels();
        console.log(pc.green(`✓ ${currentProvider}: ${models.length} models available`));
      } catch (error: any) {
        console.log(pc.red(`✗ ${currentProvider}: ${error.message}`));
      }
      console.log();
    }
  },
  {
    name: 'workflow',
    description: 'Manage and run workflows',
    action: async (...args: string[]) => {
      await workflowCommand(args[0], args[1], {});
    }
  },
  // REMOVED: Template command - AI-ONLY generation required
  {
    name: 'metrics',
    description: 'View performance metrics',
    action: async (...args: string[]) => {
      console.log('Metrics not implemented');
    }
  },
  {
    name: 'analyze',
    description: 'Analyze project structure',
    action: async () => {
      const { ProjectAnalyzer } = await import('../commands/analyzers');
      const analyzer = new ProjectAnalyzer(process.cwd());
      const result = await analyzer.analyzeProject();
      console.log(result);
    }
  },
  {
    name: 'exec',
    description: 'Execute command safely',
    action: async (command: string) => {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const { stdout } = await promisify(exec)(command);
      console.log(stdout);
    }
  },
  {
    name: 'git',
    description: 'Git automation',
    action: async (action: string, ...args: any[]) => {
      const { GitOps } = await import('../commands/operations');
      const git = new GitOps();
      const result = await (git as any)[action]?.(...args);
      console.log(result);
    }
  },
  {
    name: 'file',
    description: 'File operations',
    action: async (action: string, ...args: any[]) => {
      console.log('File operations not implemented');
    }
  },
  {
    name: 'stream',
    description: 'Start streaming conversation',
    action: async () => {
      console.log('Streaming mode not implemented');
    }
  }
];

export const program = {
  parseAsync: async (args: string[]) => {
    const [, , command, ...rest] = args;
    
    // Handle flags
    if (command === '--help' || command === '-h') {
      const helpCmd = commands.find(c => c.name === 'help');
      if (helpCmd) await helpCmd.action();
      return;
    }
    
    if (command === '--version' || command === '-v' || command === 'version') {
      const versionCmd = commands.find(c => c.name === 'version');
      if (versionCmd) await versionCmd.action();
      return;
    }
    
    if (command === 'status') {
      const statusCmd = commands.find(c => c.name === 'status');
      if (statusCmd) await statusCmd.action();
      return;
    }
    
    if (!command || command === 'chat') {
      await startInteractive(client);
      return;
    }
    
    const cmd = commands.find(c => c.name === command);
    if (cmd) {
      try {
        await cmd.action(...rest);
      } catch (error: any) {
        logger.error(`Command failed: ${error.message}`);
        console.log('\nRun "vibe help" for usage information\n');
      }
    } else {
      logger.error(`Unknown command: ${command}`);
      console.log('\nAvailable commands:');
      commands.forEach(c => console.log(`  ${pc.cyan(c.name.padEnd(12))} ${c.description}`));
      console.log('\nRun "vibe help" for more information\n');
    }
  }
};
