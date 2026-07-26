# Playbook de consultoría · Sophie × Helium 10 (API en vivo)

Flujo reusable para hacer un **análisis de nicho de consultoría** usando tu
cuenta de Helium 10 (ya conectada dentro de Claude) y los criterios GO/NO GO de
Sophie. Pensado para cuando un cliente te paga por evaluar un producto/nicho.

> **No toca el sitio de estudiantes.** Esto corre en una sesión de Claude, bajo
> demanda. Sophie Producto sigue con el modelo manual + afiliado, intacto.

---

## 1. Cómo se dispara

Abre una sesión de Claude que tenga:

1. El **conector de Helium 10** activo (tu cuenta — cuota 1.000 llamadas/periodo).
2. Este repo `sophie-ui` disponible, para que las fuentes de verdad
   (`sophie-criterios.js`, `sophie-motor.js`) sean las que manden — nunca
   umbrales "de memoria".

Y pega esta orden, cambiando la keyword:

> *"Corre el playbook de consultoría de Sophie para el nicho **‹keyword›**.
> Trae los datos de Helium 10 de mi cuenta, límpialos, evalúa los 13 criterios y
> los 5 vetos de `sophie-criterios.js`, y entrégame el reporte de consultoría."*

Antes de arrancar, Claude debe pedirte los **3 datos del cliente** que la API no
tiene (ver §4): COGS/costo aterrizado, cotización del proveedor (MOQ) y capital
disponible. Si el cliente aún no los tiene, se corre igual y esos criterios
quedan marcados como "pendiente de dato del cliente".

---

## 2. Los datos que se traen de la API

| Paso | Herramienta H10 (MCP) | Para qué |
|---|---|---|
| Descubrir / medir mercado | `search_products` (Black Box / Xray) | precio, revenue, reviews, rating, edad, ventas de los competidores |
| Profundidad de demanda | `get_keywords_by_asin` (Cerebro) | keywords orgánicas del nicho (corrido sobre los 10 competidores, no un ASIN suelto) |
| Volumen y tendencia | `search_amazon_keywords` / `get_keywords_by_keyword` | search volume y curva de tendencia de la keyword |
| (Opcional) calidad listing | `get_listing_score` / `get_listing_details` | apoyo al criterio 6 |

**Costo:** ~2–4 llamadas por análisis. Con 1.000/periodo eso es margen de sobra
para consultoría (cientos de análisis).

---

## 3. La limpieza (obligatoria — es el 80% del valor)

La API cruda engaña. Antes de evaluar:

1. **Dedup por ASIN padre.** Las variaciones de un listing comparten el revenue
   del padre; contarlas varias veces infla los promedios. Una fila por padre.
2. **Centavos → dólares.** La API da el dinero en centavos.
3. **Relevancia de nicho.** Filtra a los productos que de verdad son del nicho
   (idealmente los que **rankean** para la keyword en Cerebro, no solo los que la
   mencionan en el título) — así se saca la contaminación tipo "un frother
   gigante que dice matcha".
4. **Top 10 por revenue.** Es lo que Xray muestra y sobre lo que se promedia.

`xray-auto.js` en esta carpeta implementa los pasos 1, 2 y 4 sobre datos
congelados; úsalo como referencia del cálculo.

---

## 4. Los 13 criterios: qué llena la API y qué pide el cliente

Los umbrales son los de `sophie-criterios.js` (fuente única). El motor
(`sophie-motor.js`) suma los ✅, aplica la escala y los vetos. **No los cambies
de memoria.**

### Fase 1 — validación inicial

| # | Criterio | Umbral | Veto | Fuente del dato |
|---|---|---|:---:|---|
| 1 | Tendencia y volumen de mercado | SV ≥ 4,500 + tendencia estable/alcista | 🚫 | **API** (SV + tendencia) |
| 2 | Ingresos reales del mercado | Average Revenue ≥ $4,500/mes | | **API** (Xray) |
| 3 | Distribución de ingresos | ningún producto > 40% del revenue | | **API** (Xray) |
| 4 | Reseñas y ratio ventas/reseñas | Average Reviews ≤ 300 · ningún top 3 > 500 | | **API** (Xray) |
| 5 | Precio promedio de venta | Average Price ≥ $20 (ideal ≥ $25) | | **API** (Xray) |
| 6 | Calidad de listings de la competencia | 3+ del top 5 con listings débiles | | **Juicio** (observar listings) |

