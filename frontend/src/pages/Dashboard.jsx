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
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.welcome', { nombre: user?.nombre })}</h1>
        <p className="opacity-60">{user?.rol ? t('roles.' + user.rol) : ''}</p>
      </div>

      {/* Limpiadora */}
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
            <Link to="/limpieza" className="btn btn-soft btn-sm mt-2">{t('dashboard.go_to_cleaning')}</Link>
          </div>
        </div>
      )}

      {/* Estudiante */}
      {user?.rol === 'estudiante' && (
        <>
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title">{t('dashboard.student_room')}</h2>
              {studentData ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge badge-lg badge-outline">{studentData.habitacion || t('common.unassigned')}</span>
                  <span className={`badge ${studentData.estado === 'activo' ? 'badge-success' : studentData.estado === 'pendiente_salida' ? 'badge-warning' : 'badge-error'}`}>
                    {studentData.estado === 'activo' ? t('common.active') : studentData.estado === 'pendiente_salida' ? t('common.pending_departure') : t('common.inactive')}
                  </span>
                  <span>{t('dashboard.access')} {studentData.acceso_habitacion ? '✅' : '❌'}</span>
                </div>
              ) : <p className="opacity-60">{t('dashboard.no_room')}</p>}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title">{t('dashboard.cleaning_today', { dia: todayCleaning?.dia })}</h2>
              {!myRoom ? (
                <p className="opacity-60">{t('dashboard.no_room')}</p>
              ) : myRoomIsBeingCleaned ? (
                <div className="bg-warning/10 border border-warning rounded-box p-4 mb-3">
                  <p className="font-bold">{t('dashboard.cleaning_scheduled', { room: myRoom })}</p>
                  {todayCleaning?.blocks?.map((b) => {
                    const room = b.rooms?.find((r) => r.room_name === myRoom)
                    if (!room) return null
                    return (
                      <p key={b.id} className="text-sm opacity-70 mt-1">
                        {room.completada_hoy
                          ? t('dashboard.already_cleaned')
                          : t('dashboard.cleaning_time', { inicio: b.hora_inicio?.slice(0, 5), fin: b.hora_fin?.slice(0, 5) })}
                      </p>
                    )
                  })}
                </div>
              ) : (
                <p className="opacity-60">{t('dashboard.no_cleaning_today')}</p>
              )}
            </div>
          </div>

          {/* Marcar ausencia */}
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <h2 className="card-title">{t('dashboard.absence_title')}</h2>
              <p className="text-sm opacity-60 mb-2">{t('dashboard.absence_desc')}</p>
              {myAbsence ? (
                <div className="bg-success/10 border border-success rounded-box p-3">
                  <p className="font-medium">{t('dashboard.absence_registered', { inicio: myAbsence.hora_inicio?.slice(0, 5), fin: myAbsence.hora_fin?.slice(0, 5) })}</p>
                  <button className="btn btn-soft btn-xs btn-error mt-2" onClick={deleteAbsence}>{t('dashboard.absence_delete')}</button>
                </div>
              ) : (
                <form onSubmit={handleAbsence} className="flex items-end gap-2 flex-wrap">
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text">{t('dashboard.absence_from')}</span></label>
                    <input type="time" className="input input-bordered input-sm" value={absenceForm.hora_inicio} onChange={(e) => setAbsenceForm({ ...absenceForm, hora_inicio: e.target.value })} required />
                  </div>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text">{t('dashboard.absence_to')}</span></label>
                    <input type="time" className="input input-bordered input-sm" value={absenceForm.hora_fin} onChange={(e) => setAbsenceForm({ ...absenceForm, hora_fin: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">{t('dashboard.absence_submit')}</button>
                </form>
              )}
              {absenceMsg && <p className="text-sm text-success mt-1">{absenceMsg}</p>}
            </div>
          </div>

          {/* Incidencias */}
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">{t('dashboard.my_incidents')}</h2>
                <Link to="/incidencias" className="btn btn-soft btn-sm">{t('dashboard.view_all')}</Link>
              </div>
              {myIncidents.length === 0 ? (
                <p className="opacity-60">{t('dashboard.no_incidents')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {myIncidents.slice(0, 6).map((inc) => (
                    <div key={inc.id} className={`border rounded-box p-3 ${inc.tipo === 'urgente' ? 'border-error/30 bg-error/5' : 'border-base-300'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm line-clamp-2 flex-1">{inc.descripcion}</p>
                        <span className={`badge badge-sm whitespace-nowrap ${inc.tipo === 'urgente' ? 'badge-error' : inc.tipo === 'normal' ? 'badge-info' : 'badge-soft'}`}>{t('incident_priorities.' + inc.tipo)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {estadoBadge(inc.estado)}
                        <span className="text-xs opacity-50">{inc.habitacion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documentos */}
          <div className="card bg-base-100 shadow-sm border">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">{t('dashboard.documents')}</h2>
                <Link to="/documentos" className="btn btn-soft btn-sm">{t('dashboard.view_documents')}</Link>
              </div>
              <p className="text-sm opacity-60">{t('dashboard.documents_desc')}</p>
            </div>
          </div>
        </>
      )}

      {/* Admin */}
      {user?.rol !== 'estudiante' && user?.rol !== 'limpieza' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { key: 'active', label: t('dashboard.stats_active'), value: stats?.students_active },
              { key: 'cleaning', label: t('dashboard.stats_cleaning', { dia: todayCleaning?.dia }), value: todayCleaning?.blocks?.length },
              { key: 'incidents', label: t('dashboard.stats_incidents'), value: stats?.incidents_open },
              { key: 'payments', label: t('dashboard.stats_payments'), value: stats?.payments_pending },
            ].map((item) => (
              <div key={item.key} className="card bg-base-100 shadow-sm border">
                <div className="card-body">
                  <h2 className="card-title">{item.label}</h2>
                  <p className="text-3xl font-bold">{item.value ?? '...'}</p>
                  {item.key === 'cleaning' && (
                    <p className="text-sm opacity-60">
                      {t('dashboard.stats_cleaning_done', { count: todayCleaning?.blocks?.reduce((acc, b) => acc + (b.rooms?.filter((r) => r.completada_hoy).length || 0), 0) })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Alertas de pagos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats?.payments_overdue > 0 && (
              <div className="card bg-error/5 border border-error/30 shadow-sm">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <h2 className="card-title text-error">{t('dashboard.overdue_title')}</h2>
                    <span className="text-3xl font-bold text-error">{stats.payments_overdue}</span>
                  </div>
                  <p className="text-sm opacity-70">{t('dashboard.overdue_desc')}</p>
                  <Link to="/pagos?estado=vencido" className="btn btn-error btn-sm mt-2">{t('dashboard.overdue_button')}</Link>
                </div>
              </div>
            )}
            {stats?.payments_next_7_days > 0 && (
              <div className="card bg-warning/5 border border-warning/30 shadow-sm">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <h2 className="card-title text-warning">{t('dashboard.upcoming_title')}</h2>
                    <span className="text-3xl font-bold text-warning">{stats.payments_next_7_days}</span>
                  </div>
                  <p className="text-sm opacity-70">{t('dashboard.upcoming_desc')}</p>
                  <Link to="/pagos?estado=pendiente" className="btn btn-warning btn-sm mt-2">{t('dashboard.upcoming_button')}</Link>
                </div>
              </div>
            )}
          </div>

          {pendingDepartures.length > 0 && (
            <div className="card bg-base-100 shadow-sm border border-warning/30">
              <div className="card-body">
                <h2 className="card-title text-warning">{t('dashboard.departures_title')}</h2>
                <div className="flex flex-col gap-2 mt-2">
                  {pendingDepartures.map((s) => (
                    <div key={s.id} className="flex items-center justify-between border-b border-base-300 pb-2 last:border-0">
                      <div>
                        <span className="font-medium">{s.nombre} {s.apellidos}</span>
                        <span className="text-sm opacity-60 ml-2">{t('dashboard.departure_room', { habitacion: s.habitacion })}</span>
                        {s.fecha_salida_prevista && (
                          <span className="text-sm opacity-60 ml-2">{t('dashboard.departure_date', { fecha: new Date(s.fecha_salida_prevista).toLocaleDateString() })}</span>
                        )}
                      </div>
                      <Link to="/alumnos" className="btn btn-warning btn-sm">{t('dashboard.departure_manage')}</Link>
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
