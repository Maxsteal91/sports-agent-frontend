// Squadra del tenant tra i nomi delle squadre delle partite: quella che contiene la prima parte del
// nome del tenant (es. "mazzola_pro" -> "mazzola" -> "V. Mazzola"), come fa il backend per la rosa;
// se nessuna la contiene, la piu' frequente nelle partite.
export function squadraDelTenant(tenant, partite) {
  const base = (tenant || '').split('_')[0].toLowerCase()
  const counts = {}
  ;(partite || []).forEach(p => {
    if (p.home_team) counts[p.home_team] = (counts[p.home_team] || 0) + 1
    if (p.away_team) counts[p.away_team] = (counts[p.away_team] || 0) + 1
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const byName = base ? sorted.find(([name]) => name && name.toLowerCase().includes(base)) : null
  return byName?.[0] || sorted[0]?.[0] || null
}
