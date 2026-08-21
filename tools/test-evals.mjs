#!/usr/bin/env node
/* ============================================================
   TEST DEL ARNÉS DE EVALUACIÓN
   Crezcamos Online · sophie-ui/tools/test-evals.mjs

   Un arnés que siempre dice "100%" no sirve para nada. Esto le da
   respuestas FABRICADAS con fallos conocidos y confirma que los ve.
   Determinista, sin tokens, sin red.

   Uso:  node tools/test-evals.mjs
   ============================================================ */

import { evaluarRespuesta, CASOS } from "./evals/correr.mjs";

let pasan = 0, fallan = 0;
const salida = [];
const t = (n, fn) => { try { fn(); pasan++; salida.push("  ✓ " + n); } catch (e) { fallan++; salida.push("  ✗ " + n + " — " + e.message); } };
const grupo = (x) => salida.push("\n" + x);
function eq(a, b, m) { if (a !== b) throw new Error((m ? m + ": " : "") + `esperaba ${JSON.stringify(b)} y dio ${JSON.stringify(a)}`); }

const caso = CASOS.casos.find((c) => c.id === "estrella-01");
const chequeo = (r, n) => r.chequeos.find((c) => c.nombre === n);

// Fabrica la respuesta que Sophie DEBERÍA dar: prosa + marcador correcto.
function respuestaPerfecta(c, cambios = {}) {
  const payload = {
    fase: 9,
    datos: { ...c.esperado.datos, ...(cambios.datos || {}) },
    juicios: { ...(c.esperado.juicios || {}), ...(cambios.juicios || {}) }
  };
  return `<p>Analicé tu producto con los 13 criterios.</p><!--SOPHIE:${JSON.stringify(payload)}-->`;
}

grupo("El arnés reconoce una respuesta correcta");
t("marcador, extracción, veredicto y vetos pasan los cuatro", () => {
  const r = evaluarRespuesta(caso, respuestaPerfecta(caso));
  eq(r.chequeos.length, 4, "número de chequeos");
  eq(r.chequeos.every((c) => c.ok), true, "todos en verde");
});

grupo("El arnés detecta un marcador roto (el fallo que hoy deja al alumno sin pantalla)");
t("marcador truncado en streaming → falla 'marcador' y no sigue", () => {
  const roto = '<p>Analicé tu producto.</p><!--SOPHIE:{"fase":9,"datos":{"searchVolume":224';
  const r = evaluarRespuesta(caso, roto);
  eq(chequeo(r, "marcador").ok, false);
  eq(r.chequeos.length, 1, "sin marcador no se puede evaluar nada más");
});
t("JSON mal formado → falla 'marcador'", () => {
  const r = evaluarRespuesta(caso, '<!--SOPHIE:{"fase":9,,"datos":{}}-->');
  eq(chequeo(r, "marcador").ok, false);
});
t("respuesta sin marcador (Sophie contestó en prosa) → falla 'marcador'", () => {
  const r = evaluarRespuesta(caso, "<p>Tu producto se ve muy bien, adelante.</p>");
  eq(chequeo(r, "marcador").ok, false);
});

grupo("El arnés separa fallo de EXTRACCIÓN de fallo de JUICIO");
t("número mal leído → falla 'extracción', el veredicto puede seguir bien", () => {
  const r = evaluarRespuesta(caso, respuestaPerfecta(caso, { datos: { averageRevenue: 980 } }));
  eq(chequeo(r, "extracción").ok, false, "debe ver el número mal leído");
  // El reporte nombra el CRITERIO afectado (C2 = Ingresos reales del mercado),
  // no la clave cruda: es lo que le dice al alumno qué se evaluó mal.
  eq(chequeo(r, "extracción").detalle.includes("C2"), true, "debe nombrar el criterio");
});

grupo("Los campos auxiliares SÍ se verifican (los que degradan un criterio)");
// La revisión encontró que solo se comparaban los campos primarios: leer mal la
// tendencia daba verde y el caso trampa no podía fallar nunca.
const trampa = CASOS.casos.find((c) => c.id === "trampa-tendencia-01");
t("tendencia mal leída ('estable' en vez de en caída) → falla extracción en C1", () => {
  const r = evaluarRespuesta(trampa, respuestaPerfecta(trampa, { datos: { tendencia: "estable" } }));
  eq(chequeo(r, "extracción").ok, false, "debe ver la tendencia mal leída");
  eq(chequeo(r, "extracción").detalle.includes("C1"), true, "y señalar el criterio 1");
});
t("una reseña top inflada (>1000) → falla extracción en C4", () => {
  const r = evaluarRespuesta(trampa, respuestaPerfecta(trampa, { datos: { topReviews: [1200] } }));
  eq(chequeo(r, "extracción").ok, false, "topReviews degrada C4 y debe verse");
});
t("ROI mal leído bajo 100 → falla extracción en C8", () => {
  const r = evaluarRespuesta(trampa, respuestaPerfecta(trampa, { datos: { roi: 80 } }));
  eq(chequeo(r, "extracción").ok, false, "roi degrada C8 y debe verse");
});
t("MOQ mal leído sobre 300 → falla extracción en C10", () => {
  const r = evaluarRespuesta(trampa, respuestaPerfecta(trampa, { datos: { moq: 900 } }));
  eq(chequeo(r, "extracción").ok, false, "moq degrada C10 y debe verse");
});
t("decir la tendencia con otras palabras NO es un error", () => {
  // El estudiante escribe "en caída" y Sophie "bajando": el motor degrada igual.
  // Comparar cadenas reprobaría una lectura correcta; se compara el efecto.
  const r = evaluarRespuesta(trampa, respuestaPerfecta(trampa, { datos: { tendencia: "descendente" } }));
  eq(chequeo(r, "extracción").ok, true, "sinónimos que degradan igual deben pasar");
});

