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
import { generarBloque, bloqueEnChat } from "./generar-bloque-criterios.mjs";
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

seccion("PROMPT DEL MODELO (sophie-producto/chat.js · bloque de los 13 criterios)");
if (!chatPath) {
  aviso("No encuentro el chat.js de sophie-producto (repo no montado). Revisado: " + candidatosChat.join(" | "));
} else {
  // Comparación EXACTA contra el bloque generado desde sophie-criterios.js.
  // Antes esto solo comprobaba que el número apareciera en algún lugar del
  // bloque del criterio, y eso dejaba pasar una edición parcial: bajar
  // "SV ≥ 4,500" a "SV ≥ 3,000" seguía en verde porque el 4,500 sobrevivía
  // en la condición de fallo de la misma línea, dejando el prompt
  // contradiciéndose a sí mismo.
  const generado = generarBloque();
  const actual = bloqueEnChat(chatPath);

  if (actual === null) {
    fail("no pude aislar el bloque de criterios en el prompt (¿cambiaron los delimitadores?)");
  } else if (actual === generado) {
    ok("el bloque de los 13 criterios es idéntico al generado desde la fuente única (" + generado.length + " caracteres)");
  } else {
    let donde = -1;
    for (let k = 0; k < Math.max(actual.length, generado.length); k++) {
      if (actual[k] !== generado[k]) { donde = k; break; }
    }
    fail("el bloque del prompt NO coincide con sophie-criterios.js (primera diferencia en el carácter " + donde + ")");
    lineas.push("      en chat.js:  " + JSON.stringify(actual.slice(Math.max(0, donde - 45), donde + 45)));
    lineas.push("      debería ser: " + JSON.stringify(generado.slice(Math.max(0, donde - 45), donde + 45)));
    lineas.push("      arréglalo en sophie-criterios.js y corre: node tools/generar-bloque-criterios.mjs --escribir");
  }
}

/* ---------- 3. pantallas guiadas del alumno (sophie-pasos.js) ---------- */

seccion("PANTALLAS DEL ALUMNO (sophie-pasos.js · filtros Black Box y Cerebro)");
const pasosPath = resolve(raiz, "sophie-pasos.js");
if (!existsSync(pasosPath)) {
  fail("No encuentro sophie-pasos.js");
} else {
  const pasos = readFileSync(pasosPath, "utf8");

  // Cada pantalla es "N: function". Aislamos el bloque de cada paso para no
  // confundir "Search Volume 4,500" (paso 3) con "Search Volume 300" (paso 4).
  function bloquePaso(n) {
    const ini = pasos.indexOf("\n    " + n + ": function");
    if (ini < 0) return null;
    const sig = pasos.indexOf("\n    " + (n + 1) + ": function", ini + 1);
    return pasos.slice(ini, sig < 0 ? ini + 4000 : sig);
  }

  const grupos = [
    { titulo: "Black Box (paso 3)", paso: 3, filtros: SC.filtros.blackBox },
    { titulo: "Cerebro (paso 4)", paso: 4, filtros: SC.filtros.cerebro },
  ];

  for (const g of grupos) {
    const blk = bloquePaso(g.paso);
    if (!blk) { fail(g.titulo + ": no encuentro la pantalla en sophie-pasos.js"); continue; }
    for (const f of g.filtros) {
      if (!blk.includes(f.campo)) { fail(g.titulo + " · " + f.campo + ": la pantalla no nombra este filtro"); continue; }
      const faltan = [];
      if (f.min != null && !numRe(f.min).test(blk)) faltan.push("min " + f.min);
      if (f.max != null && !numRe(f.max).test(blk)) faltan.push("max " + f.max);
      if (faltan.length) fail(g.titulo + " · " + f.campo + ": falta " + faltan.join(" y "));
      else ok(g.titulo + " · " + f.campo + ": valores presentes");
    }
  }
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
