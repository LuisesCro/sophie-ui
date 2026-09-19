// Las pantallas guiadas, en sus dos versiones.
//
// Existe por un error concreto: durante dos dias se intento quitar a Cerebro del
// flujo editando el prompt, y no se movia. La razon es que estas pantallas NO las
// escribe el modelo — las pinta este archivo. Ninguna instruccion iba a cambiar
// un texto que vive en el front.
//
// Lo que se protege aqui son dos cosas opuestas a la vez:
//   · con datos reales, que NO se mande al estudiante a recolectar a mano
//   · sin datos reales, que el flujo de Helium 10 siga intacto — es el unico que
//     tiene la mayoria, y romperlo los deja sin metodo
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(AQUI, '..', 'sophie-pasos.js'), 'utf8');
const win = { };
new Function('window', SRC)(win);
const P = win.SophiePasos;

let pasan = 0, fallan = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
function caso(nombre, fn) {
  try { fn(); pasan++; console.log('  ✓ ' + nombre); }
  catch (e) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + e.message); }
}
const conDatos = (n) => P.pantalla(n, { datos: true, vars: { keyword: 'mahjong racks', categoria: 'Toys & Games' } });
const sinDatos = (n) => P.pantalla(n, { vars: { keyword: 'mahjong racks', categoria: 'Toys & Games' } });

console.log('\nCon datos reales: no se manda a recolectar nada');

caso('ninguna de las cuatro pantallas nombra las herramientas de recolección', () => {
  for (const n of [3, 4, 5, 7]) {
    const h = conDatos(n);
    for (const t of ['Black Box', 'Xray', 'Cerebro', 'Helium 10'])
      ok(!new RegExp(t, 'i').test(h), 'el paso ' + n + ' sigue mandando a ' + t);
  }
});

caso('y tampoco le piden pegar datos que Sophie ya tiene', () => {
  const h = conDatos(5) + conDatos(7);
  for (const d of ['Search Volume', 'Average Revenue', 'Total Revenue', 'Creation Date'])
    ok(!new RegExp(d, 'i').test(h), 'sigue pidiendo ' + d + ' a mano');
});

caso('el paso 3 pide lo que hace la búsqueda SUYA, no la de todos', () => {
  const h = conDatos(3);
  ok(/capital/i.test(h), 'no pregunta el capital');
  ok(/te interesa de verdad|intereses/i.test(h), 'no pregunta por sus intereses');
});

caso('y lo pide sin asustarlo', () => {
  // Aquí había un aviso en rojo ("esto no es relleno… acabarían compitiendo
  // entre ellos"). Es cierto, pero en el paso 3 el estudiante todavía no tiene
  // producto: se le daba una alarma antes que un resultado. La personalización
  // se consigue preguntando bien, no avisando de lo que pasa si no contesta.
  const h = conDatos(3);
  ok(!/s-warn/.test(h), 'volvió una advertencia roja al paso 3');
  ok(!/no es relleno|compitiendo entre ellos/i.test(h), 'volvió el aviso de los treinta estudiantes');
});

