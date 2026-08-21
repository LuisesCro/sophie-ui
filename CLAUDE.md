# CLAUDE.md — Suite Sophie · Crezcamos Online

Este repo (`sophie-ui`) es la **capa compartida** de la suite: los motores JS y los
estilos que los 6 módulos cargan desde `ui.crezcamosonline.com`. Lee esto antes de
tocar nada.

## Los repos de la suite

| Repo | Qué contiene | Ruta en la app |
|---|---|---|
| `sophie-ui` | **este** — motores, criterios, estilos, guardas, tests | (CDN) |
| `sophie-producto` | validación GO/NO GO | `/producto` |
| `sophie-proveedores` | cotización y costo puesto en FBA | `/proveedores` |
| `sophie-listing` | construcción del listado | `/listado` |
| `sophie-ads` | estrategia PPC | `/ppc` |
| `sophie-lanzamiento` | plan de lanzamiento | `/lanzamiento` |
| `sophie-rescate` | diagnóstico de producto estancado | `/rescate` |
| `sophie-optiads` | Optimizador PPC | `/optimizador` |
| `sophie-app` | la app unificada — `netlify.toml` proxea cada ruta al sitio del módulo | raíz |
| `sophie-suite` | funciones de backend (expediente, cuenta, admin) | `/api/*` |

Cada módulo tiene su `netlify/edge-functions/chat.js` (la llamada real a Claude).
Varias guardas de este repo los buscan en `/workspace/<repo>` o `../<repo>`; si no
están montados **se omiten sin bloquear**, así que un OK local no prueba nada sobre
un módulo que no tienes al lado.

## Invariantes — no los rompas

1. **La metodología vive en el código, nunca en el prompt.** Los 13 criterios, sus
   umbrales, vetos y pedagogía están en `sophie-criterios.js`. `sophie-motor.js`
   los **lee**; no los repite. El modelo no puede alterarlos, omitirlos ni
   suavizarlos. Si te piden "que Sophie sea más flexible con X", eso es un cambio
   de umbral en `sophie-criterios.js` — no una instrucción en un prompt.

2. **Cambiar un umbral: el prompt se genera, las pantallas todavía no.**
   `sophie-criterios.js` es la fuente única y ahora también la fuente del
   **texto** de los 13 criterios en el prompt del modelo (campos `prompt` y
   `prompt_extra`). El bloque de `sophie-producto/chat.js` se genera y se
   compara byte a byte:

   ```bash
   npm run criterios:generar     # reescribe el bloque en chat.js
   ```

   La segunda copia en prosa —las pantallas del alumno en `sophie-pasos.js`,
   pasos 3 y 4— **sigue escrita a mano**. Flujo: editar criterios → correr el
   generador → actualizar `sophie-pasos.js` → `npm run guardas` hasta OK.

   La guarda ya no comprueba que el número "aparezca" en el bloque del prompt:
   compara el bloque entero. Una edición parcial —bajar `SV ≥ 4,500` a
   `SV ≥ 3,000` dejando intacto el `❌ si SV < 4,500` de la misma línea— pasaba
   en verde con la comprobación vieja y ahora falla señalando el carácter exacto.

3. **Ningún módulo se abre sobre un producto no validado.** `sophie-puerta.js` es
   la puerta pedagógica (tres estados: permitido / advertencia / bloqueado). No
   agregues atajos que la salten.

4. **El router de modelo tiene un contrato único**, en `tools/verificar-router.mjs`.
   Migrar de modelo = cambiar `MODELOS` ahí + los 6 `chat.js` + correr la guarda
   hasta OK. Dejar un módulo atrás es un fallo, no un detalle.

5. **Las decisiones del alumno se derivan de SU economía**, no de constantes.
   Los umbrales en dólares del optimizador PPC salen del precio y el break-even
   ACOS del estudiante (ver `docs/ppc-mastery.md`). El norte es TACOS y dólares de
   utilidad — nunca ACOS o ROAS solos.

## Cómo llama cada módulo a Claude (verificado, ago-2026)

Todos los `chat.js` comparten esta forma. Antes de "mejorar" algo, confirma que no
está ya resuelto:

- **Prompt caching: SÍ está.** El prompt grande va como bloque `system` con
  `cache_control: { type: "ephemeral", ttl: "1h" }`, y la guía de herramienta se
  anexa **después y sin cache** para no invalidar el prefijo. No lo rompas
  metiendo nada variable (fecha, id de sesión) antes de ese bloque.
- **Tool use: SÍ está.** Hay un bucle agéntico real (`tool_use` → `tool_result`,
  con `MAX_TOOL_ROUNDS`), y tras traer datos reales el router **sube a Sonnet**
  porque el juicio va en el modelo fuerte. Hoy la única herramienta es
  `datos_amazon`, y está **apagada**: `DATOS_AMAZON_ON = false` (solo en producto).
- **Streaming: SÍ.** Se parsean los eventos SSE a mano y se enqueue el texto.
- **`output_config` / `thinking`: NO se usan en ningún módulo.** No hay control de
  `effort` ni thinking adaptativo. Ésa es la palanca sin explotar, no el caching.
- **Structured outputs: NO.** El contrato de salida sigue siendo marcadores en
  prosa (`<!--SOPHIE:{…}-->`) parseados por `sophie-analisis.js`, con toda la capa
  de degradado en `tools/test-parsers.mjs`.
- **No existe ninguna evaluación de la CALIDAD de las respuestas** en ninguno de
  los 10 repos. Los tests prueban que el software es correcto, no que Sophie
  enseñe bien.

## Netlify

Cada repo es un sitio de Netlify que despliega solo al pushear. **Un push a `main`
publica en vivo para los alumnos.** Trabaja en rama.

## Antes de pushear

```bash
npm test          # parsers + intención + cobertura (sin node_modules)
npm run guardas   # metodología + router (omiten repos no montados)
npm run test:all  # + recorrido E2E (requiere: npm install, trae jsdom)
```

Activa el hook una vez por clon: `git config core.hooksPath tools/hooks`.

## Trabajo en curso

`docs/plan-claude-maximo.md` — plan priorizado para aprovechar mejor la API de
Claude (evals de calidad, migración de modelo, structured outputs, caching, datos
en vivo). Si vas a trabajar en cualquiera de esos frentes, empieza por ahí.

## Estilo

- Español en comentarios, nombres de dominio y texto al alumno.
- Los motores son IIFE que cuelgan de `global` (sin bundler, se sirven por CDN).
- Todo lo que toque al alumno degrada con gracia: un JSON roto nunca lanza,
  devuelve `null` y la pantalla no se rompe.
