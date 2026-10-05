'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { getUser } from './auth'
import { fetchAPI } from './api'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const [tenant,     setTenantState] = useState('')
  const [allTenants, setAllTenants]  = useState([])
  const [ready,      setReady]       = useState(false)

  useEffect(() => {
    const u = getUser()
    if (!u) { setReady(true); return }

    if (u.role === 'admin') {
      fetchAPI('/upload/v2/tenants')
        .then(data => {
          const ts = data.tenants || []
          setAllTenants(ts)
          // Ripristina da localStorage, altrimenti primo della lista
          const saved = (() => { try { return localStorage.getItem('selected_tenant') } catch { return null } })()
          const initial = (saved && ts.includes(saved)) ? saved : ts[0] || ''
          setTenantState(initial)
        })
        .catch(() => setAllTenants([]))
        .finally(() => setReady(true))
    } else {
      // manager/viewer: tenant fisso dal JWT
      setTenantState(u.tenant || '')
      setAllTenants(u.tenant ? [u.tenant] : [])
      setReady(true)
    }
  }, [])

  const setTenant = (t) => {
    setTenantState(t)
    try { localStorage.setItem('selected_tenant', t) } catch {}
  }

  return (
    <TenantContext.Provider value={{ tenant, setTenant, allTenants, ready }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider')
  return ctx
}
