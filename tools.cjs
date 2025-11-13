// Replaced axios with native fetch for pkg-compatibility


function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...rest, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

async function webSearch(query) {
  if (!query || !query.trim()) return 'Empty query';
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const resp = await fetchWithTimeout(url, { timeout: 15000 });
    const contentType = resp.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await resp.json() : await resp.text();
    const parts = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.Heading) parts.push(`Heading: ${data.Heading}`);
    if (Array.isArray(data.RelatedTopics)) {
      const tops = data.RelatedTopics
        .map((t) => (t.Text || t.Result || '').replace(/<[^>]*>/g, ''))
        .filter(Boolean)
        .slice(0, 5);
      if (tops.length) parts.push('Related: ' + tops.join(' | '));
    }
    const combined = parts.join('\n');
    return combined || 'No instant answer found.';
  } catch (e) {
    return `Search error: ${e?.message || e}`;
  }
}

const OPENROUTER_DOCS = 'https://openrouter.ai/docs';
const ALLOWED_PAGES = new Set(['quick-start','models','api-reference','sdks','guides','errors','authentication','rate-limits']);

async function webFetchDocs(page) {
  const p = String(page || '').trim();
  if (!ALLOWED_PAGES.has(p)) return 'Invalid docs page';
  try {
    const url = `${OPENROUTER_DOCS}/${p}`;
    const resp = await fetchWithTimeout(url, { timeout: 20000 });
    const contentType = resp.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await resp.json() : await resp.text();
    if (typeof body === 'string') return body.slice(0, 20000);
    return JSON.stringify(body).slice(0, 20000);
  } catch (e) {
    return `Docs fetch error: ${e?.message || e}`;
  }
}

module.exports = { webSearch, webFetchDocs };
