"use strict";
/**
 * VIBE-CLI v13 - Interactive CLI Engine (Agent Mode)
 *
 * ENFORCES EXECUTION OVER EXPLANATION
 * - Mode system: agent/code/ask/debug
 * - Execution stages with animations
 * - File tree output, not code dumps
 * - Proper error handling
 * - Approval gates for risky operations
 * - Sandbox execution with checkpoint support
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
exports.CLIEngine = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_js_1 = require("../config.js");
const system_prompt_js_1 = require("../cli/system-prompt.js");
const ui_js_1 = require("../cli/ui.js");
const index_js_1 = require("../approvals/index.js");
const index_js_2 = require("../tools/index.js");
// ============================================================================
// CLI ENGINE
// ============================================================================
class CLIEngine {
    provider;
    memory;
    running = true;
    history = [];
    historyFile;
    configManager;
    currentMode = 'agent';
    constructor(provider, memory) {
        this.provider = provider;
        this.memory = memory;
        this.configManager = new config_js_1.VibeConfigManager(provider);
        this.historyFile = path.join(process.cwd(), '.vibe_history');
        this.loadHistory();
    }
    // ============================================================================
    // MAIN ENTRY POINT
    // ============================================================================
    async start() {
        this.displayWelcome();
        await this.configManager.runFirstTimeSetup();
        // Infinite REPL loop
        while (this.running) {
            try {
                const input = await (0, ui_js_1.prompt)(chalk_1.default.cyan('vibe') + this.getModeIndicator() + ' > ');
                await this.handleInput(input);
            }
            catch (error) {
                console.log(chalk_1.default.red('\nAn error occurred. Try again.\n'));
            }
        }
    }
    // ============================================================================
    // INPUT HANDLER
    // ============================================================================
    async handleInput(input) {
        const trimmed = input.trim();
        if (!trimmed)
            return;
        // Save to history
        this.history.push(trimmed);
        this.saveHistory();
        // Internal commands
        if (trimmed.startsWith('/')) {
            await this.handleInternalCommand(trimmed);
            return;
        }
        // Exit commands
        const lower = trimmed.toLowerCase();
        if (lower === 'exit' || lower === 'quit') {
            console.log(chalk_1.default.cyan('\n👋 Goodbye! Happy coding!\n'));
            this.running = false;
            return;
        }
        // Provider/model switching
        if (this.handleProviderModelSwitching(trimmed, lower)) {
            return;
        }
        // Mode switching
        if (this.handleModeSwitching(trimmed, lower)) {
            return;
        }
        // AI call with mode-specific prompt
        await this.callAI(trimmed);
    }
    // ============================================================================
    // INTERNAL COMMANDS
    // ============================================================================
    async handleInternalCommand(input) {
        const cmd = input.toLowerCase().split(/\s+/)[0];
        const args = input.slice(cmd.length).trim();
        switch (cmd) {
            case '/exit':
            case '/quit':
                console.log(chalk_1.default.cyan('\n👋 Goodbye! Happy coding!\n'));
                this.running = false;
                break;
            case '/help':
                this.showHelp();
                break;
            case '/mode':
                this.handleModeCommand(args);
                break;
            case '/config':
                await this.configManager.configureProvider();
                break;
            case '/status':
                this.showStatus();
                break;
            case '/providers':
                this.showProviders();
                break;
            case '/clear':
                console.clear();
                this.displayWelcome();
                break;
            case '/model':
                this.handleModelCommand(args);
                break;
            case '/use':
                this.handleUseCommand(args);
                break;
            case '/memory':
                this.showMemory();
                break;
            case '/modules':
                this.showModules();
                break;
            case '/models':
                this.showModels();
                break;
            case '/tools':
                this.showTools();
                break;
            case '/approve':
                this.showPendingApprovals();
                break;
            case '/sandbox':
                this.toggleSandbox(args);
                break;
            case '/checkpoint':
                this.createCheckpoint(args);
                break;
            case '/undo':
                this.undoLastChange(args);
                break;
            case '/risk':
                this.showRiskLevels();
                break;
            case '/autoapprove':
                this.toggleAutoApprove(args);
                break;
            default:
                console.log(chalk_1.default.yellow(`\nUnknown command: ${cmd}\n`));
                this.showHelp();
        }
    }
    // ============================================================================
    // MODE SYSTEM
    // ============================================================================
    handleModeCommand(args) {
        const modes = ['agent', 'code', 'ask', 'debug'];
        if (!args) {
            console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║  Current Mode: ${chalk_1.default.white(this.currentMode.toUpperCase())}
╠═══════════════════════════════════════════════════════════════╣
║  Available Modes:                                             ║
║    /mode agent   - Full execution (default)                   ║
║    /mode code    - Code-focused, can show code                ║
║    /mode ask     - Q&A, no side effects                       ║
║    /mode debug   - Debugging focused                          ║
╚═══════════════════════════════════════════════════════════════╝
      `));
            return;
        }
        const mode = args.toLowerCase();
        if (modes.includes(mode)) {
            this.currentMode = mode;
            console.log(chalk_1.default.green(`\n✓ Switched to ${mode.toUpperCase()} mode\n`));
            this.showModeDescription(mode);
        }
        else {
            console.log(chalk_1.default.red(`\nUnknown mode: ${args}\n`));
        }
    }
    showModeDescription(mode) {
        const descriptions = {
            agent: 'Creating files and running commands is MANDATORY.',
            code: 'Creating files preferred, but can show code when asked.',
            ask: 'Focus on answering questions. No automatic execution.',
            debug: 'Read and analyze code first. Offer fixes.',
        };
        console.log(chalk_1.default.gray(`  ${descriptions[mode]}\n`));
    }
    handleModeSwitching(input, lower) {
        // Quick mode switches
        const modePatterns = {
            'mode agent': 'agent',
            'mode code': 'code',
            'mode ask': 'ask',
            'mode debug': 'debug',
        };
        for (const [pattern, mode] of Object.entries(modePatterns)) {
            if (lower === pattern || lower.startsWith(pattern + ' ')) {
                this.currentMode = mode;
                console.log(chalk_1.default.green(`\n✓ ${mode.toUpperCase()} mode\n`));
                this.showModeDescription(mode);
                return true;
            }
        }
        return false;
    }
    getModeIndicator() {
        const indicators = {
            agent: chalk_1.default.gray(' [agent]'),
            code: chalk_1.default.gray(' [code]'),
            ask: chalk_1.default.gray(' [ask]'),
            debug: chalk_1.default.gray(' [debug]'),
        };
        return indicators[this.currentMode];
    }
    // ============================================================================
    // PROVIDER/MODEL COMMANDS
    // ============================================================================
    handleModelCommand(args) {
        if (args) {
            const success = this.provider.setModel(args);
            if (success) {
                console.log(chalk_1.default.green(`\n✓ Model set to ${this.provider.getCurrentModel()}\n`));
            }
            else {
                console.log(chalk_1.default.red(`\nUnknown model: ${args}\n`));
            }
        }
        else {
            console.log(chalk_1.default.cyan(`\nCurrent model: ${this.provider.getCurrentModel()}\n`));
        }
    }
    handleUseCommand(args) {
        if (args) {
            const success = this.provider.setProvider(args);
            if (success) {
                console.log(chalk_1.default.green(`\n✓ Switched to ${this.provider.getCurrentProvider()?.name}\n`));
            }
            else {
                console.log(chalk_1.default.red(`\nUnknown provider: ${args}\n`));
            }
        }
        else {
            console.log(chalk_1.default.cyan(`\nCurrent provider: ${this.provider.getCurrentProvider()?.name}\n`));
        }
    }
    handleProviderModelSwitching(input, lower) {
        // Free tier
        if (/use\s+(free|free\s*tier|free\s*model)/i.test(lower)) {
            const providers = this.provider.listProviders();
            const freeProvider = providers.find(p => p.freeTier);
            if (freeProvider) {
                this.provider.setProvider(freeProvider.id);
                console.log(chalk_1.default.green(`\n✓ Switched to ${freeProvider.name} (free tier)\n`));
            }
            else {
                console.log(chalk_1.default.yellow('\n⚠ No free tier providers available.\n'));
            }
            return true;
        }
        // Provider keywords
        const providerMap = {
            'anthropic': 'anthropic', 'claude': 'anthropic',
            'openai': 'openai', 'gpt': 'openai',
            'google': 'google', 'gemini': 'google',
            'ollama': 'ollama', 'local': 'ollama', 'offline': 'ollama',
            'deepseek': 'deepseek',
            'groq': 'groq',
            'mistral': 'mistral',
            'xai': 'xai', 'grok': 'xai',
            'huggingface': 'huggingface',
            'openrouter': 'openrouter',
        };
        for (const [kw, providerId] of Object.entries(providerMap)) {
            if (lower.includes(kw)) {
                const success = this.provider.setProvider(providerId);
                if (success) {
                    console.log(chalk_1.default.green(`\n✓ Switched to ${this.provider.getCurrentProvider()?.name}\n`));
                }
                return true;
            }
        }
        // Model keywords
        const modelMap = {
            'sonnet': 'claude-sonnet-4-20250514',
            'opus': 'claude-opus-4-20250514',
            'haiku': 'claude-haiku-3-20250514',
            'gpt-4o': 'gpt-4o',
            'mini': 'gpt-4o-mini',
            'gemini flash': 'gemini-1.5-flash',
            'llama': 'llama3.1',
        };
        for (const [kw, modelId] of Object.entries(modelMap)) {
            if (lower.includes(kw)) {
                const success = this.provider.setModel(modelId);
                if (success) {
                    console.log(chalk_1.default.green(`\n✓ Model set to ${this.provider.getCurrentModel()}\n`));
                }
                return true;
            }
        }
        return false;
    }
    // ============================================================================
    // AI CALL WITH EXECUTION PIPELINE
    // ============================================================================
    async callAI(input) {
        const status = this.provider.getStatus();
        // Check provider configuration
        if (!this.provider.isProviderConfigured(status.provider)) {
            this.showProviderNotConfigured();
            return;
        }
        // Show execution stage
        this.showThinkingAnimation();
        // Build mode-specific system prompt
        const systemPrompt = (0, system_prompt_js_1.getSystemPrompt)({
            mode: this.currentMode,
            projectContext: this.getProjectContext(),
        });
        // Build messages
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input },
        ];
        // Call AI
        let response;
        try {
            response = await this.provider.chat(messages);
        }
        catch (error) {
            response = await this.tryFallbackProviders(messages);
        }
        // Clear thinking animation
        this.clearThinkingAnimation();
        // Handle error
        if (this.isErrorResponse(response)) {
            this.showAIError(response, status.provider);
            return;
        }
        // Process and display response based on mode
        this.displayResponse(response.content, input);
    }
    displayResponse(content, input) {
        // Check if this is an execution response (contains file creation indicators)
        const hasFileCreation = /📁|Created:|✅.*files? created/i.test(content);
        const hasCommandExecution = /⚡|Running:|✅.*(installed|completed|finished)/i.test(content);
        if (hasFileCreation || hasCommandExecution) {
            // This is an execution response - show file tree or summary
            this.displayExecutionResult(content);
        }
        else if (this.currentMode === 'ask') {
            // Ask mode - show normal response
            console.log('');
            console.log(chalk_1.default.white(content));
            console.log('');
        }
        else {
            // Check if it looks like a code dump
            const codeBlockCount = (content.match(/```/g) || []).length;
            if (codeBlockCount >= 2) {
                // This looks like a code dump - warn user
                console.log(chalk_1.default.yellow(`
⚠️  This response contains code but files may not have been created.

If you want files created, try:
• "Create a [name] component"
• "Build a [type] app"
• "Generate a [project]"

Files are created automatically in agent mode.
        `));
                console.log(chalk_1.default.white(content.slice(0, 500) + '...'));
                console.log('');
            }
            else {
                // Normal response
                console.log('');
                console.log(chalk_1.default.white(content));
                console.log('');
            }
        }
    }
    displayExecutionResult(content) {
        console.log('');
        // Extract and display file tree if present
        const treeMatch = content.match(/([a-zA-Z0-9-_]+\/?[a-zA-Z0-9-_]*\n(?:├──|└──|   ).*)+/);
        if (treeMatch) {
            console.log(chalk_1.default.cyan(treeMatch[0]));
        }
        else {
            // Just show the content
            console.log(chalk_1.default.white(content));
        }
        console.log('');
    }
    // ============================================================================
    // EXECUTION STAGES & ANIMATIONS
    // ============================================================================
    showThinkingAnimation() {
        const frames = ['🧠', '🤔', '💭', '🧠'];
        let frameIndex = 0;
        console.log(chalk_1.default.cyan('\n🧠 Thinking'));
        const interval = setInterval(() => {
            process.stdout.write(`\r${frames[frameIndex % frames.length]}  `);
            frameIndex++;
        }, 400);
        // Store interval for cleanup
        this.thinkingInterval = interval;
    }
    clearThinkingAnimation() {
        const interval = this.thinkingInterval;
        if (interval) {
            clearInterval(interval);
            this.thinkingInterval = null;
        }
        process.stdout.write('\r' + ' '.repeat(10) + '\r');
    }
    showExecutionStages(stages) {
        console.log(chalk_1.default.cyan('\n⚡ Executing\n'));
        for (const stage of stages) {
            let line = '  ';
            switch (stage.status) {
                case 'pending':
                    line += chalk_1.default.gray('○');
                    break;
                case 'running':
                    line += chalk_1.default.yellow('◐');
                    break;
                case 'completed':
                    line += chalk_1.default.green('✓');
                    break;
                case 'failed':
                    line += chalk_1.default.red('✗');
                    break;
            }
            line += ` ${stage.icon} ${stage.name}`;
            if (stage.message) {
                line += chalk_1.default.gray(` — ${stage.message}`);
            }
            console.log(line);
        }
        console.log('');
    }
    // ============================================================================
    // UI HELPERS
    // ============================================================================
    displayWelcome() {
        console.log(chalk_1.default.cyan(`
╔═════════════════════════════════════════════════════════════╗
║                                                             ║
║   ${chalk_1.default.white.bold('V I B E')}  ${chalk_1.default.green('v13.0.0')}                                    ║
║   ${chalk_1.default.gray('AI-Powered Development Environment')}                       ║
║                                                             ║
║   ${chalk_1.default.white("I'm your AI development teammate.")}                       ║
║   ${chalk_1.default.gray("Type naturally - I'll execute, not just chat.")}            ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝

Type ${chalk_1.default.cyan('/help')} for commands or just tell me what you want to build.

${chalk_1.default.gray('New in v13:')} ${chalk_1.default.white('/sandbox')} ${chalk_1.default.gray('|')} ${chalk_1.default.white('/checkpoint')} ${chalk_1.default.gray('|')} ${chalk_1.default.white('/approve')}
${chalk_1.default.gray('Modes:')} ${chalk_1.default.white('/mode agent')} ${chalk_1.default.gray('|')} ${chalk_1.default.white('/mode code')} ${chalk_1.default.gray('|')} ${chalk_1.default.white('/mode ask')} ${chalk_1.default.gray('|')} ${chalk_1.default.white('/mode debug')}
    `));
    }
    showHelp() {
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Commands                                                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Core:                                                             ║
║    /help        Show this help                                       ║
║    /mode        Set mode (agent/code/ask/debug)                      ║
║    /config      Configure AI provider                                ║
║    /status      Show current configuration                           ║
║    /clear       Clear screen                                         ║
║    /exit        Exit VIBE                                            ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Providers & Models:                                               ║
║    /providers   List available providers                             ║
║    /use <name>  Switch provider                                      ║
║    /models      List available models                                ║
║    /model <id>  Switch model                                         ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Modules & Tools:                                                  ║
║    /modules     List all modules                                     ║
║    /tools       List available tools                                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Safety & Recovery:                                                ║
║    /approve     Show pending approvals                               ║
║    /sandbox     Toggle sandbox mode                                  ║
║    /checkpoint  Create a checkpoint for undo                         ║
║    /undo        Restore last checkpoint                              ║
║    /risk        Show risk levels & approval rules                    ║
║    /autoapprove Configure auto-approve settings                      ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Memory:                                                           ║
║    /memory      Show stored memories                                 ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Modes:                                                            ║
║    /mode agent  - Execute actions (default)                          ║
║    /mode code   - Can show code                                      ║
║    /mode ask    - Q&A mode, no execution                             ║
║    /mode debug  - Debugging focused                                  ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Just describe what you want - I'll create it for you.               ║
╚═══════════════════════════════════════════════════════════════════════╝
    `));
    }
    showStatus() {
        const status = this.provider.getStatus();
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Status                                                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Provider: ${chalk_1.default.white(status.provider.padEnd(50))}║
║  Model:    ${chalk_1.default.white(status.model.padEnd(50))}║
║  Mode:     ${chalk_1.default.white(this.currentMode.padEnd(50))}║
║  Configured: ${status.configured}/${status.available} providers                              ║
╚═══════════════════════════════════════════════════════════════════════╝
    `));
    }
    showProviders() {
        const providers = this.provider.listProviders();
        console.log(chalk_1.default.cyan('\nAvailable providers:\n'));
        providers.forEach((p) => {
            const status = p.configured ? chalk_1.default.green('✓') : p.freeTier ? chalk_1.default.gray('○') : chalk_1.default.red('✗');
            const name = p.freeTier ? `${p.name} (free)` : p.name;
            console.log(`  ${status} ${name.padEnd(20)} ${p.model}`);
        });
        console.log('');
    }
    showModules() {
        const modules = [
            { name: 'code-assistant', desc: 'Generate, complete, explain, refactor code' },
            { name: 'testing', desc: 'Generate and run tests' },
            { name: 'debugging', desc: 'Debug and fix errors' },
            { name: 'planning', desc: 'Plan and architect solutions' },
            { name: 'web-generation', desc: 'Generate web components/apps' },
            { name: 'security', desc: 'Security scanning and audits' },
            { name: 'deployment', desc: 'Build and deploy applications' },
        ];
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Core Modules                                                       ║
╠═══════════════════════════════════════════════════════════════════════╣
${modules.map(m => `║  ${m.name.padEnd(18)} ${m.desc}`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════╝
    `));
    }
    showModels() {
        const models = [
            { name: 'Claude Opus 4', provider: 'Anthropic', desc: 'Best for complex tasks' },
            { name: 'Claude Sonnet 4', provider: 'Anthropic', desc: 'Balanced performance' },
            { name: 'GPT-4o', provider: 'OpenAI', desc: 'General purpose' },
            { name: 'GPT-4o-mini', provider: 'OpenAI', desc: 'Fast and cheap' },
            { name: 'Gemini 1.5 Flash', provider: 'Google', desc: 'Free tier' },
            { name: 'Llama 3.1', provider: 'Ollama', desc: 'Local/offline' },
        ];
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Available Models                                                    ║
╠═══════════════════════════════════════════════════════════════════════╣
${models.map(m => `║  ${m.name.padEnd(20)} ${m.provider.padEnd(12)} ${m.desc}`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════╝
    `));
    }
    showTools() {
        const tools = index_js_2.toolRegistry.list();
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Tools (VIBE uses these to execute your requests)                    ║
╠═══════════════════════════════════════════════════════════════════════╣
║  File Operations:                                                    ║
${tools.filter((t) => t.category === 'filesystem').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╠═══════════════════════════════════════════════════════════════════════╣
║  Shell Operations:                                                   ║
${tools.filter((t) => t.category === 'shell').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╠═══════════════════════════════════════════════════════════════════════╣
║  Git Operations:                                                     ║
${tools.filter((t) => t.category === 'git').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╠═══════════════════════════════════════════════════════════════════════╣
║  Code Operations:                                                    ║
${tools.filter((t) => t.category === 'code').map(t => `║    ${t.name.padEnd(18)} ${t.description}`).join('\n')}
╚═══════════════════════════════════════════════════════════════════════╝
    `));
    }
    // ============================================================================
    // APPROVAL & SANDBOX COMMANDS
    // ============================================================================
    showPendingApprovals() {
        const pending = index_js_1.approvalManager.listPending();
        if (pending.length === 0) {
            console.log(chalk_1.default.green('\nNo pending approvals.\n'));
        }
        else {
            console.log(chalk_1.default.cyan('\nPending Approvals:\n'));
            for (const p of pending) {
                console.log(`  [${p.risk.toUpperCase()}] ${p.description}`);
                console.log(chalk_1.default.gray(`     Type: ${p.type}, Requested: ${p.requestedAt.toLocaleString()}\n`));
            }
        }
        const status = index_js_1.approvalManager.getStatus();
        console.log(chalk_1.default.gray(`
Summary: ${status.approved} approved, ${status.denied} denied, ${status.pending} pending, ${status.autoApproved} auto-approved
    `));
    }
    toggleSandbox(args) {
        if (!args) {
            const status = index_js_2.sandbox.getStatus();
            console.log(chalk_1.default.cyan(`
Sandbox Status:
  Enabled: ${status.enabled ? chalk_1.default.green('YES') : chalk_1.default.red('NO')}
  Max CPU: ${status.config.maxCpuTime}s
  Max Memory: ${status.config.maxMemory}MB
  Max File Size: ${status.config.maxFileSize}MB
      `));
            return;
        }
        if (args === 'on' || args === 'enable' || args === 'true') {
            index_js_2.sandbox.setEnabled(true);
            console.log(chalk_1.default.green('\nSandbox enabled.\n'));
        }
        else if (args === 'off' || args === 'disable' || args === 'false') {
            index_js_2.sandbox.setEnabled(false);
            console.log(chalk_1.default.yellow('\nSandbox disabled. Commands will run unsandboxed.\n'));
        }
        else {
            console.log(chalk_1.default.yellow('\nUsage: /sandbox [on|off]\n'));
        }
    }
    createCheckpoint(args) {
        const description = args || 'Manual checkpoint';
        const checkpoints = index_js_2.checkpointSystem.list();
        const checkpointId = index_js_2.checkpointSystem.createSync('manual', description);
        if (checkpointId) {
            console.log(chalk_1.default.green(`\nCheckpoint created: ${checkpointId}\n`));
            console.log(chalk_1.default.gray(`Total checkpoints: ${checkpoints.length + 1}\n`));
        }
        else {
            console.log(chalk_1.default.red('\nFailed to create checkpoint.\n'));
        }
    }
    undoLastChange(args) {
        const checkpoints = index_js_2.checkpointSystem.list();
        if (checkpoints.length === 0) {
            console.log(chalk_1.default.yellow('\nNo checkpoints available to undo.\n'));
            return;
        }
        // Try specific checkpoint or use most recent
        let checkpointId = args || checkpoints[checkpoints.length - 1]?.id;
        if (!checkpointId) {
            console.log(chalk_1.default.yellow('\nNo checkpoint specified and no checkpoints available.\n'));
            return;
        }
        const success = index_js_2.checkpointSystem.restoreSync(checkpointId);
        if (success) {
            console.log(chalk_1.default.green(`\nChanges restored from checkpoint: ${checkpointId}\n`));
        }
        else {
            console.log(chalk_1.default.red(`\nFailed to restore checkpoint: ${checkpointId}\n`));
        }
    }
    showRiskLevels() {
        console.log(chalk_1.default.cyan(`
╔═══════════════════════════════════════════════════════════════════════╗
║  Risk Levels & Approval Requirements                                 ║
╠════════════════════════════════════════════╦══════════════════════════╣
║  Level     │ Auto-Approve │ Requires Confirm │ Example Operations     ║
╠════════════════════════════════════════════╬══════════════════════════╣
║  LOW       │ Yes          │ No               │ file.read, file.glob   ║
║  MEDIUM    │ Configurable │ Optional         │ file.write, git status ║
║  HIGH      │ No           │ Yes              │ shell.exec, git commit ║
║  CRITICAL  │ No           │ Always           │ file.delete, rollback  ║
╚════════════════════════════════════════════╩══════════════════════════╝

Use /approve to view pending approvals.
Use /autoapprove [low|medium|high|off] to configure.
    `));
    }
    toggleAutoApprove(args) {
        const levels = ['low', 'medium', 'high', 'off'];
        if (!args || !levels.includes(args.toLowerCase())) {
            const status = index_js_1.approvalManager.getStatus();
            console.log(chalk_1.default.cyan(`
Auto-Approve Settings:
  Current: ${status.preferences.autoApproveLowRisk ? 'LOW' : 'MEDIUM'}
  Use /autoapprove [low|medium|high|off] to configure
      `));
            return;
        }
        if (args === 'off') {
            index_js_1.approvalManager.setAutoApprove(false);
            console.log(chalk_1.default.yellow('\nAuto-approve disabled. All operations require approval.\n'));
        }
        else {
            index_js_1.approvalManager.setAutoApprove(true);
            console.log(chalk_1.default.green(`\nAuto-approve enabled for ${args.toUpperCase()} risk operations.\n`));
        }
    }
    showMemory() {
        const memories = this.memory.getAll();
        if (memories.length === 0) {
            console.log(chalk_1.default.cyan('\nNo memories stored.\n'));
        }
        else {
            console.log(chalk_1.default.cyan('\nStored memories:\n'));
            memories.forEach((m, i) => {
                console.log(`  ${i + 1}. ${m.key}: ${m.value}`);
            });
            console.log('');
        }
    }
    showProviderNotConfigured() {
        const freeModels = this.provider.getFreeTierModels();
        const localProviders = this.provider.getLocalProviders();
        console.log(chalk_1.default.yellow(`
⚠️  AI provider not configured.

To use VIBE:
• Run ${chalk_1.default.cyan('/config')} to set up an API key
• Or use a free provider: ${freeModels.map(f => f.name).join(', ') || 'None'}
• Or use local: ${localProviders.join(', ') || 'None'}
    `));
    }
    showAIError(response, currentProvider) {
        const freeModels = this.provider.getFreeTierModels();
        const localProviders = this.provider.getLocalProviders();
        console.log(chalk_1.default.red(`
❌ AI Error

Reason: ${response.content || response.error || 'Unknown error'}

What to do:
• Run ${chalk_1.default.cyan('/config')} to configure
• Try a free provider: ${freeModels.map(f => f.name).join(', ') || 'None'}
• Use local provider: ${localProviders.join(', ') || 'None'}
• Check your network connection

Provider: ${currentProvider}
    `));
    }
    isErrorResponse(response) {
        if (!response)
            return true;
        if (response.provider === 'none')
            return true;
        if (response.content?.includes('[Error]') || response.content?.includes('Error:'))
            return true;
        if (response.content?.includes('401') || response.content?.includes('authentication'))
            return true;
        return false;
    }
    getProjectContext() {
        // Get basic project info
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                return `Project: ${pkg.name || 'Unnamed'}\nType: ${pkg.type || 'module'}`;
            }
            catch {
                // Ignore
            }
        }
        return '';
    }
    async tryFallbackProviders(messages) {
        const freeModels = this.provider.getFreeTierModels();
        const localProviders = this.provider.getLocalProviders();
        // Try free models
        for (const fm of freeModels) {
            try {
                const result = await this.provider.chat(messages, { model: fm.model });
                if (!this.isErrorResponse(result)) {
                    return result;
                }
            }
            catch {
                // Continue
            }
        }
        // Try local
        for (const lp of localProviders) {
            try {
                const result = await this.provider.chat(messages);
                if (!this.isErrorResponse(result)) {
                    return result;
                }
            }
            catch {
                // Continue
            }
        }
        return {
            content: '',
            error: 'All providers failed',
            provider: 'none',
        };
    }
    // ============================================================================
    // UTILITIES
    // ============================================================================
    loadHistory() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const content = fs.readFileSync(this.historyFile, 'utf-8');
                this.history = content.split('\n').filter(line => line.trim());
            }
        }
        catch {
            // Ignore
        }
    }
    saveHistory() {
        try {
            const configDir = path.dirname(this.historyFile);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(this.historyFile, this.history.slice(-1000).join('\n'));
        }
        catch {
            // Ignore
        }
    }
}
exports.CLIEngine = CLIEngine;
//# sourceMappingURL=index.js.map