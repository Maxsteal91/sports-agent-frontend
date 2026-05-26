'use client'
import { useState, useRef, useEffect } from 'react'
import { postAPI } from '../../lib/api'

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ciao! Sono il tuo analista sportivo AI. Chiedimi qualsiasi cosa sulle partite del Mazzola — statistiche, eventi, confronti tra squadre.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await postAPI('/chat/ask', { question, session_id: sessionId })
      setSessionId(res.session_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Errore nella risposta. Riprova.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const SUGGERIMENTI = [
    'Quanti tiri ha fatto il Mazzola contro il Certaldo?',
    'Qual è la partita con più eventi?',
    'Confronta i passaggi nelle varie partite',
    'Quante occasioni goal ha avuto il Mazzola in totale?',
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
          AI ANALYST
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Fai domande in italiano sui dati delle partite
        </p>
      </div>

      {/* Messaggi */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '1rem',
        paddingRight: '0.5rem'
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '75%',
              padding: '0.85rem 1.1rem',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'rgba(0,229,255,0.12)' : 'var(--bg-card)',
              border: `1px solid ${m.role === 'user' ? 'rgba(0,229,255,0.3)' : 'var(--border)'}`,
              color: 'var(--text)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {m.role === 'assistant' && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--primary)', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>
                  AI ANALYST
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '0.85rem 1.1rem',
              borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.9rem'
            }}>
              <span style={{ animation: 'pulse 1s infinite' }}>Analisi in corso...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggerimenti */}
      {messages.length === 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', flexShrink: 0 }}>
          {SUGGERIMENTI.map((s, i) => (
            <button
              key={i}
              onClick={() => { setInput(s); }}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexShrink: 0,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '0.75rem',
        alignItems: 'flex-end'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Fai una domanda sui dati delle partite..."
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: '0.9rem',
            resize: 'none',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.5,
            maxHeight: '120px',
            overflowY: 'auto'
          }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: loading || !input.trim() ? 'rgba(0,229,255,0.2)' : 'var(--primary)',
            color: loading || !input.trim() ? 'var(--text-muted)' : '#0A0E1A',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-display)',
            fontSize: '0.9rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          INVIA
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
