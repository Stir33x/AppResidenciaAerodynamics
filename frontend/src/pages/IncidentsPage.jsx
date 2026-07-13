import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const tipos = ['urgente', 'normal', 'baja']
const estados = ['reportada', 'en_curso', 'resuelta', 'cerrada']

export default function IncidentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast } = useToast()
  const isStaff = user?.rol !== 'estudiante'
  const [incidents, setIncidents] = useState([])
  const [staff, setStaff] = useState([])
  const [rooms, setRooms] = useState([])
  const [commonZones, setCommonZones] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ habitacion: '', tipo: 'normal', descripcion: '', imagen: '' })
  const [uploadingImg, setUploadingImg] = useState(false)
  const [editForm, setEditForm] = useState({ estado: '', asignado_a: '', tipo: '' })

  const load = async () => {
    const params = new URLSearchParams()
    if (filtroEstado) params.append('estado', filtroEstado)
    if (filtroTipo) params.append('tipo', filtroTipo)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const data = await fetchApi(`/incidencias${qs}`)
    setIncidents(data)
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [filtroEstado, filtroTipo])
  useEffect(() => {
    if (isStaff) {
      fetchApi('/incidencias/staff/lista').then(setStaff).catch(() => {})
      fetchApi('/rooms').then(setRooms).catch(() => {})
    }
    fetchApi('/common-zones').then(setCommonZones).catch(() => {})
  }, [isStaff])

  const openCreate = () => {
    setEditing(null)
    setForm({ habitacion: '', tipo: 'normal', descripcion: '', imagen: '' })
    setShowModal(true)
  }

  const openEdit = (inc) => {
    setEditing(inc)
    setEditForm({ estado: inc.estado, asignado_a: inc.asignado_a || '', tipo: inc.tipo })
    setShowModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await fetchApi('/incidencias', {
        method: 'POST',
        body: JSON.stringify({ habitacion: form.habitacion, tipo: form.tipo, descripcion: form.descripcion, imagen: form.imagen || null }),
      })
      setShowModal(false)
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      await fetchApi(`/incidencias/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          estado: editForm.estado || undefined,
          asignado_a: editForm.asignado_a ? parseInt(editForm.asignado_a) : null,
          tipo: editForm.tipo || undefined,
        }),
      })
      setShowModal(false)
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const studentRoom = user?.habitacion

  const tipoBadge = (tipo) => {
    const cls = { urgente: 'badge-error', normal: 'badge-info', baja: 'badge-soft' }
    return <span className={`badge ${cls[tipo] || ''}`}>{t('incident_priorities.' + tipo)}</span>
  }

  const estadoBadge = (estado) => {
    const cls = { reportada: 'badge-soft', en_curso: 'badge-warning', resuelta: 'badge-success', cerrada: 'badge-neutral' }
    return <span className={`badge ${cls[estado] || ''}`}>{t('incident_states.' + estado)}</span>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="page-title">{t('incidents.title')}</h1>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={openCreate}>{t('incidents.new')}</button>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm opacity-70">{t('incidents.filter')}</span>
        <select className="select select-bordered select-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">{t('incidents.all_states')}</option>
          {estados.map((est) => <option key={est} value={est}>{t('incident_states.' + est)}</option>)}
        </select>
        <select className="select select-bordered select-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">{t('incidents.all_priorities')}</option>
          {tipos.map((tp) => <option key={tp} value={tp}>{t('incident_priorities.' + tp)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>{t('incidents.date')}</th>
              <th>{t('incidents.reported_by')}</th>
              <th>{t('incidents.location')}</th>
              <th>{t('incidents.priority')}</th>
              <th>{t('incidents.description')}</th>
              <th>{t('incidents.status')}</th>
              <th>{t('incidents.assigned_to')}</th>
              <th>{t('incidents.photo')}</th>
              {isStaff && <th>{t('incidents.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id}>
                <td className="text-sm">{new Date(inc.created_at).toLocaleDateString('es-ES')}</td>
                <td>{inc.reportado_nombre} {inc.reportado_apellidos}</td>
                <td>{inc.habitacion || '-'}</td>
                <td>{tipoBadge(inc.tipo)}</td>
                <td className="max-w-xs truncate">{inc.descripcion}</td>
                <td>{estadoBadge(inc.estado)}</td>
                <td className="text-sm">{inc.asignado_nombre ? `${inc.asignado_nombre} ${inc.asignado_apellidos}` : '-'}</td>
                <td>
                  {inc.imagen ? (
                    <img src={inc.imagen} alt="foto" className="w-12 h-12 object-cover rounded-lg cursor-pointer" onClick={() => window.open(inc.imagen, '_blank')} />
                  ) : (
                    <span className="text-xs opacity-50">{t('incidents.no_photo')}</span>
                  )}
                </td>
                {isStaff && (
                  <td>
                    <button className="btn btn-xs btn-ghost" onClick={() => openEdit(inc)}>{t('incidents.manage')}</button>
                  </td>
                )}
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr><td colSpan={isStaff ? 9 : 8} className="text-center opacity-60 py-8">{t('incidents.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && !editing && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('incidents.create_title')}</h3>
                <p className="text-sm opacity-60">{t('incidents.create_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('incidents.priority')}</span></label>
                  <select className="select select-bordered" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    {tipos.map((tp) => <option key={tp} value={tp}>{t('incident_priorities.' + tp)}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('incidents.location')}</span></label>
                  {user?.rol === 'estudiante' ? (
                    <select className="select select-bordered" value={form.habitacion} onChange={(e) => setForm({ ...form, habitacion: e.target.value })} required>
                      <option value="">{t('common.select')}</option>
                      {user.habitacion && <option value={user.habitacion}>{t('incidents.my_room', { room: user.habitacion })}</option>}
                      {commonZones.map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
                    </select>
                  ) : (
                    <select className="select select-bordered" value={form.habitacion} onChange={(e) => setForm({ ...form, habitacion: e.target.value })}>
                      <option value="">{t('incidents.no_location')}</option>
                      <optgroup label={t('incidents.rooms_group')}>
                        {rooms.map((r) => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                      </optgroup>
                      <optgroup label={t('incidents.zones_group')}>
                        {commonZones.map((z) => <option key={z.id} value={z.nombre}>{z.nombre}</option>)}
                      </optgroup>
                    </select>
                  )}
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.description')}</span></label>
                <textarea className="textarea textarea-bordered h-28" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required placeholder={t('incidents.desc_placeholder')} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.photo')}</span></label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="file-input file-input-bordered flex-1"
                    disabled={uploadingImg}
                    onChange={async (e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      setUploadingImg(true)
                      try {
                        const fd = new FormData()
                        fd.append('imagen', file)
                        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
                        const res = await fetch(`${API_BASE}/upload/image`, { method: 'POST', headers: { Authorization: localStorage.getItem('token') }, body: fd })
                        const data = await res.json()
                        if (data.url) setForm({ ...form, imagen: data.url })
                      } catch (err) { addToast(err.message, 'error') }
                      setUploadingImg(false)
                    }}
                  />
                  {uploadingImg && <span className="loading loading-spinner loading-sm" />}
                </div>
                {form.imagen && (
                  <img src={form.imagen} alt="preview" className="mt-2 w-24 h-24 object-cover rounded-lg" />
                )}
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.create')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {showModal && editing && isStaff && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('incidents.manage_title')} #{editing.id}</h3>
                <p className="text-sm opacity-60">{t('incidents.manage_desc')}</p>
              </div>
            </div>
            <div className="bg-base-200 rounded-box p-4 mb-4 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium opacity-70 w-20">{t('incidents.reported_by')}:</span>
                <span>{editing.reportado_nombre} {editing.reportado_apellidos}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium opacity-70 w-20">{t('incidents.location')}:</span>
                <span>{editing.habitacion || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium opacity-70 w-20 shrink-0">{t('incidents.description')}:</span>
                <span className="opacity-80">{editing.descripcion}</span>
              </div>
              {editing.imagen && (
                <div className="mt-3">
                  <span className="font-medium opacity-70 text-xs">{t('incidents.photo')}</span>
                  <img src={editing.imagen} alt="foto" className="mt-1 w-full max-h-48 object-cover rounded-lg cursor-pointer" onClick={() => window.open(editing.imagen, '_blank')} />
                </div>
              )}
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('incidents.priority')}</span></label>
                  <select className="select select-bordered" value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}>
                    {tipos.map((tp) => <option key={tp} value={tp}>{t('incident_priorities.' + tp)}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('incidents.status')}</span></label>
                  <select className="select select-bordered" value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}>
                    {estados.map((est) => <option key={est} value={est}>{t('incident_states.' + est)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.assigned_to')}</span></label>
                <select className="select select-bordered" value={editForm.asignado_a} onChange={(e) => setEditForm({ ...editForm, asignado_a: e.target.value })}>
                  <option value="">{t('common.no_data')}</option>
                  {staff.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} ({t('roles.' + p.rol)})</option>
                  ))}
                </select>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

    </div>
  )
}
