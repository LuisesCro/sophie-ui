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
cargar("cz-intent-core.js");     // define win.CzIntentCore (taxonomía + clasificador compartido)
cargar("sophie-criterios.js");   // define win.SophieCriterios (criterios 14-18 + matriz; reexpone el core)
cargar("sophie-intencion.js");   // define win.SophieIntencion (clasificador de capa 2)
cargar("sophie-motor.js");       // define win.SophieMotor (léxico + expediente)
const { CzIntentCore, SophieCriterios, SophieIntencion, SophieMotor } = win;

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

grupo("CzIntentCore — motor de intención compartido");
t("expone la taxonomía de 6 clusters y los umbrales", () => {
  eq(CzIntentCore.clusters.length, 6);
  eq(CzIntentCore.clusterHuerfano.svAbsoluto, 5000);
  eq(CzIntentCore.longTailPalabras, 4);
});
t("clusterDeKeyword clasifica por prioridad de intención", () => {
  eq(CzIntentCore.clusterDeKeyword("matcha starter kit"), "audiencia");
  eq(CzIntentCore.clusterDeKeyword("matcha gift set"), "ocasion");
  eq(CzIntentCore.clusterDeKeyword("matcha set"), "formato");
  eq(CzIntentCore.clusterDeKeyword("matcha powder"), "generico");
});
t("coberturaTexto detecta qué clusters cubre un texto (para Listing)", () => {
  const cov = CzIntentCore.coberturaTexto("Matcha Starter Kit for Beginners with Bamboo Whisk", ["audiencia", "ocasion", "problema"]);
  ok(cov.audiencia.presente, "cubre Audiencia (starter/beginners)");
  ok(cov.problema.presente, "cubre Problema (bamboo)");
  ok(!cov.ocasion.presente, "NO cubre Ocasión (sin gift/regalo)");
});
t("SophieCriterios reexpone la taxonomía del core (misma referencia)", () => {
  eq(SophieCriterios.clusters.length, 6);
  eq(SophieCriterios.clusters, CzIntentCore.clusters);
});

