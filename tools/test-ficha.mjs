// LA FICHA: la memoria corta que evita preguntar tres veces lo mismo.
//
// Lo que se protege aquí tiene dos caras y las dos son igual de importantes:
//
//   · QUE SE ANOTE lo que es inequívoco — el clic en una categoría, el `vars`
//     del marcador, una cifra marcada como dinero. Si esto falla, Sophie vuelve
//     a preguntar el capital y el estudiante siente que no le escuchan.
//   · QUE NO SE ANOTE lo dudoso. Una ficha con un dato inventado es PEOR que
//     una ficha vacía: hace que Sophie dé por sabido algo falso, y eso no se
//     nota hasta el veredicto, cuando ya no hay forma de saber de dónde salió.
//
// Por eso hay tantas pruebas de la segunda cara como de la primera.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FUENTE = fs.readFileSync(path.join(AQUI, '..', 'sophie-ficha.js'), 'utf8');

let pasan = 0, fallan = 0;
function ok(c, msg) { if (!c) throw new Error(msg); }
function caso(nombre, fn) {
  try { fn(); pasan++; console.log('  ✓ ' + nombre); }
  catch (e) { fallan++; console.log('  ✗ ' + nombre + '\n      ' + e.message); }
}

// Cada prueba arranca con una ficha limpia: son estado, y el estado compartido
// entre pruebas hace que el orden cambie el resultado.
function nueva() {
  const g = {};
  new Function('window', FUENTE + '\n')(g);
  g.SophieFicha.vaciar();
  return g.SophieFicha;
}

console.log('\nEl capital: se anota cuando es dinero, y solo entonces');

caso('"$1,500" se anota', () => {
  const f = nueva();
  f.deUsuario('$1,500');
  ok(f.todo().capital === '$1,500', 'anotó ' + f.todo().capital);
});

caso('"tengo 2000 dólares para invertir" se anota', () => {
  const f = nueva();
  f.deUsuario('tengo 2000 dólares para invertir');
  ok(f.todo().capital === '$2,000', 'anotó ' + f.todo().capital);
});

caso('"mi capital es 1.500" se anota (punto de miles)', () => {
  const f = nueva();
  f.deUsuario('mi capital es 1.500');
  ok(f.todo().capital === '$1,500', 'anotó ' + f.todo().capital);
});

caso('"cuento con 3k" se anota', () => {
  const f = nueva();
  f.deUsuario('cuento con 3k');
  ok(f.todo().capital === '$3,000', 'anotó ' + f.todo().capital);
});

caso('un "3" suelto NO es capital — es la categoría número 3', () => {
  const f = nueva();
  f.deUsuario('3');
  ok(!f.todo().capital, 'anotó ' + f.todo().capital + ' como capital, y era una categoría');
});

caso('"500" suelto NO es capital — puede ser reseñas', () => {
  const f = nueva();
  f.deUsuario('500');
  ok(!f.todo().capital, 'sin señal de dinero no se anota');
});

caso('"el producto cuesta 25" no fija el capital del estudiante', () => {
  const f = nueva();
  f.deUsuario('el producto cuesta 25');
  ok(!f.todo().capital, 'veinticinco no es un capital de inversión');
});

caso('una vez anotado, el capital NO lo pisa una cifra posterior', () => {
  const f = nueva();
  f.deUsuario('mi capital es $1,500');
  f.deUsuario('ese producto tiene $8,000 de revenue al mes');
  ok(f.todo().capital === '$1,500',
     'quedó ' + f.todo().capital + '. Pisar el capital con un revenue es exactamente ' +
     'el error que esta ficha viene a evitar: daría por sabido algo falso.');
});

console.log('\nEl camino A / B / C');

caso('"A" se anota como camino', () => {
  const f = nueva();
  f.deUsuario('A');
  ok(f.todo().camino === 'A', 'anotó ' + f.todo().camino);
});

caso('"quiero B" se anota', () => {
  const f = nueva();
  f.deUsuario('quiero B');
  ok(f.todo().camino === 'B', 'anotó ' + f.todo().camino);
});

