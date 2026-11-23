# sophie-ui · motor compartido de la Suite de Sophie

## Qué es y quién lo consume
- JS/CSS sin build que Netlify publica desde `main` en `https://ui.crezcamosonline.com/<archivo>`. Cada módulo los carga con `<script src>` / `<link>` a esa URL **fija** (ninguno tiene una URL base que se pueda cambiar).
- Sin versionado: no hay `?v=` y el CDN responde `cache-control: max-age=0, must-revalidate`. **Un push a `main` llega a todos los módulos en vivo en 1–2 min.** No se puede dejar un módulo con la versión vieja.
- Qué carga cada módulo (rama `origin/main`, revisado el 23 nov 2026):
  - **Sophie-producto**: criterios, motor, analisis, pasos, guia, candidatos, intencion, render, fees, cz-mercado, cz-intent-core, suite-nav + ui.css/oscuro.css.
  - **Sophie-listing**: listing, keywords, cobertura, puerta, render, cz-mercado, cz-intent-core, suite-nav + css.
  - **Sophie-ads**: ppc, fees, cz-mercado, cz-intent-core, suite-nav, xlsx.mini.min.js. **Sophie-optiAds**: ppc, suite-nav.
  - **Sophie-Proveedores**: proveedores, cotizaciones, fees, puerta, render, suite-nav + css.
  - **Sophie-Lanzamiento**: lanzamiento, fees, cz-mercado, suite-nav. **Sophie-Rescate**: rescate, suite-nav.
  - **sophie-imagenes**: imagenes, imagenes-gen, puerta, render, suite-nav + css.
  - **sophie-app**: fees, ppc. **sophie-creador**: casi todos los motores. **Sophie-kdp**: ninguno.
  - Sin consumidor en `main` (solo en ramas de módulos o huérfanos): ficha, filtros, hallazgos, mapa, mkl, creditos*, creative-*, image-*, visual-*, imagenes-context/theme/research*, imagen-proveedor.
- `sophie-suite-nav.js` y `sophie-fees.js` los cargan casi todos: son los de mayor alcance.

## Comandos (verificados el 23 nov 2026, todo en verde)
- `npm test`: parsers (71), intención (50), cobertura (12) y listing-mahjong (13). No necesita `node_modules`.
- `npm run guardas`: `verificar-metodologia.mjs` (los umbrales de `sophie-criterios.js` frente a la prosa de `Sophie-producto/.../chat.js` y de `sophie-pasos.js`) y `verificar-router.mjs` (los IDs de modelo y la regla de cada uno de los 6 `chat.js`). Leen los repos hermanos en `../`. Añade `--strict` para que un repo que falte cuente como fallo.
- `npm run test:e2e`: recorrido jsdom con 59 pruebas. Necesita `npm install` y prueba el gate de `../Sophie-optiAds` si está.
- Fuera de `npm test`: `node tools/test-mkl.mjs`, `test-creative-brief`, `test-creative-generator`, `test-image-strategy`, `test-visual-qa` y `test-visual-stack`.
- Pruebas de los módulos contra este motor local: `SOPHIE_UI=$PWD node ../Sophie-ads/tools/test-ads.mjs` y `../Sophie-optiAds/tools/test-optimizador.mjs`.
- Hook de pre-push: `tools/hooks/pre-push` corre las 2 guardas más parsers, intención y cobertura. **En este clon no está activo** (`core.hooksPath` vacío). Para activarlo, una sola vez: `git config core.hooksPath tools/hooks`.
- Publicar (COMO-PUBLICAR.md): commit y push a `main`; Netlify publica solo (Auto publishing). Si no se actualiza, revisa en Netlify: Deploys → Auto publishing.
- `~/.claude/scripts/guard-netlify.sh` **no aplica aquí** porque no hay `netlify/edge-functions/`. Sí se corre en los módulos consumidores antes de su push.
- Rollback: `git revert <commit>` y push a `main` (también pide OK). Alternativa en Netlify: Deploys → un deploy anterior → "Publish deploy". Es para todos los módulos a la vez.

## Reglas
- **Antes de tocar: `git fetch` y compara con `origin/main`.** Los clones de ~/Documents/GitHub se quedan atrás: el 21 sep este iba ~90 commits por detrás. Haz fetch también de los módulos, porque las guardas leen sus copias locales: al 23 nov, Listing iba 4 por detrás y Proveedores 9.
- Un cambio aquí afecta a **todos los módulos en vivo**:
  - Corre `npm test`, `npm run guardas` y `npm run test:e2e` antes de publicar.
  - Al reportar, di **qué módulos cargan el archivo tocado** (ver la lista de arriba).
  - Trabaja en rama/PR draft. El Deploy Preview de sophie-ui no lo carga ningún módulo, así que la prueba real es con jsdom o un harness por HTTP.
