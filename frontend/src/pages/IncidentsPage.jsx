import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const tipos = ['urgente', 'normal', 'baja']
const estados = ['reportada', 'en_curso', 'resuelta', 'cerrada']

export default function IncidentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isStaff = user?.rol !== 'estudiante'
  const canManageZones = user?.rol === 'direccion' || user?.rol === 'administracion'
  const [incidents, setIncidents] = useState([])
  const [staff, setStaff] = useState([])
  const [rooms, setRooms] = useState([])
  const [commonZones, setCommonZones] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ habitacion: '', tipo: 'normal', descripcion: '' })
  const [editForm, setEditForm] = useState({ estado: '', asignado_a: '', tipo: '' })
  const [showZonesModal, setShowZonesModal] = useState(false)
  const [newZone, setNewZone] = useState('')

  const load = async () => {
    const params = new URLSearchParams()
    if (filtroEstado) params.append('estado', filtroEstado)
    if (filtroTipo) params.append('tipo', filtroTipo)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const data = await fetchApi(`/incidencias${qs}`)
    setIncidents(data)
  }

  useEffect(() => { load() }, [filtroEstado, filtroTipo])
  useEffect(() => {
    if (isStaff) {
      fetchApi('/incidencias/staff/lista').then(setStaff).catch(() => {})
      fetchApi('/rooms').then(setRooms).catch(() => {})
    }
    fetchApi('/common-zones').then(setCommonZones).catch(() => {})
  }, [isStaff])

  const openCreate = () => {
    setEditing(null)
    setForm({ habitacion: '', tipo: 'normal', descripcion: '' })
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
        body: JSON.stringify({ habitacion: form.habitacion, tipo: form.tipo, descripcion: form.descripcion }),
      })
      setShowModal(false)
      load()
    } catch (err) { alert(err.message) }
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
    } catch (err) { alert(err.message) }
  }

  const handleAddZone = async (e) => {
    e.preventDefault()
    try {
      await fetchApi('/common-zones', {
        method: 'POST',
        body: JSON.stringify({ nombre: newZone }),
      })
      setNewZone('')
      fetchApi('/common-zones').then(setCommonZones).catch(() => {})
    } catch (err) { alert(err.message) }
  }

  const handleDeleteZone = async (id) => {
    if (!confirm(t('incidents.confirm_delete_zone'))) return
    try {
      await fetchApi(`/common-zones/${id}`, { method: 'DELETE' })
      fetchApi('/common-zones').then(setCommonZones).catch(() => {})
    } catch (err) { alert(err.message) }
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
        <h1 className="text-3xl font-bold">{t('incidents.title')}</h1>
        <div className="flex gap-2">
          {canManageZones && (
            <button className="btn btn-soft" onClick={() => setShowZonesModal(true)}>{t('incidents.common_zones')}</button>
          )}
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
              {isStaff && <th>{t('incidents.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id}>
                <td className="text-sm">{new Date(inc.created_at).toLocaleDateString()}</td>
                <td>{inc.reportado_nombre} {inc.reportado_apellidos}</td>
                <td>{inc.habitacion || '-'}</td>
                <td>{tipoBadge(inc.tipo)}</td>
                <td className="max-w-xs truncate">{inc.descripcion}</td>
                <td>{estadoBadge(inc.estado)}</td>
                <td className="text-sm">{inc.asignado_nombre ? `${inc.asignado_nombre} ${inc.asignado_apellidos}` : '-'}</td>
                {isStaff && (
                  <td>
                    <button className="btn btn-xs btn-ghost" onClick={() => openEdit(inc)}>{t('incidents.manage')}</button>
                  </td>
                )}
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr><td colSpan={isStaff ? 8 : 7} className="text-center opacity-60 py-8">{t('incidents.empty')}</td></tr>
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

      {showZonesModal && (
        <dialog className="modal modal-open" onClick={() => setShowZonesModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center text-base-content">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('incidents.zones_title')}</h3>
                <p className="text-sm opacity-60">{t('incidents.zones_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleAddZone} className="join w-full mb-4">
              <input className="input input-bordered join-item flex-1" value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder={t('incidents.zone_placeholder')} required />
              <button type="submit" className="btn btn-primary join-item">{t('incidents.add_zone')}</button>
            </form>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {commonZones.map((z) => (
                <div key={z.id} className="flex items-center justify-between px-3 py-2.5 bg-base-200 rounded-box">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
                    <span>{z.nombre}</span>
                  </div>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDeleteZone(z.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              ))}
              {commonZones.length === 0 && (
                <p className="text-sm opacity-60 text-center py-8">{t('incidents.zones_empty')}</p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setShowZonesModal(false)}>{t('common.close')}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
