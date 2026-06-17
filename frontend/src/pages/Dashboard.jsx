import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchApi } from '../lib/api'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [todayCleaning, setTodayCleaning] = useState(null)
  const [myIncidents, setMyIncidents] = useState([])
  const [myRoom, setMyRoom] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [stats, setStats] = useState(null)
  const [myAbsence, setMyAbsence] = useState(null)
  const [absenceForm, setAbsenceForm] = useState({ hora_inicio: '10:00', hora_fin: '12:00' })
  const [absenceMsg, setAbsenceMsg] = useState('')
  const [pendingDepartures, setPendingDepartures] = useState([])

  useEffect(() => {
    if (user?.rol !== 'estudiante' && user?.rol !== 'limpieza') {
      fetchApi('/stats').then(setStats).catch(() => {})
    }
    fetchApi('/cleaning/today').then(setTodayCleaning).catch(() => {})

    if (user?.rol === 'estudiante') {
      fetchApi('/students').then((students) => {
        const me = students.find((s) => s.email === user.email)
        if (me) {
          setStudentData(me)
          setMyRoom(me.habitacion)
        }
      }).catch(() => {})

      fetchApi('/incidencias').then(setMyIncidents).catch(() => {})
      fetchApi('/cleaning/absence').then(setMyAbsence).catch(() => {})
    }

    if (user?.rol === 'limpieza') {
      fetchApi('/cleaning/today').then(setTodayCleaning).catch(() => {})
    }

    if (user?.rol === 'direccion' || user?.rol === 'administracion') {
      fetchApi('/students').then((students) => {
        setPendingDepartures(students.filter((s) => s.estado === 'pendiente_salida'))
      }).catch(() => {})
    }
  }, [user])

  const myRoomIsBeingCleaned = todayCleaning?.blocks?.some((b) =>
    b.rooms?.some((r) => r.room_name === myRoom)
  )

  const handleAbsence = async (e) => {
    e.preventDefault()
    setAbsenceMsg('')
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      const data = await fetchApi('/cleaning/absence', {
        method: 'POST',
        body: JSON.stringify({ fecha: hoy, ...absenceForm }),
      })
      setMyAbsence(data.updated ? { ...myAbsence, ...absenceForm } : { ...absenceForm })
      setAbsenceMsg(data.updated ? t('dashboard.absence_updated') : t('dashboard.absence_created'))
      fetchApi('/cleaning/today').then(setTodayCleaning).catch(() => {})
    } catch (err) { setAbsenceMsg(t('dashboard.absence_error') + ' ' + err.message) }
  }

  const deleteAbsence = async () => {
    setAbsenceForm({ hora_inicio: '10:00', hora_fin: '12:00' })
    setMyAbsence(null)
    setAbsenceMsg('')
  }

  const estadoBadge = (e) => {
    const cls = { reportada: 'badge-soft', en_curso: 'badge-warning', resuelta: 'badge-success', cerrada: 'badge-neutral' }
    return <span className={`badge ${cls[e] || ''}`}>{e ? t('incident_states.' + e) : ''}</span>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome', { nombre: user?.nombre })}</h1>
          <p className="text-sm opacity-60">{user?.rol ? t('roles.' + user.rol) : ''}</p>
        </div>
      </div>

      {/* Cleaning staff */}
      {user?.rol === 'limpieza' && (
        <div className="card bg-base-100 shadow-sm border">
          <div className="card-body">
            <h2 className="card-title">{t('dashboard.cleaning_today', { dia: todayCleaning?.dia })}</h2>
            {todayCleaning?.blocks?.length === 0 && <p className="opacity-60">{t('dashboard.no_cleaning')}</p>}
            {todayCleaning?.blocks?.map((b) => (
              <div key={b.id} className="mb-3">
                <p className="font-medium">{b.hora_inicio?.slice(0, 5)} — {b.hora_fin?.slice(0, 5)}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                  {b.rooms?.map((r) => (
                    <div key={r.id} className={`border rounded-box p-2 text-center ${r.completada_hoy ? 'bg-success/10 border-success' : ''}`}>
                      <span className="font-bold">{r.room_name}</span>
                      {r.absences?.length > 0 && (
                        <div className="text-xs mt-1">
                          {r.absences.map((a, i) => (
                            <span key={i} className="badge badge-info badge-xs mr-1">{a.hora_inicio?.slice(0, 5)}-{a.hora_fin?.slice(0, 5)}</span>
                          ))}
                        </div>
                      )}
                      {r.completada_hoy ? <span className="badge badge-success badge-sm mt-1 block">{t('dashboard.completed')}</span> : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Link to="/limpieza" className="btn btn-soft btn-sm mt-2 w-fit">{t('dashboard.go_to_cleaning')}</Link>
          </div>
        </div>
      )}

      {/* Student */}
      {user?.rol === 'estudiante' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Room info */}
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title text-lg">{t('dashboard.student_room')}</h2>
              {studentData ? (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="badge badge-lg badge-outline">{studentData.habitacion || t('common.unassigned')}</span>
                  <span className={`badge ${studentData.estado === 'activo' ? 'badge-success' : studentData.estado === 'pendiente_salida' ? 'badge-warning' : 'badge-error'}`}>
                    {studentData.estado === 'activo' ? t('common.active') : studentData.estado === 'pendiente_salida' ? t('common.pending_departure') : t('common.inactive')}
                  </span>
                  <span>{t('dashboard.access')} {studentData.acceso_habitacion ? '✅' : '❌'}</span>
                </div>
              ) : <p className="opacity-60 text-sm">{t('dashboard.no_room')}</p>}
            </div>
          </div>

          {/* Cleaning today */}
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title text-lg">{t('dashboard.cleaning_today', { dia: todayCleaning?.dia })}</h2>
              {!myRoom ? (
                <p className="opacity-60 text-sm">{t('dashboard.no_room')}</p>
              ) : myRoomIsBeingCleaned ? (
                <div className="bg-warning/10 border border-warning/30 rounded-box p-3 mt-1">
                  <p className="font-medium text-sm">{t('dashboard.cleaning_scheduled', { room: myRoom })}</p>
                  {todayCleaning?.blocks?.map((b) => {
                    const room = b.rooms?.find((r) => r.room_name === myRoom)
                    if (!room) return null
                    return (
                      <p key={b.id} className="text-xs opacity-70 mt-1">
                        {room.completada_hoy
                          ? t('dashboard.already_cleaned')
                          : t('dashboard.cleaning_time', { inicio: b.hora_inicio?.slice(0, 5), fin: b.hora_fin?.slice(0, 5) })}
                      </p>
                    )
                  })}
                </div>
              ) : (
                <p className="opacity-60 text-sm">{t('dashboard.no_cleaning_today')}</p>
              )}
            </div>
          </div>

          {/* Absence marker */}
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title text-lg">{t('dashboard.absence_title')}</h2>
              <p className="text-xs opacity-60 mb-2">{t('dashboard.absence_desc')}</p>
              {myAbsence ? (
                <div className="bg-success/10 border border-success/30 rounded-box p-3">
                  <p className="font-medium text-sm">{t('dashboard.absence_registered', { inicio: myAbsence.hora_inicio?.slice(0, 5), fin: myAbsence.hora_fin?.slice(0, 5) })}</p>
                  <button className="btn btn-soft btn-xs btn-error mt-2" onClick={deleteAbsence}>{t('dashboard.absence_delete')}</button>
                </div>
              ) : (
                <form onSubmit={handleAbsence} className="flex items-end gap-2 flex-wrap">
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">{t('dashboard.absence_from')}</span></label>
                    <input type="time" className="input input-bordered input-sm" value={absenceForm.hora_inicio} onChange={(e) => setAbsenceForm({ ...absenceForm, hora_inicio: e.target.value })} required />
                  </div>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">{t('dashboard.absence_to')}</span></label>
                    <input type="time" className="input input-bordered input-sm" value={absenceForm.hora_fin} onChange={(e) => setAbsenceForm({ ...absenceForm, hora_fin: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">{t('dashboard.absence_submit')}</button>
                </form>
              )}
              {absenceMsg && <p className="text-xs text-success mt-1">{absenceMsg}</p>}
            </div>
          </div>

          {/* Incidents */}
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-lg">{t('dashboard.my_incidents')}</h2>
                <Link to="/incidencias" className="btn btn-soft btn-xs">{t('dashboard.view_all')}</Link>
              </div>
              {myIncidents.length === 0 ? (
                <p className="opacity-60 text-sm">{t('dashboard.no_incidents')}</p>
              ) : (
                <div className="flex flex-col gap-2 mt-1">
                  {myIncidents.slice(0, 4).map((inc) => (
                    <div key={inc.id} className={`border rounded-box p-2.5 text-sm ${inc.tipo === 'urgente' ? 'border-error/30 bg-error/5' : 'border-base-300'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs line-clamp-1 flex-1">{inc.descripcion}</p>
                        <span className={`badge badge-xs whitespace-nowrap shrink-0 ${inc.tipo === 'urgente' ? 'badge-error' : inc.tipo === 'normal' ? 'badge-info' : 'badge-soft'}`}>{t('incident_priorities.' + inc.tipo)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {estadoBadge(inc.estado)}
                        <span className="text-[10px] opacity-50">{inc.habitacion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="card bg-base-100 shadow-sm border md:col-span-2">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-lg">{t('dashboard.documents')}</h2>
                <Link to="/documentos" className="btn btn-soft btn-xs">{t('dashboard.view_documents')}</Link>
              </div>
              <p className="text-sm opacity-60">{t('dashboard.documents_desc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin */}
      {user?.rol !== 'estudiante' && user?.rol !== 'limpieza' && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { key: 'active', label: t('dashboard.stats_active'), value: stats?.students_active, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
              { key: 'cleaning', label: t('dashboard.stats_cleaning', { dia: todayCleaning?.dia }), value: todayCleaning?.blocks?.length, color: 'text-accent', bg: 'bg-accent/5', border: 'border-accent/20' },
              { key: 'incidents', label: t('dashboard.stats_incidents'), value: stats?.incidents_open, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
              { key: 'payments', label: t('dashboard.stats_payments'), value: stats?.payments_pending, color: 'text-error', bg: 'bg-error/5', border: 'border-error/20' },
            ].map((item) => (
              <div key={item.key} className={`card ${item.bg} ${item.border} border shadow-sm`}>
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium opacity-70">{item.label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value ?? '...'}</p>
                  {item.key === 'cleaning' && (
                    <p className="text-[10px] opacity-50">
                      {t('dashboard.stats_cleaning_done', { count: todayCleaning?.blocks?.reduce((acc, b) => acc + (b.rooms?.filter((r) => r.completada_hoy).length || 0), 0) })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Payment alerts + Departures */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stats?.payments_overdue > 0 && (
              <div className="card bg-error/5 border border-error/30 shadow-sm">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="card-title text-sm text-error">{t('dashboard.overdue_title')}</h2>
                    <span className="text-2xl font-bold text-error">{stats.payments_overdue}</span>
                  </div>
                  <p className="text-xs opacity-70">{t('dashboard.overdue_desc')}</p>
                  <Link to="/pagos?estado=vencido" className="btn btn-error btn-xs mt-2 w-fit">{t('dashboard.overdue_button')}</Link>
                </div>
              </div>
            )}
            {stats?.payments_next_7_days > 0 && (
              <div className="card bg-warning/5 border border-warning/30 shadow-sm">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="card-title text-sm text-warning">{t('dashboard.upcoming_title')}</h2>
                    <span className="text-2xl font-bold text-warning">{stats.payments_next_7_days}</span>
                  </div>
                  <p className="text-xs opacity-70">{t('dashboard.upcoming_desc')}</p>
                  <Link to="/pagos?estado=pendiente" className="btn btn-warning btn-xs mt-2 w-fit">{t('dashboard.upcoming_button')}</Link>
                </div>
              </div>
            )}
          </div>

          {/* Pending departures */}
          {pendingDepartures.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-warning/30">
              <div className="card-body p-4">
                <h2 className="card-title text-sm text-warning mb-2">{t('dashboard.departures_title')}</h2>
                <div className="flex flex-col gap-2">
                  {pendingDepartures.map((s) => (
                    <div key={s.id} className="flex items-center justify-between border-b border-base-300 pb-2 last:border-0">
                      <div className="min-w-0">
                        <span className="font-medium text-sm">{s.nombre} {s.apellidos}</span>
                        <span className="text-xs opacity-60 ml-2">{t('dashboard.departure_room', { habitacion: s.habitacion })}</span>
                        {s.fecha_salida_prevista && (
                          <span className="text-xs opacity-60 ml-2">{t('dashboard.departure_date', { fecha: new Date(s.fecha_salida_prevista).toLocaleDateString() })}</span>
                        )}
                      </div>
                      <Link to="/alumnos" className="btn btn-warning btn-xs shrink-0">{t('dashboard.departure_manage')}</Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
