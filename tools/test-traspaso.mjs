#!/usr/bin/env node
/* ============================================================
   TESTS DEL TRASPASO OPTIMIZADOR → SOPHIE ADS
   Crezcamos Online · sophie-ui/tools/test-traspaso.mjs

   El puente lleva a Sophie Ads lo que el alumno YA vio en el
   Optimizador. Su única obligación es no mentir: no inventar
   decisiones, no contradecir la pantalla, y decir en voz alta
   cuando falta un dato en vez de rellenarlo.

   Uso:  node tools/test-traspaso.mjs
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const win = {};
new Function("window", "document", readFileSync(resolve(raiz, "sophie-ppc.js"), "utf8"))(win, undefined);
const { SophiePPC } = win;

let pasan = 0, fallan = 0;
const salida = [];
const t = (n, fn) => { try { fn(); pasan++; salida.push("  ✓ " + n); } catch (e) { fallan++; salida.push("  ✗ " + n + " — " + e.message); } };
const grupo = (x) => salida.push("\n" + x);
function ok(c, m) { if (!c) throw new Error(m || "esperaba verdadero"); }
function no(c, m) { if (c) throw new Error(m || "esperaba falso"); }

// Un reporte de ejemplo con las cuatro situaciones que importan.
const BASE = () => ({
  economia: { precio: 29.99, breakEvenACOS: 32, diasReporte: 30, objetivo: "rentabilidad" },
  totales: { gasto: 480.50, ventas: 1210.00, ordenes: 41, clics: 620, desperdicio: 96.30, cosechables: 3, ventasTotales: 2400 },
  gate: { veredicto: "El problema es el LISTING, no las pujas", motivo: "CTR sano pero CVR bajo en los términos de mayor gasto" },
  filas: [
    { term: "bamboo spice rack", spend: 120.00, sales: 340, orders: 12, clicks: 150, acos: 35.3, cpc: 0.80, decision: { g: "bajar", accion: "Bajar bid a $0.62" } },
    { term: "spice organizer bamboo", spend: 62.10, sales: 210, orders: 8, clicks: 80, acos: 29.6, cpc: 0.78, decision: { g: "cosechar", accion: "Migrar a exacta con techo $0.86" } },
    { term: "cheap plastic rack", spend: 44.20, sales: 0, orders: 0, clicks: 55, acos: null, cpc: 0.80, decision: { g: "negar", accion: "Negativizar en exacta" } },
    { term: "kitchen shelf", spend: 8.10, sales: 0, orders: 0, clicks: 9, acos: null, cpc: 0.90, decision: { g: "vigilar", accion: "Aún con poco gasto → vigila" } }
  ]
});

grupo("Lleva la economía y los agregados del alumno, sin inventarlos");
t("incluye precio, break-even y CPA de equilibrio", () => {
  const s = SophiePPC.traspaso(BASE());
  ok(s.includes("$29.99"), "precio");
  ok(s.includes("32%"), "break-even ACOS");
  ok(s.includes("$9.60"), "CPA de equilibrio = 29.99 × 32%");
});
t("calcula el ACOS de la cuenta con los totales dados", () => {
  const s = SophiePPC.traspaso(BASE());
  ok(s.includes("39.7%"), "480.50 / 1210 = 39.7%");
});
t("calcula el TACOS cuando hay ventas totales", () => {
  const s = SophiePPC.traspaso(BASE());
  ok(s.includes("TACOS: 20.0%"), "480.50 / 2400 = 20.0%");
});

grupo("Cuando falta un dato, lo dice — no lo rellena");
t("sin ventasTotales pide el dato en vez de inventar un TACOS", () => {
  const d = BASE(); delete d.totales.ventasTotales;
  const s = SophiePPC.traspaso(d);
  ok(s.includes("no calculable"), "debe declararlo no calculable");
  ok(s.includes("Pídeselas"), "debe pedirle el dato al estudiante");
  no(/TACOS: \d/.test(s), "no debe imprimir ningún número de TACOS");
});
t("sin precio o sin break-even devuelve null en vez de un texto a medias", () => {
  const a = BASE(); a.economia.precio = 0;
  const b = BASE(); b.economia.breakEvenACOS = 0;
  ok(SophiePPC.traspaso(a) === null, "sin precio");
  ok(SophiePPC.traspaso(b) === null, "sin break-even");
});

grupo("No decide: repite la decisión que vio el alumno");
t("cada término llega con su acción textual, tal cual", () => {
  const s = SophiePPC.traspaso(BASE());
  ok(s.includes("Bajar bid a $0.62"), "acción de bajar");
  ok(s.includes("Migrar a exacta con techo $0.86"), "acción de cosechar");
  ok(s.includes("Negativizar en exacta"), "acción de negar");
});
t("le prohíbe al modelo recalcular", () => {
  const s = SophiePPC.traspaso(BASE());
  ok(/NO recalcules/i.test(s), "debe llevar la instrucción explícita");
});
t("un grupo vacío no aparece inventado", () => {
  const d = BASE(); d.filas = d.filas.filter((f) => f.decision.g === "negar");
  const s = SophiePPC.traspaso(d);
  ok(s.includes("[NEGAR]"), "el grupo presente sí");
  no(s.includes("[COSECHAR]"), "el ausente no");
});

grupo("Prioriza por gasto: lo que más cuesta, primero");
t("dentro de un grupo ordena por gasto descendente", () => {
  const d = BASE();
  d.filas.push({ term: "otro caro", spend: 300, sales: 0, orders: 0, clicks: 200, acos: null, cpc: 1.5, decision: { g: "negar", accion: "Negativizar" } });
  const s = SophiePPC.traspaso(d);
  ok(s.indexOf("otro caro") < s.indexOf("cheap plastic rack"), "el de $300 va antes que el de $44");
});
t("recorta por grupo y dice cuántos quedaron fuera", () => {
  const d = BASE();
  for (let i = 0; i < 9; i++) d.filas.push({ term: "t" + i, spend: i, sales: 0, orders: 0, clicks: 20, acos: null, cpc: .5, decision: { g: "negar", accion: "Negativizar" } });
  const s = SophiePPC.traspaso(d, 3);
  ok(/\(\+\d+ más en el mismo grupo\)/.test(s), "debe declarar el recorte");
});

grupo("El gate ¿pujas o listing? viaja con su motivo");
t("incluye veredicto y motivo del gate", () => {
  const s = SophiePPC.traspaso(BASE());
  ok(s.includes("El problema es el LISTING"), "veredicto");
  ok(s.includes("CVR bajo"), "motivo");
});
t("sin gate, no se inventa uno", () => {
  const d = BASE(); delete d.gate;
  no(SophiePPC.traspaso(d).includes("¿PUJAS O LISTING?"), "no debe aparecer la sección");
});

grupo("Entradas rotas no lanzan");
t("sin datos, sin filas o con basura devuelve null", () => {
  ok(SophiePPC.traspaso(null) === null);
  ok(SophiePPC.traspaso({}) === null);
  ok(SophiePPC.traspaso({ filas: "no es un arreglo" }) === null);
});
t("una fila sin decisión no rompe el texto", () => {
  const d = BASE(); d.filas.push({ term: "huérfano", spend: 5, clicks: 3, orders: 0 });
  const s = SophiePPC.traspaso(d);
  ok(s.includes("huérfano"), "la fila aparece");
  ok(s.includes("sin acción"), "y se marca como sin acción");
});

console.log("\nTESTS DEL TRASPASO OPTIMIZADOR → ADS" + salida.join("\n"));
console.log(`\nRESULTADO: ${pasan} pasan · ${fallan} fallan\n`);
process.exit(fallan ? 1 : 0);
