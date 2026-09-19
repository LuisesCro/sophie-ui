// LAS DOS PANTALLAS CON TABLA (sophie-hallazgos.js).
//
// POR QUÉ EXISTE: las dos salían en prosa. La lista de candidatos, ocho
// párrafos seguidos con el precio, el revenue, las reseñas, el ratio y los
// meses apelmazados entre puntos medios — imposible comparar dos productos sin
// releer. Y la validación de keyword igual, con el "Por qué lo decides tú"
// perdido al final en el mismo gris que todo lo demás, cuando es la parte que
// le pide al estudiante que decida.
//
// Salían en prosa por la razón de siempre: sin molde, el modelo escribe
// párrafos, que es su forma por defecto. Y un molde en el prompt tampoco basta
// —se probó— porque el turno sigue dependiendo de que maquete bien. Así que el
// modelo manda los DATOS y esto dibuja.
//
// Lo que se protege aquí:
//   · que la tabla salga completa aunque falten campos
//   · que el naranja caiga donde tiene que caer (ratio, peso, el "por qué")
//   · que un marcador roto degrade a null y no reviente la pantalla
//   · que un nombre de producto no pueda inyectar HTML
//   · que los colores NO estén escritos a mano (se probó: en tema claro los
//     nombres quedaban blancos sobre blanco, la tabla entera invisible)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SRC = fs.readFileSync(path.join(RAIZ, 'sophie-hallazgos.js'), 'utf8');
const win = {};
new Function('window', fs.readFileSync(path.join(RAIZ, 'sophie-pasos.js'), 'utf8'))(win);
new Function('window', SRC)(win);
const H = win.SophieHallazgos;

let pasan = 0, fallan = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
function caso(nombre, fn) {
  let err = null;
  try { fn(); } catch (e) { err = e.message; }
  if (err) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + err); }
  else { pasan++; console.log('  ✓ ' + nombre); }
}

const HALL = {
  paso: 3, titulo: 'Encontré 45 productos', intro: 'Los más interesantes.',
  productos: [
    { nombre: 'Epoxy Resin Kit 1 Gal', precio: '$50', revenue: '$109K', resenas: 42, ratio: 52, meses: 28 },
    { nombre: 'Foam Roll (Pangda)', precio: '$24–51', revenue: '$19K–50K', resenas: '230–246',
      ratio: '~3.7', meses: '7–39', variaciones: 7, nota: 'Es UN solo competidor con variaciones.' },
    { nombre: 'Airbrush Kit', precio: '$26', revenue: '$3.8K', resenas: 21, ratio: 7 },
  ],
  cta: '¿Cuál te llama? 👇',
};
const VAL = {
  paso: 4, keyword: 'chunky chenille yarn', intro: 'Tengo los datos del nicho.',
  filtros: [
    { nombre: 'Sin marcas', estado: 'ok', nota: 'Ninguna marca domina.' },
    { nombre: 'Específica', estado: 'ok', nota: 'Describe un tipo concreto.' },
    { nombre: 'Homogeneidad', estado: 'pendiente', nota: 'Aquí necesito tu ojo.' },
  ],
  competidores: [
    { nombre: 'Waikxin — 10 Pack Jumbo', precio: '$38.19', peso: '4.83 lb', resenas: 653 },
    { nombre: 'Lpalats — #6 Super Bulky', precio: '$21.99', peso: '1.41 lb', resenas: 221 },
  ],
  porque: 'El peso y el precio lo dicen todo.',
  cta: '¿Cuáles compiten contigo? 👇',
};
const marca = (n, o) => '<!--' + n + ':' + JSON.stringify(o) + '--><!--P:3--><!--M:S-->';

console.log('\nLa lista de candidatos sale como TABLA, no como párrafos');

caso('una fila por producto, con sus seis columnas', () => {
  const h = H.html(HALL);
  ok(/<table class="s-hz">/.test(h), 'no es una tabla');
  for (const c of ['Producto', 'Precio', 'Revenue', 'Reseñas', 'Ratio', 'Meses'])
    ok(h.includes('>' + c + '</th>'), 'falta la columna ' + c);
  const cuerpo = h.slice(h.indexOf('<tbody>'), h.indexOf('</tbody>'));
  ok((cuerpo.match(/<tr>/g) || []).length === 3, 'no hay una fila por producto');
  ok((cuerpo.match(/<tr class="s-hz-nr">/g) || []).length === 1, 'la nota no va en su propia fila');
});

