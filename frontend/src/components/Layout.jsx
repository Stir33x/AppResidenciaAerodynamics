import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const menuItems = [
  { to: '/dashboard', labelKey: 'layout.dashboard', roles: null, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/horario', labelKey: 'layout.schedules', roles: null, icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/menu-view', labelKey: 'layout.menu_view', roles: null, icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z' },
  { to: '/menu', labelKey: 'layout.menu', roles: ['direccion', 'administracion', 'cocina'], icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { to: '/alumnos', labelKey: 'layout.students', roles: ['direccion', 'administracion'], icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { to: '/limpieza', labelKey: 'layout.cleaning', roles: ['direccion', 'administracion', 'limpieza'], icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/incidencias', labelKey: 'layout.incidents', roles: null, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
  { to: '/documentos', labelKey: 'layout.documents', roles: ['direccion', 'administracion', 'estudiante'], icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { to: '/pagos', labelKey: 'layout.payments', roles: ['direccion', 'administracion', 'estudiante'], icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/habitaciones', labelKey: 'layout.rooms', roles: ['direccion', 'administracion', 'limpieza'], icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/inventario', labelKey: 'layout.inventory', roles: ['direccion', 'administracion', 'limpieza'], icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/usuarios', labelKey: 'layout.users', roles: ['direccion'], icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/configuracion', labelKey: 'layout.configuration', roles: ['direccion'], icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const showFull = expanded || mobileOpen

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')
  }

  const closeMobile = () => setMobileOpen(false)

  const visibleNav = menuItems.filter(({ roles }) => {
    if (!roles) return true
    return user && roles.includes(user.rol)
  })

  return (
    <div className="min-h-svh flex flex-col lg:flex-row">
      {/* Mobile header */}
      <div className="navbar bg-primary text-primary-content shadow-md lg:hidden sticky top-0 z-30">
        <div className="flex-none">
          <button onClick={() => setMobileOpen(true)} className="btn btn-square btn-ghost btn-sm text-primary-content">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-5 w-5 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <img src="/logo-aerodynamics.svg" alt="Aerodynamics" className="h-7 w-auto" />
          <span className="text-sm font-semibold opacity-80">{t('layout.brand')}</span>
        </div>
        <div className="flex-none">
          <button onClick={toggleLang} className="btn btn-ghost btn-xs text-primary-content">
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobile} />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`
          fixed lg:sticky inset-y-0 left-0 z-50
          bg-base-100 border-r border-base-300 flex flex-col
          transition-all duration-300 ease-in-out
          overflow-hidden min-w-0 max-h-svh
          ${showFull ? 'w-72' : 'w-20'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-base-300">
          <img src="/logo-aerodynamics.svg" alt="Aerodynamics" className="h-12 w-auto shrink-0" />
          <div className={`overflow-hidden transition-opacity duration-200 ${showFull ? 'opacity-100' : 'opacity-0 invisible w-0'}`}>
            <div className="font-bold text-sm leading-tight text-base-content truncate whitespace-nowrap">{t('layout.brand')}</div>
            <div className="text-[10px] text-base-content/40 uppercase tracking-widest mt-0.5 truncate whitespace-nowrap">Pilot Residence</div>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-base-300 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {user.nombre?.charAt(0)}{user.apellidos?.charAt(0)}
            </div>
            <div className={`text-sm leading-tight min-w-0 overflow-hidden transition-opacity duration-200 ${showFull ? 'opacity-100' : 'opacity-0 invisible w-0 h-0'}`}>
              <div className="truncate font-medium text-base-content">{user.nombre} {user.apellidos}</div>
              <div className="text-[11px] text-base-content/50 truncate">{t('roles.' + user.rol)}</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-0.5 min-w-0">
            {visibleNav.map(({ to, labelKey, icon }) => {
              const isActive = location.pathname === to
              return (
                <li key={to} className="min-w-0">
                  <Link
                    to={to}
                    onClick={closeMobile}
                    title={!showFull ? t(labelKey) : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-w-0 ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-base-content/50 hover:text-base-content hover:bg-base-200'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                    <span className={`truncate transition-opacity duration-200 ${showFull ? 'opacity-100' : 'opacity-0 invisible w-0'}`}>
                      {t(labelKey)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div className="p-2 border-t border-base-300 space-y-0.5">
          <button
            onClick={toggleLang}
            title={!showFull ? (i18n.language === 'es' ? 'English' : 'Español') : undefined}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors min-w-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <span className={`truncate transition-opacity duration-200 ${showFull ? 'opacity-100' : 'opacity-0 invisible w-0'}`}>
              {i18n.language === 'es' ? 'English' : 'Español'}
            </span>
          </button>

          <button
            onClick={handleLogout}
            title={!showFull ? t('layout.logout') : undefined}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors min-w-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span className={`truncate transition-opacity duration-200 ${showFull ? 'opacity-100' : 'opacity-0 invisible w-0'}`}>
              {t('layout.logout')}
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 w-full mx-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
