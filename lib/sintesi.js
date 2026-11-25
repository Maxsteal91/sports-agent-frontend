// Sintesi a gruppi (Attacco / Possesso / Difesa) per partita e stagione, dati Veo.
// Ogni riga legge il riepilogo (aggregati): et = tipo di evento, chiave = 'totale' | 'completati' |
// 'x:<campo extra>'. sub = il "di cui" accanto al numero. Un clic su una riga apre il campo su et.
// Le stesse righe valgono per la partita (due squadre) e per la stagione (noi / avversari).

export const GRUPPI_SINTESI = [
  ['Attacco', [
    { label: 'Gol',            et: 'shot',            chiave: 'x:goal' },
    { label: 'Tiri',           et: 'shot',            chiave: 'totale',   sub: v => `${v('shot', 'x:nello_specchio')} in porta` },
    { label: 'Cross',          et: 'cross',           chiave: 'totale',   sub: v => `${v('cross', 'completati')} riusciti` },
    { label: 'Calci piazzati', et: 'calcio_piazzato', chiave: 'totale',   sub: v => `${v('calcio_piazzato', 'x:angolo')} angoli` },
  ]],
  ['Possesso', [
    { label: 'Possessi',       et: 'possesso',        chiave: 'totale',   sub: v => `${v('possesso', 'completati')} pericolosi` },
    { label: 'Passaggi',       et: 'passaggi',        chiave: 'totale',   sub: v => `${percento(v('passaggi', 'completati'), v('passaggi', 'totale'))} riusciti` },
    { label: 'Dribbling',      et: 'dribbling',       chiave: 'totale' },
    { label: 'Palle perse',    et: 'palla_persa',     chiave: 'totale',   sub: v => `${v('palla_persa', 'x:pericolose')} pericolose` },
  ]],
  ['Difesa', [
    { label: 'Palle recuperate',    et: 'palla_recuperata', chiave: 'totale', sub: v => `${v('palla_recuperata', 'x:pericolose')} pericolose` },
    { label: 'Falli',               et: 'disciplina',       chiave: 'x:falli' },
    // ammonizioni: solo dove le abbiamo per tutte e due le squadre (non nella stagione, vedi solo_partita)
    { label: 'Ammonizioni',         et: 'disciplina',       chiave: 'x:ammonizioni', solo_partita: true },
    { label: 'Parate',              et: 'save',             chiave: 'totale' },
    { label: 'Uscite del portiere', et: 'gkout',            chiave: 'totale' },
  ]],
]

// gruppi del menu degli eventi nel campo (gli eventi non elencati finiscono in "Altro")
export const GRUPPI_EVENTI = [
  ['Attacco',  ['shot', 'cross', 'calcio_piazzato', 'passaggi']],
  ['Possesso', ['palla_persa', 'palla_recuperata', 'dribbling', 'possesso']],
  ['Difesa',   ['duel', 'tackle', 'save', 'gkout', 'disciplina']],
]

export function percento(a, b) {
  return b ? `${Math.round(100 * a / b)}%` : '–'
}

// valore di una riga del riepilogo: r = riga aggregati (o somma di righe), chiave come sopra
export function valore(r, chiave) {
  if (!r) return 0
  if (chiave.startsWith('x:')) return Number(r.extra?.[chiave.slice(2)] ?? 0)
  return Number(r[chiave] ?? 0)
}

// somma di piu' righe del riepilogo (stagione: tutte le partite di un lato)
export function sommaRighe(righe) {
  const out = { totale: 0, completati: 0, extra: {} }
  for (const r of righe) {
    out.totale += Number(r.totale || 0)
    out.completati += Number(r.completati || 0)
    for (const [k, v] of Object.entries(r.extra || {})) {
      if (typeof v === 'number') out.extra[k] = (out.extra[k] || 0) + v
    }
  }
  return out
}

// "palle_Perse" -> "Palle perse": i nomi scelti in Admin, leggibili nei menu
export function etichetta(s) {
  const t = (s || '').replace(/_/g, ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
