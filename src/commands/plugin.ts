/**
 * VIBE CLI - Plugin Commands
 * CLI commands for plugin management
 */

import chalk from 'chalk';
import { pluginRegistry } from '../core/plugin-system/registry.js';
import { loadPlugin } from '../core/plugin-system/loader.js';
import { Command } from 'commander';

/**
 * List installed plugins
 */
export function listPlugins() {
    const plugins = pluginRegistry.listPlugins();

    if (plugins.length === 0) {
        console.log(chalk.yellow('\n🧩 No plugins installed.'));
        console.log(chalk.gray('   Use "vibe plugin install <path>" to add one.'));
        return;
    }

    console.log(chalk.cyan('\n🧩 Installed Plugins'));
    console.log(chalk.gray('─'.repeat(40)));

    for (const plugin of plugins) {
        const statusIcon = plugin.enabled ? chalk.green('●') : chalk.gray('○');
        console.log(`${statusIcon} ${chalk.bold(plugin.manifest.name)} v${plugin.manifest.version}`);
        console.log(`   ${plugin.manifest.description}`);
        console.log(chalk.gray(`   Path: ${plugin.path}\n`));
    }
}

/**
 * Install a plugin from a local directory or remote marketplace
 */
export async function installPlugin(pluginPathOrId: string, program: Command) {
    try {
        // Check if it's a local path
        if (pluginPathOrId.startsWith('.') || pluginPathOrId.startsWith('/') || pluginPathOrId.includes(':')) {
            console.log(chalk.blue(`\n📥 Installing plugin from local path: ${pluginPathOrId}...`));
            const result = await loadPlugin(pluginPathOrId, program);
            pluginRegistry.registerPlugin(result.manifest, pluginPathOrId);
            console.log(chalk.green(`\n✅ Plugin "${result.manifest.name}" installed successfully!`));
        } else {
            // It's a marketplace ID
            console.log(chalk.blue(`\n🌐 Fetching plugin "${pluginPathOrId}" from marketplace...`));
            const result = await pluginRegistry.installFromMarketplace(pluginPathOrId);
            if (result.success) {
                console.log(chalk.green(`\n✅ ${result.message}`));
                console.log(chalk.gray(`   (Note: This is a simulated installation for the Phase 7 MVP)`));
            }
        }
    } catch (error: any) {
        console.log(chalk.red(`\n❌ Failed to install plugin: ${error.message}`));
    }
}

/**
 * Search for plugins in the marketplace
 */
export async function searchPlugins() {
    console.log(chalk.blue('\n🔍 Searching Marketplace...'));
    const plugins = await pluginRegistry.searchMarketplace();

    if (plugins.length === 0) {
        console.log(chalk.yellow('\n🧩 No plugins found in the marketplace.'));
        return;
    }

    console.log(chalk.cyan(`\n🧩 Marketplace Results (${plugins.length})`));
    console.log(chalk.gray('─'.repeat(40)));

    for (const plugin of plugins) {
        console.log(`${chalk.bold(plugin.id)} v${plugin.version}`);
        console.log(`   ${plugin.name}`);
        console.log(chalk.gray(`   ID: ${plugin.id}\n`));
    }
}

/**
 * Uninstall a plugin
 */
export function uninstallPlugin(name: string) {
    const plugins = pluginRegistry.listPlugins();
    const plugin = plugins.find(p => p.manifest.name === name);

    if (!plugin) {
        console.log(chalk.red(`\n❌ Plugin "${name}" not found.`));
        return;
    }

    pluginRegistry.unregisterPlugin(name);
    console.log(chalk.green(`\n✅ Plugin "${name}" uninstalled.`));
}

/**
 * Toggle plugin status
 */
export function togglePlugin(name: string, enabled: boolean) {
    const plugins = pluginRegistry.listPlugins();
    const plugin = plugins.find(p => p.manifest.name === name);

    if (!plugin) {
        console.log(chalk.red(`\n❌ Plugin "${name}" not found.`));
        return;
    }

    pluginRegistry.setPluginStatus(name, enabled);
    const status = enabled ? chalk.green('enabled') : chalk.yellow('disabled');
    console.log(chalk.green(`\n✅ Plugin "${name}" ${status}.`));
}

/**
 * Show plugin help
 */
export function showPluginHelp() {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  VIBE Plugins - Extend VIBE capability                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk.bold('Usage')}                                                       ║
║    vibe plugin <command> [args]                               ║
║                                                               ║
║  ${chalk.bold('Commands')}                                                    ║
║    list              List installed plugins                   ║
║    search            Search remote marketplace                ║
║    install <path|id> Install a plugin (local or remote)      ║
║    uninstall <name>  Remove an installed plugin               ║
║    enable <name>     Enable a plugin                          ║
║    disable <name>    Disable a plugin                         ║
║                                                               ║
║  ${chalk.bold('Examples')}                                                    ║
║    vibe plugin install ./my-plugin                            ║
║    vibe plugin disable custom-viewer                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));
}
