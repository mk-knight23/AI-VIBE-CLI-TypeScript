/**
 * Config Loader - Load and validate vibe.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { LLMConfig, ModelConfig, RoutingRule } from '../core/llm/types';
import { modelRegistry } from '../core/llm/model-registry';
import { providerRegistry } from '../core/llm/provider-registry';

const CONFIG_NAMES = ['vibe.json', '.vibe.json', 'vibe.config.json'];

export interface LoadedConfig {
  config: LLMConfig | null;
  path: string | null;
  errors: string[];
}

export function findConfigFile(startDir: string = process.cwd()): string | null {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    for (const name of CONFIG_NAMES) {
      const configPath = path.join(dir, name);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

export function loadConfig(configPath?: string): LoadedConfig {
  const errors: string[] = [];
  const filePath = configPath || findConfigFile();

  if (!filePath) {
    return { config: null, path: null, errors: [] };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(content) as LLMConfig;

    // Validate
    if (!config.model) {
      errors.push('Missing required field: model');
    }

    // Register custom models from config
    if (config.provider) {
      for (const [providerId, providerConfig] of Object.entries(config.provider)) {
        if (providerConfig.models) {
          for (const [modelId, modelConfig] of Object.entries(providerConfig.models)) {
            const fullId = `${providerId}/${modelId}`;
            if (!modelRegistry.has(fullId)) {
              modelRegistry.register(fullId, {
                id: modelId,
                provider: providerId,
                config: {
                  context: modelConfig.context || 32000,
                  output: modelConfig.output,
                  supports: {
                    tools: true,
                    vision: false,
                    reasoning: false,
                    streaming: true
                  },
                  cost: modelConfig.cost || 'medium',
                  speed: modelConfig.speed || 'medium',
                  priority: modelConfig.priority,
                  local: modelConfig.local
                }
              });
            }
          }
        }

        // Register custom provider if baseURL provided
        if (providerConfig.baseURL && !providerRegistry.has(providerId)) {
          providerRegistry.register({
            id: providerId,
            name: providerId,
            type: 'cloud',
            sdk: 'openai-compatible',
            baseURL: providerConfig.baseURL,
            env: []
          });
        }
      }
    }

    return { config, path: filePath, errors };
  } catch (err) {
    errors.push(`Failed to parse config: ${(err as Error).message}`);
    return { config: null, path: filePath, errors };
  }
}

export function createDefaultConfig(): LLMConfig {
  return {
    $schema: 'https://vibe.ai/schema.json',
    provider: {},
    model: 'openrouter/google/gemini-2.0-flash-001',
    routing: {
      code: ['qwen/qwen-2.5-coder-32b', 'deepseek/deepseek-chat'],
      chat: ['openrouter/google/gemini-2.0-flash-001'],
      cheap: ['groq/llama-3.1-8b', 'deepseek/deepseek-chat'],
      reasoning: ['openai/o3-mini', 'deepseek/deepseek-reasoner']
    }
  };
}

export function saveConfig(config: LLMConfig, configPath: string = 'vibe.json'): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
