/**
 * Global state connecting Discover to entire Quizok ecosystem
 */
const MetaverseState = (function () {
  const state = {
    // User's world progress
    world: {
      currentIsland: 3,
      totalIslands: 5,
      quizzesCompletedThisIsland: 7,
      quizzesNeeded: 10,
      xp: 2450,
      level: 12
    },
    
    // AI-generated quest for today
    todayQuest: {
      id: 'quest_linear_algebra_001',
      title: 'Linear Algebra Mastery',
      description: 'Master linear equations based on your weak areas',
      difficulty: 'medium',
      questions: 8,
      duration_min: 15,
      xp_reward: 150,
      category: 'math',
      status: 'active' // 'active', 'completed', 'expired'
    },
    
    // User's clan information
    clan: {
      id: 'clan_tashkent_titans',
      name: 'Tashkent Titans',
      rank: 2,
      members: 24,
      score: 8450
    },
    
    // Current clan war
    clanWar: {
      id: 'war_001',
      opponent: 'Samarkand Scholars',
      opponentScore: 8200,
      yourScore: 8450,
      endsAt: '2026-06-12T23:59:59Z',
      category: 'STEM'
    },
    
    // Knowledge market balance
    knowledge: {
      points: 2350,
      balance: '$12.50'
    },
    
    // User preferences (for dynamic backgrounds)
    preferences: {
      preferredDifficulty: 'medium',
      favoriteCategories: ['math', 'physics', 'business'],
      recentCategories: ['math', 'programming']
    }
  };

  function getWorldProgress() {
    return state.world;
  }

  function getTodayQuest() {
    return state.todayQuest;
  }

  function getClanWar() {
    return state.clanWar;
  }

  function getClan() {
    return state.clan;
  }

  function getKnowledge() {
    return state.knowledge;
  }

  function getPreferences() {
    return state.preferences;
  }

  // Update XP and recalculate level
  function addXP(xpEarned) {
    state.world.xp += xpEarned;
    
    // Recalculate level based on new XP
    // Level formula: floor(sqrt(xp / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(state.world.xp / 100)) + 1;
    const previousLevel = state.world.level;
    state.world.level = newLevel;
    
    const levelUp = newLevel > previousLevel;
    
    console.log('[MetaverseState] XP updated:', {
      xpEarned,
      totalXP: state.world.xp,
      previousLevel,
      newLevel,
      levelUp
    });
    
    return {
      previousXP: state.world.xp - xpEarned,
      newXP: state.world.xp,
      xpEarned,
      previousLevel,
      newLevel,
      levelUp
    };
  }

  // Update quiz completion progress
  function incrementQuizProgress() {
    state.world.quizzesCompletedThisIsland++;
    
    // Check if island should be unlocked
    if (state.world.quizzesCompletedThisIsland >= state.world.quizzesNeeded) {
      if (state.world.currentIsland < state.world.totalIslands) {
        state.world.currentIsland++;
        state.world.quizzesCompletedThisIsland = 0;
        console.log('[MetaverseState] New island unlocked:', state.world.currentIsland);
      }
    }
    
    return {
      quizzesCompleted: state.world.quizzesCompletedThisIsland,
      currentIsland: state.world.currentIsland,
      islandUnlocked: state.world.quizzesCompletedThisIsland === 0
    };
  }

  // Update today's quest status
  function completeTodayQuest() {
    if (state.todayQuest.status === 'active') {
      state.todayQuest.status = 'completed';
      console.log('[MetaverseState] Today quest completed');
    }
    return state.todayQuest;
  }

  // Update clan war score (for future Clan Wars integration)
  function addClanWarScore(points) {
    state.clanWar.yourScore += points;
    console.log('[MetaverseState] Clan war score updated:', state.clanWar.yourScore);
    return state.clanWar;
  }

  // Update knowledge points (for future Marketplace integration)
  function addKnowledgePoints(points) {
    state.knowledge.points += points;
    // Simple conversion: 100 points = $1
    state.knowledge.balance = `$${(state.knowledge.points / 100).toFixed(2)}`;
    console.log('[MetaverseState] Knowledge points updated:', state.knowledge);
    return state.knowledge;
  }

  // Load from real API later
  async function initializeFromAPI() {
    // Fetch from: /api/user/metaverse-state
    // For now: use hardcoded state
    console.log('[MetaverseState] Initialized with state:', state);
  }

  return {
    getWorldProgress,
    getTodayQuest,
    getClanWar,
    getClan,
    getKnowledge,
    getPreferences,
    addXP,
    incrementQuizProgress,
    completeTodayQuest,
    addClanWarScore,
    addKnowledgePoints,
    initializeFromAPI,
    state // For debugging
  };
})();

if (typeof window !== 'undefined') {
  window.MetaverseState = MetaverseState;
}