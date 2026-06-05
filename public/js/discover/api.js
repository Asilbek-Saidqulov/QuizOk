/**
 * QuizOk Discover — data access (Supabase via /api/discover)
 */

const DiscoverAPI = (function () {
  let cache = null;
  let loadPromise = null;

  function coverForCategory(cat) {
    const g = DiscoverConfig.COVER_GRADIENTS;
    return g[cat] || g.general;
  }

  function enrichList(list) {
    return list.map((q) => ({
      ...q,
      cover_gradient: q.cover_gradient || coverForCategory(q.category)
    }));
  }

  async function loadCatalog() {
    if (cache) return cache;
    if (loadPromise) return loadPromise;

    loadPromise = fetch('/api/discover')
      .then(async (r) => {
        if (!r.ok) {
          let msg = 'Failed to load quizzes';
          try { const d = await r.json(); msg = d.error || msg; } catch (_) {}
          throw new Error(msg);
        }
        const data = await r.json();
        cache = {
          stats: data.stats || { total_quizzes: 0, total_plays: 0 },
          quizzes: enrichList(data.quizzes || []),
          creators: data.creators || []
        };
        return cache;
      })
      .catch((err) => {
        console.error('[DiscoverAPI] loadCatalog error:', err.message);
        // Return empty catalog so the page still renders (empty state)
        return { stats: { total_quizzes: 0, total_plays: 0 }, quizzes: [], creators: [] };
      })
      .finally(() => {
        loadPromise = null;
      });

    return loadPromise;
  }

  function sortQuizzes(list, sortBy) {
    const copy = [...list];
    switch (sortBy) {
      case 'most_played':
        return copy.sort((a, b) => b.play_count - a.play_count);
      case 'newest':
        return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'most_liked':
        return copy.sort((a, b) => b.likes - a.likes);
      case 'trending':
      default:
        return copy.sort((a, b) => b.trending_score - a.trending_score);
    }
  }

  function filterQuizzes(list, filters = {}) {
    let out = [...list];
    const q = (filters.query || '').trim().toLowerCase();
    if (q) {
      out = out.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          (x.creator?.username || '').toLowerCase().includes(q) ||
          x.category.includes(q) ||
          (q === 'ai' && x.is_ai_generated)
      );
    }
    if (filters.category && filters.category !== 'all') {
      if (filters.category === 'trending') {
        out = sortQuizzes(out, 'trending').slice(0, 40);
      } else if (filters.category === 'new') {
        out = sortQuizzes(out, 'newest').slice(0, 40);
      } else if (filters.category === 'most_played') {
        out = sortQuizzes(out, 'most_played').slice(0, 40);
      } else {
        const cat = filters.category;
        out = out.filter(
          (x) => x.category === cat || (cat === 'languages' && x.category === 'language')
        );
      }
    }
    if (filters.difficulty && filters.difficulty !== 'any') {
      out = out.filter((x) => x.difficulty === filters.difficulty);
    }
    if (filters.min_questions) {
      out = out.filter((x) => x.question_count >= filters.min_questions);
    }
    if (filters.max_questions) {
      out = out.filter((x) => x.question_count <= filters.max_questions);
    }
    if (filters.min_duration) {
      out = out.filter((x) => x.duration_min >= filters.min_duration);
    }
    if (filters.max_duration) {
      out = out.filter((x) => x.duration_min <= filters.max_duration);
    }
    if (filters.ai_only) {
      out = out.filter((x) => x.is_ai_generated);
    }
    if (filters.sort) {
      out = sortQuizzes(out, filters.sort);
    }
    return out;
  }

  function recommendedForUser(quizzes, prefs) {
    const scored = quizzes.map((quiz) => {
      let score = quiz.trending_score * 0.01;
      if (prefs.recent_categories?.includes(quiz.category)) score += 40;
      if (prefs.favorite_categories?.includes(quiz.category)) score += 60;
      if (quiz.difficulty === prefs.preferred_difficulty) score += 25;
      return { quiz, score };
    });
    return scored.sort((a, b) => b.score - a.score).map((x) => x.quiz).slice(0, 8);
  }

  async function fetchGlobalStats() {
    const { stats } = await loadCatalog();
    return stats;
  }

  async function fetchAllQuizzes() {
    const { quizzes } = await loadCatalog();
    return quizzes;
  }

  async function fetchQuizzes(filters = {}) {
    const list = await fetchAllQuizzes();
    return filterQuizzes(list, filters);
  }

  async function fetchFeatured() {
    const list = await fetchAllQuizzes();
    const featured = list.filter((q) => q.is_featured);
    return featured.length ? featured.slice(0, 4) : sortQuizzes(list, 'most_played').slice(0, 4);
  }

  async function fetchTrending(limit = 8) {
    const list = await fetchAllQuizzes();
    return sortQuizzes(list, 'trending').slice(0, limit);
  }

  async function fetchAiGenerated(limit = 6) {
    const list = await fetchAllQuizzes();
    return list.filter((q) => q.is_ai_generated).slice(0, limit);
  }

  async function fetchEditorPicks(limit = 6) {
    const list = await fetchAllQuizzes();
    const picks = list.filter((q) => q.is_editor_pick);
    return picks.length ? picks.slice(0, limit) : sortQuizzes(list, 'most_played').slice(4, 4 + limit);
  }

  async function fetchTopCreators(limit = 10) {
    const { creators } = await loadCatalog();
    return creators.slice(0, limit);
  }

  async function fetchRecommended(prefs) {
    const list = await fetchAllQuizzes();
    const user = prefs || getStoredUserPrefs();
    return recommendedForUser(list, user);
  }

  function getStoredUserPrefs() {
    try {
      const raw = sessionStorage.getItem('quizok_auth');
      if (!raw) return { recent_categories: [], favorite_categories: [], preferred_difficulty: 'medium' };
      const { user } = JSON.parse(raw);
      return {
        recent_categories: user?.recent_categories || ['general', 'math', 'science'],
        favorite_categories: user?.favorite_categories || [],
        preferred_difficulty: user?.preferred_difficulty || 'medium'
      };
    } catch {
      return { recent_categories: [], favorite_categories: [], preferred_difficulty: 'medium' };
    }
  }

  async function fetchCreatorById(id) {
    const { creators, quizzes } = await loadCatalog();
    let creator = creators.find((c) => c.id === id);
    if (!creator) {
      const quiz = quizzes.find((q) => q.creator_id === id);
      if (!quiz) return null;
      creator = {
        id,
        username: quiz.creator.username,
        avatar: quiz.creator.avatar,
        followers: 0,
        total_plays: 0,
        public_quizzes: 0
      };
      quizzes.filter((q) => q.creator_id === id).forEach((q) => {
        creator.public_quizzes += 1;
        creator.total_plays += q.play_count;
      });
      creator.followers = Math.max(100, creator.total_plays * 2);
    }
    return creator;
  }

  function invalidateCache() {
    cache = null;
  }

  return {
    fetchGlobalStats,
    fetchQuizzes,
    fetchFeatured,
    fetchTrending,
    fetchAiGenerated,
    fetchEditorPicks,
    fetchTopCreators,
    fetchRecommended,
    fetchCreatorById,
    filterQuizzes,
    sortQuizzes,
    invalidateCache
  };
})();

if (typeof window !== 'undefined') {
  window.DiscoverAPI = DiscoverAPI;
}