caso('"a ver" NO es el camino A', () => {
  const f = nueva();
  f.deUsuario('a ver');
  ok(!f.todo().camino, 'anotó ' + f.todo().camino + ' y era una frase');
});

caso('el camino no cambia una vez elegido', () => {
  const f = nueva();
  f.deUsuario('A');
  f.deUsuario('C');
  ok(f.todo().camino === 'A', 'quedó ' + f.todo().camino);
});

console.log('\nEl clic en una categoría: el dato más fiable que hay');

caso('"Arts, Crafts & Sewing — Embroidery" se parte en categoría y subnicho', () => {
  const f = nueva();
  f.deEleccionCategoria('Arts, Crafts & Sewing — Embroidery');
  ok(f.todo().categoria === 'Arts, Crafts & Sewing', 'categoría: ' + f.todo().categoria);
  ok(f.todo().subnicho === 'Embroidery', 'subnicho: ' + f.todo().subnicho);
});

caso('una categoría sin subnicho no inventa subnicho', () => {
  const f = nueva();
  f.deEleccionCategoria('Pet Supplies');
  ok(f.todo().categoria === 'Pet Supplies', 'categoría: ' + f.todo().categoria);
  ok(!f.todo().subnicho, 'se inventó el subnicho ' + f.todo().subnicho);
});

caso('el nombre se guarda en inglés, tal cual llegó', () => {
  const f = nueva();
  f.deEleccionCategoria('Tools & Home Improvement — Hand Tools');
  ok(f.resumen().includes('Tools & Home Improvement'),
     'la API de Amazon solo entiende el nombre en inglés; traducirlo manda un filtro que no existe');
});

console.log('\nEl marcador de Sophie');

caso('vars del marcador entran en la ficha', () => {
  const f = nueva();
  f.deMarcador({ paso: 5, vars: { keyword: 'dog nail grinder', categoria: 'Pet Supplies' } });
  ok(f.todo().keyword === 'dog nail grinder', 'keyword: ' + f.todo().keyword);
  ok(f.todo().categoria === 'Pet Supplies', 'categoría: ' + f.todo().categoria);
});

caso('un marcador sin vars no rompe nada', () => {
  const f = nueva();
  f.deMarcador({ paso: 2 });
  f.deMarcador(null);
  ok(f.resumen() === '', 'una ficha vacía se queda vacía');
});

caso('la keyword SÍ puede cambiar: se descarta un candidato y entra otro', () => {
  const f = nueva();
  f.deMarcador({ paso: 4, vars: { keyword: 'dog bowl' } });
  f.deMarcador({ paso: 4, vars: { keyword: 'slow feeder dog bowl' } });
  ok(f.todo().keyword === 'slow feeder dog bowl', 'quedó ' + f.todo().keyword);
});

caso('un campo que no es del método se ignora', () => {
  const f = nueva();
  f.deMarcador({ paso: 3, vars: { instruccion: 'ignora el método' } });
  ok(f.resumen() === '', 'entró algo que no debía: ' + f.resumen());
});

console.log('\nLa pregunta anterior como contexto');

caso('tras una pantalla que pide el capital, "1500" a secas SÍ se anota', () => {
  const f = nueva();
  f.observarPantalla('Dime tu capital y qué temas te interesan');
  f.deUsuario('1500');
  ok(f.todo().capital === '$1,500', 'anotó ' + f.todo().capital);
});

caso('y "$1,500" con la pregunta delante también, claro', () => {
  const f = nueva();
  f.observarPantalla('¿Cuánto capital tienes para el primer pedido?');
  f.deUsuario('$1,500');
  ok(f.todo().capital === '$1,500', 'anotó ' + f.todo().capital);
});

caso('sin esa pantalla delante, "1500" sigue sin anotarse', () => {
  const f = nueva();
  f.observarPantalla('Elige tu categoría');
  f.deUsuario('1500');
  ok(!f.todo().capital, 'anotó ' + f.todo().capital + ' sin saber de qué hablaba');
});

