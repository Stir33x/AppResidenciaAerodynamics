import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import ImageViewer from '../components/ImageViewer'
import SecureImage from '../components/SecureImage'

const localISO = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

const fmtDuration = (sec) => {
  if (sec == null || isNaN(sec)) return '0s'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

const shortDate = (iso) => {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function CleaningDashboardPage() {
  const { t } = useTranslation()
  const today = localISO(new Date())
  const daysAgo = (n) => localISO(new Date(new Date().getTime() - n * 86400000))

  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewPhoto, setViewPhoto] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchApi(`/cleaning/dashboard?from=${from}&to=${to}`)
      setData(res)
    } catch {
      setData(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const quickRange = (days) => {
    setFrom(daysAgo(days))
    setTo(today)
    setTimeout(load, 0)
  }

  const applyRange = () => { load() }

  const sum = data?.summary || {}

  const roomChartData = (data?.by_room || []).slice(0, 10).map((r) => ({
    name: r.room_name,
    segundos: r.total_seconds,
  }))

  const dayChartData = (data?.by_day || []).map((r) => ({
    name: shortDate(r.fecha),
    segundos: r.total_seconds,
  }))

  const tipoLabel = (tipo) => (tipo === 'zone' ? t('cleaning_dashboard.type_zone') : t('cleaning_dashboard.type_room'))

  const image = (url) => (
    url ? (
      <SecureImage src={url} alt="" className="w-10 h-10 object-cover rounded cursor-pointer border border-base-300" onClick={() => setViewPhoto(url)} />
    ) : (
      <span className="opacity-40">-</span>
    )
  )

  const statCards = [
    { key: 'total_cleanings', label: t('cleaning_dashboard.stat_cleanings'), value: sum.total_cleanings, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
    { key: 'total_time', label: t('cleaning_dashboard.stat_total_time'), value: fmtDuration(sum.total_time_seconds), color: 'text-accent', bg: 'bg-accent/5', border: 'border-accent/20' },
    { key: 'avg_time', label: t('cleaning_dashboard.stat_avg_time'), value: fmtDuration(sum.avg_time_seconds), color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
    { key: 'locations', label: t('cleaning_dashboard.stat_locations'), value: sum.locations_cleaned, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
    { key: 'photos', label: t('cleaning_dashboard.stat_photos'), value: sum.photos_count, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
    { key: 'staff', label: t('cleaning_dashboard.stat_staff'), value: sum.staff_count, color: 'text-error', bg: 'bg-error/5', border: 'border-error/20' },
  ]

  const chartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-box bg-base-100 border border-base-300 shadow p-2 text-xs">
        <div className="font-medium mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span>{p.name}: <b>{fmtDuration(p.value)}</b></span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">{t('cleaning_dashboard.title')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="join">
            {[
              { label: t('cleaning_dashboard.quick_today'), days: 0 },
              { label: t('cleaning_dashboard.quick_7'), days: 6 },
              { label: t('cleaning_dashboard.quick_30'), days: 29 },
              { label: t('cleaning_dashboard.quick_90'), days: 89 },
            ].map((q) => (
              <button key={q.days} className="btn btn-sm btn-soft join-item" onClick={() => quickRange(q.days)}>{q.label}</button>
            ))}
          </div>
          <input type="date" className="input input-bordered input-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="opacity-50 text-sm">→</span>
          <input type="date" className="input input-bordered input-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn btn-sm btn-primary" onClick={applyRange}>{t('cleaning_dashboard.apply')}</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg" /></div>
      ) : !data ? (
        <div className="card bg-base-100 border shadow-sm">
          <div className="card-body text-center opacity-60 py-10">{t('cleaning_dashboard.no_data')}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {statCards.map((item) => (
              <div key={item.key} className={`card ${item.bg} ${item.border} border shadow-sm`}>
                <div className="card-body p-4">
                  <p className="text-xs font-medium opacity-70">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value ?? '...'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card bg-base-100 shadow-sm border">
              <div className="card-body">
                <h2 className="card-title text-sm">{t('cleaning_dashboard.chart_daily')}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={chartTooltip} />
                      <Bar dataKey="segundos" fill="#0ea5e9" name={t('cleaning_dashboard.t_time')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-sm border">
              <div className="card-body">
                <h2 className="card-title text-sm">{t('cleaning_dashboard.chart_rooms')}</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roomChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-base-300" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                      <Tooltip content={chartTooltip} />
                      <Bar dataKey="segundos" fill="#f59e0b" name={t('cleaning_dashboard.t_time')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title text-sm mb-2">{t('cleaning_dashboard.rooms_title')}</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>{t('cleaning_dashboard.t_room')}</th>
                      <th>{t('cleaning_dashboard.t_type')}</th>
                      <th>{t('cleaning_dashboard.t_cleanings')}</th>
                      <th>{t('cleaning_dashboard.t_total')}</th>
                      <th>{t('cleaning_dashboard.t_avg')}</th>
                      <th>{t('cleaning_dashboard.t_last')}</th>
                      <th>{t('cleaning_dashboard.t_photo')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.by_room || []).map((r) => (
                      <tr key={r.room_name}>
                        <td className="font-medium room-number">{r.room_name}</td>
                        <td><span className="badge badge-soft badge-sm">{tipoLabel(r.tipo)}</span></td>
                        <td>{r.cleanings}</td>
                        <td className="font-mono">{fmtDuration(r.total_seconds)}</td>
                        <td className="font-mono">{fmtDuration(r.avg_seconds)}</td>
                        <td className="whitespace-nowrap">{shortDate(r.last_cleaning)}</td>
                        <td>{image(r.imagen)}</td>
                      </tr>
                    ))}
                    {(data.by_room || []).length === 0 && (
                      <tr><td colSpan={7} className="text-center opacity-60 py-6">{t('cleaning_dashboard.no_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card bg-base-100 shadow-sm border lg:col-span-2">
              <div className="card-body">
                <h2 className="card-title text-sm mb-2">{t('cleaning_dashboard.history_title')}</h2>
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead>
                      <tr>
                        <th>{t('cleaning_dashboard.t_date')}</th>
                        <th>{t('cleaning_dashboard.t_room')}</th>
                        <th>{t('cleaning_dashboard.t_staff')}</th>
                        <th>{t('cleaning_dashboard.t_duration')}</th>
                        <th>{t('cleaning_dashboard.t_photo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.history || []).slice(0, 50).map((h) => (
                        <tr key={h.session_id}>
                          <td className="whitespace-nowrap">
                            {shortDate(h.fecha)}
                            <span className="opacity-50 text-xs ml-1">
                              {new Date(h.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td>
                            <span className="font-medium room-number">{h.room_name}</span>
                            {h.tipo === 'zone' && <span className="badge badge-soft badge-xs ml-1">{t('cleaning_dashboard.type_zone')}</span>}
                          </td>
                          <td>{h.started_by_name || '-'}</td>
                          <td className="font-mono">
                            {h.en_curso ? (
                              <span className="badge badge-warning badge-sm">{t('cleaning_dashboard.in_progress')}</span>
                            ) : (
                              fmtDuration(h.duration_seconds)
                            )}
                          </td>
                          <td>{image(h.imagen)}</td>
                        </tr>
                      ))}
                      {(data.history || []).length === 0 && (
                        <tr><td colSpan={5} className="text-center opacity-60 py-6">{t('cleaning_dashboard.no_data')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-sm border">
              <div className="card-body">
                <h2 className="card-title text-sm mb-2">{t('cleaning_dashboard.staff_title')}</h2>
                <div className="flex flex-col gap-2">
                  {(data.by_staff || []).map((s, i) => (
                    <div key={s.started_by || i} className="flex items-center justify-between gap-2 border-b border-base-300 pb-2 last:border-0">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{s.nombre}</div>
                        <div className="text-xs opacity-60">
                          {s.cleanings} {t('cleaning_dashboard.t_cleanings').toLowerCase()} · {fmtDuration(s.total_seconds)}
                        </div>
                      </div>
                      <span className="badge badge-soft badge-sm shrink-0">{fmtDuration(s.avg_seconds)}</span>
                    </div>
                  ))}
                  {(data.by_staff || []).length === 0 && (
                    <p className="text-sm opacity-60 text-center py-6">{t('cleaning_dashboard.no_data')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ImageViewer url={viewPhoto} onClose={() => setViewPhoto(null)} />
    </div>
  )
}
