/**
 * QuizOk Discover — static UI config (categories, tags, cover gradients)
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

const COVER_GRADIENTS = {
  math: 'linear-gradient(135deg,#0a1628 0%,#0066aa 50%,#00aaff 100%)',
  science: 'linear-gradient(135deg,#0d1f2d 0%,#0d9488 50%,#00e5c3 100%)',
  engineering: 'linear-gradient(135deg,#1a1035 0%,#4c1d95 50%,#7c3aed 100%)',
  programming: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#00e5ff 100%)',
  business: 'linear-gradient(135deg,#1c1917 0%,#b45309 50%,#fbbf24 100%)',
  ielts: 'linear-gradient(135deg,#172554 0%,#1d4ed8 50%,#60a5fa 100%)',
  languages: 'linear-gradient(135deg,#1e1b4b 0%,#6366f1 50%,#a5b4fc 100%)',
  history: 'linear-gradient(135deg,#292524 0%,#78716c 50%,#d6d3d1 100%)',
  geography: 'linear-gradient(135deg,#052e16 0%,#15803d 50%,#4ade80 100%)',
  entertainment: 'linear-gradient(135deg,#4a044e 0%,#c026d3 50%,#f472b6 100%)',
  general: 'linear-gradient(135deg,#060610 0%,#0b2847 50%,#00aaff 100%)',
  language: 'linear-gradient(135deg,#1e1b4b 0%,#6366f1 50%,#a5b4fc 100%)'
};

if (typeof window !== 'undefined') {
  window.DiscoverConfig = { DISCOVER_CATEGORIES, TRENDING_TAGS, COVER_GRADIENTS };
}
