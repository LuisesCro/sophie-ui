#!/usr/bin/env node
/* ============================================================
   TESTS DE LAS PANTALLAS GUIADAS (pasos 3 y 4)
   Crezcamos Online · sophie-ui/tools/test-pasos.mjs

   Los filtros de Black Box y Cerebro eran la segunda copia en prosa de
   los umbrales. Ahora se leen de SophieCriterios.filtros: la copia dejó
   de existir. Esto fija esa propiedad — que la pantalla SIGA a la fuente
   y que falle ruidosamente si la fuente no está.

   Uso:  node tools/test-pasos.mjs
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fuente = (f) => readFileSync(resolve(raiz, f), "utf8");

// Cada test monta su propio entorno: así se puede alterar la fuente sin
// contaminar los demás.
function montar(mutar) {
  const win = {};
  new Function("window", "document", fuente("sophie-criterios.js"))(win, undefined);
  if (mutar) mutar(win.SophieCriterios);
  new Function("window", "document", fuente("sophie-pasos.js"))(win, undefined);
  return win;
}

let pasan = 0, fallan = 0;
const salida = [];
const t = (n, fn) => { try { fn(); pasan++; salida.push("  ✓ " + n); } catch (e) { fallan++; salida.push("  ✗ " + n + " — " + e.message); } };
const grupo = (x) => salida.push("\n" + x);
function ok(c, m) { if (!c) throw new Error(m || "esperaba verdadero"); }
function lanza(fn, m) { try { fn(); } catch { return; } throw new Error(m || "esperaba que lanzara"); }

const V = { categoria: "Home & Kitchen", keyword: "bamboo spice rack" };

grupo("La pantalla muestra los umbrales de la fuente única");
t("paso 3 muestra los 6 filtros de Black Box", () => {
  const w = montar();
  const html = w.SophiePasos.pantalla(3, V);
  for (const f of w.SophieCriterios.filtros.blackBox) {
    ok(html.includes(f.campo), "falta el campo " + f.campo);
    if (f.min != null) ok(html.includes(Number(f.min).toLocaleString("en-US")), `${f.campo}: falta min`);
    if (f.max != null) ok(html.includes(Number(f.max).toLocaleString("en-US")), `${f.campo}: falta max`);
  }
});
t("paso 4 muestra los 4 filtros de Cerebro", () => {
  const w = montar();
  const html = w.SophiePasos.pantalla(4, V);
  for (const f of w.SophieCriterios.filtros.cerebro) {
    ok(html.includes(f.campo), "falta el campo " + f.campo);
    if (f.valor !== undefined) ok(html.includes(f.valor), `${f.campo}: falta el valor`);
    if (f.min != null) ok(html.includes(Number(f.min).toLocaleString("en-US")), `${f.campo}: falta min`);
    if (f.max != null) ok(html.includes(Number(f.max).toLocaleString("en-US")), `${f.campo}: falta max`);
  }
});

grupo("Cambiar la fuente cambia la pantalla — sin tocar sophie-pasos.js");
t("subir el mínimo de Search Volume se refleja en la lista y en la explicación", () => {
  const w = montar((C) => { C.filtros.blackBox.find((f) => f.campo === "Search Volume").min = 6000; });
  const html = w.SophiePasos.pantalla(3, V);
  // Se mira SOLO lo que habla de Search Volume: el 4,500 sigue apareciendo en la
  // página, y con razón — es el mínimo de Monthly Revenue, que no tocamos.
  const enLista = (html.match(/Search Volume<\/b> \(mínimo\): [^<]+/) || [""])[0];
  const enTexto = (html.match(/Search Volume ≥ [\d,]+/) || [""])[0];
  ok(enLista.includes("6,000"), "la lista no siguió a la fuente: " + enLista);
  ok(enTexto.includes("6,000"), "la explicación no siguió a la fuente: " + enTexto);
  ok(!enLista.includes("4,500") && !enTexto.includes("4,500"), "quedó el valor viejo a mano");
});
t("cambiar el máximo de Review Count se refleja", () => {
  const w = montar((C) => { C.filtros.blackBox.find((f) => f.campo === "Review Count").max = 250; });
  ok(w.SophiePasos.pantalla(3, V).includes("250"));
});
t("cambiar el rango de competidores de Cerebro se refleja", () => {
  const w = montar((C) => {
    const f = C.filtros.cerebro.find((x) => x.campo === "Number of Organic Competitors");
    f.min = 4; f.max = 12;
  });
  const html = w.SophiePasos.pantalla(4, V);
  ok(html.includes("ASIN Min: 4"), "no siguió el mínimo");
  ok(html.includes("ASIN Max: 12"), "no siguió el máximo");
});
t("los miles se formatean como los ve el alumno", () => {
  const w = montar();
  ok(w.SophiePasos.pantalla(3, V).includes("4,500"), "debe llevar separador de miles");
});

grupo("Si la fuente falta, falla ruidosamente en vez de inventar");
t("sin SophieCriterios la pantalla lanza, no pinta un número inventado", () => {
  const win = {};
  new Function("window", "document", fuente("sophie-pasos.js"))(win, undefined);
  lanza(() => win.SophiePasos.pantalla(3, V), "debería lanzar sin la fuente");
});
t("un filtro que no existe en la fuente lanza", () => {
  const w = montar((C) => { C.filtros.blackBox = C.filtros.blackBox.filter((f) => f.campo !== "Word Count"); });
  lanza(() => w.SophiePasos.pantalla(3, V), "debería lanzar si falta un filtro que la pantalla usa");
});

grupo("No quedan umbrales escritos a mano");
t("los pasos 3 y 4 no llevan ningún número de filtro literal", () => {
  const src = fuente("sophie-pasos.js");
  const i3 = src.indexOf("\n    3: function"), i5 = src.indexOf("\n    5: function");
  const duros = src.slice(i3, i5).match(/(?:≥|≤|Min|Max|\(mínimo\)|\(máximo\))\s*:?\s*\$?\d[\d.,]*/g) || [];
  ok(duros.length === 0, "reaparecieron umbrales a mano: " + duros.join(" · "));
});

console.log("\nTESTS DE LAS PANTALLAS GUIADAS" + salida.join("\n"));
console.log(`\nRESULTADO: ${pasan} pasan · ${fallan} fallan\n`);
process.exit(fallan ? 1 : 0);
