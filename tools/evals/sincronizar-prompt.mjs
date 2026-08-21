#!/usr/bin/env node
/* ============================================================
   SNAPSHOT DEL PROMPT REAL — para evaluar sin los 6 repos al lado
   Crezcamos Online · sophie-ui/tools/evals/sincronizar-prompt.mjs

   El eval debe medir el prompt que corre EN PRODUCCIÓN. Lo ideal es
   leerlo de sophie-producto/chat.js, pero ese repo es privado y no
   siempre está montado (una laptop sin clonar los 10, un CI sin token).

   La salida intermedia: un snapshot generado por script — nunca escrito
   a mano — con el sha256 de lo que copió. Cuando sophie-producto SÍ está
   disponible, el eval verifica que el snapshot siga igual al original y
   falla si divergieron. Misma disciplina que verificar-metodologia.mjs:
   la copia se permite, la copia desincronizada no.

   Uso:  node tools/evals/sincronizar-prompt.mjs
         (requiere sophie-producto montado; regenera el snapshot)
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
export const RUTA_SNAPSHOT = resolve(aqui, "prompt-snapshot.json");

export function rutaChatProducto() {
  const raiz = resolve(aqui, "..", "..");
  return ["/workspace/sophie-producto/netlify/edge-functions/chat.js",
          resolve(raiz, "..", "sophie-producto", "netlify", "edge-functions", "chat.js")]
    .find(existsSync) || null;
}

// Los prompts son literales de una sola línea con escapes; se extraen por
// prefijo de línea y se desescapan con JSON.parse.
export function extraerDeChat(ruta) {
  const L = readFileSync(ruta, "utf8").split("\n");
  const saca = (n) => {
    const i = L.findIndex((l) => l.startsWith(`const ${n} =`));
    if (i < 0) return null;
    const m = L[i].match(/=\s*"([\s\S]*)";\s*$/);
    return m ? JSON.parse('"' + m[1] + '"') : null;
  };
  const a = saca("SYSTEM_PROMPT_V2"), b = saca("BLOQUE_V2");
  return a && b ? a + b : null;
}

export const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

export function leerSnapshot() {
  if (!existsSync(RUTA_SNAPSHOT)) return null;
  try { return JSON.parse(readFileSync(RUTA_SNAPSHOT, "utf8")); } catch { return null; }
}

/* ---------- CLI ---------- */

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const ruta = rutaChatProducto();
  if (!ruta) {
    console.error("✗ No encuentro sophie-producto. Este script solo corre donde el repo está montado.");
    process.exit(1);
  }
  const prompt = extraerDeChat(ruta);
  if (!prompt) {
    console.error(`✗ No pude extraer SYSTEM_PROMPT_V2/BLOQUE_V2 de ${ruta}.`);
    process.exit(1);
  }
  writeFileSync(RUTA_SNAPSHOT, JSON.stringify({
    nota: "GENERADO POR tools/evals/sincronizar-prompt.mjs — no editar a mano.",
    origen: "sophie-producto/netlify/edge-functions/chat.js · SYSTEM_PROMPT_V2 + BLOQUE_V2",
    sha256: sha(prompt),
    caracteres: prompt.length,
    prompt
  }, null, 2) + "\n");
  console.log(`✓ Snapshot actualizado · ${prompt.length} caracteres · sha256 ${sha(prompt).slice(0, 12)}…`);
}
