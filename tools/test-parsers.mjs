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
cargar("sophie-analisis.js");    // define win.SophieAnalisis (parser <!--SOPHIE:-->)
cargar("sophie-guia.js");        // define win.SophieGuia (parser <!--PASO:-->)
cargar("sophie-pasos.js");       // define win.SophiePasos (cabecera para SophieCandidatos)
cargar("sophie-candidatos.js");  // define win.SophieCandidatos (parser <!--CANDIDATOS_PRODUCTO:-->)
cargar("sophie-proveedores.js"); // define win.SophieProveedores (CANDIDATOS/COTIZACIONES/PROVEEDOR)
cargar("sophie-listing.js");     // define win.SophieListing (parser <!--LISTING:-->)
cargar("sophie-rescate.js");     // define win.SophieRescate (motor de diagnóstico)
cargar("sophie-ppc.js");         // define win.SophiePPC (motor de Cosecha y Poda / Ads)
const { SophieAnalisis, SophieMotor, SophieGuia, SophieProveedores, SophieListing, SophieRescate, SophiePPC, SophieCandidatos } = win;

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

/* ---------- 4 · SophieGuia.detectar (marcador <!--PASO:-->) ---------- */

grupo("SophieGuia.detectar — pantallas guiadas de Producto");

t("marcador PASO bien formado → objeto con paso", () => {
  const p = SophieGuia.detectar('<!--PASO:{"paso":3,"reaccion":"ok","vars":{"categoria":"Home & Kitchen"}}--><!--P:3--><!--M:S-->');
  ok(p, "no devolvió objeto");
  eq(p.paso, 3, "paso");
  eq(p.vars.categoria, "Home & Kitchen", "vars.categoria");
});

t("marcador sin campo 'paso' → null (no es una pantalla válida)", () => {
  eq(SophieGuia.detectar('<!--PASO:{"reaccion":"sin paso"}-->'), null);
});

t("JSON roto o sin marcador → null", () => {
  eq(SophieGuia.detectar('<!--PASO:{"paso":3,'), null);
  eq(SophieGuia.detectar("texto normal"), null);
});

t("limpiar quita PASO + P/M", () => {
  eq(SophieGuia.limpiar('Hola <!--PASO:{"paso":1}--><!--P:1--><!--M:H-->'), "Hola");
});

/* ---------- 4b · SophieCandidatos.detectar (marcador <!--CANDIDATOS_PRODUCTO:-->) ---------- */

grupo("SophieCandidatos.detectar — pantalla de evaluación de candidatos");

const CAND_MARCA = '<!--CANDIDATOS_PRODUCTO:' + JSON.stringify({
  paso: 3,
  candidatos: [
    { nombre: "Dog Scratch Pad for Nails", veredicto: "precaucion",
      etiquetas: ["Físico simple", "Sin marca"], nota: "Revisa reseñas y gating.",
      conclusion: "Candidato viable, con precaución." },
    { nombre: "Stair Basket", veredicto: "descartado", conclusion: "No recomendado como primer producto." }
  ],
  recomendacion: "El Dog Scratch Pad es el que vale la pena explorar."
}) + '-->';

t("marcador bien formado → objeto con lista de candidatos", () => {
  const p = SophieCandidatos.detectar(CAND_MARCA);
  ok(p, "no devolvió objeto");
  eq(p.candidatos.length, 2, "nº de candidatos");
  eq(p.candidatos[0].veredicto, "precaucion", "veredicto[0]");
});

t("marcador sin candidatos (o lista vacía) → null", () => {
  eq(SophieCandidatos.detectar('<!--CANDIDATOS_PRODUCTO:{"titulo":"sin lista"}-->'), null);
  eq(SophieCandidatos.detectar('<!--CANDIDATOS_PRODUCTO:{"candidatos":[]}-->'), null);
});

t("JSON roto o truncado en streaming → null, no lanza", () => {
  eq(SophieCandidatos.detectar('<!--CANDIDATOS_PRODUCTO:{"candidatos":[{,,}]-->'), null);
  eq(SophieCandidatos.detectar('<!--CANDIDATOS_PRODUCTO:{"candidatos":[{"nombre":"A"'), null);
  eq(SophieCandidatos.detectar("una evaluación en prosa"), null);
});

