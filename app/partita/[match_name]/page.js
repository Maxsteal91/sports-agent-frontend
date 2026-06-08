'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fetchAPI } from '../../../lib/api'
import { getUser } from '../../../lib/auth'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

const COLOR_HOME = '#00E5FF'
const COLOR_AWAY = '#CC44FF'

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
    }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600,
        letterSpacing: '0.08em', marginBottom: '1.25rem', color: 'var(--text)',
        textTransform: 'uppercase'
      }}>{title}</h2>
      {children}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
      padding: '0.75rem', textAlign: 'center'
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: color || 'var(--text)' }}>
        {value ?? 0}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  )
}

function GraficoSpeculare({ rows, teamA, teamB }) {
  const maxVal = Math.max(...rows.flatMap(r => [r.a, r.b]), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: COLOR_HOME, textAlign: 'right', fontWeight: 700 }}>{teamA}</div>
        <div />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: COLOR_AWAY, textAlign: 'left', fontWeight: 700 }}>{teamB}</div>
      </div>
      {rows.map(({ label, a, b }) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: COLOR_HOME, fontWeight: 700, minWidth: '24px', textAlign: 'right' }}>{a}</span>
            <div style={{ height: '8px', borderRadius: '4px 0 0 4px', background: COLOR_HOME, width: `${(a / maxVal) * 100}%`, maxWidth: '120px', transition: 'width 0.4s' }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ height: '8px', borderRadius: '0 4px 4px 0', background: COLOR_AWAY, width: `${(b / maxVal) * 100}%`, maxWidth: '120px', transition: 'width 0.4s' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: COLOR_AWAY, fontWeight: 700, minWidth: '24px' }}>{b}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────

