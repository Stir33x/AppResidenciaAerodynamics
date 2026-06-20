import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function DocumentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast, confirm } = useToast()
  const isStaff = user?.rol !== 'estudiante'
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadTipo, setUploadTipo] = useState('documento')
  const [tiposDoc, setTiposDoc] = useState([])
  const [showTypesModal, setShowTypesModal] = useState(false)
  const [newTypeNombre, setNewTypeNombre] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('badge-soft')
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null)

  useEffect(() => {
    fetchApi('/document-types').then(setTiposDoc).catch(() => {})
    fetchApi('/students').then(setStudents).catch(() => {})
  }, [])

  const loadTypes = async () => {
    const data = await fetchApi('/document-types')
    setTiposDoc(data)
  }

  const loadDocs = async (studentId) => {
    const data = await fetchApi(`/students/${studentId}/documentos`)
    setDocs(data)
  }

  const selectStudent = (s) => {
    setSelected(s)
    setDocs([])
    loadDocs(s.id)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    const fileInput = document.getElementById('doc-file')
    const file = fileInput?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', uploadTipo)
      await fetch(`http://localhost:3000/api/students/${selected.id}/documentos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      fileInput.value = ''
      loadDocs(selected.id)
    } catch (err) { addToast(err.message, 'error') }
    setUploading(false)
  }

  const handleDelete = async (doc) => {
    setConfirmDeleteDoc(doc)
  }

  const executeDelete = async () => {
    if (!confirmDeleteDoc) return
    try {
      await fetchApi(`/students/${selected.id}/documentos/${confirmDeleteDoc.id}`, { method: 'DELETE' })
      setConfirmDeleteDoc(null)
      loadDocs(selected.id)
      addToast(t('common.deleted'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const viewDocument = async (doc) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`http://localhost:3000/api/students/${selected.id}/documentos/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(t('documents.download_error'))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) { addToast(err.message, 'error') }
  }

  const tipoBadge = (docType) => {
    const found = tiposDoc.find((t) => t.nombre === docType)
    return <span className={`badge ${found?.color || 'badge-soft'}`}>{found?.nombre || docType}</span>
  }

  const addType = async (e) => {
    e.preventDefault()
    if (!newTypeNombre.trim()) return
    await fetchApi('/document-types', {
      method: 'POST',
      body: JSON.stringify({ nombre: newTypeNombre.trim(), color: newTypeColor }),
    })
    setNewTypeNombre('')
    setNewTypeColor('badge-soft')
    loadTypes()
  }

  const deleteType = async (id, name) => {
    if (!await confirm(t('documents.confirm_delete_type', { name }))) return
    await fetchApi(`/document-types/${id}`, { method: 'DELETE' })
    loadTypes()
    addToast(t('common.deleted'), 'success')
  }

  if (!isStaff) {
    return (
      <StudentDocumentsView
        email={user.email}
        tipoBadge={tipoBadge}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-4xl font-bold">{t('documents.title')}</h1>
        <button className="btn btn-sm btn-soft" onClick={() => setShowTypesModal(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {t('documents.manage_types')}
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="w-full md:w-72 flex flex-col gap-1">
          <p className="text-sm opacity-70 mb-1">{t('documents.select_student')}</p>
          <input
            className="input input-bordered input-sm mb-2"
            placeholder={t('common.search')}
            onChange={(e) => {
              const q = e.target.value.toLowerCase()
              document.querySelectorAll('.student-item').forEach((el) => {
                el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none'
              })
            }}
          />
          <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto border rounded-box p-1">
            {students.map((s) => (
              <button
                key={s.id}
                className={`student-item btn btn-sm btn-ghost justify-start text-left ${selected?.id === s.id ? 'btn-active' : ''}`}
                onClick={() => selectStudent(s)}
              >
                {s.nombre} {s.apellidos}
                <span className="badge badge-xs badge-outline ml-auto">{s.habitacion || '-'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="card bg-base-100 border shadow-sm">
              <div className="card-body text-center opacity-60">
                {t('documents.select_hint')}
              </div>
            </div>
          ) : (
            <>
              <div className="card bg-base-100 border shadow-sm mb-4">
                <div className="card-body">
                  <h2 className="card-title">{selected.nombre} {selected.apellidos}</h2>
                  <p className="text-sm opacity-60">{selected.email} — {selected.habitacion || t('documents.no_room')}</p>
                </div>
              </div>

              <div className="card bg-base-100 border shadow-sm mb-4">
                <div className="card-body">
                  <h3 className="font-medium">{t('documents.upload_title')}</h3>
                  <form onSubmit={handleUpload} className="flex items-end gap-2 flex-wrap">
                    <div className="form-control">
                      <label className="label py-1"><span className="label-text">{t('documents.type')}</span></label>
                      <select className="select select-bordered select-sm" value={uploadTipo} onChange={(e) => setUploadTipo(e.target.value)}>
                        {tiposDoc.map((tp) => <option key={tp.id} value={tp.nombre}>{tp.nombre}</option>)}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label py-1"><span className="label-text">{t('documents.file')}</span></label>
                      <input id="doc-file" type="file" className="file-input file-input-bordered file-input-sm w-48" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm mb-1" disabled={uploading}>
                      {uploading ? t('documents.uploading') : t('documents.upload')}
                    </button>
                  </form>
                </div>
              </div>

              <div className="card bg-base-100 border shadow-sm">
                <div className="card-body">
                  <h3 className="font-medium">{t('documents.count', { count: docs.length })}</h3>
                  {docs.length === 0 ? (
                    <p className="text-sm opacity-60">{t('documents.empty')}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {docs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-base-200 rounded-box">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {tipoBadge(doc.tipo)}
                              <span className="font-medium truncate">{doc.nombre_original}</span>
                            </div>
                            <p className="text-xs opacity-60 mt-1">
                              {new Date(doc.created_at).toLocaleDateString('es-ES')} — {doc.subido_por_nombre || t('documents.uploaded_by')}
                              {doc.tamano ? <> &middot; {t('documents.size', { size: (doc.tamano / 1024).toFixed(1) })}</> : ''}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button className="btn btn-xs btn-soft" onClick={() => viewDocument(doc)}>{t('documents.view')}</button>
                            <button className="btn btn-xs btn-ghost btn-error" onClick={() => handleDelete(doc)}>{t('common.delete')}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showTypesModal && (
        <dialog className="modal modal-open" onClick={() => setShowTypesModal(false)}>
          <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('documents.manage_types')}</h3>
                <p className="text-sm opacity-60">{t('documents.manage_types_desc')}</p>
              </div>
            </div>

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

            <div className="modal-action">
              <button className="btn btn-soft" onClick={() => setShowTypesModal(false)}>{t('common.close')}</button>
            </div>
          </div>
        </dialog>
      )}

      {confirmDeleteDoc && (
        <dialog className="modal modal-open" onClick={() => setConfirmDeleteDoc(null)}>
          <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('common.confirm')}</h3>
                <p className="text-sm opacity-60">{t('documents.confirm_delete', { nombre: confirmDeleteDoc.nombre_original })}</p>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-soft" onClick={() => setConfirmDeleteDoc(null)}>{t('common.cancel')}</button>
              <button className="btn btn-error" onClick={executeDelete}>{t('common.delete')}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}

function StudentDocumentsView({ email, tipoBadge }) {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const [myDocs, setMyDocs] = useState([])
  const [myStudent, setMyStudent] = useState(null)

  useEffect(() => {
    fetchApi('/students').then((students) => {
      const me = students.find((s) => s.email === email)
      if (me) {
        setMyStudent(me)
        fetchApi(`/students/${me.id}/documentos`).then(setMyDocs).catch(() => {})
      }
    }).catch(() => {})
  }, [email])

  if (!myStudent) return <p className="opacity-60">{t('documents.empty')}</p>

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-bold">{t('documents.student_title')}</h1>
      <div className="card bg-base-100 border shadow-sm">
        <div className="card-body">
          <h2 className="card-title">{t('documents.student_of', { name: `${myStudent.nombre} ${myStudent.apellidos}` })}</h2>
          {myDocs.length === 0 ? (
            <p className="text-sm opacity-60">{t('documents.student_empty')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {myDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-base-200 rounded-box">
                  <div>
                    <div className="flex items-center gap-2">
                      {tipoBadge(doc.tipo)}
                      <span>{doc.nombre_original}</span>
                    </div>
                    <p className="text-xs opacity-60 mt-1">{new Date(doc.created_at).toLocaleDateString('es-ES')}</p>
                  </div>
                  <button
                    className="btn btn-xs btn-soft"
                    onClick={async () => {
                      const token = localStorage.getItem('token')
                      try {
                        const res = await fetch(`http://localhost:3000/api/students/${myStudent.id}/documentos/${doc.id}/download`, {
                          headers: { Authorization: `Bearer ${token}` }
                        })
                        if (!res.ok) throw new Error()
                        const blob = await res.blob()
                        window.open(URL.createObjectURL(blob), '_blank')
                      } catch { addToast(t('documents.open_error'), 'error') }
                    }}
                  >{t('documents.view')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
