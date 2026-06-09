import { useTranslation } from 'react-i18next'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/common/Card'
import './Stats.css'

function Stats() {
  const { t } = useTranslation()

  const stats = {
    totalQuizzes: 12,
    totalPlays: 234,
    averageScore: 78,
    totalXP: 4500,
    level: 5,
    streak: 7,
  }

  const recentPerformance = [
    { quiz: 'Math Basics', score: 85, date: '2 hours ago' },
    { quiz: 'Science Trivia', score: 92, date: 'Yesterday' },
    { quiz: 'History Quiz', score: 78, date: '2 days ago' },
  ]

  return (
    <div className="stats-page">
      <Topbar />
      <div className="stats-layout">
        <Sidebar />
        <main className="stats-main">
          <div className="stats-content">
            <div className="stats-header">
              <h1 className="stats-title">Statistics</h1>
              <p className="stats-subtitle">Track your learning progress</p>
            </div>

            <div className="stats-grid">
              <Card className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-value">{stats.totalQuizzes}</div>
                <div className="stat-label">Total Quizzes</div>
              </Card>

              <Card className="stat-card">
                <div className="stat-icon">🎮</div>
                <div className="stat-value">{stats.totalPlays}</div>
                <div className="stat-label">Total Plays</div>
              </Card>

              <Card className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{stats.averageScore}%</div>
                <div className="stat-label">Average Score</div>
              </Card>

              <Card className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-value">{stats.totalXP}</div>
                <div className="stat-label">Total XP</div>
              </Card>

              <Card className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">Level {stats.level}</div>
                <div className="stat-label">Current Level</div>
              </Card>

              <Card className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-value">{stats.streak}</div>
                <div className="stat-label">Day Streak</div>
              </Card>
            </div>

            <Card className="stats-performance-card">
              <h2 className="stats-section-title">Recent Performance</h2>
              <div className="stats-performance-list">
                {recentPerformance.map((perf, index) => (
                  <div key={index} className="performance-item">
                    <div className="performance-quiz">{perf.quiz}</div>
                    <div className="performance-score">{perf.score}%</div>
                    <div className="performance-date">{perf.date}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Stats
