require('dotenv').config();
const path = require('path');
const https = require('https');

const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn(`WARNING: Could not load .env from ${envPath}.`, envResult.error);
  dotenv.config();
}

if (!process.env.SUPABASE_URL) {
  console.error('❌ CRITICAL: SUPABASE_URL not found in .env');
  process.exit(1);
}
if (!process.env.SUPABASE_ANON_KEY) {
  console.error('❌ CRITICAL: SUPABASE_ANON_KEY not found in .env');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.options(/.*/, cors());

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/api/auth', authRouter);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
} else {
  app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: No SUPABASE_SERVICE_ROLE_KEY found. Server-side write operations may be blocked by RLS policies.');
}

const activeSessions = {};

const MOCK_QUIZ = {
  id: 'mock_quiz_001',
  title: 'Mathematics Challenge',
  description: 'Test your math skills with a short practice quiz.',
  category: 'math',
  difficulty: 'medium',
  mode: 'classic',
  teacher_id: null,
  is_published: true,
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  likes: 42,
  play_count: 120,
  views: 180,
  is_featured: true,
  is_editor_pick: true,
  is_ai_generated: false,
  question_count: 5,
  duration_min: 8,
  creator: {
    id: 'mock_creator_001',
    username: 'QuizOk Team',
    avatar: 'QZ'
  }
};

const MOCK_QUESTIONS = [
  {
    id: 'mq1',
    type: 'multiple_choice',
    question: 'What is 15 × 7?',
    options: ['95', '105', '115', '125'],
    correctOption: 1,
    correct_index: 1,
    timeLimit: 30,
    explanation: '15 × 7 = 105'
  },
  {
    id: 'mq2',
    type: 'multiple_choice',
    question: 'What is the square root of 144?',
    options: ['10', '11', '12', '14'],
    correctOption: 2,
    correct_index: 2,
    timeLimit: 30,
    explanation: '12 × 12 = 144'
  },
  {
    id: 'mq3',
    type: 'multiple_choice',
    question: 'Solve: 2x + 5 = 15',
    options: ['x = 4', 'x = 5', 'x = 6', 'x = 7'],
    correctOption: 1,
    correct_index: 1,
    timeLimit: 45,
    explanation: '2x = 10, so x = 5'
  },
  {
    id: 'mq4',
    type: 'multiple_choice',
    question: 'What is 25% of 80?',
    options: ['15', '18', '20', '22'],
    correctOption: 2,
    correct_index: 2,
    timeLimit: 30,
    explanation: '0.25 × 80 = 20'
  },
  {
    id: 'mq5',
    type: 'multiple_choice',
    question: 'What is the next number in the sequence: 2, 6, 18, 54, ...?',
    options: ['108', '162', '216', '324'],
    correctOption: 1,
    correct_index: 1,
    timeLimit: 45,
    explanation: 'Each number is multiplied by 3: 54 × 3 = 162'
  }
];