// MAPPA TIRI
function MappaTiriV2({ data, teamA, teamB }) {
  const [filtroTeam, setFiltroTeam] = useState('home')
  const norm = t => (t || '').toLowerCase().trim()
  const teamAn = norm(teamA)
  const nHome = data.filter(d => norm(d.team) === teamAn).length
  const nAway = data.filter(d => norm(d.team) !== teamAn).length
  const filtered = data.filter(d =>
    filtroTeam === 'home' ? norm(d.team) === teamAn : norm(d.team) !== teamAn
  )

  const W=580, H=460, PAD=16
  const fw=W-PAD*2, fh=H-PAD*2

  // Coordinate DB v2: x=0-100, y=0-100
  // → x_pitch_half = x/100*80 (larghezza 0-80)
  // → y_pitch_half = y/100*60 (profondità 0-60, 60=porta)
  // SVG: x_ph mappato su larghezza, y_ph=60 → fondo SVG (porta in basso)
  const sx = x => PAD + ((x/100)*80 / 80) * fw
  const sy = y => PAD + ((y/100)*60 / 60) * fh

  const C = { goal:'#EF4444', save:'#FACC15', blocked:'#94A3B8', wide:'#3B82F6' }
  const marker = (d, i) => {
    const esito = (d.attrs?.result || d.result || d.esito || 'wide').toLowerCase()
    const x = sx(d.x ?? 50), y = sy(d.y ?? 75)
    const col = C[esito] || C.wide
    if (esito==='goal') return <circle key={i} cx={x} cy={y} r={7} fill={col} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5}/>
    if (esito==='save') return <circle key={i} cx={x} cy={y} r={6} fill={col} stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
    if (esito==='blocked') return (
      <g key={i}>
        <circle cx={x} cy={y} r={5} fill={col} opacity={0.8}/>
        <line x1={x-3} y1={y-3} x2={x+3} y2={y+3} stroke="white" strokeWidth={1.2} opacity={0.7}/>
        <line x1={x+3} y1={y-3} x2={x-3} y2={y+3} stroke="white" strokeWidth={1.2} opacity={0.7}/>
      </g>
    )
    return <circle key={i} cx={x} cy={y} r={5} fill={col} opacity={0.6}/>
  }

  // Campo reale: 80x60m (mezza campo)
  // Porta: larghezza 7.32m, centrata in x=40 → x da 36.34 a 43.66, y=60
  // Area piccola: 18.32x5.5m → x da 30.84 a 49.16, y da 54.5 a 60
  // Area grande: 40.32x16.5m → x da 19.84 a 60.16, y da 43.5 a 60
  // Punto rigore: x=40, y=49 (11m dalla porta)
  // Centrocampo: y=0 (bordo superiore)
  const ls = {stroke:'rgba(255,255,255,0.7)', strokeWidth:1.5, fill:'none'}

  // Helper: converti coordinate pitch (xm 0-80, ym 0-60) in SVG
  const pm = (xm, ym) => ({
    x: PAD + (xm/80)*fw,
    y: PAD + (ym/60)*fh
  })

  const NH=8
  const stripes = Array.from({length:NH}, (_,i) => (
    <rect key={i} x={0} y={i*(H/NH)} width={W} height={H/NH} fill={i%2===0?'#3d7a2e':'#437f32'}/>
  ))

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{display:'flex',gap:8,alignSelf:'flex-start',alignItems:'center',width:'100%'}}>
        {[
          {key:'home',label:teamA,color:'#00E5FF',n:nHome},
          {key:'away',label:teamB,color:'#CC44FF',n:nAway},
        ].map(opt => (
          <button key={opt.key} onClick={()=>setFiltroTeam(opt.key)} style={{
            padding:'6px 18px', borderRadius:6,
            border:`1.5px solid ${filtroTeam===opt.key?opt.color:'rgba(255,255,255,0.12)'}`,
            background:filtroTeam===opt.key?`${opt.color}18`:'transparent',
            color:filtroTeam===opt.key?opt.color:'#64748B',
            cursor:'pointer',fontFamily:'var(--font-display,"Barlow Condensed",sans-serif)',
            fontSize:13,fontWeight:700,letterSpacing:'0.06em',
            textTransform:'uppercase',transition:'all 0.15s',
          }}>
            {opt.label} <span style={{fontWeight:400,fontSize:11}}>({opt.n})</span>
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:11,color:'#475569'}}>{filtered.length} tiri</span>
      </div>

      <div style={{borderRadius:8,overflow:'hidden',border:'1.5px solid rgba(255,255,255,0.15)',boxShadow:'0 4px 24px rgba(0,0,0,0.5)'}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>
          {stripes}
          {/* Bordo campo */}
          <rect x={PAD} y={PAD} width={fw} height={fh} {...ls}/>
          {/* Linea centrocampo — bordo superiore (y=0) */}
          <line x1={PAD} y1={pm(0,0).y} x2={W-PAD} y2={pm(0,0).y} stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
          {/* Semicerchio centrocampo */}
          <path d={`M ${pm(40-12,0).x} ${pm(0,0).y} A ${(12/80)*fw} ${(12/80)*fw} 0 0 0 ${pm(40+12,0).x} ${pm(0,0).y}`}
            fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
          {/* Area grande: x 19.84-60.16, y 43.5-60 */}
          <rect x={pm(19.84,43.5).x} y={pm(19.84,43.5).y}
            width={pm(60.16,43.5).x-pm(19.84,43.5).x}
            height={pm(19.84,60).y-pm(19.84,43.5).y}
            {...ls} fill="rgba(0,0,0,0.05)"/>
          {/* Area piccola: x 30.84-49.16, y 54.5-60 */}
          <rect x={pm(30.84,54.5).x} y={pm(30.84,54.5).y}
            width={pm(49.16,54.5).x-pm(30.84,54.5).x}
            height={pm(30.84,60).y-pm(30.84,54.5).y}
            {...ls}/>
          {/* Porta: x 36.34-43.66, sotto y=60 */}
          <rect x={pm(36.34,60).x} y={pm(36.34,60).y}
            width={pm(43.66,60).x-pm(36.34,60).x} height={9}
            fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}/>
          {/* Punto rigore: x=40, y=49 */}
          <circle cx={pm(40,49).x} cy={pm(40,49).y} r={2.5} fill="rgba(255,255,255,0.65)"/>
          {/* Lunetta: centrata su x=40,y=43.5, r=6m, solo parte fuori area */}
          <defs><clipPath id="clipLun">
            <rect x={0} y={PAD} width={W} height={pm(40,43.5).y-PAD}/>
          </clipPath></defs>
          <path d={`M ${pm(40-6,43.5).x} ${pm(40,43.5).y} A ${(6/80)*fw} ${(6/80)*fw} 0 0 1 ${pm(40+6,43.5).x} ${pm(40,43.5).y}`}
            fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1} clipPath="url(#clipLun)"/>
          {filtered.map((d,i) => marker(d,i))}
        </svg>
      </div>

      <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:11,color:'#64748B',justifyContent:'center'}}>
        {[['#EF4444','Goal'],['#FACC15','Save'],['#94A3B8','Blocked'],['#3B82F6','Wide']].map(([col,label])=>(
          <span key={label} style={{display:'flex',alignItems:'center',gap:5}}>
            <svg width={10} height={10}><circle cx={5} cy={5} r={5} fill={col}/></svg>{label}
          </span>
        ))}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────
