import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useToast } from '../components/Toast'

const tipos = ['transporte', 'residencia', 'cafeteria', 'comedor', 'recepci\u00f3n', 'instalaciones', 'otros']
const dias = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo']

function ChecklistSection({ titleKey, items, loading, newName, setNewName, newObligatorio, setNewObligatorio, showObligatorio, editingId, setEditingId, editName, setEditName, editObligatorio, setEditObligatorio, onAdd, onStartEdit, onSaveEdit, onDelete, t }) {
  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body">
        <h3 className="font-medium mb-2">{t(titleKey)}</h3>

        <form onSubmit={onAdd} className="flex items-end gap-3 flex-wrap">
          <div className="form-control flex-1 min-w-48">
            <label className="label"><span className="label-text">{t('admin_checklist.item_name')}</span></label>
            <input className="input input-bordered" placeholder={t('admin_checklist.item_placeholder')} value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          {showObligatorio && (
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={newObligatorio} onChange={(e) => setNewObligatorio(e.target.checked)} />
              <span className="text-sm">{t('admin_checklist.required')}</span>
            </label>
          )}
          <button type="submit" className="btn btn-primary mb-0">{t('admin_checklist.add_item')}</button>
        </form>

        <div className="flex flex-col gap-1 mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm opacity-60 text-center py-8">{t('admin_checklist.empty')}</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-base-200 rounded-box gap-3">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <input className="input input-bordered input-sm flex-1 min-w-32" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    {showObligatorio && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={editObligatorio} onChange={(e) => setEditObligatorio(e.target.checked)} />
                        {t('admin_checklist.required')}
                      </label>
                    )}
                    <button className="btn btn-xs btn-primary" onClick={() => onSaveEdit(item.id)}>{t('common.save')}</button>
                    <button className="btn btn-xs btn-ghost" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{item.nombre}</span>
                      {showObligatorio && !!item.obligatorio && (
                        <span className="badge badge-warning badge-xs">{t('admin_checklist.required')}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-xs btn-ghost" onClick={() => onStartEdit(item)}>{t('common.edit')}</button>
                      <button className="btn btn-xs btn-ghost text-error" onClick={() => onDelete(item.id)}>{t('common.delete')}</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConfigurationPage() {
  const { t } = useTranslation()
  const { addToast, confirm } = useToast()
  const [tab, setTab] = useState('checklists')

  /* --- Checklists --- */
  const [regItems, setRegItems] = useState([])
  const [regLoading, setRegLoading] = useState(true)
  const [regNewName, setRegNewName] = useState('')
  const [regNewObligatorio, setRegNewObligatorio] = useState(false)
  const [regEditingId, setRegEditingId] = useState(null)
  const [regEditName, setRegEditName] = useState('')
  const [regEditObligatorio, setRegEditObligatorio] = useState(false)

  const [depItems, setDepItems] = useState([])
  const [depLoading, setDepLoading] = useState(true)
  const [depNewName, setDepNewName] = useState('')
  const [depEditingId, setDepEditingId] = useState(null)
  const [depEditName, setDepEditName] = useState('')

  const loadReg = async () => {
    try { setRegItems(await fetchApi('/registration-checklist/items')) }
    catch (err) { addToast(err.message, 'error') }
    setRegLoading(false)
  }
  const loadDep = async () => {
    try { setDepItems(await fetchApi('/departure-checklist/items')) }
    catch (err) { addToast(err.message, 'error') }
    setDepLoading(false)
  }
  useEffect(() => { loadReg(); loadDep() }, [])

  const addReg = async (e) => {
    e.preventDefault()
    if (!regNewName.trim()) return
    try {
      await fetchApi('/registration-checklist/items', { method: 'POST', body: JSON.stringify({ nombre: regNewName.trim(), obligatorio: regNewObligatorio }) })
      setRegNewName(''); setRegNewObligatorio(false); loadReg(); addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }
  const addDep = async (e) => {
    e.preventDefault()
    if (!depNewName.trim()) return
    try {
      await fetchApi('/departure-checklist/items', { method: 'POST', body: JSON.stringify({ nombre: depNewName.trim() }) })
      setDepNewName(''); loadDep(); addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }
  const saveRegEdit = async (id) => {
    if (!regEditName.trim()) return
    try {
      await fetchApi(`/registration-checklist/items/${id}`, { method: 'PUT', body: JSON.stringify({ nombre: regEditName.trim(), obligatorio: regEditObligatorio }) })
      setRegEditingId(null); loadReg(); addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }
  const saveDepEdit = async (id) => {
    if (!depEditName.trim()) return
    try {
      await fetchApi(`/departure-checklist/items/${id}`, { method: 'PUT', body: JSON.stringify({ nombre: depEditName.trim() }) })
      setDepEditingId(null); loadDep(); addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }
  const deleteReg = async (id) => {
    if (!await confirm()) return
    try { await fetchApi(`/registration-checklist/items/${id}`, { method: 'DELETE' }); loadReg(); addToast(t('common.deleted'), 'success') }
    catch (err) { addToast(err.message, 'error') }
  }
  const deleteDep = async (id) => {
    if (!await confirm()) return
    try { await fetchApi(`/departure-checklist/items/${id}`, { method: 'DELETE' }); loadDep(); addToast(t('common.deleted'), 'success') }
    catch (err) { addToast(err.message, 'error') }
  }

  /* --- Common Zones --- */
  const [commonZones, setCommonZones] = useState([])
  const [newZone, setNewZone] = useState('')

  const loadZones = () => fetchApi('/common-zones').then(setCommonZones).catch(() => {})
  useEffect(() => { loadZones() }, [])

  const addZone = async (e) => {
    e.preventDefault()
    if (!newZone.trim()) return
    try {
      await fetchApi('/common-zones', { method: 'POST', body: JSON.stringify({ nombre: newZone.trim() }) })
      setNewZone(''); loadZones(); addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }
  const deleteZone = async (id) => {
    if (!await confirm(t('incidents.confirm_delete_zone'))) return
    try { await fetchApi(`/common-zones/${id}`, { method: 'DELETE' }); loadZones(); addToast(t('common.deleted'), 'success') }
    catch (err) { addToast(err.message, 'error') }
  }

  /* --- Schedules --- */
  const [horarios, setHorarios] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showSchedModal, setShowSchedModal] = useState(false)
  const [editingSched, setEditingSched] = useState(null)
  const [schedForm, setSchedForm] = useState({ tipo: 'transporte', titulo: '', descripcion: '', dia_semana: '', hora_inicio: '', hora_fin: '', ubicacion: '' })

  const loadSched = async () => {
    const qs = filtroTipo ? `?tipo=${filtroTipo}` : ''
    setHorarios(await fetchApi(`/horarios${qs}`))
  }
  useEffect(() => { loadSched() }, [filtroTipo])

  const openCreateSched = () => {
    setEditingSched(null)
    setSchedForm({ tipo: 'transporte', titulo: '', descripcion: '', dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '', ubicacion: '' })
    setShowSchedModal(true)
  }
  const openEditSched = (h) => {
    setEditingSched(h)
    setSchedForm({
      tipo: h.tipo, titulo: h.titulo, descripcion: h.descripcion || '',
      dia_semana: h.dia_semana || '', hora_inicio: h.hora_inicio?.slice(0, 5) || '',
      hora_fin: h.hora_fin?.slice(0, 5) || '', ubicacion: h.ubicacion || '',
    })
    setShowSchedModal(true)
  }
  const saveSched = async (e) => {
    e.preventDefault()
    try {
      const body = {
        tipo: schedForm.tipo, titulo: schedForm.titulo, descripcion: schedForm.descripcion,
        dia_semana: schedForm.dia_semana, hora_inicio: schedForm.hora_inicio,
        hora_fin: schedForm.hora_fin || null, ubicacion: schedForm.ubicacion,
      }
      if (editingSched) {
        await fetchApi(`/horarios/${editingSched.id}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await fetchApi('/horarios', { method: 'POST', body: JSON.stringify(body) })
      }
      setShowSchedModal(false); loadSched(); addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }
  const deleteSched = async (h) => {
    if (!await confirm(t('schedules.confirm_delete', { title: h.titulo }))) return
    try { await fetchApi(`/horarios/${h.id}`, { method: 'DELETE' }); loadSched(); addToast(t('common.deleted'), 'success') }
    catch (err) { addToast(err.message, 'error') }
  }

  /* --- Document Types --- */
  const [tiposDoc, setTiposDoc] = useState([])
  const [newTypeNombre, setNewTypeNombre] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('badge-soft')

  useEffect(() => { fetchApi('/document-types').then(setTiposDoc).catch(() => {}) }, [])

  const addType = async (e) => {
    e.preventDefault()
    if (!newTypeNombre.trim()) return
    try {
      await fetchApi('/document-types', { method: 'POST', body: JSON.stringify({ nombre: newTypeNombre.trim(), color: newTypeColor }) })
      setNewTypeNombre(''); setNewTypeColor('badge-soft')
      fetchApi('/document-types').then(setTiposDoc).catch(() => {})
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }
  const deleteType = async (id, name) => {
    if (!await confirm(t('documents.confirm_delete_type', { name }))) return
    try {
      await fetchApi(`/document-types/${id}`, { method: 'DELETE' })
      fetchApi('/document-types').then(setTiposDoc).catch(() => {})
      addToast(t('common.deleted'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  /* --- Cleaning --- */
  const CLEAN_DIAS = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo']
  const [cleanTab, setCleanTab] = useState('blocks')
  const [cleanBlocks, setCleanBlocks] = useState([])
  const [rooms, setRooms] = useState([])
  const [zones, setZones] = useState([])
  const [showCleanBlockModal, setShowCleanBlockModal] = useState(false)
  const [cleanBlockForm, setCleanBlockForm] = useState({ dia_semana: 'Lunes', hora_inicio: '09:00', hora_fin: '13:00', selectedRooms: [], selectedZones: [] })
  const [cleanBlockError, setCleanBlockError] = useState('')

  const loadCleanBlocks = async () => {
    const data = await fetchApi('/cleaning/blocks')
    setCleanBlocks(data)
  }

  useEffect(() => {
    loadCleanBlocks()
    fetchApi('/rooms').then(setRooms).catch(() => {})
    fetchApi('/common-zones').then(setZones).catch(() => {})
  }, [])

  const toggleItem = (arr, item) =>
    arr.includes(item) ? arr.filter((r) => r !== item) : [...arr, item]

  const createCleanBlock = async (e) => {
    e.preventDefault()
    setCleanBlockError('')
    if (cleanBlockForm.selectedRooms.length === 0 && cleanBlockForm.selectedZones.length === 0)
      return setCleanBlockError(t('cleaning.select_room_error'))
    try {
      await fetchApi('/cleaning/blocks', {
        method: 'POST',
        body: JSON.stringify({
          dia_semana: cleanBlockForm.dia_semana,
          hora_inicio: cleanBlockForm.hora_inicio,
          hora_fin: cleanBlockForm.hora_fin,
          rooms: cleanBlockForm.selectedRooms,
          zones: cleanBlockForm.selectedZones,
        }),
      })
      setShowCleanBlockModal(false)
      loadCleanBlocks()
      addToast(t('common.saved'), 'success')
    } catch (err) { setCleanBlockError(err.message) }
  }

  const deleteCleanBlock = async (id) => {
    if (!await confirm()) return
    await fetchApi(`/cleaning/blocks/${id}`, { method: 'DELETE' })
    loadCleanBlocks()
    addToast(t('common.deleted'), 'success')
  }

  /* --- Cleaning Checklist Items --- */
  const [cleanChecklistItems, setCleanChecklistItems] = useState([])
  const [cleanChecklistZone, setCleanChecklistZone] = useState(null)
  const [cleanChecklistNew, setCleanChecklistNew] = useState('')
  const [cleanChecklistEditId, setCleanChecklistEditId] = useState(null)
  const [cleanChecklistEditName, setCleanChecklistEditName] = useState('')

  const loadCleanChecklist = (tipo, zoneId) => {
    let url = `/cleaning/checklist-items?tipo=${tipo}`
    if (zoneId) url += `&zone_id=${zoneId}`
    fetchApi(url).then(setCleanChecklistItems).catch(() => {})
  }

  useEffect(() => {
    loadCleanChecklist('room', null)
  }, [])

  const addCleanChecklistItem = async (e) => {
    e.preventDefault()
    if (!cleanChecklistNew.trim()) return
    const tipo = cleanChecklistZone ? 'zone' : 'room'
    await fetchApi('/cleaning/checklist-items', {
      method: 'POST',
      body: JSON.stringify({ tipo, zone_id: cleanChecklistZone?.id || null, nombre: cleanChecklistNew.trim() }),
    })
    setCleanChecklistNew('')
    loadCleanChecklist(tipo, cleanChecklistZone?.id)
  }

  const saveCleanChecklistEdit = async (id) => {
    if (!cleanChecklistEditName.trim()) return
    await fetchApi(`/cleaning/checklist-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre: cleanChecklistEditName.trim() }),
    })
    setCleanChecklistEditId(null)
    loadCleanChecklist(cleanChecklistZone ? 'zone' : 'room', cleanChecklistZone?.id)
  }

  const deleteCleanChecklistItem = async (id) => {
    if (!await confirm()) return
    await fetchApi(`/cleaning/checklist-items/${id}`, { method: 'DELETE' })
    loadCleanChecklist(cleanChecklistZone ? 'zone' : 'room', cleanChecklistZone?.id)
  }

  /* --- Render --- */
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-bold">{t('configuration.title')}</h1>

      <div className="tabs tabs-bordered">
        <button className={`tab ${tab === 'checklists' ? 'tab-active' : ''}`} onClick={() => setTab('checklists')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {t('configuration.checklists')}
        </button>
        <button className={`tab ${tab === 'zones' ? 'tab-active' : ''}`} onClick={() => setTab('zones')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
          {t('configuration.zones')}
        </button>
        <button className={`tab ${tab === 'schedules' ? 'tab-active' : ''}`} onClick={() => setTab('schedules')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {t('configuration.schedules')}
        </button>
        <button className={`tab ${tab === 'cleaning' ? 'tab-active' : ''}`} onClick={() => setTab('cleaning')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          {t('configuration.cleaning')}
        </button>
        <button className={`tab ${tab === 'doc_types' ? 'tab-active' : ''}`} onClick={() => setTab('doc_types')}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
          {t('configuration.doc_types')}
        </button>
      </div>

      {/* --- Checklists Tab --- */}
      {tab === 'checklists' && (
        <div className="flex flex-col gap-6">
          <ChecklistSection
            titleKey="admin_checklist.alta_title" items={regItems} loading={regLoading}
            newName={regNewName} setNewName={setRegNewName}
            newObligatorio={regNewObligatorio} setNewObligatorio={setRegNewObligatorio}
            showObligatorio={true}
            editingId={regEditingId} setEditingId={setRegEditingId}
            editName={regEditName} setEditName={setRegEditName}
            editObligatorio={regEditObligatorio} setEditObligatorio={setRegEditObligatorio}
            onAdd={addReg}
            onStartEdit={(item) => { setRegEditingId(item.id); setRegEditName(item.nombre); setRegEditObligatorio(!!item.obligatorio) }}
            onSaveEdit={saveRegEdit}
            onDelete={deleteReg}
            t={t}
          />
          <ChecklistSection
            titleKey="admin_checklist.baja_title" items={depItems} loading={depLoading}
            newName={depNewName} setNewName={setDepNewName}
            newObligatorio={false} setNewObligatorio={() => {}} showObligatorio={false}
            editingId={depEditingId} setEditingId={setDepEditingId}
            editName={depEditName} setEditName={setDepEditName}
            editObligatorio={false} setEditObligatorio={() => {}}
            onAdd={addDep}
            onStartEdit={(item) => { setDepEditingId(item.id); setDepEditName(item.nombre) }}
            onSaveEdit={saveDepEdit}
            onDelete={deleteDep}
            t={t}
          />
        </div>
      )}

      {/* --- Common Zones Tab --- */}
      {tab === 'zones' && (
        <div className="card bg-base-100 border shadow-sm">
          <div className="card-body">
            <h3 className="font-medium mb-2">{t('configuration.zones_subtitle')}</h3>
            <form onSubmit={addZone} className="join w-full mb-4">
              <input className="input input-bordered join-item flex-1" value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder={t('incidents.zone_placeholder')} required />
              <button type="submit" className="btn btn-primary join-item">{t('incidents.add_zone')}</button>
            </form>
            <div className="flex flex-col gap-1">
              {commonZones.map((z) => (
                <div key={z.id} className="flex items-center justify-between px-3 py-2.5 bg-base-200 rounded-box">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>
                    <span>{z.nombre}</span>
                  </div>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteZone(z.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              ))}
              {commonZones.length === 0 && <p className="text-sm opacity-60 text-center py-8">{t('incidents.zones_empty')}</p>}
            </div>
          </div>
        </div>
      )}

      {/* --- Schedules Tab --- */}
      {tab === 'schedules' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2 items-center">
              <span className="text-sm opacity-70">{t('schedules.filter')}</span>
              <select className="select select-bordered select-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">{t('schedules.all')}</option>
                {tipos.map((tp) => <option key={tp} value={tp}>{t('schedule_types.' + tp)}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={openCreateSched}>{t('schedules.new')}</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dias.map((dia) => {
              const grupos = {}
              horarios.filter((h) => h.dia_semana === dia).forEach((h) => {
                if (!grupos[h.tipo]) grupos[h.tipo] = []
                grupos[h.tipo].push(h)
              })
              const hasItems = Object.values(grupos).some((arr) => arr.length > 0)
              if (!hasItems) return null
              return (
                <div key={dia} className="card bg-base-100 border shadow-sm">
                  <div className="card-body p-4">
                    <h2 className="card-title text-base">{t('days.' + dia)}</h2>
                    <div className="flex flex-col gap-3">
                      {tipos.filter((tp) => grupos[tp]?.length > 0).map((tp) => (
                        <div key={tp}>
                          <h3 className="text-xs font-semibold opacity-60 uppercase tracking-wider mb-1">{t('schedule_types.' + tp)}</h3>
                          <div className="flex flex-col gap-1.5">
                            {grupos[tp].map((h) => (
                              <div key={h.id} className="bg-base-200 rounded-box p-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium text-sm">{h.titulo}</span>
                                    <div className="text-xs font-mono opacity-70 mt-0.5">
                                      {h.hora_fin ? `${h.hora_inicio?.slice(0, 5)} \u2014 ${h.hora_fin?.slice(0, 5)}` : h.hora_inicio?.slice(0, 5)}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <button className="btn btn-xs btn-ghost" onClick={() => openEditSched(h)}>{t('common.edit')}</button>
                                    <button className="btn btn-xs btn-ghost btn-error" onClick={() => deleteSched(h)}>{t('common.delete')}</button>
                                  </div>
                                </div>
                                {h.ubicacion && <p className="text-xs opacity-50 mt-0.5">{h.ubicacion}</p>}
                                {h.descripcion && <p className="text-xs opacity-40 mt-0.5">{h.descripcion}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {showSchedModal && (
            <dialog className="modal modal-open" onClick={() => setShowSchedModal(false)}>
              <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{editingSched ? t('schedules.edit_title') : t('schedules.create_title')}</h3>
                    <p className="text-sm opacity-60">{editingSched ? t('schedules.edit_desc') : t('schedules.create_desc')}</p>
                  </div>
                </div>
                <form onSubmit={saveSched} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('schedules.type')}</span></label>
                      <select className="select select-bordered" value={schedForm.tipo} onChange={(e) => setSchedForm({ ...schedForm, tipo: e.target.value })}>
                        {tipos.map((tp) => <option key={tp} value={tp}>{t('schedule_types.' + tp)}</option>)}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('schedules.title_field')}</span></label>
                      <input className="input input-bordered" value={schedForm.titulo} onChange={(e) => setSchedForm({ ...schedForm, titulo: e.target.value })} placeholder={t('schedules.title_placeholder')} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('schedules.day')}</span></label>
                      <select className="select select-bordered" value={schedForm.dia_semana} onChange={(e) => setSchedForm({ ...schedForm, dia_semana: e.target.value })}>
                        <option value="">{t('schedules.no_fixed_day')}</option>
                        {dias.map((d) => <option key={d} value={d}>{t('days.' + d)}</option>)}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('schedules.location')}</span></label>
                      <input className="input input-bordered" value={schedForm.ubicacion} onChange={(e) => setSchedForm({ ...schedForm, ubicacion: e.target.value })} placeholder={t('schedules.location_placeholder')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('schedules.start_time')}</span></label>
                      <input type="time" className="input input-bordered" value={schedForm.hora_inicio} onChange={(e) => setSchedForm({ ...schedForm, hora_inicio: e.target.value })} required />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text">{t('schedules.end_time')}</span></label>
                      <input type="time" className="input input-bordered" value={schedForm.hora_fin} onChange={(e) => setSchedForm({ ...schedForm, hora_fin: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">{t('schedules.description')}</span></label>
                    <textarea className="textarea textarea-bordered h-20" value={schedForm.descripcion} onChange={(e) => setSchedForm({ ...schedForm, descripcion: e.target.value })} placeholder={t('schedules.description_placeholder')} />
                  </div>
                  <div className="modal-action">
                    <button type="button" className="btn btn-soft" onClick={() => setShowSchedModal(false)}>{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-primary">{editingSched ? t('common.save') : t('common.create')}</button>
                  </div>
                </form>
              </div>
            </dialog>
          )}
        </div>
      )}

      {/* --- Document Types Tab --- */}
      {tab === 'doc_types' && (
        <div className="card bg-base-100 border shadow-sm">
          <div className="card-body">
            <h3 className="font-medium mb-2">{t('configuration.doc_types_subtitle')}</h3>
            <form onSubmit={addType} className="flex flex-col gap-3 mb-4">
              <input className="input input-bordered w-full" placeholder={t('documents.type_name_placeholder')} value={newTypeNombre} onChange={(e) => setNewTypeNombre(e.target.value)} required />
              <div className="flex gap-2 items-end">
                <div className="form-control flex-1">
                  <label className="label py-1"><span className="label-text">{t('documents.type_color')}</span></label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: 'badge-soft', bg: 'bg-base-300' },
                      { value: 'badge-primary', bg: 'bg-primary' },
                      { value: 'badge-info', bg: 'bg-info' },
                      { value: 'badge-success', bg: 'bg-success' },
                      { value: 'badge-warning', bg: 'bg-warning' },
                      { value: 'badge-error', bg: 'bg-error' },
                      { value: 'badge-neutral', bg: 'bg-neutral' },
                      { value: 'badge-outline', bg: 'bg-base-100 border border-base-300' },
                    ].map((c) => (
                      <button key={c.value} type="button" className={`w-7 h-7 rounded-full ${c.bg} ${newTypeColor === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''}`} onClick={() => setNewTypeColor(c.value)} />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">{t('common.add')}</button>
              </div>
            </form>
            <div className="flex flex-col gap-1">
              {tiposDoc.map((tp) => (
                <div key={tp.id} className="flex items-center justify-between p-2 bg-base-200 rounded-box">
                  <span className={`badge ${tp.color || 'badge-soft'}`}>{tp.nombre}</span>
                  <button className="btn btn-xs btn-ghost text-error" onClick={() => deleteType(tp.id, tp.nombre)}>{t('common.delete')}</button>
                </div>
              ))}
              {tiposDoc.length === 0 && <p className="text-sm opacity-60 text-center py-4">{t('documents.no_types')}</p>}
            </div>
          </div>
        </div>
      )}

      {/* --- Cleaning Tab --- */}
      {tab === 'cleaning' && (
        <div className="flex flex-col gap-6">
          <div className="tabs tabs-bordered">
            <button className={`tab ${cleanTab === 'blocks' ? 'tab-active' : ''}`} onClick={() => setCleanTab('blocks')}>{t('configuration.cleaning_blocks')}</button>
            <button className={`tab ${cleanTab === 'checklists' ? 'tab-active' : ''}`} onClick={() => setCleanTab('checklists')}>{t('configuration.cleaning_checklists')}</button>
          </div>

          {cleanTab === 'blocks' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('configuration.cleaning_blocks_subtitle')}</h3>
                <button className="btn btn-primary" onClick={() => { setCleanBlockForm({ dia_semana: 'Lunes', hora_inicio: '09:00', hora_fin: '13:00', selectedRooms: [], selectedZones: [] }); setCleanBlockError(''); setShowCleanBlockModal(true) }}>
                  {t('cleaning.new_block')}
                </button>
              </div>

              {cleanBlockError && <div className="alert alert-error text-sm">{cleanBlockError}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CLEAN_DIAS.map((dia) => {
                  const delDia = cleanBlocks.filter((b) => b.dia_semana === dia)
                  const idx = CLEAN_DIAS.indexOf(dia)
                  return (
                    <div key={dia} className={`card shadow-sm border ${idx % 2 === 0 ? 'bg-base-100' : 'bg-base-200'}`}>
                      <div className="card-body p-4">
                        <h2 className="card-title text-lg mb-2">{t('days.' + dia)}</h2>
                        {delDia.length === 0 && <p className="text-sm opacity-50">{t('cleaning.no_schedules')}</p>}
                        {delDia.map((b) => (
                          <div key={b.id} className="mb-2 p-2 bg-base-100 rounded-box border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{b.hora_inicio?.slice(0, 5)} — {b.hora_fin?.slice(0, 5)}</span>
                              <button className="btn btn-xs btn-ghost text-error" onClick={() => deleteCleanBlock(b.id)}>X</button>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.rooms?.map((r) => (
                                <span key={r.id} className={`badge badge-sm ${r.tipo === 'zone' ? 'badge-info' : 'badge-soft'}`}>
                                  {r.tipo === 'zone' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>}
                                  {r.room_name}
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

              {showCleanBlockModal && (
                <dialog className="modal modal-open" onClick={() => setShowCleanBlockModal(false)}>
                  <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{t('cleaning.create_title')}</h3>
                        <p className="text-sm opacity-60">{t('cleaning.create_desc')}</p>
                      </div>
                    </div>
                    <form onSubmit={createCleanBlock} className="flex flex-col gap-4">
                      <div className="form-control">
                        <label className="label"><span className="label-text">{t('cleaning.day')}</span></label>
                        <select className="select select-bordered" value={cleanBlockForm.dia_semana} onChange={(e) => setCleanBlockForm({ ...cleanBlockForm, dia_semana: e.target.value })}>
                          {CLEAN_DIAS.map((d) => <option key={d} value={d}>{t('days.' + d)}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="form-control">
                          <label className="label"><span className="label-text">{t('cleaning.start_time')}</span></label>
                          <input type="time" className="input input-bordered" value={cleanBlockForm.hora_inicio} onChange={(e) => setCleanBlockForm({ ...cleanBlockForm, hora_inicio: e.target.value })} required />
                        </div>
                        <div className="form-control">
                          <label className="label"><span className="label-text">{t('cleaning.end_time')}</span></label>
                          <input type="time" className="input input-bordered" value={cleanBlockForm.hora_fin} onChange={(e) => setCleanBlockForm({ ...cleanBlockForm, hora_fin: e.target.value })} required />
                        </div>
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text">{t('cleaning.rooms')}</span></label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto border border-base-300 rounded-box p-3 bg-base-200/50">
                          {rooms.map((r) => (
                            <label key={r.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-base-200 transition-colors">
                              <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={cleanBlockForm.selectedRooms.includes(r.nombre)} onChange={() => setCleanBlockForm({ ...cleanBlockForm, selectedRooms: toggleItem(cleanBlockForm.selectedRooms, r.nombre) })} />
                              <span className="text-sm">{r.nombre}</span>
                            </label>
                          ))}
                          {rooms.length === 0 && <p className="text-sm opacity-50 col-span-full">{t('cleaning.no_rooms')}</p>}
                        </div>
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text">{t('cleaning.zones')}</span></label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-base-300 rounded-box p-3 bg-base-200/50">
                          {zones.map((z) => (
                            <label key={z.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-base-200 transition-colors">
                              <input type="checkbox" className="checkbox checkbox-xs checkbox-info" checked={cleanBlockForm.selectedZones.includes(z.id)} onChange={() => setCleanBlockForm({ ...cleanBlockForm, selectedZones: toggleItem(cleanBlockForm.selectedZones, z.id) })} />
                              <span className="text-sm">{z.nombre}</span>
                            </label>
                          ))}
                          {zones.length === 0 && <p className="text-sm opacity-50 col-span-full">{t('cleaning.no_zones')}</p>}
                        </div>
                      </div>
                      <p className="text-xs text-primary">{t('cleaning.selected_items', { rooms: cleanBlockForm.selectedRooms.length, zones: cleanBlockForm.selectedZones.length })}</p>
                      <div className="modal-action">
                        <button type="button" className="btn btn-soft" onClick={() => setShowCleanBlockModal(false)}>{t('common.cancel')}</button>
                        <button type="submit" className="btn btn-primary">{t('common.create')}</button>
                      </div>
                    </form>
                  </div>
                </dialog>
              )}
            </>
          )}

          {cleanTab === 'checklists' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button className={`btn btn-sm ${!cleanChecklistZone ? 'btn-primary' : 'btn-soft'}`} onClick={() => { setCleanChecklistZone(null); loadCleanChecklist('room', null) }}>
                  {t('cleaning.room_checklist')}
                </button>
                {zones.map((z) => (
                  <button key={z.id} className={`btn btn-sm ${cleanChecklistZone?.id === z.id ? 'btn-info' : 'btn-soft'}`} onClick={() => { setCleanChecklistZone(z); loadCleanChecklist('zone', z.id) }}>
                    {z.nombre}
                  </button>
                ))}
              </div>

              <div className="card bg-base-100 border shadow-sm">
                <div className="card-body">
                  <h3 className="font-medium">{cleanChecklistZone ? t('cleaning.zone_checklist', { name: cleanChecklistZone.nombre }) : t('cleaning.room_checklist')}</h3>
                  <form onSubmit={addCleanChecklistItem} className="flex gap-2 mt-2">
                    <input className="input input-bordered flex-1" placeholder={t('cleaning.checklist_item_placeholder')} value={cleanChecklistNew} onChange={(e) => setCleanChecklistNew(e.target.value)} required />
                    <button type="submit" className="btn btn-primary">{t('cleaning.add_item')}</button>
                  </form>
                  <div className="flex flex-col gap-1 mt-4">
                    {cleanChecklistItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-base-200 rounded-box">
                        {cleanChecklistEditId === item.id ? (
                          <div className="flex gap-2 flex-1">
                            <input className="input input-bordered input-sm flex-1" value={cleanChecklistEditName} onChange={(e) => setCleanChecklistEditName(e.target.value)} />
                            <button className="btn btn-xs btn-primary" onClick={() => saveCleanChecklistEdit(item.id)}>{t('common.save')}</button>
                            <button className="btn btn-xs btn-ghost" onClick={() => setCleanChecklistEditId(null)}>{t('common.cancel')}</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm">{item.nombre}</span>
                            <div className="flex gap-1">
                              <button className="btn btn-xs btn-ghost" onClick={() => { setCleanChecklistEditId(item.id); setCleanChecklistEditName(item.nombre) }}>{t('common.edit')}</button>
                              <button className="btn btn-xs btn-ghost text-error" onClick={() => deleteCleanChecklistItem(item.id)}>{t('common.delete')}</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {cleanChecklistItems.length === 0 && <p className="text-sm opacity-60 text-center py-4">{t('cleaning.no_checklist_items')}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
