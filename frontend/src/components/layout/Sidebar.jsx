import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

function Sidebar() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return null

  const menuItems = [
    { path: '/home', label: t('nav_home'), icon: '🏠' },
    { path: '/discover', label: t('nav_discover'), icon: '🔍' },
    { path: '/join', label: t('nav_join'), icon: '🎮' },
    { path: '/my-quizzes', label: t('nav_my_quizzes'), icon: '📝' },
    { path: '/teacher', label: t('nav_create_quiz'), icon: '➕' },
    { path: '/rankings', label: t('nav_rankings'), icon: '🏆' },
    { path: '/stats', label: t('nav_stats'), icon: '📊' },
    { path: '/profile', label: t('nav_profile'), icon: '👤' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-level">Level {user?.level || 1}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'sidebar-link--active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