- **Publicar a producción (push a `main`) solo con OK explícito de Luis o Paula.** No hagas commit ni push sin que lo pidan.
- **Los números marco de `sophie-criterios.js` son de Luis**: 13 criterios, vetos en C1/C7/C8/C10/C13, escala ≥12 Estrella / ≥10 Go / ≥7 Riesgo / <7 No-Go, reserva PPC 40 %. No los cambies sin él.
  - Las definiciones de cada casilla las infirió Claude: aclara eso antes de defenderlas.
  - Para cambiar un umbral: edita `criterios` → actualiza la prosa en `chat.js` de Producto y en `sophie-pasos.js` → corre `guardas` hasta OK.
- Los cálculos van en el motor, no en el prompt: el modelo obedece mal la aritmética y las guías "blandas". Los motores son deterministas a propósito.
- Copy para el alumno: "datos de mercado", **nunca "Helium 10" ni "DataDive"**. Ojo: `sophie-pasos.js` (pasos 1-5) todavía nombra Helium 10, Black Box y Xray. Es deuda conocida; no la amplíes.
- Nunca imprimas ni copies secretos (claves de Anthropic, `JUNGLE_SECRET`, etc.). Aquí no hay `.env`; viven en Netlify y en los módulos.
- Respuestas a Luis: cortas, en tablas, y separando "verificado" de "desplegado sin probar".

## Mapa de archivos
- Metodología GO/NO-GO: `sophie-criterios.js` (fuente única, v2.2) → `sophie-motor.js` (puntaje, vetos, veredicto) → `sophie-render.js` (scorecard). Puente con el modelo: `sophie-analisis.js` (pasos 6, 8 y 9), `sophie-guia.js` + `sophie-pasos.js` (pasos 1–5 y 7), `sophie-candidatos.js`. Capa 2: `sophie-intencion.js` + `cz-intent-core.js`.
- Transversales: `sophie-fees.js` (fuente única de referral y FBA), `cz-mercado.js` (marketplace o país), `sophie-puerta.js` (no abre un módulo sin validación), `sophie-suite-nav.js` ("Volver a Sophie" y progreso).
- Por módulo:
  - Listing: `sophie-keywords.js` + `sophie-listing.js` + `sophie-cobertura.js`.
  - PPC: `sophie-ppc.js` v2.0 (economía, `leerReporte`, `clasificar` con 12 clics, G1–G5, Wilson Z=1,28).
  - Proveedores: `sophie-cotizaciones.js` + `sophie-proveedores.js`.
  - Lanzamiento: `sophie-lanzamiento.js`. Rescate: `sophie-rescate.js`. Imágenes: `sophie-imagenes*.js`.
- Estilos: `sophie-ui.css`, `sophie-oscuro.css` y `sophie-claro.css`.
- Otros: `docs/ppc-mastery.md` (fuente de verdad de PPC). `tools/` (pruebas y guardas). `piloto-helium10/`, `index.html`, `auditor-titulos.html` y `comparar.html` también se publican en el CDN, así que son públicos.

## Trampas verificadas
- `cz-tabbar.js` **no vive aquí**: está en `sophie-app`, aunque su comentario diga `ui.crezcamosonline.com/cz-tabbar.js`, y esa URL da 404.
- `sophie-ui-fix` y `sophie-ui-mkl` (en ~/Documents/GitHub) son **worktrees de este repo** (ramas `fix/listing-fallos-11nov` y `mkl-editable`), no clones aparte. Hay además una rama `backup-local-*` y un stash "README stale pre-sync". No los borres.
- `npm test` no incluye `test-mkl` ni las pruebas de imágenes y creativos. Córrelas a mano si tocas esos archivos.
- `sophie-creador` tiene su propia copia vieja de la calculadora de Ads (−20 % fijo, meta 30 %, sin devoluciones). Arreglar `sophie-ppc.js` no la corrige.
- Las guardas **omiten sin fallar** un repo hermano que no encuentran. Un "OK" sin `--strict` puede ser parcial: lee las líneas ⚠.

- **Documentos `.md` privados:** `_redirects` los bloquea en el CDN. Si agregas un `.md` nuevo, añádelo ahí; `tools/test-md-privados.mjs` (dentro de `npm test`) falla si queda alguno público.
