'use client'
import { useState, useRef, useEffect } from 'react'
import { getUser } from '../../lib/auth'
import { getToken } from '../../lib/auth'

const ALL_TENANTS = ['mazzola', 'sangiovannese']
const CATEGORIES = ['prima', 'u21', 'u19', 'u17', 'u16', 'u15']

export default function UploadPage() {
  const [matchName,   setMatchName]   = useState('')
  const [tenant,      setTenant]      = useState('mazzola')
  const [category,    setCategory]    = useState('prima')
  const [aliases,     setAliases]     = useState('{"San giovannese 1927":"mazzola","Sangiovannese 1927":"mazzola"}')
  const [file,        setFile]        = useState(null)
  const [dragging,    setDragging]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)
  const [partite,     setPartite]     = useState([])
  const [loadingPartite, setLoadingPartite] = useState(false)
  const [deletingMatch,  setDeletingMatch]  = useState(null)
  const [user, setUser] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u?.tenant) setTenant(u.tenant)
  }, [])

  // Carica lista partite per tenant selezionato
  const loadPartite = async (t) => {
    const tenantToUse = t || tenant
    setLoadingPartite(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/upload/v2/partite?tenant=${tenantToUse}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Errore caricamento partite')
      const data = await res.json()
      setPartite(data.data || [])
    } catch (e) {
      console.error(e)
      setPartite([])
    } finally {
      setLoadingPartite(false)
    }
  }

  const handleTenantChange = (t) => {
    setTenant(t)
    // Aggiorna alias default in base al tenant
    if (t === 'mazzola') {
      setAliases('{"San giovannese 1927":"mazzola","Sangiovannese 1927":"mazzola"}')
    } else {
      setAliases('')
    }
    loadPartite(t)
  }

  // Drag & drop
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.json')) {
      setFile(dropped); setError(null)
    } else {
      setError('Solo file .json sono accettati')
    }
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) { setFile(selected); setError(null) }
  }

  // Upload al nuovo endpoint v2
  const handleUpload = async () => {
    if (!file)             return setError('Seleziona un file JSON')
    if (!matchName.trim()) return setError('Inserisci un nome partita')

    // Valida aliases JSON se presente
    if (aliases.trim()) {
      try { JSON.parse(aliases) } catch {
        return setError('Il campo Aliases non è un JSON valido')
      }
    }

    setLoading(true); setResult(null); setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tenant', tenant)
      formData.append('category', category)
      formData.append('aliases', aliases.trim() || '{}')

      const token = getToken()
      const res = await fetch(`/api/upload/v2/partita/${matchName.trim().toLowerCase()}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        let detail = 'Errore upload'
        try { detail = JSON.parse(text).detail || detail } catch {}
        throw new Error(detail)
      }

      const data = await res.json()
      setResult(data)
      setFile(null); setMatchName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadPartite()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Elimina partita
  const handleDelete = async (mn) => {
    if (!confirm(`Eliminare tutti i dati di ${mn} dal tenant ${tenant}?`)) return
    setDeletingMatch(mn)
    try {
      const token = getToken()
      const res = await fetch(`/api/upload/v2/partita/${mn}?tenant=${tenant}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Errore eliminazione')
      setPartite(prev => prev.filter(p => p.match_name !== mn))
    } catch (e) {
      alert(e.message)
    } finally {
      setDeletingMatch(null)
    }
  }

  // Carica partite al mount
  useState(() => { loadPartite() }, [])

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
    borderRadius: '8px', color: 'var(--text)', fontSize: '0.95rem',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem',
    color: 'var(--text-muted)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: '0.4rem',
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
    paddingRight: '2rem',
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
          UPLOAD PARTITA
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Carica un file JSON VidSwap per aggiungere una nuova partita
        </p>
      </div>

      {/* Form upload */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
      }}>

        {/* Riga 1: Tenant + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Organizzazione (Tenant)</label>
            {user?.role === 'admin' ? (
              <select
                value={tenant}
                onChange={e => handleTenantChange(e.target.value)}
                style={selectStyle}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              >
                {ALL_TENANTS.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            ) : (
              <div style={{...inputStyle, color: 'var(--text-muted)', cursor: 'default'}}>
                {tenant.charAt(0).toUpperCase() + tenant.slice(1)}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={selectStyle}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Riga 2: Nome partita */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Nome Partita</label>
          <input
            type="text"
            value={matchName}
            onChange={e => setMatchName(e.target.value.toLowerCase())}
            placeholder="es. certaldo, lanciotto, grassina..."
            style={{ ...inputStyle, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Riga 3: Aliases */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>
            Aliases squadra &nbsp;
            <span style={{ textTransform: 'none', fontSize: '0.7rem', opacity: 0.6 }}>
              (opzionale — JSON per rinominare la squadra di casa)
            </span>
          </label>
          <input
            type="text"
            value={aliases}
            onChange={e => setAliases(e.target.value)}
            placeholder='{"San giovannese 1927": "mazzola"}'
            style={{ ...inputStyle, fontSize: '0.8rem', fontFamily: 'monospace' }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Drag & drop zone */}
        <div
          onDragEnter={handleDrag} onDragOver={handleDrag}
          onDragLeave={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--primary)' : file ? '#10B981' : 'var(--border)'}`,
            borderRadius: '12px', padding: '2.5rem', textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(0,229,255,0.05)' : file ? 'rgba(16,185,129,0.05)' : 'transparent',
            transition: 'all 0.2s', marginBottom: '1.25rem'
          }}
        >
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            {file ? '✅' : dragging ? '📂' : '📁'}
          </div>
          {file ? (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#10B981', fontWeight: 600 }}>
                {file.name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {(file.size / 1024).toFixed(1)} KB — clicca per cambiare
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)', fontWeight: 600 }}>
                Trascina il file JSON qui
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                oppure clicca per selezionare
              </div>
            </>
          )}
        </div>

        {/* Errore */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
            color: '#EF4444', fontSize: '0.85rem'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Successo */}
        {result && (
          <div style={{
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem'
          }}>
            <div style={{ color: '#10B981', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.5rem' }}>
              ✅ PARTITA CARICATA — {result.match_name} ({result.tenant} / {result.category})
            </div>
            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {Object.entries(result.righe_caricate || {}).map(([k, v]) => (
                <span key={k}>
                  {k}: <strong style={{ color: 'var(--text)' }}>{v}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bottone upload */}
        <button
          onClick={handleUpload}
          disabled={loading || !file || !matchName.trim()}
          style={{
            width: '100%', padding: '0.85rem', borderRadius: '8px', border: 'none',
            background: loading || !file || !matchName.trim() ? 'rgba(0,229,255,0.15)' : 'var(--primary)',
            color: loading || !file || !matchName.trim() ? 'var(--text-muted)' : '#0A0E1A',
            cursor: loading || !file || !matchName.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
            letterSpacing: '0.08em', transition: 'all 0.2s'
          }}
        >
          {loading ? 'CARICAMENTO IN CORSO...' : 'CARICA PARTITA'}
        </button>
      </div>

      {/* Lista partite */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600,
            letterSpacing: '0.08em', color: 'var(--text)', textTransform: 'uppercase'
          }}>
            PARTITE — {tenant.toUpperCase()}
          </h2>
          <button
            onClick={() => loadPartite()}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontSize: '0.8rem',
              letterSpacing: '0.05em', transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            ↻ AGGIORNA
          </button>
        </div>

        {loadingPartite ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
            Caricamento...
          </div>
        ) : partite.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
            Nessuna partita nel database per {tenant}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Partita', 'Data', 'Casa', 'Ospite', 'Cat.', ''].map(h => (
                  <th key={h} style={{
                    padding: '0.5rem', textAlign: 'left', color: 'var(--text-muted)',
                    fontWeight: 500, textTransform: 'uppercase',
                    letterSpacing: '0.08em', fontSize: '0.7rem'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partite.map((p) => (
                <tr key={p.match_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '0.8rem',
                      color: 'var(--primary)', background: 'rgba(0,229,255,0.08)',
                      padding: '2px 8px', borderRadius: '4px'
                    }}>
                      {p.match_name}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                    {p.date ? new Date(p.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text)' }}>{p.home_team || '—'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text)' }}>{p.away_team || '—'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {p.category || '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(p.match_name)}
                      disabled={deletingMatch === p.match_name}
                      style={{
                        padding: '0.3rem 0.7rem', borderRadius: '6px',
                        border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                        color: deletingMatch === p.match_name ? 'var(--text-muted)' : '#EF4444',
                        cursor: deletingMatch === p.match_name ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem', fontFamily: 'var(--font-display)',
                        letterSpacing: '0.05em', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { if (deletingMatch !== p.match_name) e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {deletingMatch === p.match_name ? '...' : 'ELIMINA'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
