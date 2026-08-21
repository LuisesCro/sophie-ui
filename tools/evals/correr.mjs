#!/usr/bin/env node
/* ============================================================
   ARNÉS DE EVALUACIÓN — ¿Sophie enseña bien?
   Crezcamos Online · sophie-ui/tools/evals/correr.mjs

   Los tests de tools/ prueban que el SOFTWARE es correcto. Esto prueba
   otra cosa: que el MODELO acierta el juicio. Son preguntas distintas y
   hasta ahora solo teníamos respuesta para la primera.

   TRES CAPAS, de más barata a más cara:

   0) AUTOVERIFICACIÓN — corre el motor sobre los datos ESPERADOS de cada
      caso y confirma que producen el veredicto esperado. No usa el modelo
      ni gasta tokens. Si cambias un umbral en sophie-criterios.js y un caso
      queda obsoleto, esto lo dice aquí, no lo esconde. El set dorado nunca
      puede desincronizarse de la fuente única.

   1) DETERMINISTA — sobre la respuesta del modelo: ¿emitió el marcador?
      ¿extrajo bien los números? ¿el motor sobre SUS datos da el veredicto
      correcto? ¿activó los vetos que debía? Objetivo, sin juez, sin opinión.

   2) JUEZ (opcional, --juez) — lo que no se puede medir con un número:
      ¿explicó el POR QUÉ o solo recitó el umbral? ¿citó el criterio que
      manda? ¿inventó algún dato? Ver rubrica.mjs.

   MODOS:
     sin ANTHROPIC_API_KEY  → offline: usa las respuestas grabadas en
                              respuestas/<id>.txt. Corre en CI y en el
                              pre-push sin gastar un centavo.
     con ANTHROPIC_API_KEY  → vivo: llama a la API con el prompt REAL de
                              sophie-producto (no una copia) y graba la
                              respuesta para que la corrida siguiente sea
                              reproducible offline.

   USO:
     node tools/evals/correr.mjs                # autoverificar + offline
     node tools/evals/correr.mjs --vivo         # llama a la API y graba
     node tools/evals/correr.mjs --vivo --juez  # + rúbrica pedagógica
     node tools/evals/correr.mjs --caso nogo-01 # un solo caso
     node tools/evals/correr.mjs --base linea-base.json   # compara contra baseline
     node tools/evals/correr.mjs --guardar-base linea-base.json
   ============================================================ */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { rutaChatProducto, extraerDeChat, leerSnapshot, sha } from "./sincronizar-prompt.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));

