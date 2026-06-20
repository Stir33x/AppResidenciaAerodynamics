import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useToast } from '../components/Toast'

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

export default function AdminChecklistPage() {
  const { t } = useTranslation()
  const { addToast, confirm } = useToast()

  const [tab, setTab] = useState('alta')

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
    try {
      const data = await fetchApi('/registration-checklist/items')
      setRegItems(data)
    } catch (err) { addToast(err.message, 'error') }
    setRegLoading(false)
  }

  const loadDep = async () => {
    try {
      const data = await fetchApi('/departure-checklist/items')
      setDepItems(data)
    } catch (err) { addToast(err.message, 'error') }
    setDepLoading(false)
  }

  useEffect(() => {
    loadReg()
    loadDep()
  }, [])

  const addReg = async (e) => {
    e.preventDefault()
    if (!regNewName.trim()) return
    try {
      await fetchApi('/registration-checklist/items', {
        method: 'POST',
        body: JSON.stringify({ nombre: regNewName.trim(), obligatorio: regNewObligatorio }),
      })
      setRegNewName('')
      setRegNewObligatorio(false)
      loadReg()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const addDep = async (e) => {
    e.preventDefault()
    if (!depNewName.trim()) return
    try {
      await fetchApi('/departure-checklist/items', {
        method: 'POST',
        body: JSON.stringify({ nombre: depNewName.trim() }),
      })
      setDepNewName('')
      loadDep()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const saveRegEdit = async (id) => {
    if (!regEditName.trim()) return
    try {
      await fetchApi(`/registration-checklist/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: regEditName.trim(), obligatorio: regEditObligatorio }),
      })
      setRegEditingId(null)
      loadReg()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const saveDepEdit = async (id) => {
    if (!depEditName.trim()) return
    try {
      await fetchApi(`/departure-checklist/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: depEditName.trim() }),
      })
      setDepEditingId(null)
      loadDep()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const deleteReg = async (id) => {
    if (!await confirm()) return
    try {
      await fetchApi(`/registration-checklist/items/${id}`, { method: 'DELETE' })
      loadReg()
      addToast(t('common.deleted'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const deleteDep = async (id) => {
    if (!await confirm()) return
    try {
      await fetchApi(`/departure-checklist/items/${id}`, { method: 'DELETE' })
      loadDep()
      addToast(t('common.deleted'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-bold">{t('admin_checklist.title')}</h1>

      <div className="tabs tabs-bordered">
        <button className={`tab ${tab === 'alta' ? 'tab-active' : ''}`} onClick={() => setTab('alta')}>
          {t('admin_checklist.alta_tab')}
        </button>
        <button className={`tab ${tab === 'baja' ? 'tab-active' : ''}`} onClick={() => setTab('baja')}>
          {t('admin_checklist.baja_tab')}
        </button>
      </div>

      {tab === 'alta' && (
        <ChecklistSection
          titleKey="admin_checklist.alta_title"
          items={regItems}
          loading={regLoading}
          newName={regNewName}
          setNewName={setRegNewName}
          newObligatorio={regNewObligatorio}
          setNewObligatorio={setRegNewObligatorio}
          showObligatorio={true}
          editingId={regEditingId}
          setEditingId={setRegEditingId}
          editName={regEditName}
          setEditName={setRegEditName}
          editObligatorio={regEditObligatorio}
          setEditObligatorio={setRegEditObligatorio}
          onAdd={addReg}
          onStartEdit={(item) => { setRegEditingId(item.id); setRegEditName(item.nombre); setRegEditObligatorio(!!item.obligatorio) }}
          onSaveEdit={saveRegEdit}
          onDelete={deleteReg}
          t={t}
        />
      )}

      {tab === 'baja' && (
        <ChecklistSection
          titleKey="admin_checklist.baja_title"
          items={depItems}
          loading={depLoading}
          newName={depNewName}
          setNewName={setDepNewName}
          newObligatorio={false}
          setNewObligatorio={() => {}}
          showObligatorio={false}
          editingId={depEditingId}
          setEditingId={setDepEditingId}
          editName={depEditName}
          setEditName={setDepEditName}
          editObligatorio={false}
          setEditObligatorio={() => {}}
          onAdd={addDep}
          onStartEdit={(item) => { setDepEditingId(item.id); setDepEditName(item.nombre) }}
          onSaveEdit={saveDepEdit}
          onDelete={deleteDep}
          t={t}
        />
      )}
    </div>
  )
}
