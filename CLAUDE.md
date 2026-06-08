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

All API calls go through Next.js rewrites defined in `next.config.mjs`. Currently pointing to **`localhost:8000`** (development). To switch to production, comment out the localhost rule and uncomment the Railway rule (`https://sports-agent-backend-production.up.railway.app`).

## Authentication

The app uses JWT authentication stored in `localStorage`.

**`lib/auth.js`** — helper puri (no side effects):
- `saveAuth(token, user)` — salva token e user in localStorage
- `getToken()` / `getUser()` — lettura
- `clearAuth()` — logout locale
- `isLoggedIn()` — controlla presenza token
- `isAdmin()` — controlla `user.role === 'admin'`

**`lib/api.js`** — tutti gli helper aggiungono `Authorization: Bearer <token>` ad ogni richiesta. In caso di risposta `401`, eseguono `clearAuth()` e redirect a `/login` (messaggio passato via `sessionStorage`). Helper disponibili: `fetchAPI`, `postAPI`, `putAPI`, `deleteAPI`, `loginAPI`.

**`app/layout.js`** — guard di autenticazione: se non loggato, redirect a `/login`. La navbar è nascosta sulla route `/login`. Il link "Admin" appare solo se `user.role === 'admin'`. Il link attivo è evidenziato con `color: var(--primary)` e border-bottom.

## Multi-tenant architecture

Tenant supportati: `mazzola`, `sangiovannese`. Il tenant attivo è selezionato via dropdown nell'UI e propagato tramite:
- Query string `?tenant=...` (dashboard → link partita)
- `useSearchParams()` in `/partita/[match_name]/page.js`
- Campo `tenant` nel body delle richieste chat

Il tenant `'mazzola'` mappa al team name `'mazzola'`; `'sangiovannese'` mappa a `'san giovannese 1927'` nei filtri analitici.

## API endpoints (v2)

Tutti i nuovi endpoint sono sotto `/v2/`. Gli endpoint v1 (`/stats/...`, `/analytics/...`) non sono più usati.

| Endpoint | Metodo | Usato da |
|---|---|---|
| `/auth/login` | POST | login page |
| `/auth/users` | GET / POST | admin |
| `/auth/users/:id` | PUT / DELETE | admin |
| `/upload/v2/partite?tenant=` | GET | dashboard, confronto, chat |
| `/upload/v2/partita/:match_name` | POST multipart | upload |
| `/upload/v2/partita/:match_name?tenant=` | DELETE | upload |
| `/v2/analytics/:tenant/aggregati?event_type=&period=Totale` | GET | dashboard (KPI), confronto |
| `/v2/analytics/:tenant/tags/:match_name` | GET | dashboard (chart eventi) |
| `/v2/analytics/:tenant/report/:match_name` | GET | partita detail |
| `/v2/analytics/:tenant/mappa/:match_name?event_type=shot` | GET | partita detail (mappa tiri) |
| `/v2/chat/ask` body: `{question, tenant, session_id?}` | POST | chat |

## Routes

**`/login`** — Form email/password. Chiama `loginAPI` → `POST /api/auth/login`. Salva `{token, user}` con `saveAuth`. Mostra messaggi di sessione scaduta da `sessionStorage`. Nessuna navbar.

**`/`** — Dashboard con tenant selector. KPI calcolati da aggregati tiri (`totale_partite`, `totale_tiri`, `totale_goal`, `totale_specchio`, `perc_specchio`). Bar chart eventi per partita caricato in background partita per partita via `/tags`. Reagisce al cambio tenant (effect su `[tenant]`).

**`/partita/[match_name]`** — Dettaglio partita con sei tab (sintesi, tiri, mappa tiri, passaggi, cross & lanci, duelli). Legge `?tenant=` da `useSearchParams`. Fetcha **2 endpoint** in parallelo: `report` e `mappa`. Nomi squadra da `partita.home_team` / `partita.away_team`. Mappa tiri: `MappaTiriV2` inline (SVG, coordinate x/y 0–100 → campo 80×60m). Link "indietro" preserva tenant: `/?tenant=...`.

**`/confronto`** — Confronto cross-partita per tipo evento. Tenant selector. Endpoint: `/v2/analytics/:tenant/aggregati`. `EVENTI_DISPONIBILI` in lowercase. La logica `chartData` ha due branch: eventi con campo `team` (normale) e eventi con solo `extra` (duelli, palle recuperate).

**`/chat`** — Chat AI con backend reale (`POST /v2/chat/ask`). Tenant e `session_id` nel body. `normalizeVisualization(vizType, data)` adatta i dati raw ai componenti `BarChartViz`, `ShotMapViz`, `RadarViz`, `TableViz`. Suggerimenti iniziali dinamici per tenant (`SUGGESTIONS_MAZZOLA` / `SUGGESTIONS_SANGIOVANNESE`). Design token duplicati nella costante locale `T`.

**`/upload`** — Upload VidSwap JSON. Match name inviato in lowercase. Categorie: `prima`, `u21`, `u19`, `u17`, `u16`, `u15`. `aliases` (JSON object) mappa varianti del nome squadra al tenant (default mazzola: `{"San giovannese 1927":"mazzola","Sangiovannese 1927":"mazzola"}`).

**`/admin`** — Visibile solo a `role === 'admin'`. Gestione utenti: lista, crea, modifica, attiva/disattiva, elimina. Ruoli: `admin`, `manager`, `viewer`. Ogni utente ha `tenant` (opzionale, null = accesso a tutti) e `categoria` (opzionale).

## Shared components (`components/`)

- `KpiCard` — card metrica singola
- `EventiChart` — Recharts bar chart; etichetta usa `match_name` (compatibile v1 e v2)
- `MappaTiri` — shot map v1 (non più usato nelle pagine principali; sostituito da `MappaTiriV2` inline in partita)

## Design system

CSS variables in `app/globals.css`. Token principali: `--primary` (#00E5FF cyan), `--accent` (#FF6B35 orange), `--bg` (#0A0E1A), `--bg-card` (#111827). Font: `var(--font-display)` = Barlow Condensed, `var(--font-body)` = Inter. Le pagine con visualizzazioni inline (chat, partita) duplicano i token nella costante locale `T`.
