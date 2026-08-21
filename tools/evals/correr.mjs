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
const val = (n, d) => {
  const i = args.indexOf(n);
  if (i < 0) return d;
  const v = args[i + 1];
  // "--vivo --caso" sin valor corría los 6 casos en vivo en vez de avisar.
  if (!v || v.startsWith("--")) { console.error(`\n${n} necesita un valor.\n`); process.exit(1); }
  return v;
};

const VIVO = opt("--vivo");
const JUEZ = opt("--juez");
const SOLO = val("--caso", null);
const BASE = val("--base", null);
const GUARDAR_BASE = val("--guardar-base", null);
const DETALLE = opt("--detalle");

/* ---------- motor: la misma fuente única que ve el alumno ---------- */

const win = {};
function cargar(archivo) {
  new Function("window", "document", readFileSync(resolve(raiz, archivo), "utf8"))(win, undefined);
}
cargar("sophie-criterios.js");
cargar("sophie-motor.js");
cargar("sophie-analisis.js");
const { SophieMotor, SophieAnalisis, SophieCriterios } = win;

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
// Mismo techo que producción (MAX_TOKENS.sonnet en sophie-producto), para que
// el eval sufra el mismo truncamiento que sufriría el alumno.
const MAX_SALIDA = Number(process.env.SOPHIE_EVAL_MAX_TOKENS || 6000);
// Postura de thinking. Importa al comparar modelos: en Sonnet 4.6 omitirlo
// significa SIN thinking; en Sonnet 5 la misma petición corre con adaptativo.
// Comparar 4.6-sin-thinking contra 5-con-thinking cambia dos cosas a la vez y
// no permite saber cuál explica la diferencia.
//   disabled -> {type:"disabled"}   adaptive -> {type:"adaptive"}   (vacío) -> el default del modelo
const THINKING = (process.env.SOPHIE_EVAL_THINKING || "").trim();
const bloqueThinking = THINKING === "disabled" ? { type: "disabled" }
                     : THINKING === "adaptive" ? { type: "adaptive", display: "summarized" }
                     : null;
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
    const t = readFileSync(fixture, "utf8");
    if (!t.trim()) throw new Error("la respuesta grabada está vacía; regenérala con --vivo");
    return { texto: t, origen: "grabada" };
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
      max_tokens: MAX_SALIDA,
      // Mismo prefijo cacheado que en producción: el eval mide lo que ve el alumno.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral", ttl: "1h" } }],
      ...(bloqueThinking ? { thinking: bloqueThinking } : {}),
      messages: [{ role: "user", content: caso.entrada }]
    })
  });
  workspaceVisto = res.headers.get("anthropic-workspace-id") || workspaceVisto;
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const texto = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  // Una respuesta vacía es un fallo, no un caso "sin grabar": guardarla dejaba
  // un fixture inservible que además nunca se regeneraba offline.
  if (!texto.trim()) throw new Error(`respuesta vacía (stop_reason: ${j.stop_reason || "?"})`);
  // Truncar es el riesgo real al migrar a un modelo con thinking adaptativo por
  // defecto y tokenizador nuevo: max_tokens limita thinking + texto juntos, y un
  // marcador cortado a la mitad deja al estudiante sin pantalla de veredicto.
  if (j.stop_reason === "max_tokens") throw new Error(
    `respuesta TRUNCADA (max_tokens ${MAX_SALIDA}). Con thinking activo el techo se comparte ` +
    `entre razonamiento y texto: el marcador puede quedar cortado. Sube SOPHIE_EVAL_MAX_TOKENS.`);
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

  // Extracción: NO se comparan nombres de campo, se compara lo que el MOTOR
  // lee de cada lado. El alumno puede pegar "Monthly Revenue" y Sophie
  // normalizarlo a averageRevenue: eso es correcto, y el motor lo resuelve con
  // su tabla de alias. Comparar claves literales castigaría a Sophie por hacer
  // bien su trabajo. Comparando valor_num por criterio se mide lo que importa:
  // ¿el motor ve el mismo número con los datos de Sophie que con los esperados?
  const dEsp = caso.esperado.datos, dMod = payload.datos || {};
  const juiciosEsp = caso.esperado.juicios || {}, juiciosMod = payload.juicios || {};
  const r = SophieMotor.evaluar(dMod, juiciosMod);   // lo que ve el estudiante

  // Se comparan DOS cosas por criterio, ambas con los juicios esperados fijos
  // para que una diferencia de juicio no se cuele aquí:
  //
  //   valor_num -> el número que el motor lee (resuelve alias por su cuenta).
  //   estado    -> además del número, captura los campos auxiliares que el
  //                motor usa para degradar: tendencia (C1), topReviews (C4),
  //                roi (C8) y moq (C10). Sin esto, leer mal la tendencia daba
  //                verde y el caso trampa no podía fallar.
  //
  // Se compara el EFECTO, no el texto: el estudiante escribe "en caída" y
  // Sophie "bajando", y ambas disparan la misma degradación. Comparar cadenas
  // reprobaría una lectura correcta.
  const idsJuicio = new Set(SophieCriterios.lista.filter((c) => c.direccion === "juicio").map((c) => c.id));
  const rDatosEsp = SophieMotor.evaluar(dEsp, juiciosEsp);
  const rDatosMod = SophieMotor.evaluar(dMod, juiciosEsp);
  const comparables = rDatosEsp.filas.filter((f) => !idsJuicio.has(f.id));

  const difs = comparables
    .map((f) => ({ f, mod: rDatosMod.filas.find((x) => x.id === f.id) }))
    .map(({ f, mod }) => {
      const numMal = Number(mod?.valor_num) !== Number(f.valor_num);
      const estMal = mod?.estado !== f.estado;
      return numMal || estMal
        ? { id: f.id, motivo: numMal ? `${mod?.valor_num ?? "sin dato"}≠${f.valor_num}` : `estado ${mod?.estado}≠${f.estado}` }
        : null;
    })
    .filter(Boolean);

  add("extracción", difs.length === 0,
      difs.length
        ? `${difs.length}/${comparables.length} criterios distintos: ` + difs.map((d) => `C${d.id} ${d.motivo}`).join(", ")
        : `${comparables.length}/${comparables.length} criterios leen lo mismo (número y estado)`);
  // Los criterios 6, 9, 12 y 13 los JUZGA el modelo: el prompt le da una regla
  // en prosa, no un umbral. Calificarlos contra una etiqueta que escribimos
  // nosotros no es un chequeo determinista, es una opinión con bata de
  // laboratorio — y en la primera corrida nos hizo reprobar a Sophie dos veces
  // por juicios que la regla del prompt respaldaba. Así que se separan:
  //
  //   determinista  -> los números y lo que se deriva SOLO de ellos. Pass/fail.
  //   juicio        -> divergencias informativas; quién tiene razón lo evalúa
  //                    la capa 2 (¿está fundado en lo que dijo el estudiante?).
  // Veredicto del CAMINO DE DATOS: los números del modelo con los juicios
  // esperados. Aísla "¿leyó bien y el motor concluye lo correcto?" de
  // "¿juzgó igual que yo?".
  const rDatos = rDatosMod;
  add("veredicto", rDatos.veredicto === caso.esperado.veredicto,
      `${rDatos.veredicto}${rDatos.veredicto === caso.esperado.veredicto ? "" : ` (esperaba ${caso.esperado.veredicto})`}`);

  // Vetos deterministas: los que dispara un número (1, 7, 8, 10). El 13 es de
  // juicio y se reporta abajo, no se califica aquí.
  const soloDet = (v) => v.map((x) => (typeof x === "object" ? x.id : x)).filter((id) => !idsJuicio.has(id)).sort((a, b) => a - b);
  const vetosReales = soloDet(rDatos.vetos);
  const vetosEsp = soloDet(caso.esperado.vetos || []);
  add("vetos", JSON.stringify(vetosReales) === JSON.stringify(vetosEsp),
      `[${vetosReales}]${JSON.stringify(vetosReales) === JSON.stringify(vetosEsp) ? "" : ` (esperaba [${vetosEsp}])`}`);

  // Informativo: los juicios del modelo y el veredicto que ve el estudiante.
  const estadoDe = (j, id) => {
    const v = (j && (j[id] || j["c" + id])) || {};
    return typeof v === "string" ? v : v.estado || "alerta";
  };
  const divergen = [...idsJuicio]
    .map((id) => ({ id, mod: estadoDe(juiciosMod, id), esp: estadoDe(juiciosEsp, id) }))
    .filter((d) => d.mod !== d.esp);

  return { chequeos, payload, resultado: r, divergen, veredictoReal: r.veredicto };
}

