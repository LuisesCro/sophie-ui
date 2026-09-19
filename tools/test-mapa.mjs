// EL MAPA DEL MÉTODO (sophie-mapa.js).
//
// POR QUÉ EXISTE: "automatizar procesos no significa que dejemos de enseñar
// paso a paso la metodología". Cuando el estudiante hacía la búsqueda a mano,
// el método se le quedaba en los dedos. Ahora la hace Sophie, y lo único que le
// quedaba era una barra con cuatro etapas y un número de paso: eso dice DÓNDE
// está y no enseña NADA.
//
// Lo que se protege aquí no es el dibujo, es el contenido: que los nueve pasos
// estén, que cada uno diga POR QUÉ existe, que el mapa no se convierta en una
// tercera copia de los umbrales, y que no hable de herramientas — porque el
// método es el mismo tenga o no el estudiante datos reales, y un mapa que
// dijera "Black Box" a unos y "Buscar candidatos" a otros estaría enseñando dos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SRC = fs.readFileSync(path.join(RAIZ, 'sophie-mapa.js'), 'utf8');

function cargar(conPasos) {
  const win = { localStorage: { getItem: () => null, setItem: () => {} } };
  if (conPasos) new Function('window', fs.readFileSync(path.join(RAIZ, 'sophie-pasos.js'), 'utf8'))(win);
  new Function('window', SRC)(win);
  return win;
}
const win = cargar(true);
const M = win.SophieMapa;
const P = win.SophiePasos;

let pasan = 0, fallan = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
function caso(nombre, fn) {
  let err = null;
  try { fn(); } catch (e) { err = e.message; }
  if (err) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + err); }
  else { pasan++; console.log('  ✓ ' + nombre); }
}

console.log('\nLos nueve pasos, agrupados en las cuatro etapas');

caso('están los nueve, en orden, y ninguno se repite', () => {
  const ids = Object.keys(P.metodo).map(Number).sort((a, b) => a - b);
  ok(ids.length === 9, 'hay ' + ids.length + ' pasos, no nueve');
  ok(ids.every((n, i) => n === i + 1), 'los pasos no van del 1 al 9: ' + ids.join(','));
  const h = M.html(1);
  const nombres = [...h.matchAll(/class="s-mp-nom">([^<]+)</g)].map((m) => m[1]);
  ok(nombres.length === 9, 'el mapa dibuja ' + nombres.length + ' pasos');
  ok(new Set(nombres).size === 9, 'hay dos pasos con el mismo nombre');
});

caso('las cuatro etapas salen una vez cada una y en orden', () => {
  const h = M.html(1);
  const et = [...h.matchAll(/class="s-mp-et">([^<]*)</g)].map((m) => m[1]);
  ok(et.length === 4, 'hay ' + et.length + ' etapas, no cuatro');
  ok(et.join('|') === 'Investigación|Validación|Análisis|Veredicto', 'etapas o su orden: ' + et.join('|'));
});

caso('y coinciden con las que pinta la barra de la tarjeta', () => {
  // Dos mapas del mismo método que se separen es peor que uno solo: el
  // estudiante vería "paso 5 de 9" arriba y otro nombre abajo.
  for (const n of Object.keys(P.metodo)) ok(P.mapa[n], 'el paso ' + n + ' no existe en el mapa de la barra');
  for (const n of Object.keys(P.mapa)) ok(P.metodo[n], 'el paso ' + n + ' de la barra no está en el método');
});

console.log('\nCada paso dice POR QUÉ existe, que es lo que se aprende');

caso('los nueve traen `que` y `porque`, y ninguno de relleno', () => {
  for (const [n, m] of Object.entries(P.metodo)) {
    ok(m.nombre && m.nombre.length > 3, 'el paso ' + n + ' no tiene nombre');
    ok(m.que && m.que.length > 25, 'el paso ' + n + ' no dice qué se hace');
    // El porqué es el currículum: si cabe en una línea, no está explicando nada.
    ok(m.porque && m.porque.length > 70, 'el porqué del paso ' + n + ' es demasiado corto para enseñar algo');
    ok(m.etapa >= 1 && m.etapa <= 4, 'el paso ' + n + ' no está en ninguna etapa');
  }
});

caso('y el porqué llega al HTML, no se queda en el objeto', () => {
  const h = M.html(4);
  ok((h.match(/class="s-mp-pq"/g) || []).length === 9, 'no hay un bloque de porqué por paso');
  ok(h.includes(P.metodo[4].porque), 'el porqué del paso actual no se imprime');
  // Cerrado de entrada: nueve porqués abiertos son un muro de texto.
  ok((h.match(/class="s-mp-pq" hidden/g) || []).length === 9, 'los porqués salen abiertos');
});

console.log('\nEl mapa enseña el MÉTODO, no la herramienta');

caso('ningún paso nombra Black Box, Cerebro, Xray ni Helium 10', () => {
  // La herramienta es un detalle de implementación del método, no al revés. Y
  // el mapa lo ve todo el mundo: quien tiene datos reales y quien no.
  const todo = Object.values(P.metodo).map((m) => m.nombre + ' ' + m.que + ' ' + m.porque).join(' ');
  for (const t of ['Black Box', 'Cerebro', 'Xray', 'Helium 10', 'Jungle Scout'])
    ok(!new RegExp(t, 'i').test(todo), 'el mapa nombra ' + t);
});

