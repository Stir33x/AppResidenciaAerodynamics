import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || t('login.invalid_credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-base-200 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-white flex-col items-center justify-center p-12 relative">
        <div className="text-center">
          <img src="/logo-aerodynamics.svg" alt="Aerodynamics" className="h-24 w-auto mx-auto mb-8" />
          <h1 className="text-3xl font-bold text-neutral mb-3">{t('layout.brand')}</h1>
          <p className="text-base-content/60 text-lg max-w-md">{t('login.subtitle')}</p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-base-content/50 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">80+</div>
              <div>Habitaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">24/7</div>
              <div>Acceso</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">100%</div>
              <div>Online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo-aerodynamics.svg" alt="Aerodynamics" className="h-14 w-auto mx-auto mb-4" />
            <h1 className="text-xl font-bold text-base-content">{t('layout.brand')}</h1>
          </div>

          <div className="card bg-base-100 shadow-sm border border-base-300">
            <form onSubmit={handleSubmit} className="card-body gap-4">
              <h2 className="card-title text-xl justify-center hidden lg:flex text-base-content">
                {t('login.subtitle')}
              </h2>

              {error && (
                <div className="alert alert-error text-sm py-2" role="alert">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text">{t('login.email')}</span>
                </label>
                <input
                  type="email"
                  placeholder={t('login.email_placeholder')}
                  className="input input-bordered"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text">{t('login.password')}</span>
                </label>
                <input
                  type="password"
                  placeholder={t('login.password_placeholder')}
                  className="input input-bordered"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
                {loading && <span className="loading loading-spinner loading-sm" />}
                {t('login.submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
