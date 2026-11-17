/* MODO 3: Identifica la hamburguesa */
(function (BM) {
  const U = BM.U; const UI = BM.UI; const h = U.h;
  const D = window.BM_DATA;

  BM.Modes.identify = {
    id: 'identify',
    name: 'Identifica la hamburguesa',
    icon: '🔍',
    desc: 'Ves una combinación de capas: ¿a qué hamburguesa pertenece?',
    render(area, q, done) {
      const keys = U.keys(q.burger);
      const nOpts = { facil: 4, normal: 4, dificil: 6 }[q.diff];
      let distract;
      if (q.diff === 'facil') {
        // mezcla: 1 parecida + aleatorias
        const sim = U.similarBurgers(q.burger, 1);
        const rest = U.shuffle(D.burgers.filter((b) => b.id !== q.burger.id && !sim.includes(b)));
        distract = sim.concat(rest).slice(0, nOpts - 1);
      } else {
        distract = U.similarBurgers(q.burger, nOpts - 1);
      }
      const options = U.shuffle([q.burger].concat(distract));

      area.appendChild(h('div.q-prompt', h('div.q-label', '¿Qué hamburguesa es esta?')));
      area.appendChild(h('div.identify-wrap',
        h('div.missing-stack', UI.stack(keys, { small: true })),
        h('div.missing-list', keys.map((k, i) => UI.layerRow(k, i)))));
      const box = h('div.options.options-names');
      options.forEach((b) => {
        const btn = h('button.opt-name', { type: 'button', onclick: () => choose(b, btn), 'data-id': b.id }, U.burgerName(b));
        box.appendChild(btn);
      });
      area.appendChild(box);

      function choose(b, btn) {
        box.querySelectorAll('button').forEach((x) => { x.disabled = true; if (x.dataset.id === q.burger.id) x.classList.add('opt-ok'); });
        if (b.id === q.burger.id) done({ score: 1, errors: [] });
        else {
          btn.classList.add('opt-bad');
          UI.shake(btn);
          const d = U.diff(q.burger, b);
          const parts = [];
          if (d.sameSet) parts.push('Tiene los mismos ingredientes, pero en otro orden.');
          if (d.plus.length) parts.push('lleva además: ' + d.plus.map((x) => U.label(x.key) + (x.n > 1 ? ' ×' + x.n : '')).join(', '));
          if (d.minus.length) parts.push('no lleva: ' + d.minus.map((x) => U.label(x.key) + (x.n > 1 ? ' ×' + x.n : '')).join(', '));
          area.appendChild(h('div.hint-box', h('b', 'Diferencia: '), U.burgerName(b) + ' ' + parts.join(' · ')));
          done({ score: 0, errors: ['confunde>' + b.id] });
        }
      }
    },
  };
}(window.BM));
