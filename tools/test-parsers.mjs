#!/usr/bin/env node
/* ============================================================
   TESTS DE PARSERS — Sophie Producto
   Crezcamos Online · sophie-ui/tools/test-parsers.mjs

   Los parsers convierten la salida del modelo (marcadores) en
   pantallas y puntaje. Si el modelo emite algo malformado, el
   parser NO debe tronar: debe degradar con gracia. Estos tests
   fijan ese contrato para que un cambio de prompt o de motor no
   lo rompa en silencio.

   Cubre:
     · SophieAnalisis.detectar  — extrae el marcador <!--SOPHIE:{…}-->
     · SophieAnalisis.limpiar   — quita marcadores invisibles
     · SophieMotor.evaluar      — el pipeline parse → puntaje → veredicto

   Uso:  node tools/test-parsers.mjs
   Sale con código 1 si algún test falla.
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- cargar los motores con un shim de window ---------- */

const win = {};
function cargar(archivo) {
  new Function("window", "document", readFileSync(resolve(raiz, archivo), "utf8"))(win, undefined);
}
cargar("sophie-criterios.js");   // define win.SophieCriterios
cargar("sophie-motor.js");       // define win.SophieMotor (lee SophieCriterios)
cargar("sophie-analisis.js");    // define win.SophieAnalisis
const { SophieAnalisis, SophieMotor } = win;

/* ---------- arnés mínimo de aserciones ---------- */

let pasan = 0, fallan = 0;
const salida = [];
function t(nombre, fn) {
  try { fn(); pasan++; salida.push("  ✓ " + nombre); }
  catch (e) { fallan++; salida.push("  ✗ " + nombre + " — " + e.message); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || "esperaba verdadero"); }
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg ? msg + ": " : "") + "esperaba " + JSON.stringify(b) + " y dio " + JSON.stringify(a));
}
function grupo(t) { salida.push("\n" + t); }

/* ---------- datos de referencia (ejemplo de fase 9 del prompt) ---------- */

const DATOS_GO = {
  searchVolume: 22400, tendencia: "estable", averageRevenue: 8200, concentracionTop1: 28,
  averageReviews: 280, topReviews: [310, 290, 240], averagePrice: 24.99, keywordsCerebro: 64,
  margenAntesPPC: 38, roi: 145, costoAterrizadoPct: 26, moq: 200, unidadesPosibles: 280,
};
const JUICIOS_GO = { 6: { estado: "pass" }, 9: { estado: "pass" }, 12: { estado: "alerta" }, 13: { estado: "pass" } };

/* ---------- 1 · SophieAnalisis.detectar (el parser) ---------- */

grupo("SophieAnalisis.detectar — extracción del marcador");

t("marcador bien formado → objeto con fase, datos y juicios", () => {
  const marca = "<!--SOPHIE:" + JSON.stringify({ fase: 9, datos: DATOS_GO, juicios: JUICIOS_GO }) + "-->";
  const p = SophieAnalisis.detectar(marca);
  ok(p, "no devolvió objeto");
  eq(p.fase, 9, "fase");
  eq(p.datos.searchVolume, 22400, "datos.searchVolume");
  eq(p.juicios["6"].estado, "pass", "juicios.6.estado");
});

t("marcador con prosa alrededor → igual lo extrae", () => {
  const marca = 'Aquí tienes el análisis: <!--SOPHIE:{"fase":1,"datos":{"searchVolume":9000}}--> listo.';
  const p = SophieAnalisis.detectar(marca);
  ok(p, "no extrajo el marcador rodeado de texto");
  eq(p.fase, 1, "fase");
});

t("JSON inválido (cerrado pero roto) → null, no lanza", () => {
  const p = SophieAnalisis.detectar('<!--SOPHIE:{"fase":9,"datos":{,,}-->');
  eq(p, null, "debió degradar a null");
});

