/**
 * QuizOk XP System
 * Calculates XP earned from quiz gameplay with streak bonuses and level progression
 */

const XPSystem = (function () {
  // XP Configuration
  const CONFIG = {
    BASE_XP_PER_CORRECT: 10,        // Base XP for each correct answer
    BASE_XP_PER_QUESTION: 5,        // Minimum XP for attempting a question
    STREAK_BONUS_MULTIPLIER: 0.5,   // 50% bonus per streak level
    STREAK_THRESHOLD: 3,            // Minimum streak to start bonuses
    COMPLETION_BONUS_PERCENTAGE: 0.2, // 20% bonus for completing quiz
    PERFECT_BONUS: 50,              // Bonus for 100% correct
    SPEED_BONUS_THRESHOLD: 0.7,     // Answer within 70% of time limit
    SPEED_BONUS_MULTIPLIER: 0.3,    // 30% bonus for fast answers
    LEVEL_BASE: 100,                // Base XP for level 1
    LEVEL_MULTIPLIER: 1.5           // Exponential growth factor
  };

  /**
   * Calculate level from total XP using exponential curve
   * Level = floor(log((XP / BASE) + 1) / log(MULTIPLIER)) + 1
   */
  function calculateLevel(totalXP) {
    if (totalXP < 0) totalXP = 0;
    const level = Math.floor(Math.log((totalXP / CONFIG.LEVEL_BASE) + 1) / Math.log(CONFIG.LEVEL_MULTIPLIER)) + 1;
    return Math.max(1, level);
  }

  /**
   * Calculate XP needed for a specific level
   */
  function xpForLevel(level) {
    return Math.floor(CONFIG.LEVEL_BASE * (Math.pow(CONFIG.LEVEL_MULTIPLIER, level - 1) - 1));
  }

  /**
   * Calculate XP progress towards next level
   * Returns { currentLevel, currentLevelXP, nextLevelXP, progressPercent }
   */
  function getLevelProgress(totalXP) {
    const currentLevel = calculateLevel(totalXP);
    const currentLevelXP = xpForLevel(currentLevel);
    const nextLevelXP = xpForLevel(currentLevel + 1);
    const progressPercent = ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    
    return {
      currentLevel,
      currentLevelXP,
      nextLevelXP,
      progressPercent: Math.min(100, Math.max(0, progressPercent))
    };
  }

  /**
   * Calculate streak bonus
   * @param {number} streak - Current streak count
   * @returns {number} Bonus multiplier (e.g., 1.5 for 50% bonus)
   */
  function calculateStreakBonus(streak) {
    if (streak < CONFIG.STREAK_THRESHOLD) return 1;
    const streakLevels = Math.floor((streak - CONFIG.STREAK_THRESHOLD) / 2) + 1;
    return 1 + (streakLevels * CONFIG.STREAK_BONUS_MULTIPLIER);
  }

  /**
   * Calculate XP for a single question answer
   * @param {Object} params - { isCorrect, streak, timeSpent, timeLimit }
   * @returns {Object} - { baseXP, streakBonus, speedBonus, totalXP }
   */
  function calculateQuestionXP(params) {
    const { isCorrect, streak, timeSpent, timeLimit } = params;
    
    let baseXP = isCorrect ? CONFIG.BASE_XP_PER_CORRECT : CONFIG.BASE_XP_PER_QUESTION;
    let streakBonus = 0;
    let speedBonus = 0;

    // Apply streak bonus for correct answers
    if (isCorrect && streak >= CONFIG.STREAK_THRESHOLD) {
      const multiplier = calculateStreakBonus(streak);
      streakBonus = Math.floor(baseXP * (multiplier - 1));
    }

    // Apply speed bonus for fast correct answers
    if (isCorrect && timeSpent && timeLimit) {
      const timeRatio = timeSpent / timeLimit;
      if (timeRatio <= CONFIG.SPEED_BONUS_THRESHOLD) {
        speedBonus = Math.floor(baseXP * CONFIG.SPEED_BONUS_MULTIPLIER);
      }
    }

    const totalXP = baseXP + streakBonus + speedBonus;

    return {
      baseXP,
      streakBonus,
      speedBonus,
      totalXP
    };
  }

  /**
   * Calculate total XP for a completed quiz
   * @param {Object} session - Quiz session data
   * @returns {Object} - Complete XP breakdown
   */
  function calculateQuizXP(session) {
    const { questions, answers, totalCorrect, maxStreak, timeSpent, timeLimit } = session;
    
    let totalXP = 0;
    let breakdown = {
      questionXP: [],
      streakBonus: 0,
      completionBonus: 0,
      perfectBonus: 0,
      totalXP: 0
    };

    let currentStreak = 0;
    let maxStreakAchieved = 0;

    // Calculate XP for each question
    answers.forEach((answer, index) => {
      const question = questions[index];
      if (!question) return;

      const isCorrect = answer.isCorrect;
      
      // Update streak
      if (isCorrect) {
        currentStreak++;
        maxStreakAchieved = Math.max(maxStreakAchieved, currentStreak);
      } else {
        currentStreak = 0;
      }

      const xpResult = calculateQuestionXP({
        isCorrect,
        streak: currentStreak,
        timeSpent: answer.timeSpent,
        timeLimit: question.timeLimit || 30
      });

      totalXP += xpResult.totalXP;
      breakdown.questionXP.push({
        questionIndex: index,
        isCorrect,
        streak: currentStreak,
        ...xpResult
      });

      breakdown.streakBonus += xpResult.streakBonus;
    });

    // Completion bonus (20% of base question XP)
    const baseQuestionXP = breakdown.questionXP.reduce((sum, q) => sum + q.baseXP, 0);
    breakdown.completionBonus = Math.floor(baseQuestionXP * CONFIG.COMPLETION_BONUS_PERCENTAGE);
    totalXP += breakdown.completionBonus;

    // Perfect bonus (100% correct)
    if (totalCorrect === questions.length) {
      breakdown.perfectBonus = CONFIG.PERFECT_BONUS;
      totalXP += breakdown.perfectBonus;
    }

    breakdown.totalXP = totalXP;
    breakdown.maxStreak = maxStreakAchieved;

    return breakdown;
  }

  /**
   * Update user's XP and level in MetaverseState
   * @param {number} xpEarned - XP earned from quiz
   * @returns {Object} - Updated world progress
   */
  function updateXP(xpEarned) {
    const world = MetaverseState.getWorldProgress();
    const newTotalXP = world.xp + xpEarned;
    const newLevel = calculateLevel(newTotalXP);
    const levelProgress = getLevelProgress(newTotalXP);

    // Update MetaverseState
    MetaverseState.state.world.xp = newTotalXP;
    MetaverseState.state.world.level = newLevel;

    return {
      previousXP: world.xp,
      newXP: newTotalXP,
      xpGained: xpEarned,
      previousLevel: world.level,
      newLevel,
      levelUp: newLevel > world.level,
      levelProgress
    };
  }

  /**
   * Update world progress (quizzes completed)
   * @param {boolean} completed - Whether quiz was completed
   */
  function updateWorldProgress(completed) {
    if (!completed) return;

    const world = MetaverseState.getWorldProgress();
    world.quizzesCompletedThisIsland++;

    // Check if island should be unlocked
    if (world.quizzesCompletedThisIsland >= world.quizzesNeeded) {
      if (world.currentIsland < world.totalIslands) {
        world.currentIsland++;
        world.quizzesCompletedThisIsland = 0;
      }
    }

    MetaverseState.state.world = world;
  }

  /**
   * Get XP configuration (for testing/debugging)
   */
  function getConfig() {
    return { ...CONFIG };
  }

  return {
    calculateLevel,
    xpForLevel,
    getLevelProgress,
    calculateStreakBonus,
    calculateQuestionXP,
    calculateQuizXP,
    updateXP,
    updateWorldProgress,
    getConfig
  };
})();

if (typeof window !== 'undefined') {
  window.XPSystem = XPSystem;
}
