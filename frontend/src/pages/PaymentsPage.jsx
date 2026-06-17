import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'

const estados = ['pendiente', 'cobrado', 'vencido', 'anulado']
const COLORS = { cobrado: '#22c55e', pendiente: '#f59e0b', vencido: '#ef4444', projected: '#60a5fa' }

export default function PaymentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isStaff = user?.rol !== 'estudiante'
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    student_id: '', periodo: '', importe: '',
    fecha_vencimiento: '', fecha_cobro: '', referencia_mandato: '',
  })
  const [forecast, setForecast] = useState(null)

  const load = async () => {
    const qs = filtroEstado ? `?estado=${filtroEstado}` : ''
    const data = await fetchApi(`/pagos${qs}`)
    setPayments(data)
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [filtroEstado])
  useEffect(() => { if (isStaff) fetchApi('/students').then(setStudents) }, [isStaff])
  useEffect(() => { if (isStaff) fetchApi('/pagos/forecast').then(setForecast) }, [isStaff])

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

  const estadoBadge = (e) => {
    const cls = { pendiente: 'badge-soft badge-info', cobrado: 'badge-soft badge-success', vencido: 'badge-soft badge-error', anulado: 'badge-soft badge-neutral' }
    return <span className={`badge ${cls[e] || ''}`}>{t(`payment_states.${e}`)}</span>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">{t('payments.title')}</h1>
        {isStaff && (
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={openCreate}>{t('payments.new')}</button>
          </div>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-sm opacity-70">{t('payments.filter')}</span>
        <select className="select select-bordered select-sm" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">{t('payments.all_statuses')}</option>
          {estados.map((e) => <option key={e} value={e}>{t(`payment_states.${e}`)}</option>)}
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
              {isStaff && <th>{t('payments.student')}</th>}
              {isStaff && <th>{t('payments.room')}</th>}
              <th>{t('payments.period')}</th>
              <th>{t('payments.amount')}</th>
              <th>{t('payments.due_date')}</th>
              <th>{t('payments.payment_date')}</th>
              <th>{t('payments.status')}</th>
              <th>{t('payments.mandate')}</th>
              {isStaff && <th>{t('payments.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                {isStaff && <td>{p.nombre} {p.apellidos}</td>}
                {isStaff && <td>{p.habitacion}</td>}
                <td>{p.periodo}</td>
                <td>{parseFloat(p.importe).toFixed(2)} €</td>
                <td>{p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString('es-ES') : '-'}</td>
                <td>{p.fecha_cobro ? new Date(p.fecha_cobro).toLocaleDateString('es-ES') : '-'}</td>
                <td>{estadoBadge(p.estado)}</td>
                <td className="text-sm opacity-60">{p.referencia_mandato || '-'}</td>
                {isStaff && (
                  <td>
                    <button className="btn btn-xs btn-ghost" onClick={() => openEdit(p)}>{t('payments.edit_title')}</button>
                  </td>
                )}
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={isStaff ? 9 : 6} className="text-center opacity-60 py-8">{t('payments.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{editing ? t('payments.edit_title') : t('payments.create_title')}</h3>
                <p className="text-sm opacity-60">{editing ? t('payments.edit_desc') : t('payments.create_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
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
                  <div className="join w-full">
                    <span className="join-item bg-base-200 flex items-center px-3 text-sm opacity-60">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    </span>
                    <input className="input input-bordered join-item flex-1" value={`${editing.nombre} ${editing.apellidos}`} disabled />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.period')}</span></label>
                  <input className="input input-bordered" placeholder={t('payments.period_placeholder')} value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.amount')}</span></label>
                  <div className="join w-full">
                    <input type="number" step="0.01" className="input input-bordered join-item flex-1" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} required placeholder="0.00" />
                    <span className="join-item bg-base-200 flex items-center px-3 text-sm opacity-60">€</span>
                  </div>
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
                <input className="input input-bordered" value={form.referencia_mandato} onChange={(e) => setForm({ ...form, referencia_mandato: e.target.value })} placeholder={t('payments.mandate_placeholder')} />
              </div>
              {editing && (
                <div className="form-control">
                  <label className="label"><span className="label-text">{t('payments.status')}</span></label>
                  <select className="select select-bordered" value={form.estado || editing.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    {estados.map((e) => <option key={e} value={e}>{t(`payment_states.${e}`)}</option>)}
                  </select>
                </div>
              )}
              <div className="modal-action">
                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editing ? t('common.save') : t('payments.new')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
