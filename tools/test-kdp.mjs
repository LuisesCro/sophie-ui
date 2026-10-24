#!/usr/bin/env node
/* ============================================================
   TESTS DE SOPHIE KDP — motor determinista
   Crezcamos Online · sophie-ui/tools/test-kdp.mjs

   Fija el contrato de sophie-kdp-motor.js:
     · regalía paperback y precio mínimo
     · matriz demanda × competencia, riesgo bloqueante y falta de datos
     · auditoría de las 7 casillas (largo, comillas, repetidas, título)
     · auditoría de título (portada, relleno, términos, mayúsculas)

   Uso:  node tools/test-kdp.mjs   (sale con código 1 si algo falla)
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const win = {};
function cargar(archivo) {
  new Function("window", "document", readFileSync(resolve(raiz, archivo), "utf8"))(win, undefined);
}
cargar("sophie-kdp-criterios.js");
cargar("sophie-kdp-motor.js");
const { SophieKdpMotor: M, SophieKdpCriterios: C } = win;

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
const codigos = (r) => r.hallazgos.map((h) => h.codigo);

/* ---------- Regalía ---------- */

t("regalía: 60% del precio menos impresión", () => {
  const r = M.regalia({ precio: 9.99, costoImpresion: 3 });
  eq(r.regalia, 2.99);
  eq(r.precioMinimo, 5.0);
  ok(r.viable && r.cumplePiso);
});

t("regalía: bajo el piso de US$2.50 lo marca y calcula el precio que lo alcanza", () => {
  const r = M.regalia({ precio: 7.99, costoImpresion: 3 });
  eq(r.regalia, 1.79);
  eq(r.cumplePiso, false);
  eq(r.precioParaPiso, 9.17);
});

t("regalía: sin costo de impresión no inventa", () => {
  eq(M.regalia({ precio: 9.99 }).ok, false);
});

t("regalía: acepta números escritos con coma decimal", () => {
  eq(M.regalia({ precio: "9,99", costoImpresion: "3,00" }).regalia, 2.99);
});

/* ---------- Validación del nicho ---------- */

const comp = (bsr, resenas, precio = 8.99) => ({ bsr, resenas, precio });

t("nicho: demanda alta + competencia baja = IR", () => {
  const r = M.evaluarNicho({ competidores: [comp(40000, 12), comp(90000, 30), comp(120000, 8), comp(300000, 400), comp(500000, 900)] });
  eq(r.veredicto, "IR");
  eq(r.provisional, C.provisional);
});

t("nicho: demanda alta + competencia fuerte = PIVOTAR", () => {
  const r = M.evaluarNicho({ competidores: [comp(20000, 900), comp(30000, 700), comp(60000, 1200), comp(80000, 300), comp(400000, 20)] });
  eq(r.veredicto, "PIVOTAR");
});

t("nicho: poca demanda + poca competencia depende del esfuerzo", () => {
  const comps = [comp(300000, 5), comp(400000, 9), comp(600000, 2), comp(700000, 0), comp(900000, 1)];
  eq(M.evaluarNicho({ competidores: comps, esfuerzo: "bajo" }).veredicto, "IR_CATALOGO");
  eq(M.evaluarNicho({ competidores: comps, esfuerzo: "alto" }).veredicto, "DESCARTAR");
});

t("nicho: poca demanda + competencia fuerte = DESCARTAR", () => {
  const r = M.evaluarNicho({ competidores: [comp(300000, 500), comp(400000, 900), comp(600000, 200), comp(700000, 300), comp(900000, 100)] });
  eq(r.veredicto, "DESCARTAR");
});

t("nicho: un riesgo bloquea aunque los números sean buenos", () => {
  const r = M.evaluarNicho({ competidores: [comp(40000, 12), comp(90000, 30), comp(120000, 8), comp(30000, 5), comp(50000, 1)], riesgos: ["Usa un personaje con licencia"] });
  eq(r.veredicto, "BLOQUEADO");
});

t("nicho: con menos de 5 competidores no da veredicto", () => {
  eq(M.evaluarNicho({ competidores: [comp(40000, 12), comp(90000, 30)] }).veredicto, "FALTAN_DATOS");
});