t("limpiar quita CANDIDATOS + P/M", () => {
  eq(SophieCandidatos.limpiar('Listo ' + CAND_MARCA + '<!--M:S-->'), "Listo");
});

t("html arma las tarjetas y escapa el texto del modelo (sin inyección)", () => {
  const p = SophieCandidatos.detectar(CAND_MARCA);
  const h = SophieCandidatos.html(p);
  ok(h.includes("s-cand"), "debe traer tarjetas");
  ok(h.includes("Dog Scratch Pad for Nails"), "debe traer el nombre");
  ok(h.includes("s-cand-verdict"), "debe traer el chip de veredicto");
  // inyección: un nombre con HTML se escapa, no se ejecuta
  const inj = SophieCandidatos.html({ candidatos: [{ nombre: "<img src=x onerror=alert(1)>", veredicto: "viable" }] });
  ok(!inj.includes("<img"), "el HTML del modelo debe quedar escapado");
  ok(inj.includes("&lt;img"), "debe aparecer escapado");
});

/* ---------- 5 · SophieProveedores.detectar (3 marcadores) ---------- */

grupo("SophieProveedores.detectar — CANDIDATOS / COTIZACIONES / PROVEEDOR");

t("CANDIDATOS → {tipo:'candidatos', datos}", () => {
  const r = SophieProveedores.detectar('<!--CANDIDATOS:{"lista":[{"nombre":"Prov A"}]}-->');
  ok(r, "no detectó");
  eq(r.tipo, "candidatos", "tipo");
  eq(r.datos.lista[0].nombre, "Prov A", "datos");
});

t("COTIZACIONES y PROVEEDOR se distinguen por tipo", () => {
  eq(SophieProveedores.detectar('<!--COTIZACIONES:{"a":1}-->').tipo, "cotizaciones");
  eq(SophieProveedores.detectar('<!--PROVEEDOR:{"score":80}-->').tipo, "proveedor");
});

t("JSON roto → null; sin marcador → null", () => {
  eq(SophieProveedores.detectar('<!--PROVEEDOR:{"score":}-->'), null);
  eq(SophieProveedores.detectar("una cotización en prosa"), null);
});

/* ---------- 6 · SophieListing.detectarListing (marcador <!--LISTING:-->) ---------- */

grupo("SophieListing.detectarListing — medidas del listing");

t("LISTING bien formado → objeto", () => {
  const d = SophieListing.detectarListing('<!--LISTING:{"titulo":{"chars":180},"bullets":5}-->');
  ok(d, "no devolvió objeto");
  eq(d.titulo.chars, 180, "titulo.chars");
  eq(d.bullets, 5, "bullets");
});

t("JSON roto o sin marcador → null", () => {
  eq(SophieListing.detectarListing('<!--LISTING:{"titulo":'), null);
  eq(SophieListing.detectarListing("un título en prosa"), null);
});

t("limpiar quita LISTING + M", () => {
  eq(SophieListing.limpiar('Listo <!--LISTING:{"bullets":5}--><!--M:S-->'), "Listo");
});

/* ---------- 7 · SophieRescate.diagnosticar (motor de diagnóstico) ---------- */

grupo("SophieRescate.diagnosticar — gates, veredicto y escalado");

const RESC_SANO = { precio: 30, cogs: 6, flete: 1.5, fbaFee: 5,
  unidadesFBA: 300, pedidosMes: 60, edadInventarioDias: 60, rating: 4.5, resenas: 40, indexacion: "si" };

t("economía y nicho sanos → RESCATAR, sin escalar", () => {
  const r = SophieRescate.diagnosticar(RESC_SANO);
  eq(r.veredicto, "RESCATAR", "veredicto");
  eq(r.gates.economia.estado, "verde", "economía");
  eq(r.gates.nicho.estado, "verde", "nicho");
  eq(r.escalaMentoria, false, "no debe escalar");
});

