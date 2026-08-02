import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useToast } from '../components/Toast'

export default function GuestsPage() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [guests, setGuests] = useState([])
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellidos: '', telefono: '', habitacion: '', fecha_entrada: '', fecha_salida_prevista: '' })
  const [confirmDeparture, setConfirmDeparture] = useState(null)
  const [uploading, setUploading] = useState({ id: null })

  const load = async () => {
    const data = await fetchApi('/guests')
    setGuests(data)
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [])

  const loadRooms = async (editingGuest, formOverride) => {
    try {
      const f = formOverride || form
      const params = new URLSearchParams()
      if (f.fecha_entrada) params.set('fecha_entrada', f.fecha_entrada)
      if (f.fecha_salida_prevista) params.set('fecha_salida_prevista', f.fecha_salida_prevista)
      if (editingGuest?.id) params.set('exclude_student_id', editingGuest.id)
      const qs = params.toString()
      const data = await fetchApi(`/rooms/available${qs ? `?${qs}` : ''}`)
      if (editingGuest && editingGuest.habitacion) {
        const alreadyIncluded = data.find((r) => r.nombre === editingGuest.habitacion)
        if (!alreadyIncluded) {
          data.push({ id: -1, nombre: editingGuest.habitacion })
        }
      }
      setRooms(data)
    } catch {
      setRooms([])
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ email: '', password: '', nombre: '', apellidos: '', telefono: '', habitacion: '', fecha_entrada: '', fecha_salida_prevista: '' })
    loadRooms(null)
    setShowModal(true)
  }

  const openEdit = (g) => {
    setEditing(g)
    const f = {
      email: g.email, password: '', nombre: g.nombre, apellidos: g.apellidos,
      telefono: g.telefono, habitacion: g.habitacion,
      fecha_entrada: g.fecha_entrada ? g.fecha_entrada.slice(0, 10) : '',
      fecha_salida_prevista: g.fecha_salida_prevista ? g.fecha_salida_prevista.slice(0, 10) : '',
    }
    setForm(f)
    loadRooms(g, f)
    setShowModal(true)
  }

  const updateForm = (updates) => {
    const next = { ...form, ...updates }
    setForm(next)
    if ('fecha_entrada' in updates || 'fecha_salida_prevista' in updates) {
      loadRooms(editing, next)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await fetchApi(`/guests/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            habitacion: form.habitacion || null,
            fecha_entrada: form.fecha_entrada || null,
            fecha_salida_prevista: form.fecha_salida_prevista || null,
          }),
        })
      } else {
        await fetchApi('/guests', {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const handleMarkDeparture = async (g) => {
    try {
      await fetchApi(`/guests/${g.id}/marcar-salida`, { method: 'PUT' })
      setConfirmDeparture(null)
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const handleUpload = async (guestId) => {
    const fileInput = document.getElementById(`gfile-${guestId}`)
    const file = fileInput?.files?.[0]
    if (!file) return

    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    try {
      await fetch(`${API_BASE}/guests/${guestId}/contrato`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      setUploading({ id: null })
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) {
      addToast(t('guests.contract_error'), 'error')
    }
  }

  const viewContract = async (guestId) => {
    const token = localStorage.getItem('token')
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${API_BASE}/guests/${guestId}/contrato/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch { addToast(t('guests.contract_error'), 'error') }
  }

  const statusBadge = (estado, sm) => {
    const cls = { activo: 'badge-success', pendiente_salida: 'badge-warning', baja: 'badge-error' }
    const txt = { activo: t('common.active'), pendiente_salida: t('common.pending_departure'), baja: t('common.inactive') }
    return <span className={`badge ${sm ? 'badge-sm' : ''} ${cls[estado] || ''}`}>{txt[estado] || estado}</span>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('guests.title')}</h1>
        <button className="btn btn-primary" onClick={openCreate}>{t('guests.register')}</button>
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>{t('guests.name')}</th>
              <th>{t('guests.email')}</th>
              <th>{t('guests.room')}</th>
              <th>{t('guests.entry')}</th>
              <th>{t('guests.exit_planned')}</th>
              <th>{t('guests.status')}</th>
              <th>{t('guests.departure')}</th>
              <th>{t('guests.contract')}</th>
              <th>{t('guests.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id}>
                <td className="font-medium">{g.nombre} {g.apellidos}</td>
                <td className="opacity-70">{g.email}</td>
                <td><span className="badge badge-soft badge-outline room-number">{g.habitacion || t('common.unassigned')}</span></td>
                <td className="whitespace-nowrap">{g.fecha_entrada ? new Date(g.fecha_entrada).toLocaleDateString('es-ES') : '-'}</td>
                <td className="whitespace-nowrap">{g.fecha_salida_prevista ? new Date(g.fecha_salida_prevista).toLocaleDateString('es-ES') : '-'}</td>
                <td>{statusBadge(g.estado)}</td>
                <td>
                  {g.estado !== 'baja' ? (
                    <button className="btn btn-sm btn-warning" onClick={() => setConfirmDeparture(g)}>
                      {t('guests.mark_departure')}
                    </button>
                  ) : (
                    <span className="text-xs opacity-50">{t('common.inactive')}</span>
                  )}
                </td>
                <td>
                  {g.contrato_url ? (
                    <button onClick={() => viewContract(g.id)} className="btn btn-xs btn-soft flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      {t('guests.view_contract')}
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input id={`gfile-${g.id}`} type="file" className="file-input file-input-sm max-w-28" accept=".pdf" onChange={() => setUploading({ id: g.id })} />
                      {uploading.id === g.id && <button className="btn btn-sm btn-primary" onClick={() => handleUpload(g.id)}>{t('guests.upload')}</button>}
                    </div>
                  )}
                </td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(g)}>{t('common.edit')}</button>
                </td>
              </tr>
            ))}
            {guests.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center opacity-60 py-8">{t('guests.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {guests.length === 0 && (
          <div className="text-center opacity-60 py-8">{t('guests.empty')}</div>
        )}
        {guests.map((g) => (
          <div key={g.id} className="card card-sm bg-base-100 border">
            <div className="card-body p-3 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {g.nombre?.charAt(0)}{g.apellidos?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{g.nombre} {g.apellidos}</div>
                    <div className="text-xs opacity-60 truncate">{g.email}</div>
                  </div>
                </div>
                <div className="flex gap-1 items-center shrink-0">
                  <button className="btn btn-xs btn-ghost" onClick={() => openEdit(g)}>{t('common.edit')}</button>
                  {g.estado !== 'baja' && (
                    <button className="btn btn-xs btn-warning" onClick={() => setConfirmDeparture(g)}>{t('guests.mark_departure')}</button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('guests.room')}:</span>
                  <span className="badge badge-soft badge-outline badge-xs room-number">{g.habitacion || t('common.unassigned')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('guests.entry')}:</span>
                  <span>{g.fecha_entrada ? new Date(g.fecha_entrada).toLocaleDateString('es-ES') : '-'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('guests.exit_planned')}:</span>
                  <span>{g.fecha_salida_prevista ? new Date(g.fecha_salida_prevista).toLocaleDateString('es-ES') : '-'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('guests.status')}:</span>
                  {statusBadge(g.estado)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="opacity-50">{t('guests.contract')}:</span>
                {g.contrato_url ? (
                  <button onClick={() => viewContract(g.id)} className="btn btn-xs btn-soft">{t('guests.view_contract')}</button>
                ) : (
                  <div className="flex gap-1 items-center flex-1">
                    <input id={`gfile-${g.id}`} type="file" className="file-input file-input-xs max-w-20" accept=".pdf" onChange={() => setUploading({ id: g.id })} />
                    {uploading.id === g.id && <button className="btn btn-xs btn-primary" onClick={() => handleUpload(g.id)}>{t('guests.upload')}</button>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{editing ? t('guests.edit_title') : t('guests.create_title')}</h3>
                <p className="text-sm opacity-60">{editing ? t('guests.edit_desc') : t('guests.create_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <fieldset className="rounded-box p-4">
                <legend className="font-medium text-sm px-1 text-primary">{t('guests.section_personal')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('guests.name')}</span></label>
                    <input className="input input-bordered" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required disabled={!!editing} placeholder={t('guests.name_placeholder')} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('guests.surname')}</span></label>
                    <input className="input input-bordered" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} disabled={!!editing} placeholder={t('guests.surname_placeholder')} />
                  </div>
                </div>
                <div className="form-control mt-3">
                  <label className="label"><span className="label-text">{t('guests.email')}</span></label>
                  <input type="email" className="input input-bordered" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} placeholder={t('guests.email_placeholder')} />
                </div>
                {!editing && (
                  <div className="form-control mt-3">
                    <label className="label"><span className="label-text">{t('guests.password')}</span></label>
                    <input type="password" className="input input-bordered" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder={t('guests.password_placeholder')} />
                  </div>
                )}
                <div className="form-control mt-3">
                  <label className="label"><span className="label-text">{t('guests.phone')}</span></label>
                  <input className="input input-bordered" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} disabled={!!editing} placeholder={t('guests.phone_placeholder')} />
                </div>
              </fieldset>

              <fieldset className="rounded-box p-4">
                <legend className="font-medium text-sm px-1 text-primary">{t('guests.section_housing')}</legend>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('guests.room')}</span></label>
                  <select
                    className="select select-bordered"
                    value={form.habitacion}
                    onChange={(e) => setForm({ ...form, habitacion: e.target.value })}
                  >
                    <option value="">{t('common.unassigned')}</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.nombre}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('guests.entry_date')}</span></label>
                    <input type="date" className="input input-bordered" value={form.fecha_entrada} onChange={(e) => updateForm({ fecha_entrada: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('guests.exit_date')}</span></label>
                    <input type="date" className="input input-bordered" value={form.fecha_salida_prevista} onChange={(e) => updateForm({ fecha_salida_prevista: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <div className="modal-action mt-2">
                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? t('common.save') : t('guests.register')}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {confirmDeparture && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-2">{t('guests.departure_modal_title')}</h3>
            <p className="text-sm opacity-70">{t('guests.confirm_departure', { nombre: confirmDeparture.nombre, apellidos: confirmDeparture.apellidos })}</p>
            <div className="modal-action">
              <button className="btn btn-soft" onClick={() => setConfirmDeparture(null)}>{t('common.cancel')}</button>
              <button className="btn btn-warning" onClick={() => handleMarkDeparture(confirmDeparture)}>
                {t('guests.departure_confirm')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
