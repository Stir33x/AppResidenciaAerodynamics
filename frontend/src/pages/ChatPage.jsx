import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const POLL_TIMEOUT = 26000
const FIRST_FALLBACK = 2500

function timedSignal(parent, ms) {
  const timeout = AbortSignal.timeout(ms)
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([parent, timeout])
  return parent
}

export default function ChatPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { addToast } = useToast()

  const esGeneral = !!user && ['estudiante', 'invitado', 'staff', 'cocina', 'limpieza', 'direccion', 'administracion'].includes(user.rol)

  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)

  const [conversaciones, setConversaciones] = useState([])
  const [selected, setSelected] = useState(null)
  const [personas, setPersonas] = useState([])
  const [mostrarContactos, setMostrarContactos] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const endRef = useRef(null)

  // Lista de conversaciones: long-poll con token since
  useEffect(() => {
    if (!esGeneral) return
    let stopped = false
    let ctrl = null
    let since = 0

    const loop = async () => {
      if (stopped) return
      ctrl = new AbortController()
      try {
        const data = await fetchApi(`/chat/conversations?since=${since}`, {
          signal: timedSignal(ctrl.signal, POLL_TIMEOUT),
        })
        if (stopped) return
        if (data && Array.isArray(data.conversations)) {
          setConversaciones(data.conversations)
          since = data.max_id || since
          setSelected((prev) => prev || (data.conversations.length ? data.conversations[0].id : null))
          setCargando(false)
        }
      } catch {}
      if (!stopped) setTimeout(loop, 0)
    }

    loop()
    return () => {
      stopped = true
      if (ctrl) ctrl.abort()
    }
  }, [esGeneral])

  // Hilo de la conversación seleccionada (vista general): long-poll con cursor
  useEffect(() => {
    if (!esGeneral) return
    setMensajes([])
    setCargando(true)
    if (!selected) return
    let stopped = false
    let ctrl = null
    let cursor = 0
    const fallback = setTimeout(() => { if (!stopped) setCargando(false) }, FIRST_FALLBACK)

    const loop = async () => {
      if (stopped) return
      ctrl = new AbortController()
      try {
        const data = await fetchApi(`/chat/messages?conversation_id=${selected}&after=${cursor}`, {
          signal: timedSignal(ctrl.signal, POLL_TIMEOUT),
        })
        if (stopped) return
        if (data && Array.isArray(data.messages)) {
          setMensajes((prev) => {
            const nuevos = data.messages.filter((m) => !prev.some((x) => x.id === m.id))
            return [...prev, ...nuevos]
          })
          cursor = data.messages.reduce((mx, m) => Math.max(mx, m.id), 0)
          setCargando(false)
        }
      } catch {}
      if (!stopped) setTimeout(loop, 0)
    }

    loop()
    return () => {
      stopped = true
      clearTimeout(fallback)
      if (ctrl) ctrl.abort()
    }
  }, [esGeneral, selected])

  // Contactos (vista general): directorio de personas para iniciar un chat
  useEffect(() => {
    if (!esGeneral) return
    let active = true
    fetchApi('/chat/people')
      .then((data) => { if (active && Array.isArray(data)) setPersonas(data) })
      .catch(() => {})
    return () => { active = false }
  }, [esGeneral])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes.length])

  const iniciarChat = async (userId) => {
    try {
      const data = await fetchApi('/chat/start', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      })
      setMostrarContactos(false)
      setSelected(data.conversation_id)
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const send = async () => {
    const msg = texto.trim()
    if (!msg) return
    setEnviando(true)
    try {
      const body = { mensaje: msg }
      if (selected) body.conversation_id = selected
      await fetchApi('/chat', { method: 'POST', body: JSON.stringify(body) })
      setTexto('')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setEnviando(false)
    }
  }

  const conversacionActual = conversaciones.find((c) => c.id === selected)
  const tituloActual = esGeneral ? (conversacionActual?.otro?.nombre || '') + (conversacionActual?.otro ? ' ' + (conversacionActual.otro.apellidos || '') : '') : ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title mb-0">{esGeneral ? t('chat.title_general') : t('chat.title')}</h1>
        <p className="text-sm text-base-content/50 mt-1">{t('chat.subtitle')}</p>
      </div>

      <div className="border border-base-300 rounded-xl bg-base-100 overflow-hidden flex flex-col h-[calc(100svh-14rem)] min-h-96">
        <div className="flex flex-1 min-h-0">
          {esGeneral && (
            <div className="w-full sm:w-72 border-r border-base-300 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
                  {t('chat.conversations')}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setMostrarContactos((v) => !v)}
                  title={t('chat.new_chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="hidden sm:inline">{t('chat.new_chat')}</span>
                </button>
              </div>

              {mostrarContactos && (
                <div className="border-b border-base-300 max-h-52 overflow-y-auto bg-base-200/50">
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
                    {t('chat.contacts')}
                  </div>
                  {personas.length === 0 ? (
                    <div className="p-4 text-sm text-base-content/40 text-center">{t('chat.no_people')}</div>
                  ) : (
                    personas.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => iniciarChat(p.id)}
                        className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-base-300 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-base-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {p.nombre?.charAt(0)}{p.apellidos?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{p.nombre} {p.apellidos}</div>
                          <div className="text-[11px] text-base-content/50 truncate">
                            {t('roles.' + p.rol)}{p.habitacion ? ' · ' + p.habitacion : ''}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="px-3 pb-2 border-b border-base-300">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={t('chat.search_placeholder')}
                  className="input input-bordered input-sm w-full"
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const q = busqueda.trim().toLowerCase()
                  const filtradas = q
                    ? conversaciones.filter((c) =>
                        [c.otro?.nombre, c.otro?.apellidos, c.otro?.habitacion, c.ultimo]
                          .filter(Boolean).join(' ').toLowerCase().includes(q)
                      )
                    : conversaciones
                  if (filtradas.length === 0) {
                    return (
                      <div className="p-4 text-sm text-base-content/40 text-center">
                        {conversaciones.length === 0 ? t('chat.no_conversations') : t('chat.search_empty')}
                      </div>
                    )
                  }
                  return filtradas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c.id)}
                      className={`w-full text-left px-4 py-3 border-b border-base-200 flex items-start gap-3 transition-colors ${
                        selected === c.id ? 'bg-primary/10' : 'hover:bg-base-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {c.otro?.nombre?.charAt(0)}{c.otro?.apellidos?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {`${c.otro?.nombre} ${c.otro?.apellidos}`}
                          </span>
                          {c.tipo === 'equipo' && (
                            <span className="badge badge-soft badge-info badge-xs shrink-0">{t('chat.team_label')}</span>
                          )}
                          {c.no_leidas > 0 && (
                            <span className="badge badge-error badge-xs shrink-0">{c.no_leidas}</span>
                          )}
                        </div>
                        <div className="text-xs text-base-content/50 truncate">
                          {c.otro?.habitacion && <span className="font-mono">{c.otro.habitacion}</span>}
                          {(c.otro?.habitacion) && ' · '}
                          {c.otro?.rol ? t('roles.' + c.otro.rol) : ''}
                          {c.ultimo ? ' · ' + c.ultimo : ''}
                        </div>
                      </div>
                    </button>
                  ))
                })()}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            {esGeneral && !selected ? (
              <div className="flex-1 flex items-center justify-center text-sm text-base-content/40 p-6 text-center">
                {t('chat.select_conversation')}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-base-300 text-sm font-medium flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    {conversacionActual?.tipo === 'equipo' && (
                      <span className="badge badge-soft badge-info badge-xs shrink-0">{t('chat.team_label')}</span>
                    )}
                    <span className="truncate">
                      {esGeneral ? (tituloActual || t('chat.thread_title')) : t('chat.thread_title')}
                    </span>
                  </span>
                  <span className="badge badge-ghost badge-xs">{t('chat.live_poll')}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {cargando ? (
                    <div className="flex justify-center p-6">
                      <span className="loading loading-spinner loading-md text-primary" />
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="text-center text-sm text-base-content/40 py-8">{t('chat.empty')}</div>
                  ) : (
                    mensajes.map((m) => {
                      const mio = m.sender_id === user?.id
                      return (
                        <div key={m.id} className={`chat ${mio ? 'chat-end' : 'chat-start'}`}>
                          <div className="chat-header text-[11px] text-base-content/50 mb-0.5 flex items-center gap-1">
                            <span>{mio ? t('chat.you') : `${m.nombre} ${m.apellidos}`}</span>
                            <span className="font-mono text-[10px]">
                              {new Date(m.created_at).toLocaleString(i18n.language, {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className={`chat-bubble text-sm whitespace-pre-wrap ${mio ? 'chat-bubble-primary' : ''}`}>
                            {m.mensaje}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={endRef} />
                </div>

                <div className="p-3 border-t border-base-300 flex items-center gap-2">
                  <input
                    type="text"
                    value={texto}
                    placeholder={t('chat.write_placeholder')}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                    disabled={enviando}
                    className="input input-bordered input-sm flex-1 min-w-0"
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={send}
                    disabled={enviando || !texto.trim() || (esGeneral && !selected)}
                  >
                    {enviando && <span className="loading loading-spinner loading-xs" />}
                    {t('chat.send')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}