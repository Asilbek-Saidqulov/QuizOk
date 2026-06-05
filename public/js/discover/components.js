/**
 * QuizOk Discover — reusable UI components
 */

const DiscoverComponents = (function () {
  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  };

  const fmtNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  };

  const diffLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  function difficultyBadge(level) {
    return `<span class="dc-diff dc-diff--${esc(level)}">${esc(diffLabel[level] || level)}</span>`;
  }

  function quizCard(quiz, opts = {}) {
    const variant = opts.variant || 'default';
    const bookmarked = opts.bookmarkedIds?.has(quiz.id);
    const liked = opts.likedIds?.has(quiz.id);
    const aiClass = quiz.is_ai_generated ? ' dc-card--ai' : '';
    const featClass = variant === 'featured' ? ' dc-card--featured' : '';

    return `
      <article class="dc-card ${featClass}${aiClass}" data-action="open-quiz" data-quiz-id="${esc(quiz.id)}" tabindex="0">
        <div class="dc-card-cover" style="background:${quiz.cover_gradient}">
          ${quiz.is_ai_generated ? '<span class="dc-ai-pill">AI</span>' : ''}
          ${!quiz.is_public ? '<span class="dc-private-pill">Private</span>' : ''}
          <div class="dc-card-cover-overlay">
            <button type="button" class="dc-play-btn" data-action="play" aria-label="Play quiz">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Play
            </button>
          </div>
        </div>
        <div class="dc-card-body">
          <div class="dc-card-top">
            <h3 class="dc-card-title">${esc(quiz.title)}</h3>
            ${difficultyBadge(quiz.difficulty)}
          </div>
          <button type="button" class="dc-creator" data-action="creator" data-creator-id="${esc(quiz.creator.id)}">
            <span class="dc-creator-av">${esc(quiz.creator.avatar)}</span>
            <span class="dc-creator-name">${esc(quiz.creator.username)}</span>
          </button>
          <div class="dc-card-meta">
            <span>${quiz.question_count} questions</span>
            <span class="dc-meta-dot"></span>
            <span>${quiz.duration_min} min</span>
          </div>
          <div class="dc-card-stats">
            <span title="Plays">▶ ${fmtNum(quiz.play_count)}</span>
            <span title="Likes">♥ ${fmtNum(quiz.likes)}</span>
          </div>
          <div class="dc-card-actions">
            <button type="button" class="dc-icon-btn${liked ? ' is-active' : ''}" data-action="like" aria-label="Like">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button type="button" class="dc-icon-btn${bookmarked ? ' is-active' : ''}" data-action="bookmark" aria-label="Bookmark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button type="button" class="dc-icon-btn dc-play-sm" data-action="play" aria-label="Play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
      </article>`;
  }

  function creatorLeaderboard(creators) {
    return creators
      .map(
        (c, i) => `
      <div class="dc-leader-row${i < 3 ? ' dc-leader-row--top' : ''}" data-creator-id="${esc(c.id)}" data-action="creator-row">
        <span class="dc-leader-rank">${i + 1}</span>
        <button type="button" class="dc-leader-av" data-action="creator">${esc(c.avatar)}</button>
        <div class="dc-leader-info">
          <button type="button" class="dc-leader-name" data-action="creator">${esc(c.username)}</button>
          <span class="dc-leader-sub">${fmtNum(c.followers)} followers</span>
        </div>
        <div class="dc-leader-stats">
          <span><strong>${fmtNum(c.total_plays)}</strong> plays</span>
          <span><strong>${c.public_quizzes}</strong> quizzes</span>
        </div>
      </div>`
      )
      .join('');
  }

  function emptyState(message = 'No quizzes found.') {
    return `
      <div class="dc-empty">
        <div class="dc-empty-art" aria-hidden="true">
          <svg viewBox="0 0 200 160" fill="none">
            <circle cx="100" cy="72" r="48" stroke="rgba(0,170,255,.25)" stroke-width="2"/>
            <path d="M76 72h48M100 48v48" stroke="rgba(0,229,255,.4)" stroke-width="2" stroke-linecap="round"/>
            <rect x="40" y="120" width="120" height="12" rx="6" fill="rgba(0,170,255,.12)"/>
            <rect x="60" y="136" width="80" height="8" rx="4" fill="rgba(0,229,195,.1)"/>
          </svg>
        </div>
        <h3>${message}</h3>
        <p>Try clearing filters, searching for another topic, or publishing a quiz to make it appear.</p>
        <a href="/?screen=teacher" class="dc-btn dc-btn--primary">Create a Quiz</a>
      </div>`;
  }

  function categoryLabels() {
    return {
      all: 'All',
      trending: 'Trending',
      new: 'New',
      most_played: 'Most Played',
      math: 'Math',
      science: 'Science',
      engineering: 'Engineering',
      programming: 'Programming',
      business: 'Business',
      ielts: 'IELTS',
      languages: 'Languages',
      history: 'History',
      geography: 'Geography',
      entertainment: 'Entertainment'
    };
  }

  function worldProgressWidget() {
    const world = MetaverseState.getWorldProgress();
    const progress = (world.quizzesCompletedThisIsland / world.quizzesNeeded) * 100;
  
    return `
      <div class="dc-world-widget dc-reveal">
        <div class="dc-world-header">
          <h3>🏝️ Your World Progress</h3>
          <span class="dc-world-level">Level ${world.level}</span>
        </div>
      
        <div class="dc-world-island">
          <p class="dc-world-island-name">Island ${world.currentIsland}</p>
          <div class="dc-progress-bar">
            <div class="dc-progress-fill" style="width: ${progress}%"></div>
          </div>
          <p class="dc-progress-text">
            ${world.quizzesCompletedThisIsland}/${world.quizzesNeeded} quizzes completed
          </p>
        </div>
      
        <div class="dc-world-xp">
          <span>XP: <strong>${world.xp}</strong></span>
        </div>
      
        <button class="dc-btn dc-btn--primary dc-btn--block" style="margin-top:12px;">
         Complete ${world.quizzesNeeded - world.quizzesCompletedThisIsland} More to Unlock Island ${world.currentIsland + 1}
        </button>
     </div>
    `;
  }

  function aiQuestWidget() {
    const quest = MetaverseState.getTodayQuest();
  
    return `
      <div class="dc-ai-quest dc-reveal">
        <div class="dc-ai-quest-header">
          <h3>🤖 Your AI-Generated Quest</h3>
          <span class="dc-ai-badge">Smart Match</span>
        </div>
      
        <div class="dc-ai-quest-card">
          <h4>${esc(quest.title)}</h4>
          <p class="dc-ai-quest-desc">${esc(quest.description)}</p>
        
          <div class="dc-ai-quest-meta">
            <span>
              <strong>${quest.questions}</strong> questions
            </span>
            <span class="dc-meta-dot"></span>
            <span>
              <strong>${quest.duration_min}</strong> min
            </span>
            <span class="dc-meta-dot"></span>
            <span>
              <strong>+${quest.xp_reward}</strong> XP
            </span>
          </div>
        
          <div class="dc-ai-quest-difficulty">
            ${difficultyBadge(quest.difficulty)}
          </div>
        
          <button class="dc-btn dc-btn--primary dc-btn--block" data-action="start-quest" data-quest-id="${esc(quest.id)}">
            Start Your Quest →
          </button>
        </div>
      </div>
    `;
  }
  function clanWarsWidget() {
    const war = MetaverseState.getClanWar();
    const clan = MetaverseState.getClan();
  
    const scoreDiff = war.yourScore - war.opponentScore;
      const yourLeading = scoreDiff > 0;
  
    return `
      <div class="dc-clan-wars dc-reveal">
        <div class="dc-clan-wars-header">
          <h3>⚔️ Active Clan War</h3>
          <span class="dc-clan-war-category">${esc(war.category)}</span>
        </div>
      
        <div class="dc-clan-war-card">
          <div class="dc-clan-war-team">
            <div class="dc-team-info">
              <h4>${esc(clan.name)}</h4>
              <p class="dc-team-size">${clan.members} members</p>
            </div>
            <div class="dc-team-score ${yourLeading ? 'is-leading' : ''}">
              ${war.yourScore}
            </div>
          </div>
        
          <div class="dc-clan-war-vs">VS</div>
        
          <div class="dc-clan-war-team">
            <div class="dc-team-info">
              <h4>${esc(war.opponent)}</h4>
              <p class="dc-team-size">Enemy clan</p>
            </div>
            <div class="dc-team-score ${!yourLeading ? 'is-leading' : ''}">
              ${war.opponentScore}
            </div>
          </div>
        </div>
      
        <div class="dc-clan-war-timer">
          <p>Ends in: <strong id="dcClanWarTimer">--:--:--</strong></p>
        </div>
      
        <button class="dc-btn dc-btn--primary dc-btn--block">
          Join War & Contribute Quizzes
        </button>
      </div>
    `;
  }

  return {
    esc,
    fmtNum,
    quizCard,
    creatorLeaderboard,
    emptyState,
    categoryLabels,
    difficultyBadge,
    worldProgressWidget,
    aiQuestWidget,
    clanWarsWidget
  };
})();

if (typeof window !== 'undefined') {
  window.DiscoverComponents = DiscoverComponents;
}