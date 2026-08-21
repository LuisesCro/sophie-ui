#!/usr/bin/env node
/* ============================================================
   TESTS DEL GENERADOR DEL BLOQUE DE CRITERIOS
   Crezcamos Online · sophie-ui/tools/test-generador.mjs

   Determinista y sin repos hermanos: prueba que el bloque se genera
   bien desde sophie-criterios.js. La comparación contra el chat.js real
   la hace la guarda de metodología, que sí necesita el repo montado.
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { generarBloque } from "./generar-bloque-criterios.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const win = {};
new Function("window", "document", readFileSync(resolve(raiz, "sophie-criterios.js"), "utf8"))(win, undefined);
const C = win.SophieCriterios;

let pasan = 0, fallan = 0;
const salida = [];
const t = (n, fn) => { try { fn(); pasan++; salida.push("  ✓ " + n); } catch (e) { fallan++; salida.push("  ✗ " + n + " — " + e.message); } };
const grupo = (x) => salida.push("\n" + x);
function ok(c, m) { if (!c) throw new Error(m || "esperaba verdadero"); }
function eq(a, b, m) { if (a !== b) throw new Error((m ? m + ": " : "") + `esperaba ${JSON.stringify(b)} y dio ${JSON.stringify(a)}`); }

const bloque = generarBloque();

grupo("Todos los criterios llegan al prompt");
t("los 13 criterios tienen su línea", () => {
  for (const c of C.lista) ok(bloque.includes(`C${c.id} · `), `falta C${c.id}`);
});
t("ninguno se queda sin texto de prompt en la fuente", () => {
  const sin = C.lista.filter((c) => !c.prompt).map((c) => "C" + c.id);
  eq(sin.length, 0, "criterios sin campo prompt: " + sin.join(", "));
});
t("salen en orden de id", () => {
  const pos = C.lista.map((c) => bloque.indexOf(`C${c.id} · `));
  for (let i = 1; i < pos.length; i++) ok(pos[i] > pos[i - 1], `C${C.lista[i].id} sale fuera de orden`);
});

grupo("La estructura de fases se deriva, no se escribe a mano");
t("hay un encabezado FASE 2 y va antes del primer criterio de fase 2", () => {
  const primeroF2 = C.lista.find((c) => c.fase === 2);
  ok(bloque.includes("\nFASE 2\n"), "falta el encabezado");
  ok(bloque.indexOf("\nFASE 2\n") < bloque.indexOf(`C${primeroF2.id} · `), "va después del criterio");
});
t("el último criterio de fase 1 va antes del encabezado", () => {
  const ultimoF1 = C.lista.filter((c) => c.fase === 1).pop();
  ok(bloque.indexOf(`C${ultimoF1.id} · `) < bloque.indexOf("\nFASE 2\n"));
});

grupo("Los umbrales del prompt son los de la fuente única");
t("cada criterio numérico menciona su umbral en su propia línea", () => {
  for (const c of C.lista) {
    if (c.umbral_num == null) continue;
    const ini = bloque.indexOf(`C${c.id} · `);
    const sig = bloque.indexOf(`\nC${c.id + 1} · `, ini);
    const linea = bloque.slice(ini, sig > 0 ? sig : ini + 800);
    const n = c.umbral_num;
    const re = new RegExp(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "[.,]?"));
    ok(re.test(linea.replace(/[.,]/g, (m2, i2) => (/\d/.test(linea[i2 - 1]) && /\d/.test(linea[i2 + 1]) ? m2 : m2))),
       `C${c.id}: el prompt no menciona ${n}`);
  }
});

grupo("El generador es determinista");
t("dos llamadas dan exactamente lo mismo", () => {
  eq(generarBloque(), bloque, "no determinista");
});
t("las líneas extra van indentadas con tres espacios", () => {
  for (const c of C.lista) {
    for (const e of c.prompt_extra || []) ok(bloque.includes("   " + e + "\n"), `C${c.id}: línea extra sin indentar`);
  }
});
t("termina con una línea en blanco, para no pegarse a la sección siguiente", () => {
  ok(bloque.endsWith("\n\n"), "debe cerrar con salto doble");
});

console.log("\nTESTS DEL GENERADOR DEL BLOQUE DE CRITERIOS" + salida.join("\n"));
console.log(`\nRESULTADO: ${pasan} pasan · ${fallan} fallan\n`);
process.exit(fallan ? 1 : 0);
