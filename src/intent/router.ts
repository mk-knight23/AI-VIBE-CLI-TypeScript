/**
 * Intent Router - Classifies natural language into actionable intents
 *
 * This is the core of the intent-driven UX.
 * Users type naturally; the system infers what they want.
 */

import { VibeProviderRouter } from '../providers/router.js';
import { IntentType, IntentCategory, IntentPattern, VibeIntent, IntentContext, IProviderRouter, ProviderResponse } from '../types.js';

export type { IntentCategory, IntentPattern, IntentContext };

export interface ClarificationOption {
  label: string;
  category: IntentCategory;
  description: string;
}

export interface IntentClassificationResult {
  intent: VibeIntent;
  needsClarification: boolean;
  suggestedOptions?: ClarificationOption[];
}

/**
 * Intent Router - classifies natural language input
 */
export class IntentRouter {
  private patterns: IntentPattern[];
  private provider: IProviderRouter;
  private readonly LOW_CONFIDENCE_THRESHOLD = 0.6;
  private readonly UNKNOWN_CONFIDENCE = 0.4;

  constructor(provider: IProviderRouter) {
    this.provider = provider;
    this.patterns = this.initializePatterns();
  }

  /**
   * Initialize keyword and phrase patterns for intent classification
   */
  private initializePatterns(): IntentPattern[] {
    return [
      {
        category: 'question',
        keywords: ['why', 'how', 'what is', 'explain', 'help me understand', '?', 'tell me', 'what does'],
        phrases: [/^(why|how|what|explain)/i, /\?$/],
        confidence: 0.9,
      },
      {
        category: 'code_generation',
        keywords: ['create', 'add', 'implement', 'write', 'generate', 'make', 'develop'],
        phrases: [/create\s+\w+/i, /add\s+\w+/i, /implement\s+\w+/i, /write\s+\w+/i],
        confidence: 0.85,
      },
      {
        category: 'refactor',
        keywords: ['refactor', 'restructure', 'reorganize', 'improve', 'clean', 'optimize', 'simplify'],
        phrases: [/refactor/i, /restructure/i, /reorganize/i, /clean\s+up/i, /improve/i, /optimize/i],
        confidence: 0.9,
      },
      {
        category: 'debug',
        keywords: ['fix', 'bug', 'error', 'issue', 'problem', 'broken', 'failing', 'crash', 'debug', 'not working'],
        phrases: [/fix\s+\w+/i, /debug/i, /failing/i, /broken/i, /error/i, /not\s+working/i],
        confidence: 0.9,
      },
      {
        category: 'testing',
        keywords: ['test', 'spec', 'verify', 'check', 'validate', 'run tests', 'unit test', 'integration test'],
        phrases: [/test/i, /spec/i, /verify/i, /run\s+test/i, /check\s+\w+/i, /write\s+test/i],
        confidence: 0.85,
      },
      {
        category: 'security',
        keywords: ['security', 'vulnerability', 'scan', 'audit', 'cve', 'exploit', 'hack', 'secure'],
        phrases: [/security/i, /vulnerability/i, /scan/i, /audit/i, /cve/i, /secure/i],
        confidence: 0.9,
      },
      {
        category: 'api',
        keywords: ['api', 'endpoint', 'route', 'controller', 'handler', 'openapi', 'swagger', 'rest'],
        phrases: [/api/i, /endpoint/i, /route/i, /controller/i, /handler/i, /openapi/i, /rest\s+api/i],
        confidence: 0.9,
      },
      {
        category: 'ui',
        keywords: ['ui', 'component', 'button', 'form', 'modal', 'dashboard', 'layout', 'frontend', 'interface', 'portfolio', 'page', 'home', 'header', 'footer', 'sidebar', 'nav', 'navigation', 'card', 'widget', 'hero', 'modal'],
        phrases: [/ui/i, /component/i, /button/i, /form/i, /modal/i, /dashboard/i, /portfolio/i, /frontend/i, /create\s+a?\s*(?:\w+\s+)?page/i, /create\s+a?\s*(?:\w+\s+)?layout/i, /build\s+a?\s*(?:\w+\s+)?layout/i, /build\s+a?\s*(?:\w+\s+)?component/i],
        confidence: 0.95,
      },
      {
        category: 'deploy',
        keywords: ['deploy', 'push', 'release', 'publish', 'ship', 'production'],
        phrases: [/deploy/i, /push\s+to/i, /release/i, /publish/i, /ship/i, /to\s+production/i, /^build\s+to\s+/i],
        confidence: 0.9,
      },
      {
        category: 'infra',
        keywords: ['infrastructure', 'terraform', 'kubernetes', 'docker', 'aws', 'gcp', 'cloud', 'server'],
        phrases: [/infrastructure/i, /terraform/i, /kubernetes/i, /docker/i, /aws/i, /gcp/i, /cloud/i, /k8s/i],
        confidence: 0.85,
      },
      {
        category: 'memory',
        keywords: ['remember', 'forget', 'store', 'note', 'remember that', 'recall', 'context'],
        phrases: [/remember/i, /forget/i, /store/i, /note/i, /recall/i],
        confidence: 0.95,
      },
      {
        category: 'planning',
        keywords: ['plan', 'design', 'architecture', 'roadmap', 'approach', 'strategy', 'outline'],
        phrases: [/plan/i, /design/i, /architecture/i, /roadmap/i, /approach/i, /strategy/i],
        confidence: 0.85,
      },
      {
        category: 'agent',
        keywords: ['agent', 'autonomous', 'task', 'do it', 'handle it', 'take care of', 'run'],
        phrases: [/agent/i, /autonomous/i, /do\s+it/i, /handle\s+it/i, /take\s+care/i],
        confidence: 0.8,
      },
      {
        category: 'git',
        keywords: ['commit', 'push', 'pull', 'branch', 'merge', 'checkout', 'git', 'status', 'diff'],
        phrases: [/commit/i, /push/i, /pull/i, /branch/i, /merge/i, /checkout/i, /git\s+\w+/i, /git\s+status/i],
        confidence: 0.9,
      },
      {
        category: 'analysis',
        keywords: ['analyze', 'review', 'audit', 'examine', 'inspect', 'investigate', 'explain'],
        phrases: [/analyze/i, /review/i, /audit/i, /examine/i, /inspect/i, /investigate/i],
        confidence: 0.85,
      },
      {
        category: 'code_assistant',
        keywords: ['complete', 'autocomplete', 'suggest', 'refill', 'fill in', 'continue'],
        phrases: [/complete/i, /autocomplete/i, /suggest/i, /fill\s+in/i, /continue/i],
        confidence: 0.9,
      },
      {
        category: 'completion',
        keywords: ['complete', 'finish', 'ending', 'rest of', 'rest'],
        phrases: [/complete/i, /finish/i, /rest\s+of/i],
        confidence: 0.85,
      },
    ];
  }

