'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAPI, postAPI, putAPI, deleteAPI } from '../../lib/api'
import { getUser } from '../../lib/auth'

const TENANTS = ['mazzola', 'sangiovannese']
const CATEGORIE = ['prima', 'u21', 'u19', 'u17', 'u16', 'u15']
const RUOLI = ['admin', 'manager', 'viewer']

const T = {
  bg: '#0A0E1A', card: '#111827', primary: '#00E5FF',
  accent: '#FF6B35', border: 'rgba(255,255,255,0.08)',
  muted: '#64748B', text: '#F1F5F9', success: '#10B981', danger: '#EF4444',
}

const badge = (role) => {
  const colors = { admin: '#FF6B35', manager: '#00E5FF', viewer: '#94A3B8' }
  return (
    <span style={{
      background: `${colors[role]}22`, color: colors[role],
      border: `1px solid ${colors[role]}44`,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>{role}</span>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ email:'', password:'', role:'viewer', tenant:'', categoria:'' })
  const [error, setError] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState('')

  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== 'admin') { router.push('/'); return }
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await fetchAPI('/auth/users')
      setUsers(data)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditUser(null)
    setForm({ email:'', password:'', role:'viewer', tenant:'', categoria:'' })
    setError('')
    setShowForm(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ email: u.email, password:'', role: u.role, tenant: u.tenant||'', categoria: u.categoria||'' })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setError(''); setSaving(true)
    try {
      if (editUser) {
        const body = { role: form.role, tenant: form.tenant||null, categoria: form.categoria||null }
        if (form.password) body.password = form.password
        await putAPI(`/auth/users/${editUser.id}`, body)
      } else {
        await postAPI('/auth/users', {
          email: form.email, password: form.password,
          role: form.role,
          tenant: form.tenant || null,
          categoria: form.categoria || null,
        })
      }
      setShowForm(false)
      await loadUsers()
      setToast(editUser ? 'Utente aggiornato' : 'Utente creato')
      setTimeout(() => setToast(''), 3000)
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const toggleAttivo = async (u) => {
    try {
      await putAPI(`/auth/users/${u.id}`, { attivo: !u.attivo })
      await loadUsers()
      setToast(u.attivo ? 'Utente disattivato' : 'Utente attivato')
      setTimeout(() => setToast(''), 3000)
    } catch(e) { setError(e.message) }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Eliminare ${u.email}?`)) return
    try {
      await deleteAPI(`/auth/users/${u.id}`)
      await loadUsers()
      setToast('Utente eliminato')
      setTimeout(() => setToast(''), 3000)
    } catch(e) { setError(e.message) }
  }

  const inputStyle = {
    width:'100%', padding:'0.6rem 0.9rem', borderRadius:8,
    background:'rgba(255,255,255,0.05)', border:`1px solid ${T.border}`,
    color:T.text, fontSize:'0.9rem', outline:'none', boxSizing:'border-box',
  }
  const selectStyle = { ...inputStyle }

  return (
    <div style={{ padding:'2rem', maxWidth:1000, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:700,
            color:T.primary, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Gestione Utenti
          </h1>
          <p style={{ color:T.muted, fontSize:'0.85rem', marginTop:4 }}>
            {users.length} utenti registrati
          </p>
        </div>
        <button onClick={openCreate} style={{
          padding:'0.6rem 1.4rem', borderRadius:8, background:T.primary,
          border:'none', color:'#0A0E1A', fontFamily:'var(--font-display)',
          fontSize:'0.9rem', fontWeight:700, letterSpacing:'0.06em',
          textTransform:'uppercase', cursor:'pointer',
        }}>
          + Nuovo Utente
        </button>
      </div>

      {error && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
          borderRadius:8, padding:'0.75rem', color:T.danger, fontSize:'0.85rem', marginBottom:'1rem' }}>
          {error}
        </div>
      )}

      {/* Tabella utenti */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {['Email','Ruolo','Tenant','Categoria','Stato','Azioni'].map(h => (
                <th key={h} style={{ padding:'0.85rem 1rem', textAlign:'left',
                  fontFamily:'var(--font-display)', fontSize:11, color:T.muted,
                  letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:T.muted }}>Caricamento...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom:`1px solid ${T.border}`, opacity: u.attivo ? 1 : 0.5 }}>
                <td style={{ padding:'0.85rem 1rem', color:T.text, fontSize:'0.9rem' }}>{u.email}</td>
                <td style={{ padding:'0.85rem 1rem' }}>{badge(u.role)}</td>
                <td style={{ padding:'0.85rem 1rem', color:T.muted, fontSize:'0.85rem' }}>
                  {u.tenant || <span style={{color:'#334155'}}>tutti</span>}
                </td>
                <td style={{ padding:'0.85rem 1rem', color:T.muted, fontSize:'0.85rem' }}>
                  {u.categoria || <span style={{color:'#334155'}}>tutte</span>}
                </td>
                <td style={{ padding:'0.85rem 1rem' }}>
                  <span style={{
                    background: u.attivo ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                    color: u.attivo ? T.success : T.muted,
                    border: `1px solid ${u.attivo ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}`,
                    borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:600,
                  }}>
                    {u.attivo ? 'Attivo' : 'Disattivato'}
                  </span>
                </td>
                <td style={{ padding:'0.85rem 1rem' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => openEdit(u)} style={{
                      padding:'4px 12px', borderRadius:6, border:`1px solid ${T.border}`,
                      background:'transparent', color:T.text, fontSize:12, cursor:'pointer',
                    }}>Modifica</button>
                    <button onClick={() => toggleAttivo(u)} style={{
                      padding:'4px 12px', borderRadius:6,
                      border:`1px solid ${u.attivo ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                      background:'transparent',
                      color: u.attivo ? T.danger : T.success,
                      fontSize:12, cursor:'pointer',
                    }}>{u.attivo ? 'Disattiva' : 'Attiva'}</button>
                    <button onClick={() => handleDelete(u)} style={{
                      padding:'4px 12px', borderRadius:6,
                      border:'1px solid rgba(239,68,68,0.3)',
                      background:'transparent', color:T.danger, fontSize:12, cursor:'pointer',
                    }}>Elimina</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:200,
        }}>
          <div style={{
            background:T.card, border:`1px solid ${T.border}`, borderRadius:16,
            padding:'2rem', width:'100%', maxWidth:460,
            boxShadow:'0 8px 40px rgba(0,0,0,0.5)',
          }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:700,
              color:T.primary, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'1.5rem' }}>
              {editUser ? 'Modifica Utente' : 'Nuovo Utente'}
            </h2>

            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {!editUser && (
                <div>
                  <label style={{ fontSize:11, color:T.muted, letterSpacing:'0.08em',
                    textTransform:'uppercase', display:'block', marginBottom:6 }}>Email</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm({...form, email:e.target.value})}
                    style={inputStyle} placeholder="utente@email.it"/>
                </div>
              )}

              <div>
                <label style={{ fontSize:11, color:T.muted, letterSpacing:'0.08em',
                  textTransform:'uppercase', display:'block', marginBottom:6 }}>
                  {editUser ? 'Nuova Password (lascia vuoto per non cambiare)' : 'Password'}
                </label>
                <input type="password" value={form.password}
                  onChange={e => setForm({...form, password:e.target.value})}
                  style={inputStyle} placeholder="••••••••"/>
              </div>

              <div>
                <label style={{ fontSize:11, color:T.muted, letterSpacing:'0.08em',
                  textTransform:'uppercase', display:'block', marginBottom:6 }}>Ruolo</label>
                <select value={form.role} onChange={e => setForm({...form, role:e.target.value})} style={selectStyle}>
                  {RUOLI.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize:11, color:T.muted, letterSpacing:'0.08em',
                  textTransform:'uppercase', display:'block', marginBottom:6 }}>
                  Tenant <span style={{color:'#334155'}}>(vuoto = tutti)</span>
                </label>
                <select value={form.tenant} onChange={e => setForm({...form, tenant:e.target.value})} style={selectStyle}>
                  <option value="">— tutti —</option>
                  {TENANTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize:11, color:T.muted, letterSpacing:'0.08em',
                  textTransform:'uppercase', display:'block', marginBottom:6 }}>
                  Categoria <span style={{color:'#334155'}}>(vuoto = tutte)</span>
                </label>
                <select value={form.categoria} onChange={e => setForm({...form, categoria:e.target.value})} style={selectStyle}>
                  <option value="">— tutte —</option>
                  {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
                  borderRadius:8, padding:'0.75rem', color:T.danger, fontSize:'0.85rem' }}>
                  {error}
                </div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={handleSave} disabled={saving} style={{
                  flex:1, padding:'0.75rem', borderRadius:8, background:T.primary,
                  border:'none', color:'#0A0E1A', fontFamily:'var(--font-display)',
                  fontSize:'0.9rem', fontWeight:700, letterSpacing:'0.06em',
                  textTransform:'uppercase', cursor:saving?'not-allowed':'pointer',
                }}>
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
                <button onClick={() => setShowForm(false)} style={{
                  flex:1, padding:'0.75rem', borderRadius:8, background:'transparent',
                  border:`1px solid ${T.border}`, color:T.muted,
                  fontFamily:'var(--font-display)', fontSize:'0.9rem', fontWeight:600,
                  cursor:'pointer',
                }}>
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast notifica */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: '#10B981', color: '#fff',
          padding: '0.75rem 1.5rem', borderRadius: 8,
          fontFamily: 'var(--font-display)', fontSize: 13,
          fontWeight: 600, letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
          zIndex: 300, transition: 'all 0.3s',
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
