import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';

export default function Chat() {
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('z-ai/glm-4.5-air:free');
  const [system, setSystem] = useState('You are an assistant software engineer with broad knowledge. Provide clear, accurate, and practical guidance.');
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/models');
        const j = await r.json();
        if (Array.isArray(j.models)) {
          setModels(j.models);
          // Ensure default exists, else pick first
          const ids = j.models.map(m => m.id || m.slug || m.name);
          if (!ids.includes(model) && ids.length) setModel(ids[0]);
        } else if (j.error) {
          setError(j.error);
        }
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
  }, []);

  const choices = useMemo(() => (models || []).map(m => ({ id: m.id || m.slug || m.name, name: m.name || m.id })), [models]);
  const filteredMsgs = useMemo(() => {
    if (!search.trim()) return msgs;
    const q = search.toLowerCase();
    return msgs.filter(m => (m.content || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q));
  }, [msgs, search]);

  async function send() {
    if (!input.trim()) return;
    setBusy(true);
    setError('');
    const next = [...msgs];
    if (!next.length) next.push({ role: 'system', content: system });
    next.push({ role: 'user', content: input });
    setMsgs(next);
    setInput('');

    try {
      if (!stream) {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: next }),
        });
        const j = await r.json();
        const content = j?.completion?.choices?.[0]?.message?.content || j?.error || '(no content)';
        setMsgs(prev => [...prev, { role: 'assistant', content }]);
      } else {
        // streaming
        setMsgs(prev => [...prev, { role: 'assistant', content: '' }]);
        const res = await fetch('/api/chat?stream=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: next }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          if (chunk.value) {
            const text = decoder.decode(chunk.value);
            setMsgs(prev => {
              const arr = [...prev];
              const last = arr[arr.length - 1];
              if (last && last.role === 'assistant') last.content += text;
              return arr;
            });
          }
        }
      }
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner">
          <div className="brand">Vibe Chat</div>
          <div className="spacer" />
          <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages..." />
          <div className={"dropdown" + (menuOpen ? ' open' : '')}>
            <button className="btn" onClick={() => setMenuOpen(v => !v)}>Menu ▾</button>
            <div className="dropdown-menu" onMouseLeave={() => setMenuOpen(false)}>
              <div className="dropdown-item" onClick={() => { setMsgs([]); setMenuOpen(false); }}>Clear conversation</div>
              <div className="dropdown-item" onClick={() => { setStream(s => !s); setMenuOpen(false); }}>Toggle stream: {stream ? 'On' : 'Off'}</div>
              <div className="dropdown-item" onClick={() => { const blob = new Blob([JSON.stringify(msgs, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'transcript.json'; a.click(); URL.revokeObjectURL(url); setMenuOpen(false); }}>Download transcript</div>
            </div>
          </div>
        </div>
      </div>

      <main className="container">
      <p className="helper">This web UI chats via server-side API routes using your server OPENROUTER_API_KEY. Only free models are listed.</p>

      {error ? <p className="error">Error: {error}</p> : null}

      <section className="toolbar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Model</span>
          <select className="model-select" value={model} onChange={e => setModel(e.target.value)}>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          <div style={{ marginBottom: 6 }}>System prompt</div>
          <textarea className="textarea" value={system} onChange={e => setSystem(e.target.value)} rows={3} style={{ width: '100%' }} />
        </label>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        {msgs.length === 0 ? <p className="helper">No messages yet. Start the conversation below.</p> : null}
        <div className="messages">
          {filteredMsgs.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="role">{m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'System'}</div>
              <div className="content" dangerouslySetInnerHTML={{ __html: m.role === 'assistant' ? marked.parse(m.content || '') : (m.content || '').replace(/&/g,'&amp;').replace(/</g,'&lt;') }} />
            </div>
          ))}
        </div>
      </section>

      <div className="composer">
        <div className="composer-inner">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={stream} onChange={e => setStream(e.target.checked)} />
            Stream
          </label>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message... (Cmd/Ctrl+Enter to send)"
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
            }}
          />
          <button className="btn" onClick={send} disabled={busy}>
            {busy ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      </main>
    </>
  );
}