// ===== USER PROFILE API =====
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/stats', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('level, xp, games_created, games_played, accuracy')
      .eq('id', req.user.id)
      .single();
    
    if (error) return res.status(404).json({ error: error.message });
    res.json({
      level: data.level || 1,
      xp: data.xp || 0,
      quizzes_created: data.games_created || 0,
      quizzes_played: data.games_played || 0,
      accuracy: data.accuracy || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/activity', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        score,
        correct_answers,
        total_questions,
        accuracy,
        completed_at,
        session_id
      `)
      .eq('user_id', req.user.id)
      .order('completed_at', { ascending: false })
      .limit(10);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/daily-quest', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', req.user.id)
      .gte('completed_at', `${today}T00:00:00Z`)
      .lte('completed_at', `${today}T23:59:59Z`);
    
    if (error) return res.status(500).json({ error: error.message });
    
    res.json({
      completed: data?.length || 0,
      total: 3,
      progress: Math.min((data?.length || 0) / 3, 1),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { display_name, avatar_url } = req.body;
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name, avatar_url, updated_at: new Date() })
      .eq('id', req.user.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/user/password', authMiddleware, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    
    // Use Supabase auth to change password
    const { error } = await supabase.auth.updateUser({
      password: new_password,
    });
    
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LIKE SYSTEM FIX =====
app.post('/api/quiz/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if already liked
    const { data: existing } = await supabase
      .from('quiz_likes')
      .select('id')
      .eq('quiz_id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (existing) {
      // Unlike
      await supabase
        .from('quiz_likes')
        .delete()
        .eq('quiz_id', id)
        .eq('user_id', req.user.id);
      
      // Decrement counter
      await supabase
        .from('quizzes')
        .update({ likes_count: (await supabase.from('quizzes').select('likes_count').eq('id', id).single()).data.likes_count - 1 })
        .eq('id', id);
      
      return res.json({ liked: false });
    }
    
    // Like
    await supabase
      .from('quiz_likes')
      .insert({ quiz_id: id, user_id: req.user.id });
    
    // Increment counter
    await supabase
      .from('quizzes')
      .update({ likes_count: (await supabase.from('quizzes').select('likes_count').eq('id', id).single()).data.likes_count + 1 })
      .eq('id', id);
    
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SAVE/BOOKMARK SYSTEM =====
app.post('/api/quiz/:id/save', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_quizzes')
      .select('id')
      .eq('quiz_id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (existing) {
      // Unsave
      await supabase
        .from('saved_quizzes')
        .delete()
        .eq('quiz_id', id)
        .eq('user_id', req.user.id);
      
      return res.json({ saved: false });
    }
    
    // Save
    await supabase
      .from('saved_quizzes')
      .insert({ quiz_id: id, user_id: req.user.id });
    
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/saved-quizzes', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_quizzes')
      .select('quiz_id')
      .eq('user_id', req.user.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== REST API =====

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured'
  });
});

// Discover — public quiz catalog (Supabase)
app.get('/api/discover', async (req, res) => {
  try {
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (quizError) {
      return res.status(500).json({ error: quizError.message });
    }

    const rows = quizzes || [];

    const teacherIds = [
      ...new Set(
        rows
          .map((q) => q.teacher_id)
          .filter(Boolean)
      )
    ];

    const profileMap = {};

    if (teacherIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, followers_count')
        .in('id', teacherIds);

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });
    }

    const now = Date.now();

    const normalized = rows
      .filter((q) => q.question_count > 0)
      .map((q) => {
        const profile = profileMap[q.teacher_id] || null;
        const play_count = q.play_count ?? 0;
        const likes = q.likes ?? 0;
        const createdAt = q.created_at || new Date().toISOString();
        const daysSince = (now - new Date(createdAt).getTime()) / 86400000;
        const recentBoost = Math.max(0, 30 - daysSince) * 120;
        const trending_score = play_count * 2 + likes * 3 + recentBoost;

        return {
          id: q.id,
          title: q.title || 'Untitled Quiz',
          description: q.description || '',
          category: (q.category || 'general').toLowerCase(),
          difficulty: q.difficulty || 'medium',
          cover_image: q.cover_image || null,
          question_count: q.question_count ?? 0,
          duration_min: q.duration_min ?? Math.max(5, Math.ceil((q.question_count ?? 0) * 1.2)),
          play_count,
          likes,
          views: q.views ?? 0,
          favorites_count: q.favorites_count ?? 0,
          is_featured: !!q.is_featured,
          is_editor_pick: !!q.is_editor_pick,
          is_published: !!q.is_published,
          created_at: createdAt,
          updated_at: q.updated_at,
          published_at: q.published_at,
          trending_score,
          creator: {
            id: q.teacher_id,
            username: profile?.username ?? null,
            display_name: profile?.display_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
            followers_count: profile?.followers_count ?? 0
          }
        };
      });

    const creatorsMap = {};
    normalized.forEach((quiz) => {
      const creator = quiz.creator;
      if (!creator?.id) return;
      if (!creatorsMap[creator.id]) {
        creatorsMap[creator.id] = {
          id: creator.id,
          username: creator.username,
          display_name: creator.display_name,
          avatar_url: creator.avatar_url,
          followers_count: creator.followers_count,
          total_plays: 0,
          public_quizzes: 0
        };
      }
      creatorsMap[creator.id].public_quizzes += 1;
      creatorsMap[creator.id].total_plays += quiz.play_count;
    });

    const creators = Object.values(creatorsMap)
      .sort((a, b) => b.total_plays - a.total_plays)
      .slice(0, 10);

    const total_plays = normalized.reduce(
      (sum, quiz) => sum + (quiz.play_count || 0),
      0
    );

    res.json({
      stats: { total_quizzes: normalized.length, total_plays },
      quizzes: normalized,
      creators
    });
  } catch (error) {
    console.error('Discover API error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signUpWithPassword({
      email,
      password,
      options: { data: { name } }
    });

    if (error) return res.status(400).json({ error: error.message });

    await supabase.from('profiles').insert({
      id: data.user.id,
      username: name || email.split('@')[0],
      display_name: name || 'New User',
      level: 1,
      xp: 0,
      games_created: 0,
      games_played: 0,
      accuracy: 0,
    }).select();

    res.json({ user: data.user, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ error: error.message });

    const token = jwt.sign(
      {
        id: data.user.id,
        email: data.user.email,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ user: data.user, token, session: data.session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================
// USER PROFILE ROUTES
// ============================================

app.get('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, xp, total_xp, level, followers_count, following_count, games_created, games_played, accuracy, created_at')
      .eq('id', req.user.id)
      .maybeSingle(); 

    // If profile doesn't exist, create it
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: req.user.id,
          username: req.user.name || req.user.email?.split('@')[0] || `user_${Date.now()}`,
          display_name: req.user.name || req.user.email?.split('@')[0] || 'New User',
          xp: 0,
          total_xp: 0,
          level: 1,
          followers_count: 0,
          following_count: 0,
          games_created: 0,
          games_played: 0,
          accuracy: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        return res.status(500).json({ error: 'Failed to create profile', details: createError.message });
      }
      profile = newProfile;
    }

    if (error && !profile) {
      return res.status(500).json({ error: error.message });
    }

    const mappedProfile = {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url || null,
      bio: profile.bio || null,
      name: profile.username || profile.display_name || req.user.name,
      email: req.user.email,
      xp: profile.xp || profile.total_xp || 0,
      total_xp: profile.total_xp || profile.xp || 0,
      level: profile.level || 1,
      followers_count: profile.followers_count || 0,
      following_count: profile.following_count || 0,
      games_created: profile.games_created || 0,
      games_played: profile.games_played || 0,
      accuracy: profile.accuracy || 0,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };

    res.json(mappedProfile);
  } catch (e) {
    console.error('Profile fetch error:', e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Update user profile
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { display_name, avatar_url, bio } = req.body;

    const updateData = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (bio !== undefined) updateData.bio = bio;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(profile);
  } catch (e) {
    console.error('Profile update error:', e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================
// USER STATS ROUTES
// ============================================

app.get('/api/user/stats', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp, total_xp, level, games_created, games_played, accuracy')
      .eq('id', req.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return res.status(500).json({ error: profileError.message });
    }

    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('teacher_id', req.user.id);

    const quizzesCreated = (quizzes || []).length;

    res.json({
      level: profile?.level || 1,
      xp: profile?.xp || profile?.total_xp || 0,
      quizzes_created: quizzesCreated,
      quizzes_played: profile?.games_played || 0,
      accuracy: profile?.accuracy || 0,
    });
  } catch (e) {
    console.error('Stats fetch error:', e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================
// USER ACTIVITY ROUTES
// ============================================

app.get('/api/user/activity', authMiddleware, async (req, res) => {
  try {
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('session_id, created_at, score, correct_count')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (playersError && playersError.code !== 'PGRST116') {
      return res.status(500).json({ error: playersError.message });
    }

    const sessionIds = (players || []).map(p => p.session_id).filter(Boolean);

    if (sessionIds.length === 0) {
      return res.json([]);
    }

    const { data: sessions, error: sessError } = await supabase
      .from('sessions')
      .select('id, quiz_id, created_at, mode')
      .in('id', sessionIds)
      .order('created_at', { ascending: false });

    if (sessError) return res.status(500).json({ error: sessError.message });

    const quizIds = [...new Set((sessions || []).map(s => s.quiz_id).filter(Boolean))];
    const quizMap = {};

    if (quizIds.length > 0) {
      const { data: quizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title')
        .in('id', quizIds);

      if (!quizError) {
        (quizzes || []).forEach(q => { quizMap[q.id] = q.title; });
      }
    }

    const playerMap = {};
    (players || []).forEach(p => {
      playerMap[p.session_id] = {
        score: p.score || 0,
        correct_count: p.correct_count || 0
      };
    });

    const activity = (sessions || []).map(s => {
      const playerData = playerMap[s.id] || {};
      return {
        type: 'quiz',
        title: quizMap[s.quiz_id] || 'Quiz',
        date: new Date(s.created_at).toLocaleDateString('uz-UZ'),
        mode: s.mode || 'classic',
        score: playerData.score || 0
      };
    });

    res.json(activity.slice(0, 5));
  } catch (e) {
    console.error('Activity fetch error:', e);
    res.json([]);
  }
});

// ============================================
// DAILY QUEST ROUTES
// ============================================

app.get('/api/user/daily-quest', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', today);

    const completed = count || 0;
    const total = 3;
    const progress = Math.min(100, Math.round((completed / total) * 100));

    res.json({
      completed,
      total,
      progress,
      is_completed: completed >= total
    });
  } catch (e) {
    console.error('Daily quest error:', e);
    res.json({ completed: 0, total: 3, progress: 0, is_completed: false });
  }
});

// ============================================
// PASSWORD CHANGE ROUTE
// ============================================

app.patch('/api/user/password', authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password)
    return res.status(400).json({ error: 'Parollarni kiriting' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgi' });

  try {
    const { createClient: makeClient } = require('@supabase/supabase-js');
    const tempClient = makeClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const { error: signInError } = await tempClient.auth.signInWithPassword({
      email: req.user.email,
      password: old_password
    });
    if (signInError)
      return res.status(401).json({ error: "Joriy parol noto'g'ri" });

    const { error: updateError } = await tempClient.auth.updateUser({
      password: new_password
    });
    if (updateError)
      return res.status(500).json({ error: updateError.message });

    res.json({ success: true });
  } catch (e) {
    console.error('Password change error:', e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================
// QUIZ CREATION/MANAGEMENT ROUTES
// ============================================

app.post('/api/quiz', authMiddleware, async (req, res) => {
  const { title, questions, category, mode } = req.body;
  if (!title || !questions || questions.length === 0)
    return res.status(400).json({ error: 'Title va savollar kerak' });

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      title,
      category: category || 'general',
      mode: mode || 'classic',
      teacher_id: req.user.id,
      is_published: false,
      published_at: null
    })
    .select().single();
  if (quizError) return res.status(500).json({ error: quizError.message });

  const questionsData = questions.map((q, i) => ({
    quiz_id: quiz.id,
    question: q.question,
    options: q.options,
    correct_index: q.correct,
    order_num: i
  }));

  const { error: qError } = await supabase.from('questions').insert(questionsData);
  if (qError) return res.status(500).json({ error: qError.message });

  res.json({ quiz_id: quiz.id, title: quiz.title });
});

app.put('/api/quiz/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, questions, category, mode } = req.body;
  if (!title || !questions || questions.length === 0)
    return res.status(400).json({ error: 'Title va savollar kerak' });

  // Verify ownership
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('teacher_id')
    .eq('id', id)
    .single();

  if (!quiz) return res.status(404).json({ error: 'Quiz topilmadi' });
  if (quiz.teacher_id !== req.user.id)
    return res.status(403).json({ error: "Ruxsat yo'q" });

  const { error: titleError } = await supabase
    .from('quizzes')
    .update({ title, category: category || 'general', mode: mode || 'classic' })
    .eq('id', id).eq('teacher_id', req.user.id);
  if (titleError) return res.status(500).json({ error: titleError.message });

  await supabase.from('questions').delete().eq('quiz_id', id);
  const questionsData = questions.map((q, i) => ({
    quiz_id: id,
    question: q.question,
    options: q.options,
    correct_index: q.correct ?? q.correct_index,
    order_num: i
  }));
  const { error: qError } = await supabase.from('questions').insert(questionsData);
  if (qError) return res.status(500).json({ error: qError.message });
  res.json({ success: true });
});

app.delete('/api/quiz/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { data: quiz } = await supabase
    .from('quizzes').select('teacher_id').eq('id', id).single();
  if (!quiz) return res.status(404).json({ error: 'Quiz topilmadi' });
  if (quiz.teacher_id !== req.user.id)
    return res.status(403).json({ error: "Ruxsat yo'q" });

  await supabase.from('questions').delete().eq('quiz_id', id);
  const { data: sessions } = await supabase
    .from('sessions').select('id').eq('quiz_id', id);
  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id);
    await supabase.from('answers').delete().in('session_id', sessionIds);
    await supabase.from('players').delete().in('session_id', sessionIds);
    await supabase.from('sessions').delete().in('id', sessionIds);
  }

  const { error } = await supabase.from('quizzes').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/quiz/:id', async (req, res) => {
  const { id } = req.params;
  if (id === 'mock_quiz_001') {
    return res.json({
      ...MOCK_QUIZ,
      questions: MOCK_QUESTIONS.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        correct: q.correctOption,
        explanation: q.explanation
      }))
    });
  }

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes').select('*').eq('id', id).single();
  if (quizError) return res.status(404).json({ error: 'Quiz topilmadi' });

  const { data: questions, error: qError } = await supabase
    .from('questions').select('*').eq('quiz_id', id).order('order_num');
  if (qError) return res.status(500).json({ error: qError.message });

  res.json({ ...quiz, questions });
});

// Quiz savollarini alohida olish
app.get('/api/quiz/:id/questions', async (req, res) => {
  const { id } = req.params;
  if (id === 'mock_quiz_001') {
    return res.json({ questions: MOCK_QUESTIONS.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correctOption: q.correctOption,
      timeLimit: q.timeLimit,
      explanation: q.explanation
    })) });
  }

  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', id)
    .order('order_num');

  if (error) return res.status(500).json({ error: error.message });

  const transformedQuestions = (questions || []).map(q => ({
    id: q.id,
    type: 'multiple_choice',
    question: q.question,
    options: q.options || [],
    correctOption: q.correct_index || 0,
    timeLimit: 30,
    explanation: q.explanation || null
  }));

  res.json({ questions: transformedQuestions });
});

app.get('/api/my-quizzes', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, category, mode, created_at, is_published, published_at')
    .eq('teacher_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const result = await Promise.all(data.map(async (q) => {
    const { count: qCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', q.id);

    const { count: playCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', q.id);

    return {
      ...q,
      quiz_id: q.id,
      question_count: qCount || 0,
      play_count: playCount || 0,
      is_published: !!q.is_published,
      published_at: q.published_at || null
    };
  }));

  res.json(result);
});

app.post('/api/quiz/:id/publish', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: quiz } = await supabase
      .from('quizzes').select('teacher_id, is_published').eq('id', id).single();
    if (!quiz) return res.status(404).json({ error: 'Quiz topilmadi' });
    if (quiz.teacher_id !== req.user.id)
      return res.status(403).json({ error: "Ruxsat yo'q" });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Publish failed: SUPABASE_SERVICE_ROLE_KEY is not configured.');
      return res.status(500).json({ error: 'Server sozlanishi xatosi: nashr qilish uchun SUPABASE_SERVICE_ROLE_KEY kerak' });
    }

    const { count } = await supabase
      .from('questions').select('*', { count: 'exact', head: true }).eq('quiz_id', id);
    if (!count || count < 1)
      return res.status(400).json({ error: "Nashr qilish uchun kamida 1 ta savol kerak" });

    const { data: updatedRows, error: updateError } = await supabase
      .from('quizzes')
      .update({ is_published: true, published_at: new Date().toISOString() })
      .eq('id', id)
      .select('id,is_published,published_at');

    if (updateError) {
      console.error('Publish update error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }
    if (!updatedRows || updatedRows.length === 0) {
      return res.status(500).json({ error: 'Nashr qilishda xatolik yuz berdi' });
    }

    res.json({ success: true, published_at: updatedRows[0].published_at });
  } catch (e) {
    console.error('Publish error:', e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Quiz natijalarini yuborish
app.post('/api/quiz/results', async (req, res) => {
  try {
    const { quizId, totalCorrect, totalXP, maxStreak, answers, timeSpent } = req.body;
    console.log('[Quiz Results]', { quizId, totalCorrect, totalXP, maxStreak, timeSpent });
    res.json({
      success: true,
      message: 'Results received',
      data: { quizId, totalCorrect, totalXP, maxStreak }
    });
  } catch (error) {
    console.error('[Quiz Results Error]', error);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

// Statistika
app.get('/api/stats', authMiddleware, async (req, res) => {
  const { data: quizzes } = await supabase
    .from('quizzes').select('id').eq('teacher_id', req.user.id);

  const quizIds = (quizzes || []).map(q => q.id);
  let totalGames = 0, totalPlayers = 0;

  if (quizIds.length > 0) {
    const { count: gamesCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .in('quiz_id', quizIds);
    totalGames = gamesCount || 0;

    const { data: sessions } = await supabase
      .from('sessions').select('id').in('quiz_id', quizIds);
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds);
      totalPlayers = playersCount || 0;
    }
  }

  res.json({
    total_games: totalGames,
    total_players: totalPlayers,
    total_quizzes: quizIds.length
  });
});

// ============================================
// LIKE SYSTEM ROUTES
// ============================================

app.post('/api/quizzes/:id/like', authMiddleware, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;

    const { data: existingLike } = await supabase
      .from('quiz_likes')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLike) {
      await supabase
        .from('quiz_likes')
        .delete()
        .eq('quiz_id', quizId)
        .eq('user_id', userId);

      const { data: quiz } = await supabase
        .from('quizzes').select('likes').eq('id', quizId).single();
      await supabase.from('quizzes')
        .update({ likes: Math.max(0, (quiz?.likes || 0) - 1) })
        .eq('id', quizId);

      return res.json({ success: true, liked: false });
    }

    const { error: likeError } = await supabase
      .from('quiz_likes')
      .insert({ quiz_id: quizId, user_id: userId });

    if (likeError) return res.status(500).json({ error: likeError.message });

    const { data: quiz } = await supabase
      .from('quizzes').select('likes').eq('id', quizId).single();
    await supabase.from('quizzes')
      .update({ likes: (quiz?.likes || 0) + 1 })
      .eq('id', quizId);

    res.json({ success: true, liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.delete('/api/quizzes/:id/like', authMiddleware, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from('quiz_likes')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Like topilmadi' });
    }

    await supabase.from('quiz_likes').delete()
      .eq('quiz_id', quizId).eq('user_id', userId);

    const { data: quiz } = await supabase
      .from('quizzes').select('likes').eq('id', quizId).single();
    await supabase.from('quizzes')
      .update({ likes: Math.max(0, (quiz?.likes || 0) - 1) })
      .eq('id', quizId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================
// SAVE/BOOKMARK SYSTEM ROUTES
// ============================================

app.post('/api/quizzes/:id/save', authMiddleware, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user.id;

    const { data: existingSave } = await supabase
      .from('saved_quizzes')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSave) {
      await supabase.from('saved_quizzes').delete()
        .eq('quiz_id', quizId).eq('user_id', userId);
      return res.json({ success: true, saved: false });
    }

    const { error: saveError } = await supabase
      .from('saved_quizzes')
      .insert({ quiz_id: quizId, user_id: userId });

    if (saveError) return res.status(500).json({ error: saveError.message });
    res.json({ success: true, saved: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.delete('/api/quizzes/:id/save', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('saved_quizzes')
      .delete()
      .eq('quiz_id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

app.get('/api/user/saved-quizzes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: saved, error: savedError } = await supabase
      .from('saved_quizzes')
      .select('quiz_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (savedError) return res.status(500).json({ error: savedError.message });
    if (!saved || saved.length === 0) return res.json([]);

    const quizIds = saved.map(s => s.quiz_id);

    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, description, category, difficulty, question_count, duration_min, play_count, likes, cover_image, is_published, published_at, created_at')
      .in('id', quizIds);

    if (quizError) return res.status(500).json({ error: quizError.message });

    const savedMap = {};
    saved.forEach(s => { savedMap[s.quiz_id] = s.created_at; });

    const savedQuizzes = (quizzes || []).map(quiz => ({
      ...quiz,
      saved_at: savedMap[quiz.id]
    }));

    res.json(savedQuizzes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ============================================
// RANKINGS ROUTES
// ============================================

const CATEGORIES = ['general', 'math', 'science', 'history', 'business', 'ielts', 'language'];

app.get('/api/rankings/:category', async (req, res) => {
  const { category } = req.params;
  if (!CATEGORIES.includes(category))
    return res.status(400).json({ error: "Noto'g'ri kategoriya" });

  const limit = Math.min(100, parseInt(req.query.limit) || 50);

  const { data, error } = await supabase
    .from('rankings')
    .select('total_score, total_correct, total_questions, games_played, accuracy, user_id')
    .eq('category', category)
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  const userIds = (data || []).map(r => r.user_id);
  let namesMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, level, xp, avatar_url')
      .in('id', userIds);
    (profiles || []).forEach(p => { namesMap[p.id] = p; });
  }

  const enriched = (data || []).map((row, i) => ({
    rank: i + 1,
    ...row,
    username: namesMap[row.user_id]?.username || namesMap[row.user_id]?.display_name || 'Foydalanuvchi',
    display_name: namesMap[row.user_id]?.display_name || null,
    level: namesMap[row.user_id]?.level || 1,
    xp: namesMap[row.user_id]?.xp || 0,
    avatar_url: namesMap[row.user_id]?.avatar_url || null,
  }));

  res.json({ category, rankings: enriched });
});

app.get('/api/rankings/me/:category', authMiddleware, async (req, res) => {
  const { category } = req.params;

  const { data, error } = await supabase
    .from('rankings')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('category', category)
    .single();

  if (error || !data) return res.json({ rank: null, data: null });

  const { count } = await supabase
    .from('rankings')
    .select('*', { count: 'exact', head: true })
    .eq('category', category)
    .gt('total_score', data.total_score);

  res.json({ rank: (count || 0) + 1, total_users: (count || 0) + 1, data });
});

// ============================================
// QUIZ SESSION ROUTES
// ============================================

const generateSessionCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

app.post('/api/session', async (req, res) => {
  const { quiz_id, mode } = req.body;
  if (!quiz_id) return res.status(400).json({ error: 'quiz_id kerak' });

  let code, exists = true;
  while (exists) {
    code = generateSessionCode();
    const { data } = await supabase
      .from('sessions').select('id').eq('code', code).single();
    exists = !!data;
  }

  const { data: quizData } = await supabase
    .from('quizzes').select('category, mode').eq('id', quiz_id).single();

  const finalMode = mode || quizData?.mode || 'classic';

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({ quiz_id, code, status: 'waiting', current_question: 0, mode: finalMode })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  const { data: questions } = await supabase
    .from('questions').select('*').eq('quiz_id', quiz_id).order('order_num');

  activeSessions[code] = {
    session_id: session.id,
    quiz_id,
    code,
    status: 'waiting',
    category: quizData?.category || 'general',
    current_question: 0,
    questions: questions || [],
    mode: finalMode,
    eliminated: {},
    players: {},
    answer_stats: {},
    timer: null,
    timeLeft: 20,
    revealed: false
  };

  res.json({ code, session_id: session.id });
});

app.get('/api/session/:code', async (req, res) => {
  const { code } = req.params;
  const session = activeSessions[code];
  if (session) {
    return res.json({
      code,
      status: session.status,
      players_count: Object.keys(session.players).length
    });
  }
  const { data, error } = await supabase
    .from('sessions').select('status').eq('code', code).single();
  if (error || !data) return res.status(404).json({ error: 'Sessiya topilmadi' });
  res.json({ code, status: data.status, players_count: 0 });
});

app.get('/api/session/:code/results', async (req, res) => {
  const { code } = req.params;
  const { data: session } = await supabase
    .from('sessions').select('id').eq('code', code).single();
  if (!session) return res.status(404).json({ error: 'Sessiya topilmadi' });

  const { data: players } = await supabase
    .from('players')
    .select('name, score, correct_count')
    .eq('session_id', session.id)
    .order('score', { ascending: false });
  res.json(players || []);
});

// ===== GEMINI AI =====
app.post('/api/ai/generate', async (req, res) => {
  const { text, imageBase64, count = 10 } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Gemini API key yo'q" });
  if (!text && !imageBase64)
    return res.status(400).json({ error: "Matn yoki rasm kerak" });

  const clampedCount = Math.min(20, Math.max(3, parseInt(count) || 10));

  const prompt = `Sen o'zbek tili bilimdon o'qituvchisan. Quyidagi matn asosida ${clampedCount} ta test savoli tuz.
Har bir savolda 4 ta variant bo'lsin, faqat bittasi to'g'ri.
FAQAT JSON qaytargil, markdown ham yozma, boshqa hech narsa qo'shma.
Format: [{"question":"...","options":["...","...","...","..."],"correct":0}]
Correct: to'g'ri javobning 0-based indexi (0,1,2 yoki 3).
Matn: ${(text || '').substring(0, 4000)}`;

  try {
    let requestBody;
    if (imageBase64) {
      requestBody = {
        contents: [{
          parts: [
            {
              text: `Rasmda ko'rsatilgan matn asosida ${clampedCount} ta test savoli tuz.
FAQAT JSON qaytargil: [{"question":"...","options":["...","...","...","..."],"correct":0}]`
            },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      };
    } else {
      requestBody = { contents: [{ parts: [{ text: prompt }] }] };
    }

    const bodyStr = JSON.stringify(requestBody);
    const modelName = 'gemini-3.5-flash';

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const geminiReq = https.request(options, (geminiRes) => {
      let data = '';
      geminiRes.on('data', chunk => data += chunk);
      geminiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            console.error('Gemini API error:', parsed.error);
            return res.status(500).json({ error: parsed.error.message || 'Gemini xatolik' });
          }

          const rawText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const clean = rawText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

          const jsonMatch = clean.match(/\[[\s\S]*\]/);
          if (!jsonMatch) throw new Error('JSON topilmadi');

          const questions = JSON.parse(jsonMatch[0]);
          const valid = questions.filter(q =>
            q.question && Array.isArray(q.options) &&
            q.options.length === 4 &&
            typeof q.correct === 'number' &&
            q.correct >= 0 && q.correct <= 3
          );

          if (valid.length === 0) throw new Error("Yaroqli savollar yo'q");
          res.json({ questions: valid });
        } catch (e) {
          console.error('Gemini parse error:', e.message);
          res.status(500).json({ error: "AI javobini o'qib bo'lmadi" });
        }
      });
    });

    geminiReq.on('error', (e) => {
      console.error('Gemini request error:', e);
      res.status(500).json({ error: "Gemini bilan bog'lanishda xatolik" });
    });

    geminiReq.setTimeout(30000, () => {
      geminiReq.destroy();
      res.status(504).json({ error: 'Gemini timeout (30s)' });
    });

    geminiReq.write(bodyStr);
    geminiReq.end();
  } catch (e) {
    console.error('Gemini error:', e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ===== SOCKET.IO =====

io.on('connection', (socket) => {
  console.log('Ulanish:', socket.id);

  socket.on('teacher:join', ({ code }) => {
    const session = activeSessions[code];
    if (!session) return socket.emit('error', 'Sessiya topilmadi');
    socket.join(`session:${code}`);
    socket.join(`teacher:${code}`);
    session.teacherSocket = socket.id;
    socket.emit('teacher:joined', {
      code,
      questions_count: session.questions.length,
      players: Object.values(session.players)
    });
  });

  socket.on('player:join', async ({ code, name }) => {
    const session = activeSessions[code];
    if (!session) return socket.emit('error', "Noto'g'ri kod");
    if (session.status !== 'waiting')
      return socket.emit('error', "O'yin allaqachon boshlangan");
    if (!name || name.trim().length === 0)
      return socket.emit('error', 'Ism kerak');

    const nameExists = Object.values(session.players).some(
      p => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (nameExists)
      return socket.emit('error', 'Bu ism band, boshqa ism tanlang');

    const { data: player, error } = await supabase
      .from('players')
      .insert({ session_id: session.session_id, name: name.trim(), score: 0, correct_count: 0 })
      .select().single();
    if (error) return socket.emit('error', 'Kirishda xatolik');

    session.players[socket.id] = {
      id: player.id,
      name: name.trim(),
      score: 0,
      correct: 0,
      socket_id: socket.id,
      answered: false,
      last_answer: null,
      user_id: null,
      join_time: Date.now()
    };

    socket.join(`session:${code}`);
    socket.data.code = code;
    socket.data.player_id = player.id;

    socket.emit('player:joined', { name: name.trim(), player_id: player.id });
    io.to(`teacher:${code}`).emit('player:new', {
      name: name.trim(),
      count: Object.keys(session.players).length
    });
  });

  socket.on('teacher:start', async ({ code }) => {
    const session = activeSessions[code];
    if (!session) return;
    if (Object.keys(session.players).length === 0)
      return socket.emit('error', "Hech kim ulanmagan");
    session.status = 'playing';
    await supabase.from('sessions').update({ status: 'playing' }).eq('code', code);
    sendQuestion(code);
  });

  socket.on('player:answer', async ({ code, answer_index }) => {
    const session = activeSessions[code];
    if (!session || session.status !== 'playing') return;

    const player = session.players[socket.id];
    if (!player || player.answered) return;
    if (session.eliminated?.[socket.id]) return;

    const qIndex = session.current_question;
    const q = session.questions[qIndex];
    if (!q) return;

    player.answered = true;
    player.last_answer = answer_index;

    if (!session.answer_stats[qIndex]) session.answer_stats[qIndex] = [0, 0, 0, 0];
    if (answer_index >= 0 && answer_index <= 3)
      session.answer_stats[qIndex][answer_index]++;

    const is_correct = answer_index === q.correct_index;
    const time_taken = 20 - (session.timeLeft || 0);
    const points = is_correct
      ? Math.max(100, Math.floor(((session.timeLeft || 0) / 20) * 1000))
      : 0;

    if (is_correct) {
      player.score += points;
      player.correct++;
    }

    try {
      await supabase.from('answers').insert({
        session_id: session.session_id,
        player_id: player.id,
        question_index: qIndex,
        selected_index: answer_index,
        is_correct,
        time_taken,
        points
      });
      await supabase.from('players')
        .update({ score: player.score, correct_count: player.correct })
        .eq('id', player.id);
    } catch (e) {
      console.error('DB write error (non-fatal):', e.message);
    }

    socket.emit('player:answer_result', {
      is_correct,
      points,
      total_score: player.score,
      correct_index: is_correct ? q.correct_index : null
    });

    if (session.mode === 'survival' && !is_correct) {
      session.eliminated[socket.id] = true;
      socket.emit('player:eliminated', {
        name: player.name,
        score: player.score,
        rank: Object.keys(session.eliminated).length
      });

      const alivePlayers = Object.values(session.players)
        .filter(p => !session.eliminated[p.socket_id]);

      io.to(`teacher:${code}`).emit('survival:alive_update', {
        alive: alivePlayers.length,
        total: Object.keys(session.players).length,
        eliminated_name: player.name
      });

      if (alivePlayers.length <= 1) {
        clearInterval(session.timer);
        setTimeout(() => endGame(code), 2000);
        return;
      }
    }

    const answered = Object.values(session.players).filter(p => p.answered).length;
    const total = Object.keys(session.players).length;
    io.to(`teacher:${code}`).emit('teacher:answers_update', { answered, total });

    if (answered >= total) {
      clearInterval(session.timer);
      revealAnswer(code);
    }
  });

  socket.on('teacher:reveal', ({ code }) => {
    const session = activeSessions[code];
    if (!session) return;
    clearInterval(session.timer);
    revealAnswer(code);
  });

  socket.on('teacher:next', ({ code }) => {
    const session = activeSessions[code];
    if (!session) return;
    session.current_question++;
    if (session.current_question >= session.questions.length) {
      endGame(code);
    } else {
      sendQuestion(code);
    }
  });

  socket.on('teacher:end', ({ code }) => {
    const session = activeSessions[code];
    if (!session) return;
    clearInterval(session.timer);
    endGame(code);
  });

  socket.on('disconnect', () => {
    const code = socket.data.code;
    if (code && activeSessions[code]) {
      const session = activeSessions[code];
      if (session.players[socket.id]) {
        const name = session.players[socket.id].name;
        delete session.players[socket.id];
        io.to(`teacher:${code}`).emit('player:left', {
          name,
          count: Object.keys(session.players).length
        });
      }
    }
  });
});

// ===== HELPER FUNCTIONS =====

function sendQuestion(code) {
  const session = activeSessions[code];
  if (!session) return;

  const q = session.questions[session.current_question];
  if (!q) return endGame(code);

  Object.values(session.players).forEach(p => {
    p.answered = !!session.eliminated[p.socket_id];
    p.last_answer = null;
  });

  session.revealed = false;
  session.timeLeft = 20;

  io.to(`teacher:${code}`).emit('game:question', {
    index: session.current_question,
    total: session.questions.length,
    question: q.question,
    options: q.options,
    time: 20,
    category: session.category || 'general',
    mode: session.mode || 'classic'
  });

  Object.entries(session.players).forEach(([sid, player]) => {
    if (!session.eliminated[sid]) {
      io.to(sid).emit('game:question', {
        index: session.current_question,
        total: session.questions.length,
        question: q.question,
        options: q.options,
        time: 20,
        category: session.category || 'general',
        mode: session.mode || 'classic'
      });
    }
  });

  clearInterval(session.timer);
  session.timer = setInterval(() => {
    session.timeLeft--;
    io.to(`session:${code}`).emit('game:timer', { time: session.timeLeft });

    if (session.timeLeft <= 0) {
      clearInterval(session.timer);
      revealAnswer(code);
    }
  }, 1000);
}

function revealAnswer(code) {
  const session = activeSessions[code];
  if (!session || session.revealed) return;
  session.revealed = true;

  const q = session.questions[session.current_question];
  if (!q) return;

  if (session.mode === 'survival') {
    Object.entries(session.players).forEach(([sid, player]) => {
      if (!player.answered && !session.eliminated[sid]) {
        session.eliminated[sid] = true;
        io.to(sid).emit('player:eliminated', {
          name: player.name,
          score: player.score,
          rank: Object.keys(session.eliminated).length
        });
      }
    });
  }

  io.to(`session:${code}`).emit('game:reveal', {
    correct_index: q.correct_index,
    category: session.category,
    stats: session.answer_stats[session.current_question] || [0, 0, 0, 0]
  });

  const ranking = Object.values(session.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      score: p.score,
      correct: p.correct,
      eliminated: !!session.eliminated[p.socket_id]
    }));

  io.to(`session:${code}`).emit('game:ranking', { ranking });

  setTimeout(() => {
    const sess = activeSessions[code];
    if (!sess || sess.status !== 'playing') return;
    sess.current_question++;
    if (sess.current_question >= sess.questions.length) {
      endGame(code);
    } else {
      sendQuestion(code);
    }
  }, 4000);
}

async function endGame(code) {
  const session = activeSessions[code];
  if (!session) return;

  session.status = 'ended';
  clearInterval(session.timer);

  try {
    await supabase.from('sessions')
      .update({ status: 'ended' }).eq('code', code);
  } catch (e) {
    console.error('Session update error:', e.message);
  }

  let champion = null;
  if (session.mode === 'survival') {
    const survivors = Object.values(session.players)
      .filter(p => !session.eliminated[p.socket_id]);
    champion = survivors.length > 0
      ? survivors[0]
      : Object.values(session.players).sort((a, b) => b.score - a.score)[0];
  }

  const leaderboard = Object.values(session.players)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      score: p.score,
      correct: p.correct,
      total: session.questions.length
    }));

  await updateRankings(code);

  io.to(`session:${code}`).emit('game:end', {
    leaderboard,
    mode: session.mode,
    champion: champion ? { name: champion.name, score: champion.score } : null
  });

  setTimeout(() => {
    delete activeSessions[code];
    console.log(`Sessiya ${code} xotiradan o'chirildi`);
  }, 3600000);

  console.log(`O'yin ${code} tugadi, ${leaderboard.length} o'yinchi`);
}

