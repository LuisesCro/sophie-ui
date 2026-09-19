#!/usr/bin/env node
/* ============================================================
   EL PANEL DE FILTROS · sophie-ui/tools/test-filtros.mjs

   Lo que se protege aquí son las dos razones por las que existe el panel:

   1 · QUE LA BÚSQUEDA SEA SUYA. Con la categoría como único dato de entrada,
       treinta estudiantes de la misma clase mandaban la misma consulta y
       recibían la misma lista. Si los filtros del panel dejaran de viajar en la
       consulta —que es la avería típica de esta casa: el campo se construye y
       se cae por el camino— volveríamos exactamente ahí, y sin que nada falle
       de forma visible.

   2 · QUE SIGA ENSEÑANDO. Cada filtro trae su porqué y arranca en el valor del
       método. Un panel de seis casillas numéricas sin explicación es un
       formulario; con ella es una clase. Se comprueba que ninguno se quede sin
       porqué, porque es lo primero que se pierde al añadir un campo nuevo.

   Uso:  node tools/test-filtros.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const PROD = path.join(RAIZ, '..', 'sophie-producto');

let pasan = 0, fallan = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
async function caso(nombre, fn) {
  try { await fn(); pasan++; console.log('  ✓ ' + nombre); }
  catch (e) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + e.message); }
}

const win = {};
for (const f of ['sophie-pasos.js', 'sophie-filtros.js', 'sophie-guia.js'])
  new Function('window', fs.readFileSync(path.join(RAIZ, f), 'utf8'))(win);
const F = win.SophieFiltros;

console.log('\nEl panel enseña, no solo pregunta');

await caso('cada filtro trae su porqué, y no es una frase de relleno', () => {
  for (const c of F.CAMPOS) {
    ok(c.porque && c.porque.length > 60,
       'el filtro "' + c.etiqueta + '" no explica por qué existe. Un número sin porqué ' +
       'convierte la clase en un formulario.');
    ok(c.valor != null, 'el filtro "' + c.etiqueta + '" arranca vacío');
  }
});

await caso('arranca en los valores del método, no en blanco', () => {
  const v = {};
  F.CAMPOS.forEach((c) => { v[c.id] = c.valor; });
  ok(v.precio_min === 20, 'el precio mínimo del método es $20, y está en ' + v.precio_min);
  ok(v.resenas_max === 500, 'el techo de reseñas del método es 500, y está en ' + v.resenas_max);
  ok(v.peso_max === 3, 'el peso máximo del método es 3 lb, y está en ' + v.peso_max);
});

await caso('los atajos dicen QUÉ mueven, no son magia', () => {
  for (const a of F.ATAJOS) {
    ok(a.ayuda && a.ayuda.length > 20, 'el atajo "' + a.nombre + '" no explica qué hace');
    ok(Object.keys(a.pone).length > 0, 'el atajo "' + a.nombre + '" no mueve nada');
    for (const k of Object.keys(a.pone))
      ok(F.CAMPOS.some((c) => c.id === k), 'el atajo "' + a.nombre + '" mueve un campo que no existe: ' + k);
  }
});

await caso('avisa cuando el estudiante se sale del método, sin impedírselo', () => {
  ok(F.AVISOS.peso_max(8), 'no avisa de un peso de 8 lb');
  ok(!F.AVISOS.peso_max(3), 'avisa del valor que el propio método recomienda');
  ok(F.AVISOS.resenas_max(3000), 'no avisa de un techo de 3,000 reseñas');
  ok(F.AVISOS.precio_min(8), 'no avisa de un precio mínimo de $8');
});

console.log('\nLa pantalla del paso 3 ES el panel');

await caso('el paso 3 trae el hueco donde se monta', () => {
  const h = win.SophiePasos.pantalla(3, { datos: true, vars: {} });
  ok(/id="panel-filtros"/.test(h), 'el paso 3 volvió a ser un texto que describe una búsqueda');
});

await caso('y el puente lo monta solo, sin que la página se acuerde', () => {
  const G = fs.readFileSync(path.join(RAIZ, 'sophie-guia.js'), 'utf8');
  ok(/querySelector\('#panel-filtros'\)/.test(G),
     'si el montaje vive en la página, cada página tiene que acordarse — y ' +
     '"cada página tiene que acordarse" es como este proyecto ha perdido cinco campos');
  ok(/SophieFiltros\.pintar\(hueco\)/.test(G), 'encuentra el hueco y no monta nada');
});

await caso('ninguna pantalla del panel nombra una herramienta de pago', () => {
  const todo = F.html() + win.SophiePasos.pantalla(3, { datos: true, vars: {} });
  const m = todo.match(/Black Box|Helium 10|Cerebro|Xray|Magnet/gi) || [];
  ok(m.length === 0, 'nombra: ' + [...new Set(m)].join(', '));
});

console.log('\nLos filtros llegan al servidor, que es donde más veces se han caído');

await caso('la página manda action:buscar con los filtros dentro', () => {
  for (const pagina of ['index.html', 'producto-v2.html']) {
    const p = path.join(PROD, pagina);
    if (!fs.existsSync(p)) continue;
    const H = fs.readFileSync(p, 'utf8');
    ok(/sophie-filtros\.js/.test(H), pagina + ': no carga el panel');
    ok(/addEventListener\('sophie-buscar'/.test(H), pagina + ': nadie escucha el botón Buscar');
    ok(/action: 'buscar', code: accessCode, filtros: spec/.test(H),
       pagina + ': los filtros no viajan en la petición. El panel quedaría de adorno y ' +
       'volverían a salir los mismos productos para todos.');
  }
});

await caso('el servidor los recibe, los acota y los pasa a la consulta', () => {
  const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
  ok(/body\.action === "buscar"/.test(S), 'el servidor no atiende la búsqueda');
  ok(/function accionBuscar/.test(S), 'la ruta existe y no lleva a ningún sitio');
  ok(/limpiarSpec\(body\.filtros\)/.test(S), 'no lee los filtros que manda la página');
  ok(/consulta: "descubrir", \.\.\.spec/.test(S),
     'los filtros no llegan a la consulta: se limpiarían para nada');
});

await caso('y los acota de verdad: el navegador no decide la factura', () => {
  const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
  const i = S.indexOf('function limpiarSpec');
  const cuerpo = S.slice(i, S.indexOf('\n}', i));
  const limpiar = new Function(S.slice(S.indexOf('const LIMITES'), S.indexOf('\n}', i) + 2) +
                               '; return limpiarSpec;')();
  const r = limpiar({ categorias: Array(20).fill('X'), precio_min: 0.01, resenas_max: 999999,
                      palabras: Array(50).fill('a'), peso_max: 900 });
  ok(r.categorias.length <= 5, 'veinte categorías pasaron: eso pide media Amazon');
  ok(r.precio_min >= 1, 'un precio mínimo de un céntimo pasó tal cual');
  ok(r.resenas_max <= 20000, 'un techo de un millón de reseñas pasó tal cual');
  ok(r.palabras.length <= 12, 'cincuenta palabras pasaron');
  ok(cuerpo.includes('precio_max = spec.precio_min'), 'no corrige un precio invertido');
});

await caso('un precio invertido se corrige en vez de devolver vacío', () => {
  const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
  const i = S.indexOf('function limpiarSpec');
  const limpiar = new Function(S.slice(S.indexOf('const LIMITES'), S.indexOf('\n}', i) + 2) +
                               '; return limpiarSpec;')();
  const r = limpiar({ categorias: ['Pet Supplies'], precio_min: 80, precio_max: 20 });
  ok(r.precio_max > r.precio_min,
     'quedó min ' + r.precio_min + ' y max ' + r.precio_max + '. La búsqueda volvería vacía y ' +
     'el estudiante concluiría que no hay productos, no que se equivocó al teclear.');
});

console.log('\nCero resultados no es un fallo');

await caso('se dice como información, con qué aflojar', () => {
  const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
  ok(/vacio: productos\.length === 0/.test(S), 'el servidor no distingue vacío de error');
  ok(/subir el techo de reseñas o a bajar el revenue mínimo/.test(S),
     'no dice QUÉ filtro aflojar, que es lo único accionable');
  const H = fs.readFileSync(path.join(PROD, 'index.html'), 'utf8');
  ok(/if \(d\.vacio\)/.test(H), 'la página trata el vacío como un error y parece que está rota');
});

console.log('\nLa validación de keyword: se mide lo medible, se reserva lo demás');

await caso('los filtros 1 y 2 los decide el servidor', () => {
  const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
  ok(/function filtroSinMarcas/.test(S), 'el filtro de marcas no está');
  ok(/function filtroEspecifica/.test(S), 'el filtro de especificidad no está');
  const f = new Function(S.slice(S.indexOf('function filtroEspecifica'),
                                 S.indexOf('function filtroSinMarcas')) +
                         '; return filtroEspecifica;')();
  ok(f('dog bowl').pasa, 'dos palabras describen un producto');
  ok(!f('bowl').pasa, 'una palabra suelta suele ser una categoría entera');
});

await caso('el filtro 3 queda PENDIENTE, y eso es a propósito', () => {
  const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
  const i = S.indexOf('async function accionValidarKeyword');
  const cuerpo = S.slice(i, S.indexOf('\n}', S.indexOf('return jres(200', i)));
  ok(/estado: "pendiente"/.test(cuerpo),
     'el Filtro 3 se está aprobando solo. Cuáles productos son comparables depende de qué ' +
     'piensa vender ÉL, y eso ningún dato lo sabe. Automatizar el trabajo no es automatizar ' +
     'el criterio.');
  ok(/lo decides tú/.test(cuerpo), 'no le dice al estudiante que ese filtro es suyo');
});

await caso('las dos consultas van a la vez, no en serie', () => {
  const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
  const i = S.indexOf('async function accionValidarKeyword');
  ok(/Promise\.all/.test(S.slice(i, i + 1200)),
     'en serie tarda el doble y el estudiante mira una pantalla muda el doble de tiempo');
});

console.log('\nY el panel funciona de verdad (navegador)');

const EXE = [
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium/chrome-linux/headless_shell',
].filter((p) => fs.existsSync(p))[0];

let chromium = null;
try { ({ chromium } = await import('playwright-core')); } catch (e) {}

if (!chromium || !EXE) {
  console.log('  (sin navegador: la parte interactiva se salta)');
} else {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  await p.setContent('<!doctype html><html><body><div id="h"></div></body></html>');
  for (const f of ['sophie-pasos.js', 'sophie-filtros.js'])
    await p.addScriptTag({ content: fs.readFileSync(path.join(RAIZ, f), 'utf8') });
  await p.evaluate(() => window.SophieFiltros.pintar(document.getElementById('h')));

  await caso('el botón Buscar nace apagado: sin categoría no hay búsqueda', async () => {
    ok(await p.locator('[data-go]').isDisabled(),
       'se puede buscar sin categoría, y eso pide el catálogo entero');
  });

  await caso('marcar una categoría abre sus subnichos y enciende el botón', async () => {
    await p.locator('[data-catbox]').first().check();
    ok(!(await p.locator('[data-go]').isDisabled()), 'sigue apagado con una categoría marcada');
    ok(await p.locator('.s-ft-cat-w.abierta .s-ft-sub').first().isVisible(),
       'los subnichos no se abren: son 59 y sin abrirlos no existen para el estudiante');
  });

  await caso('elegir un subnicho marca su categoría sola', async () => {
    await p.evaluate(() => {
      document.querySelectorAll('[data-catbox]').forEach((b) => { b.checked = false; });
      document.querySelectorAll('.s-ft-cat-w').forEach((c) => c.classList.remove('abierta'));
      document.querySelector('.s-ft-cat-w:nth-child(3) [data-sub]').click();
    });
    const marcadas = await p.evaluate(() =>
      [...document.querySelectorAll('[data-catbox]')].filter((b) => b.checked).length);
    ok(marcadas >= 1,
       'el subnicho quedó elegido sin su categoría: eso manda un filtro incompleto y la ' +
       'búsqueda vuelve vacía sin decir por qué');
  });

  await caso('un atajo mueve los campos y se ve cuál está puesto', async () => {
    await p.locator('[data-atajo="ligero"]').click();
    const peso = await p.locator('#ft-peso_max').inputValue();
    ok(parseFloat(peso) === 1, 'el atajo "Muy ligero" no puso el peso en 1 lb, puso ' + peso);
    ok(await p.locator('[data-atajo="ligero"][aria-pressed="true"]').count() === 1,
       'no se ve cuál atajo está activo');
  });

  await caso('salirse del método avisa, pero no bloquea', async () => {
    await p.locator('#ft-peso_max').fill('9');
    await p.waitForTimeout(40);
    const aviso = await p.locator('[data-aviso="peso_max"]').textContent();
    ok(aviso && aviso.trim().length > 10, 'no avisa de un peso de 9 lb');
    ok(!(await p.locator('[data-go]').isDisabled()),
       'lo bloqueó: el estudiante manda sobre su búsqueda, lo que no puede es no saber');
  });

  await caso('un precio invertido SÍ bloquea, porque es un error', async () => {
    await p.locator('#ft-precio_min').fill('80');
    await p.locator('#ft-precio_max').fill('20');
    await p.waitForTimeout(40);
    ok(await p.locator('[data-go]').isDisabled(), 'dejaría buscar y volvería vacío sin explicación');
    const est = await p.locator('[data-estado]').textContent();
    ok(/menor que el máximo/.test(est), 'no dice qué pasa: ' + est);
  });

  await caso('Buscar emite el evento con los filtros que se ven en pantalla', async () => {
    const spec = await p.evaluate(() => new Promise((res) => {
      document.getElementById('ft-precio_min').value = '25';
      document.getElementById('ft-precio_max').value = '70';
      document.getElementById('ft-inc').value = 'organizer, storage';
      document.getElementById('ft-exc').value = 'electric';
      window.SophieFiltros.repasar(document.getElementById('h'));
      document.addEventListener('sophie-buscar', (e) => res(e.detail), { once: true });
      document.querySelector('[data-go]').click();
    }));
    ok(spec.precio_min === 25 && spec.precio_max === 70, 'los precios no viajaron: ' + JSON.stringify(spec));
    ok(spec.palabras.includes('organizer') && spec.palabras.includes('storage'),
       'las palabras del estudiante no viajaron, y son las que hacen que su lista no sea la de todos');
    ok(spec.excluir.includes('electric'), 'las exclusiones no viajaron');
    ok(spec.categorias.length >= 1, 'la categoría no viajó');
  });

  await b.close();
}

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan\n');
process.exit(fallan ? 1 : 0);
