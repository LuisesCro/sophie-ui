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
cargar("sophie-keywords.js");    // define win.SophieKeywords (parser MKL + clasificador)
cargar("sophie-listing.js");     // define win.SophieListing (parser <!--LISTING:-->)
cargar("sophie-rescate.js");     // define win.SophieRescate (motor de diagnóstico)
cargar("sophie-ppc.js");         // define win.SophiePPC (motor de Cosecha y Poda / Ads)
const { SophieAnalisis, SophieMotor, SophieGuia, SophieProveedores, SophieKeywords, SophieListing, SophieRescate, SophiePPC, SophieCandidatos } = win;

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

/* ---------- 8 · SophiePPC v2 — método sophie-ads + sophie-optimizador ---------- */

grupo("SophiePPC.economia — los cinco números (sophie-ads)");

const cerca = (a, b, tol, msg) => { if (Math.abs(a - b) > (tol || 0.011)) throw new Error((msg ? msg + ": " : "") + "esperaba ≈" + b + " y dio " + a); };
const CASO1 = { precio: 22.99, cau: 6.50, referral: 3.45, fba: 7.89, devolucionesPct: 2, cvr: 10, fase: "lanzamiento" };

t("caso de referencia: margen 20,4% → ACOS obj 26,5% → targetCPA 6,10 → maxCPC 0,61 → 15,25/día", () => {
  const E = SophiePPC.economia(CASO1);
  eq(E.ok, true, "ok");
  cerca(E.margenPct, 20.4, 0.05, "margen %"); cerca(E.breakEvenACOS, 20.4, 0.05, "break-even");
  cerca(E.acosObjetivo, 26.52, 0.02, "ACOS objetivo"); cerca(E.targetCPA, 6.10, 0.01, "targetCPA");
  cerca(E.maxCPC, 0.61, 0.01, "maxCPC"); cerca(E.pujaArranque, 0.49, 0.01, "puja de arranque ×0,80");
  cerca(E.presupuestoDia, 15.25, 0.03, "presupuesto maxCPC × 25");
  cerca(E.niveles[0].puja, 0.37, 0.01, "N1 ×0,60"); cerca(E.niveles[1].puja, 0.49, 0.01, "N2 ×0,80"); cerca(E.niveles[2].puja, 0.61, 0.01, "N3 completo");
  eq(E.niveles.map((l) => l.reparto).join("/"), "0.2/0.25/0.4/0.15", "reparto 20/25/40/15");
});
t("factores de fase oficiales: 1,3 / 0,70 / 0,50 / 1,5", () => {
  const f = (fase) => SophiePPC.economia({ ...CASO1, fase }).acosObjetivo;
  cerca(f("escalamiento"), 20.4 * 0.70, 0.05); cerca(f("madurez"), 20.4 * 0.50, 0.05); cerca(f("liquidacion"), 20.4 * 1.5, 0.05);
});
t("margen negativo → no hay estrategia de ads posible", () => {
  const E = SophiePPC.economia({ precio: 15, cau: 9, referral: 2.25, fba: 5.5, cvr: 10, fase: "lanzamiento" });
  eq(E.ok, false); eq(E.viable, false); ok(/no hay estrategia de ads/i.test(E.error), "debe decirlo");
});
t("sin FBA → bloquea (antes inflaba el break-even de 22% a 57%)", () => {
  const E = SophiePPC.economia({ ...CASO1, fba: 0 });
  eq(E.ok, false); ok(E.errores.some((x) => /FBA/.test(x)), "pide la FBA");
});
t("sin CVR → sin maxCPC y con aviso de usar el del nicho", () => {
  const E = SophiePPC.economia({ ...CASO1, cvr: "" });
  eq(E.ok, true); eq(E.maxCPC, null); ok(/nicho/.test(E.aviso), "aviso del CVR del nicho");
  eq(SophiePPC.economia({ ...CASO1, cvr: 140 }).maxCPC, null, "CVR > 100% es inválido");
});
t("México: descuenta el IVA antes de restar el costo", () => {
  const E = SophiePPC.economia({ precio: 499, referralPct: 15, fba: 80, cau: 150, cvr: 10, fase: "escalamiento", mercado: "MX" });
  cerca(E.margenPct, 29.4, 0.1, "margen MX");
});
t("textoEconomia trae el bloque que el modelo no recalcula", () => {
  const txt = SophiePPC.textoEconomia(SophiePPC.economia(CASO1));
  ok(txt.includes("ECONOMÍA CALCULADA POR LA APLICACIÓN") && txt.includes("maxCPC") && txt.includes("N3 Rentabilidad"), "bloque completo");
});

grupo("SophiePPC — estadística del optimizador");