async function updateRankings(code) {
  const session = activeSessions[code];
  if (!session) return;

  for (const player of Object.values(session.players)) {
    if (!player.user_id) continue;

    const category = session.category || 'general';
    const accuracy = session.questions.length > 0
      ? Math.round((player.correct / session.questions.length) * 100)
      : 0;

    try {
      const { data: existing } = await supabase
        .from('rankings')
        .select('*')
        .eq('user_id', player.user_id)
        .eq('category', category)
        .single();

      if (existing) {
        const newTotal = existing.total_questions + session.questions.length;
        const newCorrect = existing.total_correct + player.correct;
        await supabase.from('rankings').update({
          total_score: existing.total_score + player.score,
          total_correct: newCorrect,
          total_questions: newTotal,
          games_played: existing.games_played + 1,
          accuracy: newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0,
          updated_at: new Date().toISOString()
        }).eq('user_id', player.user_id).eq('category', category);
      } else {
        await supabase.from('rankings').insert({
          user_id: player.user_id,
          category,
          total_score: player.score,
          total_correct: player.correct,
          total_questions: session.questions.length,
          games_played: 1,
          accuracy
        });
      }
    } catch (e) {
      console.error('Ranking update error:', e.message);
    }
  }
}

// ============================================
if (process.env.NODE_ENV === 'production') {
  app.get(/.*/, (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
    }
  });
}

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== SERVER START =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Quizok server: http://localhost:${PORT}`);
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? 'Ulangan ✅' : "URL yo'q ❌"}`);
  console.log(`🔑 Supabase service role key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded ✅' : 'Not loaded ❌'}`);
  console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? 'Ulangan ✅' : "API key yo'q ❌"}`);
});