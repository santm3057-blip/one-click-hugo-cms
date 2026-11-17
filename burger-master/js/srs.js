/* Repetición espaciada (sistema Leitner) + dominio por hamburguesa + registro de errores */
(function (BM) {
  const D = window.BM_DATA;
  const U = BM.U;
  const MIN = 60 * 1000;
  // Intervalo hasta el próximo repaso según la caja (0 = no sabe, 5 = dominada)
  const INTERVAL = [0, 5 * MIN, 30 * MIN, 12 * 60 * MIN, 3 * 24 * 60 * MIN, 7 * 24 * 60 * MIN];
  const BOX_WEIGHT = [10, 6, 3.5, 2, 1.2, 0.7];

  function rec(id) {
    const s = BM.Store.s;
    if (!s.burgers[id]) s.burgers[id] = { seen: 0, correct: 0, wrong: 0, box: 0, mastery: 0, due: 0, last: 0 };
    return s.burgers[id];
  }

  const SRS = {
    rec,
    INTERVAL,
    mastery(id) { const r = BM.Store.s.burgers[id]; return r ? Math.round(r.mastery) : 0; },
    isMastered(id) { const r = BM.Store.s.burgers[id]; return !!r && r.mastery >= 80 && r.box >= 3; },
    status(id) {
      const r = BM.Store.s.burgers[id];
      if (!r || !r.seen) return 'nueva';
      if (SRS.isMastered(id)) return 'dominada';
      if (r.mastery >= 50) return 'aprendiendo';
      return 'dificil';
    },

    /* score: 0..1. errors: claves de error para el registro */
    record(id, score, errors) {
      const r = rec(id);
      const now = Date.now();
      r.seen++;
      r.last = now;
      if (score >= 1) {
        r.correct++;
        r.box = Math.min(5, r.box + 1);
      } else {
        r.wrong++;
        r.box = score >= 0.5 ? Math.max(0, r.box - 1) : 0;
      }
      r.mastery = r.mastery + (score * 100 - r.mastery) * 0.35;
      r.due = now + INTERVAL[r.box];
      if (errors && errors.length) {
        const s = BM.Store.s;
        s.errors[id] = s.errors[id] || {};
        errors.forEach((e) => { s.errors[id][e] = (s.errors[id][e] || 0) + 1; });
      }
    },

    weight(id) {
      const r = BM.Store.s.burgers[id];
      if (!r || !r.seen) return BM.Store.isTop(id) ? 9 : 5; // nuevas: frecuencia media-alta
      let w = BOX_WEIGHT[r.box];
      if (r.due <= Date.now()) w *= 2; // pendiente de repaso
      w *= 1.6 - r.mastery / 100;
      if (BM.Store.isTop(id)) w *= 1.8; // las más pedidas salen más
      return Math.max(0.15, w);
    },

    /* Elige n hamburguesas ponderadas (sin repetir mientras haya disponibles) */
    pick(n, pool) {
      pool = (pool || D.burgers).slice();
      const out = [];
      let avail = pool.slice();
      while (out.length < n && pool.length) {
        if (!avail.length) avail = pool.slice();
        const ws = avail.map((b) => SRS.weight(b.id));
        let t = Math.random() * ws.reduce((a, b) => a + b, 0);
        let i = 0;
        for (; i < ws.length - 1; i++) { t -= ws[i]; if (t <= 0) break; }
        out.push(avail[i]);
        avail.splice(i, 1);
      }
      return out;
    },

    dueCount() {
      const now = Date.now();
      return D.burgers.filter((b) => { const r = BM.Store.s.burgers[b.id]; return r && r.seen && r.due <= now && !SRS.isMastered(b.id); }).length;
    },
    notMastered() { return D.burgers.filter((b) => !SRS.isMastered(b.id)); },
    hardest(n) {
      return D.burgers.filter((b) => { const r = BM.Store.s.burgers[b.id]; return r && r.seen; })
        .sort((a, b) => {
          const ra = BM.Store.s.burgers[a.id]; const rb = BM.Store.s.burgers[b.id];
          return (ra.mastery - rb.mastery) || (rb.wrong - ra.wrong);
        })
        .filter((b) => !SRS.isMastered(b.id))
        .slice(0, n);
    },

    /* Texto legible de una clave de error */
    errorText(code) {
      const [type, a, b] = code.split('>');
      const L = (k) => (k && k.includes('|') ? U.label(k) : k);
      switch (type) {
        case 'falta': return 'Olvidas «' + L(a) + '»';
        case 'sobra': return 'Pones «' + L(a) + '» y no lleva';
        case 'orden': return 'Orden de montaje incorrecto';
        case 'cambia': return 'Pones «' + L(b) + '» en lugar de «' + L(a) + '»';
        case 'confunde': { const x = U.burger(a); return 'La confundes con ' + (x ? U.burgerName(x) : a); }
        case 'nodetecta': return 'No detectas: ' + ({ wrong: 'ingrediente incorrecto', order: 'capas fuera de orden', missing: 'ingrediente faltante' }[a] || a);
        case 'falsaalarma': return 'Marcas como error algo que estaba bien';
        default: return code;
      }
    },
    topErrors(n) {
      const all = [];
      Object.entries(BM.Store.s.errors).forEach(([id, errs]) => {
        Object.entries(errs).forEach(([code, c]) => all.push({ id, code, c }));
      });
      return all.sort((a, b) => b.c - a.c).slice(0, n);
    },
  };

  BM.SRS = SRS;
}(window.BM));
