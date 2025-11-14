# Vibe Web (Next.js) — Restructured Developer Experience

Modern, developer-centric landing + docs UI for the Vibe CLI (free, terminal‑first AI coding assistant with OpenRouter free models).
This web surface focuses on: rapid onboarding, transparent free pricing, defensive-only stance, and interactive demo components inspired by leading 2025 AI dev tool UX patterns (Cursor, Claude Code, Continue.dev, Sourcegraph Amp, etc.).

## Overview

The site now includes:
- Global navigation with dropdown (Features -> Core CLI / Agents / Integrations / CLI Commands)
- Hero with quick install and live demo CTA + copy button
- Quick Start numbered accordion guide with progress bar and copy buttons
- Feature Grid + Tabbed Feature Explorer (Core CLI / Agents / Integrations / Comparison table vs Copilot & Claude)
- Pricing section (Free Forever + future donation tier placeholder)
- Testimonials carousel (auto-rotating, accessible)
- Global fuzzy search (Fuse.js) across features, docs, quick start, pricing
- Dark / Light theme toggle (CSS variables + prefers-color-scheme initialization)
- TerminalDemo (xterm.js powered scripted playback) embedded in Agents tab
- Enhanced Docs index with sidebar filtering + inline search
- SEO meta tags + analytics stub
- Light theme variable overrides + Prism.js syntax highlighting integration
- Accessibility improvements (ARIA roles/labels, keyboard navigation, screen reader output for terminal)

## Tech Stack

- Next.js (static pages + optional API routes)
- Tailwind utility classes (configured via `tailwind.config.cjs`)
- Fuse.js client-side search index (`data/searchIndex.js`)
- xterm.js + fit addon for live terminal demo playback
- Prism.js (deferred script loading) for syntax highlighting
- React 19 (concurrent-ready)
- CSS variables for theming (dark / light)

## Directory Structure (Relevant)

```
components/
  Layout.js            // Nav, search modal, theme toggle
  Hero.js              // Tagline & install snippet copy
  QuickStartSteps.js   // Accordion + progress bar
  FeatureGrid.js       // Static feature cards
  FeatureTabs.js       // Tabbed interface + TerminalDemo
  TerminalDemo.js      // xterm.js scripted session
  PricingTable.js      // Free vs Future Pro (donation)
  Testimonials.js      // Carousel
  FAQ.js               // Existing FAQ section (can be enhanced)
data/
  searchIndex.js       // Static curated Fuse index + build helpers
pages/
  index.js             // Composed landing structure
  _app.js              // Global Head tags + Prism + Layout
  docs/                // Docs pages (sidebar + index search)
styles/
  globals.css          // Theme tokens & light mode overrides
```

## Quickstart (Local Development)

1. Clone repository
   `git clone https://github.com/mk-knight23/vibe-cli.git`
2. Install dependencies
   `npm install`
3. Set environment variable (do NOT expose client-side)
   `export OPENROUTER_API_KEY="sk-or-..."`
   Add to shell profile for persistence if desired.
4. Run development server
   `npm run dev`
5. Visit landing page
   `http://localhost:3000/`
6. Explore chat prototype (if enabled)
   `http://localhost:3000/chat`

## Production Deployment (Vercel)

1. Push repo to GitHub (public recommended for transparency)
2. Import project on Vercel dashboard
3. Set Environment Variable: `OPENROUTER_API_KEY` (Production)
4. (Optional) Add analytics real key instead of stub
5. Deploy — automatic static optimization for most pages
6. Validate:
   - Navigation dropdown
   - Global search (press 🔍 icon)
   - Theme toggle
   - Terminal demo playback in Feature Tabs (Agents)

## Security & Privacy

- BYO API key: not stored or transmitted beyond required serverless calls
- Defensive-only logic enforced inside CLI (hard refusals for malicious patterns)
- No file writes originate from web UI (terminal demo is read-only)
- Avoid embedding secrets in client bundle; only server-side API routes use env values
- Confirm domain restrictions if adding analytics later

## Accessibility Checklist (Implemented / Pending)

| Item                               | Status    | Notes |
|------------------------------------|-----------|-------|
| Semantic landmarks (header/main/footer) | Complete | Layout.js |
| ARIA labels for modal & navigation | Complete | Search modal roles |
| Keyboard nav for tabs              | Complete  | Arrow/Home/End keys |
| Focus management in search modal   | Complete  | Focus trap implemented (Tab cycle) |
| Skip link                          | Complete  | Added in Layout before header |
| High contrast text                 | Complete  | Dark & light theme variables |
| Screen reader mirror for terminal  | Complete  | `sr-only` region in TerminalDemo |

## Performance & Optimization Notes

- Fuse.js loaded lazily only when search modal opened (first invocation)
- xterm.js & fit addon imported dynamically inside TerminalDemo to avoid SSR bundle bloat
- Prism.js loaded via CDN (can self-host & tree-shake for production audits)
- Minimal custom JS in landing; mostly declarative React + Tailwind classes
- Next.js image optimization not yet leveraged (future: add screenshots / hero illustrations)
- Consider generating a reduced search index dynamically from `.md` doc content later

## Customization / Extensibility

- Add new search entries: edit `data/searchIndex.js` and include relevant tags/content
- Extend agents: modify `lib/agent.cjs` and update TerminalDemo script array
- Replace analytics stub: remove GA snippet, integrate your preferred privacy-friendly analytics
- For deeper docs, convert existing pages to MDX and auto-build index (future task)

## Roadmap (Post-Restructure)

1. Prism.js integrated on all remaining code blocks (wrap docs code in `<pre><code className="language-...">`)
2. Expand docs with additional anchors + richer content across all pages
3. Live terminal sandbox (optional) or recorded session playback via JSON logs
4. Model usage metrics dashboard (client-friendly anonymized stats)
5. Add blog section (`/blog`) with MDX and tag filtering
6. LocalStorage persistence for active tab & last search query
7. Copy button component for all code blocks

## Deployment Tips

- Ensure `OPENROUTER_API_KEY` set in all environments (Preview / Production)
- Run `npm run build` locally to confirm no SSR import errors
- Lighthouse run: remove any unused CSS or heavy external scripts (Prism optionally inlined build)
- Consider adding security headers (Next.js Middleware or Vercel config)

## CLI Install (Copy-Paste)

```
npm i -g github:mk-knight23/vibe-cli
# Or:
curl -fsSL https://raw.githubusercontent.com/mk-knight23/vibe-cli/main/install.sh | bash
```

## Free Model Rotation

Default free model: `z-ai/glm-4.5-air:free`
List and select inside CLI: `vibe model list` / `vibe model use <id>`

## Contributing

> Current restructure tasks completed: navigation, global search, theme system, terminal demo, docs index, pricing, testimonials, accessibility baseline.

1. Fork & branch: `feat/new-section`
2. Add component under `components/`
3. Update search index if adding landing-surface content
4. Open PR with clear before/after screenshots
5. Follow defensive code guidelines (no insecure eval, minimal external dependencies)

## License

MIT — See `LICENSE`. Attribution for upstream inspiration belongs to respective product owners (Copilot, Cursor, Claude Code, etc.).

---

_This README documents the web surface restructure. For CLI internals see root `README.md`._

