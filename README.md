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

Dos lugares repiten esos números **escritos a mano** (un build step no los genera):

1. El **prompt del modelo** en `sophie-producto/netlify/edge-functions/chat.js`
   (`SYSTEM_PROMPT_V2 + BLOQUE_V2`), para que Sophie razone con el mismo criterio.
2. Las **pantallas guiadas** del alumno en `sophie-pasos.js` (pasos 3 y 4: los
   filtros de Black Box y Cerebro).

Si cambias un umbral en `sophie-criterios.js` y olvidas actualizar una de esas
copias, el alumno vería un número y el motor usaría otro.

### La guarda: `tools/verificar-metodologia.mjs`

Antes de desplegar un cambio de umbrales, corre:

```bash
node tools/verificar-metodologia.mjs
```

Lee los números canónicos de `sophie-criterios.js` y confirma que las dos copias
en prosa siguen de acuerdo. Sale con código `1` y un reporte claro si algo no
coincide. Requiere que el repo `sophie-producto` esté montado junto a este
(lo busca en `/workspace/sophie-producto` y en `../sophie-producto`); si no lo
encuentra, avisa en vez de dar un falso OK.

**Flujo para cambiar un umbral:** edita `sophie-criterios.js` → actualiza la
prosa en `chat.js` y `sophie-pasos.js` → corre la guarda hasta que dé OK → despliega.

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
node tools/verificar-router.mjs
```

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
