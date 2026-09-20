// El motor: bandas donde el dato es un modelo, corte duro donde es medido.
//
// Este es el archivo que de verdad decide el veredicto — no el prompt. La
// aplicación calcula 9 de los criterios con estos umbrales y el modelo solo
// juzga los que dependen de lo que el estudiante observó. Un umbral mal puesto
// aquí no produce ningún error: produce veredictos plausibles y equivocados.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const win = {};
new Function('window', fs.readFileSync(path.join(AQUI, '..', 'sophie-criterios.js'), 'utf8'))(win);
const C = win.SophieCriterios;
const LISTA = C.criterios || C.lista || C.todos;
const de = (id) => LISTA.find((c) => c.id === id);

let pasan = 0, fallan = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
function caso(nombre, fn) {
  try { fn(); pasan++; console.log('  ✓ ' + nombre); }
  catch (e) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + e.message); }
}

// La misma lógica de tres zonas que aplica sophie-motor.js.
function estado(c, v) {
  if (c.direccion === 'min') return v >= c.umbral_num ? 'pass' : (v >= c.alerta_num ? 'alerta' : 'fail');
  return v <= c.umbral_num ? 'pass' : (v <= c.alerta_num ? 'alerta' : 'fail');
}

console.log('\nCada criterio declara en qué se apoya');

caso('todos los que tienen umbral dicen si son medidos o estimados', () => {
  // Sin este campo, el próximo que toque un número no sabe si puede.
  for (const c of LISTA) {
    if (c.direccion === 'juicio' || !c.umbral_num) continue;
    ok(c.base, 'el criterio ' + c.id + ' (' + c.criterio + ') no declara su base');
  }
});

console.log('\nLo ESTIMADO lleva banda de ±20%');

caso('el volumen ya no descarta dentro del ruido', () => {
  // El caso real: 4.200 búsquedas medidas caían como fail con el corte en 4.500,
  // cuando el error de la herramienta es del 16%. Ahora es zona gris.
  const c = de(1);
  ok(c.base === 'estimado', 'el volumen no está marcado como estimado');
  ok(estado(c, 4200) === 'alerta', '4.200 debería ser zona gris, dio ' + estado(c, 4200));
  ok(estado(c, 3000) === 'fail', '3.000 sí debe descartar');
  ok(estado(c, 6000) === 'pass', '6.000 debe aprobar limpio');
});

caso('el revenue tampoco: $2.950 deja de ser un descarte seguro', () => {
  // Un mercado que factura $3.500 de verdad puede reportarse en $2.950. Con el
  // corte viejo en $3.000 se descartaba con total seguridad.
  const c = de(2);
  ok(estado(c, 2950) === 'alerta', '$2.950 debería ser gris, dio ' + estado(c, 2950));
  ok(estado(c, 2000) === 'fail', '$2.000 sí descarta');
  ok(estado(c, 6000) === 'pass', '$6.000 aprueba');
});

caso('las keywords con demanda llevan la misma banda', () => {
  const c = de(7);
  ok(estado(c, 28) === 'alerta', '28 keywords debería ser gris, dio ' + estado(c, 28));
  ok(estado(c, 10) === 'fail', '10 sí descarta');
  ok(estado(c, 40) === 'pass', '40 aprueba');
});

caso('la aritmética es exactamente ±20% sobre los umbrales del método', () => {
  ok(de(1).umbral_num === 5400 && de(1).alerta_num === 3600, 'volumen: ' + de(1).umbral_num + '/' + de(1).alerta_num);
  ok(de(2).umbral_num === 5400 && de(2).alerta_num === 2400, 'revenue: ' + de(2).umbral_num + '/' + de(2).alerta_num);
  ok(de(7).umbral_num === 36 && de(7).alerta_num === 12, 'keywords: ' + de(7).umbral_num + '/' + de(7).alerta_num);
});

caso('la concentración lleva banda MÁS ESTRECHA por ser un cociente', () => {
  // Si la herramienta subestima a todos los competidores parecido, el reparto
  // entre ellos casi no se mueve. Ensancharla un 20% sería regalar rigor.
  const c = de(3);
  ok(c.base === 'estimado_cociente', 'no distingue el cociente: ' + c.base);
  ok(c.umbral_num === 36 && c.alerta_num === 66, 'concentración: ' + c.umbral_num + '/' + c.alerta_num);
  const ancho = (c.alerta_num - c.umbral_num) / 40;
  ok(ancho < 0.85, 'la banda del cociente es tan ancha como la de los estimados');
});

console.log('\nLo MEDIDO conserva el corte exacto');

caso('el precio sigue cortando en $20, sin colchón', () => {
  const c = de(5);
  ok(c.base === 'medido', 'el precio no está marcado como medido');
  ok(c.umbral_num === 20, 'el corte se movió a ' + c.umbral_num);
  ok(estado(c, 19.99) === 'fail', '$19.99 tiene que descartar: el precio se lee, no se estima');
});

caso('y las reseñas siguen en 300 y 500', () => {
  const c = de(4);
  ok(c.base === 'medido', 'las reseñas no están marcadas como medidas');
  ok(c.umbral_num === 300 && c.alerta_num === 500, 'reseñas: ' + c.umbral_num + '/' + c.alerta_num);
});

caso('ningún criterio medido se ensanchó por descuido', () => {
  const originales = { 4: [300, 500], 5: [20, 20] };
  for (const id of Object.keys(originales)) {
    const c = de(Number(id));
    ok(c.umbral_num === originales[id][0] && c.alerta_num === originales[id][1],
       'el criterio medido ' + id + ' cambió de umbral');
  }
});

console.log('\nLos dos criterios que Jungle Scout hizo posibles');

caso('el dueño de la keyword existe y VETA', () => {
  const c = de(19);
  ok(c, 'no está el criterio del dueño de la puerta');
  ok(c.veto === true, 'no es un veto: un nicho con la puerta tomada es imposible de entrar');
  ok(estado(c, 46) === 'alerta' && estado(c, 60) === 'fail' && estado(c, 20) === 'pass',
     'la escala no discrimina: 46→' + estado(c, 46) + ' 60→' + estado(c, 60) + ' 20→' + estado(c, 20));
});

caso('y explica por qué un principiante no lo ve', () => {
  ok(/lo último que ve un principiante/.test(de(19).leccion), 'no enseña por qué importa');
});

caso('la estacionalidad se mide, no se adivina por el nombre', () => {
  const c = de(20);
  ok(c, 'no está el criterio de estacionalidad');
  ok(/45%/.test(c.umbral), 'no fija el umbral medible');
  ok(/trajes de baño|material escolar/.test(c.por_que),
     'no explica que hay estacionales que no lo dicen en el nombre');
  ok(estado(c, 70) === 'fail' && estado(c, 20) === 'pass', 'la escala no discrimina');
});

console.log('\nLa decisión de banda queda documentada, no enterrada');

caso('el archivo explica por qué unos umbrales se movieron y otros no', () => {
  const src = fs.readFileSync(path.join(AQUI, '..', 'sophie-criterios.js'), 'utf8');
  ok(/15,9%/.test(src), 'no cita el error real que justifica la banda');
  ok(/caía DENTRO del ruido|dentro del ruido/i.test(src), 'no explica el problema que resuelve');
  ok(/COCIENTE/.test(src), 'no justifica la banda estrecha de la concentración');
});

console.log('\nRESULTADO: ' + pasan + ' pasan · ' + fallan + ' fallan');
process.exit(fallan ? 1 : 0);