// Clave desde .env en la raíz del repo, si existe. Evita tener que exportarla
// a mano (y que quede en el historial del shell). .env está en .gitignore:
// la clave nunca se sube. Una variable ya exportada tiene prioridad.
(function cargarEnv() {
  try {
    const f = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
    if (!existsSync(f)) return;
    for (const l of readFileSync(f, "utf8").split("\n")) {
      const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
      if (!m) continue;
      const v = m[2].trim().replace(/^["'](.*)["']$/, "$1");
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
})();
const raiz = resolve(aqui, "..", "..");
const args = process.argv.slice(2);
const opt = (n) => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const VIVO = opt("--vivo");
const JUEZ = opt("--juez");
const SOLO = val("--caso", null);
const BASE = val("--base", null);
const GUARDAR_BASE = val("--guardar-base", null);

/* ---------- motor: la misma fuente única que ve el alumno ---------- */

const win = {};
function cargar(archivo) {
  new Function("window", "document", readFileSync(resolve(raiz, archivo), "utf8"))(win, undefined);
}
cargar("sophie-criterios.js");
cargar("sophie-motor.js");
cargar("sophie-analisis.js");
const { SophieMotor, SophieAnalisis } = win;

const CASOS = JSON.parse(readFileSync(resolve(aqui, "casos.json"), "utf8"));
const lista = SOLO ? CASOS.casos.filter((c) => c.id === SOLO) : CASOS.casos;
if (!lista.length) { console.error(`No hay caso con id "${SOLO}".`); process.exit(1); }

/* ---------- precios (USD por millón de tokens, ago-2026) ---------- */

// Solo para reportar el costo de la corrida. Si un modelo no está aquí, se
// informa el consumo en tokens y se omite el dinero, en vez de inventarlo.
const PRECIOS = {
  "claude-opus-5":     { in: 5, out: 25 },
  "claude-sonnet-5":   { in: 2, out: 10 },   // precio de introducción hasta 2026-08-31
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5":  { in: 1, out: 5 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 }
};

// Lectura de cache ≈ 0.1× · escritura de cache ≈ 1.25× (sobre el precio de entrada).
function costoDe(modelo, u) {
  const p = PRECIOS[modelo];
  if (!p || !u) return null;
  return ((u.input_tokens || 0) * p.in
        + (u.cache_read_input_tokens || 0) * p.in * 0.1
        + (u.cache_creation_input_tokens || 0) * p.in * 1.25
        + (u.output_tokens || 0) * p.out) / 1e6;
}

/* ---------- utilidades de reporte ---------- */

const V = "\x1b[32m", R = "\x1b[31m", A = "\x1b[33m", G = "\x1b[90m", X = "\x1b[0m";
const linea = (s = "") => console.log(s);
const marca = (ok) => (ok ? `${V}✓${X}` : `${R}✗${X}`);

/* ---------- capa 0 · autoverificación del set dorado ---------- */

function autoverificar() {
  linea(`\n${G}CAPA 0 · AUTOVERIFICACIÓN — ¿el set dorado sigue de acuerdo con sophie-criterios.js?${X}`);
  let malos = 0;
  for (const c of lista) {
    const r = SophieMotor.evaluar(c.esperado.datos, c.esperado.juicios || {});
    const vOK = r.veredicto === c.esperado.veredicto;
    const vetosReales = r.vetos.map((v) => v.id).sort((a, b) => a - b);
    const vetosEsp = (c.esperado.vetos || []).slice().sort((a, b) => a - b);
    const vetoOK = JSON.stringify(vetosReales) === JSON.stringify(vetosEsp);

    if (vOK && vetoOK) {
      linea(`  ${marca(true)} ${c.id.padEnd(22)} ${r.veredicto} · ${r.aprobados}/${r.total} criterios`);
    } else {
      malos++;
      linea(`  ${marca(false)} ${c.id.padEnd(22)} ${R}el caso ya no cuadra con la metodología${X}`);
      if (!vOK) linea(`      veredicto: esperaba ${c.esperado.veredicto}, el motor da ${r.veredicto} (${r.aprobados}/${r.total})`);
      if (!vetoOK) linea(`      vetos: esperaba [${vetosEsp}], el motor activa [${vetosReales}]`);
    }
  }
  if (malos) {
    linea(`\n${R}El set dorado está desincronizado en ${malos} caso(s).${X}`);
    linea(`Pasa si cambiaste un umbral: actualiza esos casos en casos.json antes de seguir.`);
    linea(`Correr el modelo contra un set inconsistente mide ruido, no calidad.\n`);
    process.exit(1);
  }
  linea(`  ${G}los ${lista.length} casos son consistentes con la fuente única${X}`);

  // De qué prompt vamos a medir. Un eval sobre un prompt viejo mide un
  // Sophie que ya no existe, así que esto se dice siempre, no se asume.
  const v = verificarSnapshot();
  const p = promptProduccion();
  linea(`\n${G}PROMPT BAJO PRUEBA${X}`);
  if (!p) { linea(`  ${R}✗${X} no hay prompt disponible (ni chat.js ni snapshot)`); process.exit(1); }
  if (p.origen === "chat.js real") linea(`  ${V}✓${X} chat.js real de sophie-producto ${G}(${p.texto.length} caracteres)${X}`);
  else linea(`  ${V}✓${X} snapshot del prompt ${G}(${p.texto.length} caracteres · sha ${String(p.sha256).slice(0, 12)}…)${X}`);

  if (v.estado === "desincronizado") {
    linea(`  ${R}✗ el snapshot ya no coincide con chat.js — el prompt cambió.${X}`);
    linea(`     Regenera con: node tools/evals/sincronizar-prompt.mjs`);
    process.exit(1);
  }
  if (v.estado === "al-dia") linea(`  ${V}✓${X} ${G}snapshot verificado contra el chat.js real${X}`);
  if (v.estado === "sin-verificar") linea(`  ${A}·${X} ${G}sin sophie-producto al lado: no se puede verificar que el snapshot esté al día${X}`);
}

/* ---------- obtener la respuesta del modelo ---------- */

const DIR_RESP = resolve(aqui, "respuestas");

// El workspace donde vive la clave de evals. Las claves se scopean a UN
// workspace; si la clave se creó con el Default activo, el gasto no queda
// aislado y el tope mensual no aplica. Vale más avisar que suponerlo.
const WORKSPACE_EVALS = process.env.SOPHIE_EVAL_WORKSPACE || "wrkspc_01GhK92aU5nvf7Z2v79EvqyU";
let workspaceVisto = null;

// El prompt que corre en producción. Preferencia: el chat.js real. Si
// sophie-producto no está montado (laptop sin los 10 repos, CI sin token),
// cae al snapshot generado por sincronizar-prompt.mjs. Nunca a una copia
// escrita a mano. Devuelve también DE DÓNDE salió, para poder decirlo.
function promptProduccion() {
  const ruta = rutaChatProducto();
  if (ruta) {
    const real = extraerDeChat(ruta);
    if (real) return { texto: real, origen: "chat.js real", ruta };
  }
  const snap = leerSnapshot();
  if (snap?.prompt) return { texto: snap.prompt, origen: "snapshot", sha256: snap.sha256 };
  return null;
}

// El snapshot solo vale si sigue igual al original. Donde sophie-producto
// está montado, esto lo comprueba; donde no, avisa que no pudo comprobarse.
function verificarSnapshot() {
  const ruta = rutaChatProducto();
  const snap = leerSnapshot();
  if (!snap) return { estado: "falta" };
  if (!ruta) return { estado: "sin-verificar", sha256: snap.sha256 };
  const real = extraerDeChat(ruta);
  if (!real) return { estado: "ilegible" };
  return sha(real) === snap.sha256
    ? { estado: "al-dia", sha256: snap.sha256 }
    : { estado: "desincronizado", esperado: sha(real), tiene: snap.sha256 };
}

async function respuestaDelModelo(caso) {
  const fixture = resolve(DIR_RESP, `${caso.id}.txt`);
  if (!VIVO) {
    if (!existsSync(fixture)) return { texto: null, origen: "sin-grabar" };
    return { texto: readFileSync(fixture, "utf8"), origen: "grabada" };
  }

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) throw new Error(
    "--vivo necesita ANTHROPIC_API_KEY en el entorno.\n" +
    "         Es la misma variable que usan tus edge functions (chat.js:331).\n" +
    "         Recomendado: una clave aparte, en un workspace con tope de gasto,\n" +
    "         para poder revocarla sin tocar producción. Ver tools/evals/README.md.");
  const p = promptProduccion();
  if (!p) throw new Error(
    "no hay prompt de producción disponible.\n" +
    "         Monta sophie-producto junto a este repo, o genera el snapshot\n" +
    "         con: node tools/evals/sincronizar-prompt.mjs");
  const system = p.texto;

  const res = await fetch((process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.SOPHIE_EVAL_MODELO || "claude-sonnet-4-6",
      max_tokens: 6000,
      // Mismo prefijo cacheado que en producción: el eval mide lo que ve el alumno.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content: caso.entrada }]
    })
  });
  workspaceVisto = res.headers.get("anthropic-workspace-id") || workspaceVisto;
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const texto = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  mkdirSync(DIR_RESP, { recursive: true });
  writeFileSync(fixture, texto);
  return { texto, origen: "vivo", uso: j.usage };
}

/* ---------- capa 1 · determinista ---------- */

function evaluarRespuesta(caso, texto) {
  const chequeos = [];
  const add = (nombre, ok, detalle) => chequeos.push({ nombre, ok, detalle });

  const payload = SophieAnalisis.detectar(texto);
  add("marcador", !!payload,
      payload ? "extraído y parseado" : "no se pudo extraer/parsear el marcador SOPHIE");
  if (!payload) return { chequeos, payload: null };

  // Extracción: cada campo numérico esperado, contra el que emitió el modelo.
  const dEsp = caso.esperado.datos, dMod = payload.datos || {};
  const campos = Object.keys(dEsp).filter((k) => typeof dEsp[k] === "number");
  const malos = campos.filter((k) => Number(dMod[k]) !== Number(dEsp[k]));
  add("extracción", malos.length === 0,
      malos.length ? `${malos.length}/${campos.length} campos mal: ${malos.map((k) => `${k}=${dMod[k]}≠${dEsp[k]}`).join(", ")}`
                   : `${campos.length}/${campos.length} campos correctos`);

  // Veredicto: el motor sobre LOS DATOS DEL MODELO. Así se separa el fallo de
  // extracción del fallo de juicio — dos problemas distintos con arreglos distintos.
  const r = SophieMotor.evaluar(dMod, payload.juicios || {});
  add("veredicto", r.veredicto === caso.esperado.veredicto,
      `${r.veredicto}${r.veredicto === caso.esperado.veredicto ? "" : ` (esperaba ${caso.esperado.veredicto})`}`);

  const vetosReales = r.vetos.map((v) => v.id).sort((a, b) => a - b);
  const vetosEsp = (caso.esperado.vetos || []).slice().sort((a, b) => a - b);
  add("vetos", JSON.stringify(vetosReales) === JSON.stringify(vetosEsp),
      `[${vetosReales}]${JSON.stringify(vetosReales) === JSON.stringify(vetosEsp) ? "" : ` (esperaba [${vetosEsp}])`}`);

  return { chequeos, payload, resultado: r };
}

/* ---------- corrida ---------- */

async function main() {
  linea(`\nARNÉS DE EVALUACIÓN · Sophie Producto`);
  linea(`${G}set: ${CASOS.casos.length} casos sintéticos · modo: ${VIVO ? "VIVO (llama a la API)" : "offline (respuestas grabadas)"}${X}`);

  autoverificar();

  linea(`\n${G}CAPA 1 · DETERMINISTA — ¿el modelo acierta sobre estos casos?${X}`);
  const informe = [];
  let sinGrabar = 0;

  for (const caso of lista) {
    let r;
    try {
      r = await respuestaDelModelo(caso);
    } catch (e) {
      linea(`  ${marca(false)} ${caso.id} — ${R}${e.message}${X}`);
      informe.push({ id: caso.id, error: e.message });
      continue;
    }
    if (!r.texto) {
      sinGrabar++;
      linea(`  ${A}○${X} ${caso.id.padEnd(22)} ${G}sin respuesta grabada — corre con --vivo para generarla${X}`);
      informe.push({ id: caso.id, omitido: true });
      continue;
    }

    const { chequeos } = evaluarRespuesta(caso, r.texto);
    const todos = chequeos.every((c) => c.ok);
    linea(`  ${marca(todos)} ${caso.id.padEnd(22)} ${G}${caso.arquetipo}${X}`);
    for (const c of chequeos) linea(`      ${marca(c.ok)} ${c.nombre.padEnd(12)} ${G}${c.detalle}${X}`);
    informe.push({ id: caso.id, arquetipo: caso.arquetipo, chequeos, uso: r.uso });
  }

  if (JUEZ) {
    const { correrJuez } = await import("./rubrica.mjs");
    await correrJuez({ lista, informe, dirRespuestas: DIR_RESP, linea, marca, G, X });
  }

  /* ---------- resumen ---------- */

  const conDatos = informe.filter((i) => i.chequeos);
  const total = conDatos.length;
  const dims = ["marcador", "extracción", "veredicto", "vetos"];
  linea(`\n${G}RESUMEN${X}`);
  if (!total) {
    linea(`  ${A}Ningún caso tiene respuesta grabada todavía.${X}`);
    linea(`  ${G}El arnés está listo; falta alimentarlo: node tools/evals/correr.mjs --vivo${X}\n`);
    return;
  }
  const tasas = {};
  for (const d of dims) {
    const n = conDatos.filter((i) => i.chequeos.find((c) => c.nombre === d)?.ok).length;
    tasas[d] = n / total;
    const pct = Math.round(tasas[d] * 100);
    const color = pct === 100 ? V : pct >= 80 ? A : R;
    linea(`  ${d.padEnd(12)} ${color}${String(pct).padStart(3)}%${X} ${G}(${n}/${total})${X}`);
  }
  if (sinGrabar) linea(`  ${G}${sinGrabar} caso(s) sin grabar, no cuentan${X}`);

  if (workspaceVisto) {
    const ok = workspaceVisto === WORKSPACE_EVALS;
    linea(`\n${G}WORKSPACE${X}`);
    linea(ok
      ? `  ${V}✓${X} la clave resuelve a ${workspaceVisto} ${G}(el de evals: gasto aislado y con tope)${X}`
      : `  ${A}⚠${X}  la clave resuelve a ${A}${workspaceVisto}${X}, no al de evals (${WORKSPACE_EVALS}).\n` +
        `      Se creó con otro workspace activo: el gasto NO está aislado y el tope no aplica.\n` +
        `      Recrea la clave con "Sophie Evals" seleccionado, o ajusta SOPHIE_EVAL_WORKSPACE.`);
  }

  // Costo real de la corrida. El eval mide calidad; esto mide lo que cuesta
  // medirla, para que la decisión de correrlo seguido sea informada.
  const usos = informe.filter((i) => i.uso);
  if (usos.length) {
    const modelo = process.env.SOPHIE_EVAL_MODELO || "claude-sonnet-4-6";
    const sum = (k) => usos.reduce((a, i) => a + (i.uso[k] || 0), 0);
    const dinero = usos.reduce((a, i) => a + (costoDe(modelo, i.uso) || 0), 0);
    linea(`\n${G}COSTO DE ESTA CORRIDA (${modelo})${X}`);
    linea(`  entrada sin cache  ${String(sum("input_tokens")).padStart(8)} tokens`);
    linea(`  leído de cache     ${String(sum("cache_read_input_tokens")).padStart(8)} tokens ${G}(≈10% del precio)${X}`);
    linea(`  escrito a cache    ${String(sum("cache_creation_input_tokens")).padStart(8)} tokens`);
    linea(`  salida             ${String(sum("output_tokens")).padStart(8)} tokens`);
    linea(PRECIOS[modelo]
      ? `  ${V}total ≈ $${dinero.toFixed(4)}${X} ${G}· $${(dinero / usos.length).toFixed(4)} por caso${X}`
      : `  ${A}sin precio conocido para ${modelo}: solo tokens${X}`);
  }

  if (BASE && existsSync(BASE)) {
    const base = JSON.parse(readFileSync(BASE, "utf8"));
    linea(`\n${G}CONTRA LÍNEA BASE (${BASE})${X}`);
    for (const d of dims) {
      const antes = base.tasas?.[d] ?? 0, ahora = tasas[d], dif = Math.round((ahora - antes) * 100);
      const sig = dif > 0 ? `${V}+${dif}${X}` : dif < 0 ? `${R}${dif}${X}` : `${G}=${X}`;
      linea(`  ${d.padEnd(12)} ${Math.round(antes * 100)}% → ${Math.round(ahora * 100)}%  ${sig}`);
    }
  }
  if (GUARDAR_BASE) {
    writeFileSync(GUARDAR_BASE, JSON.stringify({ fecha: null, modelo: process.env.SOPHIE_EVAL_MODELO || "claude-sonnet-4-6", tasas, total }, null, 2));
    linea(`\n${G}línea base guardada en ${GUARDAR_BASE}${X}`);
  }

  const falla = conDatos.some((i) => !i.chequeos.every((c) => c.ok));
  linea("");
  process.exit(falla ? 1 : 0);
}

/* Como CLI corre; importado desde un test, solo expone las capas. */
const esCLI = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (esCLI) main().catch((e) => { console.error(`\n${R}${e.stack || e.message}${X}\n`); process.exit(1); });

export { evaluarRespuesta, SophieMotor, CASOS };
