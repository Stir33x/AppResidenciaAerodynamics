import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import RoomMap from '../components/RoomMap'
import ImageViewer, { imageUrl } from '../components/ImageViewer'

const DIAS = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo']

export default function CleaningPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'direccion' || user?.rol === 'administracion'
  const isCleaner = user?.rol === 'limpieza'
  const [blocks, setBlocks] = useState([])
  const [todayData, setTodayData] = useState(null)

  const loadBlocks = async () => {
    const data = await fetchApi('/cleaning/blocks')
    setBlocks(data)
  }

  const loadToday = async () => {
    try {
      const data = await fetchApi('/cleaning/today')
      setTodayData(data)
    } catch { setTodayData(null) }
  }

  useEffect(() => { loadToday() }, [])
  useEffect(() => {
    if (isAdmin) loadBlocks()
  }, [isAdmin])

  const toggleComplete = async (roomId, imagen) => {
    await fetchApi(`/cleaning/rooms/${roomId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ imagen: imagen || null }),
    })
    loadToday()
  }

  if (isCleaner) {
    return <CleanerView todayData={todayData} toggleComplete={toggleComplete} refresh={loadToday} t={t} />
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">{t('cleaning.admin_title')}</h1>

      {/* Today's section — highlighted with accent border */}
      <div className="bg-base-100 border border-base-300 border-l-2 border-l-accent/70 p-4">
        <h2 className="section-title mb-3">{t('cleaning.today_section', { dia: todayData?.dia ? t('days.' + todayData.dia) : '' })}</h2>
        {(!todayData?.blocks || todayData.blocks.length === 0) && (
          <div className="alert alert-soft text-sm">{t('cleaning.no_tasks')}</div>
        )}
        <div className="flex flex-col gap-3">
          {todayData?.blocks?.map((block) => (
            <div key={block.id} className="bg-base-200 rounded-box p-3">
              <h3 className="text-sm font-semibold opacity-70 mb-2">{block.hora_inicio?.slice(0, 5)} — {block.hora_fin?.slice(0, 5)}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {block.rooms?.map((room) => (
                  <ReadOnlyRoomCard key={room.id} room={room} t={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly schedule — flatter, no cards */}
      <div className="bg-base-100 border border-base-300 p-4">
        <h2 className="section-title mb-3">{t('cleaning.schedules_subtitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DIAS.map((dia) => {
            const delDia = blocks.filter((b) => b.dia_semana === dia)
            const idx = DIAS.indexOf(dia)
            return (
              <div key={dia} className={`p-3 rounded-box border border-base-300 ${idx % 2 === 0 ? 'bg-base-100' : 'bg-base-200'}`}>
                <h3 className="text-sm font-semibold mb-2">{t('days.' + dia)}</h3>
                {delDia.length === 0 && <p className="text-xs opacity-50">{t('cleaning.no_schedules')}</p>}
                <div className="flex flex-col gap-2">
                  {delDia.map((b) => (
                    <div key={b.id} className="bg-base-100 rounded-box p-2 border border-base-300">
                      <span className="text-xs font-medium">{b.hora_inicio?.slice(0, 5)} — {b.hora_fin?.slice(0, 5)}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {b.rooms?.map((r) => (
                          <span key={r.id} className={`badge badge-sm ${r.tipo === 'zone' ? 'badge-soft' : 'badge-soft'}`}>
                            {r.tipo === 'zone' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>}
                            <span className="room-number">{r.room_name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CleanerView({ todayData, toggleComplete, refresh, t }) {
  const { addToast } = useToast()
  const [checklistStates, setChecklistStates] = useState({})
  const dirtyRef = useRef(new Set())
  const [saving, setSaving] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)

  const runSession = async (roomId, action) => {
    try {
      await fetchApi(`/cleaning/rooms/${roomId}/${action}`, { method: 'POST' })
      await refresh()
    } catch (err) { addToast(err.message, 'error') }
  }

  useEffect(() => {
    if (!todayData?.blocks) return
    const hoy = new Date().toISOString().slice(0, 10)
    const promises = []
    for (const block of todayData.blocks) {
      for (const room of block.rooms) {
        promises.push(
          (async () => {
            const completions = await fetchApi(`/cleaning/checklist-completions?cleaning_block_room_id=${room.id}&fecha=${hoy}`)
            return { roomId: room.id, completions }
          })()
        )
      }
    }
    Promise.all(promises).then((results) => {
      setChecklistStates((prev) => {
        const next = { ...prev }
        for (const r of results) {
          for (const c of r.completions) {
            const key = `${r.roomId}_${c.checklist_item_id}`
            if (!dirtyRef.current.has(key)) next[key] = c.completada === 1
          }
        }
        return next
      })
    })
  }, [todayData])

  const toggleChecklistItem = (roomId, itemId) => {
    const key = `${roomId}_${itemId}`
    dirtyRef.current.add(key)
    setChecklistStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const saveChecklist = async (roomId, items) => {
    setSaving(true)
    const hoy = new Date().toISOString().slice(0, 10)
    try {
      await fetchApi('/cleaning/checklist-completions', {
        method: 'POST',
        body: JSON.stringify({
          cleaning_block_room_id: roomId,
          fecha: hoy,
          items: items.map((item) => ({
            checklist_item_id: item.id,
            completada: checklistStates[`${roomId}_${item.id}`] || false,
          })),
        }),
      })
      for (const item of items) dirtyRef.current.delete(`${roomId}_${item.id}`)
    } catch (err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  // Todas las ubicaciones de hoy (habitaciones + zonas)
  const allRooms = useMemo(
    () => (todayData?.blocks || []).flatMap((b) => b.rooms || []),
    [todayData]
  )
  const roomItems = allRooms.filter((r) => r.tipo === 'room')
  const zoneItems = allRooms.filter((r) => r.tipo === 'zone')

  // Mapa numero -> ubicación de limpieza de hoy (solo habitaciones)
  const roomsByNumber = useMemo(() => {
    const map = {}
    for (const room of roomItems) {
      const n = parseInt(String(room.room_name).trim(), 10)
      if (!Number.isNaN(n)) map[n] = room
    }
    return map
  }, [roomItems])

  const selected = selectedRoom ? allRooms.find((r) => r.id === selectedRoom) || null : null

  const tileClass = (room, n) => {
    if (!room) return 'bg-base-200 border-base-300 text-base-content/40 border-dashed'
    if (room.completada_hoy) return 'bg-success text-success-content border-success'
    return 'bg-warning text-warning-content border-warning'
  }

  const tileBadge = (room, n) => {
    if (!room) return null
    if (room.completada_hoy) {
      return (
        <span className="absolute -top-2 -right-2 bg-success text-success-content rounded-full p-1 shadow">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </span>
      )
    }
    return null
  }

  const tileTitle = (room, n) => {
    const label = String(n).padStart(2, '0')
    if (!room) return `Habitación ${label} · sin limpieza hoy`
    return room.completada_hoy ? `Habitación ${label} · completada` : `Habitación ${label} · pendiente`
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">{t('cleaning.today_title', { dia: todayData?.dia ? t('days.' + todayData.dia) : '' })}</h1>
      {(!todayData?.blocks || todayData.blocks.length === 0) && (
        <div className="alert alert-soft text-sm">{t('cleaning.no_tasks')}</div>
      )}

      {/* MAPA DE HOY: habitaciones a limpiar resaltadas */}
      {roomItems.length > 0 && (
        <div className="bg-base-100 border border-base-300 border-l-2 border-l-accent/70 p-4">
          <h2 className="section-title mb-3">{t('cleaning.today_map')}</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-warning" /> {t('cleaning.pending')}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-success" /> {t('cleaning.completed')}
            </div>
          </div>
          <RoomMap
            roomsByNumber={roomsByNumber}
            onClick={(room) => setSelectedRoom(room.id)}
            getTileClass={tileClass}
            getBadge={tileBadge}
            getTitle={tileTitle}
          />
        </div>
      )}

      {/* ZONAS COMUNES de hoy */}
      {zoneItems.length > 0 && (
        <div className="bg-base-100 border border-base-300 p-4">
          <h2 className="section-title mb-3">{t('cleaning.zone_checklist_today')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {zoneItems.map((room) => (
              <RoomChecklistCard
                key={room.id}
                room={room}
                checklistStates={checklistStates}
                toggleChecklistItem={toggleChecklistItem}
                toggleComplete={toggleComplete}
                saveChecklist={saveChecklist}
                saving={saving}
                runSession={runSession}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {/* MODAL: checklist + cronómetro de la habitación seleccionada */}
      {selected && (
        <dialog className="modal modal-open" onClick={() => setSelectedRoom(null)}>
          <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">
              {t('cleaning.room_checklist')} · Habitación {selected.room_name}
            </h3>
            <RoomChecklistCard
              room={selected}
              checklistStates={checklistStates}
              toggleChecklistItem={toggleChecklistItem}
              toggleComplete={toggleComplete}
              saveChecklist={saveChecklist}
              saving={saving}
              runSession={runSession}
              t={t}
            />
            <div className="modal-action">
              <button className="btn btn-sm" onClick={() => setSelectedRoom(null)}>{t('common.close') || 'Cerrar'}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}

function ReadOnlyRoomCard({ room, t }) {
  const [items, setItems] = useState([])
  const [viewPhoto, setViewPhoto] = useState(null)
  const completionsUrl = room.id ? `/cleaning/checklist-completions?cleaning_block_room_id=${room.id}&fecha=${new Date().toISOString().slice(0, 10)}` : null
  const [completions, setCompletions] = useState({})

  useEffect(() => {
    const tipo = room.tipo || 'room'
    const zoneId = room.zone_id || null
    let url = `/cleaning/checklist-items?tipo=${tipo}`
    if (zoneId) url += `&zone_id=${zoneId}`
    fetchApi(url).then(setItems).catch(() => {})
    if (completionsUrl) {
      fetchApi(completionsUrl).then((data) => {
        const map = {}
        for (const c of data) map[c.checklist_item_id] = c.completada === 1
        setCompletions(map)
      }).catch(() => {})
    }
  }, [room, completionsUrl])

  return (
    <div className={`border rounded-box p-3 ${room.completada_hoy ? 'bg-success/10 border-success' : 'bg-base-100'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {room.tipo === 'zone' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-base-content/50 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
          )}
          <span className="room-number text-sm truncate">{room.room_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {room.completada_hoy && room.imagen && (
            <img src={imageUrl(room.imagen)} alt="foto" className="w-7 h-7 object-cover rounded cursor-pointer" onClick={() => setViewPhoto(room.imagen)} />
          )}
          {room.completada_hoy ? (
            <span className="badge badge-success badge-sm">{t('cleaning.completed')}</span>
          ) : (
            <span className="badge badge-warning badge-sm">{t('cleaning.pending')}</span>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="airflow-divider" />
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-0.5">
              <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={!!completions[item.id]} disabled />
              <span className={`text-sm ${completions[item.id] ? 'line-through opacity-50' : ''}`}>{item.nombre}</span>
            </div>
          ))}
        </div>
      )}

      {room.absences?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {room.absences.map((a, i) => (
            <span key={i} className="badge badge-soft badge-xs">
              {a.nombre}: {a.hora_inicio?.slice(0, 5)}-{a.hora_fin?.slice(0, 5)}
            </span>
          ))}
        </div>
      )}

      <ImageViewer url={viewPhoto} onClose={() => setViewPhoto(null)} />
    </div>
  )
}

