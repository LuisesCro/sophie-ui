/* ============================================================
   CAPA 2 · EL JUEZ — lo que no se puede medir con un número
   Crezcamos Online · sophie-ui/tools/evals/rubrica.mjs

   La capa determinista mide si Sophie ACIERTA. Esto mide si Sophie
   ENSEÑA. Son cosas distintas: un veredicto correcto explicado como
   "no cumple el umbral de 4,500" es correcto y pedagógicamente inútil.

   NOTA DE TÉCNICA — este archivo usa STRUCTURED OUTPUTS (`strict: true`).
   El juez no escribe su calificación en prosa para que luego la parseemos:
   la API valida el JSON contra el esquema de abajo y no deja pasar nada
   fuera de contrato. Es exactamente la técnica propuesta para reemplazar
   los marcadores <!--SOPHIE:{…}--> en producción. Aquí corre en algo sin
   riesgo, para verla trabajar antes de tocar el camino del alumno.
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const MODELO_JUEZ = process.env.SOPHIE_JUEZ_MODELO || "claude-opus-5";

/* ---------- la rúbrica ---------- */

/* ---------- las rúbricas, una por modo ----------

   En los pasos de análisis (6, 8, 9) el prompt le dice a Sophie: "Emites solo
   el marcador de datos", y la pedagogía la redacta la app desde
   sophie-criterios.js (ver sophie-render.js: por_que, leccion, error_comun).
   Calificar ahí "¿explicó el porqué?" mide el artefacto equivocado: castiga a
   Sophie por obedecer. Lo que Sophie SÍ controla en ese modo es el juicio de
   los criterios 6, 9, 12 y 13, y no inventar datos.

   En los turnos propios (MODO 3) Sophie sí escribe la pantalla. Ahí la
   pedagogía es suya y sí se califica.                                        */

const DIM_ANALISIS = [
  { id: "juicio_fundado",
    pregunta: "¿Los criterios de juicio (6, 9, 12, 13) se apoyan en lo que el estudiante realmente observó?",
    guia: "2 = cada juicio se apoya en algo que el estudiante dijo. 1 = alguno queda sin respaldo. 0 = juicios que contradicen lo que el estudiante reportó." },
  { id: "sin_invencion",
    pregunta: "¿Se apegó a los datos que dio el estudiante?",
    guia: "2 = ningún dato inventado. 1 = alguna cifra vaga no aportada. 0 = inventó datos concretos (el fallo más grave: el estudiante decide con números falsos)." },
  { id: "no_se_desborda",
    pregunta: "¿Respetó su modo, sin escribir la pantalla que le toca a la aplicación?",
    guia: "2 = emite el marcador y a lo sumo una línea de transición. 1 = agrega prosa que duplica lo que la app ya pinta. 0 = redacta el veredicto o el scorecard por su cuenta." }
];

const DIM_PROPIO = [
  { id: "explica_por_que",
    pregunta: "¿Explicó POR QUÉ el criterio existe, o solo recitó el umbral?",
    guia: "2 = explica la razón de negocio detrás del criterio. 1 = la menciona de pasada. 0 = solo dice el número o el veredicto." },
  { id: "cita_criterio_correcto",
    pregunta: "¿Nombró el criterio que realmente decide este caso?",
    guia: "2 = nombra el criterio clave y lo conecta con la decisión. 1 = lo menciona sin conectarlo. 0 = no lo menciona o culpa al criterio equivocado." },
  { id: "sin_invencion",
    pregunta: "¿Se apegó a los datos que dio el estudiante?",
    guia: "2 = ningún dato inventado. 1 = alguna cifra vaga no aportada. 0 = inventó datos concretos." },
  { id: "accionable",
    pregunta: "¿El siguiente paso es concreto y ejecutable hoy?",
    guia: "2 = paso específico y accionable. 1 = genérico ('mejora tu margen'). 0 = no hay siguiente paso." },
  { id: "tono",
    pregunta: "¿Cálida y directa, sin condescendencia ni relleno motivacional?",
    guia: "2 = habla como una experta que respeta al estudiante. 1 = correcta pero acartonada. 0 = condescendiente, o puro ánimo sin sustancia." }
];

const RUBRICAS = { analisis: DIM_ANALISIS, propio: DIM_PROPIO };
const dimsDe = (caso) => RUBRICAS[caso.modo || "propio"] || DIM_PROPIO;

const esquemaDe = (DIMS) => ({
  type: "object",
  properties: {
    dimensiones: {
      type: "object",
      properties: Object.fromEntries(DIMS.map((d) => [d.id, {
        type: "object",
        properties: {
          puntaje: { type: "integer", enum: [0, 1, 2] },
          evidencia: { type: "string", description: "Cita textual de la respuesta que justifica el puntaje. Vacío si el puntaje es 0 por ausencia." }
        },
        required: ["puntaje", "evidencia"],
        additionalProperties: false
      }])),
      required: DIMS.map((d) => d.id),
      additionalProperties: false
    },
    fallo_mas_grave: { type: "string", description: "En una frase: lo peor de esta respuesta desde el punto de vista del estudiante. 'ninguno' si no lo hay." }
  },
  required: ["dimensiones", "fallo_mas_grave"],
  additionalProperties: false
});