t("Wilson 6/40, Z=1,28 → 0,0916 (el ejemplo del manual ya corregido)", () => cerca(SophiePPC.wilson(6, 40, 1.28).lo, 0.0916, 0.0005));
t("CVR bayesiano con cuenta al 10%: 1/3 → 14,7% · 24/200 → 11,9%", () => {
  cerca(SophiePPC.cvrBayes(1, 3, 0.10) * 100, 14.67, 0.01); cerca(SophiePPC.cvrBayes(24, 200, 0.10) * 100, 11.89, 0.01);
});
t("intervalo (compatibilidad v1): su media es el CVR bayesiano", () => cerca(SophiePPC.intervalo(1, 3, 0.10, 12, 1.28).media, SophiePPC.cvrBayes(1, 3, 0.10), 1e-9));

grupo("SophiePPC.clasificar — reglas del optimizador");

const PPC_CTX = { precio: 30, breakEvenACOS: 33, fase: "escalamiento", cvrCuenta: 0.10 };
const T = (term, clk, ord, spd, sal, src) => ({ term, imp: clk * 50, clk, ord, spd, sal, src: src || { "Auto [broad]": { spd, ord, clk } } });
const una = (fila, ctx, op) => SophiePPC.clasificar([fila], ctx || PPC_CTX, op).decisiones[0];

t("sin precio/break-even → ok:false con error", () => { const r = SophiePPC.clasificar([], {}); eq(r.ok, false); ok(r.error); });
t("G5: 11 clics y 0 órdenes NO se poda", () => { const d = una(T("once clics", 11, 0, 16, 0)); eq(d.grupo, "G5"); eq(d.accion, "MANTENER"); });
t("G5: 3 clics y 1 orden NO se toca (antes subía la puja)", () => { const d = una(T("suerte", 3, 1, 2, 30)); eq(d.grupo, "G5"); eq(d.accion, "MANTENER"); });
t("G4: 12 clics y 0 órdenes → podar con negativo exacto, aunque el CPC sea bajo", () => {
  const d = una(T("barato", 12, 0, 6, 0)); eq(d.grupo, "G4"); eq(d.accion, "NEGAR"); eq(d.negativo, "negativo exacto");
});
t("COSECHAR: 2 órdenes en 12 clics con CVR bayesiano ≥ cuenta → exacta con puja CVR_bayes × targetCPA × 0,90", () => {
  const d = una(T("garlic press", 12, 2, 9, 60));
  eq(d.accion, "COSECHAR");
  const tcpa = 30 * 0.33 * 0.70;
  cerca(d.pujaSugerida, (2 + 1.2) / 24 * tcpa * 0.90, 0.01, "puja de cosecha");
});
t("NO cosecha si el CVR bayesiano queda bajo el de la cuenta", () => {
  const d = una(T("flojo", 40, 2, 20, 60)); ok(d.accion !== "COSECHAR", "dio " + d.accion);
});
t("NO cosecha lo que ya vive solo en exacta; si también corre fuera → NEGAR_EN_ORIGEN", () => {
  const src = { "Exacta [exact]": { spd: 10, ord: 3, clk: 20 }, "Auto [broad]": { spd: 5, ord: 1, clk: 10 } };
  eq(una(T("ganador", 30, 4, 15, 120, src)).accion, "NEGAR_EN_ORIGEN");
});
t("cambio de puja limitado a ±25% (antes −73%)", () => {
  const src = { "Exacta [exact]": { spd: 45, ord: 1, clk: 30 } };
  const d = una(T("carisimo", 30, 1, 45, 30, src));
  ok(d.cambioPct >= -25.01, "cambio " + d.cambioPct + "%");
});
t("nunca sube la puja sin pasar el test de Wilson", () => {
  const src = { "Exacta [exact]": { spd: 3, ord: 1, clk: 12 } };
  const d = una(T("pocas pruebas", 12, 1, 3, 30, src));
  ok(d.accion !== "SUBIR_PUJA" || d.wilsonLB >= d.cpc / (30 * 0.33 * 0.70), "subió sin pasar Wilson");
});
t("órdenes > clics → REVISAR_DATO (antes cosechaba y Wilson daba NaN)", () => eq(una(T("raro", 12, 20, 5, 100)).accion, "REVISAR_DATO"));
t("término de marca de competidor → REVISAR_MARCA", () => eq(una(T("yeti tumbler", 15, 0, 20, 0), { ...PPC_CTX, marcasCompetidores: ["yeti"] }).accion, "REVISAR_MARCA"));
t("expresiones de segmentación → SEGMENTACION, nunca NEGAR/COSECHAR", () => {
  ['keyword-group=""Keywords related to your product category""', "substitutes", "complements", "close-match", "loose-match", 'asin="B08N5WRWNW"', 'category="12345"', "*"]
    .forEach((term) => eq(una(T(term, 100, 0, 75, 0)).accion, "SEGMENTACION", "«" + term + "»"));
});
t("objetivo 'ranking' (v1) se lee como fase de lanzamiento (factor 1,3)", () => {
  const r = SophiePPC.clasificar([T("x", 12, 0, 5, 0)], { precio: 30, breakEvenACOS: 33, objetivo: "ranking" });
  eq(r.economia.fase, "lanzamiento"); cerca(r.economia.targetACOS, 42.9, 0.01);
});
t("TACOS: ventas totales → valor y lectura de la tabla del manual", () => {
  const r = SophiePPC.clasificar([T("x", 12, 3, 20, 100)], { ...PPC_CTX, ventasTotales: 400 });
  eq(r.resumen.tacos, 5); eq(r.resumen.lecturaTacos.banda, "< 8%");
  ok(SophiePPC.texto(r).includes("TACOS: 5%"), "texto muestra el TACOS");
});
t("texto(res) trae la salida obligatoria: BASE, SEGMENTACIÓN G1–G5 e IMPACTO", () => {
  const txt = SophiePPC.texto(SophiePPC.clasificar([T("a", 12, 0, 6, 0), T("b", 3, 0, 1, 0)], PPC_CTX));
  ["MOTOR PPC", "BASE", "SEGMENTACIÓN", "G1 Motores", "G5 Inmaduros", "PODAR", "IMPACTO ESPERADO"].forEach((x) => ok(txt.includes(x), "falta " + x));
});

