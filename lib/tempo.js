// Testo al passaggio del mouse sui punti delle mappe: partita (mappa stagione), minuto, giocatore e
// tempo nel video Veo (minuti:secondi dall'inizio del video, come si cerca nel player Veo)

export function tempoVideo(secondi) {
  if (secondi == null) return null
  const s = Math.round(secondi)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function titoloPunto(d) {
  const sv = d.secondo_video ?? d.attrs?.secondo_video
  const video = d.video ?? d.attrs?.video          // partita salvata in piu' video: "video 2 · 7:12"
  return [
    d.match_name && d.match_name.replace(/_/g, ' - '),
    d.minute != null && `${Math.floor(d.minute)}'`,
    d.player && `n. ${d.player}`,
    sv != null && `video ${video ? `${video} · ` : ''}${tempoVideo(Number(sv))}`,
  ].filter(Boolean).join(' · ')
}
