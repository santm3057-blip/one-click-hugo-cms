/* Pantallas: menú, jugar, aprender, entrenamiento, examen, progreso, notas */
(function (BM) {
  const U = BM.U; const UI = BM.UI; const h = U.h;
  const D = window.BM_DATA;
  const S = () => BM.Store.s;

  /* ---------- Selector de dificultad / duración ---------- */
  function diffPicker(onChange) {
    const s = S();
    if (!BM.Score.unlocked(s.settings.difficulty)) s.settings.difficulty = 'facil';
    const box = h('div.seg');
    BM.Score.DIFFICULTIES.forEach((d) => {
      const un = BM.Score.unlocked(d.id);
      const b = h('button.seg-btn' + (s.settings.difficulty === d.id ? '.on' : '') + (un ? '' : '.locked'), {
        type: 'button',
        title: un ? 'XP ×' + d.mult : 'Se desbloquea en el nivel ' + d.level,
        onclick: () => {
          if (!un) { UI.toast('🔒 ' + d.name + ' se desbloquea al llegar al nivel ' + d.level + ' (' + BM.Score.LEVELS[d.level - 1].name + ').'); return; }
          s.settings.difficulty = d.id; BM.Store.save(); BM.Sound.play('tap');
          box.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('on')); b.classList.add('on');
          if (onChange) onChange();
        },
      }, (un ? '' : '🔒 ') + d.name, h('small', un ? ' ×' + d.mult + ' XP' : ' Nv.' + d.level));
      box.appendChild(b);
    });
    return box;
  }
  function lengthPicker() {
    const s = S();
    const box = h('div.seg');
    [[5, 'Corta · 5'], [8, 'Normal · 8'], [12, 'Larga · 12']].forEach(([n, t]) => {
      const b = h('button.seg-btn' + (s.settings.length === n ? '.on' : ''), {
        type: 'button',
        onclick: () => {
          s.settings.length = n; BM.Store.save(); BM.Sound.play('tap');
          box.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('on')); b.classList.add('on');
        },
      }, t);
      box.appendChild(b);
    });
    return box;
  }

  /* ================= MENÚ PRINCIPAL ================= */
  UI.register('menu', (main) => {
    const s = S();
    const mastered = D.burgers.filter((b) => BM.SRS.isMastered(b.id)).length;
    const due = BM.SRS.dueCount();
    const L = BM.Score.level(s.xp);
    main.appendChild(h('div.hero',
      h('div.hero-burger', UI.stack(U.keys(U.burger('big_mac')), { small: true })),
      h('div.hero-text',
        h('h1.hero-title', 'Burger ', h('span', 'Master')),
        h('p.hero-sub', 'Aprende las 42 hamburguesas del documento BUILD jugando.'),
        h('div.hero-stats',
          h('span.chip', L.icon + ' ' + L.name),
          h('span.chip', '⭐ ' + mastered + '/42 dominadas'),
          due ? h('span.chip.chip-dificil', '⏰ ' + due + ' para repasar') : null))));

    const items = [
      ['play', '🎮', 'JUGAR', 'Partidas rápidas de 2 a 5 minutos', 'btn-red'],
      ['learn', '📖', 'APRENDER HAMBURGUESAS', 'Fichas con ingredientes, orden y diferencias', 'btn-yellow'],
      ['training', '🎯', 'ENTRENAMIENTO PERSONALIZADO', 'Practica solo lo que aún no dominas', 'btn-orange'],
      ['exam', '🎓', 'EXAMEN FINAL', 'Todos los modos, todas las hamburguesas', 'btn-dark'],
      ['progress', '📊', 'MI PROGRESO', 'Nivel, medallas, estadísticas y errores', 'btn-green'],
    ];
    main.appendChild(h('nav.menu', items.map(([to, ic, t, d, c]) => h('button.menu-btn.' + c, {
      onclick: () => { BM.Sound.play('tap'); UI.go(to); },
    }, h('span.menu-icon', ic), h('span.menu-text', h('b', t), h('small', d))))));
    main.appendChild(h('div.menu-foot',
      h('button.link', { onclick: () => UI.go('notes') }, '📄 Notas sobre los datos del documento')));
  });

  /* ================= JUGAR ================= */
  UI.register('play', (main) => {
    main.appendChild(UI.backBar('Jugar'));
    main.appendChild(h('div.panel',
      h('div.panel-row', h('label', 'Dificultad'), diffPicker()),
      h('div.panel-row', h('label', 'Duración'), lengthPicker())));
    const start = (modes, title) => {
      const s = S();
      UI.go('session', { title, modes, count: s.settings.length, diff: s.settings.difficulty, back: 'play' });
    };
    const grid = h('div.mode-grid');
    grid.appendChild(h('button.mode-card.mode-mix', { onclick: () => start(BM.MODE_IDS, 'Partida rápida') },
      h('span.mode-icon', '🎲'), h('b', 'Partida rápida'), h('small', 'Mezcla de todos los modos. Ideal para un rato libre.')));
    BM.MODE_IDS.forEach((id, i) => {
      const m = BM.Modes[id];
      const st = S().modes[id];
      grid.appendChild(h('button.mode-card', { onclick: () => start([id], m.name) },
        h('span.mode-num', 'Modo ' + (i + 1)),
        h('span.mode-icon', m.icon), h('b', m.name), h('small', m.desc),
        st.answered ? h('span.mode-stat', Math.round(st.scoreSum / st.answered * 100) + '% precisión · ' + st.answered + ' jugadas') : null));
    });
    main.appendChild(grid);
    main.appendChild(h('p.muted.center', 'Las hamburguesas que fallas aparecen más a menudo; las que dominas, menos.'));
  });

  /* ================= APRENDER ================= */
  UI.register('learn', (main, p) => {
    main.appendChild(UI.backBar('Aprender hamburguesas'));
    let fam = p.fam || 'all'; let q = '';
    const s = S();
    const learnedN = Object.keys(s.learned).length;
    main.appendChild(h('p.muted', 'Toca una hamburguesa para ver su ficha. Marcadas como aprendidas: ' + learnedN + '/42.'));
    const search = h('input.search', { type: 'search', placeholder: '🔎 Buscar hamburguesa o ingrediente…', oninput: (e) => { q = e.target.value.toLowerCase(); draw(); } });
    const chips = h('div.fam-chips');
    [['all', 'Todas']].concat(D.families.map((f) => [f.id, f.name])).forEach(([id, name]) => {
      chips.appendChild(h('button.fchip' + (fam === id ? '.on' : ''), {
        onclick: (e) => { fam = id; chips.querySelectorAll('.fchip').forEach((x) => x.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); },
      }, name));
    });
    const grid = h('div.burger-grid');
    main.appendChild(search); main.appendChild(chips); main.appendChild(grid);
    function draw() {
      grid.innerHTML = '';
      const list = D.burgers.filter((b) => (fam === 'all' || b.family === fam) &&
        (!q || U.burgerName(b).toLowerCase().includes(q) || b.steps.some((st) => U.label(U.key(st)).toLowerCase().includes(q))));
      if (!list.length) grid.appendChild(h('p.muted', 'Sin resultados.'));
      list.forEach((b) => {
        grid.appendChild(h('button.burger-card', { onclick: () => UI.go('learnDetail', { id: b.id, fam }) },
          h('div.bc-stack', UI.stack(U.keys(b), { small: true })),
          h('div.bc-name', b.name, b.variant ? h('small', b.variant) : null),
          h('div.bc-foot', UI.masteryRing(BM.SRS.mastery(b.id), 34),
            s.learned[b.id] ? h('span.chip.chip-learned', '✓ Aprendida') : UI.statusChip(b.id))));
      });
    }
    draw();
  });

  UI.register('learnDetail', (main, p) => {
    const b = U.burger(p.id);
    const s = S();
    s.viewed[b.id] = true; BM.Store.save();
    UI.celebrate(null);
    const keys = U.keys(b);
    const i = D.burgers.indexOf(b);
    const prev = D.burgers[(i - 1 + D.burgers.length) % D.burgers.length];
    const nxt = D.burgers[(i + 1) % D.burgers.length];
    main.appendChild(UI.backBar('Ficha', () => UI.go(p.back || 'learn', { fam: p.fam })));
    const r = s.burgers[b.id];

    const learnBtn = h('button.btn' + (s.learned[b.id] ? '.btn-green' : '.btn-ghost'), {
      onclick: () => {
        if (s.learned[b.id]) delete s.learned[b.id]; else { s.learned[b.id] = Date.now(); BM.Sound.play('correct'); }
        BM.Store.save(); UI.celebrate(null); UI.go('learnDetail', p);
      },
    }, s.learned[b.id] ? '✓ Marcada como aprendida' : '☐ Marcar como aprendida');

    main.appendChild(h('div.detail',
      h('div.detail-head',
        h('div',
          h('div.muted', U.family(b.family).name + ' · pág. ' + b.page + ' del documento'),
          h('h1.detail-name', b.name, b.variant ? h('span.variant', b.variant) : null)),
        UI.masteryRing(BM.SRS.mastery(b.id), 56)),
      h('div.detail-status', UI.statusChip(b.id),
        r && r.seen ? h('span.muted', ` ${r.correct} aciertos · ${r.wrong} fallos`) : h('span.muted', ' Aún no practicada en retos'),
        s.learned[b.id] && !BM.SRS.isMastered(b.id) ? h('span.muted', ' · el sistema la confirmará como dominada cuando la aciertes en los retos') : null),
      h('div.detail-body',
        h('div.detail-illus', UI.stack(keys), h('p.muted.center.small', 'Ilustración con las fotos de ingredientes del documento (base abajo, corona arriba).')),
        h('div.detail-steps',
          h('h3', 'Orden de montaje (' + keys.length + ' capas)'),
          b.steps.map((st, k) => {
            const row = UI.layerRow(U.key(st), k);
            row.appendChild(h('span.layer-src', '«' + st[2] + '»'));
            return row;
          }))),
      b.notes.length ? h('div.notes-box', h('h3', '⚠️ Notas del documento'), h('ul', b.notes.map((n) => h('li', n)))) : null,
      h('div.diffs', h('h3', 'Diferencias con hamburguesas parecidas'),
        U.similarBurgers(b, 3).map((o) => {
          const d = U.diff(b, o);
          return h('div.diff-card',
            h('button.diff-name', { onclick: () => UI.go('learnDetail', { id: o.id, fam: p.fam, back: p.back }) }, U.burgerName(o) + ' →'),
            d.sameSet ? h('div.diff-line', '🔀 Mismos ingredientes y cantidades, pero en distinto orden') : null,
            d.plus.length ? h('div.diff-line.plus', '➕ Lleva además: ', d.plus.map((x) => U.label(x.key) + (x.n > 1 ? ' ×' + x.n : '')).join(', ')) : null,
            d.minus.length ? h('div.diff-line.minus', '➖ No lleva: ', d.minus.map((x) => U.label(x.key) + (x.n > 1 ? ' ×' + x.n : '')).join(', ')) : null,
            !d.sameSet && !d.sameOrder ? null : null);
        })),
      h('div.row-btns.detail-actions',
        learnBtn,
        h('button.btn.btn-red', {
          onclick: () => UI.go('session', { title: 'Práctica: ' + U.burgerName(b), modes: ['build', 'missing', 'detective', 'memory'], fixed: [b, b, b, b], pool: [b], count: 4, diff: s.settings.difficulty, back: 'learn' }),
        }, '🎮 Practicar esta')),
      h('div.row-btns',
        h('button.btn.btn-ghost.btn-sm', { onclick: () => UI.go('learnDetail', { id: prev.id, fam: p.fam, back: p.back }) }, '← ' + U.burgerName(prev)),
        h('button.btn.btn-ghost.btn-sm', { onclick: () => UI.go('learnDetail', { id: nxt.id, fam: p.fam, back: p.back }) }, U.burgerName(nxt) + ' →'))));
  });

  /* ================= ENTRENAMIENTO PERSONALIZADO ================= */
  UI.register('training', (main) => {
    main.appendChild(UI.backBar('Entrenamiento personalizado'));
    const s = S();
    let filter = 'notMastered'; let fam = D.families[0].id; let mode = 'mix';
    const chosen = new Set();
    const info = h('p.train-info');
    const famSel = h('select.select', { onchange: (e) => { fam = e.target.value; update(); } },
      D.families.map((f) => h('option', { value: f.id }, f.name)));
    const pickList = h('div.pick-list', D.burgers.map((b) => h('label.pick',
      h('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) chosen.add(b.id); else chosen.delete(b.id); update(); } }),
      h('span', U.burgerName(b)), UI.statusChip(b.id))));

    function pool() {
      if (filter === 'notMastered') return BM.SRS.notMastered();
      if (filter === 'hardest') return BM.SRS.hardest(10);
      if (filter === 'learned') return D.burgers.filter((b) => s.learned[b.id]);
      if (filter === 'family') return D.burgers.filter((b) => b.family === fam);
      if (filter === 'pick') return D.burgers.filter((b) => chosen.has(b.id));
      return D.burgers;
    }
    const opts = [
      ['notMastered', '⏳ Solo las que no domino'],
      ['hardest', '⚠️ Mis 10 más difíciles'],
      ['learned', '✓ Las que marqué como aprendidas (verificarlas)'],
      ['family', '🍔 Por familia'],
      ['pick', '☑️ Elegir hamburguesas'],
    ];
    const radios = h('div.radio-list', opts.map(([id, t]) => h('label.radio',
      h('input', { type: 'radio', name: 'f', value: id, checked: id === filter, onchange: () => { filter = id; update(); } }), h('span', t))));
    const modeSel = h('select.select', { onchange: (e) => { mode = e.target.value; } },
      h('option', { value: 'mix' }, '🎲 Todos los modos mezclados'),
      BM.MODE_IDS.map((id) => h('option', { value: id }, BM.Modes[id].icon + ' ' + BM.Modes[id].name)));
    const startBtn = h('button.btn.btn-red.btn-lg', {
      onclick: () => {
        const p = pool();
        if (!p.length) return;
        UI.go('session', { title: 'Entrenamiento', modes: mode === 'mix' ? BM.MODE_IDS : [mode], pool: p, count: s.settings.length, diff: s.settings.difficulty, back: 'training' });
      },
    }, '🎯 Empezar entrenamiento');

    function update() {
      famSel.style.display = filter === 'family' ? '' : 'none';
      pickList.style.display = filter === 'pick' ? '' : 'none';
      const p = pool();
      info.textContent = p.length
        ? `${p.length} hamburguesa${p.length > 1 ? 's' : ''} en el entrenamiento: ` + p.slice(0, 8).map(U.burgerName).join(', ') + (p.length > 8 ? '…' : '')
        : filter === 'hardest' ? 'Aún no hay hamburguesas difíciles: juega algunas partidas primero.'
          : filter === 'learned' ? 'No has marcado hamburguesas como aprendidas en "Aprender".'
            : filter === 'pick' ? 'Elige al menos una hamburguesa.'
              : '¡Dominas todas! Elige otra opción.';
      startBtn.disabled = !p.length;
    }
    main.appendChild(h('div.panel',
      h('h3', '¿Qué quieres practicar?'), radios, famSel, pickList,
      h('div.panel-row', h('label', 'Modo'), modeSel),
      h('div.panel-row', h('label', 'Dificultad'), diffPicker()),
      h('div.panel-row', h('label', 'Duración'), lengthPicker()),
      info, h('div.action-bar', startBtn)));
    update();
  });

  /* ================= EXAMEN FINAL ================= */
  UI.register('exam', (main) => {
    main.appendChild(UI.backBar('Examen final'));
    const s = S();
    const best = (t) => s.exams.filter((e) => e.type === t).reduce((m, e) => Math.max(m, e.pct), -1);
    const card = (type, title, desc, cfg) => h('div.exam-card',
      h('h3', title), h('p', desc),
      best(type) >= 0 ? h('p.muted', 'Mejor resultado: ' + best(type) + '%') : null,
      h('button.btn.btn-red', { onclick: () => UI.go('session', cfg) }, 'Comenzar'));
    main.appendChild(h('p.muted', 'Preguntas al azar combinando los 5 modos en dificultad Normal. Se aprueba con 80%.'));
    main.appendChild(h('div.exam-grid',
      card('rapido', '⚡ Examen rápido', '15 preguntas de hamburguesas al azar. ~5 minutos.',
        { title: 'Examen rápido', exam: 'rapido', modes: BM.MODE_IDS, fixed: U.shuffle(D.burgers).slice(0, 15), diff: 'normal', back: 'exam' }),
      card('completo', '🏁 Examen completo', 'Las 42 hamburguesas del documento, una pregunta por cada una. ~15 minutos.',
        { title: 'Examen completo', exam: 'completo', modes: BM.MODE_IDS, fixed: U.shuffle(D.burgers), diff: 'normal', back: 'exam' })));
    if (s.exams.length) {
      main.appendChild(h('div.panel', h('h3', 'Historial'),
        s.exams.slice(-8).reverse().map((e) => h('div.hist-row',
          h('span', new Date(e.date).toLocaleDateString()), h('span', e.type === 'completo' ? 'Completo' : 'Rápido'),
          h('span', e.correct + '/' + e.total), h('b.' + (e.pct >= 80 ? 'pass' : 'fail'), e.pct + '%')))));
    }
  });

  /* ================= MI PROGRESO ================= */
  UI.register('progress', (main) => {
    main.appendChild(UI.backBar('Mi progreso'));
    const s = S();
    const L = BM.Score.level(s.xp); const nx = BM.Score.nextLevel(s.xp);
    const acc = s.answered ? Math.round(s.correct / s.answered * 100) : 0;
    const mastered = D.burgers.filter((b) => BM.SRS.isMastered(b.id)).length;
    main.appendChild(h('div.level-card',
      h('div.level-icon', L.icon),
      h('div.level-body',
        h('div.muted', 'Nivel ' + L.n),
        h('h2', L.name),
        h('div.xpbar.xpbar-lg', h('div.xpbar-fill', { style: { width: Math.round(BM.Score.levelProgress(s.xp) * 100) + '%' } })),
        h('div.muted', s.xp + ' XP' + (nx ? ` · faltan ${nx.xp - s.xp} XP para ${nx.name}` : ' · ¡nivel máximo!'))),
      h('div.levels', BM.Score.LEVELS.map((l) => h('span.lv' + (s.xp >= l.xp ? '.on' : ''), l.icon + ' ' + l.name + ' (' + l.xp + ')')))));
    main.appendChild(h('div.stat-grid',
      h('div.stat', h('b', acc + '%'), h('span', 'Precisión')),
      h('div.stat', h('b', String(s.answered)), h('span', 'Respuestas')),
      h('div.stat', h('b', String(s.bestStreak)), h('span', 'Mejor racha')),
      h('div.stat', h('b', mastered + '/42'), h('span', 'Dominadas'))));

    main.appendChild(h('div.panel', h('h3', 'Precisión por modo'),
      BM.MODE_IDS.map((id) => {
        const m = s.modes[id]; const p = m.answered ? Math.round(m.scoreSum / m.answered * 100) : 0;
        return h('div.bar-row', h('span.bar-label', BM.Modes[id].icon + ' ' + BM.Modes[id].name),
          h('div.bar', h('div.bar-fill', { style: { width: p + '%' } })), h('span.bar-val', m.answered ? p + '%' : '—'));
      })));

    main.appendChild(h('div.panel', h('h3', '🏅 Medallas (' + Object.keys(s.medals).length + '/' + BM.Score.MEDALS.length + ')'),
      h('div.medal-grid', BM.Score.MEDALS.map((m) => h('div.medal' + (s.medals[m.id] ? '.on' : ''), { title: m.desc },
        h('span.medal-icon', s.medals[m.id] ? m.icon : '🔒'), h('b', m.name), h('small', m.desc))))));

    const hardest = BM.SRS.hardest(6);
    main.appendChild(h('div.panel', h('h3', '⚠️ Las que más te cuestan'),
      hardest.length ? hardest.map((b) => h('button.fail-item', { onclick: () => UI.go('learnDetail', { id: b.id, back: 'progress' }) },
        h('span', U.burgerName(b)), h('span.muted', s.burgers[b.id].wrong + ' fallos'), UI.masteryRing(BM.SRS.mastery(b.id), 36)))
        : h('p.muted', 'Todavía no hay datos. ¡Juega unas partidas!'),
      hardest.length ? h('button.btn.btn-orange', { onclick: () => UI.go('session', { title: 'Repaso de difíciles', modes: BM.MODE_IDS, pool: hardest, count: s.settings.length, diff: s.settings.difficulty, back: 'progress' }) }, '🎯 Practicar estas') : null));

    const errs = BM.SRS.topErrors(10);
    main.appendChild(h('div.panel', h('h3', '❌ Errores más comunes'),
      errs.length ? errs.map((e) => h('div.err-row', h('b', U.burgerName(U.burger(e.id))), h('span', BM.SRS.errorText(e.code)), h('span.err-n', '×' + e.c)))
        : h('p.muted', 'Sin errores registrados.')));

    const sorted = D.burgers.slice().sort((a, b) => BM.SRS.mastery(b.id) - BM.SRS.mastery(a.id));
    main.appendChild(h('div.panel', h('h3', 'Dominio por hamburguesa'),
      sorted.map((b) => {
        const m = BM.SRS.mastery(b.id);
        return h('button.bar-row.bar-click', { onclick: () => UI.go('learnDetail', { id: b.id, back: 'progress' }) },
          h('span.bar-label', U.burgerName(b)),
          h('div.bar', h('div.bar-fill.' + (BM.SRS.isMastered(b.id) ? 'done' : m >= 50 ? 'mid' : 'low'), { style: { width: m + '%' } })),
          h('span.bar-val', m + '%'));
      })));

    main.appendChild(h('div.center', h('button.btn.btn-ghost.btn-sm', {
      onclick: () => UI.confirm('¿Borrar TODO tu progreso (XP, medallas, estadísticas)? No se puede deshacer.', 'Borrar progreso', () => { BM.Store.reset(); UI.go('menu'); UI.toast('Progreso reiniciado'); }),
    }, '🗑 Reiniciar progreso')));
  });

  /* ================= NOTAS DE DATOS ================= */
  UI.register('notes', (main) => {
    main.appendChild(UI.backBar('Notas sobre los datos'));
    main.appendChild(h('p', 'Todos los datos provienen exclusivamente del documento ', h('b', 'BUILD HAMBURGUESAS COLOMBIA'),
      ' (43 páginas: portada + 42 hamburguesas). Estas son las decisiones tomadas donde el documento era ambiguo o tenía errores de escritura:'));
    main.appendChild(h('div.panel', D.dataNotes.map((n) => h('div.note', h('b', n.title), h('p', n.text)))));
    main.appendChild(h('div.panel', h('h3', 'Notas por hamburguesa'),
      D.burgers.filter((b) => b.notes.length).map((b) => h('div.note',
        h('button.link', { onclick: () => UI.go('learnDetail', { id: b.id, back: 'notes' }) }, U.burgerName(b) + ' (pág. ' + b.page + ')'),
        h('ul', b.notes.map((x) => h('li', x)))))));
  });
}(window.BM));
