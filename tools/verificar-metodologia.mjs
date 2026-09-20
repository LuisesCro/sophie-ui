#!/usr/bin/env node
/* ============================================================
   GUARDA DE METODOLOGÍA — fuente única de umbrales
   Crezcamos Online · sophie-ui/tools/verificar-metodologia.mjs

   sophie-criterios.js es la FUENTE ÚNICA de los umbrales del
   currículum GO/NO GO. El motor de puntaje (sophie-motor.js) ya
   lee de ahí, así que el SCORE no puede desincronizarse.

   Lo que SÍ puede desincronizarse son las dos copias en PROSA
   (números escritos a mano) que un build step no genera:
     1. El prompt activo del modelo   → sophie-producto chat.js
                                         (SYSTEM_PROMPT_V2 + BLOQUE_V2)
     2. Las pantallas guiadas del alumno → sophie-pasos.js (pasos 3 y 4)

   Esta guarda lee los números canónicos del motor y confirma que
   ambas copias siguen de acuerdo. Si alguien cambia un umbral en
   sophie-criterios.js y olvida actualizar una copia, esto FALLA
   con un reporte claro, en vez de dejar que llegue a producción.

   Uso:
     node tools/verificar-metodologia.mjs
   Sale con código 1 si detecta cualquier desincronización.
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, "..");

/* ---------- utilidades ---------- */

// Convierte un número en un patrón que tolera separadores de miles
// (4500 encuentra "4,500", "4.500" o "4500"). Menos de mil: literal.
function numRe(n) {
  const s = String(n);
  if (s.length <= 3) return new RegExp("\\b" + s + "\\b");
  // inserta separador opcional cada 3 dígitos desde la derecha
  const conSep = s.replace(/\B(?=(\d{3})+(?!\d))/g, "[.,\\s]?");
  return new RegExp("\\b" + conSep + "\\b");
}

const ESTRICTO = process.argv.includes("--strict");
let fallos = 0;
const lineas = [];
function ok(msg) { lineas.push("  ✓ " + msg); }
function fail(msg) { lineas.push("  ✗ " + msg); fallos++; }
// Repo no montado localmente: no bloquea (el hook corre en checkouts parciales);
// con --strict (CI, todos los repos presentes) sí cuenta como falla.
function aviso(msg) { lineas.push("  ⚠ " + msg + (ESTRICTO ? " [--strict → falla]" : " [omitido]")); if (ESTRICTO) fallos++; }
function seccion(t) { lineas.push("\n" + t); }

/* ---------- 1. cargar la fuente única ---------- */

const criteriosPath = resolve(raiz, "sophie-criterios.js");
if (!existsSync(criteriosPath)) {
  console.error("No encuentro sophie-criterios.js en " + raiz);
  process.exit(2);
}
const win = {};
new Function("window", readFileSync(criteriosPath, "utf8"))(win);
const SC = win.SophieCriterios;
if (!SC || !Array.isArray(SC.lista)) {
  console.error("sophie-criterios.js no expuso SophieCriterios.lista");
  process.exit(2);
}

const calculables = SC.lista.filter((c) => c.direccion !== "juicio");

/* ---------- 2. prompt activo del modelo (Producto) ---------- */

const candidatosChat = [
  "/workspace/sophie-producto/netlify/edge-functions/chat.js",
  resolve(raiz, "../sophie-producto/netlify/edge-functions/chat.js"),
];
const chatPath = candidatosChat.find(existsSync);

