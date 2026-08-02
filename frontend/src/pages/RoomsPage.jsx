import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import RoomMap, { FLOOR_PLAN, WarningIcon } from '../components/RoomMap'

// ---------------------------------------------------------------------------
// ESTADO DE UNA HABITACIÓN
// ---------------------------------------------------------------------------
function getRoomStatus(room) {
  if (!room) return 'vacio'
  if (room.estado === 'libre' || room.estado === 'ocupado' || room.estado === 'limpieza') {
    return room.estado
  }
  return room.occupied ? 'ocupado' : 'libre'
}

function hasIncidencia(room) {
  return Boolean(room?.incidencia ?? room?.has_incident)
}

// ---------------------------------------------------------------------------
// DATOS DEL OCUPANTE (huésped o alumno)
// ---------------------------------------------------------------------------
function getOccupant(room) {
  if (!room) return null
  const name = room.occupant_name || room.occupied_by || room.guest_name || room.student_name || null
  if (!name) return null

  let type = room.occupant_type
  if (!type) {
    if (room.is_student || room.alumno) type = 'alumno'
    else type = 'huesped'
  }

  return {
    name,
    type, // 'alumno' | 'huesped'
    checkin: room.checkin_date || room.occupied_since || null,
    checkout: room.checkout_date || room.occupied_until || null,
    phone: room.occupant_phone || room.phone || null,
    email: room.occupant_email || null,
    notes: room.occupant_notes || null,
  }
}

const OCCUPANT_TYPE_LABEL = { alumno: 'Alumno/a', huesped: 'Huésped' }

const STATUS_STYLES = {
  libre: 'bg-success text-success-content border-success',
  ocupado: 'bg-info text-info-content border-info',
  limpieza: 'bg-warning text-warning-content border-warning',
  vacio: 'bg-base-200 text-base-content/40 border-base-300 border-dashed',
}