t("marcador truncado en streaming (sin -->) → null", () => {
  const p = SophieAnalisis.detectar('<!--SOPHIE:{"fase":9,"datos":{"searchVolume":22400');
  eq(p, null, "sin cierre debe ser null");
});

t("sin marcador → null", () => {
  eq(SophieAnalisis.detectar("Hola, ¿en qué te ayudo?"), null);
  eq(SophieAnalisis.detectar(""), null);
  eq(SophieAnalisis.detectar(null), null);
});

/* ---------- 2 · SophieAnalisis.limpiar ---------- */

grupo("SophieAnalisis.limpiar — quita marcadores invisibles");

t("quita <!--SOPHIE:…-->, <!--P:n--> y <!--M:S-->", () => {
  const crudo = 'Texto visible <!--SOPHIE:{"fase":9}--><!--P:9--><!--M:S-->';
  eq(SophieAnalisis.limpiar(crudo), "Texto visible");
});

t("sin marcadores → devuelve el texto tal cual (trim)", () => {
  eq(SophieAnalisis.limpiar("  solo texto  "), "solo texto");
});

/* ---------- 3 · SophieMotor.evaluar (pipeline parse → puntaje) ---------- */

grupo("SophieMotor.evaluar — puntaje, vetos y veredicto");

t("datos fuertes → 13 filas y veredicto GO", () => {
  const r = SophieMotor.evaluar(DATOS_GO, JUICIOS_GO);
  eq(r.filas.length, 13, "nº de filas");
  eq(r.estado, "go", "estado");
  eq(r.aprobados, 12, "aprobados (12; C12 en alerta)");
  eq(r.veredicto, "PRODUCTO ESTRELLA", "veredicto");
  eq(r.limitadoPorVeto, false, "sin veto");
});

t("veto en C8 (margen bajo) limita a RIESGO MODERADO aunque el puntaje sea alto", () => {
  const r = SophieMotor.evaluar({ ...DATOS_GO, margenAntesPPC: 12 }, JUICIOS_GO);
  eq(r.limitadoPorVeto, true, "debió activar veto");
  ok(r.vetos.some((v) => v.id === 8), "el veto debe ser el criterio 8");
  eq(r.veredicto, "RIESGO MODERADO", "el veto tapa el veredicto");
});

t("num() coacciona strings de Helium 10", () => {
  eq(SophieMotor.num("$24.99"), 24.99, "$24.99");
  eq(SophieMotor.num("22,400"), 22400, "22,400");
  eq(SophieMotor.num("78%"), 78, "78%");
  eq(SophieMotor.num("1.2k"), 1200, "1.2k");
  ok(Number.isNaN(SophieMotor.num("")), "'' debe ser NaN");
});

t("alias de campo: monthlyRevenue vale como averageRevenue (C2)", () => {
  const datos = { ...DATOS_GO }; delete datos.averageRevenue; datos.monthlyRevenue = 8200;
  const r = SophieMotor.evaluar(datos, JUICIOS_GO);
  const c2 = r.filas.find((f) => f.id === 2);
  eq(c2.estado, "pass", "C2 debió leer el alias monthlyRevenue");
});

t("round-trip real: marcador → detectar → evaluar", () => {
  const marca = "<!--SOPHIE:" + JSON.stringify({ fase: 9, datos: DATOS_GO, juicios: JUICIOS_GO }) + "-->";
  const p = SophieAnalisis.detectar(marca);
  const r = SophieMotor.evaluar(p.datos, p.juicios);
  eq(r.filas.length, 13, "13 criterios");
  eq(r.estado, "go", "veredicto coherente con los datos");
});

/* ---------- reporte ---------- */

console.log("TESTS DE PARSERS · Sophie Producto (SophieAnalisis v" + SophieAnalisis.version + " · SophieMotor v" + SophieMotor.version + ")");
console.log(salida.join("\n"));
console.log("");
console.log("RESULTADO: " + pasan + " pasan · " + fallan + " fallan");
process.exit(fallan ? 1 : 0);
