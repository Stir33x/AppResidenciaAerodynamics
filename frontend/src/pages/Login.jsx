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
    <div className="min-h-svh bg-base-200 flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img src="/logo-aerodynamics.svg" alt="Aerodynamics" className="h-16 w-auto mx-auto mb-6" />

        <div className="card bg-base-100 shadow-sm border border-base-300 w-full">
          <form onSubmit={handleSubmit} className="card-body gap-4">
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
  )
}
