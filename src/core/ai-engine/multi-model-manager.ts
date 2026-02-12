/**
 * VIBE-CLI v0.0.1 - Multi-Model Manager
 * Support multiple LLMs with intelligent model selection
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../../utils/config.loader.js';

/**
 * Supported AI providers
 */
export type AIProvider = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'ollama';

/**
 * Model tier for cost/speed classification
 */
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

/**
 * Supported models
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  tier: ModelTier;
  contextWindow: number;
  maxTokens: number;
  costPer1kTokens: number;
  speed: 'fast' | 'medium' | 'slow';
  capabilities: string[];
}

/**
 * Model configuration
 */
export interface ModelConfig {
  default: string;
  tasks: Record<string, string>;
  costOptimization: boolean;
  fallbackEnabled: boolean;
}

/**
 * Task type for model selection
 */
export type TaskType =
  | 'code-completion'
  | 'complex-analysis'
  | 'simple-chat'
  | 'refactoring'
  | 'debugging'
  | 'generation'
  | 'explanation'
  | 'planning';

/**
 * Model selection criteria
 */
export interface SelectionCriteria {
  task: TaskType;
  priority: 'speed' | 'quality' | 'cost' | 'balanced';
  maxContext?: number;
  maxCost?: number;
  minCapabilities?: string[];
}

/**
 * Model selection result
 */
export interface ModelSelectionResult {
  model: ModelInfo;
  reasoning: string;
  alternatives: ModelInfo[];
}

/**
 * Multi-Model Manager
 */
export class MultiModelManager {
  private readonly configPath: string;
  private readonly models: Map<string, ModelInfo> = new Map();
  private config: ModelConfig;

  constructor() {
    this.configPath = path.join(process.cwd(), '.vibe', 'config.json');
    this.config = this.loadConfig();
    this.initializeModels();
  }

