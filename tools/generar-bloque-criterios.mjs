#!/usr/bin/env node
/* ============================================================
   GENERADOR DEL BLOQUE DE CRITERIOS DEL PROMPT
   Crezcamos Online · sophie-ui/tools/generar-bloque-criterios.mjs

   El prompt de Sophie Producto llevaba los 13 criterios escritos a mano.
   La guarda de metodología comprobaba que el número APARECIERA en el
   bloque — un detector de humo: no veía una edición parcial. Cambiar
   "SV ≥ 4,500" por "SV ≥ 3,000" pasaba en verde, porque el 4,500 seguía
   presente en la condición de fallo de la misma línea.

   Ahora el bloque se GENERA desde sophie-criterios.js y se compara byte
   a byte. O son idénticos o no lo son.

   Uso:
     node tools/generar-bloque-criterios.mjs              # comparar (sale 1 si difiere)
     node tools/generar-bloque-criterios.mjs --escribir   # actualizar chat.js
     node tools/generar-bloque-criterios.mjs --imprimir   # ver el bloque generado
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ESCRIBIR = process.argv.includes("--escribir");
const IMPRIMIR = process.argv.includes("--imprimir");

/* ---------- 1. el bloque, generado desde la fuente única ---------- */

const win = {};
new Function("window", "document", readFileSync(resolve(raiz, "sophie-criterios.js"), "utf8"))(win, undefined);
const CRITERIOS = win.SophieCriterios;

export function generarBloque() {
  let out = "", faseAnterior = null;
  for (const c of CRITERIOS.lista) {
    if (!c.prompt) throw new Error(`C${c.id} no tiene campo 'prompt' en sophie-criterios.js`);
    // El prompt separa las dos fases con su propio encabezado.
    if (faseAnterior !== null && c.fase !== faseAnterior) out += `\nFASE ${c.fase}\n`;
    faseAnterior = c.fase;
    out += `C${c.id} · ${c.prompt}\n`;
    for (const extra of c.prompt_extra || []) out += `   ${extra}\n`;
  }
  return out + "\n";
}

/* ---------- 2. el bloque tal como está hoy en el prompt ---------- */

// Delimitadores: el bloque va de "C1 ·" hasta la sección de vetos. No se
// inventan marcadores nuevos en el prompt; se usan los que ya existen.
const DESDE = "C1 ·";
const HASTA = "CRITERIOS VETO:";

export function rutaChat() {
  return ["/workspace/sophie-producto/netlify/edge-functions/chat.js",
          resolve(raiz, "..", "sophie-producto", "netlify", "edge-functions", "chat.js")]
    .find(existsSync) || null;
}

// El prompt es un literal de una línea con escapes; se decodifica con JSON.parse
// y se vuelve a codificar igual, para no alterar ni un carácter del resto.
function leerPrompt(lineas) {
  const i = lineas.findIndex((l) => l.startsWith("const SYSTEM_PROMPT_V2 ="));
  if (i < 0) return null;
  const m = lineas[i].match(/=\s*"([\s\S]*)";\s*$/);
  return m ? { linea: i, texto: JSON.parse('"' + m[1] + '"') } : null;
}

export function bloqueEnChat(ruta) {
  const p = leerPrompt(readFileSync(ruta, "utf8").split("\n"));
  if (!p) return null;
  const ini = p.texto.indexOf(DESDE), fin = p.texto.indexOf(HASTA);
  if (ini < 0 || fin < 0 || fin < ini) return null;
  return p.texto.slice(ini, fin);
}

/* ---------- CLI ---------- */

const esCLI = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (esCLI) {
  const generado = generarBloque();
  if (IMPRIMIR) { process.stdout.write(generado); process.exit(0); }

  const ruta = rutaChat();
  if (!ruta) {
    console.error("✗ No encuentro sophie-producto. Este script necesita el repo montado al lado.");
    process.exit(1);
  }
  const actual = bloqueEnChat(ruta);
  if (actual === null) {
    console.error(`✗ No pude aislar el bloque en ${ruta} (delimitadores "${DESDE}" … "${HASTA}").`);
    process.exit(1);
  }

  if (actual === generado) {
    console.log(`✓ El bloque del prompt coincide con sophie-criterios.js (${generado.length} caracteres).`);
    process.exit(0);
  }

  if (!ESCRIBIR) {
    console.error("✗ El bloque del prompt NO coincide con sophie-criterios.js.");
    for (let k = 0; k < Math.max(actual.length, generado.length); k++) {
      if (actual[k] !== generado[k]) {
        console.error(`\n  primera diferencia en el carácter ${k}:`);
        console.error("    en chat.js:  " + JSON.stringify(actual.slice(Math.max(0, k - 50), k + 50)));
        console.error("    debería ser: " + JSON.stringify(generado.slice(Math.max(0, k - 50), k + 50)));
        break;
      }
    }
    console.error("\n  Si el cambio es intencional, hazlo en sophie-criterios.js y corre:");
    console.error("    node tools/generar-bloque-criterios.mjs --escribir\n");
    process.exit(1);
  }

  // Reescritura quirúrgica: se sustituye solo el bloque dentro del literal.
  const lineas = readFileSync(ruta, "utf8").split("\n");
  const p = leerPrompt(lineas);
  const nuevoTexto = p.texto.slice(0, p.texto.indexOf(DESDE)) + generado + p.texto.slice(p.texto.indexOf(HASTA));
  lineas[p.linea] = "const SYSTEM_PROMPT_V2 = " + JSON.stringify(nuevoTexto) + ";";
  writeFileSync(ruta, lineas.join("\n"));
  console.log(`✓ Bloque actualizado en ${ruta} (${generado.length} caracteres).`);
}
