import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import ThemeSwitcher from './ThemeSwitcher'
import LanguageSwitcher from './LanguageSwitcher'
import './Topbar.css'

function Topbar() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { language } = useLanguage()
  const { isAuthenticated, user, logout } = useAuth()
  const location = useLocation()

  const isAuthPage = ['/login', '/register'].includes(location.pathname)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="topbar">
      <div className="topbar-container">
        <div className="topbar-left">
          <Link to="/" className="topbar-logo">
            <span className="topbar-logo-text">QuizOk</span>
          </Link>
        </div>

        <nav className="topbar-nav">
          <Link to="/discover" className="topbar-link">
            {t('nav_discover')}
          </Link>
          <Link to="/join" className="topbar-link">
            {t('nav_join')}
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/my-quizzes" className="topbar-link">
                {t('nav_my_quizzes')}
              </Link>
              <Link to="/teacher" className="topbar-link">
                {t('nav_create_quiz')}
              </Link>
            </>
          )}
        </nav>

        <div className="topbar-right">
          <ThemeSwitcher />
          <LanguageSwitcher />
          
          {isAuthenticated ? (
            <div className="topbar-user">
              <span className="topbar-user-name">{user?.name}</span>
              <button onClick={handleLogout} className="topbar-logout">
                {t('nav_logout')}
              </button>
            </div>
          ) : (
            !isAuthPage && (
              <div className="topbar-auth">
                <Link to="/login" className="topbar-link">
                  {t('auth_login')}
                </Link>
                <Link to="/register" className="topbar-btn">
                  {t('auth_register')}
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
