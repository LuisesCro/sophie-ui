#!/usr/bin/env node
/* ============================================================
   LAS GUARDAS DE LA SUITE, EN UNA SOLA CORRIDA
   Crezcamos Online · sophie-ui/tools/guardas.mjs

   Corre las tres guardas y agrega el resultado. Las corre TODAS
   aunque una falle: encadenarlas con && esconde los problemas
   que vienen después del primero, y cuando mueves un umbral
   quieres ver de una vez todas las copias que quedaron atrás.

   Uso:
     node tools/guardas.mjs            (lenient: omite repos ausentes)
     node tools/guardas.mjs --strict   (exige todos los repos hermanos)
   ============================================================ */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const ESTRICTO = process.argv.includes("--strict");
const args = ESTRICTO ? ["--strict"] : [];

const GUARDAS = [
  ["metodología (prompt de Producto + pantallas del alumno)", "verificar-metodologia.mjs"],
  ["router de modelo (los 6 chat.js)", "verificar-router.mjs"],
  ["prompts del cockpit (sophie-creador)", "verificar-creador.mjs"],
];

const resultados = [];
for (const [titulo, archivo] of GUARDAS) {
  console.log("\n" + "─".repeat(64));
  console.log("▶ " + titulo);
  console.log("─".repeat(64));
  const r = spawnSync(process.execPath, [resolve(AQUI, archivo), ...args], { stdio: "inherit" });
  resultados.push({ titulo, codigo: r.status ?? 1 });
}

console.log("\n" + "═".repeat(64));
const fallidas = resultados.filter((r) => r.codigo !== 0);
if (fallidas.length) {
  console.log("GUARDAS: " + fallidas.length + " de " + resultados.length + " fallaron —");
  for (const f of fallidas) console.log("  ✗ " + f.titulo);
  console.log("No despliegues hasta que las tres den OK.");
  process.exit(1);
}
console.log("GUARDAS: las " + resultados.length + " pasaron" + (ESTRICTO ? " en modo --strict." : "."));
if (!ESTRICTO) console.log("(Lenient: lo que diga PARCIAL arriba quedó SIN verificar.)");
process.exit(0);
