#!/usr/bin/env node
/* ============================================================
   TESTS DE INTENCIÓN — Sophie Producto · Capa 2 (Intent-First)
   Crezcamos Online · sophie-ui/tools/test-intencion.mjs

   Fija el contrato del clasificador de intención:
     · clasificación determinista por marcadores (prioridad de la taxonomía)
     · SV / conteo por cluster y % del nicho
     · cola larga conversacional (criterio 15)
     · candidatos a brecha y huérfanos (criterio 14, con y sin cobertura)
     · detectar / limpiar del marcador <!--INTENCION:{…}--> (degradación limpia)

   Uso:  node tools/test-intencion.mjs   (sale con código 1 si algo falla)
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const win = {};
function cargar(archivo) {
  new Function("window", "document", readFileSync(resolve(raiz, archivo), "utf8"))(win, undefined);
}
cargar("sophie-criterios.js");   // define win.SophieCriterios (taxonomía + umbrales)
cargar("sophie-intencion.js");   // define win.SophieIntencion (clasificador de capa 2)
const { SophieCriterios, SophieIntencion } = win;

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
function grupo(x) { salida.push("\n" + x); }
function clusterPorId(r, id) { return r.clusters.filter(function (c) { return c.id === id; })[0]; }

/* ---------- dataset de referencia: nicho tipo "matcha" ---------- */
const KW = [
  { kw: "matcha set", sv: 50000 },                     // formato
  { kw: "matcha powder", sv: 40000 },                  // genérico (sin marcador)
  { kw: "matcha starter kit", sv: 6000 },              // audiencia (starter) > formato
  { kw: "matcha for beginners", sv: 1500 },            // audiencia
  { kw: "ceremonial matcha kit", sv: 3000 },           // uso (ceremonial) > formato
  { kw: "matcha gift set", sv: 2500 },                 // ocasión (gift) > formato
  { kw: "matcha shaker bottle", sv: 8000 },            // modernidad (shaker)
  { kw: "bamboo matcha whisk", sv: 1200 },             // problema (bamboo) > formato
  { kw: "organic matcha green tea powder", sv: 900 }   // problema (organic), 5 palabras
];

grupo("SophieCriterios — expone la capa 2");
t("hay 2 criterios semánticos (14 y 15)", () => {
  eq(SophieCriterios.semanticos.length, 2);
  eq(SophieCriterios.porId(14).criterio, "Brecha de intención");
  eq(SophieCriterios.porId(15).id, 15);
});
t("hay 6 clusters de intención", () => eq(SophieCriterios.clusters.length, 6));
t("los 13 léxicos NO cambian (el veredicto clásico queda intacto)", () => {
  eq(SophieCriterios.lista.length, 13);
});

grupo("SophieIntencion.clasificar — clasificación determinista");
const R = SophieIntencion.clasificar({ nicho: "matcha whisk set", keywords: KW });
t("totales correctos", () => { eq(R.totalKw, 9); eq(R.totalSV, 113100); });
t("'matcha starter kit' cae en Audiencia, no en Formato (prioridad de intención)", () => {
  const a = clusterPorId(R, "audiencia");
  eq(a.sv, 7500, "audiencia SV"); eq(a.kw, 2, "audiencia kw");
});
t("'matcha gift set' cae en Ocasión, no en Formato", () => eq(clusterPorId(R, "ocasion").sv, 2500));
t("'ceremonial matcha kit' cae en Uso, no en Formato", () => eq(clusterPorId(R, "uso").sv, 3000));
t("'matcha shaker bottle' cae en Modernidad", () => eq(clusterPorId(R, "modernidad").sv, 8000));
t("'bamboo/organic' caen en Problema/Atributo", () => eq(clusterPorId(R, "problema").kw, 2));
t("'matcha set' sin intención específica queda en Formato", () => eq(clusterPorId(R, "formato").sv, 50000));
t("'matcha powder' sin marcador queda en Genérico/Head", () => { eq(R.generico.sv, 40000); eq(R.generico.kw, 1); });