// PAGINA
// ─────────────────────────────────────────
export default function PartitaPage() {
  const { match_name }  = useParams()
  const searchParams    = useSearchParams()

  // Tenant: priorità all'utente loggato, fallback alla URL
  const urlTenant = searchParams.get('tenant') || 'mazzola'
  const user      = getUser()
  const tenant    = (user?.role !== 'admin' && user?.tenant) ? user.tenant : urlTenant

  const [partita,   setPartita]   = useState(null)
  const [aggregati, setAggregati] = useState([])
  const [mappaTiri, setMappaTiri] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('sintesi')

  useEffect(() => {
    if (!match_name) return
    Promise.all([
      fetchAPI(`/v2/analytics/${tenant}/report/${match_name}`),
      fetchAPI(`/v2/analytics/${tenant}/mappa/${match_name}?event_type=shot`),
    ]).then(([report, mappa]) => {
      setPartita(report.partita)
      setAggregati(report.aggregati || [])
      setMappaTiri(mappa.data || [])
      setLoading(false)
    }).catch(err => { console.error(err); setLoading(false) })
  }, [match_name, tenant])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--primary)' }}>CARICAMENTO...</div>
    </div>
  )

  if (!partita) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Partita non trovata</div>
  )

  const teamA = partita.home_team || ''
  const teamB = partita.away_team || ''
  const TABS  = ['sintesi', 'tiri', 'mappa tiri', 'passaggi', 'cross & lanci', 'duelli']

  // Helper aggregati
  const agg = (eventType, team, period = 'Totale') =>
    aggregati.find(a => a.event_type === eventType && a.team === team && a.period === period) || {}

  const aggNoTeam = (eventType, period = 'Totale') =>
    aggregati.find(a => a.event_type === eventType && a.period === period) || {}

  // Goal da extra
  const goalA  = agg('shot', teamA).extra?.goal  ?? 0
  const goalB  = agg('shot', teamB).extra?.goal  ?? 0

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      <Link href={`/?tenant=${tenant}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← Dashboard
      </Link>

      {/* Header partita */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {partita.date ? new Date(partita.date).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
            <span style={{ color: COLOR_HOME }}>{teamA}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 0.75rem' }}>vs</span>
            <span style={{ color: COLOR_AWAY }}>{teamB}</span>
          </div>
          {partita.category && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {partita.category}
            </div>
          )}
        </div>
        {/* Risultato */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: COLOR_HOME, lineHeight: 1 }}>{goalA}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Goal {teamA}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: COLOR_AWAY, lineHeight: 1 }}>{goalB}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Goal {teamB}</div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.5rem 1rem', borderRadius: '8px',
            border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
            background: tab === t ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)',
            color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
            fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.2s'
          }}>{t}</button>
        ))}
      </div>

      {/* ── TAB: SINTESI ── */}
      {tab === 'sintesi' && (
        <Section title="Sintesi Partita">
          <GraficoSpeculare
            teamA={teamA} teamB={teamB}
            rows={[
              { label: 'Tiri Totali',    a: agg('shot', teamA).totale  ?? 0, b: agg('shot', teamB).totale  ?? 0 },
              { label: 'Nello Specchio', a: agg('shot', teamA).extra?.nello_specchio ?? 0, b: agg('shot', teamB).extra?.nello_specchio ?? 0 },
              { label: 'Goal',           a: goalA, b: goalB },
              { label: 'Fuori',          a: agg('shot', teamA).extra?.fuori ?? 0, b: agg('shot', teamB).extra?.fuori ?? 0 },
              { label: 'Passaggi',       a: agg('passaggi', teamA).totale ?? 0, b: agg('passaggi', teamB).totale ?? 0 },
              { label: 'Pass. Completati', a: agg('passaggi', teamA).completati ?? 0, b: agg('passaggi', teamB).completati ?? 0 },
              { label: 'Cross',          a: agg('cross', teamA).totale ?? 0, b: agg('cross', teamB).totale ?? 0 },
              { label: 'Corner',         a: agg('corner', teamA).totale ?? 0, b: agg('corner', teamB).totale ?? 0 },
              { label: 'Dribbling',      a: agg('dribbling', teamA).totale ?? 0, b: agg('dribbling', teamB).totale ?? 0 },
              { label: 'Falli',          a: agg('disciplina', teamA).extra?.falli ?? 0, b: agg('disciplina', teamB).extra?.falli ?? 0 },
              { label: 'Ammonizioni',    a: agg('disciplina', teamA).extra?.ammonizioni ?? 0, b: agg('disciplina', teamB).extra?.ammonizioni ?? 0 },
              { label: 'Duelli Vinti',   a: aggNoTeam('duelli').extra?.[`vinti_${teamA}`] ?? 0, b: aggNoTeam('duelli').extra?.[`vinti_${teamB}`] ?? 0 },
              { label: 'Palle Recup.',   a: aggNoTeam('palle recuperate').extra?.[`recuperate_${teamA}`] ?? 0, b: aggNoTeam('palle recuperate').extra?.[`recuperate_${teamB}`] ?? 0 },
            ]}
          />
        </Section>
      )}

      {/* ── TAB: TIRI ── */}
      {tab === 'tiri' && (
        <Section title="Analisi Tiri">
          {[teamA, teamB].map((team, i) => {
            const a = agg('shot', team)
            const aPT = agg('shot', team, 'Primo_Tempo')
            const aST = agg('shot', team, 'Secondo_Tempo')
            const color = i === 0 ? COLOR_HOME : COLOR_AWAY
            return (
              <div key={team} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>
                  {team}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
                  <StatBox label="Tiri Totali"    value={a.totale}              color={color} />
                  <StatBox label="Nello Specchio" value={a.extra?.nello_specchio} color={color} />
                  <StatBox label="Goal"           value={a.extra?.goal}         color={color} />
                  <StatBox label="Fuori"          value={a.extra?.fuori}        color={color} />
                  <StatBox label="Specchio PT"    value={aPT.completati}        color={color} />
                  <StatBox label="Specchio ST"    value={aST.completati}        color={color} />
                  <StatBox label="% Specchio"     value={a.percentuale ? a.percentuale + '%' : '0%'} color={color} />
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {/* ── TAB: MAPPA TIRI ── */}
      {tab === 'mappa tiri' && (
        <Section title="Mappa Tiri">
          <MappaTiriV2 data={mappaTiri} teamA={teamA} teamB={teamB} />
        </Section>
      )}

      {/* ── TAB: PASSAGGI ── */}
      {tab === 'passaggi' && (
        <Section title="Passaggi">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {[teamA, teamB].map((team, i) => {
              const a   = agg('passaggi', team)
              const aPT = agg('passaggi', team, 'Primo_Tempo')
              const aST = agg('passaggi', team, 'Secondo_Tempo')
              const color = i === 0 ? COLOR_HOME : COLOR_AWAY
              return (
                <div key={team}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>{team}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <StatBox label="Totali"      value={a.totale}      color={color} />
                    <StatBox label="Completati"  value={a.completati}  color={color} />
                    <StatBox label="% Comp."     value={a.percentuale ? a.percentuale + '%' : '0%'} color={color} />
                    <StatBox label="Comp. PT"    value={aPT.completati} color={color} />
                    <StatBox label="Comp. ST"    value={aST.completati} color={color} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Grafico confronto */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { label: 'Totali', [teamA]: agg('passaggi', teamA).totale ?? 0, [teamB]: agg('passaggi', teamB).totale ?? 0 },
                { label: 'Completati', [teamA]: agg('passaggi', teamA).completati ?? 0, [teamB]: agg('passaggi', teamB).completati ?? 0 },
              ]}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px' }} />
              <Bar dataKey={teamA} fill={COLOR_HOME} radius={[4,4,0,0]} />
              <Bar dataKey={teamB} fill={COLOR_AWAY} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── TAB: CROSS & LANCI ── */}
      {tab === 'cross & lanci' && (
        <Section title="Cross e Lanci">
          <GraficoSpeculare
            teamA={teamA} teamB={teamB}
            rows={[
              { label: 'Cross Totali',     a: agg('cross', teamA).totale     ?? 0, b: agg('cross', teamB).totale     ?? 0 },
              { label: 'Cross Completati', a: agg('cross', teamA).completati ?? 0, b: agg('cross', teamB).completati ?? 0 },
              { label: 'Lanci Totali',     a: agg('lanci', teamA).totale     ?? 0, b: agg('lanci', teamB).totale     ?? 0 },
              { label: 'Lanci Completati', a: agg('lanci', teamA).completati ?? 0, b: agg('lanci', teamB).completati ?? 0 },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            {[teamA, teamB].map((team, i) => {
              const color = i === 0 ? COLOR_HOME : COLOR_AWAY
              const cross = agg('cross', team)
              const lanci = agg('lanci', team)
              return (
                <div key={team}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>{team}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <StatBox label="Cross"          value={cross.totale}      color={color} />
                    <StatBox label="Cross Comp."    value={cross.completati}  color={color} />
                    <StatBox label="Cross %"        value={cross.percentuale ? cross.percentuale + '%' : '0%'} color={color} />
                    <StatBox label="Lanci"          value={lanci.totale}      color={color} />
                    <StatBox label="Lanci Comp."    value={lanci.completati}  color={color} />
                    <StatBox label="Lanci %"        value={lanci.percentuale ? lanci.percentuale + '%' : '0%'} color={color} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── TAB: DUELLI ── */}
      {tab === 'duelli' && (
        <Section title="Duelli e Palle Recuperate">
          <GraficoSpeculare
            teamA={teamA} teamB={teamB}
            rows={[
              { label: 'Duelli Vinti',     a: aggNoTeam('duelli').extra?.[`vinti_${teamA}`] ?? 0,          b: aggNoTeam('duelli').extra?.[`vinti_${teamB}`] ?? 0 },
              { label: 'Palle Recuperate', a: aggNoTeam('palle recuperate').extra?.[`recuperate_${teamA}`] ?? 0, b: aggNoTeam('palle recuperate').extra?.[`recuperate_${teamB}`] ?? 0 },
              { label: 'Dribbling',        a: agg('dribbling', teamA).totale ?? 0,                          b: agg('dribbling', teamB).totale ?? 0 },
              { label: 'Drib. Riusciti',   a: agg('dribbling', teamA).completati ?? 0,                      b: agg('dribbling', teamB).completati ?? 0 },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            {[teamA, teamB].map((team, i) => {
              const color = i === 0 ? COLOR_HOME : COLOR_AWAY
              const duelli = aggNoTeam('duelli')
              const pallRec = aggNoTeam('palle recuperate')
              const dribb = agg('dribbling', team)
              return (
                <div key={team}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>{team}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <StatBox label="Duelli Vinti"   value={duelli.extra?.[`vinti_${team}`] ?? 0}      color={color} />
                    <StatBox label="Palle Recup."   value={pallRec.extra?.[`recuperate_${team}`] ?? 0} color={color} />
                    <StatBox label="Dribbling"      value={dribb.totale     ?? 0}                      color={color} />
                    <StatBox label="Drib. Riusciti" value={dribb.completati ?? 0}                      color={color} />
                    <StatBox label="Drib. %"        value={dribb.percentuale ? dribb.percentuale + '%' : '0%'} color={color} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