caso('y no duplica los umbrales del motor', () => {
  // Sería la tercera copia de unas cifras que ya se desincronizaron una vez:
  // el prompt decía 4.500 mientras el motor cortaba en 5.400.
  const todo = Object.values(P.metodo).map((m) => m.que + ' ' + m.porque).join(' ');
  const cifras = todo.match(/\d[\d.,]{2,}/g) || [];
  ok(cifras.length === 0, 'el mapa escribe umbrales: ' + cifras.join(', '));
});

console.log('\nDónde está, qué hizo y qué falta');

caso('hecho / aquí / pendiente, según el paso', () => {
  const h = M.html(4);
  ok((h.match(/s-mp-p hecho/g) || []).length === 3, 'no marca los tres pasos ya hechos');
  ok((h.match(/s-mp-p aqui/g) || []).length === 1, 'no marca dónde está');
  ok((h.match(/s-mp-p pendiente/g) || []).length === 5, 'no marca los cinco que faltan');
  ok(/s-mp-p aqui" data-paso="4"/.test(h), 'marca el paso equivocado');
});

caso('en el paso 1 no hay nada hecho; en el 9, ocho', () => {
  ok((M.html(1).match(/s-mp-p hecho/g) || []).length === 0, 'da por hecho algo al empezar');
  ok((M.html(9).match(/s-mp-p hecho/g) || []).length === 8, 'al final no cuenta los ocho anteriores');
});

caso('sin paso marcado, todo sale pendiente y nada se rompe', () => {
  ok((M.html(0).match(/s-mp-p pendiente/g) || []).length === 9, 'sin paso no cae a todo pendiente');
});

console.log('\nEl fallo cae del lado seguro');

caso('sin sophie-pasos.js el mapa no se monta y la página sigue entera', () => {
  // Es la capa compartida: si no cargó, lo que NO puede pasar es que la página
  // reviente por un panel decorativo.
  const solo = cargar(false);
  ok(solo.SophieMapa.disponible() === false, 'dice que está disponible sin su fuente');
  ok(solo.SophieMapa.montar({}) === false, 'intenta montarse igual');
  ok(solo.SophieMapa.html(3) === null, 'devuelve HTML sin datos');
});

caso('marcar() ignora lo que no es un paso', () => {
  for (const malo of [0, -1, 10, 'x', null, undefined, NaN]) M.marcar(malo);
  ok(true, 'marcar() lanzó con una entrada inválida');
});

caso('si localStorage falla, el panel funciona igual', () => {
  // Ventana privada, datos bloqueados: recordar si lo dejó abierto es una
  // comodidad, y una comodidad no puede tumbar la pantalla.
  ok(/catch \(e\) \{ return false; \}/.test(SRC), 'la lectura de localStorage no está protegida');
  ok(/catch \(e\) \{ \/\* sin memoria/.test(SRC), 'la escritura de localStorage no está protegida');
});

caso('el texto del método se escapa', () => {
  const w = cargar(true);
  w.SophiePasos.metodo[1].nombre = '<img src=x onerror=alert(1)>';
  ok(!/<img/.test(w.SophieMapa.html(1)), 'el nombre de un paso puede inyectar HTML');
});

console.log('\nY las páginas lo montan de verdad');

// Un panel que nadie monta es un archivo muerto — ya pasó con sophie-guia.js.
for (const pagina of ['index.html', 'producto-v2.html']) {
  const f = path.join(RAIZ, '..', 'sophie-producto', pagina);
  if (!fs.existsSync(f)) continue;
  const P2 = fs.readFileSync(f, 'utf8');

  caso(pagina + ': carga el script, tiene su sitio y lo monta', () => {
    ok(/sophie-mapa\.js/.test(P2), 'no carga el script');
    ok(/id="mapa-metodo"/.test(P2), 'no hay sitio donde montarlo');
    ok(/SophieMapa\.montar\(/.test(P2), 'nunca se monta');
  });

  caso(pagina + ': le pasa el PASO, no la etapa', () => {
    // La barra de arriba agrupa los nueve pasos en cuatro etapas. Pasarle la
    // etapa al mapa lo dejaría marcando siempre entre el 1 y el 4 — y nadie
    // lo notaría hasta mirar de cerca, porque los dos números son plausibles.
    ok(/marcarPaso\(stepNum\)/.test(P2), 'no marca el paso al avanzar');
    ok(!/marcarPaso\(STAGE/.test(P2), 'le está pasando la etapa en vez del paso');
  });

  caso(pagina + ': al recargar, recupera el paso del historial', () => {
    // Se saca del marcador que lo escribió, no de una copia aparte: una segunda
    // copia del progreso es una copia que puede quedarse vieja.
    ok(/<!--P:\(\[1-9\]\)-->/.test(P2) || /P:\(\[1-9\]\)/.test(P2),
       'no lee el paso del historial guardado');
    ok(/marcarPaso\(ultimo \|\| 1\)/.test(P2), 'no marca el paso recuperado');
  });
}

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan');
process.exit(fallan ? 1 : 0);
