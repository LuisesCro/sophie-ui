# sophie-ui

Motores JS y estilos compartidos de la suite Sophie (Crezcamos Online), servidos
desde `ui.crezcamosonline.com`. Cada módulo (Producto, Listing, Ads, Rescate,
Lanzamiento, Proveedores) los carga con `<script src="https://ui.crezcamosonline.com/…">`.

## Fuente única de la metodología

Los umbrales, la pedagogía y los vetos del currículum **GO / NO GO** viven en un
solo lugar: **`sophie-criterios.js`**. El modelo no puede alterarlos.

- **`sophie-criterios.js`** — la fuente única: los 13 criterios (umbral, alerta,
  veto), la escala de veredictos y los filtros de Black Box / Cerebro.
- **`sophie-motor.js`** — calcula puntaje, vetos y veredicto **leyendo** de
  `sophie-criterios.js`. Por eso el score que ve el alumno nunca se desincroniza.

### El riesgo: copias en prosa

**Tres** lugares repiten esos números **escritos a mano** (un build step no los
genera):

1. El **prompt del modelo** en `sophie-producto/netlify/edge-functions/chat.js`
   (`SYSTEM_PROMPT_V2 + BLOQUE_V2`), para que Sophie razone con el mismo criterio.
2. Las **pantallas guiadas** del alumno en `sophie-pasos.js` (pasos 3 y 4: los
   filtros de Black Box y Cerebro).
3. Los **prompts del cockpit privado** en `sophie-creador/lib/sophie-system.js`:
   siete módulos que citan a mano los umbrales de seis motores distintos
   (criterios, keywords, cotizaciones, PPC, lanzamiento y rescate).

Si cambias un umbral y olvidas actualizar una de esas copias, el alumno vería un
número y el motor usaría otro.

### Las guardas

```bash
npm run guardas          # lenient: omite los repos hermanos que no tengas
npm run guardas:strict   # exige que TODOS estén montados
```

Corre las tres de una vez (y las corre todas aunque una falle, para que veas de
un golpe todas las copias que quedaron atrás):

| Guarda | Qué compara |
| --- | --- |
| `tools/verificar-metodologia.mjs` | `sophie-criterios.js` ↔ prompt de Producto y `sophie-pasos.js` |
| `tools/verificar-router.mjs` | contrato del router ↔ los 6 `chat.js` |
| `tools/verificar-creador.mjs` | los motores ↔ los 7 prompts de `sophie-creador` |

Las tres buscan los repos hermanos en `/workspace/<repo>` y en `../<repo>`.

**Lenient, PARCIAL y `--strict`.** Si un repo hermano no está montado, esa
comprobación se **omite** — para que un checkout parcial no te bloquee el push.
Pero omitir no es aprobar: el cierre distingue tres estados.

- `OK` — se verificó todo y todo coincide.
- `PARCIAL` — nada falló, pero quedaron comprobaciones sin hacer. Sale con
  código 0 y dice exactamente cuántas y qué NO confirma.
- falla — hay drift, o corriste con `--strict` y quedó algo sin verificar.

`--strict` es el modo del flujo "voy a mover un umbral": ahí omitir la mitad de
las copias es justo el error que estas guardas existen para atrapar.

**El hook lo elige solo.** `tools/hooks/pre-push` corre lenient en un push
normal, y sube a `--strict` automáticamente cuando el push toca una fuente de
umbrales (`sophie-criterios.js`, `sophie-keywords.js`, `sophie-ppc.js`,
`sophie-lanzamiento.js`, `sophie-rescate.js`, `sophie-cotizaciones.js`).
Actívalo una vez con `git config core.hooksPath tools/hooks`.

**Flujo para cambiar un umbral:** monta los repos hermanos → edita el motor →
actualiza las tres copias en prosa → `npm run guardas:strict` hasta OK →
despliega.

## Contrato del router de modelo

Los 6 chat.js son edge functions que se despliegan por separado, así que **no**
comparten un import en tiempo de ejecución (acoplar los 6 builds a un módulo
remoto agrega un punto de falla y no se puede probar el bundle fuera de Netlify).
En su lugar, **`tools/verificar-router.mjs`** define un solo contrato del router
y confirma que los 6 lo cumplen:

- solo se usan los IDs de modelo oficiales (`claude-sonnet-4-6`, `claude-haiku-4-5-…`);
- cada módulo mantiene su regla de blindaje (default Sonnet, o Sonnet fijo en Ads,
  o la red server-side de veredicto en Rescate);
- la red `isDataHeavy` conserva sus umbrales oficiales.

