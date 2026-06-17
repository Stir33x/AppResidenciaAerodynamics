import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const roles = ['direccion', 'administracion', 'limpieza']

export default function UsersPage() {
  const { t } = useTranslation(['users', 'user_roles', 'common'])
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellidos: '', telefono: '', rol: 'limpieza' })

  const load = async () => {
    const data = await fetchApi('/users')
    setUsers(data)
  }

  useEffect(() => { load() }, [])

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
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async (u) => {
    if (!confirm(t('users.confirm_delete', { name: `${u.nombre} ${u.apellidos}` }))) return
    try {
      await fetchApi(`/users/${u.id}`, { method: 'DELETE' })
      load()
    } catch (err) { alert(err.message) }
  }

  const rolBadge = (r) => {
    const cls = { direccion: 'badge-neutral', administracion: 'badge-info', limpieza: 'badge-warning', estudiante: 'badge-soft' }
    return <span className={`badge ${cls[r] || ''}`}>{t(r)}</span>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('users.title')}</h1>
        <button className="btn btn-primary" onClick={openCreate}>{t('users.new')}</button>
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
            {users.map((u) => (
              <tr key={u.id} className={u.id === user?.id ? 'bg-base-300' : ''}>
                <td>{u.nombre} {u.apellidos} {u.id === user?.id && <span className="badge badge-xs badge-soft">{t('users.you_badge')}</span>}</td>
                <td>{u.email}</td>
                <td>{u.telefono || '-'}</td>
                <td>{rolBadge(u.rol)}</td>
                <td className="text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="flex gap-1">
                  <button className="btn btn-xs btn-ghost" onClick={() => openEdit(u)}>{t('common.edit')}</button>
                  {u.id !== user?.id && (
                    <button className="btn btn-xs btn-ghost btn-error" onClick={() => handleDelete(u)}>{t('common.delete')}</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="text-center opacity-60 py-8">{t('users.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <dialog className="modal modal-open" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">{editing ? t('users.edit_title') : t('users.create_title')}</h3>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <div className="form-control">
                <label className="label"><span className="label-text">{t('users.name')}</span></label>
                <input className="input input-bordered" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('users.surname')}</span></label>
                <input className="input input-bordered" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('users.email')}</span></label>
                <input type="email" className="input input-bordered" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!editing} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{editing ? t('users.new_password') : t('users.password')}</span></label>
                <input type="password" className="input input-bordered" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('users.phone')}</span></label>
                <input className="input input-bordered" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">{t('users.role')}</span></label>
                <select className="select select-bordered" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  {roles.map((r) => <option key={r} value={r}>{t(r)}</option>)}
                </select>
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editing ? t('common.save') : t('common.create')}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
