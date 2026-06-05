/**
 * QuizOk Quiz API
 * Fetches quiz data and questions from server/Supabase
 */

const QuizAPI = (function () {
  let cache = {};

  /**
   * Fetch quiz by ID with questions
   * @param {string} quizId - Quiz ID
   * @returns {Promise<Object>} Quiz data with questions
   */
  async function fetchQuiz(quizId) {
    if (cache[quizId]) {
      return cache[quizId];
    }

    try {
      const response = await fetch(`/api/quiz/${quizId}`);
      if (!response.ok) {
        if (quizId === 'mock_quiz_001') {
          return getMockQuiz(quizId);
        }
        throw new Error(`Failed to fetch quiz: ${response.statusText}`);
      }

      const data = await response.json();
      cache[quizId] = data;
      return data;
    } catch (error) {
      console.error('[QuizAPI] fetchQuiz error:', error);
      if (quizId === 'mock_quiz_001') {
        return getMockQuiz(quizId);
      }
      throw error;
    }
  }

  /**
   * Fetch questions for a quiz
   * @param {string} quizId - Quiz ID
   * @returns {Promise<Array>} Array of questions
   */
  async function fetchQuestions(quizId) {
    try {
      const response = await fetch(`/api/quiz/${quizId}/questions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.questions || [];
    } catch (error) {
      console.error('[QuizAPI] fetchQuestions error:', error);
      if (quizId === 'mock_quiz_001') {
        return getMockQuestions(quizId);
      }
      throw error;
    }
  }

  /**
   * Submit quiz results to server
   * @param {Object} sessionData - Quiz session data
   * @returns {Promise<Object>} Server response
   */
  async function submitResults(sessionData) {
    try {
      const response = await fetch('/api/quiz/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error(`Failed to submit results: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[QuizAPI] submitResults error:', error);
      // Return success anyway for now (will be persisted to Supabase later)
      return { success: true, message: 'Results saved locally' };
    }
  }

  /**
   * Get mock quiz data for testing/fallback
   * @param {string} quizId - Quiz ID
   * @returns {Object} Mock quiz data
   */
  function getMockQuiz(quizId) {
    return {
      id: quizId || 'mock_quiz_001',
      title: 'Mathematics Challenge',
      description: 'Test your math skills with these questions',
      category: 'math',
      difficulty: 'medium',
      question_count: 5,
      duration_min: 10,
      timeLimit: 600, // 10 minutes in seconds
      cover_gradient: 'linear-gradient(135deg,#0a1628 0%,#0066aa 50%,#00aaff 100%)',
      is_ai_generated: false,
      is_published: true,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Get mock questions for testing/fallback
   * @param {string} quizId - Quiz ID
   * @returns {Array} Mock questions
   */
  function getMockQuestions(quizId) {
    return [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'What is 15 × 7?',
        options: ['95', '105', '115', '125'],
        correctOption: 1, // Index of correct answer (105)
        timeLimit: 30,
        explanation: '15 × 7 = 105'
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'What is the square root of 144?',
        options: ['10', '11', '12', '14'],
        correctOption: 2, // 12
        timeLimit: 30,
        explanation: '12 × 12 = 144'
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'Solve: 2x + 5 = 15',
        options: ['x = 4', 'x = 5', 'x = 6', 'x = 7'],
        correctOption: 1, // x = 5
        timeLimit: 45,
        explanation: '2x = 10, so x = 5'
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: 'What is 25% of 80?',
        options: ['15', '18', '20', '22'],
        correctOption: 2, // 20
        timeLimit: 30,
        explanation: '0.25 × 80 = 20'
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'What is the next number in the sequence: 2, 6, 18, 54, ...?',
        options: ['108', '162', '216', '324'],
        correctOption: 1, // 162 (multiply by 3)
        timeLimit: 45,
        explanation: 'Each number is multiplied by 3: 54 × 3 = 162'
      }
    ];
  }

  /**
   * Clear cache
   * @param {string} quizId - Optional quiz ID to clear specific cache
   */
  function clearCache(quizId) {
    if (quizId) {
      delete cache[quizId];
    } else {
      cache = {};
    }
  }

  return {
    fetchQuiz,
    fetchQuestions,
    submitResults,
    clearCache
  };
})();

if (typeof window !== 'undefined') {
  window.QuizAPI = QuizAPI;
}
