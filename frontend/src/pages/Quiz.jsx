import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Loader from '../components/common/Loader'
import { quizService } from '../services/quizService'
import './Quiz.css'

function Quiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [quizComplete, setQuizComplete] = useState(false)
  const [results, setResults] = useState(null)

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => quizService.getQuiz(id),
  })

  const { data: questions } = useQuery({
    queryKey: ['quiz-questions', id],
    queryFn: () => quizService.getQuizQuestions(id),
    enabled: !!id,
  })

  useEffect(() => {
    if (quizComplete && results) {
      // Submit results to backend
      quizService.submitResults(results)
    }
  }, [quizComplete, results])

  const handleAnswerSelect = (answerIndex) => {
    if (showFeedback) return
    setSelectedAnswer(answerIndex)
  }

  const handleConfirmAnswer = () => {
    if (selectedAnswer === null) return

    const currentQuestion = questions?.[currentQuestionIndex]
    const correct = selectedAnswer === currentQuestion.correctAnswer

    setIsCorrect(correct)
    setShowFeedback(true)

    const answerRecord = {
      questionIndex: currentQuestionIndex,
      selectedAnswer,
      isCorrect: correct,
      timeSpent: 0, // TODO: Implement timer
    }

    setAnswers([...answers, answerRecord])
  }

  const handleNextQuestion = () => {
    setShowFeedback(false)
    setSelectedAnswer(null)

    if (currentQuestionIndex < (questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Calculate results
      const correctCount = answers.filter(a => a.isCorrect).length
      const totalQuestions = questions?.length || 0
      const accuracy = Math.round((correctCount / totalQuestions) * 100)

      // Calculate XP
      let totalXP = 0
      let streak = 0
      let maxStreak = 0

      answers.forEach((answer, index) => {
        if (answer.isCorrect) {
          streak++
          maxStreak = Math.max(maxStreak, streak)
          totalXP += 10 // Base XP
          if (streak >= 3) {
            totalXP += 5 // Streak bonus
          }
        } else {
          streak = 0
        }
      })

      // Completion bonus
      totalXP += Math.round(totalXP * 0.2)

      setResults({
        totalQuestions,
        correctCount,
        accuracy,
        totalXP,
        streak: maxStreak,
        answers,
      })
      setQuizComplete(true)
    }
  }

  if (isLoading) return <Loader />
  if (error) return <div className="quiz-error">Failed to load quiz</div>

  if (quizComplete && results) {
    return (
      <div className="quiz-page quiz-complete">
        <div className="quiz-container">
          <Card className="quiz-results-card">
            <div className="quiz-results-header">
              <h1 className="quiz-results-title">Quiz Complete!</h1>
              <div className="quiz-results-score">{results.accuracy}%</div>
            </div>

            <div className="quiz-results-stats">
              <div className="quiz-stat">
                <div className="quiz-stat-value">{results.correctCount}/{results.totalQuestions}</div>
                <div className="quiz-stat-label">Correct</div>
              </div>
              <div className="quiz-stat">
                <div className="quiz-stat-value">{results.totalXP}</div>
                <div className="quiz-stat-label">XP Earned</div>
              </div>
              <div className="quiz-stat">
                <div className="quiz-stat-value">{results.streak}</div>
                <div className="quiz-stat-label">Best Streak</div>
              </div>
            </div>

            <div className="quiz-results-actions">
              <Button variant="primary" onClick={() => navigate('/discover')}>
                Back to Discover
              </Button>
              <Button variant="ghost" onClick={() => navigate('/home')}>
                Go to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const currentQuestion = questions?.[currentQuestionIndex]

  return (
    <div className="quiz-page">
      <div className="quiz-container">
        <div className="quiz-header">
          <h1 className="quiz-title">{quiz?.title || 'Quiz'}</h1>
          <div className="quiz-progress">
            Question {currentQuestionIndex + 1} of {questions?.length || 0}
          </div>
        </div>

        <Card className="quiz-card">
          <div className="quiz-question">
            <h2 className="quiz-question-text">{currentQuestion?.question || ''}</h2>

            <div className="quiz-options">
              {currentQuestion?.options?.map((option, index) => (
                <button
                  key={index}
                  className={`quiz-option ${
                    selectedAnswer === index ? 'quiz-option--selected' : ''
                  } ${
                    showFeedback && index === currentQuestion.correctAnswer
                      ? 'quiz-option--correct'
                      : ''
                  } ${
                    showFeedback &&
                    selectedAnswer === index &&
                    index !== currentQuestion.correctAnswer
                      ? 'quiz-option--incorrect'
                      : ''
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showFeedback}
                >
                  <span className="quiz-option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="quiz-option-text">{option}</span>
                </button>
              ))}
            </div>

            {showFeedback && (
              <div className={`quiz-feedback ${isCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--incorrect'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </div>
            )}

            <div className="quiz-actions">
              {!showFeedback ? (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleConfirmAnswer}
                  disabled={selectedAnswer === null}
                >
                  Confirm Answer
                </Button>
              ) : (
                <Button variant="primary" fullWidth onClick={handleNextQuestion}>
                  {currentQuestionIndex < (questions?.length || 0) - 1 ? 'Next Question' : 'Finish Quiz'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Quiz
