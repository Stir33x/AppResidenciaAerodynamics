import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const tipos = ['transporte', 'residencia', 'cafeteria', 'comedor', 'recepci\u00f3n', 'instalaciones', 'otros']
const dias = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo']

const tipoIcono = {
  transporte: '\ud83d\ude8c',
  residencia: '\ud83c\udfe0',
  cafeteria: '\u2615',
  comedor: '\ud83c\udf7d',
  recepci\u00f3n: '\ud83d\udeee',
  instalaciones: '\ud83c\udfca',
  otros: '\ud83d\udccb',
}

export default function SchedulesPage() {
  const { t } = useTranslation(['schedules', 'schedule_types', 'days', 'common'])
  const { user } = useAuth()
  const isStaff = user?.rol !== 'estudiante'
  const [horarios, setHorarios] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    tipo: 'transporte', titulo: '', descripcion: '', dia_semana: '',
    hora_inicio: '', hora_fin: '', ubicacion: '',
  })

  const load = async () => {
    const qs = filtroTipo ? `?tipo=${filtroTipo}` : ''
    const data = await fetchApi(`/horarios${qs}`)
    setHorarios(data)
  }

  useEffect(() => { load() }, [filtroTipo])

  const openCreate = () => {
    setEditing(null)
    setForm({ tipo: 'transporte', titulo: '', descripcion: '', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '', ubicacion: '' })
    setShowModal(true)
  }

  const openEdit = (h) => {
    setEditing(h)
    setForm({
      tipo: h.tipo,
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
        tipo: form.tipo,
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
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async (h) => {
    if (!confirm(t('schedules.confirm_delete', { title: h.titulo }))) return
    try { await fetchApi(`/horarios/${h.id}`, { method: 'DELETE' }); load() }
    catch (err) { alert(err.message) }
  }

  const noDayKey = t('schedules.no_day')
  const agruparPorDia = (arr) => {
    const grupos = {}
    dias.forEach((d) => { grupos[d] = [] })
    arr.forEach((h) => {
      if (grupos[h.dia_semana]) grupos[h.dia_semana].push(h)
      else if (!h.dia_semana) {
        if (!grupos[noDayKey]) grupos[noDayKey] = []
        grupos[noDayKey].push(h)
      }
    })
    return grupos
  }

  const grupos = agruparPorDia(horarios)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">{t('schedules.title')}</h1>
        {isStaff && <button className="btn btn-primary" onClick={openCreate}>{t('schedules.new')}</button>}
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm opacity-70">{t('schedules.filter')}</span>
        <select className="select select-bordered select-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">{t('schedules.all')}</option>
          {tipos.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dias.map((dia) => {
          const items = grupos[dia] || []
          if (items.length === 0 && !isStaff) return null
          return (
            <div key={dia} className="card bg-base-100 border shadow-sm">
              <div className="card-body p-4">
                <h2 className="card-title text-base">{t(dia)}</h2>
                {items.length === 0 ? (
                  <p className="text-xs opacity-40">{t('schedules.no_schedules')}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((h) => (
                      <div key={h.id} className="bg-base-200 rounded-box p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{tipoIcono[h.tipo]} {h.titulo}</span>
                          {isStaff && (
                            <div className="flex gap-1">
                              <button className="btn btn-xs btn-ghost" onClick={() => openEdit(h)}>{t('common.edit')}</button>
                              <button className="btn btn-xs btn-ghost btn-error" onClick={() => handleDelete(h)}>{t('common.delete')}</button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {h.hora_fin
                            ? t('schedules.time_range', { start: h.hora_inicio?.slice(0, 5), end: h.hora_fin?.slice(0, 5) })
                            : h.hora_inicio?.slice(0, 5)}
                          {h.ubicacion ? t('schedules.location_suffix', { location: h.ubicacion }) : ''}
                        </p>
                        {h.descripcion && <p className="text-xs opacity-50 mt-1">{h.descripcion}</p>}
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
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{editing ? t('schedules.edit_title') : t('schedules.create_title')}</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('schedules.type')}</span></label>
                <select className="select select-bordered" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {tipos.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('schedules.title_field')}</span></label>
                <input className="input input-bordered" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder={t('schedules.title_placeholder')} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('schedules.day')}</span></label>
                  <select className="select select-bordered" value={form.dia_semana} onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}>
                    <option value="">{t('schedules.no_fixed_day')}</option>
                    {dias.map((d) => <option key={d} value={d}>{t(d)}</option>)}
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
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editing ? t('common.save') : t('common.create')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
