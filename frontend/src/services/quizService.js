import api from './api'

export const quizService = {
  // Get all quizzes (Discover)
  getQuizzes: async (params = {}) => {
    const response = await api.get('/api/discover', { params })
    return response.data
  },

  // Get single quiz by ID
  getQuiz: async (quizId) => {
    const response = await api.get(`/api/quiz/${quizId}`)
    return response.data
  },

  // Get quiz questions
  getQuizQuestions: async (quizId) => {
    const response = await api.get(`/api/quiz/${quizId}/questions`)
    return response.data
  },

  // Create new quiz
  createQuiz: async (quizData) => {
    const response = await api.post('/api/quiz', quizData)
    return response.data
  },

  // Update quiz
  updateQuiz: async (quizId, quizData) => {
    const response = await api.put(`/api/quiz/${quizId}`, quizData)
    return response.data
  },

  // Delete quiz
  deleteQuiz: async (quizId) => {
    const response = await api.delete(`/api/quiz/${quizId}`)
    return response.data
  },

  // Publish quiz
  publishQuiz: async (quizId) => {
    const response = await api.post(`/api/quiz/${quizId}/publish`)
    return response.data
  },

  // Get user's quizzes
  getMyQuizzes: async () => {
    const response = await api.get('/api/my-quizzes')
    return response.data
  },

  // Submit quiz results
  submitResults: async (resultsData) => {
    const response = await api.post('/api/quiz/results', resultsData)
    return response.data
  },
}
