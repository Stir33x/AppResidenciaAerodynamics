import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const tiposDoc = ['contrato', 'documento', 'justificante', 'parte', 'recibo', 'otro']

export default function DocumentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isStaff = user?.rol !== 'estudiante'
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadTipo, setUploadTipo] = useState('documento')

  useEffect(() => { fetchApi('/students').then(setStudents).catch(() => {}) }, [])

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
    } catch (err) { alert(err.message) }
    setUploading(false)
  }

  const handleDelete = async (doc) => {
    if (!confirm(t('documents.confirm_delete', { name: doc.nombre_original }))) return
    try {
      await fetchApi(`/students/${selected.id}/documentos/${doc.id}`, { method: 'DELETE' })
      loadDocs(selected.id)
    } catch (err) { alert(err.message) }
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
    } catch (err) { alert(err.message) }
  }

  const tipoBadge = (docType) => {
    const cls = { contrato: 'badge-primary', justificante: 'badge-info', parte: 'badge-warning', recibo: 'badge-success' }
    return <span className={`badge ${cls[docType] || 'badge-soft'}`}>{t('doc_types.' + docType)}</span>
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
      <h1 className="text-3xl font-bold">{t('documents.title')}</h1>

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
                        {tiposDoc.map((tp) => <option key={tp} value={tp}>{t('doc_types.' + tp)}</option>)}
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
    </div>
  )
}

function StudentDocumentsView({ email, tipoBadge }) {
  const { t } = useTranslation()
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
      <h1 className="text-3xl font-bold">{t('documents.student_title')}</h1>
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
                      } catch { alert(t('documents.open_error')) }
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
