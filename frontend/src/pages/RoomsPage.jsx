import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'

export default function RoomsPage() {
  const { t } = useTranslation(['rooms', 'common'])
  const [rooms, setRooms] = useState([])
  const [newRoom, setNewRoom] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const data = await fetchApi('/rooms')
    setRooms(data)
  }

  useEffect(() => { load() }, [])

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

      <form onSubmit={addRoom} className="flex gap-2 items-end">
        <div className="form-control">
          <label className="label"><span className="label-text">{t('rooms.new_room')}</span></label>
          <input
            className="input input-bordered w-40"
            placeholder={t('rooms.name_placeholder')}
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">{t('rooms.add')}</button>
      </form>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {rooms.map((r) => (
          <div key={r.id} className="card bg-base-100 shadow-sm border">
            <div className="card-body items-center p-4 gap-2">
              <span className="text-xl font-bold">{r.nombre}</span>
              <button className="btn btn-xs btn-soft btn-error" onClick={() => deleteRoom(r.id)}>
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
