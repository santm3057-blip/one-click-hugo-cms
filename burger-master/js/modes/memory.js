/* MODO 4: Memoria contrarreloj */
(function (BM) {
  const U = BM.U; const UI = BM.UI; const h = U.h;

  BM.Modes.memory = {
    id: 'memory',
    name: 'Memoria contrarreloj',
    icon: '⏱️',
    desc: 'Memoriza la hamburguesa unos segundos y luego reconstrúyela antes de que acabe el tiempo.',
    render(area, q, done) {
      const keys = U.keys(q.burger);
      const memoSecs = { facil: 12, normal: 8, dificil: 5 }[q.diff] + Math.round(keys.length * 0.5);
      const perLayer = { facil: 9, normal: 7, dificil: 5 }[q.diff];
      const buildSecs = 15 + keys.length * perLayer;
      let timers = [];
      const clear = () => { timers.forEach((t) => clearInterval(t)); timers = []; };
      BM.UI.onLeave(clear);

      area.appendChild(h('div.q-prompt',
        h('div.q-label', 'Memoriza:'),
        h('div.q-burger-name', U.burgerName(q.burger))));
      const timeBar = h('div.timebar', h('div.timebar-fill'));
      const timeTxt = h('div.time-txt');
      area.appendChild(h('div.timer-wrap', timeTxt, timeBar));

      // Fase 1: memorizar
      const memo = h('div.memo',
        h('div.identify-wrap',
          h('div.missing-stack', UI.stack(keys, { small: true })),
          h('div.missing-list', keys.map((k, i) => UI.layerRow(k, i)))),
        h('div.action-bar', h('button.btn.btn-yellow.btn-lg', { onclick: () => startBuild() }, '¡Ya me la sé! →')));
      area.appendChild(memo);
      let left = memoSecs;
      const fill = timeBar.firstChild;
      function paint(total) {
        timeTxt.textContent = '⏱ ' + left + ' s';
        fill.style.width = (left / total * 100) + '%';
        timeBar.classList.toggle('low', left <= 5);
      }
      paint(memoSecs);
      timers.push(setInterval(() => {
        left--; paint(memoSecs);
        if (left <= 0) startBuild();
      }, 1000));

      let started = false;
      function startBuild() {
        if (started) return;
        started = true;
        clear();
        memo.remove();
        area.querySelector('.q-label').textContent = 'Reconstruye de memoria:';
        left = buildSecs;
        timeBar.classList.add('build');
        paint(buildSecs);
        const t0 = Date.now();
        let finished = false;
        const builder = BM.Builder(area, {
          burger: q.burger,
          diff: q.diff,
          onSubmit: (g) => {
            finished = true;
            clear();
            const used = (Date.now() - t0) / 1000;
            const speed = U.clamp(1 - used / buildSecs, 0, 1);
            // precisión manda; la rapidez aporta un bonus que solo cuenta si es perfecto
            const score = g.exact ? 1 : g.score;
            area.appendChild(h('div.hint-box', g.exact
              ? `⚡ Tiempo: ${Math.round(used)} s de ${buildSecs} s — bonus de rapidez ${Math.round(speed * 100)}%`
              : `Tiempo usado: ${Math.round(used)} s · Precisión: ${Math.round(g.score * 100)}%`));
            done({ score, errors: g.errors, speedBonus: g.exact ? speed : 0 });
          },
        });
        timers.push(setInterval(() => {
          left--; paint(buildSecs);
          if (left <= 5 && left > 0) BM.Sound.play('tick');
          if (left <= 0 && !finished) { clear(); builder.submit(); }
        }, 1000));
      }
    },
  };
}(window.BM));
