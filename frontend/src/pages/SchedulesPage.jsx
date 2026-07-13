import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const dias = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo']

function TipoBadge({ nombre, color }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${color || 'badge-soft'} inline-block`}>
      {nombre}
    </span>
  )
}

export default function SchedulesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast, confirm } = useToast()
  const isStaff = user?.rol !== 'estudiante'
  const [horarios, setHorarios] = useState([])
  const [tipos, setTipos] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    tipo_id: '', titulo: '', descripcion: '', dia_semana: '',
    hora_inicio: '', hora_fin: '', ubicacion: '',
  })

  useEffect(() => { fetchApi('/horario-types').then(setTipos).catch(() => {}) }, [])

  const load = async () => {
    const qs = filtroTipo ? `?tipo=${filtroTipo}` : ''
    const data = await fetchApi(`/horarios${qs}`)
    setHorarios(data)
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [filtroTipo])

  const openCreate = () => {
    setEditing(null)
    const firstId = tipos[0]?.id || ''
    setForm({ tipo_id: firstId, titulo: '', descripcion: '', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '', ubicacion: '' })
    setShowModal(true)
  }

  const openEdit = (h) => {
    setEditing(h)
    setForm({
      tipo_id: h.tipo_id,
      titulo: h.titulo,
      descripcion: h.descripcion || '',
      dia_semana: h.dia_semana || '',
      hora_inicio: h.hora_inicio ? h.hora_inicio.slice(0, 5) : '',
      hora_fin: h.hora_fin ? h.hora_fin.slice(0, 5) : '',
      ubicacion: h.ubicacion || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const body = {
        tipo_id: form.tipo_id,
        titulo: form.titulo,
        descripcion: form.descripcion,
        dia_semana: form.dia_semana,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin || null,
        ubicacion: form.ubicacion,
      }
      if (editing) {
        await fetchApi(`/horarios/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await fetchApi('/horarios', { method: 'POST', body: JSON.stringify(body) })
      }
      setShowModal(false)
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const handleDelete = async (h) => {
    if (!await confirm(t('schedules.confirm_delete', { title: h.titulo }))) return
    try { await fetchApi(`/horarios/${h.id}`, { method: 'DELETE' }); load(); addToast(t('common.deleted'), 'success') }
    catch (err) { addToast(err.message, 'error') }
  }

  const noDayKey = t('schedules.no_day')
  const agruparPorDia = (arr) => {
    const grupos = {}
    dias.forEach((d) => { grupos[d] = {} })
    arr.forEach((h) => {
      const dia = h.dia_semana && grupos[h.dia_semana] ? h.dia_semana : noDayKey
      if (!grupos[dia]) grupos[dia] = {}
      if (!grupos[dia][h.tipo]) grupos[dia][h.tipo] = []
      grupos[dia][h.tipo].push(h)
    })
    return grupos
  }

  const grupos = agruparPorDia(horarios)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="page-title">{t('schedules.title')}</h1>
        {isStaff && <button className="btn btn-primary" onClick={openCreate}>{t('schedules.new')}</button>}
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm opacity-70">{t('schedules.filter')}</span>
        <select className="select select-bordered select-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">{t('schedules.all')}</option>
          {tipos.map((tp) => <option key={tp.id} value={tp.nombre}>{tp.nombre}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dias.map((dia) => {
          const cats = grupos[dia] || {}
          const hasItems = Object.values(cats).some((arr) => arr.length > 0)
          if (!hasItems && !isStaff) return null
          return (
            <div key={dia} className="card bg-base-100 border shadow-sm">
              <div className="card-body p-4">
                <h2 className="card-title text-base">{t('days.' + dia)}</h2>
                {!hasItems ? (
                  <p className="text-xs opacity-40">{t('schedules.no_schedules')}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {tipos.filter((tp) => cats[tp.nombre]?.length > 0).map((tp) => (
                      <div key={tp.id}>
                        <h3 className="mb-1">
                          <TipoBadge nombre={tp.nombre} color={tp.color} />
                        </h3>
                        <div className="flex flex-col gap-1.5">
                          {cats[tp.nombre].map((h) => (
                            <div key={h.id} className="bg-base-200 rounded-box p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-sm">{h.titulo}</span>
                                  <div className="text-xs font-mono opacity-70 mt-0.5">
                                    {h.hora_fin
                                      ? `${h.hora_inicio?.slice(0, 5)} \u2014 ${h.hora_fin?.slice(0, 5)}`
                                      : h.hora_inicio?.slice(0, 5)}
                                  </div>
                                </div>
                                {isStaff && (
                                  <div className="flex gap-1 shrink-0">
                                    <button className="btn btn-xs btn-ghost" onClick={() => openEdit(h)}>{t('common.edit')}</button>
                                    <button className="btn btn-xs btn-ghost btn-error" onClick={() => handleDelete(h)}>{t('common.delete')}</button>
                                  </div>
                                )}
                              </div>
                              {h.ubicacion && (
                                <p className="text-xs opacity-50 mt-0.5">{h.ubicacion}</p>
                              )}
                              {h.descripcion && (
                                <p className="text-xs opacity-40 mt-0.5">{h.descripcion}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{editing ? t('schedules.edit_title') : t('schedules.create_title')}</h3>
                <p className="text-sm opacity-60">{editing ? t('schedules.edit_desc') : t('schedules.create_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('schedules.type')}</span></label>
                  <select className="select select-bordered" value={form.tipo_id} onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}>
                    {tipos.map((tp) => <option key={tp.id} value={tp.id}>{tp.nombre}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('schedules.title_field')}</span></label>
                  <input className="input input-bordered" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder={t('schedules.title_placeholder')} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('schedules.day')}</span></label>
                  <select className="select select-bordered" value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}>
                    <option value="">{t('schedules.no_fixed_day')}</option>
                    {dias.map((d) => <option key={d} value={d}>{t('days.' + d)}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('schedules.location')}</span></label>
                  <input className="input input-bordered" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder={t('schedules.location_placeholder')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('schedules.start_time')}</span></label>
                  <input type="time" className="input input-bordered" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('schedules.end_time')}</span></label>
                  <input type="time" className="input input-bordered" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} />
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('schedules.description')}</span></label>
                <textarea className="textarea textarea-bordered h-20" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder={t('schedules.description_placeholder')} />
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editing ? t('common.save') : t('common.create')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