grupo("SophiePPC.leerReporte — Search Term Report real");

t("suma las filas de un mismo término (reporte diario o varias campañas)", () => {
  const csv = "Date,Campaign Name,Ad Group Name,Match Type,Customer Search Term,Impressions,Clicks,Spend,7 Day Total Sales,7 Day Total Orders (#)\n" +
    [1, 2, 3, 4, 5, 6].map((d) => `2026-09-0${d},Auto,AG1,-,cheap matcha whisk,100,4,$6.00,$0.00,0`).join("\n");
  const r = SophiePPC.leerReporte(csv);
  eq(r.ok, true); eq(r.terminos.length, 1); eq(r.terminos[0].clk, 24); cerca(r.terminos[0].spd, 36);
  eq(r.calidad.dias, 6); eq(r.calidad.filasSumadas, 5);
  eq(SophiePPC.clasificar(r.terminos, PPC_CTX).decisiones[0].accion, "NEGAR", "sumado, se poda");
});
t("descarta la fila de totales", () => {
  const csv = "Campaign Name,Customer Search Term,Clicks,Spend,Sales,Orders\nAuto,uno,10,5,20,1\nAuto,Total,10,5,20,1";
  const r = SophiePPC.leerReporte(csv); eq(r.terminos.length, 1); eq(r.calidad.totalesDescartados, 1);
});
t("encabezados en español, punto y coma y números latinos (1.234 y 0,50)", () => {
  const csv = "Nombre de la campaña;Término de búsqueda del cliente;Impresiones;Clics;Gasto;Ventas totales de 7 días;Pedidos totales de 7 días\nAuto;soporte bordado;1.234;12;$6,50;0,00;0";
  const t0 = SophiePPC.leerReporte(csv).terminos[0];
  eq(t0.imp, 1234); eq(t0.clk, 12); cerca(t0.spd, 6.5);
});
t("fila de total con el término vacío y 'Total' en la campaña → se descarta", () => {
  const r = SophiePPC.leerReporte("Campaign Name,Customer Search Term,Clicks,Spend,Sales,Orders\nAuto,uno,10,5,20,1\nTotal,,10,5,20,1");
  eq(r.calidad.totalesDescartados, 1); eq(r.terminos.length, 1);
});
t("texto(): el motivo de PODAR no se corta en los decimales", () => {
  const txt = SophiePPC.texto(SophiePPC.clasificar([T("caro", 14, 0, 9.1, 0)], PPC_CTX));
  ok(txt.includes("$9.10"), "debe mostrar $9.10");
});
t("una comilla suelta dentro del término no se come el resto del archivo", () => {
  const r = SophiePPC.leerReporte('Campaign Name\tCustomer Search Term\tClicks\tSpend\tSales\tOrders\nAuto\t12" matcha whisk\t12\t6\t0\t0\nAuto\tdos\t5\t2\t0\t0\nAuto\ttres\t5\t2\t0\t0');
  eq(r.terminos.length, 3); eq(r.terminos[0].clk, 12);
});
t("fechas dd/mm de un reporte en español: 01/08 a 29/09 son 60 días, no 265", () => {
  const r = SophiePPC.leerReporte("Fecha;Nombre de la campaña;Término de búsqueda del cliente;Clics;Gasto;Ventas;Pedidos\n01/08/2026;Auto;uno;5;2;0;0\n29/09/2026;Auto;uno;5;2;0;0");
  eq(r.calidad.dias, 60);
});
t("mismo término en dos grupos de la misma campaña → un negativo por grupo", () => {
  const csv = "Campaign Name,Ad Group Name,Match Type,Customer Search Term,Clicks,Spend,Sales,Orders\nManual,AG1,BROAD,malo,6,3,0,0\nManual,AG2,BROAD,malo,6,3,0,0";
  const res = SophiePPC.clasificar(SophiePPC.leerReporte(csv).terminos, PPC_CTX);
  const filas = SophiePPC.acciones(res).filter((f) => f.accion === "Negativo exacto");
  eq(filas.map((f) => f.grupoAnuncios).sort().join(","), "AG1,AG2");
});
t("CSV: los números negativos no se tratan como fórmulas", () => {
  const src = { "Exacta [exact]": { spd: 45, ord: 1, clk: 30 } };
  ok(!SophiePPC.accionesCSV(SophiePPC.clasificar([T("carisimo", 30, 1, 45, 30, src)], PPC_CTX)).includes("'-"), "Δ% negativo sin comilla");
});
t("reporte sin columnas clave → error claro", () => { const r = SophiePPC.leerReporte("a,b\n1,2"); eq(r.ok, false); ok(/columnas/.test(r.error)); });
t("accionesCSV: una fila por acción y sin fórmulas ejecutables", () => {
  const res = SophiePPC.clasificar([T("=HYPERLINK(1)", 12, 0, 6, 0, { "Auto [broad]": { spd: 6, ord: 0, clk: 12, grupo: "AG1" } })], PPC_CTX);
  const csv = SophiePPC.accionesCSV(res);
  ok(csv.includes("Negativo exacto"), "trae la acción"); ok(csv.includes("'=HYPERLINK"), "neutraliza la fórmula");
});

