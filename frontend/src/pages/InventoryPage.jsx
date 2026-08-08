import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function InventoryPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast } = useToast()
  const isAdmin = user?.rol === 'direccion' || user?.rol === 'administracion'

  const [rooms, setRooms] = useState([])
  const [zones, setZones] = useState([])
  const [catalog, setCatalog] = useState([])
  const [tab, setTab] = useState('room')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedZone, setSelectedZone] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [newCatName, setNewCatName] = useState('')
  const [editingCat, setEditingCat] = useState(null)
  const [editCatName, setEditCatName] = useState('')
  const [assignCatId, setAssignCatId] = useState('')
  const [assignQty, setAssignQty] = useState(1)
  const [editingAssign, setEditingAssign] = useState(null)
  const [editAssignQty, setEditAssignQty] = useState(1)
  const [moveTarget, setMoveTarget] = useState(null)
  const [moveType, setMoveType] = useState('room')
  const [moveRoom, setMoveRoom] = useState('')
  const [moveZone, setMoveZone] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [bulkRoom, setBulkRoom] = useState('')
  const [bulkItems, setBulkItems] = useState({})
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showLocations, setShowLocations] = useState(false)
  const [locationsItem, setLocationsItem] = useState(null)
  const [locations, setLocations] = useState([])
  const [locationsLoading, setLocationsLoading] = useState(false)

  useEffect(() => {
    fetchApi('/rooms').then(setRooms).catch(() => {})
    fetchApi('/common-zones').then(setZones).catch(() => {})
    loadCatalog()
  }, [])

  const loadCatalog = () => fetchApi('/inventory/catalog').then(setCatalog).catch(() => {})

  const loadAssignments = () => {
    if (tab === 'room' && selectedRoom) {
      fetchApi(`/inventory?tipo=room&room_name=${encodeURIComponent(selectedRoom)}`).then(setAssignments).catch(() => setAssignments([]))
    } else if (tab === 'zone' && selectedZone) {
      fetchApi(`/inventory?tipo=zone&zone_id=${selectedZone}`).then(setAssignments).catch(() => setAssignments([]))
    } else if (tab === 'almacen') {
      fetchApi('/inventory?tipo=almacen').then(setAssignments).catch(() => setAssignments([]))
    } else {
      setAssignments([])
    }
  }

  useEffect(() => { loadAssignments() }, [tab, selectedRoom, selectedZone])

  const addCatalogItem = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      await fetchApi('/inventory/catalog', {
        method: 'POST',
        body: JSON.stringify({ nombre: newCatName.trim() }),
      })
      setNewCatName('')
      loadCatalog()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const saveCatalogEdit = async (id) => {
    if (!editCatName.trim()) return
    try {
      await fetchApi(`/inventory/catalog/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: editCatName.trim() }),
      })
      setEditingCat(null)
      loadCatalog()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const deleteCatalogItem = async (id) => {
    await fetchApi(`/inventory/catalog/${id}`, { method: 'DELETE' })
    loadCatalog()
    loadAssignments()
  }

  const selectRoom = (name) => { setTab('room'); setSelectedRoom(name); setSelectedZone(null) }
  const selectZone = (id) => { setTab('zone'); setSelectedZone(id); setSelectedRoom(null) }
  const selectAlmacen = () => { setTab('almacen'); setSelectedRoom(null); setSelectedZone(null) }

  const addAssignment = async (e) => {
    e.preventDefault()
    if (!assignCatId) return
    await fetchApi('/inventory', {
      method: 'POST',
      body: JSON.stringify({
        catalog_id: parseInt(assignCatId),
        tipo: tab === 'almacen' ? 'almacen' : tab,
        room_name: selectedRoom,
        zone_id: selectedZone,
        cantidad: assignQty,
      }),
    })
    setAssignCatId('')
    setAssignQty(1)
    loadAssignments()
    loadCatalog()
  }

  const saveAssignQty = async (id) => {
    await fetchApi(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad: editAssignQty }),
    })
    setEditingAssign(null)
    loadAssignments()
    loadCatalog()
  }

  const deleteAssignment = async (id) => {
    await fetchApi(`/inventory/${id}`, { method: 'DELETE' })
    loadAssignments()
    loadCatalog()
  }

  const handleMove = async (id) => {
    await fetchApi(`/inventory/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({
        tipo: moveType,
        room_name: moveType === 'room' ? moveRoom : null,
        zone_id: moveType === 'zone' ? moveZone : null,
      }),
    })
    setMoveTarget(null)
    loadAssignments()
    loadCatalog()
  }

  const openBulk = async () => {
    setBulkRoom(selectedRoom || '')
    setBulkItems({})
    setShowBulk(true)
    if (selectedRoom) await loadBulkRoom(selectedRoom)
  }

  const loadBulkRoom = async (roomName) => {
    if (!roomName) { setBulkItems({}); return }
    setBulkLoading(true)
    try {
      const data = await fetchApi(`/inventory?tipo=room&room_name=${encodeURIComponent(roomName)}`)
      const next = {}
      data.forEach((a) => { next[a.catalog_id] = a.cantidad })
      setBulkItems(next)
    } catch {
      setBulkItems({})
    } finally {
      setBulkLoading(false)
    }
  }

  const onBulkRoomChange = (roomName) => {
    setBulkRoom(roomName)
    loadBulkRoom(roomName)
  }

  const saveBulk = async (e) => {
    e.preventDefault()
    if (!bulkRoom) return
    const items = Object.entries(bulkItems)
      .map(([catalog_id, cantidad]) => ({ catalog_id: parseInt(catalog_id), cantidad }))
      .filter((i) => i.cantidad > 0)
    try {
      await fetchApi('/inventory/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ room_name: bulkRoom, items }),
      })
      setShowBulk(false)
      if (selectedRoom === bulkRoom) loadAssignments()
      loadCatalog()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const openLocations = async (item) => {
    setLocationsItem(item)
    setLocations([])
    setLocationsLoading(true)
    setShowLocations(true)
    try {
      const data = await fetchApi(`/inventory/locations?catalog_id=${item.id}`)
      setLocations(data)
    } catch {
      setLocations([])
    } finally {
      setLocationsLoading(false)
    }
  }

  const locationLabel = (l) => {
    if (l.tipo === 'room') return l.room_name
    if (l.tipo === 'zone') return l.zone_nombre || `Zona #${l.zone_id}`
    return t('inventory.storage_title')
  }

  const locationsTotal = locations.reduce((acc, l) => acc + parseInt(l.cantidad || 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">{t('inventory.title')}</h1>

      {/* Catalog */}
      <div className="card bg-base-100 border shadow-sm">
        <div className="card-body">
          <h2 className="card-title">{t('inventory.catalog_title')}</h2>

          {isAdmin && (
            <form onSubmit={addCatalogItem} className="flex gap-2 mt-1">
              <input className="input input-bordered flex-1" placeholder={t('inventory.catalog_placeholder')} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required />
              <button type="submit" className="btn btn-primary">{t('common.add')}</button>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-3">
            {catalog.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-base-200 rounded-box">
                {editingCat === item.id ? (
                  <div className="flex gap-2 flex-1 items-center">
                    <input className="input input-bordered input-sm flex-1" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                    <button className="btn btn-xs btn-primary" onClick={() => saveCatalogEdit(item.id)}>{t('common.save')}</button>
                    <button className="btn btn-xs btn-ghost" onClick={() => setEditingCat(null)}>{t('common.cancel')}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.nombre}</span>
                      <span className="badge badge-sm badge-soft">{t('inventory.total_badge', { n: item.total_asignado })}</span>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-xs btn-ghost" onClick={() => openLocations(item)}>
                        {t('inventory.view_locations')}
                      </button>
                      {isAdmin && (
                        <>
                          <button className="btn btn-xs btn-ghost" onClick={() => { setEditingCat(item.id); setEditCatName(item.nombre) }}>{t('common.edit')}</button>
                          <button className="btn btn-xs btn-ghost text-error" onClick={() => deleteCatalogItem(item.id)}>{t('common.delete')}</button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {catalog.length === 0 && <p className="text-sm opacity-60 col-span-full text-center py-4">{t('inventory.catalog_empty')}</p>}
          </div>
        </div>
      </div>

      {/* Tabs: Rooms / Zones / Almacén */}
      <div className="tabs tabs-bordered">
        <button className={`tab ${tab === 'room' ? 'tab-active' : ''}`} onClick={() => { setTab('room') }}>
          {t('inventory.rooms_tab')}
        </button>
        <button className={`tab ${tab === 'zone' ? 'tab-active' : ''}`} onClick={() => { setTab('zone') }}>
          {t('inventory.zones_tab')}
        </button>
        <button className={`tab ${tab === 'almacen' ? 'tab-active' : ''}`} onClick={selectAlmacen}>
          {t('inventory.storage_tab')}
        </button>
      </div>

      {/* Room / Zone / Almacén selector + content */}
      <div className="flex gap-4 flex-wrap">
        {(tab === 'room' || tab === 'zone') && (
          <div className="w-full md:w-72 flex flex-col gap-1">
            {tab === 'room' && (
              <>
                <p className="text-sm opacity-70 mb-1">{t('inventory.select_room')}</p>
                {isAdmin && catalog.length > 0 && (
                  <button className="btn btn-sm btn-primary mb-2" onClick={openBulk}>
                    {t('inventory.bulk_assign')}
                  </button>
                )}
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border rounded-box p-1">
                  {rooms.map((r) => (
                    <button key={r.id} className={`btn btn-sm btn-ghost justify-start text-left ${selectedRoom === r.nombre ? 'btn-active' : ''}`} onClick={() => selectRoom(r.nombre)}>
                      <span className="room-number">{r.nombre}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {tab === 'zone' && (
              <>
                <p className="text-sm opacity-70 mb-1">{t('inventory.select_zone')}</p>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto border rounded-box p-1">
                  {zones.map((z) => (
                    <button key={z.id} className={`btn btn-sm btn-ghost justify-start text-left ${selectedZone === z.id ? 'btn-active' : ''}`} onClick={() => selectZone(z.id)}>
                      {z.nombre}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {tab === 'almacen' && (
            <div className="card bg-base-100 border shadow-sm">
              <div className="card-body">
                <h2 className="card-title">{t('inventory.storage_title')}</h2>
                <div className="flex flex-col gap-2 mt-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2 bg-base-200 rounded-box">
                      {moveTarget === a.id ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <span className="font-medium">{a.nombre} x{a.cantidad}</span>
                          <select className="select select-bordered select-sm" value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                            <option value="room">{t('inventory.to_room')}</option>
                            <option value="zone">{t('inventory.to_zone')}</option>
                          </select>
                          <select className="select select-bordered select-sm" value={moveType === 'room' ? moveRoom : moveZone} onChange={(e) => {
                            if (moveType === 'room') setMoveRoom(e.target.value)
                            else setMoveZone(e.target.value)
                          }}>
                            <option value="">{t('common.select')}</option>
                            {(moveType === 'room' ? rooms : zones).map((x) => (
                              <option key={x.id} value={moveType === 'room' ? x.nombre : x.id}>
                                {x.nombre}
                              </option>
                            ))}
                          </select>
                          <button className="btn btn-xs btn-primary" onClick={() => handleMove(a.id)}>{t('common.save')}</button>
                          <button className="btn btn-xs btn-ghost" onClick={() => setMoveTarget(null)}>{t('common.cancel')}</button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.nombre}</span>
                            <span className="badge badge-sm badge-soft">{t('inventory.qty', { n: a.cantidad })}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <button className="btn btn-xs btn-ghost" onClick={() => { setMoveTarget(a.id); setMoveType('room'); setMoveRoom(''); setMoveZone('') }}>
                                {t('inventory.move_to')}
                              </button>
                              <button className="btn btn-xs btn-ghost text-error" onClick={() => deleteAssignment(a.id)}>{t('common.delete')}</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {assignments.length === 0 && <p className="text-sm opacity-60 text-center py-4">{t('inventory.storage_empty')}</p>}
                </div>
              </div>
            </div>
          )}

          {(tab === 'room' || tab === 'zone') && !selectedRoom && !selectedZone && (
            <div className="card bg-base-100 border shadow-sm">
              <div className="card-body text-center opacity-60">{t('inventory.select_hint')}</div>
            </div>
          )}

          {(tab === 'room' || tab === 'zone') && (selectedRoom || selectedZone) && (
            <div className="card bg-base-100 border shadow-sm">
              <div className="card-body">
                <h2 className="card-title">
                  {tab === 'room'
                    ? t('inventory.room_inventory', { name: selectedRoom })
                    : t('inventory.zone_inventory', { name: zones.find((z) => z.id === selectedZone)?.nombre || '' })}
                </h2>

                <div className="flex flex-col gap-2 mt-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2 bg-base-200 rounded-box">
                      {editingAssign === a.id ? (
                        <div className="flex gap-2 items-center">
                          <span className="font-medium">{a.nombre}</span>
                          <input type="number" min="1" className="input input-bordered input-sm w-20" value={editAssignQty} onChange={(e) => setEditAssignQty(parseInt(e.target.value) || 1)} />
                          <button className="btn btn-xs btn-primary" onClick={() => saveAssignQty(a.id)}>{t('common.save')}</button>
                          <button className="btn btn-xs btn-ghost" onClick={() => setEditingAssign(null)}>{t('common.cancel')}</button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.nombre}</span>
                            <span className="badge badge-sm badge-soft">{t('inventory.qty', { n: a.cantidad })}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <button className="btn btn-xs btn-ghost" onClick={() => { setEditingAssign(a.id); setEditAssignQty(a.cantidad) }}>{t('common.edit')}</button>
                              <button className="btn btn-xs btn-ghost text-error" onClick={() => deleteAssignment(a.id)}>{t('common.delete')}</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {assignments.length === 0 && <p className="text-sm opacity-60 text-center py-4">{t('inventory.empty')}</p>}
                </div>

                {isAdmin && catalog.length > 0 && (
                  <form onSubmit={addAssignment} className="flex gap-2 items-end mt-4 pt-4 border-t border-base-300">
                    <div className="form-control">
                      <label className="label py-1"><span className="label-text">{t('inventory.article')}</span></label>
                      <select className="select select-bordered" value={assignCatId} onChange={(e) => setAssignCatId(e.target.value)} required>
                        <option value="">{t('common.select')}</option>
                        {catalog.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label py-1"><span className="label-text">{t('inventory.quantity')}</span></label>
                      <input type="number" min="1" className="input input-bordered w-20" value={assignQty} onChange={(e) => setAssignQty(parseInt(e.target.value) || 1)} />
                    </div>
                    <button type="submit" className="btn btn-primary">{t('common.add')}</button>
                  </form>
                )}
                {isAdmin && catalog.length === 0 && (
                  <p className="text-sm opacity-60 mt-4 pt-4 border-t border-base-300">{t('inventory.no_catalog_to_assign')}</p>
                )}
              </div>
            </div>
          )}

          {tab === 'almacen' && isAdmin && catalog.length > 0 && (
            <div className="card bg-base-100 border shadow-sm mt-4">
              <div className="card-body">
                <h3 className="font-medium">{t('inventory.add_to_storage')}</h3>
                <form onSubmit={addAssignment} className="flex gap-2 items-end mt-2">
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text">{t('inventory.article')}</span></label>
                    <select className="select select-bordered" value={assignCatId} onChange={(e) => setAssignCatId(e.target.value)} required>
                      <option value="">{t('common.select')}</option>
                      {catalog.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text">{t('inventory.quantity')}</span></label>
                    <input type="number" min="1" className="input input-bordered w-20" value={assignQty} onChange={(e) => setAssignQty(parseInt(e.target.value) || 1)} />
                  </div>
                  <button type="submit" className="btn btn-primary">{t('common.add')}</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {showBulk && (
        <dialog className="modal modal-open" onClick={() => setShowBulk(false)}>
          <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('inventory.bulk_title')}</h3>
                <p className="text-sm opacity-60">{t('inventory.bulk_desc')}</p>
              </div>
            </div>

            <form onSubmit={saveBulk} className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('inventory.select_room')}</span></label>
                <select className="select select-bordered" value={bulkRoom} onChange={(e) => onBulkRoomChange(e.target.value)} required>
                  <option value="">{t('common.select')}</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.nombre}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              {bulkRoom && (
                <div className="grid grid-cols-1 sm:grid-cols-2 max-h-80 overflow-y-auto border rounded-box p-3 gap-1">
                  {bulkLoading && <p className="text-sm opacity-60 col-span-full text-center py-2">{t('common.loading')}</p>}
                  {!bulkLoading && catalog.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-base-200 transition-colors">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs checkbox-primary"
                          checked={(bulkItems[c.id] || 0) > 0}
                          onChange={() => setBulkItems({ ...bulkItems, [c.id]: (bulkItems[c.id] || 0) > 0 ? 0 : 1 })}
                        />
                        <span className="text-sm truncate">{c.nombre}</span>
                      </label>
                      {(bulkItems[c.id] || 0) > 0 ? (
                        <input
                          type="number"
                          min="1"
                          className="input input-xs input-bordered w-16 text-center"
                          value={bulkItems[c.id]}
                          onChange={(e) => setBulkItems({ ...bulkItems, [c.id]: Math.max(parseInt(e.target.value) || 0, 0) })}
                        />
                      ) : (
                        <span className="text-xs opacity-40 w-16 text-center">-</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-action">
                <button type="button" className="btn btn-soft" onClick={() => setShowBulk(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={!bulkRoom}>
                  {t('inventory.bulk_save')}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {showLocations && (
        <dialog className="modal modal-open" onClick={() => setShowLocations(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('inventory.locations_title', { name: locationsItem?.nombre })}</h3>
                <p className="text-sm opacity-60">{t('inventory.locations_desc')}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {locationsLoading && <p className="text-sm opacity-60 text-center py-4">{t('common.loading')}</p>}
              {!locationsLoading && locations.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2 bg-base-200 rounded-box">
                  <div className="flex items-center gap-2 min-w-0">
                    {l.tipo === 'room' && <span className="badge badge-sm badge-soft">{t('inventory.to_room')}</span>}
                    {l.tipo === 'zone' && <span className="badge badge-sm badge-soft">{t('inventory.to_zone')}</span>}
                    {l.tipo === 'almacen' && <span className="badge badge-sm badge-soft">{t('inventory.storage_tab')}</span>}
                    <span className="font-medium truncate">{locationLabel(l)}</span>
                  </div>
                  <span className="badge badge-sm badge-primary">{t('inventory.qty', { n: l.cantidad })}</span>
                </div>
              ))}
              {!locationsLoading && locations.length === 0 && (
                <p className="text-sm opacity-60 text-center py-4">{t('inventory.locations_empty')}</p>
              )}
            </div>

            {!locationsLoading && locations.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
                <span className="text-sm font-medium">{t('inventory.total_label')}</span>
                <span className="badge badge-lg badge-soft">{t('inventory.total_badge', { n: locationsTotal })}</span>
              </div>
            )}

            <div className="modal-action">
              <button className="btn" onClick={() => setShowLocations(false)}>{t('common.close')}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
