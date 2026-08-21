#!/usr/bin/env node
/* ============================================================
   TESTS DEL PARSER NUMÉRICO COMPARTIDO
   Crezcamos Online · sophie-ui/tools/test-numeros.mjs

   El estudiante teclea en español y pega exportaciones en inglés. El
   parser viejo borraba todas las comas: "24,9" se convertía en 249 —un
   error de 10x en un criterio de VETO— y "1.234" reseñas se leían como
   1.2, aprobando un nicho quemado.

   La función vive duplicada en tres motores (cada módulo carga un
   subconjunto distinto). Esto fija su contrato Y verifica que las tres
   copias no hayan divergido.

   Uso:  node tools/test-numeros.mjs
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function cargar(archivos) {
  const win = {};
  for (const a of archivos) new Function("window", "document", readFileSync(resolve(raiz, a), "utf8"))(win, undefined);
  return win;
}
const motor = cargar(["sophie-criterios.js", "sophie-motor.js"]).SophieMotor;

// Los otros dos motores NO exponen num() —es privada—, así que no se puede
// llamar desde fuera. Comparar el motor consigo mismo habría dado un verde
// vacío, que es peor que no tener el test. Se comparan los FUENTES: la
// función debe ser carácter por carácter la misma en los tres archivos.
const COPIAS = ["sophie-motor.js", "sophie-keywords.js", "sophie-cotizaciones.js"];
function extraerNum(archivo) {
  const src = readFileSync(resolve(raiz, archivo), "utf8");
  const ini = src.indexOf("  function num(v) {");
  if (ini < 0) return null;
  const fin = src.indexOf("\n  }\n", ini);
  return fin < 0 ? null : src.slice(ini, fin + 4);
}

let pasan = 0, fallan = 0;
const salida = [];
const t = (n, fn) => { try { fn(); pasan++; salida.push("  ✓ " + n); } catch (e) { fallan++; salida.push("  ✗ " + n + " — " + e.message); } };
const grupo = (x) => salida.push("\n" + x);
function eq(a, b, m) { if (!(a === b || (Number.isNaN(a) && Number.isNaN(b)))) throw new Error((m ? m + ": " : "") + `esperaba ${b} y dio ${a}`); }

const num = motor.num;

/* La tabla es el contrato. Cada fila: entrada, resultado, por qué importa. */
const CASOS = [
  // Inglés — lo que exporta Helium 10
  ["22,400", 22400, "miles inglés"],
  ["4,500", 4500, "miles inglés"],
  ["1,234,567", 1234567, "miles inglés, dos grupos"],
  ["24.99", 24.99, "decimal inglés"],
  ["$29.99", 29.99, "moneda"],
  ["1,234.56", 1234.56, "miles + decimal inglés"],
  ["32%", 32, "porcentaje"],

  // Español — lo que teclea el estudiante
  ["24,9", 24.9, "decimal latino — antes daba 249"],
  ["34,99", 34.99, "decimal latino de dos cifras"],
  ["1.234,56", 1234.56, "miles + decimal latino — antes daba 1.23"],
  ["1.234", 1234, "miles latino — antes daba 1.234"],
  ["22.400", 22400, "miles latino"],
  ["1.234.567", 1234567, "miles latino, dos grupos"],

  // Los que NO son agrupación
  ["0.325", 0.325, "tasa: la agrupación nunca empieza en 0"],
  ["0,325", 0.325, "misma tasa en latino"],
  ["1.5", 1.5, "un decimal"],
  ["0.5", 0.5, "medio"],

  // Abreviado y signos
  ["1.2k", 1200, "sufijo k"],
  ["22k", 22000, "sufijo k entero"],
  ["-24,9", -24.9, "negativo latino"],

  // Sin número: NaN, nunca 0
  ["", NaN, "vacío"],
  [null, NaN, "nulo"],
  [undefined, NaN, "indefinido"],
  ["no aplica", NaN, "texto"],
  ["$", NaN, "solo el símbolo"],

  // Ya numérico
  [29.99, 29.99, "número tal cual"],
  [0, 0, "cero es un dato, no la ausencia de dato"],
  [NaN, NaN, "NaN sigue siendo NaN"]
];

grupo("El contrato del parser");
for (const [entrada, esperado, porque] of CASOS) {
  t(`${JSON.stringify(entrada)} → ${esperado}  ${porque}`, () => eq(num(entrada), esperado));
}

grupo("Las tres copias no han divergido");
t("los tres motores llevan la MISMA función num(), carácter por carácter", () => {
  const ref = extraerNum(COPIAS[0]);
  if (!ref) throw new Error("no encuentro num() en " + COPIAS[0]);
  for (const archivo of COPIAS.slice(1)) {
    const otra = extraerNum(archivo);
    if (!otra) throw new Error("no encuentro num() en " + archivo);
    if (otra !== ref) {
      let k = 0; while (k < Math.min(ref.length, otra.length) && ref[k] === otra[k]) k++;
      throw new Error(archivo + " divergió en el carácter " + k + ": " + JSON.stringify(otra.slice(k, k + 60)));
    }
  }
});
t("cada copia, evaluada por separado, cumple la tabla", () => {
  // Se evalúa el texto de cada copia en su propio ámbito: si una divergiera
  // en comportamiento aunque el texto pareciera igual, esto lo vería.
  for (const archivo of COPIAS) {
    const fn = new Function("v", extraerNum(archivo) + "\nreturn num(v);");
    for (const [entrada, esperado] of CASOS) {
      const dio = fn(entrada);
      if (!(dio === esperado || (Number.isNaN(dio) && Number.isNaN(esperado)))) {
        throw new Error(`${archivo} con ${JSON.stringify(entrada)}: esperaba ${esperado} y dio ${dio}`);
      }
    }
  }
});

grupo("La consecuencia real: un veredicto");
t("1,234 reseñas en formato latino ya no aprueban el criterio 4 (≤ 300)", () => {
  const base = { searchVolume: 22400, tendencia: "estable", averageRevenue: 9800, concentracionTop1: 22,
    averagePrice: 34.99, keywordsCerebro: 62, margenAntesPPC: 42, roi: 165,
    costoAterrizadoPct: 22, moq: 200, unidadesPosibles: 320 };
  const j = { 6: "pass", 9: "pass", 12: "pass", 13: "pass" };
  const r = motor.evaluar({ ...base, averageReviews: "1.234" }, j);
  const c4 = r.filas.find((f) => f.id === 4);
  eq(c4.valor_num, 1234, "debe leer mil doscientas treinta y cuatro reseñas");
  eq(c4.estado, "fail", "un nicho con 1,234 reseñas no puede pasar un umbral de 300");
});
t("un margen tecleado como 24,9 se lee como 24.9, no como 249", () => {
  const r = motor.evaluar({ margenAntesPPC: "24,9" }, {});
  eq(r.filas.find((f) => f.id === 8).valor_num, 24.9);
});

console.log("\nTESTS DEL PARSER NUMÉRICO" + salida.join("\n"));
console.log(`\nRESULTADO: ${pasan} pasan · ${fallan} fallan\n`);
process.exit(fallan ? 1 : 0);
