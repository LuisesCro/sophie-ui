#!/usr/bin/env node
/* ============================================================
   QUE LA VENTANA DE SOPHIE CONTENGA A SOPHIE.
   Crezcamos Online · sophie-ui/tools/test-encaje.mjs

   Este banco mide algo que ninguna prueba de texto puede ver: si la pagina
   entera se desborda por debajo de la ventana y aparece una SEGUNDA barra de
   scroll, la que arrastra la caja de escribir fuera de la pantalla.

   POR QUE EXISTE. Se arreglo una vez con `min-height:0` —cierto, y necesario—
   y volvio a pasar por una causa completamente distinta: un <span> de UN pixel,
   escondido con `position:absolute` en la cabecera de la tabla de candidatos.
   Un elemento absoluto solo lo recorta un antepasado con scroll si ese
   antepasado esta POSICIONADO. Como #messages era `static`, el bloque
   contenedor de ese span pasaba a ser la pagina, y su sitio —abajo del todo del
   hilo— estiraba el area de scroll del BODY. 777 pixeles, por un span de uno.

   Leyendo el CSS no se ve. Solo se ve midiendo, y por eso esto abre un
   navegador de verdad. Las dos protecciones se comprueban por separado:
     · que ningun modulo se escape (el CSS del propio modulo)
     · que la caja que hace scroll este posicionada (la garantia de la pagina)

   Uso:  node tools/test-encaje.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const PROD = path.join(RAIZ, '..', 'sophie-producto');

let pasan = 0, fallan = 0, saltados = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
async function caso(nombre, fn) {
  try { await fn(); pasan++; console.log('  ✓ ' + nombre); }
  catch (e) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + e.message); }
}

/* ---------- lo que se puede comprobar sin navegador ---------- */
// Va primero y sin condiciones: si no hay navegador en la maquina, al menos
// estas dos no se pierden. Son las que fijan la INTENCION del arreglo.

console.log('\nLas dos protecciones, en el codigo');

