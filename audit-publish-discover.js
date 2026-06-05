require('dotenv').config();
const fetch = global.fetch || require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const env = process.env;
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
(async () => {
  try {
    const email = `qa-test-${Date.now()}@example.com`;
    const password = 'Test123!';
    const name = 'QA Test User';
    console.log('TEST USER', email);

    const registerRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const registerData = await registerRes.json();
    console.log('register', registerRes.status, registerData);

    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    console.log('login', loginRes.status, loginData);
    if (!loginData.token) throw new Error('Login failed');
    const token = loginData.token;

    const createPayload = {
      title: 'QA Discover Flow Quiz',
      category: 'science',
      mode: 'classic',
      questions: [
        { question: 'What is 2+2?', options: ['3','4','5','6'], correct: 1 },
        { question: 'What planet is known as the Red Planet?', options: ['Earth','Venus','Mars','Jupiter'], correct: 2 }
      ]
    };
    const createRes = await fetch('http://localhost:3000/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(createPayload)
    });
    const createData = await createRes.json();
    console.log('create quiz', createRes.status, createData);
    const quizId = createData.quiz_id;
    if (!quizId) throw new Error('Quiz creation failed');

    const publishRes = await fetch(`http://localhost:3000/api/quiz/${quizId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const publishData = await publishRes.json();
    console.log('publish quiz', publishRes.status, publishData);

    const discoverRes = await fetch('http://localhost:3000/api/discover');
    const discoverData = await discoverRes.json();
    console.log('discover', discoverRes.status, { count: (discoverData.quizzes || []).length });
    const found = (discoverData.quizzes || []).find((q) => q.id === quizId);
    console.log('discover contains quiz id?', !!found, found && { title: found.title, is_published: found.is_published, category: found.category });

    const quizRes = await fetch(`http://localhost:3000/api/quiz/${quizId}`);
    const quizData = await quizRes.json();
    console.log('fetch quiz', quizRes.status, { id: quizData.id, title: quizData.title, is_published: quizData.is_published });

    const questionsRes = await fetch(`http://localhost:3000/api/quiz/${quizId}/questions`);
    const questionsData = await questionsRes.json();
    console.log('fetch questions', questionsRes.status, (questionsData.questions || []).length, (questionsData.questions || []).map((q) => ({ question: q.question, correctIndex: q.correctIndex })));

    const dbQuiz = await supabase.from('quizzes').select('id,title,category,is_published,published_at,teacher_id').eq('id', quizId).single();
    console.log('db quiz row', dbQuiz.error, dbQuiz.data);
    const dbQuestions = await supabase.from('questions').select('id,quiz_id,question,options,correct_index').eq('quiz_id', quizId);
    console.log('db questions count', dbQuestions.error, dbQuestions.data.length);

    console.log('--- END ---');
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();