t("margen negativo + cobertura alta → LIQUIDAR y escala a mentoría", () => {
  const r = SophieRescate.diagnosticar({ precio: 18, cogs: 10, flete: 3, fbaFee: 5,
    unidadesFBA: 400, pedidosMes: 10, edadInventarioDias: 200, rating: 4.5, resenas: 40 });
  eq(r.veredicto, "LIQUIDAR", "veredicto");
  eq(r.gates.economia.estado, "rojo", "economía");
  ok(r.gates.economia.margenNegativo, "margen debe ser negativo");
  eq(r.escalaMentoria, true, "debe escalar");
});

t("defecto de producto → CONGELAR (anula la tabla de decisión)", () => {
  const r = SophieRescate.diagnosticar({ ...RESC_SANO, defectoProducto: true });
  eq(r.veredicto, "CONGELAR", "veredicto");
  ok(r.modos.reputacion.defecto, "reputación debe marcar el defecto");
});

t("sin indexación congela la lectura de visibilidad", () => {
  const r = SophieRescate.diagnosticar({ ...RESC_SANO, indexacion: "no", pujaActual: 0.5, pujaSugerida: 1.0 });
  eq(r.modos.indexacion.estado, "rojo", "indexación");
  ok(r.modos.visibilidad.congelado, "visibilidad debe quedar congelada");
});

t("texto(r) trae el bloque que la red server-side busca", () => {
  const s = SophieRescate.texto(SophieRescate.diagnosticar(RESC_SANO));
  ok(s.includes("MOTOR RESCATE"), "debe contener 'MOTOR RESCATE'");
  ok(s.includes("RESCATAR"), "debe incluir el veredicto");
});

/* ---------- 8 · SophiePPC.clasificar (motor de Cosecha y Poda / Ads) ---------- */

grupo("SophiePPC.clasificar — decisiones de PPC");

const PPC_CTX = { precio: 30, breakEvenACOS: 33 };

t("sin precio/break-even → ok:false con error", () => {
  const r = SophiePPC.clasificar([], {});
  eq(r.ok, false, "debe fallar");
  ok(r.error, "debe explicar qué falta");
});

t("gastó el CPA de equilibrio sin ventas → NEGAR", () => {
  const r = SophiePPC.clasificar(
    [{ term: "cheap gadget", imp: 500, clk: 12, spd: 12, sal: 0, ord: 0, src: { "Auto [broad]": { spd: 12, ord: 0 } } }],
    PPC_CTX);
  eq(r.ok, true, "ok");
  eq(r.decisiones[0].accion, "NEGAR", "acción");
});

t("convierte rentable y no está en exacta → COSECHAR", () => {
  const r = SophiePPC.clasificar(
    [{ term: "garlic press", imp: 1000, clk: 10, spd: 20, sal: 100, ord: 3, src: { "Auto [broad]": { spd: 20, ord: 3 } } }],
    PPC_CTX);
  eq(r.decisiones[0].accion, "COSECHAR", "acción");
});

t("término de marca de competidor → REVISAR_MARCA (economía aparte)", () => {
  const r = SophiePPC.clasificar(
    [{ term: "yeti tumbler", imp: 800, clk: 15, spd: 20, sal: 0, ord: 0, src: { "Auto [broad]": { spd: 20, ord: 0 } } }],
    { ...PPC_CTX, marcasCompetidores: ["yeti"] });
  eq(r.decisiones[0].accion, "REVISAR_MARCA", "acción");
});

t("texto(res) trae el bloque MOTOR PPC", () => {
  const r = SophiePPC.clasificar([{ term: "x", imp: 10, clk: 1, spd: 1, sal: 0, ord: 0, src: {} }], PPC_CTX);
  ok(SophiePPC.texto(r).includes("MOTOR PPC"), "debe contener 'MOTOR PPC'");
});

/* ---------- reporte ---------- */

console.log("TESTS DE PARSERS Y MOTORES · Sophie (Producto · Guía · Candidatos · Proveedores · Listing · Rescate · PPC)");
console.log("parsers: Analisis · Guia · Candidatos · Proveedores · Listing   |   motores: Motor(13 criterios) · Rescate · PPC");
console.log(salida.join("\n"));
console.log("");
console.log("RESULTADO: " + pasan + " pasan · " + fallan + " fallan");
process.exit(fallan ? 1 : 0);
