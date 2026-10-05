'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { getUser } from './auth'
import { fetchAPI } from './api'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const [tenant,               setTenantState]      = useState('')
  const [allTenants,           setAllTenants]        = useState([])
  const [categoria,            setCategoria]         = useState(null)
  const [categorieDisponibili, setCategorieDisponibili] = useState([])
  const [ready,                setReady]             = useState(false)

  useEffect(() => {
    const u = getUser()
    if (!u) { setReady(true); return }

    if (u.role === 'admin') {
      fetchAPI('/upload/v2/tenants')
        .then(data => {
          const ts = data.tenants || []
          setAllTenants(ts)
          const saved = (() => { try { return localStorage.getItem('selected_tenant') } catch { return null } })()
          const initial = (saved && ts.includes(saved))
            ? saved
            : ts.includes('mazzola_2026') ? 'mazzola_2026' : ts[0] || ''
          setTenantState(initial)
        })
        .catch(() => setAllTenants([]))
        .finally(() => setReady(true))
    } else {
      // manager/viewer: tenant fisso dal JWT
      setTenantState(u.tenant || '')
      setAllTenants(u.tenant ? [u.tenant] : [])
      // viewer: categoria fissa dal JWT
      if (u.role === 'viewer' && u.categoria) {
        setCategoria(u.categoria)
        setCategorieDisponibili([u.categoria])
      }
      setReady(true)
    }
  }, [])

  // Carica categorie quando cambia il tenant (solo se non viewer con categoria fissa)
  useEffect(() => {
    if (!tenant || !ready) return
    const u = getUser()
    if (u?.role === 'viewer' && u?.categoria) return
    fetchAPI(`/upload/v2/categorie?tenant=${tenant}`)
      .then(data => {
        const cats = data.categorie || []
        setCategorieDisponibili(cats)
        // Mantieni la categoria selezionata se ancora valida, altrimenti reset
        setCategoria(prev => (prev && cats.includes(prev)) ? prev : null)
      })
      .catch(() => setCategorieDisponibili([]))
  }, [tenant, ready])

  const setTenant = (t) => {
    setTenantState(t)
    try { localStorage.setItem('selected_tenant', t) } catch {}
  }

  return (
    <TenantContext.Provider value={{ tenant, setTenant, allTenants, categoria, setCategoria, categorieDisponibili, ready }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider')
  return ctx
}
