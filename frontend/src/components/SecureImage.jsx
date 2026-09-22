import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
// Las URLs firmadas caducan a los 5 min; se cachean hasta 4 min para no re-pedir en cada render.
const signedCache = new Map()

async function getSignedUrl(relPath) {
  const cached = signedCache.get(relPath)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE}/upload/sign?path=${encodeURIComponent(relPath)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('No se pudo firmar la imagen')
  const data = await res.json()
  const url = `${API_BASE}${data.url}`
  signedCache.set(relPath, { url, expiresAt: Date.now() + 4 * 60 * 1000 })
  return url
}

// Renderiza una <img> autenticada SIN poner el JWT en la query string:
// pide una URL firmada de corta duración al backend y usa esa.
export default function SecureImage({ src, ...props }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!src) {
      setUrl(null)
      return undefined
    }
    if (!src.startsWith('/uploads/')) {
      setUrl(src)
      return undefined
    }
    getSignedUrl(src)
      .then((u) => { if (!cancelled) setUrl(u) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src])

  if (!src || !url) return null
  return <img src={url} {...props} />
}