grupo("Criterio 15 — cola larga conversacional");
t("cuenta keywords de 4+ palabras", () => {
  eq(R.longTail.largas, 1); // solo "organic matcha green tea powder"
  eq(R.longTail.minPalabras, 4);
});
t("estado NO-GO cuando <15% es cola larga", () => {
  ok(R.longTail.pct < 15, "pct=" + R.longTail.pct);
  eq(R.longTail.estado, "nogo");
});

grupo("Criterio 14 — brecha de intención");
t("sin cobertura de competidores, queda PENDIENTE con candidatos", () => {
  eq(R.brecha.estado, "pendiente");
  ok(R.brecha.candidatos.indexOf("audiencia") !== -1, "audiencia es candidato");
  ok(R.brecha.candidatos.indexOf("modernidad") !== -1, "modernidad es candidato");
});
t("con cobertura (top-5 solo cubren Formato), detecta huérfanos y da GO", () => {
  const R2 = SophieIntencion.clasificar({ nicho: "matcha", keywords: KW, cubiertos: ["formato"] });
  ok(R2.brecha.huerfanos.indexOf("audiencia") !== -1, "audiencia huérfano");
  ok(R2.brecha.huerfanos.indexOf("modernidad") !== -1, "modernidad huérfano");
  ok(R2.brecha.huerfanos.indexOf("formato") === -1, "formato NO es huérfano (está cubierto)");
  eq(R2.brecha.estado, "go", "≥2 huérfanos ⇒ GO");
});
t("cluster sin demanda no llega a candidato", () => {
  // 'problema' suma 2100 (<2% de 113100=2262 y <5000): fuera de la brecha
  ok(R.brecha.candidatos.indexOf("problema") === -1);
});

grupo("Marcador <!--INTENCION:--> — detección y limpieza");
t("detectar extrae el payload de un marcador completo", () => {
  const s = 'texto <!--INTENCION:{"keywords":[{"kw":"matcha set","sv":100}]}--><!--M:S-->';
  const p = SophieIntencion.detectar(s);
  ok(p && p.keywords.length === 1, "payload con 1 keyword");
});
t("detectar devuelve null si el marcador llega roto (streaming)", () => {
  eq(SophieIntencion.detectar('<!--INTENCION:{"keywords":[{"kw"'), null);
});
t("detectar devuelve null sin arreglo de keywords", () => {
  eq(SophieIntencion.detectar('<!--INTENCION:{"nicho":"x"}-->'), null);
});
t("limpiar quita el marcador y los marcadores invisibles", () => {
  const s = 'Hola <!--INTENCION:{"keywords":[{"kw":"a","sv":1}]}--><!--M:S--> mundo';
  const out = SophieIntencion.limpiar(s);
  ok(out.indexOf("INTENCION") === -1 && out.indexOf("M:S") === -1, "sin marcadores");
  ok(out.indexOf("Hola") === 0 && /mundo$/.test(out), "conserva el texto visible");
});

grupo("Render — no truena y refleja los datos");
t("html() devuelve una pantalla con los clusters", () => {
  const h = SophieIntencion.html(R);
  ok(typeof h === "string" && h.indexOf("Audiencia") !== -1, "menciona Audiencia");
  ok(h.indexOf("Long-tail") !== -1, "menciona el criterio 15");
});
t("texto() para el modelo trae los criterios ya calculados", () => {
  const x = SophieIntencion.texto(R);
  ok(x.indexOf("CRITERIO 14") !== -1 && x.indexOf("CRITERIO 15") !== -1, "trae 14 y 15");
  ok(x.indexOf("NO los recalcules") !== -1, "instruye no recalcular");
});
t("html() devuelve null con payload vacío (degradación)", () => {
  eq(SophieIntencion.html({ keywords: [] }), null);
});

/* ---------- reporte ---------- */
console.log(salida.join("\n"));
console.log("\nRESULTADO: " + pasan + " pasan · " + fallan + " fallan");
process.exit(fallan ? 1 : 0);
