#!/usr/bin/env node
/* ============================================================
   QUE TODO SE LEA · sophie-ui/tools/test-contraste.mjs

   Mide el contraste real de cada texto sobre el fondo que de verdad tiene
   debajo, en un navegador, con las hojas de estilo reales.

   POR QUÉ HACE FALTA MEDIRLO Y NO MIRARLO:

   · UN NOMBRE DE VARIABLE MAL ESCRITO NO FALLA. El panel de filtros pedía
     `--so-tx-2` escrito sin el guion. La variable no existía, el navegador se
     cayó al respaldo, y el texto explicativo salió más apagado que el resto.
     Nada se rompe, nada avisa: solo se lee peor. Leyendo el CSS no se ve.

   · LOS FONDOS SE COMPONEN. Las tarjetas son blancos translúcidos —
     `rgba(255,255,255,.04)` — sobre un degradado. El color que hay detrás de
     una letra no está escrito en ninguna regla: es el resultado de apilar tres
     o cuatro capas. Hay que componerlas para saberlo.

   · Y UN DEGRADADO NO ES UN COLOR DE FONDO. `backgroundColor` devuelve
     transparente cuando el fondo es un degradado, así que un medidor ingenuo
     concluye "blanco" y da por malo justo lo que está bien. Esa fue la primera
     versión de este archivo, y daba quince fallos falsos.

   El mínimo es 4.5:1 (WCAG AA para texto normal).

   Uso:  node tools/test-contraste.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const PROD = path.join(RAIZ, '..', 'sophie-producto');
const MINIMO = 4.5;

let pasan = 0, fallan = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
async function caso(nombre, fn) {
  try { await fn(); pasan++; console.log('  ✓ ' + nombre); }
  catch (e) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + e.message); }
}

const EXE = [
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium/chrome-linux/headless_shell',
].filter((p) => fs.existsSync(p))[0];

let chromium = null;
try { ({ chromium } = await import('playwright-core')); } catch (e) {}

// Lo único que se puede comprobar sin navegador, y vale la pena: que ningún
// módulo pida una variable que el tema no define. Es el fallo que no avisa.
console.log('\nLos nombres de las variables existen');

await caso('ningún módulo pide un token que el tema no define', () => {
  const tema = fs.readFileSync(path.join(RAIZ, 'sophie-oscuro.css'), 'utf8');
  const definidos = new Set((tema.match(/--so-[a-z0-9-]+(?=\s*:)/g) || []));
  const huerfanos = [];
  for (const f of fs.readdirSync(RAIZ).filter((n) => /^sophie-.*\.js$/.test(n))) {
    const src = fs.readFileSync(path.join(RAIZ, f), 'utf8');
    for (const uso of src.match(/var\(--so-[a-z0-9-]+/g) || []) {
      const token = uso.slice(4);
      if (!definidos.has(token)) huerfanos.push(f + ' pide ' + token);
    }
  }
  ok(huerfanos.length === 0,
     'piden variables que no existen, así que se caen al respaldo y se leen peor ' +
     'sin que nada falle:\n      ' + huerfanos.join('\n      '));
});

if (!chromium || !EXE) {
  console.log('\n(sin navegador: la medición se salta)');
} else {
  const HTML = fs.readFileSync(path.join(PROD, 'index.html'), 'utf8')
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')
    .replace(/<link rel="stylesheet" href="https:\/\/ui\.crezcamosonline\.com\/([^"]+)">/g,
      (m, f) => '<style>' + fs.readFileSync(path.join(RAIZ, f), 'utf8') + '</style>');

  const navegador = await chromium.launch({ executablePath: EXE });
  const p = await navegador.newPage({ viewport: { width: 900, height: 1200 } });
  await p.setContent(HTML, { waitUntil: 'domcontentloaded' });
  for (const m of ['sophie-pasos.js', 'sophie-filtros.js', 'sophie-hallazgos.js'])
    await p.addScriptTag({ content: fs.readFileSync(path.join(RAIZ, m), 'utf8') });

  // El medidor. Vive dentro de la página porque necesita los estilos resueltos.
  await p.evaluate(() => {
    const px = (c) => { const m = (c || '').match(/[\d.]+/g) || [0, 0, 0, 1];
      return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]]; };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };

    // El tono MÁS CLARO del degradado de fondo: es el caso peor para un texto
    // claro, y medir el caso peor es la única medida que sirve.
    function baseDeLaPagina() {
      const grad = (getComputedStyle(document.body).backgroundImage || '') +
                   (getComputedStyle(document.documentElement).backgroundImage || '');
      const tonos = grad.match(/rgba?\([^)]+\)/g) || [];
      if (!tonos.length) return [255, 255, 255, 1];
      return px(tonos.slice().sort((a, b) => lum(px(b)) - lum(px(a)))[0]);
    }

    window.__medir = function (raiz) {
      const capasBase = baseDeLaPagina();
      const fondo = (el) => {
        const capas = [];
        let n = el;
        while (n && n !== document.documentElement) {
          const bg = px(getComputedStyle(n).backgroundColor);
          if (bg[3] > 0) capas.push(bg);
          n = n.parentElement;
        }
        capas.push(capasBase);
        let out = capas[capas.length - 1].slice(0, 3);
        for (let i = capas.length - 2; i >= 0; i--) {
          const [r, g, b, a] = capas[i];
          out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
        }
        return out;
      };
      const malos = [];
      raiz.querySelectorAll('*').forEach((el) => {
        const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!propio) return;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;       // lo escondido no se lee
        const c = px(cs.color), f = fondo(el);
        const ratio = (Math.max(lum(c), lum(f)) + 0.05) / (Math.min(lum(c), lum(f)) + 0.05);
        if (ratio < 4.5) malos.push({
          que: (el.className || el.tagName).toString().slice(0, 30),
          ratio: +ratio.toFixed(2), color: cs.color,
          texto: (el.textContent || '').trim().slice(0, 34),
        });
      });
      return malos;
    };
  });

  async function medir(nombre, montar) {
    await p.evaluate(() => {
      document.getElementById('gate').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      document.getElementById('thread').innerHTML = '';
    });
    await p.evaluate(montar);
    await p.waitForTimeout(60);
    const malos = await p.evaluate(() => window.__medir(document.getElementById('thread')));
    await caso(nombre, () => {
      ok(malos.length === 0, malos.length + ' texto(s) por debajo de ' + MINIMO + ':1:\n      ' +
        malos.map((m) => m.ratio + ':1  ' + m.que + '  ' + m.color + '  "' + m.texto + '"').join('\n      '));
    });
  }

  console.log('\nCada pantalla, medida sobre el fondo que de verdad tiene debajo');

  for (const paso of [1, 2, 3, 4, 5, 7]) {
    await medir('paso ' + paso, new Function('paso', `
      const d = document.createElement('div'); d.className = 'landing';
      d.innerHTML = window.SophiePasos.pantalla(${paso}, { datos: true,
        vars: { keyword: 'dog nail grinder', categoria: 'Pet Supplies', capital: '$1,500' } });
      document.getElementById('thread').appendChild(d);
      const hueco = d.querySelector('#panel-filtros');
      if (hueco && window.SophieFiltros) window.SophieFiltros.pintar(hueco);
    `));
  }

  await medir('el panel de filtros, entero', () => {
    const d = document.createElement('div');
    d.className = 'landing';
    d.innerHTML = '<div class="s-body"></div>';
    document.getElementById('thread').appendChild(d);
    window.SophieFiltros.pintar(d.querySelector('.s-body'));
    // Abrir una categoría para que sus subnichos también se midan.
    const box = d.querySelector('[data-catbox]');
    if (box) { box.checked = true; box.closest('.s-ft-cat-w').classList.add('abierta'); }
  });

  await medir('la tabla de candidatos', () => {
    const d = document.createElement('div');
    d.className = 'landing';
    document.getElementById('thread').appendChild(d);
    window.SophieHallazgos.pintar(d, {
      keyword: 'dog nail grinder',
      productos: Array.from({ length: 4 }, (_, i) => ({
        asin: 'B0C' + i, nombre: 'Dog Nail Grinder Kit ' + i, marca: 'Acme',
        precio: 24.99, revenue_30d: 9200, resenas: 118, rating: 4.4, peso_lb: 4.2,
        ventas_mes: 368, ventas_dia: 12, lanzado: '2023-04-01', ratio_ventas_resenas: 3.1,
      })),
    });
  });

  await medir('una respuesta en prosa de Sophie', () => {
    const d = document.createElement('div');
    d.className = 'landing';
    d.innerHTML = '<div class="s-body">' +
      '<p><strong>Rango de precio:</strong> ¿Entre cuánto y cuánto quieres?</p>' +
      '<ul class="s-list"><li>💰 $20–35 (margen mejor, menos volumen)</li>' +
      '<li>💰 $35–60 (balance entre demanda y margen)</li></ul>' +
      '<div class="s-card"><p><b>1 · Tu dinero</b></p><p>Capital para el primer pedido.</p></div>' +
      '<div class="s-why"><b>Por qué importa</b><p>Si todos buscamos igual, todos encontramos lo mismo.</p></div>' +
      '<div class="s-done">✓ Capital: $1,500</div>' +
      '<p class="s-warn">Evita categorías restringidas para vendedores nuevos.</p>' +
      '<div class="s-cta">Pulsa una y arrancamos 👇</div></div>';
    document.getElementById('thread').appendChild(d);
  });

  // La prueba de que la prueba sirve. Con un texto deliberadamente ilegible
  // esto TIENE que fallar; si no, el banco da verde sobre lo que vino a vigilar.
  await caso('y el medidor detecta un texto ilegible a propósito', async () => {
    const malos = await p.evaluate(() => {
      const t = document.getElementById('thread');
      t.innerHTML = '';
      const d = document.createElement('div');
      d.className = 'landing';
      d.innerHTML = '<div class="s-body"><p style="color:#1a2440">casi invisible</p></div>';
      t.appendChild(d);
      return window.__medir(t);
    });
    ok(malos.length > 0,
       'un texto casi del color del fondo pasó la medición: el medidor no mide lo que cree');
  });

  await navegador.close();
}

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan\n');
process.exit(fallan ? 1 : 0);
