import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Loader from '../components/common/Loader'
import { quizService } from '../services/quizService'
import './MyQuizzes.css'

function MyQuizzes() {
  const { t } = useTranslation()

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['my-quizzes'],
    queryFn: () => quizService.getMyQuizzes(),
  })

  const mockQuizzes = [
    { id: 1, title: 'Math Basics', questions: 10, plays: 45, status: 'published', createdAt: '2024-01-15' },
    { id: 2, title: 'Science Quiz', questions: 15, plays: 32, status: 'draft', createdAt: '2024-01-20' },
    { id: 3, title: 'History Trivia', questions: 20, plays: 78, status: 'published', createdAt: '2024-01-25' },
  ]

  return (
    <div className="my-quizzes-page">
      <Topbar />
      <div className="my-quizzes-layout">
        <Sidebar />
        <main className="my-quizzes-main">
          <div className="my-quizzes-content">
            <div className="my-quizzes-header">
              <h1 className="my-quizzes-title">My Quizzes</h1>
              <Button variant="primary">Create New Quiz</Button>
            </div>

            {isLoading ? (
              <Loader />
            ) : (
              <div className="my-quizzes-grid">
                {mockQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="my-quiz-card">
                    <div className="my-quiz-header">
                      <h3 className="my-quiz-title">{quiz.title}</h3>
                      <span className={`my-quiz-status my-quiz-status--${quiz.status}`}>
                        {quiz.status}
                      </span>
                    </div>
                    <div className="my-quiz-meta">
                      <span>{quiz.questions} questions</span>
                      <span>{quiz.plays} plays</span>
                    </div>
                    <div className="my-quiz-actions">
                      <Button variant="ghost" size="small">Edit</Button>
                      <Button variant="ghost" size="small">View</Button>
                      <Button variant="danger" size="small">Delete</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MyQuizzes
