import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const tipos = ['urgente', 'normal', 'baja']
const estados = ['reportada', 'en_curso', 'resuelta', 'cerrada']

export default function IncidentsPage() {
  const { t } = useTranslation(['incidents', 'incident_states', 'incident_priorities', 'roles', 'common'])
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
    return <span className={`badge ${cls[tipo] || ''}`}>{t(tipo)}</span>
  }

  const estadoBadge = (estado) => {
    const cls = { reportada: 'badge-soft', en_curso: 'badge-warning', resuelta: 'badge-success', cerrada: 'badge-neutral' }
    return <span className={`badge ${cls[estado] || ''}`}>{t(estado)}</span>
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
          {estados.map((est) => <option key={est} value={est}>{t(est)}</option>)}
        </select>
        <select className="select select-bordered select-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">{t('incidents.all_priorities')}</option>
          {tipos.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
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
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{t('incidents.create_title')}</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.priority')}</span></label>
                <select className="select select-bordered" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {tipos.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
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
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.description')}</span></label>
                <textarea className="textarea textarea-bordered h-24" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required />
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.create')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {showModal && editing && isStaff && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{t('incidents.manage_title')} #{editing.id}</h3>
            <div className="mb-4 p-3 bg-base-200 rounded-box text-sm">
              <p><strong>{t('incidents.reported_by')}:</strong> {editing.reportado_nombre} {editing.reportado_apellidos}</p>
              <p><strong>{t('incidents.location')}:</strong> {editing.habitacion || '-'}</p>
              <p><strong>{t('incidents.description')}:</strong> {editing.descripcion}</p>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.priority')}</span></label>
                <select className="select select-bordered" value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}>
                  {tipos.map((tp) => <option key={tp} value={tp}>{t(tp)}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.status')}</span></label>
                <select className="select select-bordered" value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}>
                  {estados.map((est) => <option key={est} value={est}>{t(est)}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('incidents.assigned_to')}</span></label>
                <select className="select select-bordered" value={editForm.asignado_a} onChange={(e) => setEditForm({ ...editForm, asignado_a: e.target.value })}>
                  <option value="">{t('common.no_data')}</option>
                  {staff.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} ({t(p.rol)})</option>
                  ))}
                </select>
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {showZonesModal && (
        <dialog className="modal modal-open" onClick={() => setShowZonesModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{t('incidents.zones_title')}</h3>
            <form onSubmit={handleAddZone} className="flex items-end gap-2 mb-4">
              <div className="form-control flex-1">
                <label className="label"><span className="label-text">{t('incidents.new_zone')}</span></label>
                <input className="input input-bordered" value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder={t('incidents.zone_placeholder')} required />
              </div>
              <button type="submit" className="btn btn-primary btn-sm mb-1">{t('incidents.add_zone')}</button>
            </form>
            <div className="flex flex-col gap-1">
              {commonZones.map((z) => (
                <div key={z.id} className="flex items-center justify-between p-2 bg-base-200 rounded-box">
                  <span>{z.nombre}</span>
                  <button className="btn btn-ghost btn-xs btn-error" onClick={() => handleDeleteZone(z.id)}>{t('incidents.delete_zone')}</button>
                </div>
              ))}
              {commonZones.length === 0 && <p className="opacity-60 text-sm">{t('incidents.zones_empty')}</p>}
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
