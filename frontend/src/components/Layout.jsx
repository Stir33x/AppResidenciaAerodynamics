import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')
  }

  const nav = [
    { to: '/dashboard', label: t('layout.dashboard'), roles: null },
    { to: '/alumnos', label: t('layout.students'), roles: null },
    { to: '/limpieza', label: t('layout.cleaning'), roles: null },
    { to: '/incidencias', label: t('layout.incidents'), roles: null },
    { to: '/horarios', label: t('layout.schedules'), roles: null },
    { to: '/documentos', label: t('layout.documents'), roles: null },
    { to: '/pagos', label: t('layout.payments'), roles: null },
    { to: '/habitaciones', label: t('layout.rooms'), roles: null },
    { to: '/usuarios', label: t('layout.users'), roles: ['direccion', 'administracion'] },
  ]

  return (
    <div className="drawer lg:drawer-open">
      <input id="sidebar" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        <div className="navbar bg-base-100 shadow-sm lg:hidden">
          <div className="flex-none">
            <label htmlFor="sidebar" className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-6 w-6 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="text-xl font-bold">{t('layout.brand')}</span>
          </div>
        </div>
        <main className="p-6">{children}</main>
      </div>
      <div className="drawer-side">
        <label htmlFor="sidebar" className="drawer-overlay" />
        <aside className="bg-base-200 min-h-svh w-64 p-4 flex flex-col gap-4">
          <div className="text-2xl font-bold px-4 pt-4">{t('layout.brand')}</div>
          {user && (
            <div className="px-4 text-sm opacity-70">
              {user.nombre} — {t(`roles.${user.rol}`)}
            </div>
          )}
          <ul className="menu p-2 flex-1">
            {nav.map(({ to, label, roles }) => {
              if (roles && (!user || !roles.includes(user.rol))) return null
              return <li key={to}><Link to={to}>{label}</Link></li>
            })}
          </ul>
          <div className="flex flex-col gap-2 px-2">
            <button onClick={toggleLang} className="btn btn-soft btn-sm">
              {i18n.language === 'es' ? '🇬🇧 English' : '🇪🇸 Español'}
            </button>
            <button onClick={handleLogout} className="btn btn-soft btn-error">
              {t('layout.logout')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
