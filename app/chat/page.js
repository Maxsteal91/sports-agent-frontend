'use client';

import { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { postAPI, fetchAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';
import { useTenant } from '../../lib/TenantContext';

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────
const T = {
  bg:          '#0A0E1A',
  bgCard:      '#111827',
  bgInput:     '#1A2235',
  primary:     '#00E5FF',
  accent:      '#FF6B35',
  textPrimary: '#F1F5F9',
  textMuted:   '#64748B',
  border:      '#1E2D45',
  success:     '#10B981',
  danger:      '#EF4444',
  warning:     '#F59E0B',
};

// ─────────────────────────────────────────
// NORMALIZZA VISUALIZZAZIONE
// Adatta i dati reali del backend ai componenti viz
// ─────────────────────────────────────────
function normalizeVisualization(vizType, data, vizMeta) {
  if (!vizType || !data || vizType === 'none') return null;

  switch (vizType) {

    case 'bar_chart': {
      // Dati aggregati: [{match_name, team, totale, completati, extra}, ...]
      // oppure [{event_type, team, totale, ...}, ...]
      if (!data.length) return null;

      const keys = Object.keys(data[0]).filter(k =>
        !['match_name', 'event_type', 'extra', 'sql', 'period'].includes(k) &&
        typeof data[0][k] === 'number'
      );

      // Asse X — usa match_name, event_type, o team
      const labelKey = data[0].match_name ? 'match_name'
                     : data[0].event_type ? 'event_type'
                     : 'team';

      // Appiattisci extra se presente
      const flatData = data.map(row => {
        const flat = { ...row };
        if (row.extra && typeof row.extra === 'object') {
          Object.entries(row.extra).forEach(([k, v]) => {
            flat[`extra_${k}`] = v;
          });
        }
        flat.label = row[labelKey] || '';
        return flat;
      });

      // Scegli le chiavi più rilevanti (max 4 barre)
      const numericKeys = [...keys, ...Object.keys(flatData[0]).filter(k => k.startsWith('extra_'))]
        .filter(k => flatData.some(r => r[k] > 0))
        .slice(0, 4);

      const colors = [T.primary, T.accent, T.success, T.warning];

      return {
        type: 'bar_chart',
        title: '',
        data: flatData,
        keys: numericKeys,
        colors,
      };
    }

    case 'field_map':
    case 'shot_map': {
      return {
        type: 'field_map',
        title: 'Mappa campo',
        source_format: vizMeta?.source_format || 'vidswap',
        event_type:    vizMeta?.event_type    || 'shot',
        data: data.map(d => ({
          ...d,
          esito: d.result || d.outcome || d.esito || '',
        })),
      };
    }

    case 'radar': {
      // Trasforma dati in formato radar
      if (!data.length) return null;
      return {
        type: 'radar',
        title: '',
        data,
      };
    }

    case 'table': {
      // Converti array di oggetti in colonne + righe
      if (!data.length) return null;
      const columns = Object.keys(data[0]);
      const rows = data.map(row => columns.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return '—';
        if (typeof v === 'number') return Number.isInteger(v) ? v : v.toFixed(1);
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      }));
      return { type: 'table', title: '', columns, rows };
    }

    default:
      return null;
  }
}

// ─────────────────────────────────────────
// COMPONENTI VISUALIZZAZIONE
// ─────────────────────────────────────────