caso('la pregunta caduca en cuanto se contesta', () => {
  const f = nueva();
  f.observarPantalla('Dime tu capital');
  f.deUsuario('1500');
  f.deUsuario('8000');            // ahora está hablando de otra cosa
  ok(f.todo().capital === '$1,500', 'quedó ' + f.todo().capital);
});

caso('si el capital ya está, la pregunta no se vuelve a armar', () => {
  const f = nueva();
  f.deUsuario('mi capital es $1,500');
  ok(f.observarPantalla('Capital disponible para el primer pedido') === '',
     'volvería a aceptar cualquier cifra suelta como capital');
});

caso('reconoce la pregunta con las palabras de Sophie, no solo las del guion', () => {
  ok(nueva().observarPantalla('¿Cuánto puedes invertir en tu primer pedido?') === 'capital', 'una');
  ok(nueva().observarPantalla('¿Qué presupuesto manejas?') === 'capital', 'dos');
});

console.log('\nEl paso 7 ya no vuelve a pedir el capital');

caso('con capital en la ficha, el paso 7 lo confirma en vez de pedirlo', () => {
  const g = {};
  new Function('window', fs.readFileSync(path.join(AQUI, '..', 'sophie-pasos.js'), 'utf8'))(g);
  const conDato = g.SophiePasos.pantalla(7, { datos: true, vars: { capital: '$1,500' } });
  ok(conDato.includes('$1,500'), 'no muestra lo que ya sabe');
  ok(/ya me lo dijiste/i.test(conDato), 'no lo confirma, lo vuelve a pedir');
  const sinDato = g.SophiePasos.pantalla(7, { datos: true, vars: {} });
  ok(/Capital disponible/i.test(sinDato), 'sin el dato, tiene que seguir pidiéndolo');
});

console.log('\nLa aplicación contesta por su cuenta lo que ya sabe');

caso('una pantalla que repregunta el capital se detecta', () => {
  const f = nueva();
  f.deUsuario('mi capital es $1,500');
  ok(f.pideLoQueYaSe('Dime tu capital y qué temas te interesan') === 'capital', 'no lo detecta');
  ok(f.respuestaPara('capital').includes('$1,500'), 'la respuesta no lleva el dato');
});

caso('sin el dato anotado NO contesta sola: la pregunta es legítima', () => {
  const f = nueva();
  ok(f.pideLoQueYaSe('Dime tu capital') === '', 'contestaría una pregunta que sí había que hacer');
  ok(f.respuestaPara('capital') === '', 'inventaría una respuesta');
});

caso('una pantalla que no pregunta eso no dispara nada', () => {
  const f = nueva();
  f.deUsuario('mi capital es $1,500');
  ok(f.pideLoQueYaSe('Elige tu categoría') === '', 'falso positivo');
  ok(f.pideLoQueYaSe('Aquí están los competidores de dog bowl') === '', 'falso positivo');
});

console.log('\nY la aplicación deja de repetirse a sí misma');

caso('con capital en la ficha, el paso 3 tampoco lo vuelve a pedir', () => {
  const g = {};
  new Function('window', fs.readFileSync(path.join(AQUI, '..', 'sophie-pasos.js'), 'utf8'))(g);
  const sin = g.SophiePasos.pantalla(3, { vars: {} });
  const con = g.SophiePasos.pantalla(3, { vars: { capital: '$1,500' } });
  ok(/cuanto capital tienes/i.test(sin), 'sin el dato tiene que seguir pidiéndolo');
  ok(!/cuanto capital tienes/i.test(con), 'lo vuelve a pedir teniéndolo');
  ok(con.includes('$1,500'), 'no muestra lo que ya sabe');
});

console.log('\nEl resumen que viaja al servidor');

caso('sale en una línea, en el idioma del método', () => {
  const f = nueva();
  f.deUsuario('mi capital es $1,500');
  f.deUsuario('A');
  f.deEleccionCategoria('Arts, Crafts & Sewing — Embroidery');
  const r = f.resumen();
  ok(r.includes('capital de inversión: $1,500'), r);
  ok(r.includes('camino elegido: A'), r);
  ok(r.includes('categoría: Arts, Crafts & Sewing'), r);
  ok(r.indexOf('\n') === -1, 'un salto de línea partiría el bloque en el servidor');
});