caso('la nota va a lo ancho, no metida en la primera celda', () => {
  // Dentro de la celda se envolvía en una columna estrecha —siete líneas para
  // una frase— y dejaba el resto de la fila en blanco. La tabla se rompía justo
  // en el producto que más explicación necesita: el que tiene variaciones.
  const h = H.html(HALL);
  ok(/<td colspan="6">/.test(h), 'la nota no ocupa el ancho de la tabla');
  ok(!/s-hz-n">Foam Roll \(Pangda\)<\/span>[^<]*Es UN solo/.test(h), 'la nota volvió a la celda');
});

caso('un campo que falta sale como raya, no como "undefined"', () => {
  const h = H.html(HALL);
  ok(!/undefined|null/.test(h), 'se coló un undefined o un null en la pantalla');
  ok(h.includes('>—</td>') || h.includes('—'), 'un campo vacío no cae a la raya');
});

caso('los rangos se respetan, no se aplastan a un número', () => {
  // Un producto con variaciones TIENE rango de verdad. Redondearlo sería
  // inventar una precisión que el dato no tiene.
  const h = H.html(HALL);
  for (const r of ['$24–51', '$19K–50K', '230–246', '7–39'])
    ok(h.includes(r), 'se perdió el rango ' + r);
});

console.log('\nLa validación de keyword, igual');

caso('los tres filtros con su estado, y el pendiente marcado', () => {
  const h = H.htmlValidacion(VAL);
  ok((h.match(/class="s-hz-f /g) || []).length === 3, 'no hay tres filtros');
  ok(/class="s-hz-f pend"/.test(h), 'el filtro pendiente no se distingue');
  ok((h.match(/class="s-hz-f ok"/g) || []).length === 2, 'los dos aprobados no se marcan');
});

caso('la tabla de competidores trae el PESO, que es lo que delata al distinto', () => {
  const h = H.htmlValidacion(VAL);
  ok(h.includes('>Peso</th>'), 'falta la columna del peso');
  ok(/s-hz-r">4\.83 lb/.test(h), 'el peso no va resaltado');
});

caso('y el "Por qué lo decides tú" existe y es suyo', () => {
  const h = H.htmlValidacion(VAL);
  ok(/Por qué lo decides tú/.test(h), 'falta el bloque del porqué');
  ok(h.includes('El peso y el precio lo dicen todo.'), 'no se imprime el criterio de Sophie');
  // Sin `porque` no se pinta el bloque vacío: mejor nada que un marco sin texto.
  const sin = { ...VAL }; delete sin.porque;
  ok(!/Por qué lo decides tú/.test(H.htmlValidacion(sin)), 'pinta el bloque aunque esté vacío');
});

console.log('\nEl naranja cae donde tiene que caer');

caso('en el ratio, en el peso y en los dos bloques de explicación', () => {
  const h = H.html(HALL), v = H.htmlValidacion(VAL);
  ok(/class="s-hz-r"/.test(h), 'el ratio no va en naranja');
  ok(/class="s-hz-th-r"/.test(h) && /class="s-hz-th-r"/.test(v), 'la cabecera de esa columna no se marca');
  ok(/class="s-hz-leyenda"/.test(h) && /class="s-hz-leyenda"/.test(v), 'falta el bloque naranja');
});

caso('la leyenda del ratio la pone la APLICACIÓN, no el modelo', () => {
  // Es método, no narración. Si Sophie la redactara cada vez, dos estudiantes
  // aprenderían dos cosas distintas del mismo número.
  const h = H.html({ productos: [{ nombre: 'x' }] });
  ok(/Cómo leer el/.test(h), 'la leyenda no sale sola');
  ok(/ventas del mes ÷ reseñas acumuladas/.test(h), 'falta la fórmula');
  ok(/producto joven/.test(h) && /producto maduro/.test(h), 'no distingue joven de maduro');
  // Y no se puede sobrescribir desde el marcador.
  const h2 = H.html({ productos: [{ nombre: 'x' }], leyenda: 'ratio = lo que yo quiera' });
  ok(!/lo que yo quiera/.test(h2), 'el modelo puede reescribir la leyenda');
});

console.log('\nLos colores salen de los tokens del tema, no escritos a mano');

caso('ningún color de texto va en crudo dentro del CSS', () => {
  // Se probó sobre el tema claro: con #fff escrito a mano, los nombres de
  // producto quedaban BLANCOS SOBRE BLANCO — la tabla entera invisible, sin un
  // solo error. Hoy las páginas van en oscuro, así que no llegó a producción;
  // el día que una cambie de tema, habría llegado.
  const css = /var CSS = \[([\s\S]*?)\]\.join\(''\);/.exec(SRC)[1];
  const colores = css.match(/color:\s*#[0-9a-f]{3,6}/gi) || [];
  ok(colores.length === 0, 'colores escritos a mano en el CSS: ' + colores.join(', '));
  for (const t of ['--hz-tx', '--hz-tx2', '--hz-tx3', '--hz-or'])
    ok(css.includes(t), 'falta el token ' + t);
  ok(/var\(--so-tx,var\(--sc-tx,/.test(css.replace(/\s/g, '')), 'los tokens no caen al tema claro');
});

caso('y trae su propio box-sizing, sin depender de la página', () => {
  // Sin esto, en móvil el width:100% de cada celda se suma a su padding y los
  // números salen cortados por la derecha. Se vio.
  ok(/box-sizing:border-box/.test(SRC), 'depende de que la página ponga el box-sizing');
});

console.log('\nLa cabecera dice el paso con datos reales, no el manual');

caso('pasa `datos` a cabecera(), que es el argumento que se cae siempre', () => {
  // Es el mismo campo que se perdía en sophie-guia.js, en otro sitio: la barra
  // decía "PASO 3 DE 9 — FILTROS EN BLACK BOX" encima de una tabla que Sophie
  // acababa de traer ella sola. Una función con un parámetro de más y una
  // llamada con uno de menos no dan error: dan la pantalla equivocada.
  ok(/cabecera\(paso, true\)/.test(SRC), 'no marca la cabecera como de datos reales');
  const h = H.html(HALL);
  ok(!/Black Box/.test(h), 'la cabecera sigue diciendo Black Box');
  ok(!/Cerebro/.test(H.htmlValidacion(VAL)), 'la cabecera de validación sigue diciendo Cerebro');
});

console.log('\nEl fallo cae del lado seguro');

caso('un marcador a medias (streaming) devuelve null, no revienta', () => {
  ok(H.detectar('<!--HALLAZGOS:{"productos":[{"nom') === null, 'un marcador truncado no degrada');
  ok(H.detectar('<!--HALLAZGOS:{roto}-->') === null, 'un JSON roto no degrada');
  ok(H.detectar('texto normal sin marcador') === null, 'detecta donde no hay nada');
  ok(H.detectarValidacion('<!--VALIDACION:{"competidores":[') === null, 'validación truncada no degrada');
});

caso('sin productos no se pinta una tabla vacía', () => {
  ok(H.html({ productos: [] }) === null, 'pinta una tabla sin filas');
  ok(H.detectar(marca('HALLAZGOS', { productos: [] })) === null, 'acepta un marcador sin productos');
  ok(H.htmlValidacion({ competidores: [] }) === null, 'pinta una validación sin competidores');
});

caso('limpiar() quita el marcador y los invisibles', () => {
  const t = 'algo ' + marca('HALLAZGOS', HALL) + ' mas';
  ok(!/HALLAZGOS|<!--P:|<!--M:/.test(H.limpiar(t)), 'deja marcadores a la vista');
  ok(H.limpiar(t).includes('algo') && H.limpiar(t).includes('mas'), 'se lleva el texto de alrededor');
});

caso('un nombre de producto no puede inyectar HTML', () => {
  // Los nombres vienen de Amazon vía el modelo. Escapar no es paranoia: es que
  // el dato no es nuestro.
  const h = H.html({ productos: [{ nombre: '<img src=x onerror=alert(1)>', precio: '"><b>x' }] });
  ok(!/<img/.test(h), 'se coló una etiqueta desde el nombre');
  ok(!/onerror/.test(h) || /&lt;img/.test(h), 'el nombre no se escapó');
  ok(!/"><b>/.test(h), 'el precio no se escapó');
});

caso('pintar() devuelve false si no hay nada que pintar', () => {
  const c = { innerHTML: 'antes' };
  ok(H.pintar(c, { productos: [] }) === false, 'dice que pintó una tabla vacía');
  ok(c.innerHTML === 'antes', 'borró el contenedor sin tener con qué llenarlo');
  ok(H.pintarValidacion(c, null) === false, 'dice que pintó una validación nula');
});

console.log('\nY la página lo llama de verdad');

// UN PINTOR QUE NADIE LLAMA ES UN ARCHIVO MUERTO. Es el mismo agujero que tuvo
// sophie-guia.js durante días: la pieza existía, estaba probada, y el camino
// real no pasaba por ella. Aquí se comprueba el cableado entero de las páginas.
for (const pagina of ['index.html', 'producto-v2.html']) {
  const f = path.join(RAIZ, '..', 'sophie-producto', pagina);
  if (!fs.existsSync(f)) continue;
  const P = fs.readFileSync(f, 'utf8');

  caso(pagina + ': carga el script y arma las dos pantallas', () => {
    ok(/sophie-hallazgos\.js/.test(P), 'no carga el script');
    ok(/SophieHallazgos\.detectar\(full\)/.test(P), 'no arma la tabla de candidatos al terminar');
    ok(/SophieHallazgos\.detectarValidacion\(full\)/.test(P), 'no arma la de validación');
    ok(/SophieHallazgos\.pintar\(container/.test(P) &&
       /SophieHallazgos\.pintarValidacion\(container/.test(P), 'detecta pero no pinta');
  });

  caso(pagina + ': el texto crudo no pisa la tabla mientras llega', () => {
    // Sin esto el estudiante ve el JSON del marcador escribiéndose en pantalla
    // y luego, de golpe, la tabla. Feo y desconcertante.
    ok(/!esHz && !esVal/.test(P), 'el marcador se pinta crudo durante el streaming');
    ok(/esHz && !esVal && !esPantalla|!esHz && !esVal && !esPantalla/.test(P),
       'el fallback de formato puede pisar la tabla ya pintada');
  });

  caso(pagina + ': una sesión guardada rearma las tablas', () => {
    // Si no, al recargar la página el estudiante pierde la tabla y se queda con
    // un hueco donde antes había ocho productos.
    ok(/raw\.indexOf\('<!--HALLAZGOS:'\)/.test(P), 'no rearma la tabla de candidatos al recargar');
    ok(/raw\.indexOf\('<!--VALIDACION:'\)/.test(P), 'no rearma la de validación al recargar');
  });
}

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan');
process.exit(fallan ? 1 : 0);
