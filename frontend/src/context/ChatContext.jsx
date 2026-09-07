import { createContext, useContext, useEffect, useState } from 'react'
import { fetchApi } from '../lib/api'
import { useAuth } from './AuthContext'

export const CHAT_ROLES = ['estudiante', 'invitado', 'staff', 'cocina', 'limpieza', 'direccion', 'administracion']

const POLL_TIMEOUT = 26000

const ChatContext = createContext(null)

function timedSignal(parent, ms) {
  const timeout = AbortSignal.timeout(ms)
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([parent, timeout])
  return parent
}

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const hasChat = !!user && CHAT_ROLES.includes(user.rol)
  const [noLeidas, setNoLeidas] = useState(0)

  // Long-poll GLOBAL: se mantiene mientras el usuario navega por toda la web.
  // Cuando llega un mensaje nuevo (o se marca como leído) el servidor responde
  // y lanzamos otra petición; así el badge de la barra lateral se actualiza al instante.
  useEffect(() => {
    if (!hasChat) {
      setNoLeidas(0)
      return
    }
    let stopped = false
    let ctrl = null
    let since = 0

    const loop = async () => {
      if (stopped) return
      ctrl = new AbortController()
      try {
        const data = await fetchApi(`/chat/unread?since=${since}`, {
          signal: timedSignal(ctrl.signal, POLL_TIMEOUT),
        })
        if (stopped) return
        if (data && typeof data.no_leidas === 'number') {
          setNoLeidas(data.no_leidas)
          since = data.max_id || since
        }
      } catch {}
      if (!stopped) setTimeout(loop, 0)
    }

    loop()
    return () => {
      stopped = true
      if (ctrl) ctrl.abort()
    }
  }, [hasChat])

  return <ChatContext.Provider value={{ noLeidas, hasChat }}>{children}</ChatContext.Provider>
}

export const useChat = () => useContext(ChatContext)