grupo("Renombrar campos a la nomenclatura canónica NO es un error de extracción");
t("el alumno pega 'monthlyRevenue' y Sophie emite 'averageRevenue' → extracción OK", () => {
  const alias = CASOS.casos.find((c) => c.id === "alias-helium-01");
  // Sophie normaliza los nombres viejos de Helium 10 a los canónicos del motor.
  // El motor resuelve ambos con su tabla de alias, así que ve los mismos números.
  const canonico = {
    searchVolume: 7800, averageRevenue: 6400, averageReviews: 195, averagePrice: 29.99,
    concentracionTop1: 24, topReviews: [390], tendencia: "estable",
    keywordsCerebro: 37, margenAntesPPC: 36, roi: 122,
    costoAterrizadoPct: 25, moq: 200, unidadesPosibles: 240
  };
  const texto = `<p>Listo.</p><!--SOPHIE:${JSON.stringify({ fase: 9, datos: canonico, juicios: alias.esperado.juicios })}-->`;
  const r = evaluarRespuesta(alias, texto);
  eq(chequeo(r, "extracción").ok, true, "renombrar al canónico no debe contar como fallo");
  eq(chequeo(r, "veredicto").ok, true, "y el veredicto debe salir igual");
});
t("juicio distinto al mío → se REPORTA, no se reprueba", () => {
  // Los criterios 6, 9, 12 y 13 los juzga el modelo con una regla en prosa.
  // Discrepar de la etiqueta que escribimos nosotros no es un fallo
  // determinista: se reporta la divergencia y la capa 2 decide si está fundada.
  const r = evaluarRespuesta(caso, respuestaPerfecta(caso, { juicios: { 6: "fail", 9: "fail", 12: "fail", 13: "fail" } }));
  eq(chequeo(r, "extracción").ok, true, "los números están bien");
  eq(chequeo(r, "veredicto").ok, true, "el camino de datos sigue siendo correcto");
  eq(r.divergen.length, 4, "las cuatro divergencias de juicio se reportan");
  eq(r.veredictoReal !== caso.esperado.veredicto, true, "y se dice qué veredicto ve el estudiante con SUS juicios");
});

t("un veto de JUICIO (C13) no reprueba el chequeo de vetos", () => {
  // Fue el falso fallo de trampa-tendencia-01: Sophie marcó C13 fail siguiendo
  // la regla del prompt y el arnés la reprobó contra una etiqueta improvisada.
  const r = evaluarRespuesta(caso, respuestaPerfecta(caso, { juicios: { 13: "fail" } }));
  eq(chequeo(r, "vetos").ok, true, "los vetos numéricos siguen intactos");
  eq(r.divergen.some((d) => d.id === 13), true, "pero la divergencia de C13 se reporta");
});

grupo("El arnés atrapa el fallo más caro: un GO sobre un producto vetado");
t("veto de margen ignorado por el modelo → falla 'veredicto' Y 'vetos'", () => {
  const veto = CASOS.casos.find((c) => c.id === "veto-margen-01");
  // El modelo "suaviza" el margen de 18% a 35% y con eso desaparece el veto.
  const r = evaluarRespuesta(veto, respuestaPerfecta(veto, { datos: { margenAntesPPC: 35 } }));
  eq(chequeo(r, "extracción").ok, false, "inventó el número");
  eq(chequeo(r, "vetos").ok, false, "el veto 8 debía estar activo");
  eq(chequeo(r, "veredicto").ok, false, "y el veredicto se infló");
});

grupo("Los alias de Helium 10 no rompen la evaluación");
t("nomenclatura vieja (sv, monthlyRevenue, price) evalúa igual", () => {
  const alias = CASOS.casos.find((c) => c.id === "alias-helium-01");
  const r = evaluarRespuesta(alias, respuestaPerfecta(alias));
  eq(r.chequeos.every((c) => c.ok), true, "todos en verde con los alias");
});

console.log("\nTEST DEL ARNÉS DE EVALUACIÓN" + salida.join("\n"));
console.log(`\nRESULTADO: ${pasan} pasan · ${fallan} fallan\n`);
process.exit(fallan ? 1 : 0);
