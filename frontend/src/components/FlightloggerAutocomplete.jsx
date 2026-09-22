import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { fetchApi } from '../lib/api'
import { useTranslation } from 'react-i18next'
import { useToast } from './Toast'

// Autocompletado de FlightLogger.
// Regla de peticiones: SOLO se llama a la API al pasar de 2 a 3 letras
// (se traen hasta 50 usuarios). Escribir la 4ª, 5ª... letra NO envía
// nuevas peticiones: la lista ya descargada se acota localmente con las
// letras escritas. Si quitas una letra vuelves a ver las coincidencias
// de ese trozo sin llamar a la API. Para hacer una petición nueva hay
// que borrar hasta menos de 3 letras y volver a escribir la tercera.
//
// El desplegable se renderiza con un portal a document.body y posición
// fija: así escapa del overflow del modal y su scroll interno siempre
// funciona aunque el input esté cerca del borde del popup.
const normalize = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const matchesQuery = (user, query) => {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  const fields = [user.nombre, user.apellidos, user.email].map(normalize)
  return tokens.every((token) =>
    fields.some((field) => field.includes(token))
  )
}

export default function FlightloggerAutocomplete({ campo, value, onValueChange, onSelect, disabled, placeholder, required, type = 'text', inputClassName = "input input-bordered w-full" }) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [results, setResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState(null)
  const prevLen = useRef(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const visible = value && value.length >= 3 ? results.filter((u) => matchesQuery(u, value)) : []

  // Posición del desplegable en coordenadas de viewport (para el portal).
  const updateBox = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    const OPEN_ABOVE = 160 // abrir hacia arriba si hay poco sitio debajo
    const flip = spaceBelow < OPEN_ABOVE && spaceAbove > spaceBelow
    const maxHeight = Math.floor((flip ? spaceAbove : spaceBelow) - 8)
    setBox({
      top: flip ? null : r.bottom + 4,
      bottom: flip ? window.innerHeight - r.top + 4 : null,
      left: r.left,
      width: r.width,
      maxHeight: Math.min(224, Math.max(maxHeight, 96)),
    })
  }, [])

  // Reposiciona al abrir y mientras esté abierto (scroll/resize).
  useEffect(() => {
    if (!open || visible.length === 0) return
    updateBox()
    window.addEventListener('scroll', updateBox, true)
    window.addEventListener('resize', updateBox)
    return () => {
      window.removeEventListener('scroll', updateBox, true)
      window.removeEventListener('resize', updateBox)
    }
  }, [open, visible.length, updateBox])

  useEffect(() => {
    const onDocMouseDown = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target)
      const inList = listRef.current && listRef.current.contains(e.target)
      if (!inContainer && !inList) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    const prev = prevLen.current
    prevLen.current = v.length
    onValueChange(v)

    if (v.length >= 3) {
      // Si acabamos de pasar de 2 a 3 letras -> petición a la API.
      if (v.length === 3 && prev < 3) {
        search(v.trim())
      } else if (prev < 3) {
        // De <3 a ≥4 solo puede llegar tecleando rápido la 4ª letra:
        // se pide con las 3 primeras para tener base que filtrar.
        search(v.trim().slice(0, 3))
      }
      // Si ya hay resultados y estamos en ≥3 letras, se acotan localmente.
      if (hasSearched || v.length > 3 || (v.length === 3 && prev >= 3)) {
        setOpen(true)
      }
    } else {
      setOpen(false)
    }
  }

  const search = async (q) => {
    setLoading(true)
    setHasSearched(false)
    try {
      const data = await fetchApi(`/flightlogger/search?q=${encodeURIComponent(q)}&campo=${campo}`)
      setResults(data || [])
      setHasSearched(true)
      setOpen(true)
    } catch (err) {
      setResults([])
      setHasSearched(true)
      setOpen(false)
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const select = (user) => {
    onSelect(user)
    setResults([])
    setHasSearched(false)
    setOpen(false)
  }

  const showEmpty = hasSearched && open && !loading && visible.length === 0

  const list = open && visible.length > 0 ? (
    <ul
      ref={listRef}
      className="fixed z-[1001] max-h-56 overflow-y-auto overscroll-contain rounded-lg bg-base-100 border border-base-300 shadow-xl list-none p-0 m-0"
      style={{
        top: box?.top ?? 'auto',
        bottom: box?.bottom ?? 'auto',
        left: box?.left ?? 0,
        width: box?.width ?? 'auto',
        maxHeight: typeof box?.maxHeight === 'number' ? box.maxHeight : 224,
      }}
    >
      {visible.map((u) => (
        <li key={u.flightlogger_id || u.email}>
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-base-200 transition-colors flex flex-col"
            onClick={() => select(u)}
          >
            <span className="font-medium text-sm">{u.nombre} {u.apellidos}</span>
            <span className="text-xs opacity-60">{u.email}</span>
          </button>
        </li>
      ))}
    </ul>
  ) : null

  const empty = showEmpty ? (
    <div
      ref={listRef}
      className="fixed z-[1001] rounded-lg bg-base-100 border border-base-300 shadow-xl px-3 py-2 text-xs opacity-60"
      style={{
        top: box?.top ?? 'auto',
        bottom: box?.bottom ?? 'auto',
        left: box?.left ?? 0,
        width: box?.width ?? 'auto',
      }}
    >
      {t('students.flightlogger_no_results')}
    </div>
  ) : null

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs" />
        )}
        <input
          ref={inputRef}
          type={type}
          className={inputClassName}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {(list || empty) && createPortal(list || empty, document.body)}
    </div>
  )
}