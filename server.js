const path = require('path');
const https = require('https');

require('dotenv').config({
  path: path.resolve(__dirname, '.env')
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Xotirada sessiyalar
const activeSessions = {};

// ===== REST API =====

// Barcha quizlarni olish
app.get('/api/quizzes', async (req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, category, created_at')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Bitta quizni savollar bilan olish
app.get('/api/quiz/:id', async (req, res) => {
  const { id } = req.params;
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes').select('*').eq('id', id).single();
  if (quizError) return res.status(404).json({ error: 'Quiz topilmadi' });

  const { data: questions, error: qError } = await supabase
    .from('questions').select('*').eq('quiz_id', id).order('order_num');
  if (qError) return res.status(500).json({ error: qError.message });

  res.json({ ...quiz, questions });
});

// Yangi quiz yaratish
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
      teacher_id: req.user.id
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

// Mening quizlarim — FIX: category va play_count qo'shildi
app.get('/api/my-quizzes', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, category, mode, created_at')
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
      play_count: playCount || 0
    };
  }));

  res.json(result);
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

// Quiz o'chirish
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

// Quiz tahrirlash
app.put('/api/quiz/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, questions, category, mode } = req.body;
  if (!title || !questions || questions.length === 0)
    return res.status(400).json({ error: 'Title va savollar kerak' });

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

// Sessiya ochish — FIX: mode ni quiz dan ham oladi
app.post('/api/session', async (req, res) => {
  const { quiz_id, mode } = req.body;
  if (!quiz_id) return res.status(400).json({ error: 'quiz_id kerak' });

  let code, exists = true;
  while (exists) {
    code = String(Math.floor(100000 + Math.random() * 900000));
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

// Sessiya tekshirish
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
  // Memory da yo'q bo'lsa DB dan tekshir
  const { data, error } = await supabase
    .from('sessions').select('status').eq('code', code).single();
  if (error || !data) return res.status(404).json({ error: 'Sessiya topilmadi' });
  res.json({ code, status: data.status, players_count: 0 });
});

// Sessiya natijalari
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

  // FIX: time_taken hisoblash qo'shildi
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
    // FIX: time_taken to'g'ri hisoblanadi
    const time_taken = 20 - (session.timeLeft || 0);
    const points = is_correct
      ? Math.max(100, Math.floor(((session.timeLeft || 0) / 20) * 1000))
      : 0;

    if (is_correct) {
      player.score += points;
      player.correct++;
    }

    // DB ga yozish — xato bo'lsa ham o'yin davom etadi
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

    // Survival mode — xato = chiqib ketish
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

  socket.on('game:ranking', ({ ranking }) => {
    const list = document.getElementById('liveRankingList');
    if (!list) return;
  
    const medals = ['🥇', '🥈', '🥉'];
    list.innerHTML = ranking.map((p, i) => `
     <div class="lr-item ${p.eliminated ? 'eliminated' : ''}">
        <div class="lr-rank">${medals[i] || i + 1}</div>
        <div class="lr-name">${p.name}${p.eliminated ? ' 💀' : ''}</div>
        <div style="font-size:11px;color:var(--t3);margin-right:8px">
          ${p.correct} ✓
        </div>
        <div class="lr-score">${p.score}</div>
     </div>
    `).join('');
  });

});

// ===== HELPER FUNCTIONS =====

function sendQuestion(code) {
  const session = activeSessions[code];
  if (!session) return;

  const q = session.questions[session.current_question];
  if (!q) return endGame(code);

  // Reset answered state — faqat tirik o'yinchilar uchun
  Object.values(session.players).forEach(p => {
    if (session.eliminated?.[p.socket_id]) {
      p.answered = true; // eliminatedlar javob bera olmaydi
    } else {
      p.answered = false;
      p.last_answer = null;
    }
  });

  session.revealed = false;
  session.timeLeft = 20;

  io.to(`session:${code}`).emit('game:question', {
    index: session.current_question,
    total: session.questions.length,
    question: q.question,
    options: q.options,
    time: 20,
    category: session.category || 'general',
    mode: session.mode || 'classic'
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

  // Survival: javob bermaganlar ham chiqadi
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

  const stats = session.answer_stats[session.current_question] || [0, 0, 0, 0];

  io.to(`session:${code}`).emit('game:reveal', {
    correct_index: q.correct_index,
    category: session.category,
    stats
  });

  // === LIVE RANKING EMIT ===
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

  // === AUTO-NEXT: 4 soniyadan keyin ===
  setTimeout(() => {
    const sess = activeSessions[code];
    if (!sess || sess.status !== 'playing') return;
    
    sess.current_question++;
    if (sess.current_question >= sess.questions.length) {
      endGame(code);
    } else {
      sendQuestion(code);
    }
  }, 4000); // 4 soniya — o'qituvchi natijani ko'rsin
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
    .slice(0, 20) // max 20 ta ko'rsatish
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

  // 1 soatdan keyin xotiradan tozalash
  setTimeout(() => {
    delete activeSessions[code];
    console.log(`Sessiya ${code} xotiradan o'chirildi`);
  }, 3600000);

  console.log(`O'yin ${code} tugadi, ${leaderboard.length} o'yinchi`);
}

// ===== USER PASSWORD =====
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
    const modelName = 'gemini-3.5-flash'; // FIX: to'g'ri model nomi

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

          // Xatolik tekshirish
          if (parsed.error) {
            console.error('Gemini API error:', parsed.error);
            return res.status(500).json({ error: parsed.error.message || 'Gemini xatolik' });
          }

          const rawText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          // Markdown code block tozalash
          const clean = rawText
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

          // JSON topish (ba'zan tekst bilan keladigan holat)
          const jsonMatch = clean.match(/\[[\s\S]*\]/);
          if (!jsonMatch) throw new Error('JSON topilmadi');

          const questions = JSON.parse(jsonMatch[0]);

          // Validatsiya
          const valid = questions.filter(q =>
            q.question && Array.isArray(q.options) &&
            q.options.length === 4 &&
            typeof q.correct === 'number' &&
            q.correct >= 0 && q.correct <= 3
          );

          if (valid.length === 0) throw new Error('Yaroqli savollar yo\'q');

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

// ===== RANKING API =====
const CATEGORIES = ['general', 'math', 'science', 'history', 'business', 'ielts', 'language'];

// FIX: admin.getUserById ishlatilmaydi — profiles table ishlatiladi
async function getUserName(userId) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();
    return data?.name || 'Foydalanuvchi';
  } catch {
    return 'Foydalanuvchi';
  }
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

// Global ranking olish — FIX: profiles table dan nom olish
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

  // Nomlarni batch olish
  const userIds = (data || []).map(r => r.user_id);
  let namesMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
    (profiles || []).forEach(p => { namesMap[p.id] = p.name; });
  }

  const enriched = (data || []).map((row, i) => ({
    ...row,
    rank: i + 1,
    name: namesMap[row.user_id] || 'Foydalanuvchi'
  }));

  res.json(enriched);
});

// O'z rankingi
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

  res.json({ rank: (count || 0) + 1, data });
});

// ===== SERVER START =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Quizok server: http://localhost:${PORT}`);
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? 'Ulangan ✅' : "URL yo'q ❌"}`);
  console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? 'Ulangan ✅' : "API key yo'q ❌"}`);
});