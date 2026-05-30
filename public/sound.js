/**
 * Quizok Sound Engine
 * Web Audio API orqali barcha o'yin tovushlari
 * Foydalanish: QuizokSound.correct(), QuizokSound.wrong(), va h.k.
 */

window.QuizokSound = (() => {
  let ctx = null;
  let enabled = true;
  let masterVolume = 0.7;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Asosiy tone generator
  function playTone(freq, duration, type = 'sine', volume = 0.5, delay = 0) {
    if (!enabled) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);

    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume * masterVolume, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.05);
  }

  // Noise generator (shovqin)
  function playNoise(duration, volume = 0.3, delay = 0) {
    if (!enabled) return;
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = c.createBufferSource();
    source.buffer = buffer;

    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    gain.gain.setValueAtTime(volume * masterVolume, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

    source.start(c.currentTime + delay);
    source.stop(c.currentTime + delay + duration + 0.05);
  }

  // ✅ TO'G'RI JAVOB — yulduzcha ovozi
  function correct() {
    if (!enabled) return;
    // Yuqoriga ko'tariluvchi akkord
    playTone(523, 0.15, 'sine', 0.4);        // C5
    playTone(659, 0.15, 'sine', 0.4, 0.1);   // E5
    playTone(784, 0.15, 'sine', 0.4, 0.2);   // G5
    playTone(1047, 0.4, 'sine', 0.5, 0.3);   // C6
    // Sehrli shimmer
    playTone(2093, 0.3, 'sine', 0.15, 0.3);
    playTone(2637, 0.25, 'sine', 0.12, 0.35);
  }

  // ❌ NOTO'G'RI JAVOB — pastga tushuvchi ovoz
  function wrong() {
    if (!enabled) return;
    playTone(330, 0.15, 'sawtooth', 0.3);
    playTone(277, 0.15, 'sawtooth', 0.3, 0.15);
    playTone(220, 0.35, 'sawtooth', 0.35, 0.3);
    // Buzilish effekti
    playNoise(0.1, 0.15, 0.1);
  }

  // ⏰ TIQ-TIQ — taymer
  function tick() {
    if (!enabled) return;
    playTone(880, 0.05, 'square', 0.2);
  }

  // 🚨 URGENT TICK — oxirgi 5 soniya
  function urgentTick() {
    if (!enabled) return;
    playTone(1100, 0.08, 'square', 0.35);
    playNoise(0.04, 0.1, 0.04);
  }

  // 🏆 G'ALABA — fanfara
  function victory() {
    if (!enabled) return;
    const melody = [
      [523, 0.12, 0],    // C
      [523, 0.12, 0.13], // C
      [523, 0.12, 0.26], // C
      [415, 0.09, 0.39], // Ab
      [523, 0.12, 0.49], // C
      [415, 0.09, 0.62], // Ab
      [523, 0.5, 0.72],  // C (uzun)
    ];
    melody.forEach(([f, d, t]) => playTone(f, d, 'sine', 0.5, t));

    // Ostki akkordlar
    [130, 164, 196].forEach(f => playTone(f, 1.2, 'sine', 0.2));

    // Konfetti effekti (yuqori chastotalar)
    for (let i = 0; i < 12; i++) {
      const freq = 1500 + Math.random() * 2000;
      playTone(freq, 0.1 + Math.random() * 0.2, 'sine', 0.08, 0.5 + Math.random() * 0.8);
    }
  }

  // 🥈 2-O'RIN
  function secondPlace() {
    if (!enabled) return;
    playTone(440, 0.15, 'sine', 0.4);
    playTone(554, 0.15, 'sine', 0.4, 0.15);
    playTone(659, 0.4, 'sine', 0.45, 0.3);
  }

  // 🥉 3-O'RIN
  function thirdPlace() {
    if (!enabled) return;
    playTone(392, 0.15, 'sine', 0.35);
    playTone(494, 0.4, 'sine', 0.4, 0.15);
  }

  // 🎮 O'YIN BOSHLANDI — countdown beep
  function gameStart() {
    if (!enabled) return;
    // 3... 2... 1... GO!
    [0, 1, 2].forEach(i => {
      playTone(440, 0.15, 'sine', 0.4, i * 1.0);
    });
    // GO! — kuchli
    playTone(880, 0.08, 'sine', 0.5, 3.0);
    playTone(1100, 0.08, 'sine', 0.5, 3.08);
    playTone(1320, 0.4, 'sine', 0.6, 3.16);
  }

  // 👋 O'QUVCHI KIRDI — pop
  function playerJoin() {
    if (!enabled) return;
    playTone(800, 0.06, 'sine', 0.3);
    playTone(1000, 0.1, 'sine', 0.25, 0.06);
  }

  // 📢 YANGI SAVOL — whoosh
  function newQuestion() {
    if (!enabled) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';

    osc.frequency.setValueAtTime(200, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.3);

    gain.gain.setValueAtTime(0.4 * masterVolume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);

    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.35);
  }

  // ⏱️ TAYMER TUGADI
  function timeUp() {
    if (!enabled) return;
    playTone(440, 0.1, 'sawtooth', 0.4);
    playTone(330, 0.1, 'sawtooth', 0.4, 0.12);
    playTone(220, 0.4, 'sawtooth', 0.45, 0.24);
    playNoise(0.15, 0.2, 0.12);
  }

  // 💰 BALL QOSHILDI
  function scoreUp() {
    if (!enabled) return;
    playTone(1047, 0.06, 'sine', 0.25);
    playTone(1319, 0.1, 'sine', 0.2, 0.07);
  }

  // 🔇 OVOZNI YOQISH/O'CHIRISH
  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  function setVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
  }

  function isEnabled() {
    return enabled;
  }

  // Brauzer birinchi click dan keyin AudioContext ni ochish
  function init() {
    document.addEventListener('click', () => {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    }, { once: true });
  }

  init();

  return {
    correct,
    wrong,
    tick,
    urgentTick,
    victory,
    secondPlace,
    thirdPlace,
    gameStart,
    playerJoin,
    newQuestion,
    timeUp,
    scoreUp,
    toggle,
    setVolume,
    isEnabled,
    _getCtx: getCtx, // cyber-bg.js uchun, boshqa joyda ishlatmang
  };
})();
