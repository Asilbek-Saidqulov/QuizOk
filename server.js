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
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
 
app.use(cors());
app.use(express.json());          // express.json() auth routerdan OLDIN bo'lishi shart
app.use('/api/auth', authRouter);
app.use(express.static(path.join(__dirname, 'public')));
 
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
 
// Xotirada sessiyalar (real-time uchun)
const activeSessions = {};
 
// ===== REST API =====
 
// Barcha quizlarni olish
app.get('/api/quizzes', async (req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, created_at')
    .order('created_at', { ascending: false });
 
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
 
// Bitta quizni savollar bilan olish
app.get('/api/quiz/:id', async (req, res) => {
  const { id } = req.params;
 
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();
 
  if (quizError) return res.status(404).json({ error: 'Quiz topilmadi' });
 
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', id)
    .order('order_num');
 
  if (qError) return res.status(500).json({ error: qError.message });
 
  res.json({ ...quiz, questions });
});
 
// Yangi quiz yaratish
app.post('/api/quiz', authMiddleware, async (req, res) => {
  const { title, questions } = req.body;
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Title va savollar kerak' });
  }
 
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({ title, teacher_id: req.user.id })
    .select()
    .single();
 
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
 
// Mening quizlarim
app.get('/api/my-quizzes', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, created_at')
    .eq('teacher_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const result = await Promise.all(data.map(async (q) => {
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', q.id);
    return { ...q, quiz_id: q.id, question_count: count || 0 };
  }));

  res.json(result);
});