  /**
   * Initialize available models
   */
  private initializeModels(): void {
    const modelDefinitions: ModelInfo[] = [
      // Anthropic Models
      {
        id: 'anthropic/claude-haiku-4-20250514',
        name: 'Claude Haiku',
        provider: 'anthropic',
        tier: 'haiku',
        contextWindow: 200000,
        maxTokens: 4096,
        costPer1kTokens: 0.003,
        speed: 'fast',
        capabilities: ['code', 'chat', 'analysis'],
      },
      {
        id: 'anthropic/claude-sonnet-4-20250514',
        name: 'Claude Sonnet',
        provider: 'anthropic',
        tier: 'sonnet',
        contextWindow: 200000,
        maxTokens: 8192,
        costPer1kTokens: 0.015,
        speed: 'medium',
        capabilities: ['code', 'chat', 'analysis', 'reasoning'],
      },
      {
        id: 'anthropic/claude-opus-4-20250514',
        name: 'Claude Opus',
        provider: 'anthropic',
        tier: 'opus',
        contextWindow: 200000,
        maxTokens: 16384,
        costPer1kTokens: 0.075,
        speed: 'slow',
        capabilities: ['code', 'chat', 'analysis', 'reasoning', 'complex'],
      },
      // OpenAI Models
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        tier: 'haiku',
        contextWindow: 128000,
        maxTokens: 16384,
        costPer1kTokens: 0.002,
        speed: 'fast',
        capabilities: ['code', 'chat', 'analysis'],
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        tier: 'sonnet',
        contextWindow: 128000,
        maxTokens: 16384,
        costPer1kTokens: 0.03,
        speed: 'medium',
        capabilities: ['code', 'chat', 'analysis', 'vision'],
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        tier: 'opus',
        contextWindow: 128000,
        maxTokens: 16384,
        costPer1kTokens: 0.06,
        speed: 'medium',
        capabilities: ['code', 'chat', 'analysis', 'reasoning'],
      },
      // Google Models
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        tier: 'haiku',
        contextWindow: 1000000,
        maxTokens: 8192,
        costPer1kTokens: 0.001,
        speed: 'fast',
        capabilities: ['code', 'chat', 'analysis', 'vision'],
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        tier: 'opus',
        contextWindow: 1000000,
        maxTokens: 16384,
        costPer1kTokens: 0.007,
        speed: 'medium',
        capabilities: ['code', 'chat', 'analysis', 'reasoning', 'vision'],
      },
      // OpenRouter Models
      {
        id: 'openrouter/auto',
        name: 'OpenRouter Auto',
        provider: 'openrouter',
        tier: 'haiku',
        contextWindow: 128000,
        maxTokens: 8192,
        costPer1kTokens: 0.001,
        speed: 'fast',
        capabilities: ['code', 'chat'],
      },
      // Ollama (local)
      {
        id: 'ollama/llama3.2',
        name: 'Llama 3.2 (Local)',
        provider: 'ollama',
        tier: 'sonnet',
        contextWindow: 131072,
        maxTokens: 8192,
        costPer1kTokens: 0,
        speed: 'medium',
        capabilities: ['code', 'chat'],
      },
      {
        id: 'ollama/codellama',
        name: 'CodeLlama (Local)',
        provider: 'ollama',
        tier: 'sonnet',
        contextWindow: 131072,
        maxTokens: 8192,
        costPer1kTokens: 0,
        speed: 'medium',
        capabilities: ['code'],
      },
    ];

    for (const model of modelDefinitions) {
      this.models.set(model.id, model);
    }
  }

  /**
   * Load configuration
   */
  private loadConfig(): ModelConfig {
    const defaultConfig: ModelConfig = {
      default: 'anthropic/claude-sonnet-4-20250514',
      tasks: {
        'code-completion': 'anthropic/claude-haiku-4-20250514',
        'complex-analysis': 'anthropic/claude-opus-4-20250514',
        'simple-chat': 'anthropic/claude-haiku-4-20250514',
        'refactoring': 'anthropic/claude-sonnet-4-20250514',
        'debugging': 'anthropic/claude-sonnet-4-20250514',
        'generation': 'anthropic/claude-sonnet-4-20250514',
        'explanation': 'anthropic/claude-haiku-4-20250514',
        'planning': 'anthropic/claude-opus-4-20250514',
      },
      costOptimization: true,
      fallbackEnabled: true,
    };

    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const saved = JSON.parse(content);
        return { ...defaultConfig, ...saved.models };
      } catch {
        // Return default config on error
      }
    }

    return defaultConfig;
  }

  /**
   * Save configuration
   */
  private saveConfig(): void {
    let config: any = {};

    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        config = JSON.parse(content);
      } catch {
        config = {};
      }
    }

    config.models = this.config;

    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Select best model for a task
   */
  selectModel(criteria: SelectionCriteria): ModelSelectionResult {
    const { task, priority, maxContext, minCapabilities } = criteria;

    // Check for task-specific override
    if (this.config.tasks[task] && priority !== 'quality') {
      const taskModelId = this.config.tasks[task];
      const taskModel = this.models.get(taskModelId);
      if (taskModel) {
        return {
          model: taskModel,
          reasoning: `Selected ${taskModel.name} for ${task} (task-specific configuration)`,
          alternatives: this.getAlternatives(taskModel),
        };
      }
    }

    // Get all models that meet criteria
    let candidates = Array.from(this.models.values());

    // Filter by context window
    if (maxContext) {
      candidates = candidates.filter((m) => m.contextWindow >= maxContext);
    }

    // Filter by capabilities
    if (minCapabilities && minCapabilities.length > 0) {
      candidates = candidates.filter((m) =>
        minCapabilities.every((cap) => m.capabilities.includes(cap))
      );
    }

    // Sort by priority
    switch (priority) {
      case 'speed':
        candidates.sort((a, b) => {
          const speedOrder = { fast: 0, medium: 1, slow: 2 };
          return speedOrder[a.speed] - speedOrder[b.speed];
        });
        break;

      case 'cost':
        if (this.config.costOptimization) {
          candidates.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens);
        }
        break;

      case 'quality':
        const tierOrder = { opus: 0, sonnet: 1, haiku: 2 };
        candidates.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
        break;

      case 'balanced':
      default:
        // Composite score: lower is better
        candidates.sort((a, b) => {
          const speedScore = { fast: 0, medium: 1, slow: 2 }[a.speed] +
                            { fast: 0, medium: 1, slow: 2 }[b.speed];
          const costScore = a.costPer1kTokens + b.costPer1kTokens;
          const tierScore = { opus: 0, sonnet: 1, haiku: 2 }[a.tier] +
                            { opus: 0, sonnet: 1, haiku: 2 }[b.tier];
          return (speedScore * 0.3 + costScore * 0.2 + tierScore * 0.5) -
                 (speedScore * 0.3 + costScore * 0.2 + tierScore * 0.5);
        });
    }

    const selected = candidates[0];

    if (!selected) {
      // Fallback to default
      const defaultModel = this.models.get(this.config.default);
      return {
        model: defaultModel!,
        reasoning: 'No model matched criteria, using default',
        alternatives: [],
      };
    }

    const reasoning = this.generateReasoning(selected, task, priority);

    return {
      model: selected,
      reasoning,
      alternatives: this.getAlternatives(selected),
    };
  }

  /**
   * Generate selection reasoning
   */
  private generateReasoning(
    model: ModelInfo,
    task: TaskType,
    priority: string
  ): string {
    const reasons: string[] = [];

    reasons.push(`Selected ${model.name} for ${task}`);
    reasons.push(`Priority: ${priority}`);

    if (model.tier === 'haiku') {
      reasons.push('optimized for speed and cost');
    } else if (model.tier === 'opus') {
      reasons.push('highest capability model');
    } else {
      reasons.push('balanced performance');
    }

    if (model.costPer1kTokens === 0) {
      reasons.push('free (local)');
    } else {
      reasons.push(`$${model.costPer1kTokens}/1k tokens`);
    }

    return reasons.join(' | ');
  }

  /**
   * Get alternative models
   */
  private getAlternatives(selected: ModelInfo): ModelInfo[] {
    return Array.from(this.models.values())
      .filter((m) => m.id !== selected.id)
      .slice(0, 3);
  }

  /**
   * Get all available models
   */
  listModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: AIProvider): ModelInfo[] {
    return Array.from(this.models.values()).filter((m) => m.provider === provider);
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): ModelInfo | undefined {
    return this.models.get(modelId);
  }

  /**
   * Set default model
   */
  setDefaultModel(modelId: string): boolean {
    if (!this.models.has(modelId)) {
      return false;
    }

    this.config.default = modelId;
    this.saveConfig();
    return true;
  }

  /**
   * Set task-specific model
   */
  setTaskModel(task: TaskType, modelId: string): boolean {
    if (!this.models.has(modelId)) {
      return false;
    }

    this.config.tasks[task] = modelId;
    this.saveConfig();
    return true;
  }

  /**
   * Get model statistics
   */
  getModelStats(): {
    totalModels: number;
    byProvider: Record<AIProvider, number>;
    byTier: Record<ModelTier, number>;
    costRange: { min: number; max: number };
    averageContext: number;
  } {
    const models = Array.from(this.models.values());

    const byProvider = models.reduce((acc, m) => {
      acc[m.provider] = (acc[m.provider] || 0) + 1;
      return acc;
    }, {} as Record<AIProvider, number>);

    const byTier = models.reduce((acc, m) => {
      acc[m.tier] = (acc[m.tier] || 0) + 1;
      return acc;
    }, {} as Record<ModelTier, number>);

    const costs = models.map((m) => m.costPer1kTokens);
    const contexts = models.map((m) => m.contextWindow);

    return {
      totalModels: models.length,
      byProvider,
      byTier,
      costRange: {
        min: Math.min(...costs),
        max: Math.max(...costs),
      },
      averageContext: contexts.reduce((a, b) => a + b, 0) / contexts.length,
    };
  }

  /**
   * Calculate estimated cost for a request
   */
  estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const model = this.models.get(modelId);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000) * model.costPer1kTokens;
    const outputCost = (outputTokens / 1000) * model.costPer1kTokens;

    return inputCost + outputCost;
  }

  /**
   * Check if API key is configured for a provider
   */
  isProviderConfigured(provider: AIProvider): boolean {
    const envVars: Record<AIProvider, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      ollama: '',
    };

    return !!process.env[envVars[provider]];
  }

  /**
   * Get configured providers
   */
  getConfiguredProviders(): AIProvider[] {
    return Array.from(this.models.values())
      .map((m) => m.provider)
      .filter((p) => this.isProviderConfigured(p) || p === 'ollama');
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson) as ModelConfig;
      this.config = { ...this.config, ...imported };
      this.saveConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current default model ID
   */
  getCurrentModel(): string {
    return this.config.default;
  }

  /**
   * Get current model info
   */
  getCurrentModelInfo(): ModelInfo | undefined {
    return this.models.get(this.config.default);
  }
}

/**
 * Singleton instance
 */
export const multiModelManager = new MultiModelManager();
