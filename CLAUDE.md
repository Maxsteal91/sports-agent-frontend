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

All API calls go through Next.js rewrites defined in `next.config.mjs`. Currently pointing to **Railway** (`https://sports-agent-backend-production.up.railway.app`). To switch to local development, comment out the Railway rule and uncomment the localhost rule (`http://localhost:8000`).

## Authentication

The app uses JWT authentication stored in `localStorage`.

**`lib/auth.js`** — helper puri (no side effects):
- `saveAuth(token, user)` — salva token e user in localStorage
- `getToken()` / `getUser()` — lettura
- `clearAuth()` — logout locale
- `isLoggedIn()` — controlla presenza token
- `isAdmin()` — controlla `user.role === 'admin'`

**`lib/api.js`** — tutti gli helper aggiungono `Authorization: Bearer <token>` ad ogni richiesta. In caso di risposta `401`, eseguono `clearAuth()` e redirect a `/login`. Helper: `fetchAPI`, `postAPI`, `putAPI`, `deleteAPI`, `loginAPI`.

## Multi-tenant + Categoria (TenantContext)

**`lib/TenantContext.js`** — contesto globale che gestisce:
- `tenant` / `setTenant` — tenant attivo, persistito in localStorage; default `mazzola_2026` se disponibile
- `allTenants` — lista tenant dall'API `/auth/tenants`
- `categoria` / `setCategoria` — categoria attiva (es. `eccellenza`, `coppa`, `u19`); reset al cambio tenant
- `categorieDisponibili` — categorie distinte per il tenant corrente, caricate da `GET /upload/v2/categorie?tenant=`

La navbar (`app/layout.js`) mostra:
- Logo "⚽ SPORT ANALYTICS" + dropdown tenant (solo admin con >1 tenant) + dropdown categoria — gruppo sinistro
- Navlink centrali: Squadra (`/`), Partite (`/partite`), Giocatori, AI Chat, Upload
- Link Admin + info utente + logout — gruppo destro

## Routes

**`/login`** — Form email/password. Nessuna navbar.

**`/`** (Squadra) — Homepage con navigazione piatta in una singola riga di pillole:
- **TIRI | GOL | CROSS | PUNIZIONI | USCITE** (pillole cyan) → mostrano la mappa eventi cumulativa stagione. Componente: `MappaStatistica`. GOL è derivato client-side dai tiri (outcome='gol'), gli altri chiamano `mappa_stagione?event_type=<tipo>`. Cache interna per tipo — cambio tipo non ri-scarica se già fetched.
- **CONFRONTO** (pillola arancione, separatore visivo) → bar chart noi vs avversario per ogni tipo evento + tabella dettaglio. Barre stackate (porzione piena = nello specchio/completati, trasparente = altri). `compLabel` dinamico: `'Nello specchio'` per `shot`, `'Completati'` per altri.

`MappaStatistica` ora è self-contained: gestisce il proprio fetching e riceve `eventTypeId` come prop da `page.js`. Sezione stats in basso adattiva: GOL mostra tabella dettaglio (partita/periodo/minuto/giocatore), tutti gli altri mostrano card conteggio fatti/subiti.

KPI stagione (partite, tiri, goal, nello specchio, % specchio) sempre visibili in cima. Team detection: usa il team più frequente negli aggregati. Filtro per `categoria` via `catParam`.

**`/partite`** — Lista partite con data, squadre, risultato (goal calcolati dagli aggregati), categoria. Filtro per data asc/desc. Bottone Dettaglio per ogni partita.

**`/partita/[match_name]`** — Dettaglio partita (tab: sintesi, tiri, mappa tiri, passaggi, cross & lanci, duelli). Legge `?tenant=` da `useSearchParams`.