### Fase 2 — validación avanzada

| # | Criterio | Umbral | Veto | Fuente del dato |
|---|---|---|:---:|---|
| 7 | Demanda en profundidad (Cerebro) | ≥ 30 keywords orgánicas tras filtrar | 🚫 | **API** (Cerebro) |
| 8 | Margen antes de PPC y ROI | Margen ≥ 30% antes de PPC · ROI ≥ 100% | 🚫 | **Cliente** (COGS/landed cost) |
| 9 | Intención no satisfecha (COSMO) | ≥ 1 intención clara y resoluble | | **Juicio** (reseñas negativas) |
| 10 | Sourcing y aranceles | MOQ ≤ 300 · costo aterrizado ≤ 30% del precio | 🚫 | **Cliente** (cotización proveedor) |
| 11 | Capital estructurado | alcanza para 150+ unidades + reserva PPC | | **Cliente** (capital disponible) |
| 12 | Resistencia a competencia china | no dominado por genéricos de $8–15 | | **Juicio** |
| 13 | Barreras de entrada | categoría abierta · sin patentes · líderes superables | 🚫 | **Juicio + API** (edad/reviews) + verificar gating |

**Resumen de dependencias:**
- **La API llena sola:** 1, 2, 3, 4, 5, 7 (y aporta señal a 13).
- **Pide dato al cliente:** 8, 10, 11.
- **Pide juicio/observación:** 6, 9, 12, 13.

---

## 5. Veredicto (regla exacta de `sophie-motor.js`)

Se cuentan los ✅ sobre los 13:

| ✅ | Veredicto |
|---|---|
| 12–13 | PRODUCTO ESTRELLA 🌟 |
| 10–11 | GO CON AJUSTES 🟢 |
| 7–9 | RIESGO MODERADO 🟡 |
| 0–6 | NO GO 🔴 |

**Regla de veto (no negociable):** un ❌ en el criterio **1, 7, 8, 10 o 13**
limita el veredicto a **RIESGO MODERADO como máximo**, sin importar cuántos
criterios pasen. Un producto con 11/13 y margen del 15% (veto 8 en rojo) **no es
GO** — es una trampa bien presentada.

---

## 6. Formato del reporte de consultoría

```
NICHO: ‹keyword›                                    Fecha: ‹fecha›
Cliente: ‹nombre›

VEREDICTO: ‹PRODUCTO ESTRELLA / GO CON AJUSTES / RIESGO MODERADO / NO GO›
Puntaje: ‹n›/13   ·   Vetos activos: ‹ninguno / criterio(s) X›

RESUMEN EJECUTIVO (3–4 líneas, lenguaje de negocio, sin jerga)

TABLA DE LOS 13 CRITERIOS
  #  Criterio                     Valor medido      Umbral        ✅/❌
  ...

LO QUE MATA EL NEGOCIO (vetos en rojo, si los hay — explicar el por qué)

RIESGOS Y OPORTUNIDADES (2–3 de cada uno, específicos del nicho)

DATOS PENDIENTES DEL CLIENTE (criterios 8/10/11 si no se entregaron)

RECOMENDACIÓN / SIGUIENTE PASO (accionable)
```

El **cálculo** (umbrales, conteo, vetos) es mecánico y sale de los motores; el
**juicio y la redacción** (resumen, riesgos, recomendación) es donde entra tu
valor de consultor. Ese reparto es el mismo principio de Sophie: *el motor
calcula, el modelo interpreta.*

---

## 7. Nota sobre "fuera de Claude"

Este playbook vive **dentro de una sesión de Claude** porque ahí está el
conector de Helium 10. Montar esto como script o página que corra **sola**
(sin Claude) requeriría credenciales de la API oficial de Helium 10 —
disponibles solo en ciertos planes— más mantenimiento continuo. Para
consultoría bajo demanda no hace falta: la sesión de Claude ya es la
herramienta.
