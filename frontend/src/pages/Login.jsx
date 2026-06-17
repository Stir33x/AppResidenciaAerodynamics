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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || t('login.invalid_credentials'))
    }
  }

  return (
    <div className="hero bg-base-200 min-h-svh">
      <div className="card bg-base-100 w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit} className="card-body">
          <h2 className="card-title text-2xl justify-center">
            Residencia Aerodynamics
          </h2>
          <p className="text-center text-sm opacity-70 mb-4">
            {t('login.subtitle')}
          </p>

          {error && (
            <div className="alert alert-error text-sm">{error}</div>
          )}

          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('login.email')}</span>
            </label>
            <input
              type="email"
              placeholder={t('login.email_placeholder')}
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">{t('login.password')}</span>
            </label>
            <input
              type="password"
              placeholder={t('login.password_placeholder')}
              className="input input-bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-control mt-4">
            <button type="submit" className="btn btn-primary">
              {t('login.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
