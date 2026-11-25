// La "vista" sta nell'indirizzo della pagina: passando dalla Stagione a una Partita (e da una partita all'altra
// con ‹ ›) si ritrova la stessa vista, e il link si puo' copiare e mandare.
//   tab  sintesi | campo | andamento | giocatori     ev  tipo di evento         p  partite: casa | trasferta | ultime5
//   v    heatmap (vuoto = punti)    z  18 (vuoto = 40 zone)    f  fascia di tempo (indice)
//   gg   giocatori scelti (nome_norm, separati da virgole)    s  scheda aperta (nome_norm)    st  tab della scheda
// I giocatori si riconoscono per nome (nome_norm): il numero di maglia cambia da una partita all'altra.

const parametri = () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)

export const daIndirizzo = k => parametri().get(k)

// aggiorna l'indirizzo senza ricaricare la pagina (null / '' = toglie il parametro)
export function scriviVista(cambi) {
  if (typeof window === 'undefined') return
  const u = new URL(window.location.href)
  for (const [k, v] of Object.entries(cambi)) {
    if (v == null || v === '') u.searchParams.delete(k)
    else u.searchParams.set(k, String(v))
  }
  if (u.href !== window.location.href) window.history.replaceState(window.history.state, '', u)
}

// indirizzo di un'altra pagina con la vista attuale (piu' eventuali cambi)
export function conVista(percorso, cambi = {}) {
  const q = parametri()
  for (const [k, v] of Object.entries(cambi)) {
    if (v == null || v === '') q.delete(k)
    else q.set(k, String(v))
  }
  return `${percorso}?${q}`
}