seccion("PROMPT DEL MODELO (sophie-producto/chat.js · SYSTEM_PROMPT_V2)");
if (!chatPath) {
  aviso("No encuentro el chat.js de sophie-producto (repo no montado). Revisado: " + candidatosChat.join(" | "));
} else {
  const chat = readFileSync(chatPath, "utf8");
  // El prompt activo empieza en SYSTEM_PROMPT_V2 (el SYSTEM_PROMPT viejo
  // está dormido y no se envía; lo excluimos cortando desde V2).
  const desdeV2 = chat.indexOf("const SYSTEM_PROMPT_V2");
  const activo = desdeV2 >= 0 ? chat.slice(desdeV2) : chat;

  // DOS REGLAS, NO UNA. Hasta aquí esta guarda exigía que el prompt repitiera
  // TODOS los umbrales. Desde que los criterios estimados llevan banda (±20%,
  // ±10% en los cocientes) esa regla dejó de ser correcta para ellos: el motor
  // es quien aplica la banda, y repetir la cifra en el prompt crea dos fuentes
  // de verdad que se separan en silencio — el día que se ajuste una banda,
  // Sophie seguiría narrando el número viejo.
  //
  // Así que la exigencia depende de la BASE del criterio:
  //   · medido / propio      → corte exacto, el prompt lo narra → tiene que estar
  //   · estimado / cociente  → lo decide el motor con banda → NO debe estar
  //
  // Nótese que la segunda mitad es tan estricta como la primera: comprueba una
  // AUSENCIA. Sin ella, alguien podría volver a escribir "3.600" en el prompt y
  // nadie se enteraría hasta que las dos cifras dejaran de coincidir.
  const conBanda = (c) => c.base === "estimado" || c.base === "estimado_cociente";

  // NO BASTA COMPROBAR QUE NO ESTÉN LOS NÚMEROS DEL MOTOR.
  //
  // La primera versión de esta regla solo miraba eso, y dejó pasar algo peor
  // que un duplicado: umbrales VIEJOS. El prompt decía "SV ≥ 4,500" mientras el
  // motor cortaba en 5.400/3.600; "mínimo 30 keywords" contra 36/12. Como 5.400
  // y 3.600 no aparecían, la guarda daba ✓ — y Sophie narraba un aprobado que el
  // motor contradecía en la misma pantalla.
  //
  // Un umbral ausente y uno equivocado se ven igual desde el motor. Así que lo
  // que se prohíbe es la FORMA de un umbral, venga el número de donde venga: un
  // criterio con banda no dice cifras, dice comportamiento.
  const UMBRALES = [
    [/[≥≤<>]\s*\$?\s*\d/, "una comparación con número (≥, ≤, <, >)"],
    [/(m[íi]nimo|al menos|menos de|m[áa]s de|bajo|supera el|entre)\s*\$?\s*\d/i, "un umbral en palabras"],
    [/\$\s?\d/, "una cifra en dólares"],
    [/\d\s?%/, "un porcentaje"],
    [/\d{2,}\s*\+/, "un piso del tipo '60+'"],
  ];
  const huellaDeUmbral = (txt) => UMBRALES.filter(([re]) => re.test(txt)).map(([, q]) => q);

  // AUTOPRUEBA. Una guarda que deja de cazar no avisa de nada: da ✓ igual que
  // una que funciona. Estos son los CUATRO TEXTOS REALES que se escaparon —
  // umbrales viejos que convivieron meses con el motor nuevo sin que esto
  // saltara. Si alguno deja de detectarse, la rota es la guarda, y se dice aquí
  // en vez de descubrirlo cuando un estudiante vea dos números distintos.
  seccion("AUTOPRUEBA DE LA GUARDA (los textos que una vez se escaparon)");
  const ESCAPADOS = {
    C1: "C1 · Tendencia y volumen — SV ≥ 4,500/mes y tendencia alcista o estable. ❌ si SV < 4,500.",
    C2: "C2 · Ingresos reales — Average Revenue ≥ $4,500/mes. ⚠️ entre $3,000 y $4,499. ❌ bajo $3,000.",
    C3: "C3 · Distribución de ingresos — ningún producto supera el 40% del Total Revenue. ⚠️ si el #1 concentra 40-60%.",
    C7: "C7 · Demanda en profundidad — mínimo 30 keywords orgánicas. ✅ excelente 60+, ⚠️ 15-29, ❌ menos de 15.",
  };
  for (const [id, txt] of Object.entries(ESCAPADOS)) {
    const h = huellaDeUmbral(txt);
    if (h.length) ok(id + ": el texto viejo sigue siendo detectado (" + h[0] + ")");
    else fail(id + ": LA GUARDA YA NO CAZA su propio texto viejo — está rota, no el prompt");
  }
  // Y al revés: la forma nueva NO puede dar falso positivo, o nadie podrá
  // escribir un criterio con banda sin pelearse con esta guarda.
  const NUEVO = "C7 · Demanda en profundidad — el nicho necesita muchas puertas de entrada. EL CORTE LO APLICA EL MOTOR, con banda.";
  if (huellaDeUmbral(NUEVO).length) fail("falso positivo: la redacción sin cifras salta igualmente");
  else ok("y la redacción sin cifras pasa limpia (sin falsos positivos)");

  seccion("PROMPT DEL MODELO · criterio por criterio");

  for (const c of calculables) {
    // bloque del criterio: entre "C{id} ·" y "C{id+1} ·"
    const ini = activo.indexOf("C" + c.id + " ·");
    if (ini < 0) { fail("C" + c.id + " (" + c.criterio + "): no encuentro su bloque en el prompt"); continue; }
    let fin = activo.indexOf("C" + (c.id + 1) + " ·", ini + 1);
    if (fin < 0) fin = ini + 600;
    const bloque = activo.slice(ini, fin);

    if (conBanda(c)) {
      const encontrados = huellaDeUmbral(bloque);
      if (encontrados.length)
        fail("C" + c.id + " (" + c.criterio + "): lleva banda y el prompt escribe " +
             encontrados.join(", ") + " — el umbral vive en el motor, no aquí");
      else ok("C" + c.id + " (" + c.criterio + "): con banda, delegado al motor");
      continue;
    }

    const faltantes = [];
    if (c.umbral_num != null && !numRe(c.umbral_num).test(bloque)) faltantes.push("umbral " + c.umbral_num);
    if (c.alerta_num != null && !numRe(c.alerta_num).test(bloque)) faltantes.push("alerta " + c.alerta_num);
    if (faltantes.length) fail("C" + c.id + " (" + c.criterio + "): el prompt no menciona " + faltantes.join(" ni "));
    else ok("C" + c.id + " (" + c.criterio + "): umbrales presentes");
  }

  /* ---------- 2b. México, que se estaba revisando solo en USA ---------- */
  //
  // BLOQUE_MX lleva su propia tabla de umbrales y el motor su propio
  // `umbralesMX`. Esta guarda solo miraba el prompt de USA, así que México tenía
  // exactamente el agujero que acabamos de tapar allá: dos fuentes de verdad y
  // nadie comparándolas. Los números coincidían todavía — pero eso es suerte,
  // no una garantía, y es justo lo que se cree hasta el día que dejan de
  // coincidir.
  seccion("PROMPT DE MÉXICO (BLOQUE_MX · umbralesMX del motor)");
  const iMX = chat.indexOf("const BLOQUE_MX");
  const MX = SC.umbralesMX;
  if (iMX < 0) aviso("No encuentro BLOQUE_MX en chat.js");
  else if (!MX) aviso("sophie-criterios.js no expone umbralesMX");
  else {
    const bloqueMX = chat.slice(iMX, chat.indexOf("\nconst ", iMX + 10));
    for (const c of calculables) {
      const mx = MX[c.id];
      // Solo los criterios que México redefine. Los que no, heredan USA y ya se
      // revisaron arriba.
      if (!mx || (mx.umbral_num == null && mx.alerta_num == null)) continue;
      // LA VIÑETA es donde se duplica un umbral; EL BLOQUE ENTERO es donde hay
      // que buscarlo cuando tiene que estar. Las dos mitades miran a sitios
      // distintos a propósito:
      //
      // · Buscar el NÚMERO del motor en todo el bloque no sirve para la mitad
      //   de la duplicación: el bloque trae también la lista de filtros de
      //   búsqueda ("Search Volume ≥ 500", "Monthly Revenue ≥ MXN 80,000"), que
      //   son los mismos números y ahí SÍ deben estar — los teclea el alumno.
      //   Probado: esa versión marcaba C1, C2 y C7 con el prompt ya correcto.
      // · Exigir la PRESENCIA solo en la viñeta también falla: México es un
      //   documento corrido y algunos criterios remiten a otra sección ("ver la
      //   sección de precio, abajo"). Daba un falso positivo en C5, cuyo umbral
      //   vive —correctamente— más abajo.
      const ini = bloqueMX.indexOf("· Criterio " + c.id + " ·");
      if (conBanda(c)) {
        if (ini < 0) { ok("C" + c.id + " (MX): con banda, y el prompt no lo repite"); continue; }
        let fin = bloqueMX.indexOf("\n· ", ini + 1);
        if (fin < 0) fin = ini + 600;
        const encontrados = huellaDeUmbral(bloqueMX.slice(ini, fin));
        if (encontrados.length)
          fail("C" + c.id + " (MX): lleva banda y su párrafo escribe " +
               encontrados.join(", ") + " — el umbral vive en umbralesMX");
        else ok("C" + c.id + " (MX): con banda, delegado al motor");
        continue;
      }
      const faltan = [];
      if (mx.umbral_num != null && !numRe(mx.umbral_num).test(bloqueMX)) faltan.push("umbral " + mx.umbral_num);
      if (mx.alerta_num != null && !numRe(mx.alerta_num).test(bloqueMX)) faltan.push("alerta " + mx.alerta_num);
      if (faltan.length) fail("C" + c.id + " (MX): el prompt no menciona " + faltan.join(" ni "));
      else ok("C" + c.id + " (MX): umbrales presentes");
    }
  }
}