  /**
   * Classify natural language input into an intent
   * Returns classification result with optional clarification needs
   */
  async classify(input: string): Promise<IntentClassificationResult> {
    const normalizedInput = input.toLowerCase().trim();

    // Check for meta-commands first
    if (this.isMetaCommand(normalizedInput)) {
      const intent = this.createMetaIntent(input);
      return {
        intent,
        needsClarification: false,
      };
    }

    // Check for module-specific commands
    const moduleCommand = this.detectModuleCommand(normalizedInput);
    if (moduleCommand) {
      const intent = this.createModuleIntent(input, moduleCommand);
      return {
        intent,
        needsClarification: false,
      };
    }

    // Classify the intent
    const category = this.classifyCategory(normalizedInput);
    const confidence = this.calculateConfidence(normalizedInput, category);
    const context = this.extractContext(normalizedInput, category);
    const risk = this.assessRisk(category, context);
    const shouldRemember = this.shouldRememberThis(category, normalizedInput);
    const type = this.mapCategoryToIntentType(category);

    const intent: VibeIntent = {
      id: `${category}-${Date.now()}`,
      type,
      category,
      query: input,
      confidence,
      context,
      shouldRemember,
      shouldApprove: risk !== 'low',
      risk,
    };

    // Check if clarification is needed
    const needsClarification = confidence < this.LOW_CONFIDENCE_THRESHOLD;
    const suggestedOptions = needsClarification
      ? this.generateClarificationOptions(input, category)
      : undefined;

    return {
      intent,
      needsClarification,
      suggestedOptions,
    };
  }

