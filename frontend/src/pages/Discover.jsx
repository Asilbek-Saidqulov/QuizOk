import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Card from '../components/common/Card'
import Loader from '../components/common/Loader'
import { quizService } from '../services/quizService'
import './Discover.css'

function Discover() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: quizzes, isLoading, error } = useQuery({
    queryKey: ['quizzes', selectedCategory],
    queryFn: () => quizService.getQuizzes({ category: selectedCategory }),
  })

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'science', label: 'Science' },
    { id: 'history', label: 'History' },
    { id: 'math', label: 'Math' },
    { id: 'geography', label: 'Geography' },
    { id: 'literature', label: 'Literature' },
    { id: 'technology', label: 'Technology' },
    { id: 'sports', label: 'Sports' },
    { id: 'entertainment', label: 'Entertainment' },
  ]

  const featuredQuizzes = quizzes?.featured || []
  const trendingQuizzes = quizzes?.trending || []
  const aiQuizzes = quizzes?.aiGenerated || []

  return (
    <div className="discover-page">
      <Topbar />
      <div className="discover-layout">
        <Sidebar />
        <main className="discover-main">
          <div className="discover-content">
            <div className="discover-hero">
              <p className="discover-eyebrow">Explore · Learn · Play</p>
              <h1 className="discover-title">Discover Amazing Quizzes</h1>
              <p className="discover-subtitle">
                Explore quizzes created by students, teachers and creators around the world.
              </p>

              <div className="discover-search">
                <Input
                  type="search"
                  placeholder="Search quizzes, topics, creators…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="discover-stats">
                <div className="discover-stat">
                  <strong>10K+</strong>
                  <span>Total Quizzes</span>
                </div>
                <div className="discover-stat">
                  <strong>50K+</strong>
                  <span>Total Plays</span>
                </div>
              </div>
            </div>

            <div className="discover-categories">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`discover-category-chip ${
                    selectedCategory === category.id ? 'discover-category-chip--active' : ''
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <Loader />
            ) : error ? (
              <div className="discover-error">
                Failed to load quizzes. Please try again.
              </div>
            ) : (
              <>
                <section className="discover-section">
                  <div className="discover-section-header">
                    <h2 className="discover-section-title">Featured Quizzes</h2>
                  </div>
                  <div className="discover-grid">
                    {featuredQuizzes.map((quiz) => (
                      <Card key={quiz.id} className="quiz-card" hoverable>
                        <div className="quiz-card-image">
                          <span className="quiz-card-category">{quiz.category}</span>
                        </div>
                        <div className="quiz-card-content">
                          <h3 className="quiz-card-title">{quiz.title}</h3>
                          <p className="quiz-card-desc">{quiz.description}</p>
                          <div className="quiz-card-meta">
                            <span className="quiz-card-questions">{quiz.questionsCount} questions</span>
                            <span className="quiz-card-plays">{quiz.plays} plays</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>

                <section className="discover-section">
                  <div className="discover-section-header">
                    <h2 className="discover-section-title">🔥 Trending Now</h2>
                    <span className="discover-section-note">views + likes + recent activity</span>
                  </div>
                  <div className="discover-grid">
                    {trendingQuizzes.map((quiz) => (
                      <Card key={quiz.id} className="quiz-card" hoverable>
                        <div className="quiz-card-content">
                          <h3 className="quiz-card-title">{quiz.title}</h3>
                          <p className="quiz-card-desc">{quiz.description}</p>
                          <div className="quiz-card-meta">
                            <span className="quiz-card-questions">{quiz.questionsCount} questions</span>
                            <span className="quiz-card-plays">{quiz.plays} plays</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>

                <section className="discover-section discover-section--ai">
                  <div className="discover-section-header">
                    <h2 className="discover-section-title discover-section-title--ai">
                      🤖 AI Generated Quizzes
                    </h2>
                  </div>
                  <div className="discover-grid">
                    {aiQuizzes.map((quiz) => (
                      <Card key={quiz.id} className="quiz-card" hoverable>
                        <div className="quiz-card-badge">AI</div>
                        <div className="quiz-card-content">
                          <h3 className="quiz-card-title">{quiz.title}</h3>
                          <p className="quiz-card-desc">{quiz.description}</p>
                          <div className="quiz-card-meta">
                            <span className="quiz-card-questions">{quiz.questionsCount} questions</span>
                            <span className="quiz-card-plays">{quiz.plays} plays</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Discover