/* ---------- 9 · SophieKeywords.parsear — encabezados de rank de Cerebro ---------- */

grupo("SophieKeywords — reconoce los encabezados de rank de Cerebro");

// Cerebro de un solo ASIN exporta la columna "Organic Rank". Antes solo se
// reconocía "Competitor Rank" / "Organic Rank Average", así que un pegado real
// dejaba el rank vacío y mandaba TODO a descarte. Este test fija que ambos
// encabezados leen el rank y clasifican igual.
const MKL_HEADER = "Keyword Phrase\tSearch Volume\tCerebro IQ Score\t{RANK}\tCompeting Products";
const MKL_ROW = "offset extension wrench\t15720\t24036\t6\t654"; // sv≥5000, rank≤15, iq≥15 → P1

t("encabezado 'Organic Rank' (Cerebro de un ASIN) lee el rank y da P1", () => {
  const c = SophieKeywords.clasificar(MKL_HEADER.replace("{RANK}", "Organic Rank") + "\n" + MKL_ROW);
  eq(c.P1.length, 1, "debe haber 1 P1");
  eq(c.P1[0].keyword, "offset extension wrench", "la keyword P1");
  eq(c.descarte.length, 0, "no debe caer a descarte por rank sin leer");
});

t("'Competitor Rank' (multi-ASIN) sigue funcionando igual", () => {
  const c = SophieKeywords.clasificar(MKL_HEADER.replace("{RANK}", "Competitor Rank") + "\n" + MKL_ROW);
  eq(c.P1.length, 1, "mismo resultado con el encabezado multi-ASIN");
});

t("sin leer el rank, un P1 legítimo caería a descarte (prueba de que el rank importa)", () => {
  // Con un encabezado de rank NO reconocido, el rank queda en Infinity y el
  // P1 se pierde: exactamente el bug que arreglamos. Lo verificamos al revés.
  const c = SophieKeywords.clasificar(MKL_HEADER.replace("{RANK}", "Sponsored Rank") + "\n" + MKL_ROW);
  eq(c.P1.length, 0, "sin rank orgánico legible, no puede ser P1");
});

/* ---------- reporte ---------- */

console.log("TESTS DE PARSERS Y MOTORES · Sophie (Producto · Guía · Candidatos · Proveedores · Listing · Rescate · PPC)");
console.log("parsers: Analisis · Guia · Candidatos · Proveedores · Listing   |   motores: Motor(13 criterios) · Rescate · PPC");
console.log(salida.join("\n"));
console.log("");
console.log("RESULTADO: " + pasan + " pasan · " + fallan + " fallan");
process.exit(fallan ? 1 : 0);
