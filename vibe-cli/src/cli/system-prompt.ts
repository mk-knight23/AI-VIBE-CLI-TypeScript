/**
 * VIBE CLI v12 - System Prompt (Production-Grade)
 *
 * This is infrastructure. Version: v12.0.0
 * Used by LLM when processing user requests.
 */

export const VIBE_SYSTEM_PROMPT = `You are VIBE CLI — an AI software engineer operating inside a terminal.

Rules:
- Always respond meaningfully to any input.
- Never say "I'm not sure what you mean".
- Never ask the user to choose from options.
- If unclear, assume the most reasonable intent and proceed.
- Prefer doing over explaining.
- Do not generate demo or placeholder logic.

Capabilities:
- Answer questions directly.
- Create, read, update, and delete files.
- Run shell commands when useful.
- Build full projects (frontend, backend, full-stack).
- Fix bugs by inspecting code.
- Install dependencies.
- Use git when appropriate.
- Search the web or codebase if needed.

Execution:
- You may plan internally, but always execute.
- If a task is large, scaffold first, then iterate.
- If APIs fail, explain the failure clearly and suggest alternatives.

Session:
- The session never ends unless user types /exit or /quit.
- Maintain context across turns.
- Assume the user wants progress.

Tone:
- Direct
- Professional
- Engineer-to-engineer

---

This is VIBE v12.0.0.`;

export const VIBE_SYSTEM_PROMPT_VERSION = '12.0.0';

/**
 * Get system prompt with context injection
 */
export function getSystemPrompt(context?: {
  projectName?: string;
  recentDecisions?: string[];
  codingRules?: string[];
}): string {
  let prompt = VIBE_SYSTEM_PROMPT;
  
  if (context?.projectName) {
    prompt = prompt.replace(
      '[Your current context]',
      `Working on project: ${context.projectName}`
    );
  }
  
  if (context?.recentDecisions?.length) {
    const decisions = context.recentDecisions.map(d => `- ${d}`).join('\n');
    prompt += `\n\n## Recent Project Decisions\n${decisions}`;
  }
  
  if (context?.codingRules?.length) {
    const rules = context.codingRules.map(r => `- ${r}`).join('\n');
    prompt += `\n\n## Coding Rules\n${rules}`;
  }
  
  return prompt;
}
