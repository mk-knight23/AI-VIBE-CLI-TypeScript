/**
 * VIBE-CLI v12 - Search Tools Module
 * Web search and code research capabilities
 */

import { BaseModule, ModuleResult } from '../base.module';
import { VibeProviderRouter } from '../../providers/router';

export class SearchToolsModule extends BaseModule {
  private provider: VibeProviderRouter;

  constructor() {
    super({
      name: 'search_tools',
      version: '1.0.0',
      description: 'Web search and code research capabilities',
    });
    this.provider = new VibeProviderRouter();
  }

  async execute(params: Record<string, any>): Promise<ModuleResult> {
    const action = params.action || params.type || 'search';

    try {
      switch (action) {
        case 'search':
          return this.webSearch(params);
        case 'code':
          return this.codeSearch(params);
        case 'docs':
          return this.searchDocs(params);
        case 'github':
          return this.searchGitHub(params);
        case 'research':
          return this.research(params);
        default:
          return this.failure(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async webSearch(params: Record<string, any>): Promise<ModuleResult> {
    const { query, limit = 5 } = params;

    if (!query) {
      return this.failure('Missing required parameter: query');
    }

    this.logInfo(`Searching web for "${query}"...`);

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a web search assistant. Find relevant information quickly.' },
      { role: 'user', content: `Search for information about: "${query}". Return ${limit} relevant results with brief descriptions and URLs.` },
    ]);

    return this.success({
      query,
      results: response.content,
      provider: response.provider,
    });
  }

  private async codeSearch(params: Record<string, any>): Promise<ModuleResult> {
    const { query, language, context } = params;

    if (!query) {
      return this.failure('Missing required parameter: query');
    }

    this.logInfo(`Searching code for "${query}"...`);

    const searchContext = context
      ? `In the context of: ${context}`
      : '';

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a code search expert. Find code solutions and examples.' },
      { role: 'user', content: `Find code examples and solutions for: "${query}" ${language ? `in ${language}` : ''}. ${searchContext}` },
    ]);

    return this.success({
      query,
      language,
      results: response.content,
    });
  }

  private async searchDocs(params: Record<string, any>): Promise<ModuleResult> {
    const { library, topic } = params;

    if (!library) {
      return this.failure('Missing required parameter: library');
    }

    this.logInfo(`Searching ${library} documentation...`);

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a documentation expert. Find and explain API usage.' },
      { role: 'user', content: `Find documentation and examples for ${library}${topic ? ` regarding ${topic}` : ''}. Include version information if relevant.` },
    ]);

    return this.success({
      library,
      topic,
      documentation: response.content,
    });
  }

  private async searchGitHub(params: Record<string, any>): Promise<ModuleResult> {
    const { query, language, stars } = params;

    if (!query) {
      return this.failure('Missing required parameter: query');
    }

    this.logInfo(`Searching GitHub for "${query}"...`);

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a GitHub search expert. Find relevant repositories and code.' },
      { role: 'user', content: `Search GitHub for: "${query}"${language ? ` written in ${language}` : ''}${stars ? ` with ${stars}+ stars` : ''}. Return top repository suggestions with descriptions.` },
    ]);

    return this.success({
      query,
      language,
      stars,
      results: response.content,
    });
  }

  private async research(params: Record<string, any>): Promise<ModuleResult> {
    const { topic, depth = 'basic', format = 'summary' } = params;

    if (!topic) {
      return this.failure('Missing required parameter: topic');
    }

    this.logInfo(`Researching "${topic}"...`);

    const response = await this.provider.chat([
      { role: 'system', content: 'You are a research assistant. Provide comprehensive, accurate information.' },
      { role: 'user', content: `Research: "${topic}". Depth: ${depth}. Format: ${format}.

      Include:
      - Overview
      - Key concepts
      - Best practices
      - Common use cases
      - Relevant tools and libraries
      ${depth === 'deep' ? '- Advanced topics and trade-offs' : ''}` },
    ]);

    return this.success({
      topic,
      depth,
      format,
      research: response.content,
    });
  }
}