function BarChartViz({ viz }) {
  const labelMap = {
    totale: 'Totale', completati: 'Completati', percentuale: '%',
    extra_goal: 'Goal', extra_nello_specchio: 'Specchio', extra_fuori: 'Fuori',
    extra_riusciti: 'Riusciti', extra_non_riusciti: 'Non riusciti',
    extra_falli: 'Falli', extra_ammonizioni: 'Amm.', extra_espulsioni: 'Esp.',
  };

  return (
    <div style={{ marginTop: 16 }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={viz.data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis
            dataKey="label"
            tick={{ fill: T.textMuted, fontSize: 11 }}
            axisLine={{ stroke: T.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: T.textMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: T.textPrimary }}
            itemStyle={{ color: T.textMuted }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: T.textMuted }} />
          {viz.keys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={viz.colors[i % viz.colors.length]}
              radius={[3, 3, 0, 0]}
              name={labelMap[key] || key}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FieldMapViz({ viz }) {
  const isBalloni = viz.source_format === 'balloni'
  const et = viz.event_type || 'shot'
  const G = '#071A0A', L = '#1A5025'

  const FW = 460
  const FH = isBalloni ? Math.round(FW * 68 / 105) : 420
  const W = FW + 20, H = FH + 20

  const sx = (x) => 10 + (x / 100) * FW
  const sy = isBalloni
    ? (y) => 10 + (y / 100) * FH
    : (y) => 10 + ((100 - y) / 100) * FH

  const teams = [...new Set(viz.data.map(d => d.team).filter(Boolean))]
  const col = (team) => team === teams[0] ? T.primary : T.accent

  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')

  const marker = (cx, cy, esito, color) => {
    const e = norm(esito)
    const isGol = e === 'gol' || e === 'goal'
    const isIn  = e === 'inporta' || e === 'save' || e === 'saved' || e === 'nellospecchio'
    const isFuori = e === 'fuori' || e === 'wide' || e === 'off'
    const isMurato = e === 'murato' || e === 'blocked'
    const isPalo = e === 'palotraversa' || e === 'post' || e === 'palo' || e === 'traversa'
    const isRiuscito = e === 'riuscito' || e === 'completed'
    const isRespinto = e === 'respinto' || e === 'failed'
    const s = 5

    if (et === 'shot') {
      if (isGol)    return <text key="m" x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={13} fill={color} stroke="white" strokeWidth={0.4}>★</text>
      if (isIn)     return <circle key="m" cx={cx} cy={cy} r={6} fill={color} opacity={0.9} />
      if (isFuori)  return <g key="m"><line x1={cx-s} y1={cy-s} x2={cx+s} y2={cy+s} stroke={color} strokeWidth={2}/><line x1={cx+s} y1={cy-s} x2={cx-s} y2={cy+s} stroke={color} strokeWidth={2}/></g>
      if (isMurato) return <rect key="m" x={cx-5} y={cy-5} width={10} height={10} fill={color} opacity={0.85} />
      if (isPalo)   return <polygon key="m" points={`${cx},${cy-7} ${cx+6},${cy} ${cx},${cy+7} ${cx-6},${cy}`} fill={color} opacity={0.9} />
      return <circle key="m" cx={cx} cy={cy} r={5} fill={color} opacity={0.6} />
    }
    if (et === 'cross') {
      if (isRiuscito) return <circle key="m" cx={cx} cy={cy} r={6} fill={color} opacity={0.9} stroke="white" strokeWidth={1} />
      if (isRespinto) return <g key="m"><line x1={cx-s} y1={cy-s} x2={cx+s} y2={cy+s} stroke={color} strokeWidth={2}/><line x1={cx+s} y1={cy-s} x2={cx-s} y2={cy+s} stroke={color} strokeWidth={2}/></g>
      return <polygon key="m" points={`${cx},${cy-7} ${cx+6},${cy+4} ${cx-6},${cy+4}`} fill={color} opacity={0.75} />
    }
    return <circle key="m" cx={cx} cy={cy} r={5} fill={color} opacity={0.8} />
  }

  return (
    <div style={{ marginTop: 16, overflowX: 'auto' }}>
      <div style={{ background: G, borderRadius: 8, padding: 10, display: 'inline-block', border: `1px solid #1A3020` }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect width={W} height={H} fill={G} />
          {isBalloni ? (
            <>
              <rect x={10} y={10} width={FW} height={FH} fill="none" stroke={L} strokeWidth={1.5} />
              <line x1={10+FW/2} y1={10} x2={10+FW/2} y2={10+FH} stroke={L} strokeWidth={1} />
              <circle cx={10+FW/2} cy={10+FH/2} r={FH*0.22} fill="none" stroke={L} strokeWidth={1} />
              <circle cx={10+FW/2} cy={10+FH/2} r={2} fill={L} />
              <rect x={10} y={10+FH*0.18} width={FW*0.16} height={FH*0.64} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10} y={10+FH*0.32} width={FW*0.055} height={FH*0.36} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10} y={10+FH*0.37} width={4} height={FH*0.26} fill={L} />
              <rect x={10+FW*0.84} y={10+FH*0.18} width={FW*0.16} height={FH*0.64} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10+FW*0.945} y={10+FH*0.32} width={FW*0.055} height={FH*0.36} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10+FW-4} y={10+FH*0.37} width={4} height={FH*0.26} fill={L} />
            </>
          ) : (
            <>
              <rect x={10} y={10} width={FW} height={FH} fill="none" stroke={L} strokeWidth={1.5} />
              <line x1={10} y1={10+FH/2} x2={10+FW} y2={10+FH/2} stroke={L} strokeWidth={1} strokeDasharray="4,4" />
              <circle cx={10+FW/2} cy={10+FH/2} r={50} fill="none" stroke={L} strokeWidth={1} />
              <circle cx={10+FW/2} cy={10+FH/2} r={2} fill={L} />
              <rect x={10+FW*0.18} y={10} width={FW*0.64} height={FH*0.16} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10+FW*0.35} y={10} width={FW*0.3} height={FH*0.06} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10+FW*0.41} y={10} width={FW*0.18} height={6} fill={L} />
              <rect x={10+FW*0.18} y={10+FH-FH*0.16} width={FW*0.64} height={FH*0.16} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10+FW*0.35} y={10+FH-FH*0.06} width={FW*0.3} height={FH*0.06} fill="none" stroke={L} strokeWidth={1} />
              <rect x={10+FW*0.41} y={10+FH-6} width={FW*0.18} height={6} fill={L} />
            </>
          )}
          {viz.data.map((d, i) => (
            <g key={i}>{marker(sx(d.x ?? 50), sy(d.y ?? 50), d.esito, col(d.team))}</g>
          ))}
        </svg>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11, color: T.textMuted, flexWrap: 'wrap', alignItems: 'center' }}>
          {teams.map((team, i) => (
            <span key={team}><span style={{ color: i === 0 ? T.primary : T.accent }}>●</span> {team}</span>
          ))}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, opacity: 0.8 }}>
            {et === 'shot'  && <><span>★ gol</span><span>● specchio</span><span>✕ fuori</span><span>■ murato</span><span>◆ palo</span></>}
            {et === 'cross' && <><span>● riuscito</span><span>✕ respinto</span><span>▲ altro</span></>}
          </span>
        </div>
      </div>
    </div>
  )
}

