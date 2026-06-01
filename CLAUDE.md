# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

No test suite is configured.

## Backend proxy

All API calls go through Next.js rewrites defined in `next.config.mjs`. The rewrite maps `/api/:path*` to the backend. The production target is Railway (`https://sports-agent-backend-production.up.railway.app`). To develop against a local backend, comment out the Railway rule and uncomment the `localhost:8000` rule in `next.config.mjs`.

`lib/api.js` exports two helpers used everywhere:
- `fetchAPI(endpoint)` — GET `/api<endpoint>`
- `postAPI(endpoint, body)` — POST `/api<endpoint>` with JSON body

## Architecture

Next.js 16 App Router. Every page uses `'use client'` (no RSC). Styling is done entirely with inline styles and CSS variables — Tailwind is installed but not used in JSX.

**Routes:**
- `/` — Dashboard: KPI summary cards, events-per-match bar chart, match list
- `/partita/[match_name]` — Match detail with six tabbed sections (sintesi, tiri, mappa tiri, passaggi, cross & lanci, duelli); fetches 8 analytics endpoints in parallel on mount
- `/confronto` — Cross-match comparison of a selected event type
- `/chat` — AI chat interface; maintains a `session_id` returned by the backend for conversation continuity
- `/upload` — VidSwap JSON file upload and match management (POST/DELETE `/api/upload/partita/:match_name`)

**Shared components** (`components/`):
- `KpiCard` — single metric display card
- `EventiChart` — Recharts bar chart for events per match
- `MappaTiri` — shot map visualization

## Design system

CSS variables defined in `app/globals.css`. Key tokens: `--primary` (#00E5FF cyan), `--accent` (#FF6B35 orange), `--bg` (#0A0E1A), `--bg-card` (#111827). Fonts: `var(--font-display)` = Barlow Condensed, `var(--font-body)` = Inter.

## Known quirk

The home team name is spelled `'Sangiovannese 1927'` in most places but `'San giovannese 1927'` (with a space) in `app/partita/[match_name]/page.js` at the `MAZZOLA` constant — this affects which team gets highlighted as the home side in match detail analytics.
