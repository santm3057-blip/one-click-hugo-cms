/* Componentes de interfaz compartidos: navegación, cabecera, efectos, ilustraciones */
(function (BM) {
  const U = BM.U;
  const h = U.h;

  const UI = {
    screens: {},
    current: null,
    cleanup: null,

    register(name, fn) { UI.screens[name] = fn; },

    go(name, params) {
      if (UI.cleanup) { try { UI.cleanup(); } catch (e) { /* noop */ } UI.cleanup = null; }
      const main = document.getElementById('main');
      main.innerHTML = '';
      main.className = 'screen-' + name;
      UI.current = name;
      UI.screens[name](main, params || {});
      window.scrollTo(0, 0);
      UI.header();
    },
    onLeave(fn) { UI.cleanup = fn; },

    /* ---------- Cabecera con nivel y XP ---------- */
    header() {
      const s = BM.Store.s;
      const L = BM.Score.level(s.xp);
      const nx = BM.Score.nextLevel(s.xp);
      const hd = document.getElementById('hud');
      hd.innerHTML = '';
      hd.appendChild(h('button.brand', { onclick: () => UI.go('menu'), 'aria-label': 'Menú principal' },
        h('span.brand-icon', '🍔'), h('span.brand-text', 'Burger', h('b', 'Master'))));
      hd.appendChild(h('div.hud-level', { title: nx ? `${nx.xp - s.xp} XP para ${nx.name}` : 'Nivel máximo' },
        h('span.lvl-badge', L.icon + ' ' + L.n),
        h('div.lvl-info',
          h('div.lvl-name', L.name),
          h('div.xpbar', h('div.xpbar-fill', { style: { width: Math.round(BM.Score.levelProgress(s.xp) * 100) + '%' } })),
          h('div.lvl-xp', s.xp + ' XP' + (nx ? ' / ' + nx.xp : ''))),
      ));
      hd.appendChild(h('div.hud-right',
        s.streak >= 2 ? h('span.hud-streak', '🔥 ' + s.streak) : null,
        h('button.icon-btn', {
          onclick: () => { s.settings.sound = !s.settings.sound; BM.Store.save(); UI.header(); BM.Sound.play('tap'); },
          'aria-label': s.settings.sound ? 'Silenciar sonidos' : 'Activar sonidos',
          title: s.settings.sound ? 'Sonido activado' : 'Sonido desactivado',
        }, s.settings.sound ? '🔊' : '🔇')));
    },

    /* ---------- Efectos ---------- */
    toast(html, kind) {
      const t = h('div.toast' + (kind ? '.toast-' + kind : ''), { html });
      document.getElementById('toasts').appendChild(t);
      setTimeout(() => t.classList.add('out'), 2800);
      setTimeout(() => t.remove(), 3300);
    },
    confetti(n) {
      const layer = document.getElementById('fx');
      const colors = ['#FFC72C', '#DA291C', '#27AE60', '#FF8A00', '#ffffff', '#8B4513'];
      for (let i = 0; i < (n || 40); i++) {
        const p = h('i.confetti');
        p.style.left = (Math.random() * 100) + 'vw';
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = (Math.random() * 0.3) + 's';
        p.style.animationDuration = (1.2 + Math.random() * 1) + 's';
        p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
        p.style.transform = `rotate(${Math.random() * 360}deg)`;
        layer.appendChild(p);
        setTimeout(() => p.remove(), 2600);
      }
    },
    floatText(text, kind, anchor) {
      const r = anchor ? anchor.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0 };
      const f = h('div.float-text.' + (kind || 'good'), text);
      f.style.left = (r.left + r.width / 2) + 'px';
      f.style.top = (r.top) + 'px';
      document.getElementById('fx').appendChild(f);
      setTimeout(() => f.remove(), 1400);
    },
    shake(el) {
      if (!el) return;
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    },
    modal(content, opts) {
      opts = opts || {};
      const close = () => { bg.remove(); };
      const bg = h('div.modal-bg', { onclick: (e) => { if (e.target === bg && !opts.locked) close(); } },
        h('div.modal', content));
      document.body.appendChild(bg);
      return close;
    },
    confirm(text, okText, onOk) {
      const close = UI.modal([
        h('p.modal-text', text),
        h('div.row-btns',
          h('button.btn.btn-ghost', { onclick: () => close() }, 'Cancelar'),
          h('button.btn.btn-red', { onclick: () => { close(); onOk(); } }, okText)),
      ]);
    },

    /* Celebraciones tras actualizar progreso */
    celebrate(res) {
      if (res && res.levelUp) {
        BM.Sound.play('levelup');
        UI.confetti(80);
        UI.modal([
          h('div.levelup-icon', res.levelUp.icon),
          h('h2', '¡Subiste de nivel!'),
          h('p.modal-text', 'Ahora eres ', h('b', res.levelUp.name), ' (nivel ' + res.levelUp.n + ').'),
          res.levelUp.n === 2 || res.levelUp.n === 3
            ? h('p.modal-sub', '🔓 Desbloqueaste la dificultad ' + (res.levelUp.n === 2 ? 'Normal' : 'Difícil') + '.') : null,
          h('div.row-btns', h('button.btn.btn-yellow', { onclick: (e) => e.target.closest('.modal-bg').remove() }, '¡Genial!')),
        ]);
      }
      BM.Score.checkMedals().forEach((m, i) => {
        setTimeout(() => {
          BM.Sound.play('medal');
          UI.toast(`<span class="toast-icon">${m.icon}</span><div><b>¡Medalla desbloqueada!</b><br>${m.name}</div>`, 'medal');
        }, 400 + i * 700);
      });
      BM.Store.save();
      UI.header();
    },

    /* ---------- Ilustraciones ---------- */
    ingImg(key, cls) {
      const im = h('img' + (cls ? '.' + cls : ''), { src: U.img(key), alt: U.ing(key).name, loading: 'lazy', draggable: 'false' });
      im.onerror = () => { im.replaceWith(h('span.img-fallback.cat-' + U.cat(key), U.ing(key).name[0])); };
      return im;
    },

    /* Hamburguesa apilada: la capa 1 (base) abajo, la última (corona) arriba.
       keys: capas; hidden: índices que se muestran como "?" */
    stack(keys, opts) {
      opts = opts || {};
      const wrap = h('div.stack' + (opts.small ? '.stack-small' : ''));
      const n = keys.length;
      keys.slice().reverse().forEach((k, ri) => {
        const i = n - 1 - ri;
        if (opts.hidden && opts.hidden.includes(i)) {
          wrap.appendChild(h('div.stack-layer.stack-hidden', { style: { zIndex: n - ri } }, h('span', '?')));
          return;
        }
        if (!k) return;
        const cat = U.cat(k);
        const id = U.ingId(k);
        const layer = h('div.stack-layer.cat-' + cat + '.ing-' + id, { style: { zIndex: n - ri } }, UI.ingImg(k));
        if (opts.animateLast && i === n - 1) layer.classList.add('drop-in');
        wrap.appendChild(layer);
      });
      if (!n) wrap.appendChild(h('div.stack-empty', 'Tu hamburguesa aparecerá aquí'));
      return wrap;
    },

    /* Fila de capa: número + foto + nombre + cantidad */
    layerRow(key, i, extra) {
      return h('div.layer-row.cat-' + U.cat(key),
        i !== null && i !== undefined ? h('span.layer-num', String(i + 1)) : null,
        h('span.layer-thumb', UI.ingImg(key)),
        h('span.layer-name', U.ing(key).name, U.qty(key) ? h('span.layer-qty', U.qty(key)) : null),
        extra || null);
    },

    /* Ficha seleccionable de ingrediente */
    tile(key, onClick, extraCls) {
      return h('button.tile.cat-' + U.cat(key) + (extraCls ? '.' + extraCls : ''), { onclick: onClick, type: 'button', 'data-key': key },
        h('span.tile-img', UI.ingImg(key)),
        h('span.tile-name', U.ing(key).name),
        U.qty(key) ? h('span.tile-qty', U.qty(key)) : null);
    },

    masteryRing(pct, size) {
      size = size || 44;
      const r = (size - 6) / 2; const c = 2 * Math.PI * r;
      const div = h('div.ring', { style: { width: size + 'px', height: size + 'px' } });
      div.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
      </svg><span>${pct}%</span>`;
      return div;
    },

    statusChip(id) {
      const st = BM.SRS.status(id);
      const map = { nueva: '🆕 Nueva', dificil: '⚠️ Por reforzar', aprendiendo: '📈 Aprendiendo', dominada: '⭐ Dominada' };
      return h('span.chip.chip-' + st, map[st]);
    },

    backBar(title, onBack) {
      return h('div.backbar',
        h('button.btn.btn-ghost.btn-sm', { onclick: onBack || (() => UI.go('menu')) }, '← Volver'),
        h('h1.screen-title', title));
    },
  };

  BM.UI = UI;
}(window.BM));