/* ---------- 3. pantallas guiadas del alumno (sophie-pasos.js) ---------- */

// HAY DOS CAMINOS, Y CADA UNO TIENE SU INVARIANTE. Conviene decirlo aqui
// porque esta seccion ya ha cambiado de idea dos veces.
//
// EL CAMINO MANUAL (datos=false) es el que sigue hoy el estudiante del curso:
// aplica los filtros el mismo en su herramienta. Ahi los umbrales SI se
// imprimen —tiene que teclearlos— y por eso tienen que coincidir exactamente
// con la fuente unica. Ese desajuste ocurrio de verdad: la pantalla decia un
// numero y el motor juzgaba con otro.
//
// EL CAMINO CON DATOS (datos=true) es el que estamos probando: los cortes los
// aplica el motor, con banda. Ahi un umbral escrito en la pantalla es un numero
// copiado que se quedara atras en silencio, y nombrar una herramienta de pago
// es mandar al estudiante a algo que no necesita.
//
// Lo que NO puede pasar nunca es que se mezclen: que el camino con datos nombre
// herramientas, o que el manual pierda sus numeros.

seccion("PANTALLAS DEL ALUMNO (sophie-pasos.js · dos caminos, dos contratos)");
const pasosPath = resolve(raiz, "sophie-pasos.js");
if (!existsSync(pasosPath)) {
  fail("No encuentro sophie-pasos.js");
} else {
  const win = {};
  new Function("window", readFileSync(pasosPath, "utf8"))(win);
  const SP = win.SophiePasos;
  const pinta = (paso, datos) =>
    SP.pantalla(paso, { datos, vars: { keyword: "k", categoria: "c", capital: "$1,500" } }) || "";

  /* --- camino manual: los umbrales impresos coinciden con la fuente unica --- */
  const grupos = [
    { titulo: "filtros de descubrimiento (paso 3)", paso: 3, filtros: SC.filtros.blackBox },
    { titulo: "validacion de keyword (paso 4)",     paso: 4, filtros: SC.filtros.cerebro },
  ];
  for (const g of grupos) {
    const blk = pinta(g.paso, false);
    if (!blk) { fail(g.titulo + ": la pantalla manual no se pinta"); continue; }
    for (const f of g.filtros) {
      if (!blk.includes(f.campo)) { fail(g.titulo + " · " + f.campo + ": la pantalla no nombra este filtro"); continue; }
      const faltan = [];
      if (f.min != null && !numRe(f.min).test(blk)) faltan.push("min " + f.min);
      if (f.max != null && !numRe(f.max).test(blk)) faltan.push("max " + f.max);
      if (faltan.length) fail(g.titulo + " · " + f.campo + ": falta " + faltan.join(" y "));
      else ok(g.titulo + " · " + f.campo + ": valores presentes y al dia");
    }
  }

  /* --- camino con datos: ni herramientas ni umbrales copiados --- */
  let sucias = 0, conNumeros = 0, pintadas = 0;
  for (let paso = 1; paso <= 9; paso++) {
    const html = pinta(paso, true);
    if (!html) continue;
    pintadas++;
    const marcas = html.match(/Black Box|Helium 10|Cerebro|Xray|Magnet/gi) || [];
    if (marcas.length) {
      sucias++;
      fail("paso " + paso + " con datos: nombra " + [...new Set(marcas)].join(", ") +
           ". En ese camino el estudiante no abre nada.");
    }
    // Se escanea la pantalla SIN datos del estudiante dentro. Con `capital`
    // puesto a "$1,500", buscar el umbral 500 lo encontraba ahi —la coma es un
    // limite de palabra— y acusaba de umbral copiado a un dato del alumno.
    const limpio = SP.pantalla(paso, { datos: true, vars: { keyword: "k", categoria: "c" } }) || "";
    for (const f of SC.filtros.blackBox.concat(SC.filtros.cerebro)) {
      for (const v of [f.min, f.max]) {
        if (v == null || v < 100) continue;   // 2, 3, 10, 45… son demasiado comunes
        if (numRe(v).test(limpio)) {
          conNumeros++;
          fail("paso " + paso + " con datos: tiene el umbral " + v + " copiado. Ahi los cortes " +
               "los aplica el motor con banda, asi que un numero escrito se queda atras solo.");
        }
      }
    }
  }
  if (!sucias) ok("las " + pintadas + " pantallas con datos no nombran ninguna herramienta");
  if (!conNumeros) ok("y ninguna lleva umbrales copiados de la fuente unica");

  /* --- y que los dos caminos SIGAN SIENDO DOS --- */
  const mezclados = [3, 4, 5].filter((n) => pinta(n, true) === pinta(n, false));
  if (mezclados.length)
    fail("los pasos " + mezclados.join(", ") + " dan la MISMA pantalla con y sin datos: " +
         "o se borro una version, o la señal dejo de elegir");
  else ok("los pasos 3, 4 y 5 siguen teniendo dos versiones distintas");
}

/* ---------- reporte ---------- */

console.log("GUARDA DE METODOLOGÍA · fuente única = sophie-criterios.js (v" + SC.version + ")");
console.log(lineas.join("\n"));
console.log("");
if (fallos) {
  console.log("RESULTADO: " + fallos + " desincronización(es). Actualiza la copia en prosa para que coincida con sophie-criterios.js.");
  process.exit(1);
} else {
  console.log("RESULTADO: OK — todas las copias en prosa coinciden con la fuente única.");
  process.exit(0);
}
