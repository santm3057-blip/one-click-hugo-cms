#!/usr/bin/env node
/*
 * Verifica data/burgers.js.
 *
 *   node tools/verify-data.js                 -> chequeos de integridad
 *   node tools/verify-data.js build.txt       -> además compara con el texto del PDF
 *                                               (pdftotext -layout BUILD-HAMBURGUESAS-COLOMBIA.pdf build.txt)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../data/burgers.js'), 'utf8'), ctx);
const D = ctx.window.BM_DATA;

let errors = 0;
const fail = (msg) => { errors++; console.log('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

console.log('1) Integridad');
const famIds = new Set(D.families.map((f) => f.id));
D.burgers.forEach((b) => {
  if (!famIds.has(b.family)) fail(`${b.id}: familia desconocida ${b.family}`);
  b.steps.forEach(([ing], i) => { if (!D.ingredients[ing]) fail(`${b.id} capa ${i + 1}: ingrediente desconocido ${ing}`); });
  const first = D.ingredients[b.steps[0][0]];
  const last = D.ingredients[b.steps[b.steps.length - 1][0]];
  if (first.cat !== 'pan' || last.cat !== 'pan') fail(`${b.id}: no empieza y termina en pan`);
});
const ids = new Set(D.burgers.map((b) => b.id));
if (ids.size !== D.burgers.length) fail('IDs repetidos');
const sig = new Map();
D.burgers.forEach((b) => {
  const k = b.steps.map((s) => s[0] + '|' + s[1]).join('>');
  if (sig.has(k)) fail(`${b.id} tiene exactamente la misma combinación que ${sig.get(k)}`);
  sig.set(k, b.id);
});
const labels = new Set();
D.burgers.forEach((b) => {
  const l = b.name + (b.variant ? ' · ' + b.variant : '');
  if (labels.has(l)) fail('Nombre visible repetido: ' + l);
  labels.add(l);
});
Object.keys(D.ingredients).forEach((k) => {
  const f = path.join(__dirname, '../img/ingredients', D.ingredients[k].img + '.png');
  if (!fs.existsSync(f)) fail('Falta imagen ' + f);
});
ok(`${D.burgers.length} hamburguesas, ${Object.keys(D.ingredients).length} ingredientes, ${sig.size} combinaciones únicas`);

const txt = process.argv[2];
if (txt) {
  console.log('2) Comparación con el documento original');
  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const pages = fs.readFileSync(txt, 'utf8').split('\f');
  const bodyPages = pages.map((p, i) => ({ n: i + 1, lines: p.split('\n').map(clean).filter(Boolean) }))
    .filter((p) => p.n > 1 && p.lines.length);
  if (bodyPages.length !== D.burgers.length) fail(`El PDF tiene ${bodyPages.length} páginas de producto y los datos ${D.burgers.length}`);
  D.burgers.forEach((b) => {
    const pg = bodyPages.find((p) => p.n === b.page);
    if (!pg) return fail(`${b.id}: página ${b.page} no encontrada`);
    const src = b.steps.map((s) => s[2]);
    const tail = pg.lines.slice(pg.lines.length - src.length);
    const title = pg.lines.slice(0, pg.lines.length - src.length).join(' ');
    if (title !== b.name) fail(`pág ${b.page}: título "${title}" ≠ "${b.name}"`);
    src.forEach((s, i) => { if (s !== tail[i]) fail(`pág ${b.page} capa ${i + 1}: "${s}" ≠ "${tail[i]}"`); });
  });
  if (!errors) ok('Todas las capas coinciden línea por línea y en el mismo orden con el PDF');
}

console.log(errors ? `\n${errors} error(es)` : '\nOK — datos verificados');
process.exit(errors ? 1 : 0);
