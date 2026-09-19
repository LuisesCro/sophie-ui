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
  // El colspan tiene que seguir al número de columnas: al añadir Peso pasó de
  // 6 a 7, y una nota con colspan corto deja un hueco raro al final de la fila.
  const cols = (h.match(/<\/th>/g) || []).length;   // `<th[^>]*>` también casa `<thead>`
  ok(h.includes('<td colspan="' + cols + '">'),
     'la nota no ocupa el ancho de la tabla (' + cols + ' columnas)');
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
  // El `<wbr>` es un punto de corte invisible que se mete tras el guion para
  // que un rango pueda partirse en dos lineas en vez de ensanchar su columna.
  // No cambia lo que se lee, asi que se quita antes de comparar.
  const h = H.html(HALL).replace(/<wbr>/g, '');
  for (const r of ['$24–51', '$19K–50K', '230–246', '7–39'])
    ok(h.includes(r), 'se perdió el rango ' + r);
  ok(/\$24–<wbr>51/.test(H.html(HALL)), 'el rango no trae punto de corte: la tabla se desbordará');
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
  // Se excluye el color del TEXTO SOBRE NARANJA: el naranja es fijo (es la
  // marca, no un token del tema), asi que lo que va encima tambien tiene que
  // serlo. Con un token heredaria el color del tema y en claro quedaria
  // naranja sobre naranja.
  // Se excluyen los colores de TEXTO SOBRE UN FONDO FIJO: el naranja de la
  // marca y el verde del botón de acción no salen del tema, así que lo que va
  // encima tampoco puede. Con un token heredarían el color del tema y en claro
  // quedaría naranja sobre naranja.
  const colores = (css.match(/[^-]color:\s*#[0-9a-f]{3,6}/gi) || [])
    .filter((c) => !/#0b1638|#06231a/i.test(c));
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

console.log('\nLa franja de cifras, con la salvedad del método');

caso('las cifras salen arriba, como en la extensión', () => {
  const h = H.html({ productos: [{ nombre: 'x' }], cifras: [
    { etq: 'Productos que cumplen', valor: '45' }, { etq: 'Precio', valor: '$22 – $50' }] });
  ok(/s-hz-cifras/.test(h), 'no hay franja de cifras');
  ok(h.includes('Productos que cumplen') && h.includes('45'), 'no imprime la cifra');
});

caso('pero en la validación van marcadas como PROVISIONALES', () => {
  // El Criterio 3 dice que los promedios SOLO valen sobre la tabla LIMPIA, y la
  // tabla llega sucia. Enseñar un promedio de la lista cruda como si contara es
  // enseñar mal — y además el estudiante ve el número moverse cuando saca al
  // que no encajaba, que es la mejor clase de Filtro 3 que se le puede dar.
  const v = H.htmlValidacion({ competidores: [{ nombre: 'x' }],
    cifras: [{ etq: 'Precio promedio', valor: '$20.54' }] });
  ok(/s-hz-cifras prov/.test(v), 'los promedios de la tabla sucia no se marcan');
  ok(/Provisionales/.test(v), 'no avisa de que todavía no cuentan');
  ok(/Cuentan de verdad cuando saques/.test(v), 'no dice qué hay que hacer para que cuenten');
  // Y en la de candidatos NO, porque ahí no son promedios de un nicho.
  ok(!/s-hz-cifras prov/.test(H.html({ productos: [{ nombre: 'x' }], cifras: [{ etq: 'a', valor: '1' }] })),
     'marca como provisional algo que no es un promedio de nicho');
});

console.log('\nEl paso a paso, que es lo que la automatización se comía');

caso('los filtros se muestran, y cada uno con su por qué', () => {
  const h = H.html({ productos: [{ nombre: 'x' }],
    filtros: [{ que: 'Peso', valor: 'máx. 3 lb' }, { que: 'Precio', valor: '$20 – $50' }] });
  ok(/Con qué filtré/.test(h), 'no enseña con qué filtró');
  ok(h.includes('máx. 3 lb'), 'no imprime el valor del filtro');
  // El POR QUÉ lo pone la aplicación: es currículum y tiene que decir lo mismo
  // siempre. Si lo redactara el modelo, dos alumnos aprenderían cosas distintas.
  ok(/el flete y la tarifa de FBA/.test(h), 'el filtro de peso llega sin su razón');
  ok(/las tarifas de Amazon se comen el margen/.test(h), 'el de precio llega sin su razón');
  ok(/¿Alguno no te cuadra\?/.test(h), 'no le ofrece moverlos: no es su búsqueda entonces');
});

caso('y el modelo puede matizar el porqué, sin poder borrarlo', () => {
  const h = H.html({ productos: [{ nombre: 'x' }],
    filtros: [{ que: 'Peso', valor: '5 lb', porque: 'Lo subí porque ya vendes.' }] });
  ok(h.includes('Lo subí porque ya vendes.'), 'no respeta el matiz del modelo');
});

caso('Qué hice · Por qué · Qué decides tú, en las dos pantallas', () => {
  const m = { hice: 'Busqué en la base de Amazon.', porque: 'Primero se acota con números.',
              decides: 'Elegir uno o dos que te llamen.' };
  for (const h of [H.html({ productos: [{ nombre: 'x' }], metodo: m }),
                   H.htmlValidacion({ competidores: [{ nombre: 'x' }], metodo: m })]) {
    for (const e of ['Qué hice', 'Por qué', 'Qué decides tú'])
      ok(h.includes(e), 'falta la etiqueta "' + e + '"');
    ok(h.includes(m.decides), 'no imprime lo que decide el estudiante');
    // El tercero va resaltado: es el único que le pide algo.
    ok(/s-hz-mf decides/.test(h), 'lo que decide el estudiante no se distingue');
  }
});

caso('sin bloque de método no se pinta un marco vacío', () => {
  ok(!/s-hz-metodo/.test(H.html({ productos: [{ nombre: 'x' }] })), 'pinta el marco sin contenido');
});

console.log('\nEl peso y la miniatura');

caso('el peso pasado de 3 lb se marca, el normal no', () => {
  const h = H.html({ productos: [
    { nombre: 'pesado', peso: '8.77' }, { nombre: 'normal', peso: '1.2' }] });
  ok(/s-hz-pesado[^>]*>8\.77 lb ⚠/.test(h), 'un producto de 8.77 lb no se marca');
  ok(!/s-hz-pesado[^>]*>1\.2/.test(h), 'marca como pesado uno de 1.2 lb');
  ok(h.includes('1.2 lb'), 'no añade la unidad cuando falta');
});

caso('la miniatura sale si viene, y si no la fila se dibuja igual', () => {
  const con = H.html({ productos: [{ nombre: 'x', imagen: 'https://m.media-amazon.com/i/a.jpg' }] });
  ok(/<img class="s-hz-img"/.test(con), 'no pinta la miniatura');
  ok(/onerror="this\.remove\(\)"/.test(con), 'una foto rota deja un hueco roto');
  const sin = H.html({ productos: [{ nombre: 'x' }] });
  ok(!/<img/.test(sin) && /s-hz-n">x/.test(sin), 'sin foto la fila se rompe');
});

caso('marca y ASIN bajo el nombre, como en la extensión', () => {
  const h = H.html({ productos: [{ nombre: 'Yarn', marca: 'Waikxin', asin: 'B0GK8F18R7' }] });
  ok(/s-hz-meta/.test(h) && h.includes('Waikxin') && h.includes('B0GK8F18R7'), 'falta marca o ASIN');
});

console.log('\nLos tokens llegan a TODOS los bloques que los usan');

caso('ningún bloque se queda sin la declaración de tokens', () => {
  // Una variable CSS solo baja a los DESCENDIENTES del elemento donde se
  // declara. Las cifras, el paso a paso y el aviso de provisionales son
  // HERMANOS de la tabla, no hijos: con la lista corta, `var(--hz-or)` no
  // resolvía ahí y el color caía al heredado. Naranja escrito, gris en
  // pantalla, y ni un error.
  const css = /var CSS = \[([\s\S]*?)\]\.join\(''\);/.exec(SRC)[1];
  const decl = css.slice(0, css.indexOf('--hz-tx:'));
  for (const b of ['s-hz-wrap', 's-hz-leyenda', 's-hz-fs', 's-hz-cifras', 's-hz-prov',
                   's-hz-filtros', 's-hz-metodo'])
    ok(decl.includes(b), 'el bloque ' + b + ' usa los tokens y no los recibe');
});

console.log('\nElegir productos: hasta tres');

caso('cada fila trae su casilla, con el nombre como valor', () => {
  const h = H.html(HALL);
  ok((h.match(/class="s-hz-ck"/g) || []).length === 3, 'no hay una casilla por producto');
  ok(h.includes('value="Epoxy Resin Kit 1 Gal"'), 'la casilla no lleva el nombre del producto');
});

caso('el tope es TRES y está escrito una sola vez', () => {
  // Si el número viviera en dos sitios —el que apaga las casillas y el que
  // escribe "de 3"— se separarían y el estudiante leería un límite distinto
  // del que se le aplica.
  ok(/var MAX_ELEGIDOS = 3;/.test(SRC), 'el tope no está declarado');
  ok((SRC.match(/MAX_ELEGIDOS/g) || []).length >= 3, 'el tope se usa en un solo sitio');
  ok(!/de 3</.test(SRC) && !/'3'/.test(SRC.slice(SRC.indexOf('function engancharEleccion'))),
     'hay un 3 escrito a mano junto al tope');
});

caso('al llegar al tope se APAGAN las demás, no se quita la cuarta', () => {
  // Un límite que se explica quitándole algo que ya te dio se vive como un
  // fallo de la aplicación, no como una regla.
  const f = SRC.slice(SRC.indexOf('function refrescar'), SRC.indexOf('container.addEventListener'));
  ok(/c\.disabled = !c\.checked && n >= MAX_ELEGIDOS/.test(f), 'no apaga las casillas al llegar al tope');
  ok(!/\.checked = false/.test(f), 'desmarca una casilla que el estudiante ya había marcado');
});

caso('el módulo avisa, no habla con el chat', () => {
  // Así sirve igual en las dos páginas sin conocer ninguna.
  ok(/new CustomEvent\('sophie-analizar'/.test(SRC), 'no emite el evento');
  ok(/bubbles: true/.test(SRC), 'el evento no sube: la página no lo va a oír');
  ok(!/SophieChat|window\.send|document\.getElementById\('input'\)/.test(SRC),
     'el módulo está tocando el chat directamente');
});

console.log('\nLa tabla entra entera, que es lo que costó dos intentos');

caso('los rangos pueden partirse en vez de desbordar', () => {
  // La tabla se envió dos veces cortada por la derecha. El ancho no lo forzaban
  // las cabeceras: lo forzaban los rangos con `white-space:nowrap`.
  const css = /var CSS = \[([\s\S]*?)\]\.join\(''\);/.exec(SRC)[1];
  ok(!/white-space:nowrap/.test(css.slice(css.indexOf('data-num'), css.indexOf('data-num') + 200)),
     'las celdas numéricas vuelven a llevar nowrap');
  ok(/overflow-wrap:anywhere/.test(css), 'no se permite partir un valor largo');
});

caso('y la decisión se toma con el ancho de la TARJETA, no de la ventana', () => {
  // Con `@media` la tabla miraba el viewport. La tarjeta de chat mide ~676px
  // sea la ventana de 760 o de 1400, así que en pantalla ancha el navegador
  // creía que cabía y cortaba las tres últimas columnas. Eso es lo que se vio.
  const css = /var CSS = \[([\s\S]*?)\]\.join\(''\);/.exec(SRC)[1];
  ok(/container-type:inline-size/.test(css), 'el contenedor no se declara como tal');
  ok(/@container \(max-width:\d+px\)/.test(css), 'no hay consulta de contenedor');
  // Y la copia en @media, para el navegador que no soporte contenedores.
  ok(/@media \(max-width:\d+px\)/.test(css), 'no hay repliegue por viewport');
  // El umbral tiene que dejar sitio a la tabla en una tarjeta de chat (~676px).
  // Estaba en 700 y la tarjeta caía SIEMPRE al apilado: nunca se veía la tabla.
  const umbral = Number(/@container \(max-width:(\d+)px\)/.exec(css)[1]);
  ok(umbral < 640, 'el umbral (' + umbral + 'px) apila también la tarjeta de chat');
  // Y con anchos fijos el desborde deja de ser posible, se apile o no.
  ok(/table-layout:fixed/.test(css), 'la tabla vuelve a poder pasarse de su hueco');
  ok(/<colgroup>/.test(SRC), 'no hay colgroup: los anchos fijos no se aplican a nada');
});

console.log('\nY la página lo llama de verdad');

// UN PINTOR QUE NADIE LLAMA ES UN ARCHIVO MUERTO. Es el mismo agujero que tuvo
// sophie-guia.js durante días: la pieza existía, estaba probada, y el camino
// real no pasaba por ella. Aquí se comprueba el cableado entero de las páginas.
for (const pagina of ['index.html', 'producto-v2.html']) {
  const f = path.join(RAIZ, '..', 'sophie-producto', pagina);
  if (!fs.existsSync(f)) continue;
  const P = fs.readFileSync(f, 'utf8');

  caso(pagina + ': escucha el botón de analizar y lo convierte en mensaje', () => {
    // El modulo emite el evento y la pagina lo traduce a lo que el estudiante
    // habria escrito. Sin esta parte, marcar tres productos no hace nada — y
    // eso no falla, simplemente no pasa nada, que es peor de diagnosticar.
    ok(/addEventListener\('sophie-analizar'/.test(P), 'no escucha el evento de la tabla');
    ok(/Quiero analizar est/.test(P), 'no arma el mensaje');
    ok(/send\(texto, true\)/.test(P), 'no lo manda al chat');
  });

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
