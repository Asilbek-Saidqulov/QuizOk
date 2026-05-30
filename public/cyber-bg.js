/**
 * QuizOk — Cyber Background
 * Web Audio API (sintetik piano) + matrix particles + BEAT animatsiyasi
 *
 * MUHIM: sound.js dan KEYIN ulang — QuizokSound.getCtx() ni ishlatadi
 *   <script src="sound.js"></script>
 *   <script src="cyber-bg.js"></script>
 *
 * Ishlatish:
 *   CyberBg.init({ canvasId: 'cyber-canvas', beatBarId: 'beat-bar' });
 *   CyberBg.startMusic();   // musiqa + animatsiya boshlaydi
 *   CyberBg.stopMusic();    // to'xtatadi
 *   CyberBg.onBeat = (strength) => { ... }  // har notada callback
 */

window.CyberBg = (() => {

  // ─── Sozlamalar ──────────────────────────────────────────────────────────
  const CONFIG = {
    bgColor:        'rgba(3, 13, 20, 0.88)',  // fon rangi
    streamColor:    [0, 220, 100],            // matrix oqim rangi (RGB)
    particleColors: [                          // uchuvchi belgilar ranglari
      'rgba(0,180,255,A)',
      'rgba(0,230,120,A)',
    ],
    gridColor:      'rgba(0, 80, 180, 0.055)',
    streamInterval: 22,   // px — oqimlar orasidagi masofa
    streamMinSpeed: 0.3,
    streamMaxSpeed: 0.8,
    particlesPerBeat: { min: 8, max: 18 },    // har bir notada nechta belgi
    symbols: '01{}[]()<>/;:=+*#@!?~^|ABCDEFabcdef0x∑∆∫αβγδ'.split(''),
  };

  // ─── Bach — Minuet in G (soddalashtilgan) ────────────────────────────────
  // Format: [nota_freq_hz, davomiyligi_ms]
  // Davomiylik: 400 = chorak nota, 800 = yarim nota, 200 = sakkizlik
  const MELODY = [
    [392,400],[330,200],[349,200],[392,200],[349,200],[330,200],
    [294,400],[294,200],[349,200],[392,200],[440,200],[392,200],
    [349,400],[294,200],[330,200],[349,200],[392,200],[349,200],
    [330,600],[392,400],[330,200],[294,200],[330,200],[262,200],
    [294,400],[330,200],[349,200],[392,200],[294,200],[330,200],
    [349,400],[392,200],[440,200],[494,200],[440,200],[392,200],
    [440,400],[392,200],[349,200],[392,200],[330,200],[262,200],
    [294,400],[262,200],[294,200],[330,200],[392,200],[349,200],
    [330,800],
  ];

  // ─── Ichki holat ─────────────────────────────────────────────────────────
  let canvas, ctx, W, H;
  let streams = [];
  let particles = [];
  let animFrameId = null;

  // QuizokSound bilan bitta AudioContext ishlatamiz — ikki marta ochilmaydi
  function getAudioCtx() {
    if (typeof QuizokSound !== 'undefined') return QuizokSound._getCtx();
    return null;
  }
  let melodyIndex = 0;
  let melodyTimeout = null;
  let isPlaying = false;
  let beatBarEl = null;
  let beatPhase = 0;

  // Tashqi callback — har notada chaqiriladi
  // strength: 0.0 – 1.0 (nota balandligiga qarab)
  let onBeat = null;

  // ─── Initsializatsiya ────────────────────────────────────────────────────
  function init({ canvasId, beatBarId }) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('CyberBg: canvas topilmadi:', canvasId); return; }
    ctx = canvas.getContext('2d');

    if (beatBarId) beatBarEl = document.getElementById(beatBarId);

    resize();
    window.addEventListener('resize', resize);
    buildStreams();
    loop();
  }

  function resize() {
    if (!canvas) return;
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildStreams();
  }

  // ─── Matrix oqimlari ─────────────────────────────────────────────────────
  function buildStreams() {
    streams = [];
    const cols = Math.floor(W / CONFIG.streamInterval);
    for (let i = 0; i < cols; i++) {
      streams.push({
        x:     i * CONFIG.streamInterval + CONFIG.streamInterval / 2,
        y:     Math.random() * H,
        speed: CONFIG.streamMinSpeed + Math.random() * (CONFIG.streamMaxSpeed - CONFIG.streamMinSpeed),
        alpha: 0.04 + Math.random() * 0.13,
        len:   4 + Math.floor(Math.random() * 8),
        chars: [],
      });
    }
  }

  // ─── Particles ───────────────────────────────────────────────────────────
  function spawnParticles(count) {
    const sym = CONFIG.symbols;
    const cols = CONFIG.particleColors;
    for (let i = 0; i < count; i++) {
      particles.push({
        x:     Math.random() * W,
        y:     Math.random() * H * 0.85 + H * 0.07,
        vx:    (Math.random() - 0.5) * 1.4,
        vy:    -(0.6 + Math.random() * 2.8),
        alpha: 1,
        decay: 0.012 + Math.random() * 0.02,
        sym:   sym[Math.floor(Math.random() * sym.length)],
        size:  10 + Math.random() * 9,
        color: cols[Math.floor(Math.random() * cols.length)],
      });
    }
  }

  // ─── Asosiy render loop ───────────────────────────────────────────────────
  function loop() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = CONFIG.gridColor;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Matrix oqimlari
    const sym = CONFIG.symbols;
    const [r, g, b] = CONFIG.streamColor;
    streams.forEach(s => {
      s.y += s.speed;
      if (s.y > H + 200) s.y = -40;
      const ch = sym[Math.floor(Math.random() * sym.length)];
      ctx.font = '11px monospace';
      for (let k = 0; k < s.len; k++) {
        const a = s.alpha * (1 - k / s.len);
        const bright = k === 0 ? 255 : g;
        const dim    = k === 0 ? 100 : 60;
        ctx.fillStyle = `rgba(${r},${bright},${dim},${a})`;
        ctx.fillText(s.chars[k] || ch, s.x, s.y - k * 14);
      }
      s.chars.unshift(ch);
      if (s.chars.length > s.len) s.chars.pop();
    });

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.alpha -= p.decay;
      if (p.alpha <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.alpha;
      ctx.font = `${Math.round(p.size)}px monospace`;
      ctx.fillStyle = p.color.replace('A', p.alpha.toFixed(2));
      ctx.fillText(p.sym, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    animFrameId = requestAnimationFrame(loop);
  }

  // ─── Web Audio API — sintetik piano ──────────────────────────────────────
  function playNote(freq, durationMs) {
    const ac = getAudioCtx();
    if (!ac) return;

    const osc    = ac.createOscillator();
    const gain   = ac.createGain();
    const filter = ac.createBiquadFilter();

    // Lo-fi yumshoq tovush
    filter.type            = 'lowpass';
    filter.frequency.value = 1800;

    osc.type = 'triangle';  // piano'ga yaqin tembr
    osc.frequency.value = freq;

    // Attack-Decay-Sustain-Release
    const now = ac.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.015);     // attack
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.1);  // decay
    gain.gain.setValueAtTime(0.08, now + durationMs / 1000 - 0.05);
    gain.gain.linearRampToValueAtTime(0.0001, now + durationMs / 1000 + 0.1); // release

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.15);

    // BEAT + particles trigger
    const strength = Math.min(1, (freq - 200) / 600); // 0–1: nota balandligiga qarab
    triggerBeat(strength);
  }

  // ─── BEAT animatsiyasi ───────────────────────────────────────────────────
  function triggerBeat(strength) {
    beatPhase = Math.min(10, beatPhase + 1 + Math.round(strength * 3));
    setTimeout(() => { beatPhase = Math.max(0, beatPhase - 2); }, 200);

    const cfg = CONFIG.particlesPerBeat;
    const count = cfg.min + Math.round(strength * (cfg.max - cfg.min));
    spawnParticles(count);

    if (beatBarEl) {
      const filled = Math.min(10, beatPhase);
      beatBarEl.textContent = 'BEAT ' + '█'.repeat(filled) + '░'.repeat(10 - filled);
    }

    if (typeof onBeat === 'function') onBeat(strength);
  }

  // ─── Melodiya loop ────────────────────────────────────────────────────────
  function scheduleNext() {
    if (!isPlaying) return;
    const [freq, dur] = MELODY[melodyIndex % MELODY.length];
    playNote(freq, dur);
    melodyIndex++;
    melodyTimeout = setTimeout(scheduleNext, dur + 40); // 40ms oraliq
  }

  // ─── Ommaviy API ─────────────────────────────────────────────────────────
  function startMusic() {
    if (isPlaying) return;
    const ac = getAudioCtx();
    if (ac && ac.state === 'suspended') ac.resume();
    isPlaying = true;
    melodyIndex = 0;
    scheduleNext();
  }

  function stopMusic() {
    isPlaying = false;
    clearTimeout(melodyTimeout);
  }

  function destroy() {
    stopMusic();
    cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', resize);
    // AudioContext ni yopmaymiz — QuizokSound ishlatib turibdi
  }

  return { init, startMusic, stopMusic, destroy, get onBeat() { return onBeat; }, set onBeat(fn) { onBeat = fn; } };

})();