function RadarViz({ viz }) {
  const keys = Object.keys(viz.data[0] || {}).filter(k => k !== 'metrica' && k !== 'label');
  const colors = [T.primary, T.accent];

  return (
    <div style={{ marginTop: 16 }}>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={viz.data}>
          <PolarGrid stroke={T.border} />
          <PolarAngleAxis dataKey="metrica" tick={{ fill: T.textMuted, fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: T.textMuted, fontSize: 10 }} tickCount={4} />
          {keys.map((key, i) => (
            <Radar key={key} name={key} dataKey={key}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11, color: T.textMuted }} />
          <Tooltip
            contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12 }}
            itemStyle={{ color: T.textMuted }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableViz({ viz }) {
  return (
    <div style={{ marginTop: 16, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {viz.columns.map((col, i) => (
              <th key={i} style={{
                padding: '6px 10px',
                textAlign: i === 0 ? 'left' : 'center',
                color: T.primary,
                fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderBottom: `1px solid ${T.border}`,
                fontWeight: 600,
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {viz.rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: `1px solid ${T.border}` }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '7px 10px',
                  textAlign: ci === 0 ? 'left' : 'center',
                  color: T.textPrimary,
                  fontWeight: ci === 0 ? 500 : 400,
                  background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Visualization({ vizType, data, vizMeta }) {
  const viz = normalizeVisualization(vizType, data, vizMeta);
  if (!viz) return null;
  switch (viz.type) {
    case 'bar_chart':  return <BarChartViz viz={viz} />;
    case 'field_map':  return <FieldMapViz viz={viz} />;
    case 'radar':      return <RadarViz viz={viz} />;
    case 'table':      return <TableViz viz={viz} />;
    default: return null;
  }
}

// ─────────────────────────────────────────
// SQL BADGE — mostra la query eseguita
// ─────────────────────────────────────────
function SqlBadge({ sql }) {
  const [open, setOpen] = useState(false);
  if (!sql) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent', border: `1px solid ${T.border}`,
          borderRadius: 4, padding: '2px 8px', fontSize: 10,
          color: T.textMuted, cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        {open ? '▲ SQL' : '▼ SQL'}
      </button>
      {open && (
        <pre style={{
          marginTop: 6, padding: '8px 10px',
          background: '#0D1520', border: `1px solid ${T.border}`,
          borderRadius: 6, fontSize: 11, color: '#7DD3FC',
          overflowX: 'auto', lineHeight: 1.5,
          fontFamily: 'monospace',
        }}>
          {sql}
        </pre>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// BOLLA CHAT
// ─────────────────────────────────────────
function AnswerText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p style={{ margin: 0, lineHeight: 1.6, color: T.textPrimary, fontSize: 14 }}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ color: T.primary }}>{p.slice(2, -2)}</strong>
          : p
      )}
    </p>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{
          background: T.primary, color: T.bg,
          borderRadius: '16px 16px 4px 16px',
          padding: '10px 16px', maxWidth: '70%',
          fontSize: 14, fontWeight: 500, lineHeight: 1.5,
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `linear-gradient(135deg, ${T.primary}33, ${T.accent}33)`,
        border: `1px solid ${T.primary}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 13, color: T.primary, fontWeight: 700,
        fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
      }}>M</div>
      <div style={{
        background: T.bgCard, border: `1px solid ${T.border}`,
        borderRadius: '4px 16px 16px 16px',
        padding: '12px 16px', maxWidth: '85%', flex: 1,
      }}>
        {msg.loading ? (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 20 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: T.primary,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        ) : (
          <>
            <AnswerText text={msg.content} />
            {msg.visualization && msg.data && (
              <Visualization vizType={msg.visualization} data={msg.data} vizMeta={msg.vizMeta} />
            )}
            <SqlBadge sql={msg.sql} />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SUGGERIMENTI DINAMICI per tenant
// ─────────────────────────────────────────
function buildSuggestions(partite, tenant) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
  const tenantBase = tenant ? tenant.replace(/_\d{4}$/, '') : tenant

  // Trova la prima partita disponibile per esempi specifici
  const first = partite[0]
  const opp = first
    ? cap(first.away_team !== tenantBase ? first.away_team : first.home_team)
    : null

  const teamLabel = cap(tenantBase || tenant || 'squadra')

  const base = [
    { label: 'Tiri stagione',      q: `Confronta i tiri del ${teamLabel} in tutte le partite con goal e tiri nello specchio` },
    { label: 'Passaggi stagione',  q: `Mostrami i passaggi completati del ${teamLabel} partita per partita` },
    { label: 'Giocatori vs tutti', q: `Chi sono i giocatori con più tiri del ${teamLabel} in stagione?` },
  ]

  if (opp) {
    base.push({ label: `Tiri vs ${opp}`,  q: `Quanti tiri ha fatto il ${teamLabel} contro ${opp}?` })
    base.push({ label: `Mappa vs ${opp}`, q: `Mostrami la mappa dei tiri del ${teamLabel} contro ${opp}` })
  }

  return base
}

// ─────────────────────────────────────────
// PAGINA PRINCIPALE
// ─────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const { tenant, ready, categoria } = useTenant();
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [sessionId,   setSessionId]   = useState(null);
  const [user,        setUser]        = useState(null);
  const [matchName,   setMatchName]   = useState('');
  const [partite,     setPartite]     = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Carica lista partite quando cambia tenant
  useEffect(() => {
    if (!tenant || !ready) return;
    fetchAPI(`/upload/v2/partite?tenant=${tenant}`)
      .then(res => setPartite(res.data || []))
      .catch(() => setPartite([]));
    setMatchName('');
    setSessionId(null);
  }, [tenant, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const partiteFiltrate = categoria ? partite.filter(p => p.category === categoria) : partite;

  const suggestions = buildSuggestions(partiteFiltrate, tenant);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const q = text.trim();
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '', loading: true }]);

    try {
      const body = {
        question:   q,
        tenant:     tenant,
        session_id: sessionId || undefined,
      };
      if (matchName) body.match_name = matchName;

      const res = await postAPI('/v2/chat/ask', body);

      if (res.session_id) setSessionId(res.session_id);

      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role:          'assistant',
          content:       res.answer || 'Nessuna risposta.',
          visualization: res.visualization || null,
          vizMeta:       res.viz_meta      || null,
          data:          res.data          || null,
          sql:           res.sql           || null,
        }
      ]);
    } catch (err) {
      const msg = err.message.includes('429') || err.message.includes('Limite')
        ? '⏱ ' + err.message
        : `Si è verificato un errore: ${err.message}`;
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: msg, visualization: null, data: null, sql: null }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const matchLabel = (p) => {
    const c = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
    return p.home_team && p.away_team ? `${c(p.home_team)} vs ${c(p.away_team)}` : p.match_name
  }

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 60px)',
      background: T.bg, fontFamily: 'var(--font-body, Inter, sans-serif)',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        textarea:focus { outline: none; }
        select { appearance: none; }
        @media (max-width: 640px) {
          .chat-sidebar { position: absolute; z-index: 50; height: 100%; }
        }
      `}</style>

      {/* Sidebar */}
      <div className="chat-sidebar" style={{
        width: sidebarOpen ? 240 : 0, flexShrink: 0, overflow: 'hidden',
        borderRight: sidebarOpen ? `1px solid ${T.border}` : 'none',
        background: T.bgCard, display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
      }}>
        <div style={{ padding: '20px 16px', overflowY: 'auto', flex: 1, minWidth: 240 }}>

          {/* Titolo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: T.success, boxShadow: `0 0 6px ${T.success}` }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textPrimary,
            }}>Analista Tattico</span>
          </div>

          {/* Selettore partita */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: T.textMuted, marginBottom: 8,
              fontFamily: 'var(--font-display)',
            }}>Partita</div>
            <select
              value={matchName}
              onChange={e => setMatchName(e.target.value)}
              style={{
                width: '100%', background: T.bgInput,
                border: `1px solid ${matchName ? T.primary + '88' : T.border}`,
                borderRadius: 8, padding: '8px 10px', fontSize: 12,
                color: matchName ? T.textPrimary : T.textMuted, cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Tutte le partite</option>
              {partiteFiltrate.map(p => (
                <option key={p.match_name} value={p.match_name}>{matchLabel(p)}</option>
              ))}
            </select>
            {matchName && (
              <button onClick={() => setMatchName('')} style={{
                marginTop: 6, fontSize: 11, color: T.textMuted, background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
              }}>✕ Deseleziona</button>
            )}
          </div>

          {/* Domande suggerite */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: T.textMuted, marginBottom: 10,
              fontFamily: 'var(--font-display)',
            }}>Domande rapide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.q)} style={{
                  background: 'transparent', border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: '7px 10px', fontSize: 12,
                  color: T.textMuted, cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'var(--font-body, Inter, sans-serif)', lineHeight: 1.4,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.color = T.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Area chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Barra superiore chat — solo toggle sidebar */}
        <div style={{
          borderBottom: `1px solid ${T.border}`, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.bgCard, flexShrink: 0,
        }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.textMuted, padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }} title={sidebarOpen ? 'Chiudi pannello' : 'Apri pannello'}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          {matchName && (
            <span style={{
              fontSize: 11, color: T.primary, fontFamily: 'var(--font-display)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              📌 {matchLabel(partiteFiltrate.find(p => p.match_name === matchName) || { match_name: matchName })}
            </span>
          )}
        </div>

        {/* Messaggi */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '24px 24px 8px',
          maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box',
          alignSelf: 'center', width: '100%',
        }}>
          {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          borderTop: `1px solid ${T.border}`, padding: '16px 24px',
          background: T.bgCard, flexShrink: 0,
        }}>
          <div style={{
            maxWidth: 800, margin: '0 auto',
            display: 'flex', gap: 12, alignItems: 'flex-end',
          }}>
            <div style={{
              flex: 1, background: T.bgInput, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: '10px 14px',
              display: 'flex', alignItems: 'flex-end', gap: 8,
              transition: 'border-color 0.15s',
            }}
              onFocusCapture={e => e.currentTarget.style.borderColor = T.primary + '88'}
              onBlurCapture={e => e.currentTarget.style.borderColor = T.border}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Fai una domanda…"
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  resize: 'none', fontSize: 14, color: T.textPrimary,
                  lineHeight: 1.5, fontFamily: 'var(--font-body, Inter, sans-serif)',
                  maxHeight: 120, overflowY: 'auto', caretColor: T.primary,
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: input.trim() && !loading ? T.primary : T.border,
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                stroke={T.bg} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: T.textMuted, marginTop: 8, marginBottom: 0 }}>
            Invio per inviare · Shift+Invio per andare a capo
          </p>
        </div>
      </div>
    </div>
  );
}
