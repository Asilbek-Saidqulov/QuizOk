import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Footer from '../components/layout/Footer'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import { userService } from '../services/userService'
import './Home.css'

function Home() {
  const { t } = useTranslation()
  const { user } = useAuth()

  // ===== API DATA =====
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => userService.getStats().then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['userActivity'],
    queryFn: () => userService.getActivity().then(r => r.data),
    enabled: !!user?.id,
  })

  const { data: quest, isLoading: questLoading } = useQuery({
    queryKey: ['dailyQuest'],
    queryFn: () => userService.getDailyQuest().then(r => r.data),
    enabled: !!user?.id,
  })

  // ===== QUICK ACTIONS =====
  const quickActions = [
    {
      title: 'Create Quiz',
      description: 'Build a new quiz with AI assistance',
      icon: '➕',
      link: '/teacher',
      color: 'primary',
    },
    {
      title: 'Discover',
      description: 'Explore quizzes from the community',
      icon: '🔍',
      link: '/discover',
      color: 'secondary',
    },
    {
      title: 'Join Game',
      description: 'Play live with friends',
      icon: '🎮',
      link: '/join',
      color: 'accent',
    },
    {
      title: 'My Quizzes',
      description: 'Manage your created quizzes',
      icon: '📝',
      link: '/my-quizzes',
      color: 'ghost',
    },
  ]

  // ===== RENDER =====
  return (
    <div className="home-page">
      <Topbar />
      <div className="home-layout">
        <Sidebar />
        <main className="home-main">
          <div className="home-content">
            {/* HEADER WITH STATS */}
            <div className="home-header">
              <div>
                <h1 className="home-title">Welcome back, {user?.name || 'User'}!</h1>
                <p className="home-subtitle">Ready to learn something new today?</p>
              </div>
              <div className="home-stats">
                <div className="home-stat">
                  <div className="home-stat-value">{statsLoading ? '...' : stats?.level || 1}</div>
                  <div className="home-stat-label">Level</div>
                </div>
                <div className="home-stat">
                  <div className="home-stat-value">{statsLoading ? '...' : (stats?.xp || 0).toLocaleString()}</div>
                  <div className="home-stat-label">XP</div>
                </div>
                <div className="home-stat">
                  <div className="home-stat-value">{statsLoading ? '...' : stats?.accuracy || 0}%</div>
                  <div className="home-stat-label">Accuracy</div>
                </div>
                <div className="home-stat">
                  <div className="home-stat-value">{statsLoading ? '...' : stats?.games_played || 0}</div>
                  <div className="home-stat-label">Games</div>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="home-section">
              <h2 className="section-title">Quick Actions</h2>
              <div className="quick-actions-grid">
                {quickActions.map((action) => (
                  <Link key={action.link} to={action.link}>
                    <Card className="quick-action-card" hoverable>
                      <div className="quick-action-icon">{action.icon}</div>
                      <h3 className="quick-action-title">{action.title}</h3>
                      <p className="quick-action-desc">{action.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="home-section">
              <h2 className="section-title">Recent Activity</h2>
              <Card className="activity-card">
                <div className="activity-list">
                  {activityLoading ? (
                    <p className="activity-placeholder">Loading activity...</p>
                  ) : activity && activity.length > 0 ? (
                    activity.map((item, index) => (
                      <div key={index} className="activity-item">
                        <div className="activity-icon">
                          {item.type === 'quiz' ? '📝' : '✨'}
                        </div>
                        <div className="activity-info">
                          <div className="activity-title">{item.title}</div>
                          <div className="activity-date">{item.date}</div>
                        </div>
                        {item.score && (
                          <div className="activity-score">{item.score}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="activity-placeholder">No activity yet. Start playing quizzes!</p>
                  )}
                </div>
              </Card>
            </div>

            {/* DAILY QUEST */}
            <div className="home-section">
              <h2 className="section-title">Daily Quest</h2>
              <Card className="quest-card">
                <div className="quest-header">
                  <div className="quest-icon">⚡</div>
                  <div className="quest-info">
                    <h3 className="quest-title">{questLoading ? 'Loading...' : quest?.title || 'Complete Quizzes'}</h3>
                    <p className="quest-progress">
                      {questLoading ? '...' : `${quest?.completed || 0}/${quest?.target || 3} completed`}
                    </p>
                  </div>
                  <div className="quest-reward">
                    <span className="quest-xp">+{questLoading ? '...' : quest?.reward_xp || 50} XP</span>
                  </div>
                </div>
                <div className="quest-bar">
                  <div
                    className="quest-bar-fill"
                    style={{
                      width: `${questLoading ? 0 : ((quest?.completed || 0) / (quest?.target || 3)) * 100}%`,
                      transition: 'width 0.3s ease'
                    }}
                  ></div>
                </div>
                {quest?.is_completed && (
                  <div className="quest-completed-badge">✅ Quest Completed!</div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default Home