caso('pero las defensas anti-clon NO viven en ese párrafo', () => {
  // Quitar el texto no puede quitar la protección. Lo que evita que a treinta
  // estudiantes les salga la misma lista está en el motor —reparto con semilla
  // por persona, exclusión de lo ya tomado y caché de descubrimiento por
  // usuario—, no en una advertencia que el alumno puede ignorar.
  const jungle = path.join(AQUI, '..', '..', 'sophie-producto', 'netlify', 'edge-functions', 'jungle.js');
  if (!fs.existsSync(jungle)) return; // repo no montado: no bloquea
  const j = fs.readFileSync(jungle, 'utf8');
  ok(/function repartir\(/.test(j), 'se perdió el reparto por semilla');
  ok(/function semillaDe\(/.test(j), 'se perdió la semilla por persona');
  ok(/function yaTomados\(/.test(j), 'se perdió la exclusión de lo ya tomado');
  ok(/El descubrimiento cachea POR PERSONA/.test(j), 'la caché de descubrimiento dejó de ser por persona');
});

caso('el paso 5 le explica por qué limpiar la tabla es suyo y no de Sophie', () => {
  const h = conDatos(5);
  ok(/PESO/.test(h) && /PRECIO/.test(h), 'no le dice qué mirar');
  ok(/No puedo decidirlo yo/.test(h), 'no marca el límite');
  ok(/lo que TU piensas vender|lo que TÚ piensas vender/.test(h),
     'no explica que la decisión depende de lo que él quiere vender');
});

caso('el paso 7 conserva las cuatro cosas que ningún dato contesta', () => {
  const h = conDatos(7);
  for (const c of ['Alibaba', 'estrellas', 'patentada', 'Seller Central'])
    ok(new RegExp(c, 'i').test(h), 'se perdió: ' + c);
  ok(/lo mas valioso que vas a hacer|lo más valioso que vas a hacer/.test(h),
     'no le da el marco de por qué vale la pena');
});

caso('las etiquetas del progreso ya no mienten', () => {
  ok(/Buscando candidatos/.test(conDatos(3)), 'el paso 3 sigue diciendo Black Box');
  ok(/Limpiar la tabla/.test(conDatos(5)), 'el paso 5 sigue diciendo recolección');
  ok(!/Black Box/.test(conDatos(3)), 'la etiqueta vieja sigue ahí');
});

console.log('\nSin datos reales: el flujo de Helium 10 intacto');

caso('los cuatro pasos siguen guiando a las herramientas', () => {
  // La mayoría de los estudiantes no tiene datos reales. Para ellos este flujo
  // es el único método que existe; romperlo es peor que no haber tocado nada.
  ok(/Black Box/.test(sinDatos(3)), 'el paso 3 perdió Black Box');
  ok(/Cerebro/.test(sinDatos(4)), 'el paso 4 perdió Cerebro');
  ok(/Xray/.test(sinDatos(5)), 'el paso 5 perdió Xray');
  ok(/estrellas/i.test(sinDatos(7)), 'el paso 7 perdió las reseñas');
});

caso('y siguen pidiendo los datos que el estudiante tiene que traer', () => {
  ok(/Search Volume/.test(sinDatos(5)), 'ya no pide el header');
  ok(/4,500/.test(sinDatos(3)), 'se perdieron los filtros de Black Box');
});

console.log('\nEl fallo, cuando ocurra, cae del lado seguro');

caso('sin la señal `datos` se pinta la pantalla manual', () => {
  // La señal la emite el modelo en el marcador. Si un dia se le olvida, el
  // estudiante ve la pantalla de siempre — que funciona. Al revés sería grave:
  // alguien sin datos reales viendo "ya te traje la tabla".
  const h = P.pantalla(5, { vars: { keyword: 'x' } });
  ok(/Xray/.test(h), 'sin señal no cae a la versión manual');
});

caso('un paso sin variante con datos usa la de siempre, no se rompe', () => {
  // El paso 1 es la bienvenida: no manda a ninguna herramienta, así que no
  // necesita variante y tiene que seguir funcionando con datos:true.
  const h = P.pantalla(1, { datos: true, vars: {} });
  ok(h && h.length > 100, 'el paso 1 se rompió con datos:true');
  ok(P.tieneDatos(1) === false, 'el 1 no debería tener variante');
});

caso('los pasos que el motor dibuja siguen devolviendo null', () => {
  for (const n of [6, 8, 9]) ok(P.pantalla(n, { datos: true }) === null, 'el paso ' + n + ' no es guiado');
});


console.log('\nLas categorías dejan de ser ocho cajones de Black Box');

caso('con datos reales se ofrecen subnichos, no solo la categoría grande', () => {
  const h = conDatos(2);
  ok(/Bordado y costura/.test(h), 'no baja al subnicho');
  ok(/Juegos de mesa/.test(h), 'falta una categoría que Black Box no ofrecía');
  ok(Object.keys(P.categorias).length > 8, 'siguen siendo ocho: ' + Object.keys(P.categorias).length);
});

caso('cada categoría abierta trae varios subnichos', () => {
  for (const c of Object.keys(P.categorias))
    ok(P.categorias[c].length >= 3, c + ' solo tiene ' + P.categorias[c].length + ' subnicho(s)');
});

caso('las bloqueadas siguen bloqueadas Y dicen por qué', () => {
  // Un principiante en esas categorías se juega el pedido entero a un permiso.
  const h = conDatos(2);
  for (const c of ['Electronics', 'Grocery', 'Automotive', 'Supplements'])
    ok(new RegExp(c, 'i').test(h), 'se dejó de bloquear: ' + c);
  for (const c of Object.keys(P.bloqueadas))
    ok(P.bloqueadas[c].length > 20, c + ' se bloquea sin explicar por qué');
});

caso('y no se ofrece ninguna bloqueada como buscable', () => {
  const abiertas = Object.keys(P.categorias).join(' ').toLowerCase();
  for (const c of ['electronics', 'grocery', 'automotive'])
    ok(!abiertas.includes(c), 'una categoría bloqueada está en la lista de buscables: ' + c);
});

caso('sin datos reales, la pantalla 2 sigue siendo la de las ocho', () => {
  const h = sinDatos(2);
  ok(!/Bordado y costura/.test(h), 'le cambió la pantalla a quien no tiene datos');
});


console.log('\nLa bienvenida no nombra herramientas');

caso('el paso 1 vale igual con datos y sin ellos', () => {
  // Lo pinta la app SIN llamar al modelo, así que ahí no se sabe si el
  // estudiante tiene datos reales. El texto tiene que ser cierto en los dos
  // casos — antes decía "desde cero en Helium 10", falso para quien los tiene.
  for (const h of [conDatos(1), sinDatos(1)]) {
    for (const t of ['Helium 10', 'Black Box', 'Xray', 'Cerebro', 'Jungle Scout'])
      ok(!new RegExp(t, 'i').test(h), 'la bienvenida nombra ' + t);
  }
});

caso('y siguen siendo tres caminos distintos', () => {
  const h = sinDatos(1);
  for (const o of ['A', 'B', 'C']) ok(new RegExp('>' + o + '<').test(h), 'falta la opción ' + o);
});

caso('A ya no suena a no se me ocurrió nada', () => {
  // Con el descubrimiento cableado es el camino fuerte: partir del mercado da
  // mejores productos que enamorarse de una idea antes de mirar los números.
  const h = sinDatos(1);
  ok(!/No tengo ninguna idea/.test(h), 'sigue planteado como una carencia');
  ok(/busquemos el producto juntos/.test(h), 'no propone buscar juntos');
});

/* ---------------------------------------------------------------
   EL PUENTE, que es por donde entra el usuario de verdad.

   Todo lo de arriba llama a SophiePasos.pantalla() DIRECTAMENTE. El
   navegador no hace eso: el modelo emite <!--PASO:{...}--> y
   sophie-guia.js lo traduce. Y ese traductor reenviaba reaccion,
   chips, vars y win… y dejaba caer `datos`.

   Resultado: daba igual que Sophie marcara "datos": true, porque
   aquí llegaba como si no lo hubiera hecho y se pintaba SIEMPRE la
   pantalla manual — la que manda a Black Box, a Cerebro y a Xray.
   Se persiguió en el prompt durante días. No estaba en el prompt.

   Estas pruebas pasaban en verde mientras ocurría, porque entraban
   por donde no entra el usuario. Una prueba que se salta el trozo
   que falla no prueba nada del camino real.
   --------------------------------------------------------------- */
const SRC_GUIA = fs.readFileSync(path.join(AQUI, '..', 'sophie-guia.js'), 'utf8');
new Function('window', SRC_GUIA)(win);
const G = win.SophieGuia;
const marcador = (paso, datos) => '<!--PASO:' + JSON.stringify({
  paso, datos, reaccion: 'Perfecto.', vars: { keyword: 'mahjong racks', categoria: 'Toys & Games' },
}) + '--><!--P:' + paso + '--><!--M:H-->';
function porElPuente(paso, datos) {
  const p = G.detectar(marcador(paso, datos));
  const cont = { innerHTML: '' };
  ok(p, 'el marcador del paso ' + paso + ' no se detecta');
  ok(G.pintar(cont, p), 'el puente no pudo pintar el paso ' + paso);
  return cont.innerHTML;
}

console.log('\nPor el puente (como lo vive el estudiante), no por la puerta de atrás');

caso('con "datos": true NINGUNA pantalla nombra una herramienta', () => {
  // Es el fallo exacto que se reportó tres veces. Si el puente vuelve a tirar
  // el campo, esta prueba lo dice; la de arriba seguiría en verde.
  for (const n of [2, 3, 4, 5, 7]) {
    const h = porElPuente(n, true);
    for (const t of ['Black Box', 'Xray', 'Cerebro', 'Helium 10'])
      ok(!new RegExp(t, 'i').test(h), 'el paso ' + n + ' sigue nombrando ' + t + ' con datos:true');
  }
});

caso('y sin la señal siguen siendo las de siempre', () => {
  // La otra mitad, que importa igual: la mayoría no tiene datos reales y el
  // flujo de Helium 10 es el único método que tiene.
  ok(/Black Box/.test(porElPuente(3, false)), 'el paso 3 perdió Black Box por el puente');
  ok(/Cerebro/.test(porElPuente(4, false)), 'el paso 4 perdió Cerebro por el puente');
  ok(/Xray/.test(porElPuente(5, false)), 'el paso 5 perdió Xray por el puente');
});

caso('el puente reenvía TODOS los campos del marcador, no unos cuantos', () => {
  // La causa raíz no fue `datos` en particular: fue una lista de campos escrita
  // a mano que se quedó corta. Se comprueba la lista entera para que el próximo
  // campo que se añada no se caiga igual.
  const html = SRC_GUIA.slice(SRC_GUIA.indexOf('function html(payload)'),
                              SRC_GUIA.indexOf('function pintar'));
  for (const campo of ['datos', 'reaccion', 'chips', 'vars', 'win'])
    ok(new RegExp('\\b' + campo + ':').test(html), 'el puente no reenvía `' + campo + '`');
});

caso('un marcador sin `datos` cae del lado seguro', () => {
  // Si el modelo olvida la señal, el estudiante ve la pantalla manual, que
  // funciona. Al revés sería grave: alguien sin datos leyendo "ya te traje
  // la tabla" y sin tabla ninguna.
  const p = G.detectar('<!--PASO:{"paso":5}-->');
  const cont = { innerHTML: '' };
  G.pintar(cont, p);
  ok(/Xray/.test(cont.innerHTML), 'sin señal no cae a la versión manual');
});

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan');
process.exit(fallan ? 1 : 0);
