// lib/api.js
import { getToken, clearAuth } from './auth'

async function handleResponse(res) {
  if (res.status === 401) {
    clearAuth()
    // Mostra messaggio prima del redirect
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_message', 'Sessione scaduta. Effettua nuovamente il login.')
      window.location.href = '/login'
    }
    throw new Error('Non autorizzato')
  }
  if (res.status === 403) {
    throw new Error('Non hai i permessi per accedere a questa risorsa')
  }
  if (!res.ok) throw new Error(`Errore server: ${res.status}`)
  return res.json()
}

function authHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

export async function fetchAPI(endpoint) {
  const res = await fetch(`/api${endpoint}`, {
    headers: authHeaders()
  })
  return handleResponse(res)
}

export async function postAPI(endpoint, body) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  })
  return handleResponse(res)
}

export async function putAPI(endpoint, body) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body)
  })
  return handleResponse(res)
}

export async function deleteAPI(endpoint) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  return handleResponse(res)
}

export async function loginAPI(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Errore di login')
  }
  return res.json()
}