/* ---------- corrida ---------- */

async function main() {
  // Se valida antes de correr nada: descubrir que la ruta estaba mal DESPUÉS
  // de una corrida en vivo significa haber pagado por una comparación perdida.
  if (BASE && !existsSync(BASE)) {
    console.error(`\n✗ no encuentro la línea base "${BASE}" — no hay con qué comparar.\n`);
    process.exit(1);
  }
  linea(`\nARNÉS DE EVALUACIÓN · Sophie Producto`);
  linea(`${G}set: ${CASOS.casos.length} casos sintéticos · modo: ${VIVO ? "VIVO (llama a la API)" : "offline (respuestas grabadas)"}${X}`);
  if (VIVO) linea(`${G}modelo: ${process.env.SOPHIE_EVAL_MODELO || "claude-sonnet-4-6"} · max_tokens: ${MAX_SALIDA} · thinking: ${THINKING || "default del modelo"}${X}`);

  autoverificar();

  linea(`\n${G}CAPA 1 · DETERMINISTA — ¿el modelo acierta sobre estos casos?${X}`);
  const informe = [];
  let sinGrabar = 0, fallosJuez = 0, promediosJuez = null;

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

    const { chequeos, payload, divergen, veredictoReal } = evaluarRespuesta(caso, r.texto);
    const todos = chequeos.every((c) => c.ok);
    linea(`  ${marca(todos)} ${caso.id.padEnd(22)} ${G}${caso.arquetipo}${X}`);
    for (const c of chequeos) linea(`      ${marca(c.ok)} ${c.nombre.padEnd(12)} ${G}${c.detalle}${X}`);
    if (divergen?.length) {
      linea(`      ${A}·${X} juicios      ${G}${divergen.map((d) => `C${d.id} ${d.mod} (yo puse ${d.esp})`).join(" · ")}${X}`);
      if (veredictoReal !== caso.esperado.veredicto)
        linea(`        ${G}con SUS juicios el estudiante ve: ${veredictoReal}${X}`);
    }
    if (DETALLE && payload) {
      linea(`      ${G}datos   ${JSON.stringify(payload.datos || {})}${X}`);
      linea(`      ${G}juicios ${JSON.stringify(payload.juicios || {})}${X}`);
    }
    informe.push({ id: caso.id, arquetipo: caso.arquetipo, chequeos, uso: r.uso });
  }

  if (JUEZ) {
    const { correrJuez } = await import("./rubrica.mjs");
    const rj = await correrJuez({ lista, informe, dirRespuestas: DIR_RESP, linea, marca, G, A, X });
    if (rj?.fallos) fallosJuez = rj.fallos;
    promediosJuez = rj?.promedios || null;
  }

  /* ---------- resumen ---------- */

  const conDatos = informe.filter((i) => i.chequeos);
  const total = conDatos.length;
  const dims = ["marcador", "extracción", "veredicto", "vetos"];
  linea(`\n${G}RESUMEN${X}`);
  if (!total) {
    const conError = informe.filter((i) => i.error);
    if (conError.length) {
      linea(`  ${R}Los ${conError.length} caso(s) terminaron en error — no se midió nada.${X}\n`);
      process.exit(1);
    }
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

  // Costo real de la corrida: el modelo bajo prueba Y el juez, que corre en
  // Opus 5 con effort alto y no es despreciable. Antes solo se sumaba el
  // primero y la factura del --juez quedaba invisible.
  const MODELO = process.env.SOPHIE_EVAL_MODELO || "claude-sonnet-4-6";
  const MODELO_JUEZ = process.env.SOPHIE_JUEZ_MODELO || "claude-opus-5";
  const tramos = [
    { etiqueta: `modelo bajo prueba (${MODELO})`, modelo: MODELO, usos: informe.filter((i) => i.uso).map((i) => i.uso) },
    { etiqueta: `juez (${MODELO_JUEZ})`, modelo: MODELO_JUEZ, usos: informe.filter((i) => i.usoJuez).map((i) => i.usoJuez) }
  ].filter((t) => t.usos.length);

  if (tramos.length) {
    linea(`\n${G}COSTO DE ESTA CORRIDA${X}`);
    let granTotal = 0, algunoSinPrecio = false;
    for (const t of tramos) {
      const sum = (k) => t.usos.reduce((a, u) => a + (u[k] || 0), 0);
      const dinero = t.usos.reduce((a, u) => a + (costoDe(t.modelo, u) || 0), 0);
      const conocido = !!PRECIOS[t.modelo];
      if (conocido) granTotal += dinero; else algunoSinPrecio = true;
      linea(`  ${t.etiqueta}  ${G}${t.usos.length} llamada(s)${X}`);
      linea(`    entrada sin cache  ${String(sum("input_tokens")).padStart(8)}   leído de cache ${String(sum("cache_read_input_tokens")).padStart(8)} ${G}(≈10%)${X}`);
      linea(`    escrito a cache    ${String(sum("cache_creation_input_tokens")).padStart(8)}   salida         ${String(sum("output_tokens")).padStart(8)}`);
      linea(conocido ? `    subtotal ≈ $${dinero.toFixed(4)}` : `    ${A}sin precio conocido para ${t.modelo}: solo tokens${X}`);
    }
    linea(`  ${V}TOTAL ≈ $${granTotal.toFixed(4)}${X}` + (algunoSinPrecio ? ` ${A}(incompleto)${X}` : ""));
  }

  if (BASE) {
    const base = JSON.parse(readFileSync(BASE, "utf8"));
    linea(`\n${G}CONTRA LÍNEA BASE (${BASE})${X}`);
    if (base.thinking && base.thinking !== (THINKING || "default"))
      linea(`  ${A}⚠ la base se hizo con thinking=${base.thinking} y esta corrida con ${THINKING || "default"}: son dos experimentos distintos${X}`);
    if (base.modelo && base.modelo !== MODELO)
      linea(`  ${G}${base.modelo}${base.fecha ? " (" + base.fecha.slice(0, 10) + ")" : ""} → ${MODELO}${X}`);
    for (const d of dims) {
      const antes = base.tasas?.[d] ?? 0, ahora = tasas[d], dif = Math.round((ahora - antes) * 100);
      const sig = dif > 0 ? `${V}+${dif}${X}` : dif < 0 ? `${R}${dif}${X}` : `${G}=${X}`;
      linea(`  ${d.padEnd(24)} ${Math.round(antes * 100)}% → ${Math.round(ahora * 100)}%  ${sig}`);
    }
    if (base.juez && promediosJuez) {
      for (const [id, antes] of Object.entries(base.juez)) {
        const ahora = promediosJuez[id];
        if (ahora === undefined) { linea(`  ${A}${id.padEnd(24)} en la base pero no en esta corrida${X}`); continue; }
        const dif = ahora - antes;
        const sig = dif > 0.005 ? `${V}+${dif.toFixed(2)}${X}` : dif < -0.005 ? `${R}${dif.toFixed(2)}${X}` : `${G}=${X}`;
        linea(`  ${id.padEnd(24)} ${antes.toFixed(2)} → ${ahora.toFixed(2)}  ${sig}`);
      }
    } else if (base.juez && !promediosJuez) {
      linea(`  ${A}la base trae notas del juez; corre con --juez para compararlas${X}`);
    }
  }
  if (GUARDAR_BASE) {
    if (JUEZ && !promediosJuez) {
      linea(`\n${R}✗ pediste --juez pero no hay notas: no guardo una base a medias.${X}`);
      process.exit(1);
    }
    writeFileSync(GUARDAR_BASE, JSON.stringify({
      fecha: new Date().toISOString(), modelo: MODELO, thinking: THINKING || "default", maxTokens: MAX_SALIDA, juezModelo: JUEZ ? MODELO_JUEZ : undefined,
      tasas, juez: promediosJuez || undefined, total
    }, null, 2));
    linea(`\n${G}línea base guardada en ${GUARDAR_BASE}${X}`);
  }

  // Un caso que reventó no puede contar como "no hubo nada que medir": antes
  // seis errores duros salían con código 0 y CI lo daba por bueno.
  const conError = informe.filter((i) => i.error);
  if (conError.length) linea(`  ${R}${conError.length} caso(s) terminaron en error${X}`);
  if (fallosJuez) linea(`  ${R}${fallosJuez} caso(s) sin calificar por el juez${X}`);
  const falla = conError.length > 0 || fallosJuez > 0 || conDatos.some((i) => !i.chequeos.every((c) => c.ok));
  linea("");
  process.exit(falla ? 1 : 0);
}

/* Como CLI corre; importado desde un test, solo expone las capas. */
const esCLI = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (esCLI) main().catch((e) => { console.error(`\n${R}${e.stack || e.message}${X}\n`); process.exit(1); });

export { evaluarRespuesta, SophieMotor, CASOS };
