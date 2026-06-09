import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Card from '../components/common/Card'
import './Join.css'

function Join() {
  const { t } = useTranslation()
  const [gameCode, setGameCode] = useState('')
  const [joining, setJoining] = useState(false)

  const handleJoinGame = async (e) => {
    e.preventDefault()
    setJoining(true)
    // TODO: Implement join game logic
    setTimeout(() => {
      setJoining(false)
    }, 2000)
  }

  const activeGames = [
    { id: 1, host: 'John Doe', players: 5, maxPlayers: 10, category: 'Science' },
    { id: 2, host: 'Jane Smith', players: 3, maxPlayers: 8, category: 'History' },
    { id: 3, host: 'Bob Wilson', players: 7, maxPlayers: 10, category: 'Math' },
  ]

  return (
    <div className="join-page">
      <Topbar />
      <div className="join-layout">
        <Sidebar />
        <main className="join-main">
          <div className="join-content">
            <div className="join-header">
              <h1 className="join-title">Join a Game</h1>
              <p className="join-subtitle">Enter a game code or browse active games</p>
            </div>

            <Card className="join-code-card">
              <h2 className="join-section-title">Enter Game Code</h2>
              <form onSubmit={handleJoinGame} className="join-code-form">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  maxLength={6}
                />
                <Button type="submit" variant="primary" fullWidth loading={joining}>
                  Join Game
                </Button>
              </form>
            </Card>

            <div className="join-section">
              <h2 className="join-section-title">Active Games</h2>
              <div className="join-games-grid">
                {activeGames.map((game) => (
                  <Card key={game.id} className="join-game-card" hoverable>
                    <div className="join-game-header">
                      <div className="join-game-host">Hosted by {game.host}</div>
                      <div className="join-game-category">{game.category}</div>
                    </div>
                    <div className="join-game-players">
                      <span className="join-game-players-count">
                        {game.players}/{game.maxPlayers}
                      </span>
                      <span className="join-game-players-label">players</span>
                    </div>
                    <Button variant="primary" fullWidth size="small">
                      Join
                    </Button>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="join-create-card">
              <div className="join-create-content">
                <div>
                  <h3 className="join-create-title">Create Your Own Game</h3>
                  <p className="join-create-desc">
                    Host a live quiz game and invite friends to play
                  </p>
                </div>
                <Button variant="secondary">Create Game</Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Join
