import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useToast } from '../components/Toast'

export default function StudentsPage() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [students, setStudents] = useState([])
  const [rooms, setRooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellidos: '', telefono: '', habitacion: '', fecha_entrada: '', fecha_salida_prevista: '', cuota_mensual: '', facturar_cada: '1' })
  const [uploading, setUploading] = useState({ id: null })
  const [showDepartureModal, setShowDepartureModal] = useState(false)
  const [departureStudent, setDepartureStudent] = useState(null)
  const [departureItems, setDepartureItems] = useState([])
  const [departureLogs, setDepartureLogs] = useState([])
  const [departureChecklistStates, setDepartureChecklistStates] = useState({})
  const [departureInventory, setDepartureInventory] = useState([])
  const [departureSubmitting, setDepartureSubmitting] = useState(false)
  const [departurePendingPayments, setDeparturePendingPayments] = useState([])
  const [regItems, setRegItems] = useState([])
  const [regChecklistStates, setRegChecklistStates] = useState({})
  const [storageItems, setStorageItems] = useState([])
  const [selectedInvItems, setSelectedInvItems] = useState({})

  const load = async () => {
    const data = await fetchApi('/students')
    setStudents(data)
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [])

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

  const openCreate = async () => {
    setEditing(null)
    setForm({ email: '', password: '', nombre: '', apellidos: '', telefono: '', habitacion: '', fecha_entrada: '', fecha_salida_prevista: '', cuota_mensual: '', facturar_cada: '1' })
    setSelectedInvItems({})
    loadRooms(null)
    try {
      const items = await fetchApi('/registration-checklist/items')
      setRegItems(items)
      const states = {}
      items.forEach((item) => {
        states[item.id] = !!item.obligatorio
      })
      setRegChecklistStates(states)
    } catch {
      setRegItems([])
      setRegChecklistStates({})
    }
    try {
      const data = await fetchApi('/inventory?tipo=almacen')
      setStorageItems(data)
    } catch {
      setStorageItems([])
    }
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

  const toggleRegChecklist = (itemId, obligatorio) => {
    if (obligatorio) return
    setRegChecklistStates((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
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
        const created = await fetchApi('/students', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        const itemsPayload = regItems.map((item) => ({
          checklist_item_id: item.id,
          completada: !!regChecklistStates[item.id],
        }))
        await fetchApi(`/registration-checklist/logs/${created.id}`, {
          method: 'POST',
          body: JSON.stringify({ items: itemsPayload }),
        })
        const invItems = Object.entries(selectedInvItems).filter(([, qty]) => qty > 0).map(([catalog_id, cantidad]) => ({ catalog_id: parseInt(catalog_id), cantidad }))
        if (invItems.length > 0 && form.habitacion) {
          await fetchApi('/inventory/assign-from-storage', {
            method: 'POST',
            body: JSON.stringify({ room_name: form.habitacion, items: invItems }),
          })
        }
      }
      setShowModal(false)
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
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

  const statusBadge = (estado, sm) => {
    const cls = { activo: 'badge-success', pendiente_salida: 'badge-warning', baja: 'badge-error' }
    const txt = { activo: t('common.active'), pendiente_salida: t('common.pending_departure'), baja: t('common.inactive') }
    return <span className={`badge ${sm ? 'badge-sm' : ''} ${cls[estado] || ''}`}>{txt[estado] || estado}</span>
  }

  const openDepartureModal = async (s) => {
    setDepartureStudent(s)
    setShowDepartureModal(true)
    setDepartureSubmitting(false)
    setDepartureChecklistStates({})
    try {
      const [items, logs, inventory, payments] = await Promise.all([
        fetchApi('/departure-checklist/items'),
        fetchApi(`/departure-checklist/logs/${s.id}`),
        s.habitacion ? fetchApi(`/inventory?tipo=room&room_name=${encodeURIComponent(s.habitacion)}`) : Promise.resolve([]),
        fetchApi(`/pagos?student_id=${s.id}&estado=pendiente`),
      ])
      setDepartureItems(items)
      setDepartureLogs(logs)
      setDepartureInventory(inventory)
      setDeparturePendingPayments(payments)
      const states = {}
      items.forEach((item) => {
        const log = logs.find((l) => l.checklist_item_id === item.id)
        states[item.id] = !!log?.completada
      })
      setDepartureChecklistStates(states)
    } catch {
      setDepartureItems([])
      setDepartureLogs([])
      setDepartureInventory([])
      setDeparturePendingPayments([])
    }
  }

  const toggleDepartureChecklist = (itemId) => {
    setDepartureChecklistStates((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const handleConfirmDeparture = async () => {
    if (!departureStudent) return
    setDepartureSubmitting(true)
    try {
      const itemsPayload = departureItems.map((item) => ({
        checklist_item_id: item.id,
        completada: !!departureChecklistStates[item.id],
      }))
      await fetchApi(`/departure-checklist/logs/${departureStudent.id}`, {
        method: 'POST',
        body: JSON.stringify({ items: itemsPayload }),
      })
      if (departureInventory.length > 0) {
        await fetchApi('/inventory/move-to-storage', {
          method: 'POST',
          body: JSON.stringify({ item_ids: departureInventory.map((i) => i.id) }),
        })
      }
      await fetchApi(`/students/${departureStudent.id}/marcar-salida`, { method: 'PUT' })
      setShowDepartureModal(false)
      setDepartureStudent(null)
      load()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setDepartureSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('students.title')}</h1>
        <button className="btn btn-primary" onClick={openCreate}>{t('students.register')}</button>
      </div>

      {/* Desktop table */}
      <div className="overflow-x-auto hidden lg:block">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>{t('students.name')}</th>
              <th>{t('students.email')}</th>
              <th>{t('students.room')}</th>
              <th>{t('students.entry')}</th>
              <th>{t('students.exit_planned')}</th>
              <th>{t('students.status')}</th>
              <th className="text-right">{t('students.amount')}</th>
              <th>{t('students.every')}</th>
              <th>{t('students.departure')}</th>
              <th>{t('students.contract')}</th>
              <th>{t('students.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.nombre} {s.apellidos}</td>
                <td className="opacity-70">{s.email}</td>
                <td><span className="badge badge-soft badge-outline room-number">{s.habitacion || t('common.unassigned')}</span></td>
                <td className="whitespace-nowrap">{s.fecha_entrada ? new Date(s.fecha_entrada).toLocaleDateString('es-ES') : '-'}</td>
                <td className="whitespace-nowrap">{s.fecha_salida_prevista ? new Date(s.fecha_salida_prevista).toLocaleDateString('es-ES') : '-'}</td>
                <td>{statusBadge(s.estado)}</td>
                <td className="text-right whitespace-nowrap font-mono">{parseFloat(s.cuota_mensual || 0).toFixed(2)}€</td>
                <td>{s.facturar_cada > 1 ? t('common.every_n_months', { n: s.facturar_cada }) : t('common.monthly')}</td>
                <td>
                  {s.estado !== 'baja' ? (
                    <button className="btn btn-sm btn-warning" onClick={() => openDepartureModal(s)}>
                      {t('students.mark_departure')}
                    </button>
                  ) : (
                    <span className="text-xs opacity-50">{t('common.inactive')}</span>
                  )}
                </td>
                <td>
                  {s.contrato_url ? (
                    <a href={`http://localhost:3000${s.contrato_url}`} target="_blank" className="link link-primary flex items-center gap-1" rel="noreferrer">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      {t('students.view_contract')}
                    </a>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input id={`file-${s.id}`} type="file" className="file-input file-input-sm max-w-28" accept=".pdf" onChange={() => setUploading({ id: s.id })} />
                      {uploading.id === s.id && <button className="btn btn-sm btn-primary" onClick={() => handleUpload(s.id)}>{t('students.upload')}</button>}
                    </div>
                  )}
                </td>
                <td>
                  <div className="flex gap-2 items-center">
                  <button className="btn btn-sm btn-ghost" onClick={() => openEdit(s)}>{t('common.edit')}</button>
                  </div>
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

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {students.length === 0 && (
          <div className="text-center opacity-60 py-8">{t('students.empty')}</div>
        )}
        {students.map((s) => (
          <div key={s.id} className="card card-sm bg-base-100 border">
            <div className="card-body p-3 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {s.nombre?.charAt(0)}{s.apellidos?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.nombre} {s.apellidos}</div>
                    <div className="text-xs opacity-60 truncate">{s.email}</div>
                  </div>
                </div>
                <div className="flex gap-1 items-center shrink-0">
                  <button className="btn btn-xs btn-ghost" onClick={() => openEdit(s)}>{t('common.edit')}</button>
                  {s.estado !== 'baja' && (
                    <button className="btn btn-xs btn-warning" onClick={() => openDepartureModal(s)}>{t('students.mark_departure')}</button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('students.room')}:</span>
                  <span className="badge badge-soft badge-outline badge-xs room-number">{s.habitacion || t('common.unassigned')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('students.entry')}:</span>
                  <span>{s.fecha_entrada ? new Date(s.fecha_entrada).toLocaleDateString('es-ES') : '-'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('students.exit_planned')}:</span>
                  <span>{s.fecha_salida_prevista ? new Date(s.fecha_salida_prevista).toLocaleDateString('es-ES') : '-'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('students.status')}:</span>
                  {statusBadge(s.estado)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('students.amount')}:</span>
                  <span className="font-mono">{parseFloat(s.cuota_mensual || 0).toFixed(2)}€</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('students.every')}:</span>
                  <span>{s.facturar_cada > 1 ? t('common.every_n_months', { n: s.facturar_cada }) : t('common.monthly')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-50">{t('students.departure')}:</span>
                  {s.estado !== 'baja' ? (
                    <button className="btn btn-xs btn-warning" onClick={() => openDepartureModal(s)}>{t('students.mark_departure')}</button>
                  ) : (
                    <span className="text-xs opacity-50">{t('common.inactive')}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="opacity-50">{t('students.contract')}:</span>
                {s.contrato_url ? (
                  <a href={`http://localhost:3000${s.contrato_url}`} target="_blank" className="link link-primary" rel="noreferrer">{t('students.view_contract')}</a>
                ) : (
                  <div className="flex gap-1 items-center flex-1">
                    <input id={`file-${s.id}`} type="file" className="file-input file-input-xs max-w-20" accept=".pdf" onChange={() => setUploading({ id: s.id })} />
                    {uploading.id === s.id && <button className="btn btn-xs btn-primary" onClick={() => handleUpload(s.id)}>{t('students.upload')}</button>}
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
                <h3 className="font-bold text-lg">{editing ? t('students.edit_title') : t('students.create_title')}</h3>
                <p className="text-sm opacity-60">{editing ? t('students.edit_desc') : t('students.create_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {!editing && regItems.length > 0 && (
                <fieldset className="rounded-box p-4">
                  <legend className="font-medium text-sm px-1 text-primary">{t('students.registration_checklist')}</legend>
                  <div className="flex flex-col gap-2">
                    {regItems.map((item) => (
                      <label key={item.id} className={`flex items-center gap-2 cursor-pointer ${item.obligatorio ? 'opacity-80' : ''}`}>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={!!regChecklistStates[item.id]}
                          onChange={() => toggleRegChecklist(item.id, item.obligatorio)}
                          disabled={item.obligatorio}
                        />
                        <span className="text-sm">{item.nombre}</span>
                        {item.obligatorio && <span className="text-xs opacity-50">({t('common.required')})</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <fieldset className="rounded-box p-4">
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

              <fieldset className="rounded-box p-4">
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

              {!editing && storageItems.length > 0 && (
                <fieldset className="rounded-box p-4">
                  <legend className="font-medium text-sm px-1 text-primary">{t('students.inventory_assignment')}</legend>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {storageItems.reduce((acc, item) => {
                      const existing = acc.find((a) => a.catalog_id === item.catalog_id)
                      if (existing) existing.cantidad += item.cantidad
                      else acc.push({ catalog_id: item.catalog_id, nombre: item.nombre, cantidad: item.cantidad })
                      return acc
                    }, []).filter((g) => g.cantidad > 0).map((group) => (
                      <div key={group.catalog_id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-base-200 transition-colors">
                        <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={!!selectedInvItems[group.catalog_id]} onChange={() => {
                          const next = { ...selectedInvItems }
                          if (next[group.catalog_id]) delete next[group.catalog_id]
                          else next[group.catalog_id] = 1
                          setSelectedInvItems(next)
                        }} />
                        <span className="text-sm flex-1">{group.nombre}</span>
                        <span className="text-xs opacity-50 mr-1">{t('common.available')}: {group.cantidad}</span>
                        {selectedInvItems[group.catalog_id] && (
                          <input type="number" className="input input-xs input-bordered w-16 text-center" min={1} max={group.cantidad} value={selectedInvItems[group.catalog_id]} onChange={(e) => {
                            const val = parseInt(e.target.value) || 0
                            setSelectedInvItems({ ...selectedInvItems, [group.catalog_id]: Math.min(Math.max(val, 1), group.cantidad) })
                          }} />
                        )}
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
              <fieldset className="rounded-box p-4">
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
                <button type="submit" className="btn btn-primary" disabled={!editing && regItems.length > 0 && regItems.some((item) => !regChecklistStates[item.id])}>
                  {editing ? t('common.save') : t('students.register')}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {showDepartureModal && departureStudent && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('students.departure_modal_title')}</h3>
                <p className="text-sm opacity-60">{t('students.departure_modal_desc', { name: `${departureStudent.nombre} ${departureStudent.apellidos}`, room: departureStudent.habitacion })}</p>
              </div>
            </div>

            <fieldset className="rounded-box p-4 mb-4">
              <legend className="font-medium text-sm px-1 text-warning">{t('students.departure_checklist')}</legend>
              <div className="flex flex-col gap-2">
                {departureItems.length === 0 && <p className="text-sm opacity-60">{t('students.no_checklist_items')}</p>}
                {departureItems.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-warning"
                      checked={!!departureChecklistStates[item.id]}
                      onChange={() => toggleDepartureChecklist(item.id)}
                    />
                    <span className="text-sm">{item.nombre}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {departureInventory.length > 0 && (
              <fieldset className="rounded-box p-4 mb-4">
                <legend className="font-medium text-sm px-1 text-primary">{t('students.departure_inventory', { room: departureStudent.habitacion })}</legend>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th className="text-right">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departureInventory.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.nombre}</td>
                        <td className="text-right">{inv.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </fieldset>
            )}

            {departurePendingPayments.length > 0 && (
              <div className="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                <div className="text-sm">
                  <span className="font-medium">{t('students.pending_payments_title')}</span>
                  <ul className="list-disc list-inside mt-1 opacity-80">
                    {departurePendingPayments.map((p) => (
                      <li key={p.id}>{p.periodo} — {parseFloat(p.importe).toFixed(2)} €</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-soft" onClick={() => { setShowDepartureModal(false); setDepartureStudent(null) }}>
                {t('students.departure_cancel')}
              </button>
              <button className="btn btn-warning" onClick={handleConfirmDeparture} disabled={departureSubmitting}>
                {departureSubmitting ? <span className="loading loading-spinner loading-xs" /> : null}
                {t('students.departure_confirm')}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
