'use client';

import { useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { postAPI, fetchAPI } from '../../lib/api';
import { getUser } from '../../lib/auth';

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
function normalizeVisualization(vizType, data) {
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

    case 'shot_map': {
      // Dati mappa: [{team, x, y, result, minute, period}, ...]
      return {
        type: 'shot_map',
        title: 'Mappa tiri',
        data: data.map(d => ({
          ...d,
          esito: d.result || d.esito || 'wide',
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

function ShotMapViz({ viz }) {
  const W = 340, H = 510;

  // Coordinate normalizzate 0-100
  // x = larghezza campo (0=sinistra, 100=destra)
  // y = lunghezza campo (0=fondo difesa, 100=fondo attacco)
  // Mostriamo tutto il campo verticalmente
  const scaleX = (x) => (x / 100) * W;
  const scaleY = (y) => H - (y / 100) * H; // inverti Y: 100=alto

  const esito_size    = { goal: 10, save: 8, wide: 5, blocked: 6 };
  const esito_opacity = { goal: 1,  save: 0.85, wide: 0.5, blocked: 0.65 };
  const esito_color   = (esito, team, teams) => {
    const isHome = team === teams[0];
    if (esito === 'goal') return '#FFD700';
    return isHome ? T.primary : T.accent;
  };

  // Trova le squadre uniche
  const teams = [...new Set(viz.data.map(d => d.team))];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ background: '#071A0A', borderRadius: 8, padding: 12, display: 'inline-block', border: `1px solid #1A3020` }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Campo verde */}
          <rect x={0} y={0} width={W} height={H} fill="#071A0A" />

          {/* Bordo campo */}
          <rect x={10} y={10} width={W-20} height={H-20} fill="none" stroke="#1A5025" strokeWidth={1.5} />

          {/* Linea centrocampo */}
          <line x1={10} y1={H/2} x2={W-10} y2={H/2} stroke="#1A5025" strokeWidth={1} strokeDasharray="4,4" />

          {/* Cerchio centrocampo */}
          <circle cx={W/2} cy={H/2} r={50} fill="none" stroke="#1A5025" strokeWidth={1} />
          <circle cx={W/2} cy={H/2} r={2} fill="#1A5025" />

          {/* Area grande superiore (difesa avversaria) */}
          <rect x={W*0.18} y={10} width={W*0.64} height={H*0.16} fill="none" stroke="#1A5025" strokeWidth={1} />
          {/* Area piccola superiore */}
          <rect x={W*0.35} y={10} width={W*0.3} height={H*0.06} fill="none" stroke="#1A5025" strokeWidth={1} />
          {/* Porta superiore */}
          <rect x={W*0.41} y={10} width={W*0.18} height={6} fill="#1A5025" />

          {/* Area grande inferiore (porta di casa) */}
          <rect x={W*0.18} y={H-10-H*0.16} width={W*0.64} height={H*0.16} fill="none" stroke="#1A5025" strokeWidth={1} />
          {/* Area piccola inferiore */}
          <rect x={W*0.35} y={H-10-H*0.06} width={W*0.3} height={H*0.06} fill="none" stroke="#1A5025" strokeWidth={1} />
          {/* Porta inferiore */}
          <rect x={W*0.41} y={H-16} width={W*0.18} height={6} fill="#1A5025" />

          {/* Tiri */}
          {viz.data.map((d, i) => {
            const esito   = d.esito || 'wide';
            const color   = esito === 'goal' ? '#FFD700' : (d.team === teams[0] ? T.primary : T.accent);
            const r       = esito_size[esito] || 6;
            const opacity = esito_opacity[esito] || 0.7;
            const cx      = scaleX(d.x || 50);
            const cy      = scaleY(d.y || 50);

            return (
              <g key={i}>
                <circle
                  cx={cx} cy={cy} r={r}
                  fill={color} opacity={opacity}
                  stroke={esito === 'goal' ? '#fff' : 'none'}
                  strokeWidth={1.5}
                />
              </g>
            );
          })}
        </svg>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: T.textMuted, flexWrap: 'wrap' }}>
          {teams.map((team, i) => (
            <span key={team}>
              <span style={{ color: i === 0 ? T.primary : T.accent }}>●</span> {team}
            </span>
          ))}
          <span style={{ marginLeft: 'auto' }}>
            <span style={{ color: '#FFD700' }}>●</span> Goal &nbsp;
            <span style={{ fontSize: 10, opacity: 0.7 }}>●</span> Parata &nbsp;
            <span style={{ fontSize: 8, opacity: 0.5 }}>●</span> Fuori
          </span>
        </div>
      </div>
    </div>
  );
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

function Visualization({ vizType, data }) {
  const viz = normalizeVisualization(vizType, data);
  if (!viz) return null;
  switch (viz.type) {
    case 'bar_chart': return <BarChartViz viz={viz} />;
    case 'shot_map':  return <ShotMapViz viz={viz} />;
    case 'radar':     return <RadarViz viz={viz} />;
    case 'table':     return <TableViz viz={viz} />;
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
              <Visualization vizType={msg.visualization} data={msg.data} />
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
const SUGGESTIONS_MAZZOLA = [
  { label: 'Tiri vs Certaldo',    q: 'Quanti tiri ha fatto il Mazzola contro il Certaldo?' },
  { label: 'Mappa tiri',          q: 'Mostrami la mappa dei tiri contro il Certaldo' },
  { label: 'Tiri tutte le partite', q: 'Confronta i tiri del Mazzola in tutte le partite con goal e tiri nello specchio' },
  { label: 'Passaggi completati', q: 'Mostrami i passaggi completati del Mazzola partita per partita' },
];

const SUGGESTIONS_SANGIOVANNESE = [
  { label: 'Tiri tutte le partite', q: 'Mostrami i tiri della Sangiovannese partita per partita con goal e tiri nello specchio' },
  { label: 'Passaggi completati',   q: 'Confronta i passaggi completati della Sangiovannese in tutte le partite' },
  { label: 'Duelli Rondinella',     q: 'Chi ha vinto più duelli nella partita contro la Rondinella?' },
  { label: 'Mappa tiri Rondinella', q: 'Mostrami la mappa dei tiri contro la Rondinella' },
];

// ─────────────────────────────────────────
// PAGINA PRINCIPALE
// ─────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ciao! Sono il tuo analista tattico. Puoi chiedermi statistiche, confronti, mappe tiri o qualsiasi dato sulle partite.',
      visualization: null,
      data: null,
      sql: null,
    }
  ]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [user,      setUser]      = useState(null);
  const [tenant,    setTenant]    = useState('mazzola');
  const [matchName, setMatchName] = useState('');
  const [partite,   setPartite]   = useState([]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u?.tenant) setTenant(u.tenant);
  }, []);

  // Carica lista partite quando cambia tenant
  useEffect(() => {
    fetchAPI(`/upload/v2/partite?tenant=${tenant}`)
      .then(res => setPartite(res.data || []))
      .catch(() => setPartite([]));
    setMatchName('');
    setSessionId(null);
  }, [tenant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = tenant === 'mazzola' ? SUGGESTIONS_MAZZOLA : SUGGESTIONS_SANGIOVANNESE;

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
          data:          res.data || null,
          sql:           res.sql  || null,
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: T.bg, fontFamily: 'var(--font-body, Inter, sans-serif)',
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
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${T.border}`, padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: T.bgCard, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: T.success, boxShadow: `0 0 6px ${T.success}`,
        }} />
        <span style={{
          fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
          fontSize: 16, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: T.textPrimary,
        }}>
          Analista Tattico
        </span>

        {/* Selettore Tenant — solo admin */}
        {user && user.role === 'admin' ? (
          <select
            value={tenant}
            onChange={e => setTenant(e.target.value)}
            style={{
              background: T.bgInput, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 12,
              color: T.textPrimary, cursor: 'pointer', marginLeft: 'auto',
            }}
          >
            <option value="mazzola">Mazzola</option>
            <option value="sangiovannese">Sangiovannese</option>
          </select>
        ) : (
          <span style={{
            marginLeft: 'auto', fontSize: 12, color: T.textMuted,
            fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {tenant}
          </span>
        )}

        {/* Selettore Partita */}
        <select
          value={matchName}
          onChange={e => setMatchName(e.target.value)}
          style={{
            background: T.bgInput, border: `1px solid ${T.border}`,
            borderRadius: 6, padding: '4px 10px', fontSize: 12,
            color: matchName ? T.textPrimary : T.textMuted, cursor: 'pointer',
            minWidth: 140,
          }}
        >
          <option value="">Tutte le partite</option>
          {partite.map(p => (
            <option key={p.match_name} value={p.match_name}>
              {p.away_team || p.match_name}
            </option>
          ))}
        </select>
      </div>

      {/* Messaggi */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px 24px 8px',
        maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box',
      }}>
        {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggerimenti */}
      {messages.length <= 2 && (
        <div style={{
          padding: '0 24px 12px', display: 'flex', gap: 8, flexWrap: 'wrap',
          maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s.q)}
              style={{
                background: 'transparent', border: `1px solid ${T.border}`,
                borderRadius: 20, padding: '6px 14px', fontSize: 12,
                color: T.textMuted, cursor: 'pointer', transition: 'all 0.15s',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
              }}
              onMouseEnter={e => { e.target.style.borderColor = T.primary; e.target.style.color = T.primary; }}
              onMouseLeave={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textMuted; }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

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
              placeholder={`Chiedi al ${tenant === 'mazzola' ? 'Mazzola' : 'Sangiovannese'}…`}
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
          Premi Invio per inviare · Shift+Invio per andare a capo
        </p>
      </div>
    </div>
  );
}
