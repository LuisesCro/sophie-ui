#!/usr/bin/env node
/* ============================================================
   GUARDA DEL ROUTER DE MODELO — un contrato, seis módulos
   Crezcamos Online · sophie-ui/tools/verificar-router.mjs

   Los 6 chat.js son edge functions que se despliegan por
   separado (cada uno en su sitio de Netlify). Por eso NO
   comparten un import en tiempo de ejecución: acoplar los 6
   builds a un módulo remoto agrega un punto de falla y no se
   puede probar el bundle fuera de Netlify.

   En vez de eso, esta guarda define UN SOLO contrato del router
   y confirma que los 6 módulos lo cumplen. Es la fuente única de
   "cómo debe rutear la suite". Si alguien migra a un modelo nuevo
   (p.ej. claude-sonnet-5) y actualiza 5 de 6 módulos, o si un
   módulo debilita su red de calidad, ESTO FALLA con un reporte
   claro — en lugar de dejar que un módulo corra callado con el
   modelo equivocado.

   MIGRAR A UN MODELO NUEVO:
     1) cambia MODELOS aquí abajo,
     2) cambia el ID en los 6 chat.js,
     3) corre `node tools/verificar-router.mjs` hasta que dé OK.

   Uso:
     node tools/verificar-router.mjs
   Sale con código 1 si algún módulo no cumple el contrato.
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";

/* ---------- fuente única del contrato ---------- */

// Los únicos IDs de modelo que la suite puede usar hoy.
const MODELOS = {
  sonnet: "claude-sonnet-4-6",            // juicio / enseñanza
  haiku: "claude-haiku-4-5-20251001",     // turnos mecánicos (velocidad)
};
const IDS_OFICIALES = new Set(Object.values(MODELOS));

// Umbrales de la red isDataHeavy (blindaje: un pegado de datos fuerza Sonnet).
// Deben ser idénticos en todos los módulos que la usan.
const UMBRAL_DATAHEAVY = [
  /lines > 3 && digits > 12/,
  /length > 250 && digits > 15/,
];

// Contrato por módulo. Cada módulo cumple una forma distinta A PROPÓSITO:
//  - defaultSonnet: la rama por defecto del ternario es Sonnet; Haiku solo por opt-in.
//  - siempreSonnet: no usa Haiku nunca (todo el módulo es juicio).
//  - redVeredicto:  arranca en Haiku (intake) pero una red server-side fuerza
//                   Sonnet en el veredicto y todo lo posterior.
const CONTRATO = {
  producto:    { isDataHeavy: true,  usaHaiku: true,  regla: "defaultSonnet" },
  listing:     { isDataHeavy: true,  usaHaiku: true,  regla: "defaultSonnet" },
  proveedores: { isDataHeavy: true,  usaHaiku: true,  regla: "defaultSonnet" },
  lanzamiento: { isDataHeavy: true,  usaHaiku: true,  regla: "defaultSonnet" },
  ads:         { isDataHeavy: false, usaHaiku: false, regla: "siempreSonnet" },
  rescate:     { isDataHeavy: true,  usaHaiku: true,  regla: "redVeredicto" },
};

/* ---------- utilidades ---------- */

function rutaChat(m) {
  const cands = [
    `/workspace/sophie-${m}/netlify/edge-functions/chat.js`,
    `../sophie-${m}/netlify/edge-functions/chat.js`,
  ];
  return cands.find(existsSync) || null;
}

// El ternario del router: Haiku en la rama THEN, Sonnet en la ELSE. Acepta
// tanto MODELS.x como el string literal, y tolera saltos de línea.
const RE_DEFAULT_SONNET = /\?\s*(MODELS\.haiku|"claude-haiku-4-5-20251001")\s*:\s*(MODELS\.sonnet|"claude-sonnet-4-6")/;

let fallos = 0;
const lineas = [];
function ok(msg) { lineas.push("  ✓ " + msg); }
function fail(msg) { lineas.push("  ✗ " + msg); fallos++; }

/* ---------- verificación por módulo ---------- */

for (const [m, c] of Object.entries(CONTRATO)) {
  lineas.push("\n" + m.toUpperCase() + " — regla: " + c.regla);
  const ruta = rutaChat(m);
  if (!ruta) { fail("no encuentro el chat.js (repo no montado)"); continue; }
  const src = readFileSync(ruta, "utf8");

  // 1) allowlist de IDs de modelo: ninguno fuera del set oficial.
  const ids = [...new Set(src.match(/claude-[a-z0-9-]+/g) || [])];
  const intrusos = ids.filter((id) => !IDS_OFICIALES.has(id));
  if (intrusos.length) fail("IDs de modelo no oficiales: " + intrusos.join(", ") + " (¿migración a medias?)");
  else ok("IDs de modelo dentro del set oficial");

  // 2) uso de Haiku acorde al contrato.
  const tieneHaiku = src.includes(MODELOS.haiku);
  if (c.usaHaiku && !tieneHaiku) fail("el contrato espera una vía Haiku y no aparece");
  if (!c.usaHaiku && tieneHaiku) fail("este módulo NO debe usar Haiku (todo es juicio) y aparece");
  if (c.usaHaiku === tieneHaiku) ok(c.usaHaiku ? "vía Haiku presente (opt-in)" : "sin Haiku (siempre Sonnet)");

  // 3) red isDataHeavy con los umbrales oficiales.
  if (c.isDataHeavy) {
    if (!/function isDataHeavy/.test(src)) fail("falta la función isDataHeavy (red de calidad)");
    else {
      const faltan = UMBRAL_DATAHEAVY.filter((re) => !re.test(src));
      if (faltan.length) fail("isDataHeavy con umbrales distintos a los oficiales (blindaje debilitado)");
      else ok("isDataHeavy con umbrales oficiales");
    }
  }

  // 4) regla de default / invariante de blindaje.
  if (c.regla === "defaultSonnet") {
    if (RE_DEFAULT_SONNET.test(src)) ok("default = Sonnet (Haiku solo por opt-in)");
    else fail("no confirmo el ternario 'Haiku opt-in : Sonnet por defecto'");
  } else if (c.regla === "siempreSonnet") {
    if (new RegExp(`const model = "${MODELOS.sonnet}"`).test(src)) ok("modelo fijo = Sonnet");
    else fail("no confirmo 'const model = Sonnet' fijo");
  } else if (c.regla === "redVeredicto") {
    const tieneRed = /enFaseVeredicto/.test(src) && src.includes(MODELOS.sonnet);
    if (tieneRed) ok("red server-side de veredicto fuerza Sonnet en el juicio");
    else fail("no confirmo la red 'enFaseVeredicto → Sonnet'");
  }
}

/* ---------- reporte ---------- */

console.log("GUARDA DEL ROUTER · modelos oficiales: " + [...IDS_OFICIALES].join("  ·  "));
console.log(lineas.join("\n"));
console.log("");
if (fallos) {
  console.log("RESULTADO: " + fallos + " incumplimiento(s) del contrato del router.");
  process.exit(1);
} else {
  console.log("RESULTADO: OK — los 6 módulos cumplen el contrato del router.");
  process.exit(0);
}
