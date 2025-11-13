import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export default async function handler(req, res) {
  const isStream = req.method === 'POST' && (req.query?.stream === '1' || req.query?.stream === 'true');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server misconfigured: missing OPENROUTER_API_KEY' });
    const { model, messages } = req.body || {};
    if (!model || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid payload' });

    if (!isStream) {
      const r = await axios.post(
        `${OPENROUTER_BASE}/chat/completions`,
        { model, messages },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': req.headers['origin'] || 'http://localhost', 'X-Title': 'vibe-cli-web' }, timeout: 60000 }
      );
      return res.status(200).json({ completion: r.data });
    }

    // Streaming path: parse SSE and forward only content text chunks
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    const upstream = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      { model, messages, stream: true },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': req.headers['origin'] || 'http://localhost', 'X-Title': 'vibe-cli-web' }, responseType: 'stream', timeout: 0 }
    );

    let buffer = '';
    upstream.data.on('data', (chunk) => {
      try {
        buffer += chunk.toString();
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop() || '';
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') {
              try { res.end(); } catch {}
              return;
            }
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content
                ?? json?.choices?.[0]?.message?.content
                ?? json?.content
                ?? '';
              if (delta) res.write(delta);
            } catch (parseErr) {
              // ignore JSON parse errors for non-json lines
            }
          }
        }
      } catch (err) {
        console.error('Stream parse error:', err?.message || err);
      }
    });
    upstream.data.on('end', () => {
      try { res.end(); } catch {}
    });
    upstream.data.on('error', (err) => {
      console.error('Upstream stream error', err?.message || err);
      try { res.end(); } catch {}
    });
  } catch (e) {
    const status = e?.response?.status || 500;
    const data = e?.response?.data || { error: e.message };
    console.error('Chat API error:', status, data);
    if (!res.headersSent) res.status(status).json(data); else try { res.end(); } catch {}
  }
}
