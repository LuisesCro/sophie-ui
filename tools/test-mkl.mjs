#!/usr/bin/env node
/* ============================================================
   TESTS DE LA LISTA MAESTRA EDITABLE — sophie-ui/tools/test-mkl.mjs
   Fija el contrato de sophie-mkl.js. Determinista, sin red.
   Uso:  node tools/test-mkl.mjs   (sale con código 1 si algo falla)
   ============================================================ */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const win = {};
new Function("window", readFileSync(resolve(raiz, "sophie-mkl.js"), "utf8"))(win);
const M = win.SophieMKL;

let pasan = 0, fallan = 0;
const salida = [];
function t(n, fn) { try { fn(); pasan++; salida.push("  ✓ " + n); } catch (e) { fallan++; salida.push("  ✗ " + n + " — " + e.message); } }
function ok(c, m) { if (!c) throw new Error(m || "esperaba verdadero"); }
function eq(a, b, m) { const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) throw new Error((m ? m + ": " : "") + "esperaba " + B + " y dio " + A); }

// Marcador como el que manda el servidor de Sophie Listing.
const marcador = {
  n: 10,
  marcas: ["Buucup", "TANG PIN", "x"],
  f: [
    ["Matcha Set", 189613, 2.4, 6, 9, "P1"],
    ["matcha whisk set", 61081, 2.1, 5, 8, "P1"],
    ["matcha bowl set", 12295, 1.1, 9, 6, "P2"],
    ["buucup matcha whisk set", 250, 0.5, 20, 3, "P3"],
    ["pink matcha set", 3231, 0.9, 30, 4, "P2"],
    ["抹茶碗", 250, 0.4, 4, 3, "P3"],
    ["matcha set", 1, 1, 1, 1, "P3"],       // duplicado (otra mayúscula): se ignora
    ["sin prioridad", 999, 1, 1, 1, "X"],   // prioridad inválida: se ignora
  ],
};

salida.push("\nRelevancia (fórmula DataDive)");
t("3 de 10 = 0,30, el piso de la lista", () => eq(M.relevancia(3, 10), 0.3));
t("19 de 30 = 0,633 (caso real del dive de matcha)", () => eq(M.relevancia(19, 30), 0.633));
t("sin consultados no inventa", () => eq(M.relevancia(3, 0), null));
t("constantes publicadas", () => { eq(M.RELEVANCIA_MIN, 0.3); eq(M.RANK_TOP, 45); });

salida.push("\nConstruir desde el marcador");
const base = M.desdeMarcador(marcador);
t("normaliza, deduplica y descarta prioridades inválidas", () => eq(base.items.length, 6));
t("calcula la relevancia de cada fila", () => eq(base.items[0].relevancia, 0.9));
t("todo lo del servidor es fuente 'nicho'", () => ok(base.items.every((i) => i.fuente === "nicho")));
t("marcas en minúsculas y sin basura de 1 letra", () => eq(base.marcas, ["buucup", "tang pin"]));
t("marcador viejo (solo P1/P2/P3) sigue funcionando", () => {
  const v = M.desdeMarcador({ P1: ["a b"], P2: ["c"], P3: [] });
  eq(v.items.map((i) => [i.keyword, i.prioridad]), [["a b", "P1"], ["c", "P2"]]);
  eq(v.items[0].sv, null);
});
t("marcador vacío → null", () => { eq(M.desdeMarcador({ f: [] }), null); eq(M.desdeMarcador(null), null); });

salida.push("\nExcluir y restaurar");
const sinPink = M.excluir(base, " Pink ");
t("excluir saca la keyword que contiene la palabra", () => ok(!M.vista(sinPink).P2.some((i) => i.keyword === "pink matcha set")));
t("la excluida queda visible con su motivo", () => eq(M.vista(sinPink).excluidas[0], { keyword: "pink matcha set", por: "pink", sv: 3231 }));
t("palabra completa: 'set' no saca 'settle'", () => ok(!M.excluidaPor(M.excluir(base, "sett"), "matcha set")));
t("no muta el original", () => eq(base.exclusiones, []));
t("excluir dos veces no duplica", () => eq(M.excluir(sinPink, "pink").exclusiones, ["pink"]));
t("restaurar la devuelve", () => ok(M.vista(M.restaurar(sinPink, "pink")).P2.some((i) => i.keyword === "pink matcha set")));