```bash
node tools/verificar-router.mjs --strict
```

(`--strict` porque una migración a medias es justo lo que esta guarda existe
para atrapar: sin él, un módulo que no tengas clonado se omite y no lo verías.)

Si migras a un modelo nuevo (p.ej. `claude-sonnet-5`): cambia `MODELOS` en la
guarda, cámbialo en los 6 chat.js y corre la guarda hasta OK. Si dejas un módulo
atrás, falla y te dice cuál — en vez de que corra callado con el modelo viejo.

## Tests de parsers

Los parsers convierten los marcadores del modelo (`<!--SOPHIE:{…}-->`, etc.) en
pantallas y puntaje. `tools/test-parsers.mjs` fija su contrato: extracción del
marcador, degradado con gracia ante JSON roto o truncado, y el pipeline completo
`marcador → detectar → SophieMotor.evaluar → veredicto` (incluidos vetos y alias
de campos de Helium 10).

```bash
node tools/test-parsers.mjs
```

## Recorrido E2E — el camino de un producto por las Sophies

`tools/recorrido-e2e.mjs` toma **productos sintéticos** (ESTRELLA, MARGINAL,
DESCARTAR) y los pasa por el camino completo de la suite, afirmando tres cosas
que ningún test aislado cubre:

1. **Veredicto por módulo** — cada Sophie (Producto, Listing, Proveedores,
   Lanzamiento, Ads/PPC, Rescate) devuelve el veredicto correcto para cada
   producto.
2. **Coherencia entre módulos** — la salida de un módulo encaja con la entrada
   del siguiente: la costura `Producto → expediente → Puerta → resto` (un NO GO
   cierra la puerta a comprar inventario), el candado de tracción y el contrato
   de congelado de Rescate.
3. **Render sin romperse** — cada pantalla se pinta en un DOM real (jsdom) sin
   lanzar y deja contenido.

A diferencia de las guardas y los tests de parsers, este bot necesita `jsdom`,
así que corre **a mano** (no en el pre-push, que debe funcionar en un checkout
sin `node_modules`):

```bash
npm install        # una vez, trae jsdom (devDependency)
npm run test:e2e   # corre el recorrido
```

Para un **reporte visual** (útil si no estás en la terminal), genera un HTML
con el resultado de la última corrida:

```bash
npm run test:e2e:html   # escribe recorrido-e2e-reporte.html (ignorado por git)
```

Cubre cuatro arquetipos (ESTRELLA, MARGINAL, MEDIO, DESCARTAR) y, entre otros,
el **viaje de ciclo de vida** (un producto que entra GO y meses después cae a
Rescate), el **candado de calidad transversal** (Lanzamiento y Rescate congelan
igual ante un problema de calidad) y los veredictos **PIVOTAR/CONGELAR** de
Rescate.

También ejercita el **gate "¿pujas o listing?" del Optimizador**, que vive en el
repo hermano `sophie-optiads`: si ese repo está montado al lado
(`/workspace/sophie-optiads`, `../sophie-optiads`), el bot carga su `index.html`
real en jsdom y prueba el gate por unidad y por el flujo completo `analizar()`;
si no está montado, esa sección **se omite sin bloquear** (misma convención que
las guardas del router).

## Hook de pre-push (recomendado)

En vez de un GitHub Action (que necesitaría clonar los 6 repos con un token), la
verificación se corre localmente antes de cada push. Actívalo en tu clon **una
sola vez**:

```bash
git config core.hooksPath tools/hooks
```

A partir de ahí, cada `git push` corre las dos guardas y los tests de parsers, y
**aborta el push** si algo falla. Los repos de módulos que no tengas montados
localmente se omiten (no bloquean); para exigir todos, corre las guardas con
`--strict` (útil si algún día se lleva a CI).

**Cobertura:** el hook está instalado en `sophie-ui` **y en los 6 repos de
módulos**. El de cada módulo localiza `sophie-ui` como repo hermano y corre las
mismas guardas + tests desde allí, validando el cambio del módulo contra la
fuente única antes de pushear. Así, edites donde edites (la metodología en
`sophie-ui` o un prompt en un módulo), la verificación corre en ese push.

En cada clon nuevo hay que activarlo una vez con
`git config core.hooksPath tools/hooks` (en `sophie-ui` y en cada módulo). Si un
módulo no encuentra `sophie-ui` cerca (`../sophie-ui`, `/workspace/sophie-ui`,
`/home/user/sophie-ui`, `$HOME/sophie-ui`) o falta `node`, el hook se omite sin
bloquear el push.
