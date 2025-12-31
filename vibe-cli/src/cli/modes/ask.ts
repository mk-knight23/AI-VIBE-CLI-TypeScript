/**
 * Ask Mode - Non-interactive one-shot prompt execution
 * Usage: vibe ask "your question" [--json] [--quiet] [--allow-tools] [--dangerously-skip-permissions]
 */

import { ApiClient } from '../../core/api';
import { tools, executeTool } from '../../tools';
import { VIBE_SYSTEM_PROMPT, DEFAULT_MODEL } from '../system-prompt';
import { createSession, addMessage, getMessages, toApiMessages } from '../../storage';
import { getPermission, setPermission, PermissionLevel } from '../../permissions';
import { isReadOnlyTool } from '../../core/security';
import pc from 'picocolors';

export interface AskOptions {
  prompt: string;
  allowTools?: boolean;           // Enable tool execution (safe default: OFF)
  dangerouslySkipPermissions?: boolean;  // YOLO mode - skip all permission checks
  json?: boolean;
  quiet?: boolean;
  model?: string;
  provider?: string;
}

interface AskResult {
  response: string;
  toolsExecuted: string[];
  tokensUsed: number;
  error?: string;
}

export async function askMode(args: string[]): Promise<void> {
  const options = parseAskArgs(args);
  
  if (!options.prompt) {
    console.error(pc.red('Usage: vibe ask "your question" [--json] [--quiet] [--allow-tools]'));
    process.exit(1);
  }

  // YOLO mode warning
  if (options.dangerouslySkipPermissions) {
    if (!options.quiet) {
      console.error(pc.yellow('⚠️  WARNING: --dangerously-skip-permissions enabled'));
      console.error(pc.yellow('   All tool permissions will be bypassed. Use with caution.'));
    }
  }

  const result = await executeAsk(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!options.quiet) {
    if (result.error) {
      console.error(pc.red(`Error: ${result.error}`));
    } else {
      console.log(result.response);
    }
  }

  process.exit(result.error ? 1 : 0);
}

function parseAskArgs(args: string[]): AskOptions {
  const options: AskOptions = { prompt: '' };
  const promptParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--allow-tools' || arg === '-t') {
      options.allowTools = true;
    } else if (arg === '--dangerously-skip-permissions' || arg === '--yolo') {
      options.dangerouslySkipPermissions = true;
      options.allowTools = true; // YOLO implies allow-tools
    } else if (arg === '--auto-approve' || arg === '-y') {
      // Deprecated: map to --allow-tools for backward compatibility
      options.allowTools = true;
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--model' && args[i + 1]) {
      options.model = args[++i];
    } else if (arg === '--provider' && args[i + 1]) {
      options.provider = args[++i];
    } else if (!arg.startsWith('-')) {
      promptParts.push(arg);
    }
  }

  options.prompt = promptParts.join(' ');
  return options;
}

async function executeAsk(options: AskOptions): Promise<AskResult> {
  const result: AskResult = {
    response: '',
    toolsExecuted: [],
    tokensUsed: 0
  };

  try {
    const client = new ApiClient();
    const model = options.model || DEFAULT_MODEL;
    
    // Create session for this ask
    const session = createSession(model, 'universal');
    
    // Add system message
    addMessage(session.id, 'system', VIBE_SYSTEM_PROMPT, estimateTokens(VIBE_SYSTEM_PROMPT));
    addMessage(session.id, 'user', options.prompt, estimateTokens(options.prompt));

    // Build tool schemas
    const toolSchemas = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: Object.entries(t.parameters).reduce((acc, [key, val]: [string, any]) => {
            acc[key] = { type: val.type };
            return acc;
          }, {} as any),
          required: Object.entries(t.parameters)
            .filter(([_, val]: [string, any]) => val.required)
            .map(([key]) => key)
        }
      }
    }));

    // Get messages for API
    const messages = toApiMessages(getMessages(session.id));

    // Call API
    const response = await client.chat(messages, model, {
      temperature: 0.7,
      maxTokens: 4000,
      tools: toolSchemas
    });

    const assistantMessage = response.choices?.[0]?.message;
    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    const reply = assistantMessage.content || '';
    const toolCalls = assistantMessage.tool_calls || [];

    // Store assistant response
    addMessage(session.id, 'assistant', reply, estimateTokens(reply), toolCalls);

    // Execute tool calls (only if --allow-tools is set)
    if (toolCalls.length > 0) {
      if (!options.allowTools) {
        // Safe default: tools disabled in headless mode
        if (!options.quiet && !options.json) {
          console.error(pc.yellow(`ℹ️  ${toolCalls.length} tool(s) requested but --allow-tools not set`));
          console.error(pc.gray('   Use --allow-tools to enable tool execution'));
        }
      } else {
        for (const call of toolCalls) {
          const tool = tools.find(t => t.name === call.function.name);
          if (!tool) continue;

          // YOLO mode: skip all permission checks
          if (options.dangerouslySkipPermissions) {
            try {
              const args = JSON.parse(call.function.arguments);
              if (!options.quiet && !options.json) {
                console.error(pc.gray(`→ ${tool.displayName} (YOLO)`));
              }
              await executeTool(call.function.name, args);
              result.toolsExecuted.push(call.function.name);
            } catch (err: any) {
              if (!options.quiet) console.error(pc.red(`Tool error: ${err.message}`));
            }
            continue;
          }

          // Check permission
          const permission = getPermission(call.function.name, session.id);
          
          if (permission === 'deny') {
            if (!options.quiet) console.error(pc.yellow(`Skipped (denied): ${tool.displayName}`));
            continue;
          }

          // In headless mode without YOLO: only allow read-only tools or pre-approved
          if (permission === 'ask') {
            if (isReadOnlyTool(call.function.name)) {
              // Read-only tools are safe to auto-approve in headless
              setPermission(call.function.name, 'allow_session', session.id);
            } else {
              if (!options.quiet) console.error(pc.yellow(`Skipped (requires approval): ${tool.displayName}`));
              continue;
            }
          }

          // Execute tool
          try {
            const args = JSON.parse(call.function.arguments);
            if (!options.quiet && !options.json) {
              console.error(pc.gray(`→ ${tool.displayName}`));
            }
            await executeTool(call.function.name, args);
            result.toolsExecuted.push(call.function.name);
          } catch (err: any) {
            if (!options.quiet) console.error(pc.red(`Tool error: ${err.message}`));
          }
        }
      }
    }

    result.response = reply;
    result.tokensUsed = response.usage?.total_tokens || estimateTokens(reply);

  } catch (err: any) {
    result.error = err.message;
  }

  return result;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