function RoomChecklistCard({ room, checklistStates, toggleChecklistItem, toggleComplete, saveChecklist, saving, runSession, t }) {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [uploadingImg, setUploadingImg] = useState(false)
  const [viewPhoto, setViewPhoto] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  const sessions = room.sessions || []
  const openSession = sessions.find((s) => !s.ended_at) || null
  const totalDone = sessions.filter((s) => s.ended_at).reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null

  useEffect(() => {
    if (!openSession) return
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [openSession])

  useEffect(() => {
    const tipo = room.tipo || 'room'
    const zoneId = room.zone_id || null
    let url = `/cleaning/checklist-items?tipo=${tipo}`
    if (zoneId) url += `&zone_id=${zoneId}`
    fetchApi(url).then(setItems).catch(() => {})
  }, [room])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('room', room.room_name || '')
      fd.append('carpeta', 'limpieza')
      fd.append('imagen', file)
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${API_BASE}/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: fd })
      const data = await res.json()
      if (data.url) toggleComplete(room.id, data.url)
    } catch (err) { addToast(err.message, 'error') }
    setUploadingImg(false)
  }

  const elapsed = openSession
    ? Math.max(0, Math.floor((nowTick - new Date(openSession.started_at).getTime()) / 1000))
    : 0

  const fmt = (sec) => {
    if (sec == null || isNaN(sec)) return '0:00'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
    return h > 0 ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className={`border rounded-box p-3 ${room.completada_hoy ? 'bg-success/10 border-success' : 'bg-base-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {room.tipo === 'zone' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-base-content/50 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
          )}
          <span className="room-number text-sm truncate">{room.room_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {room.completada_hoy && room.imagen && (
            <img src={imageUrl(room.imagen)} alt="foto" className="w-7 h-7 object-cover rounded cursor-pointer" onClick={() => setViewPhoto(room.imagen)} />
          )}
          {!room.completada_hoy && (
            <label className={`btn btn-ghost btn-xs btn-square ${uploadingImg ? 'pointer-events-none' : ''}`}>
              {uploadingImg ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
          <input type="checkbox" className="checkbox checkbox-success" checked={!!room.completada_hoy} onChange={() => toggleComplete(room.id)} />
        </div>
      </div>

      {items.length > 0 && (
        <div className="airflow-divider" />
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-base-200 rounded px-1 transition-colors">
              <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={!!checklistStates?.[`${room.id}_${item.id}`]} onChange={() => toggleChecklistItem?.(room.id, item.id)} />
              <span className={`text-sm ${checklistStates?.[`${room.id}_${item.id}`] ? 'line-through opacity-50' : ''}`}>{item.nombre}</span>
            </label>
          ))}
          {saveChecklist && (
            <button className="btn btn-xs btn-soft mt-1 self-end" disabled={saving} onClick={() => saveChecklist(room.id, items)}>
              {saving ? <span className="loading loading-spinner loading-xs" /> : t('cleaning.save_checklist')}
            </button>
          )}
        </div>
      )}

      {runSession && (
        <div className="mt-2 pt-2 border-t border-base-300">
          {openSession ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm text-accent" />
                <span className="font-mono text-lg font-bold text-accent tabular-nums">{fmt(elapsed)}</span>
              </div>
              <button className="btn btn-xs btn-error" onClick={() => runSession(room.id, 'stop')}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" /></svg>
                {t('cleaning.stop')}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs opacity-60">
                {totalDone > 0 && <span className="font-mono">{t('cleaning.done')}: {fmt(totalDone)}</span>}
              </div>
              <div className="flex gap-1">
                {lastSession && (
                  <button className="btn btn-xs btn-ghost" title={t('cleaning.undo')} onClick={() => runSession(room.id, 'undo')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                    {t('cleaning.undo')}
                  </button>
                )}
                <button className="btn btn-xs btn-primary" onClick={() => runSession(room.id, 'start')}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
                  {t('cleaning.start')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {room.absences?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {room.absences.map((a, i) => (
            <span key={i} className="badge badge-soft badge-xs">
              {a.nombre}: {a.hora_inicio?.slice(0, 5)}-{a.hora_fin?.slice(0, 5)}
            </span>
          ))}
        </div>
      )}

      <ImageViewer url={viewPhoto} onClose={() => setViewPhoto(null)} />
    </div>
  )
}
