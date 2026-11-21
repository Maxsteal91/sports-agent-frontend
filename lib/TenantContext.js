'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUser } from './auth'
import { fetchAPI } from './api'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const [tenant,               setTenantState]      = useState('')
  const [allTenants,           setAllTenants]        = useState([])
  const [categoria,            setCategoria]         = useState('eccellenza')
  const [categorieDisponibili, setCategorieDisponibili] = useState([])
  const [ready,                setReady]             = useState(false)
  // Visualizzazione dei tipi di evento (tag), gestita dall'admin: { event_type: {label, visibile, ordine} }
  const [tagConfig,            setTagConfig]         = useState({})

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

  // Carica la visualizzazione dei tag quando cambia il tenant (e su richiesta, dopo il salvataggio in admin)
  const ricaricaTag = useCallback(() => {
    if (!tenant) return
    fetchAPI(`/v2/analytics/${tenant}/tag_visualizzazione`)
      .then(data => setTagConfig(Object.fromEntries((data.config || []).map(c => [c.event_type, c]))))
      .catch(() => setTagConfig({}))
  }, [tenant])

  useEffect(() => {
    if (!tenant || !ready) return
    ricaricaTag()
  }, [tenant, ready, ricaricaTag])

  // Helper comuni per tutte le sezioni: tipo visibile? nome da mostrare? elenco filtrato e ordinato
  const tagVisibile = useCallback(et => tagConfig[et]?.visibile !== false, [tagConfig])
  const tagLabel    = useCallback(et => tagConfig[et]?.label || et, [tagConfig])
  const tagVisibili = useCallback(lista => (lista || [])
    .filter(et => tagConfig[et]?.visibile !== false)
    .sort((a, b) => (tagConfig[a]?.ordine ?? 9999) - (tagConfig[b]?.ordine ?? 9999)), [tagConfig])

  const setTenant = (t) => {
    setTenantState(t)
    try { localStorage.setItem('selected_tenant', t) } catch {}
  }

  return (
    <TenantContext.Provider value={{ tenant, setTenant, allTenants, categoria, setCategoria, categorieDisponibili, ready,
                                     tagConfig, ricaricaTag, tagVisibile, tagLabel, tagVisibili }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider')
  return ctx
}
