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
  // Si treinta estudiantes buscan con los mismos filtros, a los treinta les
  // salen los mismos productos y acaban compitiendo entre ellos.
  const h = conDatos(3);
  ok(/capital/i.test(h), 'no pregunta el capital');
  ok(/te interesa de verdad|intereses/i.test(h), 'no pregunta por sus intereses');
  ok(/compitiendo entre ellos/.test(h), 'no explica POR QUÉ hace falta personalizarla');
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
  // Los pasos 1 y 2 no cambian: no mandan a ninguna herramienta.
  const h = P.pantalla(2, { datos: true, vars: {} });
  ok(h && h.length > 100, 'el paso 2 se rompió con datos:true');
  ok(P.tieneDatos(2) === false, 'el 2 no debería tener variante');
});

caso('los pasos que el motor dibuja siguen devolviendo null', () => {
  for (const n of [6, 8, 9]) ok(P.pantalla(n, { datos: true }) === null, 'el paso ' + n + ' no es guiado');
});

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan');
process.exit(fallan ? 1 : 0);