grupo("SophieCriterios — expone la capa 2");
t("hay 5 criterios semánticos (14 a 18)", () => {
  eq(SophieCriterios.semanticos.length, 5);
  eq(SophieCriterios.porId(14).criterio, "Brecha de intención");
  eq(SophieCriterios.porId(16).id, 16);
  eq(SophieCriterios.porId(18).id, 18);
});
t("expone la matriz de veredicto compuesto", () => {
  eq(SophieCriterios.matrizCompuesta.go_go.clave, "GO_PREMIUM");
  eq(SophieCriterios.matrizCompuesta.pivotar_nogo.clave, "DESCARTE");
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

grupo("Veredicto compuesto — matriz léxico × semántico");
const V = SophieIntencion.veredictoSemantico;
t("léxico GO + semántico fuerte ⇒ GO PREMIUM", () => {
  const r = V({ lexico: "GO CON AJUSTES", c14_huerfanos: 3, c15_pct: 33, c16_huecos: 2, c17_dolores: 3, c18_si: 3 });
  eq(r.semantico, "go"); eq(r.veredicto, "GO_PREMIUM"); eq(r.estadoVeredicto, "go");
});
t("léxico GO + semántico débil ⇒ GO COMMODITY", () => {
  const r = V({ lexico: "go", c14_huerfanos: 0, c15_pct: 10, c16_huecos: 0, c17_dolores: 0, c18_si: 1 });
  eq(r.semantico, "nogo"); eq(r.veredicto, "GO_COMMODITY");
});
t("léxico PIVOTAR/RIESGO + semántico fuerte ⇒ VIGILAR", () => {
  const r = V({ lexico: "RIESGO MODERADO", c14_huerfanos: 3, c15_pct: 33, c16_huecos: 2, c17_dolores: 3, c18_si: 3 });
  eq(r.filaLexico, "pivotar"); eq(r.veredicto, "VIGILAR");
});
t("léxico NO GO + semántico débil ⇒ DESCARTE", () => {
  const r = V({ lexico: "NO GO", c14_huerfanos: 0, c15_pct: 5, c16_huecos: 0, c17_dolores: 0, c18_si: 0 });
  eq(r.veredicto, "DESCARTE"); eq(r.estadoVeredicto, "nogo");
});
t("semántico exige ≥3 en GO", () => {
  const r = V({ lexico: "go", c14_huerfanos: 2, c15_pct: 33, c16_huecos: 0, c17_dolores: 0, c18_si: 0 });
  eq(r.gosSemanticos, 2); eq(r.semantico, "nogo");
});
t("un NO-GO en el criterio 14 tumba el semántico aunque haya 3 GO", () => {
  // 14 nogo, 15/16/17 go = 3 GO, pero el 14 en NO-GO ⇒ semántico NO-GO
  const r = V({ lexico: "go", c14_huerfanos: 0, c15_pct: 40, c16_huecos: 3, c17_dolores: 4, c18_si: 1 });
  eq(r.estados[14], "nogo"); eq(r.gosSemanticos, 3); eq(r.semantico, "nogo");
});
t("umbrales de 16/17/18 (conteo → semáforo)", () => {
  const r = V({ lexico: "go", c14_huerfanos: 1, c15_pct: 20, c16_huecos: 1, c17_dolores: 2, c18_si: 2 });
  eq(r.estados[16], "alerta"); // 1 hueco
  eq(r.estados[17], "alerta"); // 2 dolores
  eq(r.estados[18], "alerta"); // 2/3 voz
  eq(r.estados[14], "alerta"); // 1 huérfano
  eq(r.estados[15], "alerta"); // 20% cola larga
});
t("sin c15_pct, el criterio 15 queda pendiente (no cuenta como GO)", () => {
  const r = V({ lexico: "go", c14_huerfanos: 3, c16_huecos: 3, c17_dolores: 3, c18_si: 3 });
  eq(r.estados[15], "pendiente"); eq(r.gosSemanticos, 4);
});

grupo("Veredicto — marcador y render");
t("detectarVeredicto extrae el payload", () => {
  const p = SophieIntencion.detectarVeredicto('x <!--VEREDICTO_SEMANTICO:{"lexico":"go","c14_huerfanos":2}--><!--M:S-->');
  ok(p && p.lexico === "go" && p.c14_huerfanos === 2);
});
t("detectarVeredicto devuelve null si llega roto", () => {
  eq(SophieIntencion.detectarVeredicto('<!--VEREDICTO_SEMANTICO:{"lexico"'), null);
});
t("textoVeredicto trae los 5 criterios y la traducción ejecutiva", () => {
  const r = V({ lexico: "go", c14_huerfanos: 2, c15_pct: 33, c16_huecos: 2, c17_dolores: 3, c18_si: 3 });
  const x = SophieIntencion.textoVeredicto(r);
  ok(x.indexOf("VEREDICTO COMPUESTO") !== -1 && x.indexOf("TRADUCCION EJECUTIVA") !== -1);
});
t("pintarVeredicto llena el contenedor con el veredicto y la matriz", () => {
  const c = {};
  const okp = SophieIntencion.pintarVeredicto(c, { lexico: "go", c14_huerfanos: 3, c15_pct: 33, c16_huecos: 2, c17_dolores: 3, c18_si: 3, nota: "Entra como starter kit." });
  ok(okp && c.innerHTML.indexOf("GO PREMIUM") !== -1, "pinta GO PREMIUM");
  ok(c.innerHTML.indexOf("Explicabilidad por voz") !== -1, "lista el criterio 18");
  ok(c.innerHTML.indexOf("Entra como starter kit") !== -1, "muestra la nota");
});

grupo("El ángulo viaja al expediente — anguloExpediente()");
const ANG = SophieIntencion.clasificar({ nicho: "matcha", keywords: KW, cubiertos: ["formato"] });
t("sin veredicto del modelo, toma los huérfanos que el análisis ya calculó", () => {
  const a = SophieIntencion.anguloExpediente(ANG);
  ok(a.clustersElegidos.indexOf("audiencia") !== -1, "audiencia en el ángulo");
  ok(a.clustersElegidos.indexOf("modernidad") !== -1, "modernidad en el ángulo");
  ok(a.clustersElegidos.indexOf("formato") === -1, "formato cubierto, no entra");
  ok(a.clustersNombres.indexOf("Audiencia") !== -1, "trae los nombres legibles");
});
t("si el modelo confirmó clusters en el veredicto, esos mandan", () => {
  const ver = SophieIntencion.veredictoSemantico({
    lexico: "go", c14_huerfanos: 2, c15_pct: 33, c16_huecos: 2, c17_dolores: 3, c18_si: 3,
    clustersElegidos: ["audiencia", "uso"], dolores: ["se derrama al preparar", "no sé cuánto polvo usar"]
  });
  eq(ver.clustersElegidos.length, 2, "el veredicto pasa el ángulo confirmado");
  const a = SophieIntencion.anguloExpediente(ANG, ver);
  eq(JSON.stringify(a.clustersElegidos), JSON.stringify(["audiencia", "uso"]), "confirmados > huérfanos");
  eq(a.doloresC17.length, 2, "arrastra los dolores del C17");
});
t("ids basura en el marcador se descartan (solo taxonomía válida)", () => {
  const a = SophieIntencion.anguloExpediente(ANG, { clustersElegidos: ["audiencia", "xyz", "AUDIENCIA"] });
  eq(JSON.stringify(a.clustersElegidos), JSON.stringify(["audiencia"]), "valida y deduplica");
});

grupo("SophieMotor.aExpediente guarda el ángulo");
t("aExpediente persiste clustersElegidos y doloresC17 desde extra", () => {
  const r = SophieMotor.evaluar({});
  const ang = SophieIntencion.anguloExpediente(ANG, { doloresC17: ["se derrama"] });
  const exp = SophieMotor.aExpediente(r, {}, {
    keyword: "matcha set",
    clustersElegidos: ang.clustersElegidos,
    doloresC17: ang.doloresC17,
    recomendacion: "Entrar como starter kit para principiantes."
  });
  ok(exp.clustersElegidos.indexOf("audiencia") !== -1, "el ángulo quedó en el expediente");
  ok(exp.doloresC17.indexOf("se derrama") !== -1, "los dolores C17 quedaron");
  ok(exp.anguloRecomendacion.indexOf("starter kit") !== -1, "la recomendación quedó");
});
t("expediente sin ángulo degrada a listas vacías (compatibilidad)", () => {
  const exp = SophieMotor.aExpediente(SophieMotor.evaluar({}), {}, { keyword: "x" });
  eq(JSON.stringify(exp.clustersElegidos), "[]");
  eq(JSON.stringify(exp.doloresC17), "[]");
});

/* ---------- reporte ---------- */
console.log(salida.join("\n"));
console.log("\nRESULTADO: " + pasan + " pasan · " + fallan + " fallan");
process.exit(fallan ? 1 : 0);
