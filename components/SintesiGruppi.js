'use client'
import { GRUPPI_SINTESI } from '../lib/sintesi'

// Sintesi a gruppi, due lati a confronto (partita: le due squadre; stagione: noi / avversari).
// v(lato, et, chiave) -> numero. perPartita = numero di partite (stagione: media sotto il totale).
// onApri(et) = clic su una riga: apre il campo su quell'evento. Le righe senza dati sono nascoste.
export default function SintesiGruppi({ v, nomi, colori, perPartita = null, stagione = false, onApri }) {
  const media = x => (x / perPartita).toFixed(1).replace('.', ',')
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 1fr', alignItems: 'end', marginBottom: 4 }}>
        <div style={{ ...titolo, textAlign: 'right', color: colori[0] }}>{nomi[0]}</div>
        <div />
        <div style={{ ...titolo, color: colori[1] }}>{nomi[1]}</div>
      </div>
      {GRUPPI_SINTESI.map(([gruppo, righe]) => {
        const visibili = righe.filter(r => !(stagione && r.solo_partita))
          .filter(r => v(0, r.et, 'totale') + v(1, r.et, 'totale') > 0)
        if (!visibili.length) return null
        return (
          <div key={gruppo}>
            <div style={sezione}>{gruppo}</div>
            {visibili.map(r => {
              const a = v(0, r.et, r.chiave), b = v(1, r.et, r.chiave)
              const max = Math.max(a, b, 1), w = x => Math.max(4, 160 * x / max)
              const sub = lato => r.sub ? r.sub((et, k) => v(lato, et, k)) : ''
              return (
                <div key={r.label} onClick={() => onApri?.(r.et)} title="Vedi sul campo"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 200px 1fr', alignItems: 'center', padding: '4px 0',
                           borderRadius: 8, cursor: onApri ? 'pointer' : 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                    <span style={{ ...subStile, textAlign: 'right' }}>{sub(0)}</span>
                    <div style={{ height: 8, borderRadius: 4, width: w(a), background: colori[0] }} />
                    <span style={{ ...numero, textAlign: 'right', color: colori[0] }}>
                      {a}{perPartita ? <small style={mediaStile}>{media(a)}/partita</small> : null}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{r.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...numero, color: colori[1] }}>
                      {b}{perPartita ? <small style={mediaStile}>{media(b)}/partita</small> : null}
                    </span>
                    <div style={{ height: 8, borderRadius: 4, width: w(b), background: colori[1] }} />
                    <span style={subStile}>{sub(1)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
      {onApri && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 14 }}>
          {perPartita ? 'Totale della stagione e, sotto, media a partita · ' : ''}accanto i "di cui" · clic su una riga per vederla sul campo
        </div>
      )}
    </div>
  )
}

const titolo = { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
const sezione = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '16px 0 6px',
                  paddingBottom: 5, borderBottom: '1px solid var(--border)', textAlign: 'center' }
const numero = { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', minWidth: 44, lineHeight: 1 }
const mediaStile = { display: 'block', fontFamily: 'inherit', fontWeight: 400, fontSize: 10.5, color: 'var(--text-muted)' }
const subStile = { fontSize: 11, color: 'var(--text-muted)', minWidth: 78 }