for (const pagina of ['index.html', 'producto-v2.html']) {
  const p = path.join(PROD, pagina);
  if (!fs.existsSync(p)) continue;
  const H = fs.readFileSync(p, 'utf8');
  await caso(pagina + ': la caja que hace scroll esta posicionada', () => {
    const m = (H.match(/#messages \{[^}]*\}/) || [''])[0];
    ok(/position:\s*relative/.test(m),
       'sin `position:relative` en #messages, cualquier `position:absolute` de cualquier ' +
       'modulo se escapa del scroll y estira el BODY. Es la garantia de toda la pagina.');
    ok(/min-height:\s*0/.test(m), 'sin `min-height:0` #messages no encoge y crece el BODY');
    ok(/overflow-y:\s*auto/.test(m), '#messages tiene que ser quien hace scroll');
  });
}

await caso('la tabla contiene sus propios elementos absolutos', () => {
  const HZ = fs.readFileSync(path.join(RAIZ, 'sophie-hallazgos.js'), 'utf8');
  ok(/'\.s-hz-ckc\{position:relative\}'/.test(HZ),
     'el <span> escondido de la cabecera no tiene padre posicionado: se escapa');
  const apilado = HZ.split("'@container (max-width:580px){'")[1] || '';
  ok(/'\.s-hz\{position:relative\}'/.test(HZ),
     'el <thead> escondido de la version apilada tampoco tiene padre posicionado');
  ok(apilado.length > 0, 'no encontre el bloque de la version apilada');
});

/* ---------- y lo que SOLO se ve midiendo ---------- */

const EXE = [
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium/chrome-linux/headless_shell',
].filter((p) => fs.existsSync(p))[0];

let chromium = null;
try { ({ chromium } = await import('playwright-core')); } catch (e) { /* sin navegador */ }

if (!chromium || !EXE || !fs.existsSync(path.join(PROD, 'index.html'))) {
  console.log('\n(sin navegador en esta maquina: la medicion se salta)');
  saltados = 1;
} else {
  console.log('\nLa medicion: ninguna ventana debe desbordarse');

  const HTML = fs.readFileSync(path.join(PROD, 'index.html'), 'utf8')
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
  const HZ = fs.readFileSync(path.join(RAIZ, 'sophie-hallazgos.js'), 'utf8');

  const producto = (i) => ({
    asin: 'B0MEDIDA' + i, nombre: 'Embroidery Hoop Cross Stitch Set ' + i, marca: 'Acme',
    precio: 24.99, revenue_30d: 9200, resenas: 118, rating: 4.4, peso_lb: 1.2,
    ventas_mes: 368, ventas_dia: 12, lanzado: '2023-04-01', ratio_ventas_resenas: 3.1,
  });

  const navegador = await chromium.launch({ executablePath: EXE });

  // Los tamanos que importan: escritorio ancho, portatil, tablet y los tres
  // moviles mas comunes. El fallo aparecia en TODOS, no solo en uno.
  const TAMANOS = [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [414, 896], [390, 844], [360, 740]];

  async function medir(w, h, conTabla) {
    const p = await navegador.newPage({ viewport: { width: w, height: h } });
    await p.setContent(HTML, { waitUntil: 'domcontentloaded' });
    await p.addScriptTag({ content: HZ });
    await p.evaluate(({ conTabla, prods }) => {
      document.getElementById('gate').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      const t = document.getElementById('thread');
      // Conversacion larga: el fallo solo aparece cuando hay hilo por encima,
      // porque lo que se escapa se coloca en el sitio que le tocaba.
      for (let i = 0; i < 8; i++) {
        const d = document.createElement('div');
        d.className = 'landing';
        d.innerHTML = '<div class="s-body"><h1>Pantalla ' + i + '</h1><p>' + 'texto '.repeat(60) + '</p></div>';
        t.appendChild(d);
      }
      if (conTabla) {
        const c = document.createElement('div');
        c.className = 'landing';
        t.appendChild(c);
        window.SophieHallazgos.pintar(c, { keyword: 'embroidery hoop', productos: prods });
      }
    }, { conTabla, prods: Array.from({ length: 8 }, (_, i) => producto(i)) });
    await p.waitForTimeout(80);
    const r = await p.evaluate(() => {
      const se = document.scrollingElement;
      const bar = document.getElementById('bar').getBoundingClientRect();
      return {
        desborde: se.scrollHeight - se.clientHeight,
        barraAbajo: Math.round(bar.bottom),
        ventana: window.innerHeight,
      };
    });
    await p.close();
    return r;
  }

  for (const [w, h] of TAMANOS) {
    await caso(w + '×' + h + ': con la tabla de candidatos, la pagina NO se desborda', async () => {
      const r = await medir(w, h, true);
      ok(r.desborde === 0,
         'el BODY se desborda ' + r.desborde + 'px. Eso es la segunda barra vertical que se ' +
         'pasa por debajo de la ventana de Sophie.');
      ok(r.barraAbajo <= r.ventana + 1,
         'la caja de escribir acaba en y=' + r.barraAbajo + ' y la ventana mide ' + r.ventana);
    });
  }

  await caso('y sin la tabla tampoco, que era el arreglo anterior', async () => {
    const r = await medir(1280, 800, false);
    ok(r.desborde === 0, 'se desborda ' + r.desborde + 'px sin tabla siquiera');
  });

  // La prueba de que la prueba sirve. Si se quita `position:relative` de
  // #messages, esto TIENE que volver a romperse; si no, el banco esta ciego y
  // daria verde sobre el fallo que vino a vigilar.
  await caso('quitando la proteccion, el fallo vuelve (la prueba no esta ciega)', async () => {
    const p = await navegador.newPage({ viewport: { width: 1280, height: 800 } });
    await p.setContent(HTML, { waitUntil: 'domcontentloaded' });
    await p.addScriptTag({ content: HZ.replace("'.s-hz-ckc{position:relative}',", '') });
    await p.evaluate((prods) => {
      document.getElementById('gate').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      const m = document.getElementById('messages');
      m.style.position = 'static';               // se deshace la garantia de la pagina
      const t = document.getElementById('thread');
      for (let i = 0; i < 8; i++) {
        const d = document.createElement('div');
        d.className = 'landing';
        d.innerHTML = '<div class="s-body"><p>' + 'texto '.repeat(60) + '</p></div>';
        t.appendChild(d);
      }
      const c = document.createElement('div');
      c.className = 'landing';
      t.appendChild(c);
      window.SophieHallazgos.pintar(c, { keyword: 'embroidery hoop', productos: prods });
    }, Array.from({ length: 8 }, (_, i) => producto(i)));
    await p.waitForTimeout(80);
    const desborde = await p.evaluate(() =>
      document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight);
    await p.close();
    ok(desborde > 0,
       'sin las dos protecciones la pagina ya no se desborda, asi que esta prueba no esta ' +
       'midiendo lo que cree medir. Reescribela antes de fiarte de su verde.');
  });

  await navegador.close();
}

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan' +
            (saltados ? ' · medicion saltada' : '') + '\n');
process.exit(fallan ? 1 : 0);
