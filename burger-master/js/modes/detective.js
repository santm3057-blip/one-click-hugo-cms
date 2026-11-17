/* MODO 5: Detective de errores */
(function (BM) {
  const U = BM.U; const UI = BM.UI; const h = U.h;

  /* Genera una versión con errores de la hamburguesa.
     Devuelve { items:[{key, truth:'ok'|'wrong'|'order'}], gaps:Set(posiciones con capa faltante) } */
  function corrupt(keys, nErr) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const muts = [];
      const used = new Set();
      const free = (i, w) => { for (let j = i - 1; j <= i + w; j++) if (used.has(j)) return false; return true; };
      const take = (i, w) => { for (let j = i; j < i + w; j++) used.add(j); };
      const types = U.shuffle(['wrong', 'missing', 'order', 'wrong', 'missing', 'order']).slice(0, nErr);
      let okAll = true;
      types.forEach((t) => {
        const cands = [];
        for (let i = 0; i < keys.length; i++) {
          if (t === 'missing') {
            if (i > 0 && i < keys.length - 1 && keys[i - 1] !== keys[i] && keys[i + 1] !== keys[i] && free(i, 1)) cands.push(i);
          } else if (t === 'order') {
            if (i > 0 && i + 1 < keys.length - 1 && keys[i] !== keys[i + 1] && free(i, 2)) cands.push(i);
          } else if (free(i, 1)) cands.push(i);
        }
        if (!cands.length) { okAll = false; return; }
        const i = U.pick(cands);
        if (t === 'order') take(i, 2); else take(i, 1);
        let repl = null;
        if (t === 'wrong') {
          const k = keys[i];
          const isBread = U.cat(k) === 'pan';
          const role = U.ingId(k).split('_')[0]; // base / corona / bigmac
          const pool = U.allKeys.filter((x) => x !== k && x !== keys[i - 1] && x !== keys[i + 1] && (isBread
            ? U.cat(x) === 'pan' && U.ingId(x).split('_')[0] === role
            : U.cat(x) !== 'pan'));
          const near = pool.filter((x) => U.ingId(x) === U.ingId(k) || U.cat(x) === U.cat(k));
          repl = U.pick(near.length && Math.random() < 0.75 ? near : pool);
          if (!repl) { okAll = false; return; }
        }
        muts.push({ t, i, repl });
      });
      if (!okAll || !muts.length) continue;
      const items = []; const gaps = new Set();
      for (let i = 0; i < keys.length; i++) {
        const m = muts.find((x) => x.i === i);
        if (!m) { items.push({ key: keys[i], truth: 'ok' }); continue; }
        if (m.t === 'missing') { gaps.add(items.length); continue; }
        if (m.t === 'wrong') { items.push({ key: m.repl, truth: 'wrong' }); continue; }
        items.push({ key: keys[i + 1], truth: 'order' }, { key: keys[i], truth: 'order' });
        i++;
      }
      return { items, gaps, muts };
    }
    return null;
  }

  const STATES = ['ok', 'wrong', 'order'];
  const STATE_TXT = { ok: '✓ Correcto', wrong: '✗ Incorrecto', order: '↕ Fuera de orden' };

  BM.Modes.detective = {
    id: 'detective',
    name: 'Detective de errores',
    icon: '🕵️',
    desc: 'Esta hamburguesa está mal montada: encuentra ingredientes incorrectos, faltantes o fuera de orden.',
    corrupt,
    render(area, q, done) {
      const keys = U.keys(q.burger);
      const nErr = q.diff === 'facil' ? 1 : q.diff === 'normal' ? 2 : 1 + U.rand(3);
      const c = corrupt(keys, nErr) || corrupt(keys, 1);
      const marks = c.items.map(() => 'ok');
      const gapMarks = new Set();
      let locked = false;

      area.appendChild(h('div.q-prompt',
        h('div.q-label', 'Encuentra los errores en:'),
        h('div.q-burger-name', U.burgerName(q.burger))));
      area.appendChild(h('div.q-sub', q.diff === 'dificil'
        ? 'Puede haber uno o varios errores.'
        : `Hay ${c.muts.length} error${c.muts.length > 1 ? 'es' : ''}.`,
      ' Toca una capa para marcarla (Correcto → Incorrecto → Fuera de orden). Toca «+ falta algo aquí» donde falte una capa.'));

      const list = h('div.detective-list');
      function draw() {
        list.innerHTML = '';
        for (let g = 0; g <= c.items.length; g++) {
          if (g > 0 && g < c.items.length) {
            const gap = h('button.gap-btn' + (gapMarks.has(g) ? '.gap-on' : ''), {
              type: 'button',
              disabled: locked,
              onclick: () => { if (gapMarks.has(g)) gapMarks.delete(g); else gapMarks.add(g); BM.Sound.play('tap'); draw(); },
            }, gapMarks.has(g) ? '⚠ Aquí falta una capa' : '+ falta algo aquí');
            if (locked) {
              const truth = c.gaps.has(g); const mine = gapMarks.has(g);
              if (truth || mine) gap.classList.add(truth && mine ? 'res-ok' : 'res-bad');
              if (truth) gap.textContent = (mine ? '✓ ' : '✗ ') + 'Faltaba: ' + U.label(keys[c.muts.find((m) => m.t === 'missing' && positionOfGap(m) === g).i]);
            }
            list.appendChild(gap);
          }
          if (g === c.items.length) break;
          const it = c.items[g];
          const st = marks[g];
          const row = UI.layerRow(it.key, g, h('span.det-state.st-' + st, STATE_TXT[st]));
          row.classList.add('det-row', 'st-' + st);
          if (!locked) {
            row.setAttribute('role', 'button');
            row.tabIndex = 0;
            row.onclick = () => { marks[g] = STATES[(STATES.indexOf(marks[g]) + 1) % 3]; BM.Sound.play('tap'); draw(); };
          } else {
            const good = marks[g] === it.truth;
            row.classList.add(good ? 'res-ok' : 'res-bad');
            if (it.truth !== 'ok' || !good) {
              row.appendChild(h('span.det-truth', 'Era: ' + STATE_TXT[it.truth].slice(2)));
            }
          }
          list.appendChild(row);
        }
      }
      // posición (en la lista mostrada) del hueco generado por una mutación "missing"
      function positionOfGap(m) {
        let pos = 0;
        for (let i = 0; i < m.i; i++) {
          const mm = c.muts.find((x) => x.i === i);
          if (mm && mm.t === 'missing') continue;
          pos++;
        }
        return pos;
      }
      draw();
      area.appendChild(list);

      const btn = h('button.btn.btn-red.btn-lg', { onclick: submit }, '🔎 Comprobar');
      const bar = h('div.action-bar', btn);
      area.appendChild(bar);

      function submit() {
        if (locked) return;
        locked = true;
        bar.remove();
        let units = 0; let good = 0;
        const errors = [];
        c.items.forEach((it, i) => {
          if (it.truth === 'ok' && marks[i] === 'ok') return;
          units++;
          if (marks[i] === it.truth) good++;
          else if (it.truth === 'ok') errors.push('falsaalarma');
          else errors.push('nodetecta>' + it.truth);
        });
        for (let g = 1; g < c.items.length; g++) {
          const t = c.gaps.has(g); const m = gapMarks.has(g);
          if (!t && !m) continue;
          units++;
          if (t && m) good++;
          else if (t) errors.push('nodetecta>missing');
          else errors.push('falsaalarma');
        }
        draw();
        area.appendChild(h('div.reveal', h('h4', 'Combinación correcta:'), keys.map((k, i) => UI.layerRow(k, i))));
        done({ score: units ? good / units : 1, errors: U.uniq(errors) });
      }
    },
  };
}(window.BM));
