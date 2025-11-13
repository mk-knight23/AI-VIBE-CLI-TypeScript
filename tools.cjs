const axios = require('axios');

async function webSearch(query) {
  if (!query || !query.trim()) return 'Empty query';
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    const { data } = await axios.get(url, { timeout: 15000 });
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
    const { data } = await axios.get(url, { timeout: 20000 });
    if (typeof data === 'string') return data.slice(0, 20000);
    return JSON.stringify(data).slice(0, 20000);
  } catch (e) {
    return `Docs fetch error: ${e?.message || e}`;
  }
}

module.exports = { webSearch, webFetchDocs };