**`/giocatori`** — Statistiche per giocatore. Ogni riga mostra: badge ruolo colorato (POR=giallo, DIF=blu, CEN=verde, ATT=rosso) + nome completo + anno di nascita. Filtri: partita, ruolo, periodo (la categoria viene dal TenantContext globale, non c'è filtro locale ridondante). Sort automatico per ruolo (POR→DIF→CEN→ATT) poi per nome. Bottone "↓ Excel" scarica il foglio corrente. Colonne generate da `column_config` backend con fallback statici in `SUB_COLS_DEFAULT`.

**`/chat`** — Chatbot AI con layout a due colonne:
- **Sidebar** (240px, sempre aperta su desktop, collassabile su mobile): titolo "Analista Tattico" con pallino verde, selettore partita filtrato per `categoria` attiva (con bottone "Deseleziona"), domande rapide contestuali, sezione **Modello AI** in fondo
- **Sezione Modello AI**: bottone che apre wizard modale per configurare chiave Groq personale. Chiave salvata in `localStorage` (`groq_api_key`), inviata nel body di ogni richiesta come `groq_api_key` (opzionale — se assente il backend usa la chiave dell'env). Validazione via `POST /v2/chat/validate_key` prima del salvataggio.
- **Area chat**: messaggi, input con Invio/Shift+Invio, badge partita selezionata nella barra superiore
- **Suggerimenti dinamici**: `buildSuggestions(partite, tenant, matchName)` — se una partita è selezionata mostra 4 domande specifiche; altrimenti 3 generali + 2 sull'avversario della prima partita
- `matchName` inviato nel body; il backend enforce che il SQL referenzi quella partita e avvisa se la domanda riguarda una partita diversa
- Reset automatico `matchName` al cambio `categoria`

**`/upload`** — Upload VidSwap JSON. Sezione "Carica Rosa": selettore partita + file Excel/ODS con colonne `N°` e `Nome` → `POST /upload/v2/rosa`. Match name e tenant sempre in lowercase.

**`/confronto`** — Redirect automatico a `/` (sezione Squadra).

**`/upload`** — Upload VidSwap JSON. Sezione "Carica Rosa": selettore partita + file Excel/ODS. La costante `CATEGORIES` in `app/upload/page.js` e `CATEGORIE` in `app/admin/page.js` elencano le categorie disponibili: `['eccellenza', 'coppa', 'u21', 'u19', 'u17', 'u16', 'u15']` — da aggiornare manualmente se si aggiungono nuove categorie.

**`/admin`** — Visibile solo a `role === 'admin'`. Gestione utenti: lista, crea, modifica, attiva/disattiva, elimina. Ogni utente ha `tenant` e `categoria` opzionali.

## Giocatori — rosa e nomi

La sezione Giocatori risolve i numeri maglia in nomi tramite JOIN backend:
1. `rosa` (per-match): numero → nome_norm
2. `giocatori_nomi` (cross-match): nome_norm → nome_completo, ruolo, anno_nascita

Il campo `player` nella risposta è già il nome completo (o il numero se la rosa non è caricata).

## API endpoints (v2)

| Endpoint | Metodo | Usato da |
|---|---|---|
| `GET /upload/v2/partite?tenant=&category=` | GET | Squadra, Partite, Giocatori, Chat |
| `GET /upload/v2/categorie?tenant=` | GET | TenantContext (dropdown categoria) |
| `POST /upload/v2/rosa?tenant=&match_name=` | POST multipart | Upload (sezione rosa) |
| `GET /v2/analytics/:tenant/aggregati?event_type=&period=` | GET | Squadra (KPI + chart), Partite (risultati) |
| `GET /v2/analytics/:tenant/giocatori?team=&period=&category=&match_name=` | GET | Giocatori (stagione) |
| `GET /v2/analytics/:tenant/giocatori/:match_name` | GET | Giocatori (per partita) |
| `GET /v2/analytics/:tenant/report/:match_name` | GET | Partita detail |
| `GET /v2/analytics/:tenant/mappa/:match_name?event_type=` | GET | Partita detail (mappa tiri) |
| `GET /v2/analytics/:tenant/mappa_stagione?event_type=&category=` | GET | Squadra (mappa eventi cumulativa, qualsiasi event_type) |
| `POST /v2/chat/ask` body: `{question, tenant, session_id?, match_name?, groq_api_key?}` | POST | Chat |
| `POST /v2/chat/validate_key` body: `{groq_api_key}` | POST | Valida chiave Groq utente |

## Shared components (`components/`)

- `KpiCard` — card metrica singola
- `EventiChart` — Recharts bar chart
- `MappaTiri` — shot map (usato nel dettaglio partita)
- `MappaStatistica` — mappa eventi cumulativa stagione (campo intero SVG, heatmap + stats section adattiva). Props: `tenant`, `categoria`, `tenantTeam`, `eventTypeId`. Self-contained: gestisce il proprio fetching con cache per tipo evento.

## Design system

CSS variables in `app/globals.css`. Token principali: `--primary` (#00E5FF cyan), `--accent` (#FF6B35 orange), `--bg` (#0A0E1A), `--bg-card` (#111827). Font: `var(--font-display)` = Barlow Condensed, `var(--font-body)` = Inter. Il chatbot duplica i token nella costante locale `T`.

## Deployment

Frontend su Railway (account Maxsteal91), autodeploy da branch `main`. Git workflow: sviluppo su `development`, merge in `main` per deploy.
