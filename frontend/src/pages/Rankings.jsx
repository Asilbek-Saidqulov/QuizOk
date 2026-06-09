import { useTranslation } from 'react-i18next'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Card from '../components/common/Card'
import './Rankings.css'

function Rankings() {
  const { t } = useTranslation()

  const rankings = [
    { rank: 1, name: 'John Doe', xp: 15000, quizzes: 45, avatar: 'JD' },
    { rank: 2, name: 'Jane Smith', xp: 14200, quizzes: 42, avatar: 'JS' },
    { rank: 3, name: 'Bob Wilson', xp: 13800, quizzes: 38, avatar: 'BW' },
    { rank: 4, name: 'Alice Brown', xp: 12500, quizzes: 35, avatar: 'AB' },
    { rank: 5, name: 'Charlie Davis', xp: 12000, quizzes: 32, avatar: 'CD' },
  ]

  return (
    <div className="rankings-page">
      <Topbar />
      <div className="rankings-layout">
        <Sidebar />
        <main className="rankings-main">
          <div className="rankings-content">
            <div className="rankings-header">
              <h1 className="rankings-title">Rankings</h1>
              <p className="rankings-subtitle">Top players on QuizOk</p>
            </div>

            <Card className="rankings-card">
              <div className="rankings-list">
                {rankings.map((player) => (
                  <div key={player.rank} className="ranking-item">
                    <div className="ranking-rank">{player.rank}</div>
                    <div className="ranking-avatar">{player.avatar}</div>
                    <div className="ranking-info">
                      <div className="ranking-name">{player.name}</div>
                      <div className="ranking-meta">{player.quizzes} quizzes</div>
                    </div>
                    <div className="ranking-xp">{player.xp.toLocaleString()} XP</div>
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

export default Rankings
