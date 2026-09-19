#!/usr/bin/env node
/* ============================================================
   TESTS DE COBERTURA SEMÁNTICA — Sophie Listing · Capa 2
   Crezcamos Online · sophie-ui/tools/test-cobertura.mjs

   Fija el contrato del motor que cruza el texto del listing contra los
   clusters de intención elegidos como ángulo. Determinista, sin tokens.

   Uso:  node tools/test-cobertura.mjs   (sale con código 1 si algo falla)
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const win = {};
function cargar(archivo) {
  new Function("window", "document", readFileSync(resolve(raiz, archivo), "utf8"))(win, undefined);
}
cargar("cz-intent-core.js");    // define win.CzIntentCore
cargar("sophie-cobertura.js");  // define win.SophieCobertura
const { SophieCobertura } = win;

let pasan = 0, fallan = 0;
const salida = [];
function t(n, fn) { try { fn(); pasan++; salida.push("  ✓ " + n); } catch (e) { fallan++; salida.push("  ✗ " + n + " — " + e.message); } }
function ok(c, m) { if (!c) throw new Error(m || "esperaba verdadero"); }
function eq(a, b, m) { if (a !== b) throw new Error((m ? m + ": " : "") + "esperaba " + JSON.stringify(b) + " y dio " + JSON.stringify(a)); }
function grupo(x) { salida.push("\n" + x); }
function cl(r, id) { return r.porCluster.filter((c) => c.id === id)[0]; }

const LISTING = {
  titulo: "Matcha Starter Kit for Beginners — Complete Ceremonial Set",
  itemHighlights: "Everything a beginner needs to start",
  vinetas: [
    "Includes a bamboo whisk and ceramic bowl",
    "Non-slip base keeps it steady while you whisk",
    "Perfect for your daily matcha ritual"
  ],
  descripcion: "This traditional Japanese matcha set is designed for beginners who want the full ceremonial experience at home.",
  backend: "gift present regalo matcha green tea"
};

grupo("SophieCobertura.evaluar — cobertura por cluster");
const R = SophieCobertura.evaluar(LISTING, ["audiencia", "ocasion", "problema", "uso"]);
t("evalúa solo los clusters del ángulo elegido", () => { eq(R.total, 4); eq(R.dirigido, true); });
t("Audiencia cubierta en el título (starter/beginners)", () => {
  const a = cl(R, "audiencia"); ok(a.cubierto); ok(a.campos.titulo, "en título");
});
t("Problema cubierto en bullets (bamboo/non-slip)", () => {
  const p = cl(R, "problema"); ok(p.cubierto); ok(p.campos.vinetas, "en bullets");
});
t("Uso cubierto (ceremonial/traditional en título y descripción)", () => {
  ok(cl(R, "uso").cubierto);
});
t("Ocasión NO está en superficie visible, solo en backend → soloBackend", () => {
  const o = cl(R, "ocasion");
  ok(!o.cubierto, "no cubierto en visible");
  ok(o.campos.backend, "sí en backend");
  ok(o.soloBackend, "marcado solo-backend");
});
t("resumen: 3 de 4 cubiertos, Ocasión en faltantes, estado alerta", () => {
  eq(R.cubiertos, 3); eq(R.total, 4);
  ok(R.faltantes.indexOf("ocasion") !== -1);
  eq(R.estado, "alerta");
});

grupo("Casos límite");
t("sin clusters elegidos, evalúa los 6 (diagnóstico general)", () => {
  const r = SophieCobertura.evaluar(LISTING);
  eq(r.total, 6); eq(r.dirigido, false);
});
t("listing vacío ⇒ nada cubierto", () => {
  const r = SophieCobertura.evaluar({}, ["audiencia", "ocasion"]);
  eq(r.cubiertos, 0); eq(r.estado, "nogo");
});
t("todo cubierto ⇒ estado go", () => {
  const r = SophieCobertura.evaluar({ titulo: "gift set for beginners bamboo ceremonial" }, ["ocasion", "audiencia", "problema", "uso"]);
  eq(r.estado, "go"); eq(r.cubiertos, 4);
});

grupo("Render y texto");
t("html() refleja la cobertura y el hueco", () => {
  const h = SophieCobertura.html(R);
  ok(typeof h === "string" && h.indexOf("Cobertura semántica") !== -1);
  ok(h.indexOf("Ocasión") !== -1, "lista el cluster que falta");
});
t("texto() para el modelo trae la cobertura ya calculada", () => {
  const x = SophieCobertura.texto(R);
  ok(x.indexOf("COBERTURA DE INTENCION") !== -1 && x.indexOf("NO los recalcules") !== -1);
});
t("html() devuelve null sin resultado", () => eq(SophieCobertura.html({ ok: false }), null));

console.log(salida.join("\n"));
console.log("\nRESULTADO: " + pasan + " pasan · " + fallan + " fallan");
process.exit(fallan ? 1 : 0);
