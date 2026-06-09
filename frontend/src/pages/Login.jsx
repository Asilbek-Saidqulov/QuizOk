import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Card from '../components/common/Card'
import './Auth.css'

function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(formData)
      navigate('/home')
    } catch (err) {
      setError(err.response?.data?.message || t('common_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">QuizOk</Link>
          <h1 className="auth-title">{t('auth_login')}</h1>
          <p className="auth-subtitle">
            {t('auth_already_have_account')}{' '}
            <Link to="/register">{t('auth_register')}</Link>
          </p>
        </div>

        <Card className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              type="email"
              name="email"
              label={t('auth_email')}
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              error={error}
            />

            <Input
              type="password"
              name="password"
              label={t('auth_password')}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />

            {error && <div className="auth-error">{error}</div>}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
            >
              {t('auth_login')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default Login
