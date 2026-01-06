"use strict";
/**
 * VIBE-CLI v12 - Configuration & BYOK (Bring Your Own Key) Manager
 * Handles API key input, secure storage, and provider configuration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const chalk_1 = __importDefault(require("chalk"));
const router_1 = require("./providers/router");
const ui_1 = require("./cli/ui");
class VibeConfigManager {
    configDir;
    configPath;
    provider;
    constructor(provider) {
        this.provider = provider;
        this.configDir = path.join(os.homedir(), '.vibe');
        this.configPath = path.join(this.configDir, 'config.json');
    }
    /**
     * Run first-time setup if no config exists
     */
    async runFirstTimeSetup() {
        const config = this.loadConfig();
        const needsSetup = !config.provider;
        if (needsSetup) {
            console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Welcome to VIBE v12!                                        ║
║   Let's get you set up with an AI provider.                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `));
            await this.configureProvider();
        }
        return needsSetup;
    }
    /**
     * Check for missing API keys - now non-blocking
     */
    async checkAndPromptForKeys() {
        const providers = this.provider.listProviders();
        const configuredCount = providers.filter(p => p.configured).length;
        // If we have at least one configured provider, don't prompt
        if (configuredCount > 0)
            return;
        // Check if there are free tier options
        const freeProviders = providers.filter(p => p.freeTier && !p.configured);
        if (freeProviders.length > 0) {
            // Suggest free options silently
            const freeNames = freeProviders.map(p => p.name).join(', ');
            console.log(chalk_1.default.gray(`\n💡 Tip: Free options available: ${freeNames}\n`));
        }
        // Only prompt once, non-intrusively
        console.log(chalk_1.default.gray('Configure an AI provider with: ') + chalk_1.default.cyan('/config\n'));
    }
    /**
     * Configure a provider interactively with searchable selection
     */
    async configureProvider() {
        const providers = this.provider.listProviders();
        const freeProviders = providers.filter(p => p.freeTier);
        const paidProviders = providers.filter(p => !p.freeTier);
        // Show providers organized by tier with searchable format
        console.log(chalk_1.default.cyan('\n╔═══════════════════════════════════════════════════════════════╗'));
        console.log(chalk_1.default.cyan('║  Select Provider (type to search, arrows to navigate)         ║'));
        console.log(chalk_1.default.cyan('╠═══════════════════════════════════════════════════════════════╣'));
        if (freeProviders.length > 0) {
            console.log(chalk_1.default.cyan('║  FREE TIER:                                                  ║'));
            for (const p of freeProviders) {
                const status = p.configured ? chalk_1.default.green('[✓]') : chalk_1.default.gray('[○]');
                console.log(chalk_1.default.cyan('║    ') + status + ' ' + chalk_1.default.white(p.name.padEnd(20)));
            }
            console.log(chalk_1.default.cyan('║                                                               ║'));
        }
        console.log(chalk_1.default.cyan('║  PAID:                                                       ║'));
        for (const p of paidProviders) {
            const status = p.configured ? chalk_1.default.green('[✓]') : chalk_1.default.red('[✗]');
            console.log(chalk_1.default.cyan('║    ') + status + ' ' + chalk_1.default.white(p.name.padEnd(20)));
        }
        console.log(chalk_1.default.cyan('║                                                               ║'));
        console.log(chalk_1.default.cyan('║  [type provider name] to filter                              ║'));
        console.log(chalk_1.default.cyan('║  [enter] to select  [ctrl+c] to cancel                       ║'));
        console.log(chalk_1.default.cyan('╚═══════════════════════════════════════════════════════════════╝'));
        // Get user input (searchable)
        const searchTerm = await (0, ui_1.prompt)('\nProvider (or part of name):');
        if (!searchTerm.trim()) {
            console.log(chalk_1.default.gray('Selection cancelled.\n'));
            return;
        }
        // Filter providers by search term
        const filtered = providers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase()));
        if (filtered.length === 0) {
            console.log(chalk_1.default.yellow(`\nNo providers match "${searchTerm}". Try a different term.\n`));
            return;
        }
        if (filtered.length === 1) {
            // Single match - select directly
            await this.configureProviderById(filtered[0].id);
            return;
        }
        // Multiple matches - show filtered list
        console.log(chalk_1.default.cyan('\nMatching providers:\n'));
        filtered.forEach((p, i) => {
            const status = p.configured ? chalk_1.default.green('✓') : p.freeTier ? chalk_1.default.gray('○') : chalk_1.default.red('✗');
            console.log(`  ${chalk_1.default.white(String(i + 1))}. ${status} ${p.name}`);
        });
        const selected = await (0, ui_1.promptNumber)('\nSelect number', 1, filtered.length);
        await this.configureProviderById(filtered[selected - 1].id);
    }
    /**
     * Configure a specific provider by ID
     * NOTE: We save the key first and test on first real request (Cursor/Claude Code style)
     */
    async configureProviderById(providerId) {
        const providerInfo = this.provider.listProviders().find(p => p.id === providerId);
        if (!providerInfo)
            return;
        const config = this.provider.getProvider(providerId);
        if (!config)
            return;
        // If provider doesn't need API key (like Ollama), just set it
        if (!config.requiresApiKey) {
            this.provider.setProvider(providerId);
            console.log(chalk_1.default.green(`\n✓ Provider set to ${providerInfo.name}\n`));
            return;
        }
        // Prompt for API key
        console.log(chalk_1.default.cyan(`
To use ${providerInfo.name}, you need an API key.

You can get a key from: ${this.getProviderKeyUrl(providerId)}
    `));
        const apiKey = await (0, ui_1.prompt)('Paste your API key');
        if (!apiKey || apiKey.trim().length < 5) {
            console.log(chalk_1.default.red('Invalid API key. Setup cancelled.\n'));
            return;
        }
        // Save the key FIRST (test on first real request, not here)
        this.provider.setApiKey(providerId, apiKey.trim());
        this.provider.setProvider(providerId);
        console.log(chalk_1.default.green(`
✓ API key saved for ${providerInfo.name}
✓ Provider set to ${providerInfo.name}

Note: The key will be tested on your first request.
    `));
    }
    /**
     * Configure a specific provider by name
     * NOTE: We save the key first and test on first real request
     */
    async configureProviderByName(providerName) {
        const providers = this.provider.listProviders();
        const provider = providers.find(p => p.id === providerName || p.name.toLowerCase().includes(providerName.toLowerCase()));
        if (!provider) {
            console.log(chalk_1.default.red(`Provider "${providerName}" not found.\n`));
            return false;
        }
        const config = this.provider.getProvider(provider.id);
        if (!config)
            return false;
        // If no API key needed
        if (!config.requiresApiKey) {
            this.provider.setProvider(provider.id);
            console.log(chalk_1.default.green(`✓ Provider set to ${provider.name}\n`));
            return true;
        }
        console.log(chalk_1.default.cyan(`\nConfiguring ${provider.name}...`));
        console.log(chalk_1.default.gray(`Get your key from: ${this.getProviderKeyUrl(provider.id)}\n`));
        const apiKey = await (0, ui_1.prompt)('Paste your API key');
        if (!apiKey || apiKey.trim().length < 5) {
            console.log(chalk_1.default.red('Invalid API key.\n'));
            return false;
        }
        // Save the key FIRST (test on first real request, not here)
        this.provider.setApiKey(provider.id, apiKey.trim());
        this.provider.setProvider(provider.id);
        console.log(chalk_1.default.green(`✓ API key saved for ${provider.name}`));
        console.log(chalk_1.default.gray('Note: The key will be tested on your first request.\n'));
        return true;
    }
    /**
     * Test if an API key works
     */
    async testProviderKey(providerId, apiKey) {
        // Temporarily set the key for testing
        const tempProvider = new router_1.VibeProviderRouter();
        tempProvider.setApiKey(providerId, apiKey);
        try {
            const response = await tempProvider.complete('test');
            // Check if we got an error response
            return !response.content.includes('Error') && !response.content.includes('error');
        }
        catch {
            return false;
        }
    }
    /**
     * Get the API key URL for a provider
     */
    getProviderKeyUrl(provider) {
        const urls = {
            minimax: 'https://platform.minimax.io/',
            openai: 'https://platform.openai.com/api-keys',
            anthropic: 'https://console.anthropic.com/',
            google: 'https://aistudio.google.com/app/apikey',
            xai: 'https://console.x.ai/',
            mistral: 'https://console.mistral.ai/',
            deepseek: 'https://platform.deepseek.com/',
            groq: 'https://console.groq.com/',
            ollama: 'https://ollama.com/',
            openrouter: 'https://openrouter.ai/keys',
            huggingface: 'https://huggingface.co/settings/tokens',
        };
        return urls[provider] || 'the provider\'s website';
    }
    /**
     * Display current configuration status
     */
    displayConfigStatus() {
        const status = this.provider.getStatus();
        const providers = this.provider.listProviders();
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  Configuration Status                                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ${chalk_1.default.white('Current Provider:')} ${chalk_1.default.green(status.provider)}                        ║
║  ${chalk_1.default.white('Current Model:')} ${chalk_1.default.green(status.model)}                           ║
║                                                               ║
║  ${chalk_1.default.white('Providers:')} ${status.configured}/${status.available} configured                                ║
║                                                               ║
    `));
        for (const p of providers) {
            const statusIcon = p.configured ? chalk_1.default.green('✓') : p.freeTier ? chalk_1.default.gray('○') : chalk_1.default.red('✗');
            const line = `  ${statusIcon} ${p.name.padEnd(18)} ${p.model}`;
            console.log(line);
        }
        console.log(chalk_1.default.cyan(`
║                                                               ║
║  Commands:                                                    ║
║    /config          - Configure a provider                    ║
║    /providers       - List all providers                      ║
║    /use <provider>  - Switch provider                         ║
║    /model <model>   - Switch model                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `));
    }
    /**
     * Load configuration from disk
     */
    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        }
        catch {
            return {};
        }
    }
    /**
     * Save configuration to disk
     */
    saveConfig(config) {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    }
}
exports.VibeConfigManager = VibeConfigManager;
//# sourceMappingURL=config.js.map