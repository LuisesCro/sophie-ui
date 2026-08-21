# Migración a Sonnet 5 — medida y descartada (ago-2026)

Resultado corto: **no migrar**. Este documento existe para que nadie repita el
experimento a ciegas ni lo intente de nuevo sin saber qué encontrar.

## El dato

Tres corridas del arnés (`tools/evals/`) sobre los mismos 6 casos y el mismo
prompt de producción (sha `bb78b6bbf2ec`), con `max_tokens: 6000` como en
`sophie-producto`:

| | Sonnet 4.6 (hoy) | Sonnet 5, thinking por defecto | Sonnet 5, thinking disabled |
|---|---|---|---|
| marcador | **100%** | 20% | 50% |
| extracción | **100%** | 0% | 50% |
| veredicto | **100%** | 0% | 50% |
| vetos | **100%** | 20% | 50% |
| `no_se_desborda` | **2.00** | 0.00 | 1.17 |
| `sin_invencion` | 1.17 | 1.20 | **1.50** |
| `juicio_fundado` | **1.50** | 0.80 | 1.33 |
| costo de la corrida | $0.1377 | $0.2328 | $0.1124 |
| tokens de salida | 4,714 | 17,683 | 5,271 |

## Qué significa cada columna

**Thinking por defecto (la trampa).** En Sonnet 4.6 omitir `thinking` significa
*sin* thinking; en Sonnet 5 la misma petición corre con **adaptativo**. Ninguno de
los 6 `chat.js` configura `thinking`, así que la migración lo habría activado sin
que nadie lo decidiera. `max_tokens` limita razonamiento y texto **juntos**: la
salida se cuadruplicó, un caso se truncó a media respuesta y el resto perdió el
marcador. Para el alumno eso es **la pantalla de veredicto en blanco**, sin error
ni log: `sophie-analisis.js` devuelve `null` con gracia.

**Thinking disabled (el experimento limpio).** Elimina el truncamiento y sale
más barato que hoy. Pero **la mitad del daño persiste**: 3 de 6 casos siguen sin
emitir el marcador. Sonnet 5 lee el prompt más literalmente y **se detiene a
pedir datos** en vez de concluir, incluso con los criterios decisivos ya
alimentados. No es un problema de configuración: es divergencia de comportamiento
frente a un prompt de 34K afinado para 4.6.

## El argumento económico, que era al revés

Sonnet 5 usa un tokenizador nuevo: ~30% más tokens para el mismo texto, y el
precio es por token. Con la promoción ($2/$10 hasta el 31-ago-2026) sale ~18% más
barato que hoy; **desde el 1 de septiembre, a $3/$15, sale ~22% más caro**. La
promoción dura días; el tokenizador es permanente.

## Lo único que Sonnet 5 hizo mejor

`sin_invencion` sube de 1.17 a 1.50: inventa menos datos que 4.6. Es una mejora
real, pero no compensa perder la mitad de los veredictos.

## Si alguien lo vuelve a intentar

1. La migración **no es cambiar un string**. Exige, como mínimo, fijar
   `thinking: {type:"disabled"}` explícito en los 6 módulos y re-afinar el prompt
   para que el contrato de MODO 2 se respete.
2. Iterar contra el arnés, no a ojo: `SOPHIE_EVAL_THINKING=disabled
   SOPHIE_EVAL_MODELO=claude-sonnet-5 npm run evals:vivo -- --base base-sonnet46.json`.
   Cada vuelta cuesta ~$0.30.
3. El umbral para migrar es **marcador y veredicto al 100%**. Por debajo de eso,
   una fracción de los alumnos se queda sin su pantalla de veredicto.
4. Y aun al 100%, sigue costando más que 4.6 fuera de promoción: el argumento
   tendría que ser calidad demostrada, nunca precio.

## Nota independiente del modelo

`sin_invencion` es 1.17 en el Sonnet 4.6 que corre hoy en producción. El juez
señaló, entre otros, que se rellena `"tendencia": "estable"` sin que el
estudiante haya reportado tendencia. Eso mete un dato no aportado en el cálculo
del criterio 1, que es de veto. Vale revisarlo aparte de cualquier migración.
