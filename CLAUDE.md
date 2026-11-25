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

All API calls go through Next.js rewrites defined in `next.config.mjs`. Currently pointing to **Railway** (`https://sports-agent-backend-production.up.railway.app`). To switch to local development, comment out the Railway rule and uncomment the localhost rule (`http://localhost:8000`, or the port of the local backend in use). Never commit the localhost version: restore it with `git checkout next.config.mjs`.

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

**`/`** (Squadra) — **Tenant con partite tutte Veo** (`mazzola_pro`): `components/SquadraVeo.js`. In alto risultati (partite, V·N·P, gol fatti·subiti, punti) e la striscia delle partite (risultato colorato, "@" = trasferta, data `01/nov/26`, clic → partita). Filtro **Tutte / Casa / Trasferta / Ultime 5** valido per i tre tab:
- **Sintesi stagione**: `SintesiGruppi` (gruppi Attacco / Possesso / Difesa, noi contro avversari, totale e media a partita, "di cui"; ammonizioni escluse perché mancano per gli avversari); dati `aggregati?tutti=true`; clic su una riga → Campo su quell'evento.
- **Campo**: `CampoAnalisi` con i punti della stagione (`mappa_stagione`), noi a destra.
- **Andamento**: l'evento scelto partita per partita; voci = colonne di Admin contate dal backend (`conteggi`); selettore noi / avversari; clic su una colonna = quella voce nel grafico; riga Totale.

**Altri tenant** (Balloni, VidSwap) — Homepage com'era, con navigazione piatta in una singola riga di pillole:
- **TIRI | GOL | CROSS | CALCI PIAZZATI | USCITE** (pillole cyan) → mostrano la mappa eventi cumulativa stagione. Componente: `MappaStatistica`. GOL è derivato client-side dai tiri (outcome='gol'), gli altri chiamano `mappa_stagione?event_type=<tipo>`. Cache interna per tipo — cambio tipo non ri-scarica se già fetched. CALCI PIAZZATI = `calcio_piazzato` (fallback `freekick` se vuoto), filtro Tutti / Angoli / Punizioni / Rimesse lunghe.
- **CONFRONTO** (pillola arancione, separatore visivo) → bar chart noi vs avversario per ogni tipo evento + tabella dettaglio. Barre stackate (porzione piena = nello specchio/completati, trasparente = altri). `compLabel` dinamico: `'Nello specchio'` per `shot`, `'Completati'` per altri.

`MappaStatistica` ora è self-contained: gestisce il proprio fetching e riceve `eventTypeId` come prop da `page.js`. Sezione stats in basso adattiva: GOL mostra tabella dettaglio (partita/periodo/minuto/giocatore), tutti gli altri mostrano card conteggio fatti/subiti.

KPI stagione (partite, tiri, goal, nello specchio, % specchio) sempre visibili in cima. Team detection: usa il team più frequente negli aggregati. Filtro per `categoria` via `catParam`.

**`/partite`** — Lista partite con data, squadre, risultato (goal calcolati dagli aggregati), categoria. Filtro per data asc/desc. Bottone Dettaglio per ogni partita.

