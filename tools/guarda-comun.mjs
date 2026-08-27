#!/usr/bin/env node
/* ============================================================
   ANDAMIAJE COMÚN DE LAS GUARDAS
   Crezcamos Online · sophie-ui/tools/guarda-comun.mjs

   Las guardas viven de decir la verdad. Antes, una guarda que
   omitía TODAS sus comprobaciones (porque el repo hermano no
   estaba montado) igual cerraba con "RESULTADO: OK — los 6
   módulos cumplen". Ese verde falso es peor que no tener guarda:
   alguien lee OK y despliega un umbral desincronizado.

   Aquí el cierre distingue tres estados:
     OK      — se verificó todo y todo coincide.
     PARCIAL — nada falló, pero quedaron comprobaciones sin hacer.
               Sale con código 0 (no bloquea un checkout parcial)
               pero JAMÁS afirma lo que no comprobó.
     FALLA   — hay desincronización, o corriste con --strict y
               quedaron comprobaciones sin hacer.

   --strict es el modo para el flujo de "voy a mover un umbral":
   exige que todos los repos hermanos estén montados y convierte
   cualquier omisión en falla.
   ============================================================ */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const ESTRICTO = process.argv.includes("--strict");

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- repos hermanos ---------- */

// Un repo hermano puede estar en /workspace (contenedor) o al lado del clon
// (escritorio). Devuelve la primera ruta existente y las que se revisaron,
// para que el aviso diga DÓNDE se buscó.
export function repoHermano(repo, subruta) {
  const revisados = [
    resolve("/workspace", repo, subruta),
    resolve(RAIZ, "..", repo, subruta),
  ];
  return { ruta: revisados.find(existsSync) || null, revisados };
}

/* ---------- comparación de números ---------- */

// Extrae los números de un texto en prosa a un Set, normalizando separadores
// de miles ("4,500" y "4.500" → 4500). Comparar contra este Set es exacto:
// no hay regex que "casi" acierte ni un 30 que matchee dentro de un 300.
export function numerosDe(texto) {
  // Alternancia ORDENADA: primero miles ("4,500" / "4.500" → 4500), y solo si
  // no encaja, un número suelto. Importa el orden: con un tokenizador goloso,
  // una enumeración como "1,7,8,10,13" se comía entera y NINGUNO de sus
  // números entraba al set — la guarda daba por ausente algo que sí estaba.
  const RE = /\d{1,3}(?:[.,]\d{3})+(?!\d)|\d+(?:\.\d+)?/g;
  const set = new Set();
  for (const t of texto.match(RE) || []) {
    set.add(t.includes(",") || /\.\d{3}$/.test(t) ? Number(t.replace(/[.,]/g, "")) : Number(t));
  }
  return set;
}

/* ---------- reporte ---------- */

export function crearReporte() {
  const lineas = [];
  const cuenta = { ok: 0, fallos: 0, omitidos: 0 };
  return {
    lineas,
    cuenta,
    ok(msg) { lineas.push("  ✓ " + msg); cuenta.ok++; },
    fail(msg) { lineas.push("  ✗ " + msg); cuenta.fallos++; },
    // Comprobación que NO se pudo hacer (repo hermano ausente). No bloquea el
    // push en un checkout parcial, pero se cuenta: el cierre nunca dirá "OK"
    // si quedó algo sin verificar.
    aviso(msg) {
      lineas.push("  ⚠ " + msg + (ESTRICTO ? " [--strict → falla]" : " [omitido]"));
      cuenta.omitidos++;
      if (ESTRICTO) cuenta.fallos++;
    },
    seccion(t) { lineas.push("\n" + t); },
  };
}

// textos: { titulo, falla, parcial, ok, comando }
export function cerrar(rep, textos) {
  const { ok, fallos, omitidos } = rep.cuenta;
  console.log(textos.titulo);
  console.log(rep.lineas.join("\n"));
  console.log("");
  if (fallos) {
    console.log("RESULTADO: " + fallos + " " + textos.falla);
    process.exit(1);
  }
  if (omitidos) {
    console.log(
      "RESULTADO: PARCIAL — " + ok + " comprobación(es) OK, " + omitidos +
      " SIN VERIFICAR (repo hermano no montado)."
    );
    console.log("Esto NO confirma " + textos.parcial + ".");
    console.log("Verificación completa (monta los repos hermanos): " + textos.comando + " --strict");
    process.exit(0);
  }
  console.log("RESULTADO: OK — " + textos.ok);
  process.exit(0);
}
