import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'

const estados = ['pendiente', 'cobrado', 'vencido', 'anulado']
const COLORS = { cobrado: '#22c55e', pendiente: '#f59e0b', vencido: '#ef4444', projected: '#60a5fa' }

export default function PaymentsPage() {
  const { t } = useTranslation()
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    student_id: '', periodo: '', importe: '',
    fecha_vencimiento: '', fecha_cobro: '', referencia_mandato: '',
  })
  const [showGenerar, setShowGenerar] = useState(false)
  const [genForm, setGenForm] = useState({ student_id: '', importe: '', facturar_cada: 1, num_pagos: 3 })
  const [genMsg, setGenMsg] = useState('')
  const [forecast, setForecast] = useState(null)

  const load = async () => {
    const qs = filtroEstado ? `?estado=${filtroEstado}` : ''
    const data = await fetchApi(`/pagos${qs}`)
    setPayments(data)
  }

  useEffect(() => { load() }, [filtroEstado])
  useEffect(() => { fetchApi('/students').then(setStudents) }, [])
  useEffect(() => { fetchApi('/pagos/forecast').then(setForecast) }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ student_id: '', periodo: '', importe: '', fecha_vencimiento: '', fecha_cobro: '', referencia_mandato: '' })
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      student_id: p.student_id,
      periodo: p.periodo,
      importe: p.importe,
      fecha_vencimiento: p.fecha_vencimiento ? p.fecha_vencimiento.slice(0, 10) : '',
      fecha_cobro: p.fecha_cobro ? p.fecha_cobro.slice(0, 10) : '',
      referencia_mandato: p.referencia_mandato || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (editing) {
      await fetchApi(`/pagos/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          importe: form.importe ? parseFloat(form.importe) : undefined,
          fecha_vencimiento: form.fecha_vencimiento || undefined,
          fecha_cobro: form.fecha_cobro || null,
          estado: form.estado || undefined,
          referencia_mandato: form.referencia_mandato || undefined,
        }),
      })
    } else {
      await fetchApi('/pagos', {
        method: 'POST',
        body: JSON.stringify({
          student_id: parseInt(form.student_id),
          periodo: form.periodo,
          importe: parseFloat(form.importe),
          fecha_vencimiento: form.fecha_vencimiento,
          fecha_cobro: form.fecha_cobro || null,
          referencia_mandato: form.referencia_mandato,
        }),
      })
    }
    setShowModal(false)
    load()
  }

  const openGenerar = () => {
    setGenForm({ student_id: '', importe: '', facturar_cada: 1, num_pagos: 3 })
    setGenMsg('')
    setShowGenerar(true)
  }

  const handleGenerar = async (e) => {
    e.preventDefault()
    setGenMsg('')
    try {
      const data = await fetchApi('/pagos/generar', {
        method: 'POST',
        body: JSON.stringify({
          student_id: parseInt(genForm.student_id),
          cada_meses: parseInt(genForm.facturar_cada),
          num_pagos: parseInt(genForm.num_pagos),
          importe: parseFloat(genForm.importe),
        }),
      })
      setGenMsg(t('payments.success', { count: data.creados, amount: parseFloat(genForm.importe).toFixed(2) }))
      load()
    } catch (err) { setGenMsg(t('common.error') + ': ' + err.message) }
  }

  const estadoBadge = (e) => {
    const cls = { pendiente: 'badge-soft badge-info', cobrado: 'badge-soft badge-success', vencido: 'badge-soft badge-error', anulado: 'badge-soft badge-neutral' }
    return <span className={`badge ${cls[e] || ''}`}>{e}</span>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">{t('payments.title')}</h1>
        <div className="flex gap-2">
          <button className="btn btn-soft" onClick={openGenerar}>{t('payments.generate')}</button>
          <button className="btn btn-primary" onClick={openCreate}>{t('payments.new')}</button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-sm opacity-70">{t('payments.filter')}</span>
        <select className="select select-bordered select-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">{t('payments.all_statuses')}</option>
          {estados.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {forecast && (
        <div className="card bg-base-100 shadow-sm border">
          <div className="card-body">
            <h2 className="card-title">{t('payments.chart_title')}</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  const merged = {}
                  for (const r of forecast.realPayments) {
                    merged[r.periodo] = { periodo: r.periodo, cobrado: parseFloat(r.cobrado), pendiente: parseFloat(r.pendiente), vencido: parseFloat(r.vencido), projected: 0 }
                  }
                  for (const p of forecast.projection) {
                    if (merged[p.periodo]) merged[p.periodo].projected = p.projected
                    else merged[p.periodo] = { periodo: p.periodo, cobrado: 0, pendiente: 0, vencido: 0, projected: p.projected }
                  }
                  return Object.values(merged)
                })()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v.toFixed(2)} €`} />
                  <Legend />
                  <Bar dataKey="cobrado" fill={COLORS.cobrado} name={t('payments.collected')} stackId="a" />
                  <Bar dataKey="pendiente" fill={COLORS.pendiente} name={t('payments.pending')} stackId="a" />
                  <Bar dataKey="vencido" fill={COLORS.vencido} name={t('payments.overdue')} stackId="a" />
                  <Bar dataKey="projected" fill={COLORS.projected} name={t('payments.projected')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>{t('payments.student')}</th>
              <th>{t('payments.room')}</th>
              <th>{t('payments.period')}</th>
              <th>{t('payments.amount')}</th>
              <th>{t('payments.due_date')}</th>
              <th>{t('payments.payment_date')}</th>
              <th>{t('payments.status')}</th>
              <th>{t('payments.mandate')}</th>
              <th>{t('payments.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre} {p.apellidos}</td>
                <td>{p.habitacion}</td>
                <td>{p.periodo}</td>
                <td>{parseFloat(p.importe).toFixed(2)} €</td>
                <td>{p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString() : '-'}</td>
                <td>{p.fecha_cobro ? new Date(p.fecha_cobro).toLocaleDateString() : '-'}</td>
                <td>{estadoBadge(p.estado)}</td>
                <td className="text-sm opacity-60">{p.referencia_mandato || '-'}</td>
                <td>
                  <button className="btn btn-xs btn-ghost" onClick={() => openEdit(p)}>{t('payments.edit_title')}</button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={9} className="text-center opacity-60 py-8">{t('payments.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{editing ? t('payments.edit_title') : t('payments.create_title')}</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              {!editing && (
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.student')}</span></label>
                  <select className="select select-bordered" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
                    <option value="">{t('common.select')}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre} {s.apellidos} — {s.habitacion}</option>
                    ))}
                  </select>
                </div>
              )}
              {editing && (
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.student')}</span></label>
                  <input className="input input-bordered" value={`${editing.nombre} ${editing.apellidos}`} disabled />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.period')}</span></label>
                  <input className="input input-bordered" placeholder={t('payments.period_placeholder')} value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.amount')} (€)</span></label>
                  <input type="number" step="0.01" className="input input-bordered" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.due_date')}</span></label>
                  <input type="date" className="input input-bordered" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.payment_date')}</span></label>
                  <input type="date" className="input input-bordered" value={form.fecha_cobro} onChange={(e) => setForm({ ...form, fecha_cobro: e.target.value })} />
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('payments.mandate_ref')}</span></label>
                <input className="input input-bordered" value={form.referencia_mandato} onChange={(e) => setForm({ ...form, referencia_mandato: e.target.value })} />
              </div>
              {editing && (
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.status')}</span></label>
                  <select className="select select-bordered" value={form.estado || editing.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    {estados.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              )}
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editing ? t('common.save') : t('payments.new')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {showGenerar && (
        <dialog className="modal modal-open" onClick={() => setShowGenerar(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{t('payments.generate_title')}</h3>
            <form onSubmit={handleGenerar} className="flex flex-col gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('payments.student')}</span></label>
                <select className="select select-bordered" value={genForm.student_id} onChange={(e) => {
                  const s = students.find((st) => st.id === parseInt(e.target.value))
                  setGenForm({
                    ...genForm,
                    student_id: e.target.value,
                    importe: s?.cuota_mensual || '',
                    facturar_cada: s?.facturar_cada || 1,
                  })
                }} required>
                  <option value="">{t('common.select')}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre} {s.apellidos}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.receipt_amount')}</span></label>
                  <input type="number" step="0.01" className="input input-bordered" value={genForm.importe} onChange={(e) => setGenForm({ ...genForm, importe: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.frequency')}</span></label>
                  <select className="select select-bordered" value={genForm.facturar_cada} onChange={(e) => setGenForm({ ...genForm, facturar_cada: e.target.value })}>
                    <option value="1">{t('common.1_month')}</option>
                    <option value="2">{t('common.2_months')}</option>
                    <option value="3">{t('common.3_months')}</option>
                    <option value="6">{t('common.6_months')}</option>
                    <option value="12">{t('common.12_months')}</option>
                  </select>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('payments.num_receipts')}</span></label>
                <input type="number" min="1" max="36" className="input input-bordered" value={genForm.num_pagos} onChange={(e) => setGenForm({ ...genForm, num_pagos: e.target.value })} required />
              </div>
              <div className="modal-action flex-col items-stretch">
                {genMsg && <p className="text-sm text-success text-center">{genMsg}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" className="btn" onClick={() => setShowGenerar(false)}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn-primary">{t('payments.generate')}</button>
                </div>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
