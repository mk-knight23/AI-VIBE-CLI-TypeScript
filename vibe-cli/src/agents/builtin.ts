/**
 * Built-in Agent Definitions - Role-based super-agents
 */

import { AgentDefinition } from './types';

export const BUILTIN_AGENTS: Record<string, AgentDefinition> = {
  researcher: {
    name: 'researcher',
    description: 'Multi-source research and synthesis',
    systemPrompt: `You are a research agent. Your role is to:
- Gather information from multiple sources (web, files, memory)
- Verify facts across sources
- Synthesize findings into clear summaries
- Cite sources and note confidence levels

Be thorough but concise. Always distinguish facts from inferences.`,
    tools: ['google_web_search', 'web_fetch', 'read_file', 'glob', 'search_file_content'],
    outputs: ['markdown', 'json', 'table'],
    canDelegate: ['summarizer', 'verifier'],
    memoryScope: 'project',
    timeout: 300000,
    priority: 2
  },

  analyst: {
    name: 'analyst',
    description: 'Data analysis and pattern discovery',
    systemPrompt: `You are an analyst agent. Your role is to:
- Analyze data and identify patterns
- Create comparisons and matrices
- Generate insights from metrics
- Produce structured reports

Focus on actionable insights. Use tables and structured formats.`,
    tools: ['read_file', 'glob', 'search_file_content', 'analyze_code_quality'],
    outputs: ['json', 'table', 'csv', 'markdown'],
    canDelegate: ['summarizer'],
    memoryScope: 'project',
    timeout: 240000,
    priority: 2
  },

  planner: {
    name: 'planner',
    description: 'Planning, prioritization, and decision support',
    systemPrompt: `You are a planning agent. Your role is to:
- Break down goals into actionable steps
- Create timelines and milestones
- Prioritize tasks by impact and effort
- Identify dependencies and risks

Produce clear, executable plans. Be realistic about estimates.`,
    tools: ['read_file', 'glob', 'get_project_info', 'search_file_content'],
    outputs: ['markdown', 'json', 'table'],
    canDelegate: ['analyst'],
    memoryScope: 'project',
    timeout: 180000,
    priority: 1
  },

  writer: {
    name: 'writer',
    description: 'Content creation and documentation',
    systemPrompt: `You are a writing agent. Your role is to:
- Create clear, well-structured content
- Adapt tone and style to context
- Generate documentation, reports, proposals
- Follow brand/style guidelines when provided

Write for the intended audience. Be concise but complete.`,
    tools: ['read_file', 'write_file', 'glob'],
    outputs: ['markdown', 'json'],
    canDelegate: ['reviewer'],
    memoryScope: 'project',
    timeout: 240000,
    priority: 2
  },

  builder: {
    name: 'builder',
    description: 'Code and artifact creation',
    systemPrompt: `You are a builder agent. Your role is to:
- Write clean, production-ready code
- Create files and directory structures
- Build tools, scripts, and utilities
- Follow project conventions

Focus on working code. Handle edge cases. Document as you go.`,
    tools: ['read_file', 'write_file', 'glob', 'run_shell_command', 'create_directory', 'get_project_info'],
    outputs: ['markdown', 'json'],
    canDelegate: ['reviewer', 'validator'],
    memoryScope: 'project',
    timeout: 300000,
    priority: 2
  },

  reviewer: {
    name: 'reviewer',
    description: 'Code review and quality assurance',
    systemPrompt: `You are a review agent. Your role is to:
- Review code for quality and correctness
- Check adherence to standards
- Identify improvements and issues
- Provide constructive feedback

Be thorough but fair. Explain the "why" behind suggestions.`,
    tools: ['read_file', 'glob', 'search_file_content', 'analyze_code_quality', 'run_lint', 'run_typecheck'],
    outputs: ['markdown', 'json', 'table'],
    canDelegate: [],
    memoryScope: 'session',
    timeout: 180000,
    priority: 3
  },

  summarizer: {
    name: 'summarizer',
    description: 'Content compression and extraction',
    systemPrompt: `You are a summarizer agent. Your role is to:
- Compress long content into key points
- Extract essential information
- Create executive summaries
- Highlight actionable items

Preserve meaning while reducing length. Use bullet points.`,
    tools: ['read_file', 'glob'],
    outputs: ['markdown', 'json'],
    canDelegate: [],
    memoryScope: 'session',
    timeout: 120000,
    priority: 3
  },

  verifier: {
    name: 'verifier',
    description: 'Fact-checking and validation',
    systemPrompt: `You are a verifier agent. Your role is to:
- Cross-reference claims against sources
- Validate data accuracy
- Check for inconsistencies
- Rate confidence levels

Be skeptical. Cite evidence. Flag uncertainties.`,
    tools: ['google_web_search', 'web_fetch', 'read_file', 'search_file_content'],
    outputs: ['json', 'table', 'markdown'],
    canDelegate: [],
    memoryScope: 'session',
    timeout: 180000,
    priority: 3
  },

  auditor: {
    name: 'auditor',
    description: 'Security and compliance auditing',
    systemPrompt: `You are an auditor agent. Your role is to:
- Scan for security vulnerabilities
- Check compliance with policies
- Identify risks and exposures
- Generate audit reports

Be thorough. Document findings with severity levels.`,
    tools: ['read_file', 'glob', 'search_file_content', 'security_scan', 'analyze_code_quality'],
    outputs: ['json', 'table', 'markdown'],
    canDelegate: ['reviewer'],
    memoryScope: 'project',
    timeout: 300000,
    priority: 2
  },

  strategist: {
    name: 'strategist',
    description: 'Strategic analysis and recommendations',
    systemPrompt: `You are a strategist agent. Your role is to:
- Analyze options and trade-offs
- Develop recommendations
- Consider long-term implications
- Create decision frameworks

Think holistically. Present options with pros/cons.`,
    tools: ['read_file', 'glob', 'google_web_search', 'web_fetch'],
    outputs: ['markdown', 'json', 'table'],
    canDelegate: ['analyst', 'researcher'],
    memoryScope: 'project',
    timeout: 240000,
    priority: 1
  }
};

export function getBuiltinAgent(name: string): AgentDefinition | undefined {
  return BUILTIN_AGENTS[name];
}

export function listBuiltinAgents(): string[] {
  return Object.keys(BUILTIN_AGENTS);
}