// Statistika
app.get('/api/stats', authMiddleware, async (req, res) => {
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id')
    .eq('teacher_id', req.user.id);

  const quizIds = (quizzes || []).map(q => q.id);

  let totalGames = 0;
  let totalPlayers = 0;

  if (quizIds.length > 0) {
    const { count: gamesCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .in('quiz_id', quizIds);

    totalGames = gamesCount || 0;

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .in('quiz_id', quizIds);

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
  if (quiz.teacher_id !== req.user.id) return res.status(403).json({ error: 'Ruxsat yo\'q' });
  // Avval bog'liq ma'lumotlarni o'chirish
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
  const { title, questions } = req.body;

  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Title va savollar kerak' });
  }

  const { error: titleError } = await supabase
    .from('quizzes')
    .update({ title })
    .eq('id', id)
    .eq('teacher_id', req.user.id);

  if (titleError) return res.status(500).json({ error: titleError.message });

  // Eski savollarni o'chirib, yangisini yozamiz
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

// Sessiya ochish
app.post('/api/session', async (req, res) => {
  const { quiz_id } = req.body;
  if (!quiz_id) return res.status(400).json({ error: 'quiz_id kerak' });
 
  // 6 xonali unikal kod
  let code;
  let exists = true;
  while (exists) {
    code = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await supabase.from('sessions').select('id').eq('code', code).single();
    exists = !!data;
  }
 
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({ quiz_id, code, status: 'waiting', current_question: 0 })
    .select()
    .single();
 
  if (error) return res.status(500).json({ error: error.message });
 
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', quiz_id)
    .order('order_num');
 
  activeSessions[code] = {
    session_id: session.id,
    quiz_id,
    code,
    status: 'waiting',
    current_question: 0,
    questions: questions || [],
    players: {},
    // answer_stats[questionIndex][optionIndex] = count
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
  if (!session) return res.status(404).json({ error: 'Sessiya topilmadi' });
  res.json({
    code,
    status: session.status,
    players_count: Object.keys(session.players).length
  });
});
 
// Sessiya natijalari
app.get('/api/session/:code/results', async (req, res) => {
  const { code } = req.params;
 
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('code', code)
    .single();
 
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
 
  // O'qituvchi sessiya ochadi
  socket.on('teacher:join', ({ code }) => {
    const session = activeSessions[code];
    if (!session) return socket.emit('teacher:error', 'Sessiya topilmadi');
 
    socket.join(`session:${code}`);
    socket.join(`teacher:${code}`);
    session.teacherSocket = socket.id;
 
    socket.emit('teacher:joined', {
      code,
      questions_count: session.questions.length,
      players: Object.values(session.players)
    });
    console.log(`O'qituvchi ${code} sessiyaga kirdi`);
  });
 
  // O'quvchi kiradi
  socket.on('player:join', async ({ code, name }) => {
    const session = activeSessions[code];
    if (!session) return socket.emit('player:error', "Noto'g'ri kod");
    if (session.status !== 'waiting') return socket.emit('player:error', "O'yin boshlangan");
    if (!name || name.trim().length === 0) return socket.emit('player:error', 'Ism kerak');
 
    // Bir xil ism tekshirish
    const nameExists = Object.values(session.players).some(
      p => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (nameExists) return socket.emit('player:error', 'Bu ism band, boshqa ism tanlang');
 
    const { data: player, error } = await supabase
      .from('players')
      .insert({ session_id: session.session_id, name: name.trim(), score: 0, correct_count: 0 })
      .select()
      .single();
 
    if (error) return socket.emit('player:error', 'Kirishda xatolik');
 
    session.players[socket.id] = {
      id: player.id,
      name: name.trim(),
      score: 0,
      correct: 0,
      socket_id: socket.id,
      answered: false,
      last_answer: null
    };
 
    socket.join(`session:${code}`);
    socket.data.code = code;
    socket.data.player_id = player.id;
 
    socket.emit('player:joined', { name: name.trim(), player_id: player.id });
 
    io.to(`teacher:${code}`).emit('player:new', {
      name: name.trim(),
      count: Object.keys(session.players).length
    });
 
    console.log(`${name} ${code} sessiyaga kirdi`);
  });
 
  // O'qituvchi o'yinni boshlaydi
  socket.on('teacher:start', async ({ code }) => {
    const session = activeSessions[code];
    if (!session) return;
    if (Object.keys(session.players).length === 0) {
      return socket.emit('teacher:error', "Hech kim ulanmagan");
    }
 
    session.status = 'playing';
    await supabase.from('sessions').update({ status: 'playing' }).eq('code', code);
 
    sendQuestion(code);
  });
 
  // O'quvchi javob beradi
  socket.on('player:answer', async ({ code, answer_index }) => {
    const session = activeSessions[code];
    if (!session || session.status !== 'playing') return;
 
    const player = session.players[socket.id];
    if (!player || player.answered) return;
 
    const qIndex = session.current_question;
    const q = session.questions[qIndex];
    if (!q || answer_index < 0 || answer_index >= q.options.length) return;
 
    player.answered = true;
    player.last_answer = answer_index;
 
    // Statistika yangilash
    if (!session.answer_stats[qIndex]) session.answer_stats[qIndex] = [0, 0, 0, 0];
    session.answer_stats[qIndex][answer_index]++;
    const is_correct = answer_index === q.correct_index;
    const time_taken = 20 - session.timeLeft;
    const points = is_correct ? Math.max(100, Math.floor((session.timeLeft / 20) * 1000)) : 0;
 
    if (is_correct) {
      player.score += points;
      player.correct++;
    }
 
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
 
    socket.emit('player:answer_result', {
      is_correct,
      points,
      total_score: player.score
    });
 
    const answered = Object.values(session.players).filter(p => p.answered).length;
    const total = Object.keys(session.players).length;
 
    io.to(`teacher:${code}`).emit('teacher:answers_update', { answered, total });
 
    if (answered === total) {
      clearInterval(session.timer);
      revealAnswer(code);
    }
  });
 
  // O'qituvchi javobni ko'rsatadi
  socket.on('teacher:reveal', ({ code }) => {
    const session = activeSessions[code];
    if (!session) return;
    clearInterval(session.timer);
    revealAnswer(code);
  });
 
  // Keyingi savol
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
 
  // Uzilish
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
    console.log('Uzildi:', socket.id);
  });
  
  // O'qituvchi sessiyani tugatadi
  socket.on('teacher:end', ({ code }) => {
    const session = activeSessions[code];
    if (!session) return;
    endGame(code);
});
});


// ===== HELPER FUNCTIONS =====
 
function sendQuestion(code) {
  const session = activeSessions[code];
  if (!session) return;

  const q = session.questions[session.current_question];

  if (!q) {
    return endGame(code);
  }

  Object.values(session.players).forEach(p => {
    p.answered = false;
    p.last_answer = null;
  });

  session.revealed = false;
  session.timeLeft = 20;

  const total = session.questions.length;

  io.to(`session:${code}`).emit('game:question', {
    index: session.current_question,
    total,
    question: q.question,
    options: q.options,
    time: 20
  });

  session.timer = setInterval(() => {
    session.timeLeft--;

    io.to(`session:${code}`).emit('game:timer', {
      time: session.timeLeft
    });

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
 
  const qIndex = session.current_question;
  const q = session.questions[qIndex];
  if (!q) return;
 
  // Har bir variant necha marta tanlangani
  const stats = session.answer_stats[qIndex] || [0, 0, 0, 0];
 
  // Top 5 leaderboard
  const leaderboard = Object.values(session.players)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
 
  io.to(`session:${code}`).emit('game:reveal', {
    correct_index: q.correct_index,
    stats,               // [12, 3, 8, 1] — har variant necha kishi tanlagan
    leaderboard,
    is_last: qIndex === session.questions.length - 1
  });
}
 
function endGame(code) {
  const session = activeSessions[code];
  if (!session) return;
 
  session.status = 'ended';
  supabase.from('sessions').update({ status: 'ended' }).eq('code', code);
 
  const leaderboard = Object.values(session.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      score: p.score,
      correct: p.correct,
      total: session.questions.length
    }));
 
  io.to(`session:${code}`).emit('game:end', { leaderboard });
 
  // 1 soatdan keyin xotiradan o'chirish
  setTimeout(() => {
    delete activeSessions[code];
    console.log(`Sessiya ${code} xotiradan o'chirildi`);
  }, 3600000);
 
  console.log(`O'yin ${code} tugadi`);
}

// ===== USER PASSWORD =====
app.patch('/api/user/password', authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Parollarni kiriting' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgi' });
  }

  try {
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    // Avval eski parol bilan login qilib tekshiramiz
    const tempClient = createSupabaseClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    const { error: signInError } = await tempClient.auth.signInWithPassword({
      email: req.user.email,
      password: old_password
    });
    if (signInError) {
      return res.status(401).json({ error: "Joriy parol noto'g'ri" });
    }

    // Parolni yangilash
    const { error: updateError } = await supabase.auth.admin
      ? await supabase.auth.admin.updateUserById(req.user.id, { password: new_password })
      : { error: { message: 'Admin API mavjud emas' } };

    if (updateError) {
      // Fallback: user o'zi update qilsin
      const { error: userUpdateError } = await tempClient.auth.updateUser({
        password: new_password
      });
      if (userUpdateError) return res.status(500).json({ error: userUpdateError.message });
    }

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
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key yo\'q' });

  const prompt = `Sen o'zbek tili bilimdon o'qituvchisan. Quyidagi matn asosida ${count} ta test savoli tuz. 
Har bir savolda 4 ta variant bo'lsin (A, B, C, D), faqat bittasi to'g'ri.
FAQAT JSON qaytargil, boshqa hech narsa yozma, markdown ham yozma.
Format: [{"question":"...","options":["...","...","...","..."],"correct":0}]
Matn: ${(text || '').substring(0, 4000)}`;

  try {
    let requestBody;

    if (imageBase64) {
      requestBody = {
        contents: [{
          parts: [
            { text: `Rasmda ko'rsatilgan matn asosida ${count} ta test savoli tuz. FAQAT JSON: [{"question":"...","options":["...","...","...","..."],"correct":0}]` },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      };
    } else {
      requestBody = {
        contents: [{ parts: [{ text: prompt }] }]
      };
    }

    const bodyStr = JSON.stringify(requestBody);

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.5-flash:generateContent`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,          // ← o'zgartiring
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const geminiReq = https.request(options, (geminiRes) => {
      let data = '';
      geminiRes.on('data', chunk => data += chunk);
      geminiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rawText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const clean = rawText.replace(/```json|```/g, '').trim();
          const questions = JSON.parse(clean);
          res.json({ questions });
        } catch (e) {
          console.error('Gemini parse error:', e, data);
          res.status(500).json({ error: 'AI javobini o\'qib bo\'lmadi' });
        }
      });
    });

    geminiReq.on('error', (e) => {
      console.error('Gemini request error:', e);
      res.status(500).json({ error: 'Gemini bilan bog\'lanishda xatolik' });
    });

    geminiReq.write(bodyStr);
    geminiReq.end();

  } catch (e) {
    console.error('Gemini error:', e);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// ===== SERVER START =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Quizok server ishlamoqda: http://localhost:${PORT}`);
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? 'Ulangan ✅' : 'URL yo\'q ❌'}`);
});