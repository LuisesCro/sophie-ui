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

const DIMENSIONES = [
  { id: "explica_por_que",
    pregunta: "¿Explicó POR QUÉ el criterio existe, o solo recitó el umbral?",
    guia: "2 = explica la razón de negocio detrás del criterio. 1 = la menciona de pasada. 0 = solo dice el número o el veredicto." },
  { id: "cita_criterio_correcto",
    pregunta: "¿Nombró el criterio que realmente decide este caso?",
    guia: "2 = nombra el criterio clave y lo conecta con la decisión. 1 = lo menciona sin conectarlo. 0 = no lo menciona o culpa al criterio equivocado." },
  { id: "sin_invencion",
    pregunta: "¿Se apegó a los datos que dio el alumno?",
    guia: "2 = ningún dato inventado. 1 = alguna cifra vaga no aportada. 0 = inventó datos concretos (el fallo más grave: el alumno decide con números falsos)." },
  { id: "accionable",
    pregunta: "¿El siguiente paso es concreto y ejecutable hoy?",
    guia: "2 = paso específico y accionable. 1 = genérico ('mejora tu margen'). 0 = no hay siguiente paso." },
  { id: "tono",
    pregunta: "¿Cálida y directa, sin condescendencia ni relleno motivacional?",
    guia: "2 = habla como una experta que respeta al alumno. 1 = correcta pero acartonada. 0 = condescendiente, o puro ánimo sin sustancia." }
];

const ESQUEMA = {
  type: "object",
  properties: {
    dimensiones: {
      type: "object",
      properties: Object.fromEntries(DIMENSIONES.map((d) => [d.id, {
        type: "object",
        properties: {
          puntaje: { type: "integer", enum: [0, 1, 2] },
          evidencia: { type: "string", description: "Cita textual de la respuesta que justifica el puntaje. Vacío si el puntaje es 0 por ausencia." }
        },
        required: ["puntaje", "evidencia"],
        additionalProperties: false
      }])),
      required: DIMENSIONES.map((d) => d.id),
      additionalProperties: false
    },
    fallo_mas_grave: { type: "string", description: "En una frase: lo peor de esta respuesta desde el punto de vista del alumno. 'ninguno' si no lo hay." }
  },
  required: ["dimensiones", "fallo_mas_grave"],
  additionalProperties: false
};

const SISTEMA = `Eres un evaluador de calidad pedagógica para Crezcamos Online, una academia de Amazon FBA en español.

Vas a calificar UNA respuesta de Sophie, la asistente que valida productos con los alumnos.

Califica SOLO la calidad de la enseñanza. La corrección del veredicto ya se midió con el motor de criterios — no la vuelvas a juzgar y no premies ni castigues el veredicto en sí.

Sé estricto. El sesgo natural de un evaluador es dar 2 por defecto; resístelo. Un 2 significa que la respuesta enseña algo que el alumno recordará dentro de un mes. Si dudas entre dos puntajes, da el menor y explica por qué en la evidencia.`;

/* ---------- corrida ---------- */

export async function correrJuez({ lista, informe, dirRespuestas, linea, marca, G, X }) {
  const KEY = process.env.ANTHROPIC_API_KEY;
  linea(`\n${G}CAPA 2 · JUEZ (${MODELO_JUEZ}) — ¿enseña, o solo acierta?${X}`);
  if (!KEY) { linea(`  ${G}sin ANTHROPIC_API_KEY: omitido${X}`); return; }

  const base = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const totales = Object.fromEntries(DIMENSIONES.map((d) => [d.id, []]));

  for (const caso of lista) {
    const f = resolve(dirRespuestas, `${caso.id}.txt`);
    if (!existsSync(f)) continue;
    const respuesta = readFileSync(f, "utf8");
    const clave = (caso.esperado.criterios_clave || []).join(", ");

    const res = await fetch(base + "/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO_JUEZ,
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },   // juzgar es trabajo de juicio: no lo abaratamos
        system: SISTEMA,
        tools: [{
          name: "calificar",
          description: "Entrega la calificación de la respuesta según la rúbrica.",
          input_schema: ESQUEMA,
          strict: true            // ← la API valida; el juez no puede salirse del contrato
        }],
        tool_choice: { type: "tool", name: "calificar" },
        messages: [{
          role: "user",
          content: `RÚBRICA\n${DIMENSIONES.map((d) => `- ${d.id}: ${d.pregunta}\n  ${d.guia}`).join("\n")}

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

    if (!res.ok) { linea(`  ✗ ${caso.id} — API ${res.status}`); continue; }
    const j = await res.json();
    const uso = (j.content || []).find((b) => b.type === "tool_use");
    if (!uso) { linea(`  ✗ ${caso.id} — el juez no llamó a la herramienta`); continue; }

    const cal = uso.input;
    const suma = DIMENSIONES.reduce((a, d) => a + cal.dimensiones[d.id].puntaje, 0);
    const max = DIMENSIONES.length * 2;
    DIMENSIONES.forEach((d) => totales[d.id].push(cal.dimensiones[d.id].puntaje));

    linea(`  ${marca(suma >= max * 0.8)} ${caso.id.padEnd(22)} ${suma}/${max}  ${G}${cal.fallo_mas_grave}${X}`);
    const fila = informe.find((i) => i.id === caso.id);
    if (fila) fila.juez = cal;
  }

  const conDatos = DIMENSIONES.filter((d) => totales[d.id].length);
  if (!conDatos.length) return;
  linea(`\n${G}  promedio por dimensión${X}`);
  for (const d of conDatos) {
    const v = totales[d.id];
    const prom = v.reduce((a, b) => a + b, 0) / v.length;
    linea(`    ${d.id.padEnd(24)} ${prom.toFixed(2)} / 2.00`);
  }
}

export { DIMENSIONES, ESQUEMA };
