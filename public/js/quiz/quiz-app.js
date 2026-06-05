/**
 * QuizOk Quiz Application
 * Orchestrates quiz gameplay flow and UI updates
 */

(function () {
  // DOM Elements
  const loadingScreen = document.getElementById('qzLoadingScreen');
  const gameplayScreen = document.getElementById('qzGameplayScreen');
  const resultsScreen = document.getElementById('qzResultsScreen');
  const reviewScreen = document.getElementById('qzReviewScreen');

  const headerContainer = document.getElementById('qzHeader');
  const questionContainer = document.getElementById('qzQuestionContainer');
  const optionsContainer = document.getElementById('qzOptionsContainer');
  const feedbackContainer = document.getElementById('qzFeedbackContainer');
  const actionsContainer = document.getElementById('qzActionsContainer');
  const resultsContainer = document.getElementById('qzResultsContainer');
  const reviewContainer = document.getElementById('qzReviewContainer');

  // State
  let currentQuizData = null;
  let currentQuestion = null;
  let selectedOption = null;
  let showingFeedback = false;

  /**
   * Initialize quiz from URL parameter
   */
  async function initializeQuiz() {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('quizId');

    if (!quizId) {
      showError('No quiz selected. Redirecting to Discover...');
      setTimeout(() => {
        window.location.href = '/discover.html';
      }, 1800);
      return;
    }

    try {
      // Fetch quiz data
      const quizData = await QuizAPI.fetchQuiz(quizId);
      const questions = await QuizAPI.fetchQuestions(quizId);

      currentQuizData = {
        ...quizData,
        questions
      };

      // Start gameplay session
      QuizGameplay.startSession(currentQuizData);

      // Render initial state
      showScreen('gameplay');
      renderQuestion();

      console.log('[QuizApp] Quiz initialized:', currentQuizData);
    } catch (error) {
      console.error('[QuizApp] Initialization error:', error);
      showError('Failed to load quiz. Please try again.');
    }
  }

  /**
   * Show specific screen
   */
  function showScreen(screen) {
    loadingScreen.style.display = 'none';
    gameplayScreen.style.display = 'none';
    resultsScreen.style.display = 'none';
    reviewScreen.style.display = 'none';

    switch (screen) {
      case 'loading':
        loadingScreen.style.display = 'flex';
        break;
      case 'gameplay':
        gameplayScreen.style.display = 'flex';
        break;
      case 'results':
        resultsScreen.style.display = 'flex';
        break;
      case 'review':
        reviewScreen.style.display = 'flex';
        break;
    }
  }

  /**
   * Render current question and UI
   */
  function renderQuestion() {
    const session = QuizGameplay.getSession();
    if (!session) return;

    currentQuestion = QuizGameplay.getCurrentQuestion();
    if (!currentQuestion) {
      completeQuiz();
      return;
    }

    const progress = QuizGameplay.getProgress();

    // Render header
    headerContainer.innerHTML = QuizComponents.quizHeader(currentQuizData, progress);

    // Render question
    questionContainer.innerHTML = QuizComponents.questionDisplay(
      currentQuestion,
      session.currentIndex
    );

    // Render options
    optionsContainer.innerHTML = QuizComponents.answerOptions(currentQuestion);

    // Clear feedback and actions
    feedbackContainer.innerHTML = '';
    actionsContainer.innerHTML = '';

    selectedOption = null;
    showingFeedback = false;

    // Attach option click handlers
    attachOptionHandlers();
  }

  /**
   * Attach click handlers to answer options
   */
  function attachOptionHandlers() {
    const options = optionsContainer.querySelectorAll('.qz-option');
    options.forEach(option => {
      option.addEventListener('click', () => handleOptionClick(parseInt(option.dataset.optionIndex)));
    });
  }

  /**
   * Handle option selection
   */
  function handleOptionClick(optionIndex) {
    if (showingFeedback) return;

    selectedOption = optionIndex;

    // Update visual selection
    const options = optionsContainer.querySelectorAll('.qz-option');
    options.forEach(opt => opt.classList.remove('qz-option--selected'));
    options[optionIndex].classList.add('qz-option--selected');

    // Submit answer
    const result = QuizGameplay.submitAnswer(optionIndex);

    // Show feedback
    showFeedback(result);
  }

  /**
   * Show answer feedback
   */
  function showFeedback(result) {
    showingFeedback = true;

    // Update options to show correct/incorrect
    optionsContainer.innerHTML = QuizComponents.answerOptions(
      currentQuestion,
      selectedOption,
      true,
      currentQuestion.correctOption
    );

    // Show feedback message
    feedbackContainer.innerHTML = QuizComponents.answerFeedback(
      result.isCorrect,
      result.streak,
      currentQuestion.explanation
    );

    // Show next button
    const isLastQuestion = QuizGameplay.getProgress().currentIndex >= currentQuizData.questions.length - 1;
    actionsContainer.innerHTML = QuizComponents.actionButtons(true, false, isLastQuestion);

    // Attach action handlers
    attachActionHandlers();
  }

  /**
   * Attach action button handlers
   */
  function attachActionHandlers() {
    const nextBtn = actionsContainer.querySelector('[data-action="next"]');
    const skipBtn = actionsContainer.querySelector('[data-action="skip"]');

    if (nextBtn) {
      nextBtn.addEventListener('click', handleNext);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', handleSkip);
    }
  }

  /**
   * Handle next question
   */
  function handleNext() {
    const next = QuizGameplay.nextQuestion();
    if (next) {
      renderQuestion();
    } else {
      completeQuiz();
    }
  }

  /**
   * Handle skip question
   */
  function handleSkip() {
    QuizGameplay.skipQuestion();
    handleNext();
  }

  /**
   * Complete quiz and show results
   */
  function completeQuiz() {
    const session = QuizGameplay.completeSession();

    // Update MetaverseState
    MetaverseState.addXP(session.totalXP);
    MetaverseState.incrementQuizProgress();

    // Render results
    resultsContainer.innerHTML = QuizComponents.resultsScreen(session);
    showScreen('results');

    // Attach results action handlers
    attachResultsHandlers();

    // Submit results to server
    QuizAPI.submitResults(session);

    console.log('[QuizApp] Quiz completed:', session);
  }

  /**
   * Attach results screen handlers
   */
  function attachResultsHandlers() {
    const homeBtn = resultsContainer.querySelector('[data-action="return-home"]');
    const reviewBtn = resultsContainer.querySelector('[data-action="review-answers"]');

    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        window.location.href = '/discover.html';
      });
    }

    if (reviewBtn) {
      reviewBtn.addEventListener('click', showReview);
    }
  }

  /**
   * Show answer review
   */
  function showReview() {
    const session = QuizGameplay.getSession();
    reviewContainer.innerHTML = QuizComponents.answerReview(session);
    showScreen('review');

    // Attach review handlers
    const backBtn = reviewContainer.querySelector('[data-action="back-to-results"]');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        showScreen('results');
      });
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    loadingScreen.innerHTML = `
      <div class="qz-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <p>${message}</p>
        <button onclick="window.location.href='/discover.html'" class="qz-btn qz-btn--primary">
          Return to Discover
        </button>
      </div>
    `;
  }

  /**
   * Listen for gameplay events
   */
  function setupEventListeners() {
    // Timer updates
    window.addEventListener('quiz-timer-update', (e) => {
      const progress = QuizGameplay.getProgress();
      headerContainer.innerHTML = QuizComponents.quizHeader(currentQuizData, progress);
    });

    // Question changes
    window.addEventListener('quiz-question-changed', (e) => {
      // Handled in renderQuestion
    });

    // Answer submitted
    window.addEventListener('quiz-answer-submitted', (e) => {
      // Handled in handleOptionClick
    });

    // Session completed
    window.addEventListener('quiz-session-completed', (e) => {
      // Handled in completeQuiz
    });

    // Session abandoned
    window.addEventListener('quiz-session-abandoned', (e) => {
      window.location.href = '/discover.html';
    });
  }

  /**
   * Handle page unload
   */
  function handleUnload() {
    const session = QuizGameplay.getSession();
    if (session && session.status === 'active') {
      QuizGameplay.abandonSession();
    }
  }

  /**
   * Initialize app
   */
  function init() {
    showScreen('loading');
    setupEventListeners();
    initializeQuiz();

    window.addEventListener('beforeunload', handleUnload);
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
