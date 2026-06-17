import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const DIAS = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo']

export default function CleaningPage() {
  const { t } = useTranslation(['cleaning', 'days', 'common'])
  const { user } = useAuth()
  const isAdmin = user?.rol === 'direccion' || user?.rol === 'administracion'
  const [blocks, setBlocks] = useState([])
  const [todayData, setTodayData] = useState(null)
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ dia_semana: 'Lunes', hora_inicio: '09:00', hora_fin: '13:00', selectedRooms: [] })

  const loadBlocks = async () => {
    const data = await fetchApi('/cleaning/blocks')
    setBlocks(data)
  }

  const loadToday = async () => {
    try {
      const data = await fetchApi('/cleaning/today')
      setTodayData(data)
    } catch { setTodayData(null) }
  }

  useEffect(() => { loadToday() }, [])
  useEffect(() => {
    if (isAdmin) {
      loadBlocks()
      fetchApi('/rooms').then(setRooms).catch(() => {})
    }
  }, [isAdmin])

  const openCreate = () => {
    setForm({ dia_semana: 'Lunes', hora_inicio: '09:00', hora_fin: '13:00', selectedRooms: [] })
    setError('')
    setShowModal(true)
  }

  const toggleRoom = (nombre) => {
    setForm((prev) => ({
      ...prev,
      selectedRooms: prev.selectedRooms.includes(nombre)
        ? prev.selectedRooms.filter((r) => r !== nombre)
        : [...prev.selectedRooms, nombre],
    }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (form.selectedRooms.length === 0) return setError(t('cleaning.select_room_error'))
    try {
      await fetchApi('/cleaning/blocks', {
        method: 'POST',
        body: JSON.stringify({
          dia_semana: form.dia_semana,
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
          rooms: form.selectedRooms,
        }),
      })
      setShowModal(false)
      loadBlocks()
      loadToday()
    } catch (err) { setError(err.message) }
  }

  const handleDeleteBlock = async (id) => {
    await fetchApi(`/cleaning/blocks/${id}`, { method: 'DELETE' })
    loadBlocks()
    loadToday()
  }

  const toggleComplete = async (roomId) => {
    await fetchApi(`/cleaning/rooms/${roomId}/complete`, { method: 'POST' })
    loadToday()
  }

  // Limpiadora: vista de hoy
  if (user?.rol === 'limpieza') {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">{t('cleaning.today_title', { day: todayData?.dia ? t(todayData.dia) : '' })}</h1>
        {(!todayData?.blocks || todayData.blocks.length === 0) && (
          <div className="alert alert-soft">{t('cleaning.no_tasks')}</div>
        )}
        {todayData?.blocks?.map((block) => (
          <div key={block.id} className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title">{block.hora_inicio?.slice(0, 5)} — {block.hora_fin?.slice(0, 5)}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {block.rooms?.map((room) => (
                  <div key={room.id} className={`border rounded-box p-3 ${room.completada_hoy ? 'bg-success/10 border-success' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">{room.room_name}</span>
                      <input type="checkbox" className="checkbox checkbox-success" checked={!!room.completada_hoy} onChange={() => toggleComplete(room.id)} />
                    </div>
                    {room.absences?.length > 0 && (
                      <div className="mt-1 text-xs">
                        {room.absences.map((a, i) => (
                          <span key={i} className="badge badge-soft badge-info badge-xs mr-1">
                            {a.nombre}: {a.hora_inicio?.slice(0, 5)}-{a.hora_fin?.slice(0, 5)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Admin: gestion de bloques
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('cleaning.admin_title')}</h1>
        <button className="btn btn-primary" onClick={openCreate}>{t('cleaning.new_block')}</button>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DIAS.map((dia) => {
          const delDia = blocks.filter((b) => b.dia_semana === dia)
          const idx = DIAS.indexOf(dia)
          return (
            <div key={dia} className={`card shadow-sm border ${idx % 2 === 0 ? 'bg-base-100' : 'bg-base-200'}`}>
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-2">{t(dia)}</h2>
                {delDia.length === 0 && <p className="text-sm opacity-50">{t('cleaning.no_schedules')}</p>}
                {delDia.map((b) => (
                  <div key={b.id} className="mb-2 p-2 bg-base-100 rounded-box border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{b.hora_inicio?.slice(0, 5)} — {b.hora_fin?.slice(0, 5)}</span>
                      <button className="btn btn-xs btn-ghost text-error" onClick={() => handleDeleteBlock(b.id)}>X</button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {b.rooms?.map((r) => (
                        <span key={r.id} className="badge badge-soft badge-sm">{r.room_name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card bg-base-100 shadow-sm border">
        <div className="card-body">
          <h2 className="card-title">{t('cleaning.today_section', { day: todayData?.dia ? t(todayData.dia) : '' })}</h2>
          {todayData?.blocks?.length === 0 && <p className="text-sm opacity-60">{t('cleaning.no_tasks')}</p>}
          {todayData?.blocks?.map((b) => (
            <div key={b.id} className="mb-2">
              <p className="font-medium">{b.hora_inicio?.slice(0, 5)} — {b.hora_fin?.slice(0, 5)}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {b.rooms?.map((r) => (
                  <span key={r.id} className={`badge ${r.completada_hoy ? 'badge-success' : 'badge-soft badge-outline'}`}>
                    {r.room_name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{t('cleaning.create_title')}</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('cleaning.day')}</span></label>
                <select className="select select-bordered" value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}>
                  {DIAS.map((d) => <option key={d} value={d}>{t(d)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('cleaning.start_time')}</span></label>
                  <input type="time" className="input input-bordered" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('cleaning.end_time')}</span></label>
                  <input type="time" className="input input-bordered" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} required />
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('cleaning.rooms')}</span></label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-box p-3">
                  {rooms.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="checkbox checkbox-xs" checked={form.selectedRooms.includes(r.nombre)} onChange={() => toggleRoom(r.nombre)} />
                      <span className="text-sm">{r.nombre}</span>
                    </label>
                  ))}
                  {rooms.length === 0 && <p className="text-sm opacity-50 col-span-full">{t('cleaning.no_rooms')}</p>}
                </div>
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('cleaning.create_block', { count: form.selectedRooms.length })}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
