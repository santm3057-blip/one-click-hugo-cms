/* Persistencia del progreso en LocalStorage */
(function (BM) {
  const KEY = 'burgerMaster.v1';
  const MODES = ['build', 'missing', 'identify', 'memory', 'detective'];

  function fresh() {
    const modes = {};
    MODES.forEach((m) => { modes[m] = { answered: 0, correct: 0, perfect: 0, scoreSum: 0 }; });
    return {
      version: 1,
      xp: 0,
      streak: 0,
      bestStreak: 0,
      answered: 0,
      correct: 0,
      hardCorrect: 0,
      modes,
      burgers: {},      // id -> registro de repetición espaciada
      errors: {},       // id -> { claveError: veces }
      learned: {},      // id -> true (marcado a mano en "Aprender")
      viewed: {},       // id -> true (ficha abierta)
      medals: {},       // id -> fecha
      exams: [],        // { date, type, total, correct, pct }
      days: [],
      settings: { sound: true, difficulty: 'facil', length: 8 },
    };
  }

  let state = null;

  const Store = {
    MODES,
    load() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
      const base = fresh();
      if (raw) {
        try {
          const s = JSON.parse(raw);
          state = Object.assign(base, s);
          state.modes = Object.assign(fresh().modes, s.modes || {});
          state.settings = Object.assign(fresh().settings, s.settings || {});
        } catch (e) { state = base; }
      } else state = base;
      return state;
    },
    get s() { return state || Store.load(); },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* almacenamiento no disponible */ }
    },
    reset() {
      const sound = state ? state.settings.sound : true;
      state = fresh();
      state.settings.sound = sound;
      Store.save();
    },
    markDay() {
      const t = BM.U.today();
      if (!state.days.includes(t)) { state.days.push(t); Store.save(); }
    },
  };

  BM.Store = Store;
}(window.BM));
