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
      top: null,        // ids de las "más pedidas" (null = lista inicial)
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
      const top = state ? state.top : null;
      state = fresh();
      state.settings.sound = sound;
      state.top = top; // la lista de más pedidas no es progreso: se conserva
      Store.save();
    },
    // Hamburguesas "más pedidas": las elige el jugador; esta es la lista inicial
    TOP_DEFAULT: ['cuarto_de_libra', 'onion_bbq', 'hamburguesa_con_queso', 'triple_hamburguesa_con_queso', 'mcbacon', 'mcpollo', 'mcnifica'],
    topIds() { return state.top || Store.TOP_DEFAULT; },
    isTop(id) { return Store.topIds().includes(id); },
    toggleTop(id) {
      const ids = Store.topIds().slice();
      const i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1); else ids.push(id);
      state.top = ids;
      Store.save();
    },
    topBurgers() { return window.BM_DATA.burgers.filter((b) => Store.isTop(b.id)); },
    markDay() {
      const t = BM.U.today();
      if (!state.days.includes(t)) { state.days.push(t); Store.save(); }
    },
  };

  BM.Store = Store;
}(window.BM));