  /**
   * Detect module-specific commands
   */
  private detectModuleCommand(input: string): string | null {
    const moduleCommands: Record<string, string[]> = {
      'code-assistant': ['generate code', 'write code', 'create function', 'create class', 'write tests', 'explain code'],
      'testing': ['run tests', 'test suite', 'unit test', 'integration test', 'coverage'],
      'debugging': ['debug', 'debugging', 'debug this', 'trace execution', 'profile'],
      'security': ['security scan', 'vulnerability', 'audit', 'check security'],
      'deployment': ['deploy', 'build to', 'build pipeline', 'ci cd', 'ci/cd', 'pipeline'],
    };

    for (const [module, commands] of Object.entries(moduleCommands)) {
      if (commands.some(cmd => input.toLowerCase().includes(cmd))) {
        return module;
      }
    }

    return null;
  }

  /**
   * Create intent for module command
   */
  private createModuleIntent(input: string, module: string): VibeIntent {
    const category = this.moduleToCategory(module);

    return {
      id: `module-${module}-${Date.now()}`,
      type: IntentType.CODE,
      category,
      query: input,
      confidence: 0.95,
      context: this.extractContext(input, category),
      shouldRemember: false,
      shouldApprove: false,
      risk: this.assessRisk(category, {}),
    };
  }

  /**
   * Map module name to category
   */
  private moduleToCategory(module: string): IntentCategory {
    const map: Record<string, IntentCategory> = {
      'code-assistant': 'code_generation',
      'testing': 'testing',
      'debugging': 'debug',
      'security': 'security',
      'deployment': 'deploy',
    };
    return map[module] || 'analysis';
  }

  /**
   * Route intent to module
   */
  routeToModule(intent: VibeIntent): { module: string; action: string; params: Record<string, any> } | null {
    const category = intent.category;

    const moduleMap: Record<string, { module: string; action: string }> = {
      'code_generation': { module: 'code-assistant', action: 'generate' },
      'refactor': { module: 'code-assistant', action: 'refactor' },
      'testing': { module: 'testing', action: 'run' },
      'debug': { module: 'debugging', action: 'analyze' },
      'security': { module: 'security', action: 'scan' },
      'deploy': { module: 'deployment', action: 'deploy' },
      'analysis': { module: 'code-assistant', action: 'explain' },
      'ui': { module: 'web-generation', action: 'generate' },
      'api': { module: 'web-generation', action: 'api' },
    };

    const mapping = moduleMap[category];
    if (!mapping) {
      return null;
    }

    return {
      module: mapping.module,
      action: mapping.action,
      params: {
        ...intent.context,
        query: intent.query,
      },
    };
  }

  /**
   * Generate clarification options when confidence is low
   */
  private generateClarificationOptions(input: string, currentCategory: IntentCategory): ClarificationOption[] {
    const options: ClarificationOption[] = [];

    // Get top 3 most likely categories
    const scores = this.patterns.map(pattern => ({
      category: pattern.category,
      score: this.calculatePatternScore(input, pattern),
    }));

    scores
      .filter(s => s.category !== currentCategory)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .forEach(s => {
        options.push({
          label: this.formatCategoryLabel(s.category),
          category: s.category,
          description: this.getCategoryDescription(s.category),
        });
      });

    // Add "something else" option
    options.push({
      label: 'Something else',
      category: 'analysis',
      description: 'Let me clarify what you want',
    });

    return options;
  }

  /**
   * Calculate score for a pattern against input
   */
  private calculatePatternScore(input: string, pattern: IntentPattern): number {
    const lowerInput = input.toLowerCase();
    const keywordScore = pattern.keywords.filter(k => lowerInput.includes(k.toLowerCase())).length * 0.3;
    const phraseScore = pattern.phrases.filter(p => p.test(input)).length * 0.4;
    return keywordScore + phraseScore;
  }