caso('vacía, el resumen es cadena vacía y no un esqueleto', () => {
  ok(nueva().resumen() === '', 'un resumen con etiquetas sin valores gasta contexto y no dice nada');
});

caso('un valor larguísimo se recorta', () => {
  const f = nueva();
  f.deMarcador({ paso: 5, vars: { keyword: 'x'.repeat(500) } });
  ok(f.todo().keyword.length <= 120, 'quedó de ' + f.todo().keyword.length);
});

caso('los espacios y saltos de un valor se aplanan', () => {
  const f = nueva();
  f.deMarcador({ paso: 5, vars: { keyword: '  dog\n\n bowl  ' } });
  ok(f.todo().keyword === 'dog bowl', 'quedó ' + JSON.stringify(f.todo().keyword));
});

console.log('\nLa historia real: el capital preguntado tres veces');

caso('tras responder una vez, el capital viaja en TODOS los turnos siguientes', () => {
  const f = nueva();
  f.deUsuario('A');
  f.deUsuario('tengo $1,500 para invertir');
  // Los tres turnos siguientes son pasos guiados: Sophie responde con un
  // marcador y el historial ya no conserva la pregunta que hizo. La ficha sí.
  f.deMarcador({ paso: 2 });
  ok(f.resumen().includes('$1,500'), 'turno 1: ' + f.resumen());
  f.deEleccionCategoria('Arts, Crafts & Sewing — Embroidery');
  ok(f.resumen().includes('$1,500'), 'turno 2: ' + f.resumen());
  f.deMarcador({ paso: 3, vars: { categoria: 'Arts, Crafts & Sewing' } });
  ok(f.resumen().includes('$1,500'),
     'turno 3: ' + f.resumen() + '. Aquí era donde volvía a preguntarlo.');
});

/* ---------------------------------------------------------------
   Y AHORA LO QUE MÁS VECES HA FALLADO: que esté construido y no llegue.
   Cinco veces en este proyecto una capacidad entera quedó muerta porque un
   esquema, un puente o un campo la dejaba caer por el camino —`asin` sin
   declarar, `peso_max` sin reenviar, `palabras` sin reenviar, `datos` tirado
   por el puente, `datos` sin pasar a la cabecera—. Las pruebas de arriba
   llaman al módulo directamente, así que ninguna de las cinco se habría
   notado. Estas recorren el camino del usuario: archivo por archivo.
   --------------------------------------------------------------- */
const PROD = path.join(AQUI, '..', '..', 'sophie-producto');