t("nicho: buen nicho con regalía insuficiente pasa a REVISAR_PRECIO", () => {
  const r = M.evaluarNicho({ competidores: [comp(40000, 12, 6.99), comp(90000, 30, 6.99), comp(120000, 8, 6.99), comp(300000, 400, 6.99), comp(500000, 900, 6.99)], costoImpresion: 2.85 });
  eq(r.veredicto, "REVISAR_PRECIO");
  eq(r.bandaPrecio.mediana, 6.99);
});

/* ---------- Las 7 casillas ---------- */

t("casillas: más de 50 caracteres es error", () => {
  const r = M.auditarCasillas(["planner para enfermeras de turno nocturno con hojas de relevo"]);
  ok(codigos(r).includes("largo"));
  ok(r.errores >= 1);
});

t("casillas: las comillas son error", () => {
  ok(codigos(M.auditarCasillas(['"planner enfermeras"'])).includes("comillas"));
});

t("casillas: palabra repetida entre casillas (incluye plural)", () => {
  const r = M.auditarCasillas(["regalo enfermera", "regalos para medicos"]);
  ok(r.hallazgos.some((h) => h.codigo === "repetida" && h.casilla === 2));
});

t("casillas: palabra que ya está en el título", () => {
  const r = M.auditarCasillas(["planner de turnos"], { titulo: "Planner para Enfermeras" });
  ok(r.hallazgos.some((h) => h.codigo === "en_titulo" && h.palabra === "planner"));
});

t("casillas: marca de Amazon es error", () => {
  const r = M.auditarCasillas(["kindle planner"]);
  ok(r.hallazgos.some((h) => h.codigo === "termino" && h.nivel === "error"));
});

t("casillas: avisa si ninguna lleva una frase objetivo sola", () => {
  const r = M.auditarCasillas([
    "agenda semanal enfermera turno noche hospital regalo",
    "diario registro pacientes medicamentos hora signos"
  ]);
  ok(codigos(r).includes("sin_frase_sola"));
});

t("casillas: cuenta casillas usadas y vacías", () => {
  const r = M.auditarCasillas(["planner enfermeras", "", "regalo graduacion enfermeria"]);
  eq(r.usadas, 2);
  eq(r.hallazgos.filter((h) => h.codigo === "vacia").length, 5);
});

t("casillas: una palabra del título se avisa una sola vez aunque se repita", () => {
  const r = M.auditarCasillas(["planner turnos", "planner regalo", "planner noche"], { titulo: "Planner para Enfermeras" });
  eq(r.hallazgos.filter((h) => h.palabra === "planner").length, 1);
});

/* ---------- Título ---------- */

t("título: distinto de la portada es error", () => {
  const r = M.auditarTitulo({ titulo: "Planner de Turnos", tituloPortada: "El Planner de Turnos" });
  ok(r.hallazgos.some((h) => h.codigo === "portada" && h.nivel === "error"));
});

t("título: solo mayúsculas distintas es alerta", () => {
  const r = M.auditarTitulo({ titulo: "Planner de Turnos", tituloPortada: "PLANNER DE TURNOS" });
  ok(r.hallazgos.some((h) => h.codigo === "portada" && h.nivel === "alerta"));
});

t("título: subtítulo con lista de keywords es relleno", () => {
  const r = M.auditarTitulo({ titulo: "Libro para Colorear", subtitulo: "Mandalas, Animales, Flores, Adultos, Relajación, Regalo" });
  ok(codigos(r).includes("relleno"));
});

t("título: marca registrada es error", () => {
  const r = M.auditarTitulo({ titulo: "Libro para Colorear Disney" });
  ok(r.hallazgos.some((h) => h.codigo === "termino" && h.nivel === "error"));
});

t("título: más de 5 palabras en el título es alerta", () => {
  ok(codigos(M.auditarTitulo({ titulo: "El Gran Planner Semanal Para Enfermeras Ocupadas" })).includes("titulo_largo"));
});

t("título: limpio no deja hallazgos", () => {
  const r = M.auditarTitulo({ titulo: "Turno de Noche", subtitulo: "Planner para enfermeras con hojas de relevo y registro de pacientes", tituloPortada: "Turno de Noche" });
  eq(r.hallazgos.length, 0);
});

t("términos: 'free' no se confunde dentro de otra palabra", () => {
  eq(M.buscarTerminos("freedom journal").length, 0);
  eq(M.buscarTerminos("free journal").length, 1);
});

console.log("\nSophie KDP · motor\n" + salida.join("\n"));
console.log(`\n${pasan} pasan, ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
