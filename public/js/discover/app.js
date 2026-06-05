/**
 * QuizOk Discover — page controller
 */

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    category: 'all',
    query: '',
    filters: {
      difficulty: 'any',
      min_questions: '',
      max_questions: '',
      min_duration: '',
      max_duration: '',
      ai_only: false,
      sort: 'trending'
    },
    bookmarkedIds: new Set(JSON.parse(localStorage.getItem('dc_bookmarks') || '[]')),
    likedIds: new Set(JSON.parse(localStorage.getItem('dc_likes') || '[]')),
    followingIds: new Set(JSON.parse(localStorage.getItem('dc_following') || '[]')),
    filtersOpen: false,
    searchDebounce: null
  };

  function persistSets() {
    localStorage.setItem('dc_bookmarks', JSON.stringify([...state.bookmarkedIds]));
    localStorage.setItem('dc_likes', JSON.stringify([...state.likedIds]));
    localStorage.setItem('dc_following', JSON.stringify([...state.followingIds]));
  }

  function animateCount(el, target) {
    if (!el) return;
    const start = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
    const dur = 900;
    const t0 = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(start + (target - start) * ease).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function showLoadingGrid(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="dc-loading-state" style="grid-column:1/-1;text-align:center;padding:48px 24px;color:var(--dc-t2,#94a3b8)">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:dc-spin 1s linear infinite;display:inline-block">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <p style="margin-top:12px;font-size:14px">Yuklanmoqda...</p>
      </div>`;
  }

  function renderGrid(container, quizzes, variant) {
    if (!container) return;
    if (!quizzes || !quizzes.length) {
      container.innerHTML = DiscoverComponents.emptyState();
      container.classList.add('dc-grid--empty');
      return;
    }
    container.classList.remove('dc-grid--empty');
    container.innerHTML = quizzes
      .map((q) =>
        DiscoverComponents.quizCard(q, {
          variant,
          bookmarkedIds: state.bookmarkedIds,
          likedIds: state.likedIds
        })
      )
      .join('');
  }

  function showApiError(message) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:fixed;top:72px;left:50%;transform:translateX(-50%);
      background:#1e293b;border:1px solid #ef4444;color:#fca5a5;
      padding:12px 24px;border-radius:12px;font-size:14px;z-index:9999;
      box-shadow:0 8px 32px rgba(0,0,0,.4);max-width:420px;text-align:center;
    `;
    banner.textContent = '⚠️ ' + message;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 6000);
  }

  function updateCategoryIndicator() {
    const active = $('.dc-cat-btn.is-active');
    const indicator = $('#dcCatIndicator');
    if (!active || !indicator) return;
    const bar = $('#dcCategoryBar');
    const barRect = bar.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    indicator.style.width = rect.width + 'px';
    indicator.style.transform = `translateX(${rect.left - barRect.left + bar.scrollLeft}px)`;
  }

  function buildCategoryBar() {
    const labels = DiscoverComponents.categoryLabels();
    const bar = $('#dcCategoryBar');
    bar.innerHTML =
      '<div class="dc-cat-indicator" id="dcCatIndicator"></div>' +
      DiscoverMock.DISCOVER_CATEGORIES.map(
        (cat) =>
          `<button type="button" class="dc-cat-btn${cat === state.category ? ' is-active' : ''}" data-cat="${cat}">${labels[cat] || cat}</button>`
      ).join('');
    $$('.dc-cat-btn', bar).forEach((btn) => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.cat;
        $$('.dc-cat-btn', bar).forEach((b) => b.classList.toggle('is-active', b === btn));
        updateCategoryIndicator();
        runMainSearch();
      });
    });
    requestAnimationFrame(updateCategoryIndicator);
    window.addEventListener('resize', updateCategoryIndicator);
    bar.addEventListener('scroll', updateCategoryIndicator);
  }

  function buildTrendingChips() {
    const wrap = $('#dcTrendingChips');
    wrap.innerHTML = DiscoverMock.TRENDING_TAGS.map(
      (tag) => `<button type="button" class="dc-chip" data-tag="${tag.toLowerCase()}">${tag}</button>`
    ).join('');
    $$('.dc-chip', wrap).forEach((chip) => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        $('#dcSearchInput').value = tag === 'ai generated' ? 'ai' : tag;
        state.query = $('#dcSearchInput').value;
        runMainSearch();
        document.getElementById('dcResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  async function loadSections() {

    // Initialize metaverse state FIRST 
    await MetaverseState.initializeFromAPI();
  
    // Render metaverse widgets
    const worldEl = $('#dcWorldSection');
    const questEl = $('#dcQuestSection');
    const warsEl = $('#dcClanWarsSection');
  
    if (worldEl) worldEl.innerHTML = DiscoverComponents.worldProgressWidget();
    if (questEl) questEl.innerHTML = DiscoverComponents.aiQuestWidget();
    if (warsEl) warsEl.innerHTML = DiscoverComponents.clanWarsWidget();
  
    // Start clan war timer
    startClanWarTimer();
  
    // Then load quiz sections (existing code)
    showLoadingGrid($('#dcFeaturedGrid'));
    
    // Show loading spinners in every section grid
    ['#dcFeaturedGrid','#dcTrendingGrid','#dcAiGrid','#dcEditorGrid','#dcRecommendedGrid'].forEach(sel => {
      showLoadingGrid($(sel));
    });

    let stats, featured, trending, ai, editor, creators, recommended;

    try {
      [stats, featured, trending, ai, editor, creators, recommended] = await Promise.all([
        DiscoverAPI.fetchGlobalStats(),
        DiscoverAPI.fetchFeatured(),
        DiscoverAPI.fetchTrending(8),
        DiscoverAPI.fetchAiGenerated(6),
        DiscoverAPI.fetchEditorPicks(6),
        DiscoverAPI.fetchTopCreators(10),
        DiscoverAPI.fetchRecommended()
      ]);
    } catch (err) {
      console.error('[Discover] loadSections failed:', err);
      showApiError("Ma'lumotlarni yuklashda xatolik. Server ishlayaptimi?");
      // Render empty states so the page isn't blank
      stats = { total_quizzes: 0, total_plays: 0 };
      featured = trending = ai = editor = recommended = [];
      creators = [];
    }

    animateCount($('#dcStatQuizzes'), stats.total_quizzes || 0);
    animateCount($('#dcStatPlays'), stats.total_plays || 0);

    renderGrid($('#dcFeaturedGrid'), featured, 'featured');
    renderGrid($('#dcTrendingGrid'), trending);
    renderGrid($('#dcAiGrid'), ai);
    renderGrid($('#dcEditorGrid'), editor, 'featured');
    renderGrid($('#dcRecommendedGrid'), recommended);

    $('#dcLeaderboard').innerHTML = creators.length
      ? DiscoverComponents.creatorLeaderboard(creators)
      : '<p style="padding:24px;color:var(--dc-t3,#64748b);text-align:center">Hali creator yo\'q</p>';
  }

  async function runMainSearch() {
    const grid = $('#dcResultsGrid');
    if (!grid) return;
    grid.classList.add('is-loading');
    showLoadingGrid(grid);

    const filters = {
      query: state.query,
      category: state.category,
      ...state.filters
    };
    if (filters.min_questions) filters.min_questions = parseInt(filters.min_questions, 10);
    if (filters.max_questions) filters.max_questions = parseInt(filters.max_questions, 10);
    if (filters.min_duration) filters.min_duration = parseInt(filters.min_duration, 10);
    if (filters.max_duration) filters.max_duration = parseInt(filters.max_duration, 10);

    let results = [];
    try {
      results = await DiscoverAPI.fetchQuizzes(filters);
    } catch (err) {
      console.error('[Discover] search failed:', err);
    }

    renderGrid(grid, results);
    grid.classList.remove('is-loading');

    const countEl = $('#dcResultsCount');
    if (countEl) countEl.textContent = `${results.length} quiz${results.length === 1 ? '' : 'zes'}`;
  }

  function readFiltersFromDOM() {
    state.filters.difficulty = $('#dcFilterDifficulty')?.value || 'any';
    state.filters.min_questions = $('#dcFilterMinQ')?.value || '';
    state.filters.max_questions = $('#dcFilterMaxQ')?.value || '';
    state.filters.min_duration = $('#dcFilterMinDur')?.value || '';
    state.filters.max_duration = $('#dcFilterMaxDur')?.value || '';
    state.filters.ai_only = $('#dcFilterAiOnly')?.checked || false;
    state.filters.sort = $('#dcFilterSort')?.value || 'trending';
  }

  function openCreatorModal(creatorId) {
    DiscoverAPI.fetchCreatorById(creatorId).then((creator) => {
      if (!creator) return;
      const modal = $('#dcCreatorModal');
      const following = state.followingIds.has(creator.id);
      $('#dcModalAvatar').textContent = creator.avatar;
      $('#dcModalName').textContent = creator.username;
      $('#dcModalFollowers').textContent = DiscoverComponents.fmtNum(creator.followers) + ' followers';
      $('#dcModalPlays').textContent = DiscoverComponents.fmtNum(creator.total_plays) + ' total plays';
      $('#dcModalQuizzes').textContent = creator.public_quizzes + ' public quizzes';
      const followBtn = $('#dcModalFollow');
      followBtn.textContent = following ? 'Following' : 'Follow';
      followBtn.classList.toggle('is-following', following);
      followBtn.dataset.creatorId = creator.id;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }).catch(() => {});
  }

  function closeCreatorModal() {
    const modal = $('#dcCreatorModal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function handleDelegatedClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const card = e.target.closest('.dc-card');
    const quizId = card?.dataset?.quizId;
    const action = actionEl.dataset.action;

    if (action === 'creator') {
      e.preventDefault();
      const id = actionEl.dataset.creatorId || e.target.closest('[data-creator-id]')?.dataset?.creatorId;
      if (id) openCreatorModal(id);
      return;
    }

    if (!quizId) {
      const row = e.target.closest('[data-creator-id]');
      if (row && (action === 'creator' || row.dataset.action === 'creator-row')) {
        openCreatorModal(row.dataset.creatorId);
      }
      return;
    }

    if (action === 'like') {
      if (state.likedIds.has(quizId)) state.likedIds.delete(quizId);
      else state.likedIds.add(quizId);
      persistSets();
      refreshInteractionUI();
      return;
    }
    if (action === 'bookmark') {
      if (state.bookmarkedIds.has(quizId)) state.bookmarkedIds.delete(quizId);
      else state.bookmarkedIds.add(quizId);
      persistSets();
      refreshInteractionUI();
      return;
    }
    if (action === 'play' || action === 'open-quiz') {
      window.location.href = '/quiz.html?quizId=' + encodeURIComponent(quizId);
      return;
    }
  }

  function refreshInteractionUI() {
    $$('.dc-card').forEach((card) => {
      const id = card.dataset.quizId;
      const likeBtn = card.querySelector('[data-action="like"]');
      const bmBtn = card.querySelector('[data-action="bookmark"]');
      if (likeBtn) likeBtn.classList.toggle('is-active', state.likedIds.has(id));
      if (bmBtn) bmBtn.classList.toggle('is-active', state.bookmarkedIds.has(id));
    });
  }

  function bindEvents() {
    document.body.addEventListener('click', handleDelegatedClick);

    const searchInput = $('#dcSearchInput');
    searchInput.addEventListener('input', () => {
      clearTimeout(state.searchDebounce);
      state.searchDebounce = setTimeout(() => {
        state.query = searchInput.value.trim();
        runMainSearch();
      }, 220);
    });

    $('#dcFilterToggle').addEventListener('click', () => {
      state.filtersOpen = !state.filtersOpen;
      $('#dcFiltersPanel').classList.toggle('is-open', state.filtersOpen);
      $('#dcFilterToggle').setAttribute('aria-expanded', String(state.filtersOpen));
    });

    $('#dcApplyFilters').addEventListener('click', () => {
      readFiltersFromDOM();
      runMainSearch();
    });

    $('#dcResetFilters').addEventListener('click', () => {
      $('#dcFilterDifficulty').value = 'any';
      $('#dcFilterMinQ').value = '';
      $('#dcFilterMaxQ').value = '';
      $('#dcFilterMinDur').value = '';
      $('#dcFilterMaxDur').value = '';
      $('#dcFilterAiOnly').checked = false;
      $('#dcFilterSort').value = 'trending';
      readFiltersFromDOM();
      runMainSearch();
    });

    $('#dcModalClose').addEventListener('click', closeCreatorModal);
    $('#dcCreatorModal').addEventListener('click', (e) => {
      if (e.target.id === 'dcCreatorModal') closeCreatorModal();
    });

    $('#dcModalFollow').addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.creatorId;
      if (!id) return;
      if (state.followingIds.has(id)) state.followingIds.delete(id);
      else state.followingIds.add(id);
      persistSets();
      openCreatorModal(id);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCreatorModal();
    });
  }

  function initRevealAnimations() {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible');
            obs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    $$('.dc-reveal').forEach((el) => obs.observe(el));
  }

  // Add spinner keyframe if not already in discover.css
  function injectSpinnerStyle() {
    if (document.getElementById('dc-spin-style')) return;
    const style = document.createElement('style');
    style.id = 'dc-spin-style';
    style.textContent = '@keyframes dc-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  function startClanWarTimer() {
    const timerEl = $('#dcClanWarTimer');
    if (!timerEl) return;
  
    function updateTimer() {
      const war = MetaverseState.getClanWar();
      const now = new Date();
      const end = new Date(war.endsAt);
      const diff = end - now;
    
      if (diff <= 0) {
        timerEl.textContent = 'FINISHED';
        return;
      }
    
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
    
      timerEl.textContent = `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  
    updateTimer();
    setInterval(updateTimer, 1000);
  }

  function showFocusBanner(message) {
    const banner = $('#dcFocusBanner');
    if (!banner) return;
    banner.textContent = message;
    banner.hidden = false;
  }

  async function handleFocusedQuiz() {
    const params = new URLSearchParams(window.location.search);
    const focusedId = params.get('focus');
    if (!focusedId) return;

    const allQuizzes = await DiscoverAPI.fetchAllQuizzes();
    const focusedQuiz = allQuizzes.find((q) => q.id === focusedId);
    if (!focusedQuiz) {
      showFocusBanner('Sorry, this quiz is not available or not published yet.');
      return;
    }

    showFocusBanner('Previewing published quiz. Use filters to browse more.');
    renderGrid($('#dcResultsGrid'), [focusedQuiz]);
    const countEl = $('#dcResultsCount');
    if (countEl) countEl.textContent = '1 quiz';
  }

  async function init() {
    injectSpinnerStyle();
    buildCategoryBar();
    buildTrendingChips();
    bindEvents();
    await loadSections();
    await runMainSearch();
    await handleFocusedQuiz();
    initRevealAnimations();
    requestAnimationFrame(updateCategoryIndicator);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();