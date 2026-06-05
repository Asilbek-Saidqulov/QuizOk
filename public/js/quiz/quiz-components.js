/**
 * QuizOk Quiz UI Components
 * Renders question display, answer options, progress bar, timer, and results
 */

const QuizComponents = (function () {
  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  };

  const fmtTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Render loading state
   */
  function loadingState() {
    return `
      <div class="qz-loading">
        <div class="qz-spinner"></div>
        <p>Loading quiz...</p>
      </div>
    `;
  }

  /**
   * Render quiz header with progress and timer
   */
  function quizHeader(quizData, progress) {
    const { title, category, difficulty } = quizData;
    const { currentIndex, totalQuestions, timeRemaining } = progress;

    const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
    const diffLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

    return `
      <header class="qz-header">
        <div class="qz-header-top">
          <div class="qz-title-group">
            <span class="qz-category">${esc(category)}</span>
            <h1 class="qz-title">${esc(title)}</h1>
          </div>
          ${timeRemaining !== null ? `
            <div class="qz-timer ${timeRemaining <= 60 ? 'qz-timer--warning' : ''}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>${fmtTime(timeRemaining)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="qz-progress-bar">
          <div class="qz-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        
        <div class="qz-progress-text">
          <span>Question ${currentIndex + 1} of ${totalQuestions}</span>
          <span class="qz-difficulty qz-difficulty--${esc(difficulty)}">${esc(diffLabel[difficulty] || difficulty)}</span>
        </div>
      </header>
    `;
  }

  /**
   * Render question display
   */
  function questionDisplay(question, index) {
    return `
      <div class="qz-question" data-question-index="${index}">
        <div class="qz-question-number">Question ${index + 1}</div>
        <h2 class="qz-question-text">${esc(question.question)}</h2>
      </div>
    `;
  }

  /**
   * Render answer options for multiple choice
   */
  function answerOptions(question, selectedOption = null, showResult = false, correctAnswer = null) {
    const options = question.options || [];
    
    return `
      <div class="qz-options">
        ${options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = correctAnswer === idx;
          
          let className = 'qz-option';
          if (showResult) {
            if (isSelected && isCorrect) className += ' qz-option--correct';
            else if (isSelected && !isCorrect) className += ' qz-option--wrong';
            else if (!isSelected && isCorrect) className += ' qz-option--correct-reveal';
          } else if (isSelected) {
            className += ' qz-option--selected';
          }

          const letter = String.fromCharCode(65 + idx); // A, B, C, D...

          return `
            <button 
              type="button" 
              class="${className}" 
              data-option-index="${idx}"
              ${showResult ? 'disabled' : ''}
              aria-label="Option ${letter}: ${esc(option)}"
            >
              <span class="qz-option-letter">${letter}</span>
              <span class="qz-option-text">${esc(option)}</span>
              ${showResult && isCorrect ? `
                <svg class="qz-option-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              ` : ''}
              ${showResult && isSelected && !isCorrect ? `
                <svg class="qz-option-icon qz-option-icon--wrong" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              ` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render feedback after answer
   */
  function answerFeedback(isCorrect, streak, explanation) {
    return `
      <div class="qz-feedback qz-feedback--${isCorrect ? 'correct' : 'wrong'}">
        <div class="qz-feedback-icon">
          ${isCorrect ? `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          ` : `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          `}
        </div>
        <div class="qz-feedback-content">
          <h3 class="qz-feedback-title">${isCorrect ? 'Correct!' : 'Incorrect'}</h3>
          ${streak > 1 ? `<p class="qz-streak">🔥 ${streak} streak!</p>` : ''}
          ${explanation ? `<p class="qz-explanation">${esc(explanation)}</p>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render action buttons (Next, Skip, etc.)
   */
  function actionButtons(showNext = true, showSkip = true, isLastQuestion = false) {
    return `
      <div class="qz-actions">
        ${showSkip ? `
          <button type="button" class="qz-btn qz-btn--ghost" data-action="skip">
            Skip
          </button>
        ` : ''}
        ${showNext ? `
          <button type="button" class="qz-btn qz-btn--primary" data-action="next">
            ${isLastQuestion ? 'Finish Quiz' : 'Next Question'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render results screen with XP breakdown
   */
  function resultsScreen(session) {
    const { 
      quizTitle, 
      questions, 
      totalCorrect, 
      maxStreak, 
      totalXP, 
      xpBreakdown,
      xpUpdate 
    } = session;

    const accuracy = Math.round((totalCorrect / questions.length) * 100);
    const { levelUp, newLevel, previousLevel } = xpUpdate || {};

    return `
      <div class="qz-results">
        <div class="qz-results-header">
          <div class="qz-results-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          </div>
          <h1 class="qz-results-title">Quiz Complete!</h1>
          <p class="qz-results-subtitle">${esc(quizTitle)}</p>
        </div>

        <div class="qz-stats-grid">
          <div class="qz-stat-card">
            <div class="qz-stat-value">${totalCorrect}/${questions.length}</div>
            <div class="qz-stat-label">Correct</div>
          </div>
          <div class="qz-stat-card">
            <div class="qz-stat-value">${accuracy}%</div>
            <div class="qz-stat-label">Accuracy</div>
          </div>
          <div class="qz-stat-card">
            <div class="qz-stat-value">🔥 ${maxStreak}</div>
            <div class="qz-stat-label">Best Streak</div>
          </div>
        </div>

        <div class="qz-xp-breakdown">
          <h2 class="qz-xp-title">XP Earned</h2>
          <div class="qz-xp-total">
            <span class="qz-xp-number">+${totalXP}</span>
            <span class="qz-xp-label">Total XP</span>
          </div>

          <div class="qz-xp-details">
            <div class="qz-xp-row">
              <span>Base XP</span>
              <span>+${xpBreakdown?.questionXP?.reduce((sum, q) => sum + q.baseXP, 0) || 0}</span>
            </div>
            ${xpBreakdown?.streakBonus > 0 ? `
              <div class="qz-xp-row qz-xp-row--bonus">
                <span>🔥 Streak Bonus</span>
                <span>+${xpBreakdown.streakBonus}</span>
              </div>
            ` : ''}
            ${xpBreakdown?.completionBonus > 0 ? `
              <div class="qz-xp-row qz-xp-row--bonus">
                <span>✨ Completion Bonus</span>
                <span>+${xpBreakdown.completionBonus}</span>
              </div>
            ` : ''}
            ${xpBreakdown?.perfectBonus > 0 ? `
              <div class="qz-xp-row qz-xp-row--bonus">
                <span>⭐ Perfect Bonus</span>
                <span>+${xpBreakdown.perfectBonus}</span>
              </div>
            ` : ''}
          </div>

          ${levelUp ? `
            <div class="qz-level-up">
              <div class="qz-level-up-icon">🎉</div>
              <div class="qz-level-up-text">
                <div class="qz-level-up-title">Level Up!</div>
                <div class="qz-level-up-level">Level ${previousLevel} → ${newLevel}</div>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="qz-results-actions">
          <button type="button" class="qz-btn qz-btn--primary qz-btn--block" data-action="return-home">
            Return to Discover
          </button>
          <button type="button" class="qz-btn qz-btn--ghost qz-btn--block" data-action="review-answers">
            Review Answers
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render answer review
   */
  function answerReview(session) {
    const { questions, answers } = session;

    return `
      <div class="qz-review">
        <div class="qz-review-header">
          <h1>Answer Review</h1>
          <button type="button" class="qz-btn qz-btn--ghost" data-action="back-to-results">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Results
          </button>
        </div>
        
        <div class="qz-review-list">
          ${questions.map((question, index) => {
            const answer = answers[index];
            const isCorrect = answer?.isCorrect || false;
            
            return `
              <div class="qz-review-item ${isCorrect ? 'qz-review-item--correct' : 'qz-review-item--wrong'}">
                <div class="qz-review-number">${index + 1}</div>
                <div class="qz-review-content">
                  <p class="qz-review-question">${esc(question.question)}</p>
                  <div class="qz-review-answer">
                    <span>Your answer: ${answer?.selectedOption !== null ? esc(question.options[answer.selectedOption]) : 'Skipped'}</span>
                    ${!isCorrect ? `<span>Correct: ${esc(question.options[question.correctOption])}</span>` : ''}
                  </div>
                  ${question.explanation ? `<p class="qz-review-explanation">${esc(question.explanation)}</p>` : ''}
                </div>
                <div class="qz-review-status">
                  ${isCorrect ? '✓' : '✗'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  return {
    loadingState,
    quizHeader,
    questionDisplay,
    answerOptions,
    answerFeedback,
    actionButtons,
    resultsScreen,
    answerReview,
    esc,
    fmtTime
  };
})();

if (typeof window !== 'undefined') {
  window.QuizComponents = QuizComponents;
}
