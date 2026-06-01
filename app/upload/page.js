'use client'
import { useState, useRef } from 'react'

export default function UploadPage() {
  const [matchName, setMatchName] = useState('')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [partite, setPartite] = useState([])
  const [loadingPartite, setLoadingPartite] = useState(false)
  const [deletingMatch, setDeletingMatch] = useState(null)
  const fileInputRef = useRef(null)

  // Carica lista partite
  const loadPartite = async () => {
    setLoadingPartite(true)
    try {
      const res = await fetch('/api/upload/partite')
      if (!res.ok) throw new Error('Errore caricamento partite')
        const data = await res.json()
        setPartite(data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPartite(false)
    }
  }

  // Drag & drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.name.endsWith('.json')) {
      setFile(dropped)
      setError(null)
    } else {
      setError('Solo file .json sono accettati')
    }
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      setFile(selected)
      setError(null)
    }
  }

  // Upload
  const handleUpload = async () => {
    if (!file) return setError('Seleziona un file JSON')
    if (!matchName.trim()) return setError('Inserisci un nome partita (es. Z_CERTALDO)')

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/upload/partita/${matchName.trim()}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Errore upload')
      }

      const data = await res.json()
      setResult(data)
      setFile(null)
      setMatchName('')
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
    if (!confirm(`Eliminare tutti i dati di ${mn}?`)) return
    setDeletingMatch(mn)
    try {
      const res = await fetch(`/api/upload/partita/${mn}`, { method: 'DELETE' })
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

        {/* Match name */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{
            display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.8rem',
            color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem'
          }}>
            Nome Partita (ID)
          </label>
          <input
            type="text"
            value={matchName}
            onChange={e => setMatchName(e.target.value.toUpperCase())}
            placeholder="es. Z_CERTALDO"
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text)', fontSize: '0.95rem',
              fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
              outline: 'none', transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Drag & drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--primary)' : file ? 'var(--success)' : 'var(--border)'}`,
            borderRadius: '12px',
            padding: '2.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(0,229,255,0.05)' : file ? 'rgba(0,230,118,0.05)' : 'transparent',
            transition: 'all 0.2s',
            marginBottom: '1.25rem'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            {file ? '✅' : dragging ? '📂' : '📁'}
          </div>
          {file ? (
            <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--success)', fontWeight: 600 }}>
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
            background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
            color: 'var(--danger)', fontSize: '0.85rem'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Successo */}
        {result && (
          <div style={{
            background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
            fontSize: '0.85rem'
          }}>
            <div style={{ color: 'var(--success)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.5rem' }}>
              ✅ PARTITA CARICATA — {result.match_name}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
              <span>📅 Calendario: <strong style={{ color: 'var(--text)' }}>{result.righe_caricate.anagrafica_partite ?? 0} righe</strong></span>
              <span>📊 Eventi: <strong style={{ color: 'var(--text)' }}>{result.righe_caricate.eventi_arricchiti} righe</strong></span>
              <span>🤖 Agent: <strong style={{ color: 'var(--text)' }}>{result.righe_caricate.agent} righe</strong></span>
            </div>
          </div>
        )}

        {/* Bottone upload */}
        <button
          onClick={handleUpload}
          disabled={loading || !file || !matchName.trim()}
          style={{
            width: '100%', padding: '0.85rem',
            borderRadius: '8px', border: 'none',
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text)', textTransform: 'uppercase' }}>
            PARTITE NEL DATABASE
          </h2>
          <button
            onClick={loadPartite}
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
            Nessuna partita nel database
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['ID', 'Data', 'Casa', 'Ospite', ''].map(h => (
                  <th key={h} style={{
                    padding: '0.5rem', textAlign: 'left', color: 'var(--text-muted)',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partite.map((p) => (
                <tr key={p.match_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--primary)', background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                      {p.match_name}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)' }}>
                    {p.date ? new Date(p.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text)' }}>{p.homeTeam}</td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text)' }}>{p.awayTeam}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(p.match_name)}
                      disabled={deletingMatch === p.match_name}
                      style={{
                        padding: '0.3rem 0.7rem', borderRadius: '6px',
                        border: '1px solid rgba(255,23,68,0.3)', background: 'transparent',
                        color: deletingMatch === p.match_name ? 'var(--text-muted)' : 'var(--danger)',
                        cursor: deletingMatch === p.match_name ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem', fontFamily: 'var(--font-display)',
                        letterSpacing: '0.05em', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => { if (deletingMatch !== p.match_name) e.currentTarget.style.background = 'rgba(255,23,68,0.1)' }}
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
