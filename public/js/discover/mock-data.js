/**
 * QuizOk Discover — static UI constants (categories & trending tags).
 * All quiz/creator data is now loaded from Supabase via /api/discover.
 */

const DISCOVER_CATEGORIES = [
  'all', 'trending', 'new', 'most_played',
  'math', 'science', 'engineering', 'programming',
  'business', 'ielts', 'languages', 'history',
  'geography', 'entertainment'
];

const TRENDING_TAGS = [
  'Math', 'Science', 'Engineering', 'Business', 'IELTS',
  'Programming', 'History', 'Geography', 'AI Generated'
];

if (typeof window !== 'undefined') {
  window.DiscoverMock = { DISCOVER_CATEGORIES, TRENDING_TAGS };
}