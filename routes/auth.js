require('dotenv').config({
  path: require('path').join(__dirname, '../.env')
});

const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

console.log('AUTH SECRET:', JWT_SECRET);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email va parol kerak' });
    }
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Ism kerak' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgi bo'lishi kerak" });
    }

    // Supabase Auth ga ro'yxatdan o'tkazish (name metadata sifatida)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim() }
      }
    });

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      success: true,
      message: "Ro'yxatdan muvaffaqiyatli o'tdingiz"
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email va parol kerak'
      });
    }

    // Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data?.user) {
      console.error('Supabase login error:', error);

      return res.status(401).json({
        error: "Email yoki parol noto'g'ri"
      });
    }

    console.log('JWT_SECRET:', JWT_SECRET);

    // JWT token yaratish
    const token = jwt.sign(
      {
        id: data.user.id,
        email: data.user.email,
        name:
          data.user.user_metadata?.name ||
          data.user.email.split('@')[0]
      },
      JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.json({
      success: true,
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name:
          data.user.user_metadata?.name ||
          data.user.email.split('@')[0]
      }
    });

  } catch (err) {
    console.error('Login error:', err);

    res.status(500).json({
      error: 'Server xatosi'
    });
  }
});

// TOKEN TEKSHIRISH (frontend yuklanganda)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token yo\'q' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      }
    });
  } catch (err) {
    res.status(401).json({ error: "Token yaroqsiz" });
  }
});

module.exports = router;