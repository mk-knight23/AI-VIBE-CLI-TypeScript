# VIBE CLI v0.0.2 Upgrade Plan

## Overview

This document outlines the comprehensive upgrade plan for VIBE CLI v0.0.2, focusing on modernizing the codebase, improving AI/ML integration, enhancing MCP capabilities, and adopting best practices from the skills ecosystem.

---

## 1. Dependency Upgrades

### 1.1 Current State Analysis

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| @types/node | 25.2.2 | 25.2.3 | Minor update |
| @types/uuid | 11.0.0 | 10.0.0 | Downgrade needed |
| @typescript-eslint/* | 8.54.0 | 8.55.0 | Minor update |
| eslint | 9.39.2 | 10.0.0 | Major update |
| pino | 10.3.0 | 10.3.1 | Patch update |
| uuid | 11.1.0 | 13.0.0 | Major update |
| @modelcontextprotocol/sdk | 1.26.0 | 1.26.0 | Current |

### 1.2 Recommended Updates

#### Critical Updates
- **uuid**: Downgrade to 10.0.0 (11.x has breaking changes)
- **eslint**: Stay at 9.x (10.x requires flat config migration)

#### Minor Updates
- Update all `@typescript-eslint/*` packages to 8.55.0
- Update `@types/node` to 25.2.3
- Update `pino` to 10.3.1

### 1.3 New Dependencies to Consider

```json
{
  "recommendations": [
    "@ai-sdk/core": "For modern AI provider integration",
    "zod": "^3.22.4": "For schema validation (already included)",
    "pino-pretty": "^11.0.0": "For better logging",
    "clipanion": "^4.0.0-rc.4": "For type-safe CLI commands"
  ]
}
```

---

## 2. MCP Integration Enhancements

### 2.1 Current Implementation Review

The current MCP integration (`src/mcp/index.ts`) provides:
- Basic server connection management
- Tool registration
- Heartbeat monitoring
- Context providers (filesystem, git, tests, memory)

### 2.2 Proposed Improvements

#### 2.2.1 Enhanced MCP Manager

```typescript
// src/mcp/enhanced-manager.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, SSEServerTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/http.js";

export interface MCPConfig {
  servers: Map<string, MCPServerConfig>;
  connectionTimeout: number;
  retryAttempts: number;
  healthCheckInterval: number;
}

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'http' | 'sse';
  url?: string;
  enabled?: boolean;
}

export class EnhancedMCPManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport | StreamableHTTPClientTransport> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private eventBus: EventEmitter = new EventEmitter();

  constructor(private config: MCPConfig) {}

  async initialize(): Promise<void> {
    for (const [name, serverConfig] of this.config.servers) {
      if (!serverConfig.enabled) continue;
      
      try {
        await this.connectToServer(name, serverConfig);
        this.eventBus.emit('server:connected', { name });
      } catch (error) {
        this.eventBus.emit('server:error', { name, error });
        console.error(`Failed to connect to ${name}:`, error);
      }
    }
    
    this.startHealthChecks();
  }

  private async connectToServer(name: string, config: MCPServerConfig): Promise<void> {
    const transport = config.transport === 'http' || config.transport === 'sse'
      ? new StreamableHTTPClientTransport(new URL(config.url!))
      : new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: { ...process.env, ...config.env }
        });

    const client = new Client(
      { name: 'vibe-ai-teammate', version: '0.0.2' },
      { 
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    await client.connect(transport);
    
    this.clients.set(name, client);
    this.transports.set(name, transport);
  }

  async callTool<T = unknown>(serverName: string, toolName: string, args: Record<string, unknown>): Promise<T> {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not connected`);
    
    const result = await client.callTool({ name: toolName, arguments: args });
    return this.parseToolResult<T>(result);
  }

  async listResources<T = unknown>(serverName: string): Promise<T[]> {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not connected`);
    
    const { resources } = await client.listResources();
    return resources as T[];
  }

  private parseToolResult<T>(result: any): T {
    if (result.isError) {
      throw new Error(result.content?.[0]?.text || 'Tool call failed');
    }
    return result.content;
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      for (const [name, client] of this.clients) {
        client.ping().catch(() => {
          this.eventBus.emit('server:unhealthy', { name });
          this.reconnect(name);
        });
      }
    }, this.config.healthCheckInterval || 60000);
  }

  private async reconnect(name: string): Promise<void> {
    const config = this.config.servers.get(name);
    if (!config) return;
    
    await this.connectToServer(name, config);
    this.eventBus.emit('server:reconnected', { name });
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    
    for (const transport of this.transports.values()) {
      await transport.close();
    }
    
    this.clients.clear();
    this.transports.clear();
  }
}
```

#### 2.2.2 Context Provider Enhancements

```typescript
// src/mcp/advanced-context-provider.ts

export interface ContextCache {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

export class AdvancedContextProvider {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  
  constructor(private cacheConfig: ContextCache) {}

  async getCachedContext<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
      return cached.data as T;
    }
    
    const fresh = await fetcher();
    this.cache.set(key, { data: fresh, timestamp: Date.now() });
    return fresh;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

---

## 3. AI Provider Router Enhancements

### 3.1 Current Implementation Analysis

The current `src/providers/router.ts` provides:
- Multi-provider support (MiniMax, OpenAI, Anthropic, Google, Ollama)
- Basic streaming support
- API key management

### 3.2 Proposed Improvements

#### 3.2.1 Enhanced Provider Router with Fallback

```typescript
// src/providers/enhanced-router.ts

import { 
  ProviderRouter as BaseRouter,
  ProviderConfig,
  ProviderResponse 
} from './types';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { RateLimiter } from '../utils/rate-limiter';

export interface RouterConfig {
  defaultProvider: string;
  fallbackOrder: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface StreamingConfig {
  enabled: boolean;
  chunkSize: number;
  timeout: number;
}

export class EnhancedProviderRouter extends BaseRouter {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  
  constructor(
    private config: RouterConfig,
    private streamingConfig: StreamingConfig
  ) {
    super();
    this.initializeCircuitBreakers();
    this.initializeRateLimiters();
  }

  private initializeCircuitBreakers(): void {
    for (const provider of this.getProviderIds()) {
      this.circuitBreakers.set(provider, new CircuitBreaker({
        failureThreshold: this.config.circuitBreakerThreshold,
        resetTimeout: this.config.circuitBreakerTimeout
      }));
    }
  }

  private initializeRateLimiters(): void {
    for (const provider of this.getProviderIds()) {
      this.rateLimiters.set(provider, new RateLimiter({
        windowMs: this.config.rateLimitWindow,
        maxRequests: this.config.rateLimitMax
      }));
    }
  }

  async chatWithFallback(
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
    const providers = this.config.fallbackOrder.length > 0 
      ? this.config.fallbackOrder 
      : [this.config.defaultProvider];

    let lastError: Error | null = null;

    for (const provider of providers) {
      const breaker = this.circuitBreakers.get(provider);
      const limiter = this.rateLimiters.get(provider);

      if (breaker?.isOpen()) {
        console.warn(`Circuit breaker open for ${provider}, skipping`);
        continue;
      }

      if (limiter?.isRateLimited()) {
        console.warn(`Rate limited for ${provider}, skipping`);
        continue;
      }

      try {
        limiter?.recordRequest();
        const response = await this.executeChat(provider, messages, options);
        breaker?.recordSuccess();
        return response;
      } catch (error) {
        lastError = error as Error;
        breaker?.recordFailure();
        console.error(`Provider ${provider} failed:`, error);
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  async *streamWithFallback(
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; temperature?: number }
  ): AsyncGenerator<string> {
    const providers = this.config.fallbackOrder.length > 0 
      ? this.config.fallbackOrder 
      : [this.config.defaultProvider];

    for (const provider of providers) {
      try {
        const stream = this.getStreamingClient(provider);
        if (stream) {
          for await (const chunk of stream.stream(messages, options)) {
            yield chunk;
          }
          return;
        }
      } catch (error) {
        console.error(`Streaming failed for ${provider}:`, error);
      }
    }

    throw new Error('All streaming providers failed');
  }

  private async executeChat(
    provider: string,
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; temperature?: number; maxTokens?: number }
  ): Promise<ProviderResponse> {
    const client = this.getProviderClient(provider);
    if (!client) throw new Error(`Provider ${provider} not available`);

    return client.chat(messages, {
      model: options?.model || this.getDefaultModel(provider),
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 4096
    });
  }

  private getDefaultModel(provider: string): string {
    const models: Record<string, string> = {
      minimax: 'MiniMax-M2.1',
      openai: 'gpt-4o',
      anthropic: 'claude-sonnet-4-20250514',
      google: 'gemini-2.0-flash',
      ollama: 'llama3.2'
    };
    return models[provider] || 'gpt-4o';
  }
}
```

#### 3.2.2 Cost Tracking Enhancement

```typescript
// src/providers/cost-tracker.ts

export interface CostEntry {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
  requestId: string;
}

export class CostTracker {
  private entries: CostEntry[] = [];
  private readonly costPerMillionTokens: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 5.00, output: 15.00 },
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'MiniMax-M2.1': { input: 0.10, output: 0.20 }
  };

  track(entry: Omit<CostEntry, 'timestamp' | 'cost'>): void {
    const cost = this.calculateCost(entry);
    this.entries.push({
      ...entry,
      timestamp: new Date(),
      cost
    });
  }

  private calculateCost(entry: Omit<CostEntry, 'timestamp' | 'cost'>): number {
    const rates = this.costPerMillionTokens[entry.model];
    if (!rates) return 0;

    return (
      (entry.promptTokens / 1_000_000 * rates.input) +
      (entry.completionTokens / 1_000_000 * rates.output)
    );
  }

  getTotalCost(provider?: string): number {
    const entries = provider
      ? this.entries.filter(e => e.provider === provider)
      : this.entries;
    
    return entries.reduce((sum, e) => sum + e.cost, 0);
  }

  getUsageByProvider(): Record<string, { requests: number; tokens: number; cost: number }> {
    const usage: Record<string, { requests: number; tokens: number; cost: number }> = {};
    
    for (const entry of this.entries) {
      if (!usage[entry.provider]) {
        usage[entry.provider] = { requests: 0, tokens: 0, cost: 0 };
      }
      usage[entry.provider].requests++;
      usage[entry.provider].tokens += entry.totalTokens;
      usage[entry.provider].cost += entry.cost;
    }
    
    return usage;
  }

  exportCSV(): string {
    const headers = 'Provider,Model,Prompt Tokens,Completion Tokens,Total Tokens,Cost,Timestamp\n';
    const rows = this.entries.map(e => 
      `${e.provider},${e.model},${e.promptTokens},${e.completionTokens},${e.totalTokens},${e.cost.toFixed(4)},${e.timestamp.toISOString()}`
    ).join('\n');
    
    return headers + rows;
  }
}
```

---

## 4. CLI Architecture Improvements

### 4.1 Command Handler Enhancement

```typescript
// src/cli/enhanced-command-handler.ts

import { Command, Argument, Option } from 'commander';
import { logger } from '../utils/logger';
import { telemetry } from '../core/telemetry';

export interface CommandDefinition {
  name: string;
  description: string;
  arguments?: Argument[];
  options?: Option[];
  action: (args: Record<string, unknown>) => Promise<void>;
  aliases?: string[];
  examples?: string[];
}

export class EnhancedCommandHandler {
  private commands: Map<string, CommandDefinition> = new Map();
  private readonly program: Command;

  constructor(private readonly programName: string, private readonly version: string) {
    this.program = new Command();
    this.setupGlobalOptions();
  }

  private setupGlobalOptions(): void {
    this.program
      .name(this.programName)
      .version(this.version)
      .option('--verbose', 'Enable verbose logging')
      .option('--json', 'Output as JSON')
      .option('--no-telemetry', 'Disable telemetry')
      .hook('preAction', (thisCommand, actionCommand) => {
        if (thisCommand.opts().verbose) {
          logger.level = 'debug';
        }
        telemetry.setEnabled(!thisCommand.opts().noTelemetry);
      });
  }

  register(definition: CommandDefinition): void {
    const command = this.program
      .command(definition.name)
      .description(definition.description);

    for (const arg of definition.arguments || []) {
      command.addArgument(arg);
    }

    for (const opt of definition.options || []) {
      command.addOption(opt);
    }

    command.action(async (...args) => {
      const lastArg = args[args.length - 1];
      const options = lastArg.opts?.() || {};
      const positionalArgs = args.slice(0, -1);
      
      try {
        await definition.action(this.parseArgs(positionalArgs, options));
        logger.info(`Command ${definition.name} completed successfully`);
      } catch (error) {
        logger.error(`Command ${definition.name} failed:`, error);
        throw error;
      }
    });

    if (definition.aliases) {
      for (const alias of definition.aliases) {
        this.commands.set(alias, definition);
      }
    }

    this.commands.set(definition.name, definition);
  }

  private parseArgs(args: unknown[], options: Record<string, unknown>): Record<string, unknown> {
    return { ...options, _: args };
  }

  async execute(argv?: string[]): Promise<void> {
    await this.program.parseAsync(argv || process.argv);
  }
}
```

### 4.2 Interactive Mode Enhancement

```typescript
// src/cli/enhanced-interactive.ts

import inquirer from 'inquirer';
import { EnhancedCommandHandler } from './enhanced-command-handler';

export interface InteractiveConfig {
  welcomeMessage: string;
  prompt: string;
  commands: Map<string, string>;
  historySize: number;
}

export class EnhancedInteractiveMode {
  private history: string[] = [];
  private currentInput: string = '';

  constructor(
    private config: InteractiveConfig,
    private commandHandler: EnhancedCommandHandler
  ) {}

  async start(): Promise<void> {
    console.log(this.config.welcomeMessage);
    
    while (true) {
      const answer = await inquirer.prompt<{ input: string }>([{
        type: 'input',
        name: 'input',
        message: this.config.prompt,
        suffix: ' → ',
        autocomplete: this.getAutocompleteList(),
        validate: (input: string) => {
          if (input.trim() === '') return true;
          const [cmd] = input.trim().split(' ');
          return this.config.commands.has(cmd) || cmd === 'exit';
        }
      }]);

      const { input } = answer;
      
      if (input.trim() === '') continue;
      if (input.trim().toLowerCase() === 'exit') break;
      if (input.trim().toLowerCase() === 'clear') {
        console.clear();
        this.history = [];
        continue;
      }

      this.history.push(input);
      if (this.history.length > this.config.historySize) {
        this.history.shift();
      }

      await this.executeCommand(input);
    }

    console.log('Goodbye!');
  }

  private getAutocompleteList(): (input: string) => Promise<string[]> {
    return async (input: string) => {
      const lowerInput = input.toLowerCase();
      const commands = Array.from(this.config.commands.keys());
      
      return commands.filter(cmd => 
        cmd.toLowerCase().startsWith(lowerInput)
      );
    };
  }

  private async executeCommand(input: string): Promise<void> {
    const [cmd, ...args] = input.trim().split(' ');
    
    if (!this.config.commands.has(cmd)) {
      console.error(`Unknown command: ${cmd}`);
      return;
    }

    const description = this.config.commands.get(cmd)!;
    console.log(`Executing: ${description}`);

    try {
      await this.commandHandler.execute([cmd, ...args]);
    } catch (error) {
      console.error('Command failed:', error);
    }
  }
}
```

---

## 5. Primitives System Improvements

### 5.1 Enhanced Execution Primitive

```typescript
// src/primitives/enhanced-execution.ts

export interface ExecutionConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
  sandbox: boolean;
  allowedPaths: string[];
  disallowedCommands: string[];
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  retriesUsed: number;
}

export class EnhancedExecutionPrimitive {
  constructor(private config: ExecutionConfig) {}

  async execute(
    command: string,
    options?: { cwd?: string; env?: Record<string, string>; timeout?: number }
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let retriesUsed = 0;

    // Security checks
    if (this.config.sandbox) {
      this.validateCommand(command);
    }

    while (retriesUsed <= this.config.retries) {
      try {
        const result = await this.runCommand(command, options);
        return {
          success: true,
          output: result.stdout,
          duration: Date.now() - startTime,
          retriesUsed
        };
      } catch (error) {
        retriesUsed++;
        
        if (retriesUsed > this.config.retries) {
          return {
            success: false,
            output: '',
            error: (error as Error).message,
            duration: Date.now() - startTime,
            retriesUsed
          };
        }

        await this.delay(this.config.retryDelay * retriesUsed);
      }
    }

    return {
      success: false,
      output: '',
      error: 'Max retries exceeded',
      duration: Date.now() - startTime,
      retriesUsed
    };
  }

  private validateCommand(command: string): void {
    const disallowed = this.config.disallowedCommands;
    
    for (const pattern of disallowed) {
      if (command.includes(pattern)) {
        throw new Error(`Command contains disallowed pattern: ${pattern}`);
      }
    }
  }

  private runCommand(command: string, options?: { cwd?: string; env?: Record<string, string> }): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const child = exec(command, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        timeout: this.config.timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: string) => {
        stdout += data;
      });

      child.stderr?.on('data', (data: string) => {
        stderr += data;
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', reject);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5.2 Enhanced Planning Primitive

```typescript
// src/primitives/enhanced-planning.ts

export interface PlanStep {
  id: string;
  description: string;
  command?: string;
  fileOperations?: FileOperation[];
  dependencies: string[];
  estimatedDuration: number;
  risk: 'low' | 'medium' | 'high';
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  estimatedTotalDuration: number;
  totalRisk: 'low' | 'medium' | 'high';
}

export interface PlanningOptions {
  maxSteps: number;
  allowParallel: boolean;
  autoApproveLowRisk: boolean;
}

export class EnhancedPlanningPrimitive {
  private planHistory: Plan[] = [];

  async createPlan(
    goal: string,
    context: Record<string, unknown>,
    options: PlanningOptions
  ): Promise<Plan> {
    const steps: PlanStep[] = [];
    let stepId = 1;

    // Use AI to generate plan steps
    const aiSteps = await this.generateStepsWithAI(goal, context, options.maxSteps);

    for (const aiStep of aiSteps) {
      const step: PlanStep = {
        id: `step-${stepId++}`,
        description: aiStep.description,
        command: aiStep.command,
        fileOperations: aiStep.fileOperations,
        dependencies: aiStep.dependencies || [],
        estimatedDuration: aiStep.estimatedDuration || 5,
        risk: aiStep.risk || 'low'
      };
      steps.push(step);
    }

    const plan: Plan = {
      id: `plan-${Date.now()}`,
      goal,
      steps,
      estimatedTotalDuration: steps.reduce((sum, s) => sum + s.estimatedDuration, 0),
      totalRisk: this.calculateTotalRisk(steps)
    };

    this.planHistory.push(plan);
    return plan;
  }

  async validatePlan(plan: Plan): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const step of plan.steps) {
      if (this.hasCycle(step.id, step.dependencies, new Set(), recursionStack)) {
        errors.push(`Circular dependency detected involving step ${step.id}`);
      }
    }

    // Validate dependencies exist
    const stepIds = new Set(plan.steps.map(s => s.id));
    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep) && dep !== 'root') {
          errors.push(`Step ${step.id} depends on non-existent step ${dep}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async executePlan(
    plan: Plan,
    options?: { onStepStart?: (step: PlanStep) => void; onStepComplete?: (step: PlanStep) => void }
  ): Promise<{ success: boolean; completedSteps: string[]; failedStep?: string }> {
    const completedSteps: string[] = [];
    const executionQueue = this.topologicalSort(plan.steps);

    for (const step of executionQueue) {
      options?.onStepStart?.(step);

      try {
        await this.executeStep(step);
        completedSteps.push(step.id);
        options?.onStepComplete?.(step);
      } catch (error) {
        return {
          success: false,
          completedSteps,
          failedStep: step.id
        };
      }
    }

    return {
      success: true,
      completedSteps
    };
  }

  private async generateStepsWithAI(
    goal: string,
    context: Record<string, unknown>,
    maxSteps: number
  ): Promise<Array<{
    description: string;
    command?: string;
    fileOperations?: Array<{ path: string; operation: string; content?: string }>;
    dependencies?: string[];
    estimatedDuration?: number;
    risk?: 'low' | 'medium' | 'high';
  }>> {
    // Implementation would use AI provider to generate steps
    // This is a placeholder
    return [];
  }

  private hasCycle(
    stepId: string,
    dependencies: string[],
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(stepId);
    recursionStack.add(stepId);

    for (const dep of dependencies) {
      if (!visited.has(dep)) {
        if (this.hasCycle(dep, dependencies, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        return true;
      }
    }

    recursionStack.delete(stepId);
    return false;
  }

  private calculateTotalRisk(steps: PlanStep[]): 'low' | 'medium' | 'high' {
    const riskScores = { low: 1, medium: 2, high: 3 };
    const avgRisk = steps.reduce((sum, s) => sum + riskScores[s.risk], 0) / steps.length;
    
    if (avgRisk <= 1.5) return 'low';
    if (avgRisk <= 2.5) return 'medium';
    return 'high';
  }

  private topologicalSort(steps: PlanStep[]): PlanStep[] {
    const sorted: PlanStep[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (step: PlanStep) => {
      if (temp.has(step.id)) return;
      if (visited.has(step.id)) return;

      temp.add(step.id);

      for (const depId of step.dependencies) {
        const depStep = steps.find(s => s.id === depId);
        if (depStep) visit(depStep);
      }

      temp.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        visit(step);
      }
    }

    return sorted;
  }

  private async executeStep(step: PlanStep): Promise<void> {
    // Implementation would execute the step
    console.log(`Executing step: ${step.description}`);
  }
}
```

---

## 6. Database & Caching Improvements

### 6.1 Enhanced Database Manager

```typescript
// src/core/database/enhanced-manager.ts

import Database from 'better-sqlite3';
import { LRUCache } from '../cache/lru-cache';

export interface DatabaseConfig {
  path: string;
  maxSize: number;
  vacuumInterval: number;
}

export interface CacheConfig {
  maxEntries: number;
  ttl: number;
  namespace: string;
}

export class EnhancedDatabaseManager {
  private db: Database.Database;
  private cache: LRUCache<string, unknown>;
  private readonly config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.db = new Database(config.path);
    this.cache = new LRUCache(config.maxSize);
    this.setupPragmas();
    this.createTables();
    this.startVacuumScheduler();
  }

  private setupPragmas(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('mmap_size = 268435456'); // 256MB mmap
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS context_cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER DEFAULT (unixepoch()),
        action TEXT,
        details TEXT,
        user_id TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);
      CREATE INDEX IF NOT EXISTS idx_context_cache_expires ON context_cache(expires_at);
    `);
  }

  async get<T>(key: string, options?: { ttl?: number; namespace?: string }): Promise<T | null> {
    const cacheKey = this.getCacheKey(key, options?.namespace);

    // Check memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached as T;
    }

    // Check database
    const stmt = this.db.prepare(`
      SELECT value FROM context_cache 
      WHERE key = ? AND (expires_at IS NULL OR expires_at > unixepoch())
    `);
    const result = stmt.get(cacheKey) as { value: string } | undefined;

    if (result) {
      const parsed = JSON.parse(result.value);
      this.cache.set(cacheKey, parsed);
      return parsed as T;
    }

    return null;
  }

  async set<T>(
    key: string,
    value: T,
    options?: { ttl?: number; namespace?: string }
  ): Promise<void> {
    const cacheKey = this.getCacheKey(key, options?.namespace);
    const expiresAt = options?.ttl 
      ? Date.now() / 1000 + options.ttl 
      : null;

    // Update memory cache
    this.cache.set(cacheKey, value);

    // Update database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO context_cache (key, value, created_at, expires_at)
      VALUES (?, ?, unixepoch(), ?)
    `);
    stmt.run(cacheKey, JSON.stringify(value), expiresAt);
  }

  async delete(key: string, namespace?: string): Promise<void> {
    const cacheKey = this.getCacheKey(key, namespace);
    this.cache.delete(cacheKey);

    const stmt = this.db.prepare('DELETE FROM context_cache WHERE key = ?');
    stmt.run(cacheKey);
  }

  async clear(namespace?: string): Promise<void> {
    const pattern = namespace 
      ? `${namespace}:%` 
      : '%';

    this.cache.clear();

    const stmt = this.db.prepare('DELETE FROM context_cache WHERE key LIKE ?');
    stmt.run(pattern);
  }

  async vacuum(): Promise<void> {
    await this.db.exec('VACUUM');
  }

  private getCacheKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private startVacuumScheduler(): void {
    setInterval(() => {
      // Clean expired entries
      this.db.prepare('DELETE FROM context_cache WHERE expires_at < unixepoch()').run();
      
      // Vacuum periodically
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    }, this.config.vacuumInterval);
  }

  close(): void {
    this.cache.clear();
    this.db.close();
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Test Improvements

```typescript
// tests/unit/enhanced-router.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedProviderRouter } from '../../src/providers/enhanced-router';

describe('EnhancedProviderRouter', () => {
  let router: EnhancedProviderRouter;

  beforeEach(() => {
    router = new EnhancedProviderRouter(
      {
        defaultProvider: 'openai',
        fallbackOrder: ['openai', 'anthropic'],
        rateLimitWindow: 60000,
        rateLimitMax: 100,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 30000
      },
      {
        enabled: true,
        chunkSize: 100,
        timeout: 30000
      }
    );
  });

  describe('chatWithFallback', () => {
    it('should execute successfully when primary provider is available', async () => {
      const mockResponse = { content: 'Hello!', usage: { totalTokens: 10 } };
      vi.spyOn(router as any, 'executeChat').mockResolvedValue(mockResponse);

      const messages = [{ role: 'user', content: 'Hi' }];
      const result = await router.chatWithFallback(messages);

      expect(result.content).toBe('Hello!');
    });

    it('should fallback to secondary provider on failure', async () => {
      const mockResponse = { content: 'Fallback response', usage: { totalTokens: 10 } };
      
      vi.spyOn(router as any, 'executeChat')
        .mockRejectedValueOnce(new Error('Primary failed'))
        .mockResolvedValueOnce(mockResponse);

      const messages = [{ role: 'user', content: 'Hi' }];
      const result = await router.chatWithFallback(messages);

      expect(result.content).toBe('Fallback response');
    });

    it('should throw when all providers fail', async () => {
      vi.spyOn(router as any, 'executeChat').mockRejectedValue(new Error('All failed'));

      await expect(
        router.chatWithFallback([{ role: 'user', content: 'Hi' }])
      ).rejects.toThrow('All providers failed');
    });
  });

  describe('cost tracking', () => {
    it('should track cost for each request', () => {
      const tracker = new (require('../../src/providers/cost-tracker').CostTracker)();
      
      tracker.track({
        provider: 'openai',
        model: 'gpt-4o',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        requestId: 'req-123'
      });

      expect(tracker.getTotalCost()).toBeGreaterThan(0);
    });
  });
});
```

### 7.2 Integration Test Setup

```typescript
// tests/integration/mcp-integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EnhancedMCPManager } from '../../src/mcp/enhanced-manager';
import { MCPTestServer } from '../helpers/mcp-test-server';

describe('MCP Integration', () => {
  let manager: EnhancedMCPManager;
  let testServer: MCPTestServer;

  beforeAll(async () => {
    testServer = new MCPTestServer({
      command: 'node',
      args: ['./tests/helpers/mock-mcp-server.js'],
      env: { PORT: '3456' }
    });
    await testServer.start();

    manager = new EnhancedMCPManager({
      servers: new Map([['test', {
        command: 'node',
        args: ['./tests/helpers/mock-mcp-server.js'],
        transport: 'stdio',
        enabled: true
      }]]),
      connectionTimeout: 10000,
      retryAttempts: 3,
      healthCheckInterval: 30000
    });

    await manager.initialize();
  });

  afterAll(async () => {
    await manager.shutdown();
    await testServer.stop();
  });

  it('should connect to MCP server', async () => {
    const servers = manager.listServers();
    expect(servers).toContain('test');
  });

  it('should call tool successfully', async () => {
    const result = await manager.callTool('test', 'echo', { message: 'Hello' });
    expect(result).toEqual({ response: 'Hello' });
  });
});
```

---

## 8. Documentation Updates

### 8.1 Migration Guide

```markdown
# Migration Guide: v0.0.1 → v0.0.2

## Breaking Changes

### Provider Router
The `ProviderRouter` class now extends `EnhancedProviderRouter`:

```typescript
// Before
import { ProviderRouter } from './providers/router';
const router = new ProviderRouter();

// After
import { EnhancedProviderRouter } from './providers/enhanced-router';
const router = new EnhancedProviderRouter(config, streamingConfig);
```

### MCP Manager
The MCP manager now uses the new `EnhancedMCPManager`:

```typescript
// Before
import { mcpManager } from './mcp';
await mcpManager.initialize();

// After
import { EnhancedMCPManager } from './mcp/enhanced-manager';
const manager = new EnhancedMCPManager(config);
await manager.initialize();
```

### Database
Database operations now use `EnhancedDatabaseManager`:

```typescript
// Before
import { DatabaseManager } from './database';
const db = new DatabaseManager();
await db.get(key);

// After
import { EnhancedDatabaseManager } from './database/enhanced-manager';
const db = new EnhancedDatabaseManager({ path: '~/.vibe.db', maxSize: 1000, vacuumInterval: 3600000 });
await db.get(key, { namespace: 'context', ttl: 300 });
```

## New Features

1. **Circuit Breaker Pattern**: Automatic failover when providers fail
2. **Rate Limiting**: Built-in rate limiting per provider
3. **Cost Tracking**: Track API costs by provider and model
4. **Enhanced Caching**: LRU cache with TTL support
5. **Streaming Support**: Better streaming with chunk management

## Deprecations

- `src/adapters/router.ts` - Use `src/providers/enhanced-router.ts`
- `src/mcp/index.ts` - Use `src/mcp/enhanced-manager.ts`
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Update dependencies
- [ ] Refactor Provider Router with EnhancedProviderRouter
- [ ] Add Circuit Breaker pattern
- [ ] Implement Rate Limiting

### Phase 2: MCP Enhancements (Week 2)
- [ ] Upgrade MCP Manager with EnhancedMCPManager
- [ ] Add Context Caching
- [ ] Implement Health Checks
- [ ] Add Streaming Support

### Phase 3: CLI Improvements (Week 3)
- [ ] Implement EnhancedCommandHandler
- [ ] Add EnhancedInteractiveMode
- [ ] Improve Error Handling
- [ ] Add Telemetry

### Phase 4: Testing & Documentation (Week 4)
- [ ] Write Unit Tests
- [ ] Write Integration Tests
- [ ] Create Migration Guide
- [ ] Update User Guide

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Command execution time | < 500ms | Benchmark suite |
| Provider fallback success rate | > 99% | Production metrics |
| MCP connection reliability | > 99.9% | Health checks |
| Test coverage | > 80% | Coverage reports |
| Documentation completeness | 100% | Checklist |

---

*Last Updated: 2026-02-12*
*Version: 0.0.2*