const SISTEMA = `Eres un evaluador de calidad pedagógica para Crezcamos Online, una academia de Amazon FBA en español.

Vas a calificar UNA respuesta de Sophie, la asistente que valida productos con los alumnos.

Califica SOLO lo que la rúbrica pide. La corrección del veredicto ya se midió con el motor de criterios — no la vuelvas a juzgar y no premies ni castigues el veredicto en sí.

IMPORTANTE — en los pasos de análisis, la aplicación calcula el puntaje, decide el veredicto y redacta la pedagogía de cada criterio. Sophie tiene instrucción explícita de emitir SOLO el marcador de datos. Que la respuesta sea breve y no explique la metodología NO es un defecto: es lo que se le pidió.

Sé estricto. El sesgo natural de un evaluador es dar 2 por defecto; resístelo. Un 2 significa que la respuesta enseña algo que el alumno recordará dentro de un mes. Si dudas entre dos puntajes, da el menor y explica por qué en la evidencia.`;

/* ---------- corrida ---------- */

export async function correrJuez({ lista, informe, dirRespuestas, linea, marca, G, A, X }) {
  const KEY = process.env.ANTHROPIC_API_KEY;
  linea(`\n${G}CAPA 2 · JUEZ (${MODELO_JUEZ}) — ¿enseña, o solo acierta?${X}`);
  if (!KEY) { linea(`  ${G}sin ANTHROPIC_API_KEY: omitido${X}`); return; }

  const base = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const totales = {};
  let fallos = 0;

  for (const caso of lista) {
    const fila = informe.find((i) => i.id === caso.id);
    // En vivo, si la llamada del caso falló, en disco queda la grabación de una
    // corrida anterior — posiblemente de OTRO modelo. Calificarla daría un
    // número que no corresponde a lo que se acaba de medir.
    if (fila?.error) { linea(`  ${A}·${X} ${caso.id.padEnd(22)} ${G}omitido: el caso falló en esta corrida${X}`); continue; }
    const f = resolve(dirRespuestas, `${caso.id}.txt`);
    if (!existsSync(f)) continue;
    const respuesta = readFileSync(f, "utf8");
    const DIMS = dimsDe(caso);
    const clave = (caso.esperado.criterios_clave || []).join(", ");

    const res = await fetch(base + "/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO_JUEZ,
        max_tokens: 16000,   // adaptive thinking + el tool_use no caben en 4k
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },   // juzgar es trabajo de juicio: no lo abaratamos
        system: SISTEMA,
        tools: [{
          name: "calificar",
          description: "Entrega la calificación de la respuesta según la rúbrica.",
          input_schema: esquemaDe(DIMS),
          strict: true            // ← la API valida; el juez no puede salirse del contrato
        }],
        tool_choice: { type: "tool", name: "calificar" },
        messages: [{
          role: "user",
          content: `MODO DEL TURNO: ${caso.modo || "propio"}\n\nRÚBRICA\n${DIMS.map((d) => `- ${d.id}: ${d.pregunta}\n  ${d.guia}`).join("\n")}

CONTEXTO DEL CASO
Arquetipo esperado: ${caso.arquetipo}
Criterio(s) que deciden este caso: ${clave || "(sin especificar)"}

LO QUE PEGÓ EL ALUMNO
${caso.entrada}

LA RESPUESTA DE SOPHIE A CALIFICAR
${respuesta}`
        }]
      })
    });

    if (!res.ok) { linea(`  ${marca(false)} ${caso.id} — API ${res.status}`); fallos++; continue; }
    const j = await res.json();
    if (fila) fila.usoJuez = j.usage;   // el costo del juez también se cobra
    const bloque = (j.content || []).find((b) => b.type === "tool_use");
    if (!bloque) {
      linea(`  ${marca(false)} ${caso.id} — el juez no llamó a la herramienta` +
            (j.stop_reason === "max_tokens" ? ` ${G}(respuesta truncada: sube max_tokens)${X}` : ` ${G}(stop_reason: ${j.stop_reason})${X}`));
      fallos++; continue;
    }

    const cal = bloque.input;
    // Con strict:true la API valida el esquema, pero una respuesta truncada
    // puede dejar el objeto a medias. Antes eso lanzaba y abortaba la corrida
    // entera sin imprimir el resumen.
    const incompleta = DIMS.filter((d) => typeof cal?.dimensiones?.[d.id]?.puntaje !== "number");
    if (incompleta.length) {
      linea(`  ${marca(false)} ${caso.id} — calificación incompleta: falta ${incompleta.map((d) => d.id).join(", ")}`);
      fallos++; continue;
    }
    const suma = DIMS.reduce((a, d) => a + cal.dimensiones[d.id].puntaje, 0);
    const max = DIMS.length * 2;
    DIMS.forEach((d) => { (totales[d.id] ||= []).push(cal.dimensiones[d.id].puntaje); });

    linea(`  ${marca(suma >= max * 0.8)} ${caso.id.padEnd(22)} ${suma}/${max}  ${G}${cal.fallo_mas_grave}${X}`);
    if (fila) fila.juez = cal;
  }

  const ids = Object.keys(totales);
  if (!ids.length) return;
  linea(`\n${G}  promedio por dimensión${X}`);
  for (const id of ids) {
    const v = totales[id];
    const prom = v.reduce((a, b) => a + b, 0) / v.length;
    linea(`    ${id.padEnd(24)} ${prom.toFixed(2)} / 2.00  ${G}(${v.length} caso${v.length > 1 ? "s" : ""})${X}`);
  }
  if (fallos) linea(`  ${A}${fallos} caso(s) sin calificar${X}`);
  // Los promedios vuelven al runner para que entren en la línea base: sin esto
  // una migración de modelo solo podría compararse por el camino de datos.
  const promedios = Object.fromEntries(ids.map((id) => {
    const v = totales[id];
    return [id, v.reduce((a, b) => a + b, 0) / v.length];
  }));
  return { fallos, promedios };
}

export { DIM_ANALISIS, DIM_PROPIO, RUBRICAS, dimsDe, esquemaDe };
