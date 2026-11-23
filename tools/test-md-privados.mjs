// Vigila que todo .md del repo esté bloqueado en _redirects (si no, queda público en el CDN).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const raiz = new URL('..', import.meta.url).pathname;
const reglas = readFileSync(join(raiz, '_redirects'), 'utf8').split('\n')
  .map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s+/)[0]);
const cubre = (ruta) => reglas.some((r) => r.endsWith('/*') ? ruta.startsWith(r.slice(0, -1)) : r === ruta);
const mds = [];
(function rec(d) { for (const n of readdirSync(d)) { if (['node_modules', '.git'].includes(n)) continue;
  const p = join(d, n); statSync(p).isDirectory() ? rec(p) : n.endsWith('.md') && mds.push('/' + relative(raiz, p)); } })(raiz);
const faltan = mds.filter((m) => !cubre(m));
if (faltan.length) { console.error('✗ .md públicos sin bloquear en _redirects:', faltan.join(', ')); process.exit(1); }
console.log(`✓ ${mds.length} archivos .md bloqueados en _redirects`);
