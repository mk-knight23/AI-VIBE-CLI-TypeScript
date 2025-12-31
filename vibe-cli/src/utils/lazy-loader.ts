/**
 * Lazy Loader - Defer heavy module loading until needed
 */

type LazyModule<T> = () => Promise<T>;

const cache = new Map<string, any>();

export async function lazyLoad<T>(key: string, loader: LazyModule<T>): Promise<T> {
  if (cache.has(key)) return cache.get(key);
  const module = await loader();
  cache.set(key, module);
  return module;
}

// Pre-defined lazy loaders for heavy modules
export const lazy = {
  storage: () => lazyLoad('storage', () => import('../storage')),
  compact: () => lazyLoad('compact', () => import('../compact')),
  lsp: () => lazyLoad('lsp', () => import('../lsp')),
  mcp: () => lazyLoad('mcp', () => import('../mcp/client')),
  mcpSse: () => lazyLoad('mcp-sse', () => import('../mcp/sse-client')),
  semanticSearch: () => lazyLoad('semantic', () => import('../memory/semantic-search')),
  projectMemory: () => lazyLoad('project-memory', () => import('../memory/project-memory')),
  pipelines: () => lazyLoad('pipelines', () => import('../pipelines')),
  rules: () => lazyLoad('rules', () => import('../rules')),
  export: () => lazyLoad('export', () => import('../output/export')),
};

export function clearCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return { size: cache.size, keys: Array.from(cache.keys()) };
}
