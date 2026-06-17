import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'

export default function RoomsPage() {
  const { t } = useTranslation()
  const [rooms, setRooms] = useState([])
  const [newRoom, setNewRoom] = useState('')
  const [error, setError] = useState('')
  const [showSoon, setShowSoon] = useState(false)

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-ES') : '-'

  const sorted = showSoon
    ? [...rooms].sort((a, b) => new Date(a.next_available_date || 0) - new Date(b.next_available_date || 0))
    : rooms

  const load = async () => {
    const data = await fetchApi('/rooms')
    setRooms(data)
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [])

  const addRoom = async (e) => {
    e.preventDefault()
    setError('')
    if (!newRoom.trim()) return
    try {
      await fetchApi('/rooms', { method: 'POST', body: JSON.stringify({ nombre: newRoom.trim() }) })
      setNewRoom('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteRoom = async (id) => {
    try {
      await fetchApi(`/rooms/${id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{t('rooms.title')}</h1>

      <div className="card bg-base-100 border shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={addRoom} className="join w-full max-w-md">
            <input
              className="input input-bordered join-item flex-1"
              placeholder={t('rooms.name_placeholder')}
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
            />
            <button type="submit" className="btn btn-primary join-item">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              {t('rooms.add')}
            </button>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowSoon(!showSoon)}
          className={`btn btn-sm ${showSoon ? 'btn-primary' : 'btn-outline btn-primary'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5m-16.5 6h16.5" /></svg>
          {t('rooms.show_soon')}
        </button>
        <span className="text-sm opacity-60">{t('rooms.count', { n: sorted.length })}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sorted.map((r) => (
          <div key={r.id} className={`card shadow-sm border ${r.occupied ? 'border-error/30' : 'border-success/30'}`}>
            <div className="card-body items-center p-4 gap-2">
              <span className="text-xl font-bold">{r.nombre}</span>

              {r.occupied ? (
                <div className="badge badge-error badge-sm gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error-content animate-pulse" />
                  {t('rooms.occupied')}
                </div>
              ) : (
                <div className="badge badge-success badge-sm gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-content" />
                  {t('rooms.free')}
                </div>
              )}

              {r.occupied && (
                <div className="text-xs text-center opacity-70 leading-relaxed">
                  <div>{t('rooms.occupied_by')}: <strong>{r.occupied_by}</strong></div>
                  <div>{t('rooms.occupied_until')}: <strong>{fmt(r.occupied_until)}</strong></div>
                </div>
              )}

              <div className="text-xs text-center opacity-60">
                {t('rooms.next_available')}: <strong>{fmt(r.next_available_date)}</strong>
              </div>

              <button className="btn btn-xs btn-soft btn-error mt-1" onClick={() => deleteRoom(r.id)}>
                {t('rooms.delete')}
              </button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <p className="col-span-full text-center opacity-60 py-8">
            {t('rooms.empty')}
          </p>
        )}
      </div>
    </div>
  )
}
