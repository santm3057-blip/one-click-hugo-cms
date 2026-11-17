/* MODO 1: Construye la hamburguesa  (+ componente Builder reutilizado por Memoria) */
(function (BM) {
  const U = BM.U; const UI = BM.UI; const h = U.h;
  BM.Modes = BM.Modes || {};

  /* ---------- Corrección de una secuencia de capas ---------- */
  BM.Grade = {
    sequence(answer, correct) {
      const exact = answer.length === correct.length && answer.every((k, i) => k === correct[i]);
      const score = exact ? 1 : U.lcs(answer, correct) / Math.max(answer.length, correct.length, 1);
      const ca = U.counts(answer); const cc = U.counts(correct);
      let minus = []; let plus = [];
      U.uniq(answer.concat(correct)).forEach((k) => {
        const d = (ca[k] || 0) - (cc[k] || 0);
        for (let i = 0; i < Math.abs(d); i++) (d > 0 ? plus : minus).push(k);
      });
      const errors = [];
      // Mismo ingrediente con otra cantidad -> "cambia"
      minus = minus.filter((m) => {
        const j = plus.findIndex((p) => U.ingId(p) === U.ingId(m));
        if (j >= 0) { errors.push('cambia>' + m + '>' + plus[j]); plus.splice(j, 1); return false; }
        return true;
      });
      minus.forEach((m) => errors.push('falta>' + m));
      plus.forEach((p) => errors.push('sobra>' + p));
      if (!exact && !errors.length) errors.push('orden');
      const perPos = answer.map((k, i) => (k === correct[i] ? 'ok' : correct.includes(k) ? 'move' : 'bad'));
      return { exact, score: Math.round(score * 100) / 100, errors: U.uniq(errors), perPos };
    },

    /* Vista comparativa respuesta vs. correcta */
    compareView(answer, correct, g) {
      const col = (title, keys, marks) => h('div.compare-col',
        h('h4', title),
        keys.length ? keys.map((k, i) => {
          const row = UI.layerRow(k, i);
          if (marks) row.classList.add('mark-' + marks[i]);
          return row;
        }) : h('p.muted', '(vacía)'));
      return h('div.compare', col('Tu respuesta', answer, g.perPos), col('Combinación correcta', correct, null),
        g.exact ? null : h('div.compare-legend',
          h('span.mark-ok', '■ bien colocado'), h('span.mark-move', '■ lleva este ingrediente, pero no en esa posición'),
          h('span.mark-bad', '■ no lleva este ingrediente / cantidad')));
    },
  };

  /* ---------- Builder: zona de montaje con fichas ---------- */
  BM.Builder = function (root, opts) {
    const burger = opts.burger;
    const correct = U.keys(burger);
    const diff = opts.diff;
    const nDistr = { facil: 4, normal: 8, dificil: 14 }[diff];
    const correctUnique = U.uniq(correct);
    const pool = U.shuffle(correctUnique.concat(U.distractorKeys(correctUnique, nDistr, { hard: diff !== 'facil' })));
    const answer = [];
    let locked = false;

    const preview = h('div.build-preview');
    const list = h('div.build-list');
    const counter = h('div.build-counter');
    const tiles = h('div.tiles');

    function redraw(animate) {
      preview.innerHTML = '';
      preview.appendChild(UI.stack(answer, { small: true, animateLast: animate }));
      list.innerHTML = '';
      if (!answer.length) list.appendChild(h('p.muted.center', 'Toca los ingredientes en orden: empieza por la BASE y termina con la CORONA.'));
      answer.forEach((k, i) => {
        list.appendChild(UI.layerRow(k, i, h('span.row-ctrls',
          h('button.mini', { onclick: () => move(i, -1), disabled: i === 0 || locked, 'aria-label': 'Subir' }, '▲'),
          h('button.mini', { onclick: () => move(i, 1), disabled: i === answer.length - 1 || locked, 'aria-label': 'Bajar' }, '▼'),
          h('button.mini.mini-x', { onclick: () => removeAt(i), disabled: locked, 'aria-label': 'Quitar' }, '✕'))));
      });
      counter.textContent = diff === 'facil'
        ? `Capas: ${answer.length} / ${correct.length}`
        : `Capas: ${answer.length}`;
      if (opts.onChange) opts.onChange(answer.length);
    }
    function add(k, el) {
      if (locked) return;
      if (answer.length >= 20) return;
      answer.push(k);
      BM.Sound.play('drop');
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      redraw(true);
      list.scrollTop = list.scrollHeight;
    }
    function removeAt(i) { if (locked) return; answer.splice(i, 1); BM.Sound.play('remove'); redraw(); }
    function move(i, d) {
      if (locked) return;
      const j = i + d; if (j < 0 || j >= answer.length) return;
      [answer[i], answer[j]] = [answer[j], answer[i]];
      BM.Sound.play('tap'); redraw();
    }

    pool.forEach((k) => {
      const t = UI.tile(k, () => add(k, t));
      tiles.appendChild(t);
    });

    const submitBtn = h('button.btn.btn-red.btn-lg', { onclick: () => submit() }, '✔ Comprobar');
    const wrap = h('div.builder',
      h('div.build-top',
        h('div.build-stackbox', preview),
        h('div.build-listbox',
          h('div.build-listhead', counter,
            h('button.btn.btn-ghost.btn-sm', { onclick: () => { if (!locked && answer.length) { answer.pop(); BM.Sound.play('remove'); redraw(); } } }, '↶ Deshacer'),
            h('button.btn.btn-ghost.btn-sm', { onclick: () => { if (!locked) { answer.length = 0; redraw(); } } }, '🗑 Vaciar')),
          list)),
      h('div.tiles-head', h('b', 'Ingredientes disponibles'), h('span.muted', ' · se pueden usar varias veces')),
      tiles,
      h('div.action-bar', submitBtn));
    root.appendChild(wrap);
    redraw();

    function submit() {
      if (locked) return;
      locked = true;
      submitBtn.disabled = true;
      tiles.classList.add('disabled');
      const g = BM.Grade.sequence(answer.slice(), correct);
      wrap.querySelector('.action-bar').remove();
      wrap.appendChild(BM.Grade.compareView(answer.slice(), correct, g));
      redraw();
      opts.onSubmit(g, answer.slice());
    }
    return { submit, get answer() { return answer.slice(); } };
  };

  BM.Modes.build = {
    id: 'build',
    name: 'Construye la hamburguesa',
    icon: '🍔',
    desc: 'Monta la hamburguesa capa por capa, con los ingredientes y el orden exactos.',
    render(area, q, done) {
      area.appendChild(h('div.q-prompt',
        h('div.q-label', 'Construye:'),
        h('div.q-burger-name', U.burgerName(q.burger))));
      BM.Builder(area, {
        burger: q.burger,
        diff: q.diff,
        onSubmit: (g) => done({ score: g.score, errors: g.errors }),
      });
    },
  };
}(window.BM));
