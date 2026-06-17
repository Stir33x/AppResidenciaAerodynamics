import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'

export default function StudentsPage() {
  const { t } = useTranslation()
  const [students, setStudents] = useState([])
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellidos: '', telefono: '', habitacion: '', fecha_entrada: '', fecha_salida_prevista: '', cuota_mensual: '', facturar_cada: '1' })
  const [uploading, setUploading] = useState({ id: null })

  const load = async () => {
    const data = await fetchApi('/students')
    setStudents(data)
  }

  useEffect(() => { load() }, [])

  const loadRooms = async (editingStudent, formOverride) => {
    try {
      const f = formOverride || form
      const params = new URLSearchParams()
      if (f.fecha_entrada) params.set('fecha_entrada', f.fecha_entrada)
      if (f.fecha_salida_prevista) params.set('fecha_salida_prevista', f.fecha_salida_prevista)
      if (editingStudent?.id) params.set('exclude_student_id', editingStudent.id)
      const qs = params.toString()
      const data = await fetchApi(`/rooms/available${qs ? `?${qs}` : ''}`)
      if (editingStudent && editingStudent.habitacion) {
        const alreadyIncluded = data.find((r) => r.nombre === editingStudent.habitacion)
        if (!alreadyIncluded) {
          data.push({ id: -1, nombre: editingStudent.habitacion })
        }
      }
      setRooms(data)
    } catch {
      setRooms([])
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ email: '', password: '', nombre: '', apellidos: '', telefono: '', habitacion: '', fecha_entrada: '', fecha_salida_prevista: '', cuota_mensual: '', facturar_cada: '1' })
    loadRooms(null)
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    const f = {
      email: s.email, password: '', nombre: s.nombre, apellidos: s.apellidos,
      telefono: s.telefono, habitacion: s.habitacion,
      fecha_entrada: s.fecha_entrada ? s.fecha_entrada.slice(0, 10) : '',
      fecha_salida_prevista: s.fecha_salida_prevista ? s.fecha_salida_prevista.slice(0, 10) : '',
      cuota_mensual: s.cuota_mensual || '',
      facturar_cada: s.facturar_cada || '1',
    }
    setForm(f)
    loadRooms(s, f)
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
        await fetchApi(`/students/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            habitacion: form.habitacion || null,
            fecha_entrada: form.fecha_entrada || null,
            fecha_salida_prevista: form.fecha_salida_prevista || null,
            cuota_mensual: form.cuota_mensual ? parseFloat(form.cuota_mensual) : undefined,
            facturar_cada: form.facturar_cada ? parseInt(form.facturar_cada) : undefined,
          }),
        })
      } else {
        await fetchApi('/students', {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleAcceso = async (s) => {
    await fetchApi(`/students/${s.id}/acceso`, {
      method: 'PUT',
      body: JSON.stringify({ acceso: s.acceso_habitacion ? 0 : 1 }),
    })
    load()
  }

  const handleUpload = async (studentId) => {
    const fileInput = document.getElementById(`file-${studentId}`)
    const file = fileInput?.files?.[0]
    if (!file) return

    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)

    await fetch(`http://localhost:3000/api/students/${studentId}/contrato`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    load()
  }

  const statusBadge = (estado) => {
    const cls = { activo: 'badge-success', pendiente_salida: 'badge-warning', baja: 'badge-error' }
    const txt = { activo: t('common.active'), pendiente_salida: t('common.pending_departure'), baja: t('common.inactive') }
    return <span className={`badge ${cls[estado] || ''}`}>{txt[estado] || estado}</span>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('students.title')}</h1>
        <button className="btn btn-primary" onClick={openCreate}>{t('students.new')}</button>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>{t('students.name')}</th>
              <th>{t('students.email')}</th>
              <th>{t('students.room')}</th>
              <th>{t('students.entry')}</th>
              <th>{t('students.exit_planned')}</th>
              <th>{t('students.status')}</th>
              <th>{t('students.amount')}</th>
              <th>{t('students.every')}</th>
              <th>{t('students.access')}</th>
              <th>{t('students.contract')}</th>
              <th>{t('students.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.nombre} {s.apellidos}</td>
                <td>{s.email}</td>
                <td><span className="badge badge-soft badge-outline">{s.habitacion || t('common.unassigned')}</span></td>
                <td>{s.fecha_entrada ? new Date(s.fecha_entrada).toLocaleDateString() : '-'}</td>
                <td>{s.fecha_salida_prevista ? new Date(s.fecha_salida_prevista).toLocaleDateString() : '-'}</td>
                <td>{statusBadge(s.estado)}</td>
                <td>{parseFloat(s.cuota_mensual || 0).toFixed(2)} €</td>
                <td className="text-sm">{s.facturar_cada > 1 ? t('common.every_n_months', { n: s.facturar_cada }) : t('common.monthly')}</td>
                <td>
                  <input type="checkbox" className="toggle toggle-sm" checked={!!s.acceso_habitacion} onChange={() => toggleAcceso(s)} />
                </td>
                <td>
                  {s.contrato_url ? (
                    <a href={`http://localhost:3000${s.contrato_url}`} target="_blank" className="link link-primary text-sm flex items-center gap-1" rel="noreferrer">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      {t('students.view_contract')}
                    </a>
                  ) : (
                    <div className="flex gap-1 items-center">
                      <input id={`file-${s.id}`} type="file" className="file-input file-input-xs max-w-24" accept=".pdf" onChange={() => setUploading({ id: s.id })} />
                      {uploading.id === s.id && <button className="btn btn-xs btn-primary" onClick={() => handleUpload(s.id)}>{t('students.upload')}</button>}
                    </div>
                  )}
                </td>
                <td className="flex gap-1">
                  <button className="btn btn-xs btn-ghost" onClick={() => openEdit(s)}>{t('common.edit')}</button>
                  {s.estado === 'pendiente_salida' && (
                    <button
                      className="btn btn-xs btn-warning"
                      onClick={async () => {
                        if (confirm(t('students.confirm_departure', { name: `${s.nombre} ${s.apellidos}` }))) {
                          await fetchApi(`/students/${s.id}/marcar-salida`, { method: 'PUT' })
                          load()
                        }
                      }}
                    >
                      {t('students.mark_departure')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center opacity-60 py-8">{t('students.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
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
                <h3 className="font-bold text-lg">{editing ? t('students.edit_title') : t('students.create_title')}</h3>
                <p className="text-sm opacity-60">{editing ? t('students.edit_desc') : t('students.create_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <fieldset className="border border-base-300 rounded-box p-4">
                <legend className="font-medium text-sm px-1 text-primary">{t('students.section_personal')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('students.name')}</span></label>
                    <input className="input input-bordered" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required disabled={!!editing} placeholder={t('students.name_placeholder')} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('students.surname')}</span></label>
                    <input className="input input-bordered" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} disabled={!!editing} placeholder={t('students.surname_placeholder')} />
                  </div>
                </div>
                <div className="form-control mt-3">
                  <label className="label"><span className="label-text">{t('students.email')}</span></label>
                  <input type="email" className="input input-bordered" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} placeholder={t('students.email_placeholder')} />
                </div>
                {!editing && (
                  <div className="form-control mt-3">
                    <label className="label"><span className="label-text">{t('students.password')}</span></label>
                    <input type="password" className="input input-bordered" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder={t('students.password_placeholder')} />
                  </div>
                )}
                <div className="form-control mt-3">
                  <label className="label"><span className="label-text">{t('students.phone')}</span></label>
                  <input className="input input-bordered" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} disabled={!!editing} placeholder={t('students.phone_placeholder')} />
                </div>
              </fieldset>

              <fieldset className="border border-base-300 rounded-box p-4">
                <legend className="font-medium text-sm px-1 text-primary">{t('students.section_housing')}</legend>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('students.room')}</span></label>
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
                    <label className="label"><span className="label-text">{t('students.entry_date')}</span></label>
                    <input type="date" className="input input-bordered" value={form.fecha_entrada} onChange={(e) => updateForm({ fecha_entrada: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('students.exit_date')}</span></label>
                    <input type="date" className="input input-bordered" value={form.fecha_salida_prevista} onChange={(e) => updateForm({ fecha_salida_prevista: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border border-base-300 rounded-box p-4">
                <legend className="font-medium text-sm px-1 text-primary">{t('students.section_billing')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('students.receipt_amount')}</span></label>
                    <div className="join w-full">
                      <input type="number" step="0.01" className="input input-bordered join-item flex-1" value={form.cuota_mensual} onChange={(e) => setForm({ ...form, cuota_mensual: e.target.value })} placeholder="0.00" />
                      <span className="join-item bg-base-200 flex items-center px-3 text-sm opacity-60">€</span>
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('students.billing_frequency')}</span></label>
                    <select className="select select-bordered" value={form.facturar_cada} onChange={(e) => setForm({ ...form, facturar_cada: e.target.value })}>
                      <option value="1">{t('common.1_month')}</option>
                      <option value="2">{t('common.2_months')}</option>
                      <option value="3">{t('common.3_months')}</option>
                      <option value="6">{t('common.6_months')}</option>
                      <option value="12">{t('common.12_months')}</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              <div className="modal-action mt-2">
                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editing ? t('common.save') : t('students.create_title')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
