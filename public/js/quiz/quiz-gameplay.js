/**
 * QuizOk Quiz Gameplay Engine
 * Manages quiz session state, timer, answer tracking, and progression
 */

const QuizGameplay = (function () {
  // Session state
  let session = null;
  let timerInterval = null;
  let questionStartTime = null;

  /**
   * Initialize a new quiz session
   * @param {Object} quizData - Quiz information and questions
   * @returns {Object} Session state
   */
  function startSession(quizData) {
    session = {
      quizId: quizData.id,
      quizTitle: quizData.title,
      category: quizData.category,
      difficulty: quizData.difficulty,
      questions: quizData.questions || [],
      currentIndex: 0,
      answers: [],
      totalCorrect: 0,
      maxStreak: 0,
      currentStreak: 0,
      totalXP: 0,
      startTime: Date.now(),
      endTime: null,
      status: 'active', // 'active', 'completed', 'abandoned'
      timeLimit: quizData.timeLimit || null, // Overall time limit in seconds
      timeRemaining: quizData.timeLimit || null,
      timeSpent: 0
    };

    // Initialize answers array
    session.answers = session.questions.map(() => ({
      selectedOption: null,
      isCorrect: false,
      timeSpent: 0
    }));

    // Start timing the first question immediately
    startQuestionTimer();

    // Start overall timer if time limit exists
    if (session.timeLimit) {
      startOverallTimer();
    }

    console.log('[QuizGameplay] Session started:', session);
    return getSession();
  }

  /**
   * Start the overall quiz timer
   */
  function startOverallTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
      if (!session || session.status !== 'active') {
        clearInterval(timerInterval);
        return;
      }

      session.timeRemaining--;
      session.timeSpent++;

      if (session.timeRemaining <= 0) {
        clearInterval(timerInterval);
        completeSession(true); // Force complete due to time
      }

      // Dispatch event for UI updates
      dispatchEvent('timer-update', {
        timeRemaining: session.timeRemaining,
        timeSpent: session.timeSpent
      });
    }, 1000);
  }

  /**
   * Start timing for current question
   */
  function startQuestionTimer() {
    questionStartTime = Date.now();
  }

  /**
   * Submit answer for current question
   * @param {number|string} selectedOption - Index or ID of selected option
   * @returns {Object} Answer result
   */
  function submitAnswer(selectedOption) {
    if (!session || session.status !== 'active') {
      throw new Error('No active session');
    }

    const question = session.questions[session.currentIndex];
    if (!question) {
      throw new Error('No question at current index');
    }

    // Calculate time spent on this question
    const timeSpent = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0;

    // Determine if correct
    const isCorrect = checkAnswer(question, selectedOption);

    // Update streak
    if (isCorrect) {
      session.currentStreak++;
      session.maxStreak = Math.max(session.maxStreak, session.currentStreak);
      session.totalCorrect++;
    } else {
      session.currentStreak = 0;
    }

    // Store answer
    session.answers[session.currentIndex] = {
      selectedOption,
      isCorrect,
      timeSpent,
      correctOption: question.correctOption
    };

    const result = {
      questionIndex: session.currentIndex,
      selectedOption,
      isCorrect,
      correctOption: question.correctOption,
      timeSpent,
      streak: session.currentStreak,
      maxStreak: session.maxStreak,
      totalCorrect: session.totalCorrect
    };

    // Dispatch event for UI updates
    dispatchEvent('answer-submitted', result);

    return result;
  }

  /**
   * Check if selected answer is correct
   * @param {Object} question - Question object
   * @param {number|string} selectedOption - Selected option
   * @returns {boolean}
   */
  function checkAnswer(question, selectedOption) {
    if (question.type === 'multiple_choice') {
      return selectedOption === question.correctOption;
    } else if (question.type === 'true_false') {
      return selectedOption === question.correctOption;
    }
    return false;
  }

  /**
   * Move to next question
   * @returns {Object|null} Next question or null if quiz complete
   */
  function nextQuestion() {
    if (!session || session.status !== 'active') {
      return null;
    }

    session.currentIndex++;

    if (session.currentIndex >= session.questions.length) {
      // Quiz complete
      completeSession();
      return null;
    }

    startQuestionTimer();
    dispatchEvent('question-changed', {
      currentIndex: session.currentIndex,
      question: session.questions[session.currentIndex]
    });

    return session.questions[session.currentIndex];
  }

  /**
   * Skip current question (counts as incorrect)
   * @returns {Object} Skip result
   */
  function skipQuestion() {
    if (!session || session.status !== 'active') {
      throw new Error('No active session');
    }

    const question = session.questions[session.currentIndex];
    const timeSpent = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0;

    // Reset streak on skip
    session.currentStreak = 0;

    // Store as incorrect
    session.answers[session.currentIndex] = {
      selectedOption: null,
      isCorrect: false,
      timeSpent,
      skipped: true,
      correctOption: question.correctOption
    };

    const result = {
      questionIndex: session.currentIndex,
      skipped: true,
      isCorrect: false,
      correctOption: question.correctOption,
      timeSpent,
      streak: 0,
      maxStreak: session.maxStreak,
      totalCorrect: session.totalCorrect
    };

    dispatchEvent('answer-submitted', result);
    return result;
  }

  /**
   * Complete the quiz session
   * @param {boolean} forced - Whether completion was forced (e.g., time limit)
   */
  function completeSession(forced = false) {
    if (!session) return;

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    session.status = 'completed';
    session.endTime = Date.now();

    // Calculate XP using XPSystem
    const xpBreakdown = XPSystem.calculateQuizXP({
      questions: session.questions,
      answers: session.answers,
      totalCorrect: session.totalCorrect,
      maxStreak: session.maxStreak,
      timeSpent: session.timeSpent,
      timeLimit: session.timeLimit
    });

    session.totalXP = xpBreakdown.totalXP;
    session.xpBreakdown = xpBreakdown;

    // Update MetaverseState
    const xpUpdate = XPSystem.updateXP(session.totalXP);
    XPSystem.updateWorldProgress(true);

    session.xpUpdate = xpUpdate;

    console.log('[QuizGameplay] Session completed:', session);
    dispatchEvent('session-completed', getSession());

    return getSession();
  }

  /**
   * Abandon current session
   */
  function abandonSession() {
    if (!session) return;

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    session.status = 'abandoned';
    session.endTime = Date.now();

    console.log('[QuizGameplay] Session abandoned:', session);
    dispatchEvent('session-abandoned', getSession());

    return getSession();
  }

  /**
   * Get current session state
   * @returns {Object|null}
   */
  function getSession() {
    return session ? { ...session } : null;
  }

  /**
   * Get current question
   * @returns {Object|null}
   */
  function getCurrentQuestion() {
    if (!session || session.status !== 'active') return null;
    return session.questions[session.currentIndex] || null;
  }

  /**
   * Get session progress
   * @returns {Object}
   */
  function getProgress() {
    if (!session) return null;

    return {
      currentIndex: session.currentIndex,
      totalQuestions: session.questions.length,
      progressPercent: (session.currentIndex / session.questions.length) * 100,
      totalCorrect: session.totalCorrect,
      currentStreak: session.currentStreak,
      maxStreak: session.maxStreak,
      timeRemaining: session.timeRemaining,
      timeSpent: session.timeSpent
    };
  }

  /**
   * Reset session state
   */
  function resetSession() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    session = null;
    questionStartTime = null;
  }

  /**
   * Dispatch custom event
   */
  function dispatchEvent(eventName, data) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(`quiz-${eventName}`, { detail: data });
      window.dispatchEvent(event);
    }
  }

  return {
    startSession,
    startQuestionTimer,
    submitAnswer,
    nextQuestion,
    skipQuestion,
    completeSession,
    abandonSession,
    getSession,
    getCurrentQuestion,
    getProgress,
    resetSession
  };
})();

if (typeof window !== 'undefined') {
  window.QuizGameplay = QuizGameplay;
}
