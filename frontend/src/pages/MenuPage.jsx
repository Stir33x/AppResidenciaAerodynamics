import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { fetchApi } from '../lib/api'
import { useToast } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'

const DIA_KEYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function MenuPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast } = useToast()
  const isEditable = ['direccion', 'administracion', 'cocina'].includes(user?.rol)

  const [tab, setTab] = useState('templates')
  const [templates, setTemplates] = useState([])
  const [allergens, setAllergens] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [effectiveMenu, setEffectiveMenu] = useState(null)
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [allergenModal, setAllergenModal] = useState({ open: false, item: null })

  // Modals
  const [tmplModal, setTmplModal] = useState({ open: false, edit: null })
  const [sectionModal, setSectionModal] = useState({ open: false })
  const [itemModal, setItemModal] = useState({ open: false, sectionId: null })
  const [assignModal, setAssignModal] = useState({ open: false, edit: null, tipo: 'semanal', dia_semana: null, fecha: null })
  const [confirm, setConfirm] = useState({ open: false, onConfirm: null, message: '' })

  const fetchTemplates = useCallback(async () => {
    try { setTemplates(await fetchApi('/menu/templates')) }
    catch { addToast(t('common.error_occurred'), 'error') }
  }, [t, addToast])

  const fetchAllergens = useCallback(async () => {
    try { setAllergens(await fetchApi('/menu/allergens')) }
    catch { /* silent */ }
  }, [])

  const fetchAssignments = useCallback(async () => {
    try { setAssignments(await fetchApi('/menu/assignments')) }
    catch { /* silent */ }
  }, [])

  const fetchTemplateDetail = useCallback(async (id) => {
    try { setSelectedTemplate(await fetchApi(`/menu/templates/${id}`)) }
    catch { addToast(t('common.error_occurred'), 'error') }
  }, [t, addToast])

  const fetchEffective = useCallback(async (fecha) => {
    try { setEffectiveMenu(await fetchApi(`/menu/effective?fecha=${fecha}`)) }
    catch { setEffectiveMenu(null) }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTemplates(), fetchAllergens(), fetchAssignments()]).finally(() => setLoading(false))
  }, [fetchTemplates, fetchAllergens, fetchAssignments])

  useEffect(() => {
    if (selectedTemplate) fetchTemplateDetail(selectedTemplate.id)
  }, [selectedTemplate?.id, fetchTemplateDetail])

  useEffect(() => {
    if (tab === 'view') fetchEffective(viewDate)
  }, [tab, viewDate, fetchEffective])

  // ── Templates ──────────────────────────────────────────────
  const saveTemplate = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = { nombre: fd.get('nombre'), descripcion: fd.get('descripcion'), is_global: fd.get('is_global') === 'on' }
    try {
      if (tmplModal.edit) {
        await fetchApi(`/menu/templates/${tmplModal.edit}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        const { id } = await fetchApi('/menu/templates', { method: 'POST', body: JSON.stringify(body) })
        setSelectedTemplate({ id, ...body, sections: [] })
      }
      addToast(t('common.saved'))
      setTmplModal({ open: false, edit: null })
      fetchTemplates(); fetchAssignments()
    } catch { addToast(t('common.error_occurred'), 'error') }
  }

  const deleteTemplate = (id, name) => {
    setConfirm({ open: true, message: t('menu.confirm_delete_template', { name }), onConfirm: async () => {
      try {
        await fetchApi(`/menu/templates/${id}`, { method: 'DELETE' })
        addToast(t('common.deleted'))
        if (selectedTemplate?.id === id) setSelectedTemplate(null)
        fetchTemplates(); fetchAssignments()
      } catch { addToast(t('common.error_occurred'), 'error') }
      setConfirm({ open: false })
    }})
  }

  // ── Sections ───────────────────────────────────────────────
  const saveSection = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = { nombre: fd.get('nombre') }
    try {
      await fetchApi(`/menu/templates/${selectedTemplate.id}/sections`, { method: 'POST', body: JSON.stringify(body) })
      addToast(t('common.saved'))
      setSectionModal({ open: false })
      fetchTemplateDetail(selectedTemplate.id)
    } catch { addToast(t('common.error_occurred'), 'error') }
  }

  const deleteSection = (sid, name) => {
    setConfirm({ open: true, message: t('menu.confirm_delete_section', { name }), onConfirm: async () => {
      try {
        await fetchApi(`/menu/templates/${selectedTemplate.id}/sections/${sid}`, { method: 'DELETE' })
        addToast(t('common.deleted'))
        fetchTemplateDetail(selectedTemplate.id)
      } catch { addToast(t('common.error_occurred'), 'error') }
      setConfirm({ open: false })
    }})
  }

  // ── Items ──────────────────────────────────────────────────
  const saveItem = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = { nombre: fd.get('nombre'), descripcion: fd.get('descripcion'), precio: parseFloat(fd.get('precio')) || 0 }
    try {
      await fetchApi(`/menu/templates/${selectedTemplate.id}/sections/${itemModal.sectionId}/items`, { method: 'POST', body: JSON.stringify(body) })
      addToast(t('common.saved'))
      setItemModal({ open: false, sectionId: null })
      fetchTemplateDetail(selectedTemplate.id)
    } catch { addToast(t('common.error_occurred'), 'error') }
  }

  const deleteItem = (iid) => {
    const sec = selectedTemplate.sections.find(s => s.items?.some(i => i.id === iid))
    if (!sec) return
    const item = sec.items.find(i => i.id === iid)
    setConfirm({ open: true, message: t('menu.confirm_delete_item', { name: item?.nombre }), onConfirm: async () => {
      try {
        await fetchApi(`/menu/templates/${selectedTemplate.id}/sections/${sec.id}/items/${iid}`, { method: 'DELETE' })
        addToast(t('common.deleted'))
        fetchTemplateDetail(selectedTemplate.id)
      } catch { addToast(t('common.error_occurred'), 'error') }
      setConfirm({ open: false })
    }})
  }

  // ── Allergens ──────────────────────────────────────────────
  const toggleAllergen = async (itemId, allergenId, hasIt) => {
    try {
      if (hasIt) {
        await fetchApi(`/menu/items/${itemId}/allergens/${allergenId}`, { method: 'DELETE' })
      } else {
        await fetchApi(`/menu/items/${itemId}/allergens`, { method: 'POST', body: JSON.stringify({ allergen_id: allergenId }) })
      }
      fetchTemplateDetail(selectedTemplate.id)
    } catch { addToast(t('common.error_occurred'), 'error') }
  }

  // ── Assignments ────────────────────────────────────────────
  const saveAssignment = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const body = {
      template_id: parseInt(fd.get('template_id')),
      tipo: fd.get('tipo'),
      dia_semana: fd.get('dia_semana') ? parseInt(fd.get('dia_semana')) : null,
      fecha: fd.get('fecha') || null,
    }
    try {
      if (assignModal.edit) {
        await fetchApi(`/menu/assignments/${assignModal.edit}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await fetchApi('/menu/assignments', { method: 'POST', body: JSON.stringify(body) })
      }
      addToast(t('common.saved'))
      setAssignModal({ open: false, edit: null })
      fetchAssignments()
      if (tab === 'view') fetchEffective(viewDate)
    } catch (err) {
      addToast(err.message || t('common.error_occurred'), 'error')
    }
  }

  const deleteAssignment = (id) => {
    setConfirm({ open: true, message: t('menu.confirm_delete_assignment'), onConfirm: async () => {
      try {
        await fetchApi(`/menu/assignments/${id}`, { method: 'DELETE' })
        addToast(t('common.deleted'))
        fetchAssignments()
        if (tab === 'view') fetchEffective(viewDate)
      } catch { addToast(t('common.error_occurred'), 'error') }
      setConfirm({ open: false })
    }})
  }

  if (loading) {
    return <div className="flex justify-center p-10"><span className="loading loading-spinner loading-lg text-primary" /></div>
  }

  const tabs = [
    { key: 'templates', label: t('menu.templates_tab') },
    { key: 'schedule', label: t('menu.schedule_tab') },
    { key: 'view', label: t('menu.view_tab') },
  ]

  const openAllergenModal = (item) => {
    setAllergenModal({ open: true, item })
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={confirm.open}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ open: false })}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('menu.title')}</h1>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-border">
        {tabs.map(({ key, label }) => (
          <button key={key} role="tab" className={`tab ${tab === key ? 'tab-active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════ TAB: PLANTILLAS ════════════════ */}
      {tab === 'templates' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Template list */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="border border-base-300 rounded-xl overflow-hidden">
              <div className="p-3 bg-base-200 border-b border-base-300 flex items-center justify-between">
                <h2 className="section-title">{t('menu.templates_tab')}</h2>
                {isEditable && (
                  <button className="btn btn-primary btn-xs" onClick={() => setTmplModal({ open: true, edit: null })}>
                    {t('menu.new_template')}
                  </button>
                )}
              </div>
              <div className="divide-y divide-base-200 max-h-[65vh] overflow-y-auto">
                {templates.length === 0 && (
                  <p className="text-sm text-base-content/50 p-4">{t('menu.templates_empty')}</p>
                )}
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`w-full text-left p-3 transition-colors hover:bg-base-200 ${
                      selectedTemplate?.id === tpl.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{tpl.nombre}</span>
                      {tpl.is_global ? <span className="badge badge-soft badge-info badge-xs whitespace-nowrap">{t('menu.global_badge')}</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Template detail */}
          <div className="flex-1 min-w-0">
            {!selectedTemplate ? (
              <div className="border border-base-300 rounded-xl p-8 text-center text-base-content/50">
                <p className="text-sm">{t('common.select')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="border border-base-300 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="section-title">{selectedTemplate.nombre}</h2>
                        {selectedTemplate.is_global ? <span className="badge badge-soft badge-info badge-xs">{t('menu.global_badge')}</span> : null}
                      </div>
                      {selectedTemplate.descripcion && (
                        <p className="text-sm text-base-content/60 mt-1">{selectedTemplate.descripcion}</p>
                      )}
                    </div>
                    {isEditable && (
                      <div className="flex gap-1 shrink-0">
                        <button className="btn btn-ghost btn-xs" onClick={() => setTmplModal({ open: true, edit: selectedTemplate.id })}>
                          {t('common.edit')}
                        </button>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteTemplate(selectedTemplate.id, selectedTemplate.nombre)}>
                          {t('common.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sections */}
                {(!selectedTemplate.sections || selectedTemplate.sections.length === 0) ? (
                  <div className="border border-base-300 rounded-xl p-6 text-center text-sm text-base-content/50">
                    {t('menu.sections_empty')}
                  </div>
                ) : (
                  selectedTemplate.sections.map((sec) => (
                    <div key={sec.id} className="border border-base-300 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-base-200 border-b border-base-300">
                        <h3 className="font-semibold text-sm">{sec.nombre}</h3>
                        {isEditable && (
                          <div className="flex gap-1">
                            <button className="btn btn-ghost btn-xs" onClick={() => setItemModal({ open: true, sectionId: sec.id })}>
                              {t('menu.item_add')}
                            </button>
                            <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteSection(sec.id, sec.nombre)}>
                              {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                      {(!sec.items || sec.items.length === 0) ? (
                        <p className="text-sm text-base-content/50 p-4">{t('menu.items_empty')}</p>
                      ) : (
                        <div className="divide-y divide-base-200">
                          {sec.items.map((item) => (
                            <div key={item.id} className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{item.nombre}</span>
                                    {item.precio > 0 && (
                                      <span className="text-xs text-base-content/50">{Number(item.precio).toFixed(2)} €</span>
                                    )}
                                  </div>
                                  {item.descripcion && (
                                    <p className="text-xs text-base-content/50 mt-0.5">{item.descripcion}</p>
                                  )}
                                  {item.allergens && item.allergens.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {item.allergens.map((a) => (
                                        <span key={a.id} className="badge badge-soft badge-warning badge-xs">{t('allergens.' + a.nombre)}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {isEditable && (
                                  <div className="flex gap-1 shrink-0">
                                    <button className="btn btn-ghost btn-xs" onClick={() => openAllergenModal(item)} title={t('menu.allergens')}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                                      </svg>
                                    </button>
                                    <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteItem(item.id)}>
                                      {t('common.delete')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {isEditable && (
                  <button className="btn btn-outline btn-sm btn-dash w-full" onClick={() => setSectionModal({ open: true })}>
                    {t('menu.section_add')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ TAB: PROGRAMACIÓN ════════════════ */}
      {tab === 'schedule' && (
        <div className="space-y-6">
          {/* Global */}
          <div className="border border-base-300 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-1">{t('menu.assign_global')}</h3>
            <p className="text-xs text-base-content/50 mb-3">{t('menu.assign_global_desc')}</p>
            {(() => {
              const globalAssgn = assignments.find(a => a.tipo === 'global')
              return (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{globalAssgn ? globalAssgn.template_nombre : t('menu.assign_none')}</span>
                  {isEditable && (
                    <>
                      <button className="btn btn-ghost btn-xs" onClick={() => setAssignModal({ open: true, edit: globalAssgn?.id || null, tipo: 'global' })}>
                        {globalAssgn ? t('common.edit') : t('common.add')}
                      </button>
                      {globalAssgn && (
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteAssignment(globalAssgn.id)}>
                          {t('common.delete')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Weekly */}
          <div>
            <h3 className="font-semibold text-sm mb-3">{t('menu.schedule_tab')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                const assgn = assignments.find(a => a.tipo === 'semanal' && a.dia_semana === dayNum)
                return (
                  <div key={dayNum} className="border border-base-300 rounded-xl p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-2">
                      {t('days.' + DIA_KEYS[dayNum])}
                    </h4>
                    <p className="text-sm mb-2">{assgn ? assgn.template_nombre : t('menu.assign_none')}</p>
                    {isEditable && (
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => setAssignModal({ open: true, edit: assgn?.id || null, tipo: 'semanal', dia_semana: dayNum })}>
                          {assgn ? t('common.edit') : t('common.add')}
                        </button>
                        {assgn && (
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteAssignment(assgn.id)}>
                            {t('common.delete')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Specific dates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{t('menu.assign_date')}</h3>
              {isEditable && (
                <button className="btn btn-primary btn-xs" onClick={() => setAssignModal({ open: true, edit: null, tipo: 'fecha', fecha: null })}>
                  {t('common.add')}
                </button>
              )}
            </div>
            <div className="border border-base-300 rounded-xl overflow-hidden">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>{t('menu.assign_table_template')}</th>
                    <th>{t('menu.assign_table_date')}</th>
                    {isEditable && <th className="w-20">{t('common.actions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.filter(a => a.tipo === 'fecha').length === 0 && (
                    <tr><td colSpan={isEditable ? 3 : 2} className="text-center text-sm text-base-content/50 py-4">{t('menu.assign_none')}</td></tr>
                  )}
                  {assignments.filter(a => a.tipo === 'fecha').map((a) => (
                    <tr key={a.id}>
                      <td className="text-sm">{a.template_nombre}</td>
                      <td className="text-sm">{a.fecha ? new Date(a.fecha).toLocaleDateString('es-ES') : '-'}</td>
                      {isEditable && (
                        <td>
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => deleteAssignment(a.id)}>{t('common.delete')}</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TAB: VISTA ════════════════ */}
      {tab === 'view' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium">{t('menu.view_date')}</label>
            <input type="date" className="input input-bordered input-sm" value={viewDate} onChange={(e) => setViewDate(e.target.value)} />
            <button className="btn btn-ghost btn-xs" onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setViewDate(today)
            }}>{t('menu.view_today')}</button>
          </div>

          {!effectiveMenu ? (
            <div className="border border-base-300 rounded-xl p-8 text-center text-sm text-base-content/50">
              {t('menu.view_no_menu')}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-base-300 rounded-xl p-4">
                <h2 className="section-title">{effectiveMenu.nombre}</h2>
                {effectiveMenu.descripcion && (
                  <p className="text-sm text-base-content/60 mt-1">{effectiveMenu.descripcion}</p>
                )}
              </div>
              {(!effectiveMenu.sections || effectiveMenu.sections.length === 0) ? (
                <div className="border border-base-300 rounded-xl p-6 text-center text-sm text-base-content/50">
                  {t('menu.sections_empty')}
                </div>
              ) : (
                effectiveMenu.sections.map((sec) => (
                  <div key={sec.id} className="border border-base-300 rounded-xl overflow-hidden">
                    <div className="p-3 bg-base-200 border-b border-base-300">
                      <h3 className="font-semibold text-sm">{sec.nombre}</h3>
                    </div>
                    {(!sec.items || sec.items.length === 0) ? (
                      <p className="text-sm text-base-content/50 p-4">{t('menu.items_empty')}</p>
                    ) : (
                      <div className="divide-y divide-base-200">
                        {sec.items.map((item) => (
                          <div key={item.id} className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{item.nombre}</span>
                              {item.precio > 0 && (
                                <span className="text-xs text-base-content/50">{Number(item.precio).toFixed(2)} €</span>
                              )}
                            </div>
                            {item.descripcion && (
                              <p className="text-xs text-base-content/50 mt-0.5">{item.descripcion}</p>
                            )}
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {item.allergens.map((a) => (
                                  <span key={a.id} className="badge badge-soft badge-warning badge-xs">{a.nombre}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}

      {/* Template modal */}
      {tmplModal.open && (
        <dialog className="modal modal-open" onClick={() => setTmplModal({ open: false })}>
          <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{tmplModal.edit ? t('menu.edit_template') : t('menu.create_template')}</h3>
            <form onSubmit={saveTemplate} className="space-y-3">
              <div>
                <label className="label-text text-sm">{t('menu.template_name')}</label>
                <input name="nombre" required className="input input-bordered w-full mt-1" placeholder={t('menu.template_name_placeholder')}
                  defaultValue={tmplModal.edit ? selectedTemplate?.nombre : ''} />
              </div>
              <div>
                <label className="label-text text-sm">{t('menu.template_desc')}</label>
                <textarea name="descripcion" className="textarea textarea-bordered w-full mt-1" rows={2} placeholder={t('menu.template_desc_placeholder')}
                  defaultValue={tmplModal.edit ? selectedTemplate?.descripcion : ''} />
              </div>
              <div className="flex items-center gap-2">
                <input name="is_global" type="checkbox" className="checkbox checkbox-sm"
                  defaultChecked={tmplModal.edit ? selectedTemplate?.is_global : false} />
                <span className="text-sm">{t('menu.template_is_global')}</span>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setTmplModal({ open: false })}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Section modal */}
      {sectionModal.open && (
        <dialog className="modal modal-open" onClick={() => setSectionModal({ open: false })}>
          <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{t('menu.section_add')}</h3>
            <form onSubmit={saveSection} className="space-y-3">
              <div>
                <label className="label-text text-sm">{t('menu.section_name')}</label>
                <input name="nombre" required className="input input-bordered w-full mt-1" placeholder={t('menu.section_name_placeholder')} />
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setSectionModal({ open: false })}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Item modal */}
      {itemModal.open && (
        <dialog className="modal modal-open" onClick={() => setItemModal({ open: false, sectionId: null })}>
          <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{t('menu.item_add')}</h3>
            <form onSubmit={saveItem} className="space-y-3">
              <div>
                <label className="label-text text-sm">{t('menu.item_name')}</label>
                <input name="nombre" required className="input input-bordered w-full mt-1" placeholder={t('menu.item_name_placeholder')} />
              </div>
              <div>
                <label className="label-text text-sm">{t('menu.description')}</label>
                <textarea name="descripcion" className="textarea textarea-bordered w-full mt-1" rows={2} placeholder={t('menu.item_desc_placeholder')} />
              </div>
              <div>
                <label className="label-text text-sm">{t('menu.item_price')}</label>
                <input name="precio" type="number" step="0.01" min="0" className="input input-bordered w-full mt-1" placeholder={t('menu.price_placeholder')} />
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setItemModal({ open: false, sectionId: null })}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Assignment modal */}
      {assignModal.open && (
        <dialog className="modal modal-open" onClick={() => setAssignModal({ open: false, edit: null })}>
          <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">
              {assignModal.edit ? t('common.edit') : t('common.add')} — {t('menu.schedule_tab')}
            </h3>
            <form onSubmit={saveAssignment} className="space-y-3">
              <input type="hidden" name="tipo" value={assignModal.tipo} />
              {assignModal.tipo === 'semanal' && (
                <input type="hidden" name="dia_semana" value={assignModal.dia_semana} />
              )}
              <div>
                <label className="label-text text-sm">{t('menu.assign_table_template')}</label>
                <select name="template_id" required className="select select-bordered w-full mt-1">
                  <option value="">{t('menu.assign_choose')}</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}
                      selected={assignModal.edit ? undefined : undefined}
                    >{tpl.nombre}</option>
                  ))}
                </select>
              </div>
              {assignModal.tipo === 'semanal' && (
                <div>
                  <label className="label-text text-sm">{t('menu.assign_table_day')}</label>
                  <p className="text-sm font-medium mt-1">{t('days.' + DIA_KEYS[assignModal.dia_semana])}</p>
                </div>
              )}
              {assignModal.tipo === 'fecha' && (
                <div>
                  <label className="label-text text-sm">{t('menu.assign_table_date')}</label>
                  <input name="fecha" type="date" required className="input input-bordered w-full mt-1" defaultValue={assignModal.fecha || ''} />
                </div>
              )}
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setAssignModal({ open: false, edit: null })}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Allergen modal */}
      {allergenModal.open && (
        <dialog className="modal modal-open" onClick={() => setAllergenModal({ open: false, item: null })}>
          <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{t('menu.allergens')}</h3>
            <p className="text-sm text-base-content/50 mb-4">{allergenModal.item?.nombre}</p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {allergens.length === 0 && (
                <p className="text-sm text-base-content/50">{t('menu.allergens_all_empty')}</p>
              )}
              {allergens.map((a) => {
                const hasIt = allergenModal.item?.allergens?.some(ex => ex.id === a.id)
                return (
                  <label key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={!!hasIt}
                      onChange={() => toggleAllergen(allergenModal.item.id, a.id, hasIt)}
                    />
                    <span className="text-sm">{t('allergens.' + a.nombre)}</span>
                  </label>
                )
              })}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setAllergenModal({ open: false, item: null })}>{t('common.close')}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