  /**
   * Format category for display
   */
  private formatCategoryLabel(category: IntentCategory): string {
    return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  /**
   * Get description for category
   */
  private getCategoryDescription(category: IntentCategory): string {
    const descriptions: Record<IntentCategory, string> = {
      question: 'Answer a question or explain something',
      code_generation: 'Create or generate new code',
      refactor: 'Improve or restructure existing code',
      debug: 'Fix a bug or issue',
      testing: 'Run or write tests',
      api: 'Work with APIs or endpoints',
      ui: 'Create user interface components',
      deploy: 'Deploy to production',
      infra: 'Manage infrastructure',
      memory: 'Store or recall information',
      planning: 'Plan or design an approach',
      agent: 'Run autonomous tasks',
      git: 'Work with Git version control',
      analysis: 'Analyze or review code',
      security: 'Scan for security vulnerabilities',
      code_assistant: 'AI code assistance',
      completion: 'Complete or finish code',
      unknown: 'I\'m not sure what you mean',
    };
    return descriptions[category] || 'Perform an action';
  }

  /**
   * Clarify intent using LLM when confidence is very low
   */
  async clarifyWithLLM(input: string): Promise<VibeIntent> {
    const messages = [
      {
        role: 'system',
        content: `You are an intent classifier for VIBE CLI. Classify the user's request into one of these categories:
- question: Answer a question or explain something
- code_generation: Create or generate new code
- refactor: Improve or restructure existing code
- debug: Fix a bug or issue
- testing: Run or write tests
- api: Work with APIs or endpoints
- ui: Create user interface components
- deploy: Deploy to production
- infra: Manage infrastructure
- memory: Store or recall information
- planning: Plan or design an approach
- agent: Run autonomous tasks
- git: Work with Git version control
- analysis: Analyze or review code
- security: Scan for security vulnerabilities

Respond with ONLY the category name and a brief description of what you're trying to do.`
      },
      {
        role: 'user',
        content: `Classify this request: "${input}"`
      }
    ];

    try {
      const response = await this.provider.chat(messages);
      return this.parseLLMResponse(input, response.content);
    } catch (error) {
      // Fallback to unknown intent
      return this.createUnknownIntent(input);
    }
  }

  /**
   * Parse LLM response to create intent
   */
  private parseLLMResponse(input: string, response: string): VibeIntent {
    const category = this.parseCategoryFromResponse(response);
    const confidence = 0.7; // LLM classification is more reliable

    return {
      id: `llm-${Date.now()}`,
      type: this.mapCategoryToIntentType(category),
      category,
      query: input,
      confidence,
      context: this.extractContext(input, category),
      shouldRemember: input.toLowerCase().includes('remember'),
      shouldApprove: false,
      risk: this.assessRisk(category, {}),
    };
  }

  /**
   * Parse category from LLM response
   */
  private parseCategoryFromResponse(response: string): IntentCategory {
    const lower = response.toLowerCase();

    if (lower.includes('question') || lower.includes('answer') || lower.includes('explain')) return 'question';
    if (lower.includes('code_generation') || lower.includes('generate') || lower.includes('create')) return 'code_generation';
    if (lower.includes('refactor') || lower.includes('improve') || lower.includes('restructure')) return 'refactor';
    if (lower.includes('debug') || lower.includes('fix') || lower.includes('bug')) return 'debug';
    if (lower.includes('test')) return 'testing';
    if (lower.includes('api') || lower.includes('endpoint') || lower.includes('route')) return 'api';
    if (lower.includes('ui') || lower.includes('interface') || lower.includes('component')) return 'ui';
    if (lower.includes('deploy') || lower.includes('release') || lower.includes('production')) return 'deploy';
    if (lower.includes('infra') || lower.includes('infrastructure') || lower.includes('cloud')) return 'infra';
    if (lower.includes('memory') || lower.includes('remember') || lower.includes('store')) return 'memory';
    if (lower.includes('plan') || lower.includes('design') || lower.includes('architecture')) return 'planning';
    if (lower.includes('agent') || lower.includes('autonomous') || lower.includes('task')) return 'agent';
    if (lower.includes('git') || lower.includes('commit') || lower.includes('branch')) return 'git';
    if (lower.includes('analyze') || lower.includes('review') || lower.includes('audit')) return 'analysis';
    if (lower.includes('security') || lower.includes('vulnerability')) return 'security';

    return 'unknown';
  }

  /**
   * Create unknown intent
   */
  private createUnknownIntent(input: string): VibeIntent {
    return {
      id: `unknown-${Date.now()}`,
      type: IntentType.UNKNOWN,
      category: 'unknown',
      query: input,
      confidence: this.UNKNOWN_CONFIDENCE,
      context: {},
      shouldRemember: false,
      shouldApprove: false,
      risk: 'low',
    };
  }

  /**
   * Map category to IntentType enum
   */
  private mapCategoryToIntentType(category: IntentCategory): IntentType {
    const map: Record<IntentCategory, IntentType> = {
      'question': IntentType.ASK,
      'code_generation': IntentType.CODE,
      'refactor': IntentType.REFACTOR,
      'debug': IntentType.DEBUG,
      'testing': IntentType.TEST,
      'api': IntentType.API,
      'ui': IntentType.UI,
      'deploy': IntentType.DEPLOY,
      'infra': IntentType.DEPLOY,
      'memory': IntentType.MEMORY,
      'planning': IntentType.PLAN,
      'agent': IntentType.AGENT,
      'git': IntentType.GIT,
      'analysis': IntentType.ASK,
      'security': IntentType.DEBUG,
      'code_assistant': IntentType.CODE,
      'completion': IntentType.CODE,
      'unknown': IntentType.UNKNOWN,
    };
    return map[category] || IntentType.UNKNOWN;
  }

  /**
   * Check if input is a meta-command
   */
  private isMetaCommand(input: string): boolean {
    const metaCommands = ['help', 'status', 'memory', 'clear', 'exit', 'quit', 'undo', '?', '/help', '/status', '/memory'];
    return metaCommands.includes(input);
  }

  /**
   * Create a meta intent
   */
  private createMetaIntent(input: string): VibeIntent {
    const metaMap: Record<string, IntentCategory> = {
      'help': 'question',
      'status': 'analysis',
      'memory': 'memory',
      'clear': 'unknown',
      'exit': 'unknown',
      'quit': 'unknown',
      'undo': 'agent',
      '?': 'question',
      '/help': 'question',
      '/status': 'analysis',
      '/memory': 'memory',
    };

    const category = metaMap[input.toLowerCase()] || 'unknown';

    return {
      id: `meta-${input}-${Date.now()}`,
      type: this.mapCategoryToIntentType(category),
      category,
      query: input,
      confidence: 1.0,
      context: {},
      shouldRemember: false,
      shouldApprove: false,
      risk: 'low',
    };
  }

  /**
   * Classify the category based on patterns
   */
  private classifyCategory(input: string): IntentCategory {
    let bestMatch: IntentCategory = 'unknown';
    let highestScore = 0;

    for (const pattern of this.patterns) {
      const score = this.calculatePatternScore(input, pattern);

      if (score > highestScore && score > 0) {
        highestScore = score;
        bestMatch = pattern.category;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(input: string, category: IntentCategory): number {
    const pattern = this.patterns.find(p => p.category === category);
    if (!pattern) return this.UNKNOWN_CONFIDENCE;

    let score = pattern.confidence;
    const keywordMatches = pattern.keywords.filter(k => input.includes(k)).length;
    const phraseMatches = pattern.phrases.filter(p => p.test(input)).length;
    score += (keywordMatches + phraseMatches) * 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Extract context from input
   */
  private extractContext(input: string, category: IntentCategory): IntentContext {
    const context: IntentContext = {};

    // Extract file names
    const filePatterns = [/\.ts\b/g, /\.tsx\b/g, /\.js\b/g, /\.jsx\b/g, /\.py\b/g, /\.go\b/g, /\.rs\b/g];
    for (const pattern of filePatterns) {
      const matches = input.match(pattern);
      if (matches) {
        context.files = [...(context.files || []), ...matches];
      }
    }

    // Extract target language
    const languageMatch = input.match(/\b(typescript|javascript|python|java|go|rust|react|vue|node)\b/i);
    if (languageMatch) {
      context.language = languageMatch[1].toLowerCase();
    }

    // Extract framework
    const frameworkMatch = input.match(/\b(nextjs|express|fastify|nestjs|react|vue|angular)\b/i);
    if (frameworkMatch) {
      context.framework = frameworkMatch[1].toLowerCase();
    }

    return context;
  }

  /**
   * Assess risk level
   */
  private assessRisk(category: IntentCategory, context: IntentContext): 'low' | 'medium' | 'high' {
    const highRiskCategories = ['deploy', 'infra', 'git', 'agent'];
    const mediumRiskCategories = ['code_generation', 'refactor', 'api', 'ui', 'security'];

    if (highRiskCategories.includes(category)) return 'high';
    if (mediumRiskCategories.includes(category)) return 'medium';
    if (context.files && context.files.length > 3) return 'medium';

    return 'low';
  }

  /**
   * Determine if this should be remembered
   */
  private shouldRememberThis(category: IntentCategory, input: string): boolean {
    if (category === 'memory') return true;
    if (input.includes('remember') || input.includes('prefer')) return true;
    return false;
  }
}
