/* Efectos de sonido sintetizados (Web Audio, sin archivos) */
(function (BM) {
  let ctx = null;
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const t = a.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const SOUNDS = {
    tap: () => tone(660, 0, 0.06, 'triangle', 0.08),
    drop: () => { tone(300, 0, 0.08, 'triangle', 0.1); tone(450, 0.04, 0.08, 'triangle', 0.08); },
    remove: () => tone(220, 0, 0.08, 'triangle', 0.08),
    correct: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.18, 'triangle', 0.14)); },
    partial: () => { tone(523, 0, 0.15, 'triangle', 0.12); tone(587, 0.1, 0.2, 'triangle', 0.1); },
    wrong: () => { tone(196, 0, 0.22, 'sawtooth', 0.07); tone(150, 0.12, 0.28, 'sawtooth', 0.06); },
    tick: () => tone(1000, 0, 0.03, 'square', 0.04),
    levelup: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.22, 'triangle', 0.15)); },
    medal: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.25, 'sine', 0.14)); },
  };
  BM.Sound = {
    play(name) {
      if (!BM.Store.s.settings.sound) return;
      try { SOUNDS[name] && SOUNDS[name](); } catch (e) { /* sin audio */ }
    },
  };
}(window.BM));
