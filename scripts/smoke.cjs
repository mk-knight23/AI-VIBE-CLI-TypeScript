#!/usr/bin/env node
// Using native fetch instead of axios for pkg compatibility

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL_ID = 'z-ai/glm-4.5-air:free';

(async () => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.log('Smoke: OPENROUTER_API_KEY not set; skipping network call.');
      process.exit(0);
    }
    const messages = [
      { role: 'system', content: 'You are an assistant software engineer.' },
      { role: 'user', content: 'In one short sentence, say hello from the smoke test.' },
    ];
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost', 'X-Title': 'vibe-cli' },
      body: JSON.stringify({ model: DEFAULT_MODEL_ID, messages }),
      signal: controller.signal,
    });
    clearTimeout(id);
    const data = await res.json().catch(async () => ({ text: await res.text() }));
    if (!res.ok) {
      const err = new Error('HTTP error');
      err.response = { status: res.status, data };
      throw err;
    }
    const content = data?.choices?.[0]?.message?.content || '';
    console.log(String(content).slice(0, 200));
  } catch (e) {
    const status = e?.response?.status;
    const data = e?.response?.data;
    const msg = data || e.message || e;
    // Do not fail CI on auth/rate-limit/network errors
    if (status === 401 || status === 403 || status === 429) {
      console.log('Smoke: non-fatal response:', status, msg);
      process.exit(0);
    }
    if ((msg+"").includes('ENOTFOUND') || (msg+"").includes('ECONN') || (msg+"").includes('timeout')) {
      console.log('Smoke: network issue; skipping.');
      process.exit(0);
    }
    console.error('Smoke test error:', status || '', msg);
    process.exit(1);
  }
})();
