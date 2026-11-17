/* XP, niveles, rachas, dificultades y medallas */
(function (BM) {
  const D = window.BM_DATA;

  const LEVELS = [
    { n: 1, name: 'Aprendiz', xp: 0, icon: '🥄' },
    { n: 2, name: 'Ayudante de cocina', xp: 400, icon: '🔪' },
    { n: 3, name: 'Cocinero', xp: 1200, icon: '🍳' },
    { n: 4, name: 'Experto en hamburguesas', xp: 2800, icon: '🍔' },
    { n: 5, name: "Maestro McDonald's", xp: 5500, icon: '👑' },
  ];

  const DIFFICULTIES = [
    { id: 'facil', name: 'Fácil', mult: 1, level: 1 },
    { id: 'normal', name: 'Normal', mult: 1.5, level: 2 },
    { id: 'dificil', name: 'Difícil', mult: 2, level: 3 },
  ];

  const BASE_XP = { build: 20, missing: 12, identify: 10, memory: 25, detective: 20 };

  const MEDALS = [
    { id: 'primer', icon: '🍔', name: 'Primer bocado', desc: 'Acierta tu primera pregunta', test: (s) => s.correct >= 1 },
    { id: 'racha5', icon: '🔥', name: 'En racha', desc: 'Racha de 5 aciertos', test: (s) => s.bestStreak >= 5 },
    { id: 'racha10', icon: '🌶️', name: 'Imparable', desc: 'Racha de 10 aciertos', test: (s) => s.bestStreak >= 10 },
    { id: 'racha25', icon: '☄️', name: 'Leyenda de la parrilla', desc: 'Racha de 25 aciertos', test: (s) => s.bestStreak >= 25 },
    { id: 'constructor', icon: '🧱', name: 'Constructor', desc: '10 hamburguesas construidas perfectas', test: (s) => s.modes.build.perfect >= 10 },
    { id: 'memoria', icon: '🧠', name: 'Memoria de chef', desc: '5 retos contrarreloj perfectos', test: (s) => s.modes.memory.perfect >= 5 },
    { id: 'detective', icon: '🕵️', name: 'Detective', desc: '10 casos de errores resueltos', test: (s) => s.modes.detective.perfect >= 10 },
    { id: 'ojo', icon: '👁️', name: 'Ojo de halcón', desc: '15 hamburguesas identificadas', test: (s) => s.modes.identify.perfect >= 15 },
    { id: 'faltante', icon: '🧩', name: 'Pieza clave', desc: '15 "¿Qué le falta?" perfectos', test: (s) => s.modes.missing.perfect >= 15 },
    { id: 'dificil', icon: '💪', name: 'Sin miedo', desc: '10 aciertos en dificultad Difícil', test: (s) => s.hardCorrect >= 10 },
    { id: 'explorador', icon: '📖', name: 'Explorador del menú', desc: 'Abre las 42 fichas en Aprender', test: (s) => D.burgers.every((b) => s.viewed[b.id]) },
    { id: 'estudioso', icon: '✏️', name: 'Estudioso', desc: 'Marca 10 hamburguesas como aprendidas', test: (s) => Object.keys(s.learned).length >= 10 },
    { id: 'dominio10', icon: '⭐', name: 'Diez dominadas', desc: 'Domina 10 hamburguesas', test: () => D.burgers.filter((b) => BM.SRS.isMastered(b.id)).length >= 10 },
    { id: 'dominioTotal', icon: '🏆', name: 'Dominio total', desc: 'Domina las 42 hamburguesas', test: () => D.burgers.every((b) => BM.SRS.isMastered(b.id)) },
    { id: 'examen80', icon: '🎓', name: 'Examen aprobado', desc: 'Saca 80% o más en un examen', test: (s) => s.exams.some((e) => e.pct >= 80) },
    { id: 'examen100', icon: '💯', name: 'Examen perfecto', desc: '100% en el examen completo', test: (s) => s.exams.some((e) => e.type === 'completo' && e.pct === 100) },
    { id: 'constancia', icon: '📅', name: 'Constancia', desc: 'Juega 3 días distintos', test: (s) => s.days.length >= 3 },
  ];

  const Score = {
    LEVELS,
    DIFFICULTIES,
    MEDALS,
    BASE_XP,
    level(xp) {
      let L = LEVELS[0];
      LEVELS.forEach((l) => { if (xp >= l.xp) L = l; });
      return L;
    },
    nextLevel(xp) { return LEVELS.find((l) => l.xp > xp) || null; },
    levelProgress(xp) {
      const cur = Score.level(xp); const nx = Score.nextLevel(xp);
      if (!nx) return 1;
      return (xp - cur.xp) / (nx.xp - cur.xp);
    },
    unlocked(diffId) {
      const d = DIFFICULTIES.find((x) => x.id === diffId);
      return Score.level(BM.Store.s.xp).n >= d.level;
    },
    diff(id) { return DIFFICULTIES.find((x) => x.id === id) || DIFFICULTIES[0]; },

    /* Aplica el resultado de una respuesta. Devuelve el desglose para mostrar. */
    apply(mode, diffId, score) {
      const s = BM.Store.s;
      const base = BASE_XP[mode] * Score.diff(diffId).mult;
      const before = Score.level(s.xp);
      const m = s.modes[mode];
      m.answered++; m.scoreSum += score;
      s.answered++;
      let xp = 0; let bonus = 0;
      if (score >= 1) {
        s.streak++; s.correct++; m.correct++; m.perfect++;
        if (diffId === 'dificil') s.hardCorrect++;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        const pct = s.streak >= 2 ? Math.min(1, (s.streak - 1) * 0.1) : 0; // +10% por acierto seguido, máx +100%
        xp = Math.round(base);
        bonus = Math.round(base * pct);
      } else if (score >= 0.5) {
        s.streak = 0;
        xp = Math.round(base * score * 0.5); // crédito parcial
      } else {
        s.streak = 0;
        xp = -Math.round(BASE_XP[mode] * 0.25); // penalización moderada
      }
      const total = xp + bonus;
      s.xp = Math.max(0, s.xp + total);
      const after = Score.level(s.xp);
      return { xp, bonus, total, streak: s.streak, levelUp: after.n > before.n ? after : null };
    },

    /* Comprueba medallas nuevas */
    checkMedals() {
      const s = BM.Store.s;
      const fresh = [];
      MEDALS.forEach((m) => {
        if (!s.medals[m.id] && m.test(s)) { s.medals[m.id] = Date.now(); fresh.push(m); }
      });
      return fresh;
    },
  };

  BM.Score = Score;
}(window.BM));
