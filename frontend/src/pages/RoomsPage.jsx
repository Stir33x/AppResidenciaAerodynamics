import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import FlightloggerAutocomplete from '../components/FlightloggerAutocomplete'
import RoomMap, { FLOOR_PLAN, WarningIcon, ROOM_CATEGORY, ROOM_CATEGORY_LABEL } from '../components/RoomMap'

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
  const { addToast } = useToast()
  const canDelete = user?.rol === 'direccion'
  const canRegister = ['direccion', 'administracion'].includes(user?.rol)
  const [rooms, setRooms] = useState([])
  const [newRoom, setNewRoom] = useState('')
  const [error, setError] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const dialogRef = useRef(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [studentRoom, setStudentRoom] = useState(null)
  const [saving, setSaving] = useState(false)
  const [courses, setCourses] = useState([])
  const [sform, setSform] = useState({ email: '', password: '', nombre: '', apellidos: '', telefono: '', habitacion: '', fecha_entrada: '', fecha_salida_prevista: '', cuota_mensual: '', facturar_cada: '1', tipo_tarifa: 'cantidad', cursos: [], flightlogger_id: '' })

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

  const openStudentModal = async (room) => {
    setStudentRoom(room)
    dialogRef.current?.close()
    const hoy = new Date()
    const getDateStr = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dia = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dia}`
    }
    let entrada = getDateStr(hoy)
    // Si la habitación está ocupada y tiene fecha de salida,
    // la entrada del nuevo alumno se fija para el día siguiente.
    if (room.checkout_date) {
      const salida = new Date(`${room.checkout_date}T00:00:00`)
      salida.setDate(salida.getDate() + 1)
      entrada = getDateStr(salida)
    }
    setSform((prev) => ({ ...prev, habitacion: room.nombre, fecha_entrada: entrada, fecha_salida_prevista: '' }))
    setSaving(false)
    try {
      const data = await fetchApi('/cursos')
      setCourses(data)
    } catch {
      setCourses([])
    }
    setShowStudentModal(true)
  }

  const handleFlightloggerSelect = (user) => {
    setSform((prev) => ({
      ...prev,
      nombre: user.nombre || prev.nombre,
      apellidos: user.apellidos || prev.apellidos,
      email: user.email || prev.email,
      telefono: user.telefono || prev.telefono,
      flightlogger_id: user.flightlogger_id,
    }))
    addToast(t('students.flightlogger_filled'), 'success')
  }

  const handleStudentSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetchApi('/students', {
        method: 'POST',
        body: JSON.stringify(sform),
      })
      setShowStudentModal(false)
      load()
      addToast(t('students.register') + ' ✓', 'success')
    } catch (err) {
      addToast(err.message, 'error')
      setSaving(false)
    }
  }

  const toggleCurso = (cursoId) => {
    setSform((prev) => {
      const has = prev.cursos.includes(cursoId)
      return { ...prev, cursos: has ? prev.cursos.filter((c) => c !== cursoId) : [...prev.cursos, cursoId] }
    })
  }

  const occupant = getOccupant(selectedRoom)
  const cleaningHoy = Boolean(selectedRoom?.limpieza_hoy ?? selectedRoom?.estado === 'limpieza')
  const cleaningCompletada = Boolean(selectedRoom?.limpieza_completada)

  // ---------------------------------------------------------------------------
  // PRÓXIMAS HABITACIONES LIBRES (por categoría: normal / terraza / superior / ...)
  // ---------------------------------------------------------------------------
  const ROOM_CATS = [
    { key: 'todas', label: 'Todas' },
    { key: 'estandar', label: 'Estándar' },
    { key: 'estandar_terraza', label: 'Estándar con terraza' },
    { key: 'superior', label: 'Superior' },
    { key: 'superior_terraza', label: 'Superior con terraza' },
  ]
  const [nextCat, setNextCat] = useState('todas')

  const roomsWithCategory = useMemo(
    () =>
      rooms
        .map((r) => {
          const n = parseInt(String(r.nombre).trim(), 10)
          return Number.isNaN(n) ? null : { room: r, n, cat: ROOM_CATEGORY(n) }
        })
        .filter(Boolean),
    [rooms]
  )

  const nextRooms = useMemo(() => {
    const occupied = roomsWithCategory.filter((x) => x.room.occupied)
    const list = nextCat === 'todas' ? occupied : occupied.filter((x) => x.cat === nextCat)
    return [...list].sort((a, b) => {
      const ad = a.room.checkout_date || ''
      const bd = b.room.checkout_date || ''
      if (ad && bd) return ad.localeCompare(bd)
      if (ad) return -1
      if (bd) return 1
      return String(a.n).localeCompare(String(b.n))
    })
  }, [roomsWithCategory, nextCat])

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

      {/* PRÓXIMAS HABITACIONES LIBRES POR CATEGORÍA */}
      <div className="card bg-base-100 border shadow-sm">
        <div className="card-body p-4 gap-3">
          <h2 className="text-lg font-bold">Próximas habitaciones libres</h2>
          <div className="tabs tabs-bordered tabs-sm w-fit max-w-full overflow-x-auto">
            {ROOM_CATS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`tab ${nextCat === c.key ? 'tab-active' : ''}`}
                onClick={() => setNextCat(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {nextRooms.length === 0 ? (
            <p className="text-sm opacity-60 py-2">
              No hay habitaciones ocupadas de esta categoría en este momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th></th>
                    <th>Habitación</th>
                    <th>Categoría</th>
                    <th>Se libera</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {nextRooms.slice(0, 12).map(({ room, n, cat }, idx) => (
                    <tr key={room.id} className={idx === 0 ? 'font-semibold' : ''}>
                      <td>
                        {idx === 0 ? (
                          <span className="badge badge-primary badge-sm">Próxima</span>
                        ) : (
                          <span className="opacity-50 text-xs">{idx + 1}</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="link link-hover" onClick={() => openRoom(room)}>
                          Hab. {String(n).padStart(2, '0')}
                        </button>
                      </td>
                      <td>{ROOM_CATEGORY_LABEL[cat]}</td>
                      <td>{room.checkout_date ? fmt(room.checkout_date) : <span className="opacity-50">Sin fecha</span>}</td>
                      <td>
                        <span className={`badge badge-sm ${getRoomStatus(room) === 'ocupado' ? 'badge-info' : getRoomStatus(room) === 'limpieza' ? 'badge-warning' : 'badge-success'}`}>
                          {getRoomStatus(room)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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

              <div className="modal-action flex-wrap">
                {canRegister && (
                  (!occupant && getRoomStatus(selectedRoom) !== 'ocupado' && (
                    <button className="btn btn-primary btn-sm" onClick={() => openStudentModal(selectedRoom)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                      </svg>
                      {t('rooms.register_student')}
                    </button>
                  )) ||
                  (occupant && selectedRoom.checkout_date && (
                    <button className="btn btn-primary btn-sm whitespace-normal h-auto" onClick={() => openStudentModal(selectedRoom)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                      </svg>
                      {t('rooms.register_next_student')}
                    </button>
                  ))
                )}
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

      {/* MODAL DE REGISTRO DE ALUMNO EN LA HABITACIÓN */}
      {showStudentModal && studentRoom && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-1">
              {t('rooms.register_student_in', { room: studentRoom.nombre })}
            </h3>
            <p className="text-sm opacity-60 mb-4">{t('rooms.register_student_desc')}</p>

            {getOccupant(studentRoom) && studentRoom.checkout_date && (
              <div className="alert alert-warning text-sm mb-4 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{t('rooms.register_next_hint', { name: getOccupant(studentRoom).name, until: fmt(studentRoom.checkout_date) })}</span>
              </div>
            )}

            <form onSubmit={handleStudentSave} className="flex flex-col gap-4">
              {sform.flightlogger_id && (
                <div className="alert alert-success py-2">
                  <div className="text-sm flex-1">
                    {t('students.flightlogger_linked')} — ID {sform.flightlogger_id}
                  </div>
                  <button type="button" className="btn btn-xs btn-ghost" onClick={() => setSform((prev) => ({ ...prev, flightlogger_id: '' }))}>
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.name')}</span></label>
                  <FlightloggerAutocomplete
                    campo="nombre"
                    value={sform.nombre}
                    onValueChange={(v) => setSform((prev) => ({ ...prev, nombre: v }))}
                    onSelect={handleFlightloggerSelect}
                    placeholder={t('students.name_placeholder')}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.surname')}</span></label>
                  <input className="input input-bordered w-full" value={sform.apellidos} onChange={(e) => setSform((prev) => ({ ...prev, apellidos: e.target.value }))} placeholder={t('students.surname_placeholder')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.email')}</span></label>
                  <FlightloggerAutocomplete
                    campo="email"
                    value={sform.email}
                    onValueChange={(v) => setSform((prev) => ({ ...prev, email: v }))}
                    onSelect={handleFlightloggerSelect}
                    placeholder={t('students.email_placeholder')}
                    type="email"
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.password')}</span></label>
                  <input type="password" className="input input-bordered w-full" value={sform.password} onChange={(e) => setSform((prev) => ({ ...prev, password: e.target.value }))} required placeholder={t('students.password_placeholder')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.phone')}</span></label>
                  <input className="input input-bordered w-full" value={sform.telefono} onChange={(e) => setSform((prev) => ({ ...prev, telefono: e.target.value }))} placeholder={t('students.phone_placeholder')} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.room')}</span></label>
                  <input className="input input-bordered w-full" value={sform.habitacion} disabled />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.entry_date')}</span></label>
                  <input type="date" className="input input-bordered w-full" value={sform.fecha_entrada} onChange={(e) => setSform((prev) => ({ ...prev, fecha_entrada: e.target.value }))} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.exit_date')}</span></label>
                  <input type="date" className="input input-bordered w-full" value={sform.fecha_salida_prevista} onChange={(e) => setSform((prev) => ({ ...prev, fecha_salida_prevista: e.target.value }))} />
                </div>
              </div>
              {courses.length > 0 && (
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.courses')}</span></label>
                  <div className="flex flex-col gap-1.5">
                    {courses.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={sform.cursos.includes(c.id)}
                          onChange={() => toggleCurso(c.id)}
                        />
                        <span className="text-sm">{c.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.tariff')}</span></label>
                  <select className="select select-bordered w-full" value={sform.tipo_tarifa} onChange={(e) => setSform((prev) => ({ ...prev, tipo_tarifa: e.target.value }))}>
                    <option value="cantidad">{t('tariff_types.cantidad')}</option>
                    <option value="mayor_9">{t('tariff_types.mayor_9')}</option>
                    <option value="menor_9">{t('tariff_types.menor_9')}</option>
                    <option value="diaria">{t('tariff_types.diaria')}</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{sform.tipo_tarifa === 'diaria' ? t('students.daily_price') : t('students.receipt_amount')}</span></label>
                  <div className="join w-full">
                    <input type="number" step="0.01" className="input input-bordered join-item flex-1" value={sform.cuota_mensual} onChange={(e) => setSform((prev) => ({ ...prev, cuota_mensual: e.target.value }))} placeholder="0.00" />
                    <span className="join-item bg-base-200 flex items-center px-3 text-sm opacity-60">€</span>
                  </div>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('students.billing_frequency')}</span></label>
                <select className="select select-bordered w-full" value={sform.facturar_cada} onChange={(e) => setSform((prev) => ({ ...prev, facturar_cada: e.target.value }))}>
                  <option value="1">{t('common.1_month')}</option>
                  <option value="2">{t('common.2_months')}</option>
                  <option value="3">{t('common.3_months')}</option>
                  <option value="6">{t('common.6_months')}</option>
                  <option value="12">{t('common.12_months')}</option>
                  <option value="semanal">{t('billing.semanal')}</option>
                  <option value="puntual">{t('billing.puntual')}</option>
                </select>
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-soft" onClick={() => setShowStudentModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('common.loading') : t('students.register')}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