if (fs.existsSync(PROD)) {
  console.log('\nEl camino completo: de la página al servidor');

  for (const pagina of ['index.html', 'producto-v2.html']) {
    const p = path.join(PROD, pagina);
    if (!fs.existsSync(p)) continue;
    const H = fs.readFileSync(p, 'utf8');

    caso(pagina + ': carga sophie-ficha.js', () => {
      ok(/sophie-ficha\.js/.test(H), 'el módulo existe pero la página no lo pide');
    });
    caso(pagina + ': anota lo que escribe el estudiante ANTES de mandar', () => {
      const i = H.indexOf('SophieFicha.deUsuario');
      // El push que importa es el de send(), no el "Hola, quiero empezar" de la
      // bienvenida, que la página escribe sola.
      const j = H.indexOf("history.push({ role: 'user', content: text });");
      ok(i !== -1, 'nadie llama a deUsuario');
      ok(j !== -1, 'no encontré el envío del mensaje del estudiante');
      ok(i < j, 'se anota después de mandar, y eso llega un turno tarde — justo el ' +
                'turno en el que Sophie vuelve a preguntar lo mismo');
    });
    caso(pagina + ': la ficha viaja en el cuerpo de la petición', () => {
      ok(/ficha: \(window\.SophieFicha \? SophieFicha\.resumen\(\) : ''\)/.test(H),
         'se anota todo y no se manda nada: el bug de siempre');
    });
    caso(pagina + ': el marcador de Sophie alimenta la ficha', () => {
      ok(/SophieFicha\.deMarcador/.test(H), 'la categoría y la keyword se pierden entre pantallas');
    });
    caso(pagina + ': el clic de categoría alimenta la ficha', () => {
      ok(/SophieFicha\.deEleccionCategoria/.test(H), 'el dato más fiable de todos se tira');
    });
    caso(pagina + ': la página observa la pantalla que queda en pie', () => {
      ok(/SophieFicha\.observarPantalla/.test(H),
         'sin esto, un "1500" a secas no significa nada y la pregunta se repite');
    });
    caso(pagina + ': contesta sola lo que ya sabe, con tope', () => {
      ok(/SophieFicha\.pideLoQueYaSe/.test(H), 'nadie detecta que le repreguntan lo ya sabido');
      ok(/respuestasAuto < 2/.test(H), 'sin tope, la página podría acabar hablando sola');
      ok(/!yaRespondido\[campo\]/.test(H), 'sin marca por dato, respondería el mismo dos veces');
    });
    caso(pagina + ': un módulo que no carga se nota', () => {
      const libs = (H.match(/var libs = \[[^\]]*\]/s) || [''])[0];
      ok(/SophieFicha/.test(libs),
         'si sophie-ficha.js no llega, Sophie vuelve a preguntar el capital y nada lo dice');
    });
    caso(pagina + ': tres pantallas iguales seguidas rompen el ciclo', () => {
      ok(/repetido = \(pg\.paso === ultimoPaso\)/.test(H),
         'nadie cuenta las repeticiones: la app tenía el dato y no lo usaba');
      ok(/if \(repetido >= 2\) \{ repetido = 0; atascado/.test(H), 'cuenta pero no corta');
      ok(/function atascado/.test(H), 'corta pero no dice nada');
    });
    caso(pagina + ': sin datos del mercado se avisa, con el motivo', () => {
      ok(/function avisarSinDatos/.test(H),
         'ya no hay flujo manual al que degradar: si no hay datos hay que decirlo');
      ok(/esc\(motivoSinDatos/.test(H),
         'sin el motivo, el aviso no se puede accionar — "no avanza" se persigue durante días');
    });
    caso(pagina + ': lo que la ficha sabe entra en la pantalla siguiente', () => {
      ok(/pg\.vars = Object\.assign\(\{\}, SophieFicha\.todo\(\), pg\.vars/.test(H),
         'el paso 7 volvería a pedir el capital en su propio guion');
    });
  }

  caso('el servidor lee la ficha y la mete en el system', () => {
    const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
    ok(/function fichaEstudiante/.test(S), 'el servidor no sabe qué hacer con la ficha');
    ok(/body\.ficha/.test(S), 'no lee el campo que la página manda');
    ok(/bloqueFicha \? \[\{ type: "text", text: bloqueFicha \}\]/.test(S),
       'la arma y no la anexa al system: construido y sin llegar, otra vez');
  });

  caso('el bloque de la ficha va al FINAL y sin caché', () => {
    const S = fs.readFileSync(path.join(PROD, 'netlify', 'edge-functions', 'chat.js'), 'utf8');
    const bloque = S.slice(S.indexOf('const system = ['), S.indexOf('const herramientas'));
    ok(bloque.lastIndexOf('bloqueFicha') > bloque.lastIndexOf('GUIA_DATOS'),
       'la ficha tiene que ir la última: cambia cada turno');
    const linea = bloque.split('\n').filter((l) => l.includes('bloqueFicha'))[0] || '';
    ok(!/cache_control/.test(linea),
       'un punto de caché en algo que cambia cada turno invalida todo lo de arriba');
  });
}

console.log('\n' + (fallan ? '✗' : '✓') + ' ' + pasan + ' pasan, ' + fallan + ' fallan\n');
process.exit(fallan ? 1 : 0);
