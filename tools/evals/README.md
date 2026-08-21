# Arnés de evaluación — ¿Sophie enseña bien?

Los tests de `tools/` prueban que el **software** es correcto. Esto prueba otra
cosa: que el **modelo acierta el juicio y lo explica bien**. Hasta ahora la suite
solo tenía respuesta para la primera pregunta.

## Las tres capas

| Capa | Qué mide | Cuesta |
|---|---|---|
| **0 · Autoverificación** | Que cada caso del set dorado siga siendo consistente con `sophie-criterios.js` | nada |
| **1 · Determinista** | Marcador, extracción de datos, veredicto y vetos sobre la respuesta del modelo | nada |
| **2 · Juez** (`--juez`) | Calidad pedagógica: explica el porqué, cita el criterio correcto, no inventa datos | tokens |

La capa 0 es la que evita el fallo clásico de los evals: que el set dorado se
quede viejo y midas ruido. Corre el motor sobre los datos **esperados** de cada
caso; si cambias un umbral en `sophie-criterios.js` y algún caso deja de cuadrar,
falla ahí mismo y te dice cuál. **El set dorado no puede desincronizarse de la
fuente única.**

La capa 1 separa dos fallos que se ven iguales pero se arreglan distinto:
**extracción** (Sophie leyó mal un número del pegado del alumno) y **veredicto**
(los números están bien pero el juicio se torció). Un fallo de extracción se
arregla con structured outputs; uno de juicio, con prompt o con modelo.

## Uso

```bash
npm run evals                 # capas 0 y 1, offline, sin tokens
node tools/evals/correr.mjs --vivo          # llama a la API y graba las respuestas
node tools/evals/correr.mjs --vivo --juez   # + rúbrica pedagógica
node tools/evals/correr.mjs --caso nogo-01  # un solo caso
```

**Modo offline (por defecto):** usa las respuestas grabadas en `respuestas/`.
Corre en CI y en el pre-push sin gastar un centavo. Si un caso no tiene respuesta
grabada, se omite sin bloquear (misma convención que las guardas).

**Modo vivo:** necesita `ANTHROPIC_API_KEY`. Llama a la API con el **prompt real**
de `sophie-producto/chat.js` — no una copia — y con el mismo bloque cacheado que
corre en producción, para que el eval mida lo que ve el alumno. Graba cada
respuesta para que la corrida siguiente sea reproducible.

Variables: `SOPHIE_EVAL_MODELO` (el modelo bajo prueba) y `SOPHIE_JUEZ_MODELO`
(el juez, por defecto `claude-opus-5`).

## Comparar dos modelos o dos prompts

Éste es el punto de todo el ejercicio:

```bash
SOPHIE_EVAL_MODELO=claude-sonnet-4-6 node tools/evals/correr.mjs --vivo --guardar-base base-sonnet46.json
SOPHIE_EVAL_MODELO=claude-sonnet-5   node tools/evals/correr.mjs --vivo --base base-sonnet46.json
```

La segunda corrida imprime el delta por dimensión. Eso convierte "creo que
mejoró" en un número.

## El set dorado

`casos.json`. Hoy son **6 casos sintéticos**: cubren cada tramo de la escala
(ESTRELLA, GO CON AJUSTES, RIESGO MODERADO, NO GO), el caso de veto con puntaje
alto, la trampa de tendencia a la baja y la nomenclatura vieja de Helium 10.

**Son sintéticos y eso es una limitación real.** Sirven para probar el arnés y
para atrapar regresiones gruesas, pero no representan cómo escriben los alumnos
de verdad: los datos vienen limpios y ordenados, y un pegado real casi nunca lo
está. Sustituirlos por casos reales es el siguiente paso — el arnés no cambia,
solo `casos.json`.

Para agregar un caso real: copia la estructura de uno existente, pon en `entrada`
lo que pegó el alumno tal cual, y en `esperado` el veredicto que darías tú. Corre
`npm run evals`: la capa 0 te dice de inmediato si tu veredicto esperado es
consistente con la metodología, antes de gastar tokens.

## Por qué el arnés tiene su propio test

`tools/test-evals.mjs` le da al arnés respuestas fabricadas con fallos conocidos
(marcador truncado, número inventado, veto ignorado) y confirma que los detecta.
Un arnés que siempre dice 100% no mide nada. Corre con `npm test`.