**`/partita/[match_name]`** — **Partite Veo** (`source_format === 'veo'`): tre tab **Sintesi** (`SintesiGruppi`, clic su una riga → Campo), **Campo** (`CampoAnalisi`; per i passaggi la rete dei passaggi di `MappaCampoV2`), **Giocatori**. **Altri formati**: dettaglio partita (tab: sintesi, tiri, mappa campo, passaggi, cross, calci piazzati, duelli). Tab **cross**: divisi per origine (da azione / sviluppo piazzato / seconda palla), righe lanci solo se presenti; tab **calci piazzati**: angoli, punizioni, rimesse lunghe (battuta, esito, tiro). Tab Giocatori: colonne da `column_config` + `tagVisibili`/`tagLabel`, righe con chiave `team-player`. Legge `?tenant=` da `useSearchParams`. `source_format` `balloni` e `veo` = campo intero orizzontale (`isBalloni`), VidSwap = mezzo campo verticale.
- **Giocatori** (`GiocatoriTab`): stessa `column_config` della pagina Giocatori (colonne, etichette, ordine), tipi e nomi da `tagVisibili` / `tagLabel`; vista Performance solo per la nostra squadra (riga = squadra + giocatore).
- **Mappa campo → Passaggi**: al posto dei punti la **rete dei passaggi** (`GET rete_passaggi`), una squadra alla volta (default la squadra del tenant): pallino = posizione media col pallone, grandezza relativa alla vista (numero giallo = passaggi), frecce ≥ `RETE_MIN` passaggi riusciti (3 su tutta la partita, 2 nelle fasce; numero sulla freccia solo nelle fasce di 15'), linee sottili sotto soglia, subentrati tratteggiati, etichetta = cognome, tabellina sotto. Filtro **Tutta / 0-15' … 75-90'+** (`RETE_FASCE`).

**`/giocatori`** — Statistiche per giocatore. Ogni riga mostra: badge ruolo colorato (POR=giallo, DIF=blu, CEN=verde, ATT=rosso) + nome completo + anno di nascita. Filtri: partita, ruolo, periodo (la categoria viene dal TenantContext globale, non c'è filtro locale ridondante). Sort automatico per ruolo (POR→DIF→CEN→ATT) poi per nome. Bottone "↓ Excel" scarica il foglio corrente. Colonne generate da `column_config` backend (ordine incluso) con fallback statici in `SUB_COLS_DEFAULT`. Nel tab **Tutti** le colonne **Pres.** e **Tit.** (presenze e partite da titolare, dal backend: distinta, altrimenti dati Veo). La squadra del tenant viene da `lib/squadra.js` (`squadraDelTenant`: prima parte del nome del tenant, altrimenti la squadra più frequente).

**Scheda giocatore** (`components/PlayerModal.js`): tab Mappe → **Passaggi** = rete dei passaggi del giocatore (`rete_passaggi?giocatore=`) con selettore partita (`partite_giocatore`) e fasce di 15': pallino bianco = lui, frecce azzurre = dati, arancioni = ricevuti, riga di riepilogo (Passaggi / Riusciti / Non riusciti / % / Ricevuti, segue la fascia; stessi conteggi delle colonne della tabella giocatori), tabellina per compagno. Giocatore con solo numero (rosa non caricata) → messaggio invece della mappa.

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

**`/admin`** — Visibile solo a `role === 'admin'`. Gestione utenti: lista, crea, modifica, attiva/disattiva, elimina. Ogni utente ha `tenant` e `categoria` opzionali. Tab **Eventi e statistiche** (`EventiStatisticheSection`): a sinistra i tipi di evento (visibile, nome, ordine ↑ ↓ in tutto il sito → `tag_visualizzazione`; in `TenantContext`: `tagVisibili`, `tagLabel`, `ricaricaTag`), a destra le statistiche dell'evento selezionato nelle tabelle giocatori (visibile, etichetta, ordine → `column_config`); un solo Salva. Un evento nascosto sparisce anche dalle tabelle giocatori.

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
| `GET /v2/analytics/:tenant/rete_passaggi/:match_name?team=&fascia=&giocatore=` | GET | Partita (mappa campo → passaggi), scheda giocatore |
| `GET /v2/analytics/:tenant/partite_giocatore/:nome_norm` | GET | Scheda giocatore (selettore partita della rete) |
| `GET/PUT /v2/analytics/:tenant/tag_visualizzazione` | GET/PUT | TenantContext, Admin (tipi di evento) |
| `GET/PUT /v2/analytics/:tenant/column_config` | GET/PUT | Giocatori, Admin (colonne) |

## Shared components (`components/`)

- **`CampoAnalisi.js`** (partita e stagione, dati Veo): menu degli eventi a gruppi (`GRUPPI_EVENTI` in `lib/sintesi.js`), Entrambe / una squadra, fasce (tutta, 1°/2° tempo, ogni 15'), verso d'attacco nel campo, **Punti / Heatmap** (heatmap una squadra alla volta, la nostra di default; **40 zone** 8×5 o **18 zone** 6×3, numero nel tassello), pallino grande bordato = pericolosa, ★ = gol. Pannello a destra = colonne visibili di Admin per l'evento, raggruppate per attributo (campo `filtro` di `column_config`): totali per squadra, clic = filtra i punti; "Solo pericolose". Conta solo eventi con posizione (nota nel pannello). Tooltip con `lib/tempo.js` (minuto, numero, "video N · mm:ss").
- **`SintesiGruppi.js`**: sintesi a gruppi a due lati, righe in `GRUPPI_SINTESI` (`lib/sintesi.js`), media a partita per la stagione.
- **`SquadraVeo.js`**: sezione Squadra dei tenant Veo (vedi Routes).
- `lib/sintesi.js`: gruppi della sintesi e degli eventi, `valore`, `sommaRighe`, `etichetta` ("palle_Perse" → "Palle perse").

- `KpiCard` — card metrica singola
- `EventiChart` — Recharts bar chart
- `MappaTiri` — shot map (usato nel dettaglio partita)
- `MappaStatistica` — mappa eventi cumulativa stagione (campo intero SVG, heatmap + stats section adattiva). Props: `tenant`, `categoria`, `tenantTeam`, `eventTypeId`. Self-contained: gestisce il proprio fetching con cache per tipo evento.

## Design system

CSS variables in `app/globals.css`. Token principali: `--primary` (#00E5FF cyan), `--accent` (#FF6B35 orange), `--bg` (#0A0E1A), `--bg-card` (#111827). Font: `var(--font-display)` = Barlow Condensed, `var(--font-body)` = Inter. Il chatbot duplica i token nella costante locale `T`.

## Deployment

Frontend su Railway (account Maxsteal91), autodeploy da branch `main`. Git workflow: sviluppo su `development`, merge in `main` per deploy.

Ultimo rilascio: 23/11/2026 (schede cross e calci piazzati, pillola CALCI PIAZZATI, riepilogo passaggi del giocatore). Rilascio successivo (novembre 2026): partita e squadra Veo a tre tab (sintesi a gruppi, campo con pannello e heatmap, andamento), tempo del video nei tooltip, palle perse e recuperate. Dopo un deploy che cambia i dati Veo il tenant `mazzola_pro` va ricaricato dal backend (vedi CLAUDE.md del backend). Per verificare il deploy guardare sul sito una novità visibile, con ricarica forzata (Cmd+Shift+R).
