import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Card from '../components/common/Card'
import './Teacher.css'

function Teacher() {
  const { t } = useTranslation()
  const [quizTitle, setQuizTitle] = useState('')
  const [quizDescription, setQuizDescription] = useState('')
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }])

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }])
  }

  const updateQuestion = (index, field, value) => {
    const updated = [...questions]
    updated[index][field] = value
    setQuestions(updated)
  }

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions]
    updated[qIndex].options[oIndex] = value
    setQuestions(updated)
  }

  return (
    <div className="teacher-page">
      <Topbar />
      <div className="teacher-layout">
        <Sidebar />
        <main className="teacher-main">
          <div className="teacher-content">
            <div className="teacher-header">
              <h1 className="teacher-title">Create Quiz</h1>
              <p className="teacher-subtitle">Build engaging quizzes with our AI-powered builder</p>
            </div>

            <div className="teacher-grid">
              <div className="teacher-main-panel">
                <Card className="teacher-card">
                  <h2 className="teacher-section-title">Quiz Details</h2>
                  <div className="teacher-form">
                    <Input
                      label="Quiz Title"
                      placeholder="Enter quiz title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                    />
                    <Input
                      label="Description"
                      placeholder="Describe your quiz"
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                    />
                  </div>
                </Card>

                <Card className="teacher-card">
                  <div className="teacher-section-header">
                    <h2 className="teacher-section-title">Questions</h2>
                    <Button variant="secondary" size="small" onClick={addQuestion}>
                      + Add Question
                    </Button>
                  </div>

                  {questions.map((q, qIndex) => (
                    <div key={qIndex} className="teacher-question">
                      <Input
                        label={`Question ${qIndex + 1}`}
                        placeholder="Enter your question"
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      />
                      <div className="teacher-options">
                        {q.options.map((option, oIndex) => (
                          <div key={oIndex} className="teacher-option">
                            <Input
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </Card>
              </div>

              <div className="teacher-sidebar-panel">
                <Card className="teacher-card">
                  <h2 className="teacher-section-title">AI Assistant</h2>
                  <p className="teacher-ai-desc">
                    Let AI help you generate questions based on your topic
                  </p>
                  <Input placeholder="Enter a topic..." />
                  <Button variant="primary" fullWidth>
                    Generate Questions
                  </Button>
                </Card>

                <Card className="teacher-card">
                  <h2 className="teacher-section-title">Quiz Settings</h2>
                  <div className="teacher-settings">
                    <div className="teacher-setting">
                      <label>Time Limit</label>
                      <select>
                        <option>No limit</option>
                        <option>30 seconds</option>
                        <option>60 seconds</option>
                      </select>
                    </div>
                    <div className="teacher-setting">
                      <label>Difficulty</label>
                      <select>
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </div>
                  </div>
                  <Button variant="primary" fullWidth>
                    Save Quiz
                  </Button>
                  <Button variant="ghost" fullWidth>
                    Publish
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Teacher
