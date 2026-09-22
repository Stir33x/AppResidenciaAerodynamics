import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const roles = ['direccion', 'administracion', 'limpieza', 'staff', 'cocina']
const PAGE_SIZE = 10
const LOCKED_ROLES = ['estudiante']

export default function UsersPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addToast, confirm } = useToast()
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellidos: '', telefono: '', rol: 'limpieza' })
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('')
  const [page, setPage] = useState(1)

  const load = async () => {
    const data = await fetchApi('/users')
    setUsers(data)
  }

  useEffect(() => {
    (async () => { await load() })()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ email: '', password: '', nombre: '', apellidos: '', telefono: '', rol: 'limpieza' })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ email: u.email, password: '', nombre: u.nombre, apellidos: u.apellidos || '', telefono: u.telefono || '', rol: u.rol })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await fetchApi(`/users/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            nombre: form.nombre,
            apellidos: form.apellidos,
            telefono: form.telefono,
            rol: form.rol,
            password: form.password || undefined,
          }),
        })
      } else {
        await fetchApi('/users', {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      setShowModal(false)
      load()
      addToast(t('common.saved'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const handleDelete = async (u) => {
    if (!await confirm(t('users.confirm_delete', { nombre: u.nombre, apellidos: u.apellidos }))) return
    try {
      await fetchApi(`/users/${u.id}`, { method: 'DELETE' })
      load()
      addToast(t('common.deleted'), 'success')
    } catch (err) { addToast(err.message, 'error') }
  }

  const rolBadge = (r) => {
    const cls = { direccion: 'badge-neutral', administracion: 'badge-info', limpieza: 'badge-warning', staff: 'badge-primary', cocina: 'badge-success', invitado: 'badge-warning', estudiante: 'badge-soft' }
    return <span className={`badge ${cls[r] || ''}`}>{t('user_roles.' + r)}</span>
  }

  const q = search.trim().toLowerCase()
  const filteredUsers = users.filter((u) => {
    if (filterRol && u.rol !== filterRol) return false
    if (!q) return true
    return [u.nombre, u.apellidos, u.email, u.telefono].join(' ').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const goSearch = (value) => { setSearch(value); setPage(1) }
  const goFilter = (value) => { setFilterRol(value); setPage(1) }

  const handleRolChange = (e) => {
    const value = e.target.value
    if (editing && LOCKED_ROLES.includes(editing.rol) && value !== editing.rol) {
      addToast(t('users.role_locked'), 'error')
      return
    }
    setForm({ ...form, rol: value })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{t('users.title')}</h1>
        <button className="btn btn-primary" onClick={openCreate}>{t('users.new')}</button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            className="input input-sm input-bordered pl-9 w-64"
            placeholder={t('users.search_placeholder')}
            value={search}
            onChange={(e) => goSearch(e.target.value)}
          />
        </div>
        <select className="select select-sm select-bordered" value={filterRol} onChange={(e) => goFilter(e.target.value)}>
          <option value="">{t('users.all_roles')}</option>
          {roles.map((r) => <option key={r} value={r}>{t('user_roles.' + r)}</option>)}
          <option value="estudiante">{t('user_roles.estudiante')}</option>
          <option value="invitado">{t('user_roles.invitado')}</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>{t('users.name')}</th>
              <th>{t('users.email')}</th>
              <th>{t('users.phone')}</th>
              <th>{t('users.role')}</th>
              <th>{t('users.created')}</th>
              <th>{t('users.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u) => (
              <tr key={u.id} className={u.id === user?.id ? 'bg-base-300' : ''}>
                <td>{u.nombre} {u.apellidos} {u.id === user?.id && <span className="badge badge-xs badge-soft">{t('users.you_badge')}</span>}</td>
                <td>{u.email}</td>
                <td>{u.telefono || '-'}</td>
                <td>{rolBadge(u.rol)}</td>
                <td className="text-sm">{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
                <td className="flex gap-1">
                  <button className="btn btn-xs btn-ghost" onClick={() => openEdit(u)}>{t('common.edit')}</button>
                  {u.id !== user?.id && (
                    <button className="btn btn-xs btn-ghost btn-error" onClick={() => handleDelete(u)}>{t('common.delete')}</button>
                  )}
                </td>
              </tr>
            ))}
            {pagedUsers.length === 0 && (
              <tr><td colSpan={6} className="text-center opacity-60 py-8">{t('users.empty')}</td></tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm opacity-60">
            {t('users.page_info', { from: filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1, to: Math.min(currentPage * PAGE_SIZE, filteredUsers.length), total: filteredUsers.length })}
          </p>
          <div className="join">
            <button className="btn btn-sm join-item" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t('users.prev')}</button>
            <button className="btn btn-sm join-item" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>{t('users.next')}</button>
          </div>
        </div>
      </div>

      {showModal && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">{editing ? t('users.edit_title') : t('users.create_title')}</h3>
                <p className="text-sm opacity-60">{editing ? t('users.edit_desc') : t('users.create_desc')}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label px-1 py-0 pb-1"><span className="label-text font-medium">{t('users.name')}</span></label>
                  <input className="input input-bordered w-full" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder={t('users.name_placeholder')} />
                </div>
                <div className="form-control">
                  <label className="label px-1 py-0 pb-1"><span className="label-text font-medium">{t('users.surname')}</span></label>
                  <input className="input input-bordered w-full" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} placeholder={t('users.surname_placeholder')} />
                </div>
                <div className="form-control">
                  <label className="label px-1 py-0 pb-1"><span className="label-text font-medium">{t('users.email')}</span></label>
                  <input type="email" className="input input-bordered w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} placeholder={t('users.email_placeholder')} />
                </div>
                <div className="form-control">
                  <label className="label px-1 py-0 pb-1"><span className="label-text font-medium">{t('users.phone')}</span></label>
                  <input className="input input-bordered w-full" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder={t('users.phone_placeholder')} />
                </div>
                <div className="form-control">
                  <label className="label px-1 py-0 pb-1"><span className="label-text font-medium">{editing ? t('users.new_password') : t('users.password')}</span></label>
                  <input type="password" className="input input-bordered w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} placeholder={editing ? t('users.password_edit_placeholder') : t('users.password_placeholder')} />
                </div>
                <div className="form-control">
                  <label className="label px-1 py-0 pb-1"><span className="label-text font-medium">{t('users.role')}</span></label>
                  <select className="select select-bordered w-full" value={form.rol} onChange={handleRolChange} disabled={!!editing && LOCKED_ROLES.includes(editing.rol)}>
                    {editing && LOCKED_ROLES.includes(editing.rol) && (
                      <option value={editing.rol}>{t('user_roles.' + editing.rol)}</option>
                    )}
                    {roles.map((r) => <option key={r} value={r}>{t('user_roles.' + r)}</option>)}
                  </select>
                  {editing && LOCKED_ROLES.includes(editing.rol) && (
                    <p className="text-xs opacity-60 mt-1 px-1">{t('users.role_locked')}</p>
                  )}
                </div>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-soft" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editing ? t('common.save') : t('common.create')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
