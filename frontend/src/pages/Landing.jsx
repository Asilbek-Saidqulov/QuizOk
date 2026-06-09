import { Link } from 'react-router-dom'
import Button from '../components/common/Button'
import './Landing.css'

function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-logo">QuizOk</div>
        <div className="landing-nav-buttons">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </nav>

      <div className="landing-hero">
        <div className="landing-hero-content">
          <div className="hero-eyebrow">
            <span>🤖</span>
            <span>AI-Powered Quiz Platform</span>
          </div>
          <h1 className="hero-title">
            Create Quizzes with
            <span className="hero-ai-word"> AI Magic</span>
          </h1>
          <p className="hero-desc">
            Build engaging quizzes in seconds with our AI-powered quiz builder.
            Perfect for educators, trainers, and content creators.
          </p>
          <div className="hero-cta">
            <Link to="/register">
              <Button variant="primary" size="large">
                Start Creating Free
              </Button>
            </Link>
            <Link to="/discover">
              <Button variant="ghost" size="large">
                Explore Quizzes
              </Button>
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-number">10K+</div>
              <div className="hero-stat-label">Quizzes Created</div>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <div className="hero-stat-number">50K+</div>
              <div className="hero-stat-label">Active Users</div>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <div className="hero-stat-number">1M+</div>
              <div className="hero-stat-label">Questions Answered</div>
            </div>
          </div>
        </div>

        <div className="ai-showcase">
          <div className="ai-showcase-header">
            <div className="ai-showcase-title">
              <span>✨</span>
              <span>AI Quiz Generator</span>
            </div>
            <div className="ai-showcase-dots">
              <div className="ai-showcase-dot red"></div>
              <div className="ai-showcase-dot yellow"></div>
              <div className="ai-showcase-dot green"></div>
            </div>
          </div>
          <div className="ai-input-box">
            <span>Generate 5 questions about:</span>
            <span> "World History"</span>
          </div>
          <div className="ai-thinking">
            <span className="live-dot"></span>
            <span>AI is thinking...</span>
          </div>
          <div className="ai-result-questions">
            <div className="ai-result-question">
              <span>1.</span>
              <span>What year did World War II end?</span>
            </div>
            <div className="ai-result-question">
              <span>2.</span>
              <span>Who was the first President of the United States?</span>
            </div>
            <div className="ai-result-question">
              <span>3.</span>
              <span>What ancient civilization built the pyramids?</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Landing