// ---------------------------------------------------------------------------
// LEYENDA
// ---------------------------------------------------------------------------
function Legend() {
  const items = [
    { color: 'bg-success', label: 'Libre' },
    { color: 'bg-info', label: 'Ocupado' },
    { color: 'bg-warning', label: 'Limpieza' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className={`w-4 h-4 rounded ${it.color}`} />
          {it.label}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="bg-error text-error-content rounded-full p-1">
          <WarningIcon className="w-3 h-3" />
        </span>
        Incidencia
      </div>
      <div className="flex items-center gap-2 opacity-60">
        <span className="w-4 h-4 rounded border-2 border-base-300 bg-base-200/70" />
        Escaleras / Recepción
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------
export default function RoomsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canDelete = user?.rol === 'direccion'
  const [rooms, setRooms] = useState([])
  const [newRoom, setNewRoom] = useState('')
  const [error, setError] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const dialogRef = useRef(null)

  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES') : '-')

  const load = async () => {
    const data = await fetchApi('/rooms')
    setRooms(data)
  }

  useEffect(() => {
    ;(async () => {
      await load()
    })()
  }, [])

  // Mapa numero de habitacion -> habitacion, para pintar el plano.
  const roomsByNumber = useMemo(() => {
    const map = {}
    for (const r of rooms) {
      const n = parseInt(String(r.nombre).trim(), 10)
      if (!Number.isNaN(n)) map[n] = r
    }
    return map
  }, [rooms])

  // Habitaciones dadas de alta que no aparecen en el plano.
  const planNumbers = useMemo(() => {
    const set = new Set()
    FLOOR_PLAN.forEach((b) =>
      b.floors.forEach((f) =>
        f.gates.forEach((g) =>
          g.rows.forEach((row) => {
            row.forEach((item) => {
              if (typeof item === 'number') set.add(item)
            })
          })
        )
      )
    )
    return set
  }, [])
  const roomsOutsidePlan = rooms.filter((r) => {
    const n = parseInt(String(r.nombre).trim(), 10)
    return Number.isNaN(n) || !planNumbers.has(n)
  })

  const addRoom = async (e) => {
    e.preventDefault()
    setError('')
    if (!newRoom.trim()) return
    try {
      await fetchApi('/rooms', { method: 'POST', body: JSON.stringify({ nombre: newRoom.trim() }) })
      setNewRoom('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteRoom = async (id) => {
    try {
      await fetchApi(`/rooms/${id}`, { method: 'DELETE' })
      setSelectedRoom(null)
      dialogRef.current?.close()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openRoom = (room) => {
    setSelectedRoom(room)
    dialogRef.current?.showModal()
  }

  const occupant = getOccupant(selectedRoom)
  const cleaningHoy = Boolean(selectedRoom?.limpieza_hoy ?? selectedRoom?.estado === 'limpieza')
  const cleaningCompletada = Boolean(selectedRoom?.limpieza_completada)

  const tileClass = (room, n) => {
    if (!room) return 'bg-base-200 border-base-300 text-base-content/40 border-dashed'
    return STATUS_STYLES[getRoomStatus(room)]
  }

  const tileBadge = (room, n) => {
    if (!room) return null
    if (hasIncidencia(room)) {
      return (
        <span className="absolute -top-2 -right-2 bg-error text-error-content rounded-full p-1 shadow">
          <WarningIcon />
        </span>
      )
    }
    return null
  }

  const tileTitle = (room, n) => {
    if (!room) return `Habitación ${String(n).padStart(2, '0')} · sin datos`
    return `Habitación ${String(n).padStart(2, '0')} · ${getRoomStatus(room)}`
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">{t('rooms.title')}</h1>

      <div className="card bg-base-100 border shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={addRoom} className="join w-full max-w-md">
            <input
              className="input input-bordered join-item flex-1"
              placeholder={t('rooms.name_placeholder')}
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
            />
            <button type="submit" className="btn btn-primary join-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('rooms.add')}
            </button>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend />
        <span className="text-sm opacity-60">{t('rooms.count', { n: rooms.length })}</span>
      </div>

      {/* MAPA DEL HOTEL */}
      <RoomMap
        roomsByNumber={roomsByNumber}
        onClick={openRoom}
        getTileClass={tileClass}
        getBadge={tileBadge}
        getTitle={tileTitle}
      />

      {rooms.length === 0 && (
        <p className="text-center opacity-60 py-8">{t('rooms.empty')}</p>
      )}

      {roomsOutsidePlan.length > 0 && (
        <div className="card bg-base-100 border shadow-sm">
          <div className="card-body p-4 gap-3">
            <h2 className="text-sm font-semibold opacity-60">Otras habitaciones (fuera del plano)</h2>
            <div className="flex gap-2 flex-wrap">
              {roomsOutsidePlan.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openRoom(r)}
                  title={`Habitación ${r.nombre}`}
                  className={`relative ${'w-14 h-14 sm:w-16 sm:h-16'} rounded-lg border-2 flex flex-col items-center justify-center
                    font-bold text-sm sm:text-base transition-transform shrink-0
                    ${tileClass(r)} hover:scale-105 hover:shadow-md cursor-pointer`}
                >
                  {String(r.nombre).padStart(2, '0')}
                  {tileBadge(r)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE / DATOS DEL OCUPANTE */}
      <dialog ref={dialogRef} className="modal" onClose={() => setSelectedRoom(null)}>
        <div className="modal-box max-w-sm">
          {selectedRoom && (
            <>
              <h3 className="font-bold text-lg flex items-center gap-2">
                {t('rooms.title')} {selectedRoom.nombre}
                {hasIncidencia(selectedRoom) && (
                  <span className="badge badge-error gap-1">
                    <WarningIcon className="w-3 h-3" /> Incidencia
                  </span>
                )}
                {cleaningHoy && (
                  <span className={`badge gap-1 ${cleaningCompletada ? 'badge-success' : 'badge-warning'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.12a3 3 0 0 0-5.78 1.63 12 12 0 0 1-1.69-4.05 3 3 0 1 0 4.33-3.43 11.9 11.9 0 0 1 2.42 2.61c.08.9.22 1.78.72 3.24Z M9.53 16.12c2.02 2.33 4.61 4.18 7.36 5.5A6 6 0 0 0 22 15.9c.16-2.2-1.23-4.19-3.25-4.87a.98.98 0 0 0-1.25.62l-.4 1.04a10.6 10.6 0 0 1-5.17-5.6l1.04-.4a.98.98 0 0 0 .62-1.25A4.3 4.3 0 0 0 9.5 1.3a6 6 0 0 0-4.75 7.02l1.15-.13a10 10 0 0 1 2.42 2.61c.08.9.22 1.78.72 3.24Z" />
                    </svg>
                    {cleaningCompletada ? 'Limpieza completada' : 'Limpieza hoy'}
                  </span>
                )}
              </h3>

              {/* Datos del ocupante: huésped o alumno */}
              {occupant ? (
                <div className="mt-3">
                  <div className="bg-base-200 rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{occupant.name}</span>
                      <span className={`badge badge-sm ${occupant.type === 'alumno' ? 'badge-secondary' : 'badge-info'}`}>
                        {OCCUPANT_TYPE_LABEL[occupant.type] || 'Huésped'}
                      </span>
                    </div>
                    <div className="text-sm opacity-70 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {occupant.phone && (
                        <div className="col-span-2">
                          Teléfono: <strong>{occupant.phone}</strong>
                        </div>
                      )}
                      {occupant.email && (
                        <div className="col-span-2">
                          Email: <strong>{occupant.email}</strong>
                        </div>
                      )}
                      {occupant.checkin && (
                        <div>
                          Entrada: <strong>{fmt(occupant.checkin)}</strong>
                        </div>
                      )}
                      {occupant.checkout && (
                        <div>
                          Salida: <strong>{fmt(occupant.checkout)}</strong>
                        </div>
                      )}
                    </div>
                    {occupant.notes && <div className="text-sm opacity-70 mt-1">{occupant.notes}</div>}
                  </div>
                </div>
              ) : getRoomStatus(selectedRoom) === 'ocupado' ? (
                <div className="mt-3">
                  <div className="alert alert-soft text-sm py-2">
                    Marcada como ocupada, pero no hay datos de quién está en la habitación.
                  </div>
                </div>
              ) : null}

              {/* Limpieza de hoy */}
              {cleaningHoy && !occupant && (
                <div className="mt-2">
                  <div className={`alert alert-soft text-sm py-2 ${cleaningCompletada ? '' : 'alert-warning'}`}>
                    {cleaningCompletada ? 'Limpieza completada hoy.' : 'Pendiente de limpieza hoy.'}
                  </div>
                </div>
              )}
              {!cleaningHoy && !occupant && getRoomStatus(selectedRoom) !== 'ocupado' && (
                <div className="mt-3">
                  <div className="alert alert-soft text-sm py-2">Habitación libre.</div>
                </div>
              )}

              <div className="text-sm opacity-60 mt-2">
                {t('rooms.next_available')}: <strong>{fmt(selectedRoom.next_available_date)}</strong>
              </div>

              <div className="modal-action">
                {canDelete && (
                  <button className="btn btn-soft btn-error btn-sm" onClick={() => deleteRoom(selectedRoom.id)}>
                    {t('rooms.delete')}
                  </button>
                )}
                <form method="dialog">
                  <button className="btn btn-sm">Cerrar</button>
                </form>
              </div>
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  )
}
