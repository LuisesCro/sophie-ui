# Piloto · Sophie × Helium 10

Prototipo que demuestra cómo se vería una integración de Sophie Producto con
Helium 10: tomar una keyword de nicho, traer los datos de Black Box/Xray y
Cerebro, **limpiarlos** y correr los criterios GO/NO GO de Sophie sobre ellos.

Los datos aquí están **congelados** (una consulta real al nicho *matcha whisk*,
julio 2026). No hay ninguna llamada en vivo; sirve para experimentar el flujo y
para tener a la mano la especificación de "puesta en producción".

## Qué hay aquí

| Archivo | Qué es |
|---|---|
| `demo.html` | Demo clickeable, autocontenida. Muestra el pipeline paso a paso: keyword → Xray → limpieza (dedup por padre) → Cerebro → 5 criterios → veredicto. Ábrelo en el navegador o publícalo como Artifact. |
| `xray-auto.js` | El "motor" del piloto en Node. Lee las muestras congeladas, limpia y evalúa. Corre con `node xray-auto.js`. |
| `sample_products.json` | 20 filas crudas de `search_products` (Xray) del nicho matcha whisk. Incluye la contaminación real de Zulay para mostrar por qué la limpieza importa. |
| `sample_cerebro.json` | Resumen de `get_keywords_by_asin` (Cerebro): 1.341 keywords totales, 123 orgánicas, y el top por volumen. |

## Correrlo

```bash
cd piloto-helium10
node xray-auto.js
```

Salida esperada (muestra congelada): **1 de 5** criterios pasa →
veredicto *Nicho difícil · Riesgo alto*. El único que pasa es el criterio 7
(demanda en profundidad, 123 keywords orgánicas ≥ 30).

## La lección del piloto: la limpieza es el 80% del valor

La API cruda devuelve 20 filas, pero **8 son variaciones de un mismo listing de
Zulay** (comparten ASIN padre y su revenue del padre). Sin limpiar, ese frother
gigante contamina todos los promedios. La capa de limpieza:

1. **Deduplica por ASIN padre** (una fila por listing real): 20 → 13.
2. Convierte el dinero de **centavos a dólares** (la API los da en centavos).
3. Ordena por revenue y toma el **top 10**, como haría Xray.

Aun así, el frother de Zulay sobrevive la dedup porque su título dice "matcha" y
"whisk". La versión de producción afinaría la precisión del nicho usando los
productos que **rankean** para la keyword (vía Cerebro), no solo los que la
mencionan en el título.

## Criterios que evalúa el piloto (subconjunto)

Usa los mismos umbrales de `sophie-criterios.js`. El piloto solo corre 5 de los
13; Sophie real suma los 13 y aplica los 5 vetos.

| # | Criterio | Umbral |
|---|---|---|
| 2 | Ingresos reales del mercado | Average Revenue ≥ $4,500/mes |
| 5 | Precio promedio | Average Price ≥ $20 |
| 4 | Reseñas de la competencia | Average Reviews ≤ 300 |
| 3 | Distribución de ingresos | Ningún producto > 40% del revenue |
| 7 | Demanda en profundidad | ≥ 30 keywords orgánicas |

---

## Puesta en producción / uso en consultoría

El piloto usa datos congelados. Para correr un análisis **en vivo** hacen falta
dos cosas, y ya existe una de ellas:

- **Acceso a la API de Helium 10.** Disponible hoy a través del *Helium 10 MCP*
  conectado a las sesiones de Claude (cuota típica 1.000 llamadas/periodo). Con
  eso se pueden llamar `search_products` (Black Box/Xray), `get_keywords_by_asin`
  (Cerebro) y el resto, sin escribir una sola credencial en el sitio web.
- **La capa de limpieza + evaluación**, que es justo lo que este piloto ya
  implementa (`xray-auto.js`).

### Dos caminos, muy distintos

1. **Integración en vivo dentro de Sophie Producto (estudiantes).**
   *No recomendado.* Ata la experiencia del alumno a la cuota y la
   disponibilidad de una API externa; si falla o se agota, Sophie deja de
   funcionar. El modelo actual —el estudiante compra Helium 10 con el usuario de
   afiliado y pega los datos que Sophie le pide— es más robusto y
   pedagógicamente mejor (el alumno aprende a leer los datos, no solo a recibir
   un veredicto).

2. **Herramienta interna de consultoría (para Luis).**
   *Aquí sí tiene todo el sentido.* Volumen bajo (solo tú, en consultas
   puntuales pagadas), valor alto por análisis. Con la conexión H10 ya viva en
   una sesión de Claude, el flujo de consultoría es:

   ```
   keyword del cliente
     → search_products (Xray)  +  get_keywords_by_asin (Cerebro)
     → limpieza (dedup por padre, centavos→dólares, top 10)
     → los 13 criterios + 5 vetos de Sophie (sophie-criterios.js / sophie-motor.js)
     → reporte de consultoría (veredicto + riesgos + siguiente paso)
   ```

   No requiere tocar el sitio web ni exponer credenciales. Es un flujo que se
   corre bajo demanda cuando un cliente paga por el análisis.