salida.push("\nAgregar, quitar, mover");
const conManual = M.agregar(base, "Matcha Gift Box", "P2");
t("agregar entra como manual en la prioridad pedida", () => {
  const it = conManual.items.find((i) => i.keyword === "matcha gift box");
  eq([it.fuente, it.prioridad, it.sv], ["manual", "P2", null]);
});
t("agregar sin prioridad → P3", () => eq(M.agregar(base, "zz").items.at(-1).prioridad, "P3"));
t("agregar una que ya existe solo la mueve", () => {
  const m = M.agregar(base, "matcha bowl set", "P1");
  eq([m.items.length, m.items.find((i) => i.keyword === "matcha bowl set").prioridad], [6, "P1"]);
});
t("quitar una manual la borra", () => eq(M.quitar(conManual, "matcha gift box").items.length, 6));
t("quitar una del nicho la excluye (deshacible)", () => {
  const m = M.quitar(base, "matcha bowl set");
  eq([m.items.length, m.exclusiones], [6, ["matcha bowl set"]]);
});
t("mover cambia la prioridad", () => eq(M.mover(base, "pink matcha set", "P3").items.find((i) => i.keyword === "pink matcha set").prioridad, "P3"));
t("mover a prioridad inválida no hace nada", () => eq(M.mover(base, "pink matcha set", "P9"), base));

salida.push("\nSugerencias");
const sug = M.sugerirExclusiones(base);
t("sugiere la marca del competidor que aparece", () => ok(sug.some((s) => s.termino === "buucup" && s.afecta === 1)));
t("no sugiere marcas que no aparecen", () => ok(!sug.some((s) => s.termino === "tang pin")));
t("sugiere keywords en otro alfabeto", () => ok(sug.some((s) => s.termino === "抹茶碗")));
t("no sugiere español con acentos", () => {
  const m = M.agregar(base, "té matcha orgánico", "P3");
  ok(!M.sugerirExclusiones(m).some((s) => s.termino === "té matcha orgánico"));
});
t("ya excluida → no se vuelve a sugerir", () => ok(!M.sugerirExclusiones(M.excluir(base, "buucup")).some((s) => s.termino === "buucup")));

salida.push("\nVista, expediente y modelo");
t("vista ordena por volumen dentro de cada prioridad", () => eq(M.vista(base).P1.map((i) => i.keyword), ["matcha set", "matcha whisk set"]));
t("vista suma volumen activo", () => eq(M.vista(sinPink).volumen.P2, 12295));
t("expediente conserva el contrato keywordsP1/P2/P3", () => {
  const e = M.aExpediente(M.excluir(conManual, "buucup"));
  eq(e.keywordsP1, ["matcha set", "matcha whisk set"]);
  eq(e.keywordsP2, ["matcha bowl set", "pink matcha set", "matcha gift box"]);
  eq(e.keywordsP3, ["抹茶碗"]);
  eq(e.mklExclusiones, ["buucup"]);
  eq(e.mklManuales, [{ keyword: "matcha gift box", prioridad: "P2" }]);
});
t("expediente respeta topes 20/30/40", () => {
  const f = Array.from({ length: 50 }, (_, i) => ["kw " + i, 1000 - i, 3, 1, 5, "P1"]);
  eq(M.aExpediente(M.desdeMarcador({ n: 10, f })).keywordsP1.length, 20);
});
t("aviso al modelo trae lo excluido, lo agregado y la lista vigente", () => {
  const txt = M.paraElModelo(M.excluir(conManual, "pink"));
  ok(txt.includes("Excluido: pink"));
  ok(txt.includes("matcha gift box (P2)"));
  ok(txt.includes("P2: matcha bowl set, matcha gift box"));
});

console.log(salida.join("\n"));
console.log(`\n${pasan} pasan · ${fallan} fallan`);
process.exit(fallan ? 1 : 0);
