/* Utilidades generales y helpers sobre los datos */
window.BM = window.BM || {};

(function (BM) {
  const D = window.BM_DATA;

  const U = {
    rand(n) { return Math.floor(Math.random() * n); },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
    uniq(arr) { return Array.from(new Set(arr)); },
    today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },

    /* Creación de elementos: h('div.clase#id', {attrs}, ...hijos) */
    h(tag, attrs, ...children) {
      const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
      const el = document.createElement(m[1] || 'div');
      (m[2].match(/[.#][\w-]+/g) || []).forEach((t) => {
        if (t[0] === '.') el.classList.add(t.slice(1)); else el.id = t.slice(1);
      });
      if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
        children.unshift(attrs); attrs = null;
      }
      if (attrs) {
        Object.entries(attrs).forEach(([k, v]) => {
          if (v === undefined || v === null || v === false) return;
          if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else if (k === 'html') el.innerHTML = v;
          else el.setAttribute(k, v === true ? '' : v);
        });
      }
      const add = (c) => {
        if (c === null || c === undefined || c === false) return;
        if (Array.isArray(c)) c.forEach(add);
        else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
      };
      children.forEach(add);
      return el;
    },

    /* ---------- Capas ---------- */
    // Una capa es "ingrediente + cantidad". Clave: "ing|cantidad"
    key(step) { return step[0] + '|' + (step[1] || ''); },
    keys(burger) { return burger.steps.map(U.key); },
    ing(key) { return D.ingredients[key.split('|')[0]]; },
    ingId(key) { return key.split('|')[0]; },
    qty(key) { return key.split('|')[1] || ''; },
    label(key) { const q = U.qty(key); return U.ing(key).name + (q ? ' · ' + q : ''); },
    img(key) { return 'img/ingredients/' + U.ing(key).img + '.png'; },
    cat(key) { return U.ing(key).cat; },

    burgerName(b) { return b.name + (b.variant ? ' · ' + b.variant : ''); },
    burger(id) { return D.burgers.find((b) => b.id === id); },
    family(id) { return D.families.find((f) => f.id === id); },

    // Todas las capas distintas que existen en el documento
    allKeys: null,

    /* ---------- Comparaciones ---------- */
    lcs(a, b) {
      const dp = Array(a.length + 1).fill(0).map(() => Array(b.length + 1).fill(0));
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
      return dp[a.length][b.length];
    },
    lev(a, b) {
      const dp = Array(a.length + 1).fill(0).map((_, i) => [i].concat(Array(b.length).fill(0)));
      for (let j = 1; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
      }
      return dp[a.length][b.length];
    },
    counts(keys) { const c = {}; keys.forEach((k) => { c[k] = (c[k] || 0) + 1; }); return c; },
    similarity(b1, b2) {
      const a = U.keys(b1); const b = U.keys(b2);
      const ca = U.counts(a); const cb = U.counts(b);
      let inter = 0; let uni = 0;
      U.uniq(a.concat(b)).forEach((k) => {
        inter += Math.min(ca[k] || 0, cb[k] || 0);
        uni += Math.max(ca[k] || 0, cb[k] || 0);
      });
      const jac = inter / uni;
      const ed = 1 - U.lev(a, b) / Math.max(a.length, b.length);
      return 0.5 * jac + 0.5 * ed + (b1.family === b2.family ? 0.05 : 0);
    },
    similarBurgers(b, n) {
      return D.burgers.filter((x) => x.id !== b.id)
        .map((x) => ({ b: x, s: U.similarity(b, x) }))
        .sort((p, q) => q.s - p.s).slice(0, n).map((x) => x.b);
    },
    // Diferencias de "other" respecto a "b" (qué cambia si pasas de b a other)
    diff(b, other) {
      const a = U.keys(b); const o = U.keys(other);
      const ca = U.counts(a); const co = U.counts(o);
      const plus = []; const minus = [];
      U.uniq(a.concat(o)).forEach((k) => {
        const d = (co[k] || 0) - (ca[k] || 0);
        if (d > 0) plus.push({ key: k, n: d });
        if (d < 0) minus.push({ key: k, n: -d });
      });
      const sameSet = !plus.length && !minus.length;
      return { plus, minus, sameSet, sameOrder: a.join() === o.join() };
    },

    /* Distractores: capas parecidas a "key" pero distintas */
    distractorKeys(correctKeys, n, opts) {
      opts = opts || {};
      const exclude = new Set(opts.exclude || correctKeys);
      const pool = U.allKeys.filter((k) => !exclude.has(k));
      const scored = pool.map((k) => {
        let s = Math.random();
        correctKeys.forEach((c) => {
          if (U.ingId(c) === U.ingId(k)) s += opts.hard ? 3 : 1.2; // misma cosa, otra cantidad
          else if (U.cat(c) === U.cat(k)) s += opts.hard ? 1.5 : 0.6;
        });
        return { k, s };
      });
      return scored.sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.k);
    },
  };

  U.allKeys = U.uniq(D.burgers.flatMap((b) => U.keys(b)));
  BM.U = U;
}(window.BM));
