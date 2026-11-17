/* Motor de partidas: encadena preguntas, aplica puntuación y repetición espaciada */
(function (BM) {
  const U = BM.U; const UI = BM.UI; const h = U.h;

  const MODE_IDS = ['build', 'missing', 'identify', 'memory', 'detective'];

  /* cfg: { title, modes, pool, count, diff, exam, fixed, again } */
  UI.register('session', (main, cfg) => {
    const burgers = cfg.fixed || BM.SRS.pick(cfg.count, cfg.pool);
    const total = burgers.length;
    // Modo de cada pregunta: en mezcla se reparten para que no se repitan seguidos
    const modes = [];
    let bag = [];
    for (let i = 0; i < total; i++) {
      if (cfg.modes.length === 1) { modes.push(cfg.modes[0]); continue; }
      if (!bag.length) bag = U.shuffle(cfg.modes);
      let m = bag.shift();
      if (modes[i - 1] === m && bag.length) { bag.push(m); m = bag.shift(); }
      modes.push(m);
    }
    const results = [];
    let idx = 0;
    let xpGained = 0;
    BM.Store.markDay();

    const top = h('div.session-top');
    const area = h('div.q-area');
    main.appendChild(top);
    main.appendChild(area);

    function drawTop() {
      top.innerHTML = '';
      const pct = (idx / total) * 100;
      const okN = results.filter((r) => r.score >= 1).length;
      top.appendChild(h('div.session-row',
        h('button.btn.btn-ghost.btn-sm', { onclick: quit }, '✕ Salir'),
        h('div.session-title', cfg.exam ? '🎓 ' + cfg.title : cfg.title),
        h('div.session-count', `${Math.min(idx + 1, total)} / ${total}`)));
      top.appendChild(h('div.progress', h('div.progress-fill', { style: { width: pct + '%' } })));
      top.appendChild(h('div.session-stats',
        h('span', '✅ ' + okN),
        h('span', '⭐ ' + (xpGained >= 0 ? '+' : '') + xpGained + ' XP'),
        h('span.streak' + (BM.Store.s.streak >= 3 ? '.hot' : ''), '🔥 Racha ' + BM.Store.s.streak),
        h('span.chip.chip-diff', BM.Score.diff(cfg.diff).name)));
    }

    function quit() {
      if (idx >= total) return UI.go('menu');
      UI.confirm('¿Salir de la partida? Lo que ya respondiste queda guardado.', 'Salir', () => UI.go(cfg.back || 'menu'));
    }

    function next() {
      if (idx >= total) return finish();
      drawTop();
      area.innerHTML = '';
      const mode = BM.Modes[modes[idx]];
      const burger = burgers[idx];
      area.appendChild(h('div.mode-chip', mode.icon + ' ' + mode.name));
      const qbox = h('div.q-box');
      area.appendChild(qbox);
      let answered = false;
      mode.render(qbox, { burger, diff: cfg.diff, exam: !!cfg.exam }, (res) => {
        if (answered) return;
        answered = true;
        onAnswer(mode, burger, res, qbox);
      });
    }

    function onAnswer(mode, burger, res, qbox) {
      const score = U.clamp(res.score, 0, 1);
      const r = BM.Score.apply(mode.id, cfg.diff, score);
      let speedXp = 0;
      if (res.speedBonus) {
        speedXp = Math.round(BM.Score.BASE_XP[mode.id] * BM.Score.diff(cfg.diff).mult * res.speedBonus * 0.6);
        BM.Store.s.xp += speedXp;
      }
      BM.SRS.record(burger.id, score, res.errors);
      xpGained += r.total + speedXp;
      results.push({ burger, mode: mode.id, score });

      const perfect = score >= 1;
      if (perfect) { BM.Sound.play('correct'); UI.confetti(30); qbox.classList.add('flash-ok'); } else if (score >= 0.5) { BM.Sound.play('partial'); qbox.classList.add('flash-mid'); } else { BM.Sound.play('wrong'); UI.shake(qbox); qbox.classList.add('flash-bad'); }

      const xpLine = [];
      xpLine.push((r.xp >= 0 ? '+' : '') + r.xp + ' XP');
      if (r.bonus) xpLine.push('+' + r.bonus + ' bonus racha ×' + r.streak);
      if (speedXp) xpLine.push('+' + speedXp + ' rapidez');

      const btn = h('button.btn.btn-yellow.btn-lg', { onclick: () => { fb.remove(); idx++; next(); } },
        idx + 1 >= total ? 'Ver resultados →' : 'Continuar →');
      const fb = h('div.feedback.' + (perfect ? 'fb-ok' : score >= 0.5 ? 'fb-mid' : 'fb-bad'),
        h('div.fb-main',
          h('div.fb-icon', perfect ? '🎉' : score >= 0.5 ? '🤏' : '❌'),
          h('div.fb-text',
            h('div.fb-title', perfect ? U.pick(['¡Perfecto!', '¡Excelente!', '¡Así se hace!', '¡Bien hecho!']) : score >= 0.5 ? `Casi: ${Math.round(score * 100)}%` : 'Incorrecto'),
            h('div.fb-sub', xpLine.join(' · ')),
            !perfect && res.errors && res.errors.length
              ? h('div.fb-errors', U.uniq(res.errors).slice(0, 3).map((e) => h('div', '• ' + BM.SRS.errorText(e))))
              : null)),
        btn);
      document.body.appendChild(fb);
      UI.onLeave(() => fb.remove());
      UI.floatText((r.total + speedXp >= 0 ? '+' : '') + (r.total + speedXp) + ' XP', r.total >= 0 ? 'good' : 'bad', btn);
      UI.celebrate(r);
      drawTop();
      setTimeout(() => btn.focus(), 50);
    }

    function finish() {
      if (cfg.exam) {
        const pct = Math.round(results.reduce((a, r) => a + r.score, 0) / total * 100);
        BM.Store.s.exams.push({ date: Date.now(), type: cfg.exam, total, correct: results.filter((r) => r.score >= 1).length, pct });
        BM.Store.save();
      }
      UI.celebrate(null);
      UI.go('summary', { cfg, results, xpGained });
    }

    next();
  });

  /* Resumen de la partida */
  UI.register('summary', (main, p) => {
    const { cfg, results, xpGained } = p;
    const total = results.length;
    const ok = results.filter((r) => r.score >= 1).length;
    const pct = total ? Math.round(results.reduce((a, r) => a + r.score, 0) / total * 100) : 0;
    let title = '¡Buen trabajo!'; let icon = '👍';
    if (pct >= 95) { title = '¡Impecable!'; icon = '🏆'; } else if (pct >= 80) { title = '¡Muy bien!'; icon = '🌟'; } else if (pct < 50) { title = 'Hay que practicar más'; icon = '💪'; }
    if (cfg.exam) {
      if (pct >= 80) { title = 'Examen APROBADO'; icon = '🎓'; } else { title = 'Examen no aprobado'; icon = '📚'; }
    }
    if (pct >= 80) setTimeout(() => UI.confetti(70), 200);
    const fails = results.filter((r) => r.score < 1);
    main.appendChild(h('div.summary',
      h('div.summary-icon', icon),
      h('h1', title),
      cfg.exam ? h('p.muted', cfg.exam === 'completo' ? 'Examen completo · las 42 hamburguesas' : 'Examen rápido') : null,
      h('div.summary-stats',
        h('div.stat', h('b', pct + '%'), h('span', 'Precisión')),
        h('div.stat', h('b', ok + '/' + total), h('span', 'Perfectas')),
        h('div.stat', h('b', (xpGained >= 0 ? '+' : '') + xpGained), h('span', 'XP ganada'))),
      fails.length ? h('div.summary-fails',
        h('h3', 'Para repasar'),
        U.uniq(fails.map((r) => r.burger)).map((b) => h('button.fail-item', { onclick: () => UI.go('learnDetail', { id: b.id, back: 'menu' }) },
          h('span', U.burgerName(b)), BM.UI.masteryRing(BM.SRS.mastery(b.id), 36)))) : h('p.center', '¡Sin errores! 🎉'),
      h('div.row-btns',
        h('button.btn.btn-ghost', { onclick: () => UI.go('menu') }, 'Menú'),
        fails.length && !cfg.exam ? h('button.btn.btn-yellow', {
          onclick: () => UI.go('session', Object.assign({}, cfg, { fixed: U.shuffle(U.uniq(fails.map((r) => r.burger))), title: 'Repaso de fallos' })),
        }, 'Repasar fallos') : null,
        h('button.btn.btn-red', { onclick: () => UI.go('session', Object.assign({}, cfg, { fixed: cfg.exam === 'completo' ? U.shuffle(window.BM_DATA.burgers) : null })) }, cfg.exam ? 'Repetir examen' : 'Jugar otra vez'))));
  });

  BM.MODE_IDS = MODE_IDS;
}(window.BM));
