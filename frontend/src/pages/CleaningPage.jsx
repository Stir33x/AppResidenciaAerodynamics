import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

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
    return <CleanerView todayData={todayData} toggleComplete={toggleComplete} t={t} />
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

function CleanerView({ todayData, toggleComplete, t }) {
  const { addToast } = useToast()
  const [checklistStates, setChecklistStates] = useState({})
  const [saving, setSaving] = useState(false)

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
      const map = {}
      for (const r of results) {
        for (const c of r.completions) {
          map[`${r.roomId}_${c.checklist_item_id}`] = c.completada === 1
        }
      }
      setChecklistStates(map)
    })
  }, [todayData])

  const toggleChecklistItem = (roomId, itemId) => {
    setChecklistStates((prev) => ({
      ...prev,
      [`${roomId}_${itemId}`]: !prev[`${roomId}_${itemId}`],
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
    } catch (err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">{t('cleaning.today_title', { dia: todayData?.dia ? t('days.' + todayData.dia) : '' })}</h1>
      {(!todayData?.blocks || todayData.blocks.length === 0) && (
        <div className="alert alert-soft text-sm">{t('cleaning.no_tasks')}</div>
      )}
      {todayData?.blocks?.map((block) => (
        <div key={block.id} className="bg-base-100 border border-base-300 border-l-2 border-l-accent/70 p-4">
          <h2 className="section-title mb-3">{block.hora_inicio?.slice(0, 5)} — {block.hora_fin?.slice(0, 5)}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {block.rooms?.map((room) => (
                <RoomChecklistCard
                  key={room.id}
                  room={room}
                  checklistStates={checklistStates}
                toggleChecklistItem={toggleChecklistItem}
                toggleComplete={toggleComplete}
                saveChecklist={saveChecklist}
                saving={saving}
                t={t}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReadOnlyRoomCard({ room, t }) {
  const [items, setItems] = useState([])
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
            <img src={room.imagen} alt="foto" className="w-7 h-7 object-cover rounded cursor-pointer" onClick={() => window.open(room.imagen, '_blank')} />
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
    </div>
  )
}

function RoomChecklistCard({ room, checklistStates, toggleChecklistItem, toggleComplete, saveChecklist, saving, t }) {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [uploadingImg, setUploadingImg] = useState(false)

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
      fd.append('imagen', file)
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      const res = await fetch(`${API_BASE}/upload/image`, { method: 'POST', headers: { Authorization: localStorage.getItem('token') }, body: fd })
      const data = await res.json()
      if (data.url) toggleComplete(room.id, data.url)
    } catch (err) { addToast(err.message, 'error') }
    setUploadingImg(false)
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
            <img src={room.imagen} alt="foto" className="w-7 h-7 object-cover rounded cursor-pointer" onClick={() => window.open(room.imagen, '_blank')} />
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

      {room.absences?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {room.absences.map((a, i) => (
            <span key={i} className="badge badge-soft badge-xs">
              {a.nombre}: {a.hora_inicio?.slice(0, 5)}-{a.hora_fin?.slice(0, 5)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
