/* MODO 2: ¿Qué le falta? */
(function (BM) {
  const U = BM.U; const UI = BM.UI; const h = U.h;

  BM.Modes.missing = {
    id: 'missing',
    name: '¿Qué le falta?',
    icon: '🧩',
    desc: 'Algunas capas están ocultas. Descubre qué ingrediente va en cada hueco.',
    render(area, q, done) {
      const keys = U.keys(q.burger);
      const nHidden = Math.min({ facil: 1, normal: 2, dificil: 3 }[q.diff], keys.length - 2);
      const nOpts = { facil: 3, normal: 4, dificil: 6 }[q.diff];
      const hidden = U.shuffle(keys.map((_, i) => i)).slice(0, nHidden).sort((a, b) => a - b);
      const answers = {};
      let cur = 0;
      let mistakes = 0;
      const errors = [];

      const stackBox = h('div.missing-stack');
      const listBox = h('div.missing-list');
      const optsBox = h('div.options');
      const prompt = h('div.q-sub');

      function drawBurger() {
        stackBox.innerHTML = '';
        const shown = keys.map((k, i) => (hidden.includes(i) && answers[i] === undefined ? null : (answers[i] || k)));
        stackBox.appendChild(UI.stack(shown.map((k) => k || keys[0]), { small: true, hidden: hidden.filter((i) => answers[i] === undefined) }));
        listBox.innerHTML = '';
        keys.forEach((k, i) => {
          if (hidden.includes(i) && answers[i] === undefined) {
            listBox.appendChild(h('div.layer-row.layer-hidden' + (hidden[cur] === i ? '.layer-current' : ''),
              h('span.layer-num', String(i + 1)), h('span.layer-thumb', '?'), h('span.layer-name', '¿…?')));
          } else if (hidden.includes(i)) {
            const r = UI.layerRow(answers[i], i);
            r.classList.add(answers[i] === k ? 'mark-ok' : 'mark-bad');
            listBox.appendChild(r);
          } else listBox.appendChild(UI.layerRow(k, i));
        });
      }

      function ask() {
        optsBox.innerHTML = '';
        const idx = hidden[cur];
        const right = keys[idx];
        prompt.textContent = `Hueco ${cur + 1} de ${hidden.length}: ¿qué va en la capa ${idx + 1}?`;
        const opts = U.shuffle([right].concat(U.distractorKeys([right], nOpts - 1, { exclude: [right], hard: q.diff !== 'facil' })));
        opts.forEach((k) => {
          const t = UI.tile(k, () => choose(k, t));
          optsBox.appendChild(t);
        });
        drawBurger();
      }

      function choose(k, el) {
        const idx = hidden[cur];
        const right = keys[idx];
        answers[idx] = k;
        optsBox.querySelectorAll('.tile').forEach((t) => { t.disabled = true; });
        if (k === right) { el.classList.add('tile-ok'); BM.Sound.play('drop'); } else {
          mistakes++;
          errors.push('cambia>' + right + '>' + k);
          el.classList.add('tile-bad');
          UI.shake(el);
          BM.Sound.play('remove');
          optsBox.querySelectorAll('.tile').forEach((t) => { if (t.dataset.key === right) t.classList.add('tile-ok'); });
        }
        cur++;
        setTimeout(() => {
          if (cur < hidden.length) ask();
          else {
            drawBurger();
            optsBox.innerHTML = '';
            prompt.textContent = 'Así queda la hamburguesa (verde = acertaste, rojo = fallaste).';
            if (mistakes) {
              optsBox.appendChild(h('div.reveal', h('h4', 'Capas que estaban ocultas:'),
                hidden.map((i) => UI.layerRow(keys[i], i))));
            }
            done({ score: (hidden.length - mistakes) / hidden.length, errors });
          }
        }, k === right ? 350 : 1100);
      }

      area.appendChild(h('div.q-prompt',
        h('div.q-label', '¿Qué le falta a…?'),
        h('div.q-burger-name', U.burgerName(q.burger))));
      area.appendChild(h('div.missing-wrap', stackBox, listBox));
      area.appendChild(prompt);
      area.appendChild(optsBox);
      ask();
    },
  };
}(window.BM));
