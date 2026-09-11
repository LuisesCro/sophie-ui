# PPC Mastery — Metodología de referencia (Crezcamos Online)

> Curso base: **PPC Mastery** (Brandon Young + Talal Asad, ecosistema Data Dive),
> 11 clases. Este documento es la **fuente de verdad** para calibrar el
> Optimizador PPC (`sophie-optiads`) y el motor compartido (`sophie-ppc.js`).
> Se transcribió y sintetizó desde las 11 clases cargadas por Luis. **No hace
> falta volver a subir los videos**: todo lo accionable vive aquí.

Regla de lectura: el **currículum** (umbrales, cálculos, decisiones) vive en el
motor JS y NO depende del modelo de IA. Cuando el curso y una constante del motor
choquen, gana el curso — pero recordando que cada umbral en dólares se deriva del
**precio** y del **break-even ACOS** del estudiante, no de un número fijo.

---

## 0. El principio que lo cambia todo

> "You can't deposit margin at the bank." (V10)

- El norte NO es el ACOS ni el ROAS. El norte es **TACOS** (Total ACOS =
  gasto en ads ÷ ventas TOTALES del producto, orgánicas + ads) y, en última
  instancia, los **dólares de utilidad** (contribution margin) que llegan al banco.
- **ACOS y ROAS son KPIs DIRECCIONALES**, no decisiones. "No puedes tomar
  ninguna decisión con ACOS o ROAS solos." Un término/campaña puede tener ACOS
  terrible y aun así ser bueno si el **halo orgánico** (TACOS) es sano, o si su
  **objetivo** es rankear, no lucrar. (V9, V10)
- Ejemplo real del curso: producto con **20-25% TACOS y 60-80% ACOS** y el dueño
  feliz — porque el CPA es razonable frente a un **margen/AOV alto** y hay ventas
  orgánicas. La pregunta correcta nunca es "¿qué ACOS es bueno?" sino
  "**¿cuántos dólares de utilidad deja?**". (V10)

Corolario para el optimizador: **nunca** mandar a pausar/negativizar un término
que **convierte** basándose solo en que su ACOS supera el break-even. Antes hay
que preguntar: (a) ¿cuál es el **objetivo** de la campaña? y (b) ¿qué pasa con el
**TACOS**?

---

## 1. Los 5 niveles de gestión de anuncios (marco maestro) — V8, V9, V10

De lo más alto a lo más granular. Cada nivel tiene su KPI:

| Nivel | KPI principal | Qué decides aquí |
|---|---|---|
| **1. Cuenta** | **TACOS** | Budget caps a nivel cuenta, portafolios, day-parting |
| **2. Producto / Parent** | **P-TACOS / PACOS** | Rentabilidad por ASIN/parent; estacionalidad, stock, LTV |
| **3. Campaña** | ROAS/ACOS **+ INTENCIÓN** | Objetivo: ¿ventas, ranking, descubrimiento, conquista, liquidación? |
| **4. Segmentación (targeting)** | bid, match, placement, audiencia | Keywords/ASINs/categorías + multiplicadores |
| **5. Término de búsqueda** | negación / cosecha / CPA / CVR | Podar, cosechar, subir/bajar puja |

**Métricas que Amazon NO te da y tú DEBES calcular** (V7, V10): **CVR** (órdenes÷clics)
y **CPA** (gasto÷órdenes). El optimizador ya las calcula. Amazon reporta
"unit session percentage" (unidades÷sesiones), distinto del CVR de ads.

**Crédito de ranking por match type** (V1): EXACT = crédito completo · PHRASE ≈ 50% ·
BROAD ≈ 33%.

**Algoritmo de ranking de Amazon** (abstracto, V3/V5): `relevancia × CTR × CVR ×
revenue`. Relevancia + desempeño = ranking.

---

## 2. Nivel CAMPAÑA: la INTENCIÓN manda (lo más importante para el optimizador) — V9, V10

**No toda campaña debe ser rentable.** El objetivo cambia el veredicto de cada término:

- **Rentabilidad / Mantenimiento** (producto maduro, 6-12 meses post-lanzamiento):
  aquí sí ROAS/CPA importan. Es el modo por defecto del optimizador. TACOS sano de
  referencia: **7-15%** en madurez.
- **Ranking / Lanzamiento**: se acepta operar **en o bajo break-even** a propósito.
  Un término que **convierte** aunque su ACOS pase el break-even es una **VICTORIA**,
  no algo que pausar. El norte es **CVR + rank**, no ACOS. Se lanza a
  **break-even price** (no target). (V2, V10)
- **Conquista / PAT** (targetear ASINs/marcas de competidores): ROAS bajo es
  ESPERADO. "Prospecting/conquesting no da buen ROAS." Se justifica si: absorbes
  la pérdida de margen, tomas venta al competidor, envías señal a Amazon, y/o el
  producto tiene **LTV alto** (consumible/subscribe & save). Umbral: ROAS ≥ ~3 =
  bien; break-even = aceptable si hay LTV. (V9)
- **Liquidación**: raro en Amazon. Mejor donar (deducción) que quemar ads.
  Si acaso: bajar precio + "gold panning" a puja mínima con 5% TACOS tope. (V10)

**Break-even ACOS a propósito negativo** (loss-leader al lanzar): válido para
velocidad/posicionamiento, pero el optimizador optimiza por rentabilidad → guía
por Sophie Lanzamiento con presupuesto que aceptes invertir.

---

## 3. Nivel TÉRMINO DE BÚSQUEDA: cosecha, poda y matices — V3, V4, V7, V8

### Desperdicio (wasted spend)
- Mantra: **"un keyword no es rentable hasta que lo es."** (V3, V8)
- No hay umbral fijo. Guías: ~5 clics/$10 = primera bandera; ~10 clics/$20 =
  significancia para actuar. **PERO** con **AOV alto** hay que esperar más (un
  sofá de $250 puede vender al clic 11). El motor usa el **gasto contra el CPA de
  equilibrio (beCPA)** como compuerta real, escalado al precio — correcto. (V8)
- La compuerta de clics (piso 10) solo protege del clic caro aislado.

### Negación — 4 tipos (V8)
- **Exacta**: bloquea solo esa frase (default para un perdedor puntual).
- **Frase**: bloquea toda una familia de búsquedas desperdiciadora.
- **ASIN**: negativo de producto.
- **Marca**: solo en creación de campaña PAT.
- **Negar a nivel de CAMPAÑA/parent, NO a nivel de ad group** (las negaciones de
  ad group "no funcionan" de forma fiable). Separa campañas por producto para poder
  negar limpio. (V8)

### Intención y el matiz clave: NO todo perdedor se mata (V4)
- **CTR alto + CVR bajo** = **intent mismatch** / keyword ambiguo (ej. "wax warmer":
  velas vs. depilación) / problema de **PDP o precio**. No siempre se niega: si es
  **relevante**, el cuello de botella es listing/precio (intent mismatch), no la puja.
- **CTR bajo (+ muchas impresiones)** = problema de **imagen principal / relevancia**
  (la gente ve el anuncio y no hace clic).
- **Priming queries / window shoppers** (V4): búsquedas amplias que reciben clic
  pero la venta se atribuye a una búsqueda posterior más específica. NO matar de
  golpe: **bajar la puja** para mantener cobertura barata del embudo. Con AOV alto,
  "un clic no es desperdicio hasta que convierte" → más paciencia; con AOV bajo, no
  entrar en pánico y cerrar términos al borde.
- **Redirect traffic**: en PAT/Auto, envía el clic al ASIN de tu catálogo que
  mejor calce con la intención (organic vs. no-organic, etc.).

### Cosecha (harvest) — positiva y negativa (V3, V8)
- **Positiva**: término que vende bien en Auto/Broad/Phrase → llévalo a su
  **Manual Exacta aislada** para controlar su puja, y **niégalo en exacto en la de
  origen** para no competir contra ti mismo (cerrar el ciclo).
- **Señal para cosechar**: no solo órdenes — **CVR ≥ ~20%** y un puñado de órdenes
  (3-5). 10 órdenes a 6% CVR cuesta mucho en exacta; 20-30% CVR + varias órdenes =
  buena señal. (V8)
- **Cosecha negativa/inversa** (V8): término que **sí convierte** pero con ROAS malo
  (caro) y **comparte keyword** con otros que sí rinden → no puedes bajar la puja al
  target sin dañar los demás → **aíslalo** en su campaña para controlarlo mejor y
  llevarlo a rentabilidad, en vez de matarlo.
- **No toda keyword llega a exacta.** Si rinde bien donde está (broad/phrase),
  déjala. Cosechar es sobre **control/ranking**, no un reflejo. (V8, escuela "if it
  ain't broke": Abe Shamali)
- Al cosechar, **puja de arranque** = puja objetivo un poco por debajo del CPC que
  ya funcionaba; luego ajustar por placement/TOS.

### Overlap vs. Cannibalización (V7, V8)
- **Overlap**: mismo keyword/search term en varias campañas del **mismo** producto
  → infla CPCs, campañas que no sirven (Amazon: "el bid más bajo tiende a ganar" en
  bids iguales, aunque no siempre). Arreglo: negar el término en la campaña de menor
  puja para que sirva la aislada. Es lo que hace `NEGAR_EN_ORIGEN`.
- **Cannibalización**: mismo keyword en **distintos** parents/productos → te
  superpujas a ti mismo. Con parents similares es inevitable; decide: divide-y-
  vencerás (parents distintos a intenciones distintas) o "real estate play" (tomas
  varios TOS a propósito).

---

## 4. Estrategias de campaña / targeting — V1, V3, V8

- **Estructura**: agrupar por root. SV múltiplo dentro de una campaña ≤ 5. Máx.
  8 keywords/campaña (5 mejor para quality score). No mezclar relevante+irrelevante
  ni alto-SV+bajo-SV. Presupuesto por volumen (mín. ~$12/campaña), no a partes iguales.
- **Puja de lanzamiento**: puja sugerida ×1.5 o ×2 (aún sin historial que premie). (V1)
- **Unigram / Bigram / Trigram**: root → root+1 → root+2, para enfocar. (V8)
- **3x Broad / "focused auto"** (V8): repetir el root 3 veces en broad con **puja
  muy baja** (≤⅓ de la sugerida o ≤50¢) DESPUÉS de 4-6 semanas (cuando Amazon ya
  sabe qué eres) → descubrimiento concentrado. "Puerta trasera a la data de Amazon."
- **Gold panning** (V3): pujas ultra bajas (**20-40¢**, ~⅓ de lo normal) sin
  modificadores, fixed bid, para pescar conversiones baratas. Usos: (1) Auto de
  cosecha barata; (2) producto con P-TACOS demasiado alto que quieres rescatar;
  (3) exacta donde no eres rentable. Optimizar cada ~semana subiendo 5-10¢ solo si
  no sirve impresiones. Real: cuentas se volvieron rentables solo con pujas de 20-30¢.
- **ISO campaigns** (V3, V8): 1 keyword / 1 ad group / exacta.
  - **ISO low-bid + high TOS**: puja base ~10% de la sugerida + **Top-of-Search
    +900%** → controlas el CPC de TOS con un multiplicador, no con la base.
  - **ISO high-bid**: puja base alta directa. Lanzar ambas con presupuestos ~$30-50
    y ver cuál gana en un mes.
  - "El bid tiene que estar a tu favor": si Amazon sugiere $5.15 y el 30% CVR igual
    no es rentable por AOV bajo, **no puedes rankear rentablemente** ese main keyword.

### Estrategias de bid (V8, V9)
- **Down-only**: 80-90% de las campañas. Juega bien con optimizadores. CPC ≤ bid.
- **Fixed bid**: el resto — ideal para **ISO exacta** donde quieres pujar consistente
  y alto. Fixed ≠ tu CPC, solo pujas consistente.
- **Up-and-down**: escéptico (Talal). Tiende a sangrar presupuesto. Si ves ACOS alto
  y está en up-and-down → pásalo a down-only.
- Bajar pujas: Talal es agresivo (10-30% de golpe); Brandon recomienda ≤5% para no
  throttlear impresiones. No saltar de $7 a 5¢.
- **Placement reports**: no es verdad universal que TOS siempre gana; auditar por
  cuenta. Cambiar bid **o** placement, uno a la vez (firewall de test).

---

## 5. Presupuesto, cuenta y day-parting — V1, V10

- **Fórmula de presupuesto de lanzamiento** (V1): estimar ventas desde share-of-
  voice de competidores en pág. 1 (asumir 50-60% de captura). Ingreso diario =
  precio × ventas/día. **Budget PPC = 50% del ingreso diario** los primeros 5-7 días;
  luego **<30%** tras el día 7.
- **Budget cap a nivel cuenta** (V10): útil como red de seguridad ("Red Friday"
  2019). Solo apaga Sponsored Products (SB/SD siguen). Pacing: si tus campañas se
  quedan sin budget a media tarde, súbelo; si no, cap para no sobre-gastar de noche.
- **Day-parting** (V10): fan de **bid day-parting binario** (0 o full, o puja mínima
  tipo gold-pan) en horas muertas (~11pm-6am). Reduce TACOS **2-3 puntos** (hasta 10%).
  NO confiar en el budget-day-parting de Amazon.
- **Convención de nombres** (V8): `Marca | AdType | TargetType | MatchType |
  Placement% | Propósito | ProductoSKU`. Ej: `KidScopes | SP | KW | PHRASE | TOS50 |
  pros | kids-binoculars-green`. Usa **BX** para branded (no BR, que colisiona con broad).
  Nunca `test 1`, `broad 3`. Que se lea sin abrir la campaña. **Nunca archives**
  campañas (no se pueden reactivar); pausa.

---

## 6. Producto, precio y conversión — V2, V5, V11

### Economía del producto (V2)
- **Consumible vs. compra única**: compra única necesita margen + AOV alto; el
  consumible tolera ACOS alto vía **LTV**, pero es riesgoso para marca nueva.
- **Tramos de precio / referral**: **<$10 → referral 8%** (vs. 15% estándar) + FBA
  reducido; $10-$11.70 = "tierra de nadie" (regla 10-12); **>$75** → canales externos
  viables. Automotriz referral **12.5%**. (⇒ el break-even NO siempre asume 15%.)
- Lanzar a **break-even price**; Vine al mejor precio. **Rating > nº de reseñas**;
  apuntar **≥4.3★** antes de ads (mín. 1-5 reseñas). PAT pre-lanzamiento para indexar.

### Conversión es rey (V5, V11)
- CVR se arregla con **3 cosas**: **contenido, diseño, precio**. Bajar precio sube
  CVR (línea inversa directa). Optimizar contenido sube el valor percibido → sube CVR.
- **Especificidad del keyword ∝ CVR**: más descriptores en la búsqueda = mayor CVR.
  Doblar/triplicar apuestas en los long-tails específicos que superan al mercado; limitar
  budget en los roots genéricos. Comparar tu CVR de ads contra el CVR promedio del
  mercado (columna de SQP).
- **Index image** (V11): 2ª imagen que lista "las 5 razones por las que este producto
  es el mejor", numeradas, sin ser "cute", con: top 2-3 disparadores de compra,
  apoyo (US/North-American based), y **garantía con nombre** ("empty bottle guarantee",
  "lifetime never-lost guarantee"). ~30% de compras ocurren en ≤3 min → dar info de
  impacto arriba. Testear main image **dentro del contexto del search result** (no en
  vacío) — subir de 7% a 14% de click-share puede ser +17% CTR / +14% CVR / +$19k/mes.

---

## 7. Escenarios especiales — V4, V9

- **Sin stock / oferta suprimida / sin buy box**: SP se pausa solo (solo anuncia al
  featured offer); **SB/SBV siguen corriendo y queman dinero** → páusalas manual.
  Si no tienes buy box, anuncias para que **otro** venda tu producto.
- **Low stock (days-of-coverage <10) / future-supply-viable**: sube el delivery time →
  cae CVR/ROAS → **baja pujas** o pausa; avisa a inventario. No juzgues CVR aquí.
  Meta 30-60 días de inventario.
- **New stock / re-entrada**: puja **más alto** de lo usual para recuperar tu "bid
  moat" (los competidores solidificaron tu puja vieja); sube multiplicadores TOS.
  Out-of-stock largos (>1 mes) son casi como relanzar.
- **Fin de temporada**: baja bids/budget 20-40%; mantén branded y long-tails de alta
  intención; ASIN-targeting a productos que siguen en venta (window shoppers);
  reformatea el PDP a la nueva temporada.
- **CPCs suben por competidor nuevo**: pon **max bids**; busca long-tails que el
  competidor no cubre; usa SBV; hazle la vida cara temporalmente y **vuelve a bajar
  tu puja** cuando se vaya (evitar bid fatigue / carrera al alza del CPC).
- **BSR igual pero ventas caen** (V9): es el **mercado/estacionalidad**, no tu culpa.
  Por eso hay que monitorear BSR a nivel categoría y sub-node.

### Revivir un listing en declive (V5) — SOP
1. **Arreglar CVR primero** (contenido/main image → mira CTR como indicador líder en
   2 días). 2. **Precio** vs. mercado (¿se ajustó el mercado a la baja?). 3. Rating/
   reviews/diseño/percepción. 4. Si es **indexación**, puede requerir relistado nuevo.
   A veces la decisión correcta es **discontinuar** (mercado muy chico o competidores
   demasiado adelante).

---

## 8. Mapa curso → optimizador (qué implementa Sophie)

- ✅ Compuerta de **gasto vs beCPA** (no clics fijos) — V3/V8.
- ✅ **CVR y CPA** calculados por término — V7/V10.
- ✅ **Cosecha** + **negar en origen** (overlap) + **techo de puja** = targetCPA/cpo — V3/V8.
- ✅ **Segmentación no es keyword** (grupos Auto / temas / PAT) — V8.
- ✅ Guía de **campaña Automática** por grupo (cercana/sustitutos/lejana/complementos) — V4/V8.
- ✅ Gate **¿pujas o listing?** (CVR de cuenta) — V4/V5/V11.
- 🔨 **Objetivo de campaña** (rentabilidad/ranking/conquista) que reencuadra veredictos — V9/V10. *(nuevo)*
- 🔨 **TACOS** como KPI norte + halo orgánico — V9/V10. *(nuevo)*
- 🔨 **Intent mismatch** (CTR alto + CVR bajo) distinto de imagen (CTR bajo) — V4. *(nuevo)*
- 🔨 **Referral configurable** (8/12.5/15%) en break-even — V2. *(nuevo)*
- 🔨 Enriquecer guías: **down-only/fixed**, **TOS/ISO**, **gold panning**, **frase vs
  exacta**, **negar a nivel campaña**, cautela de **stock/temporada** — V3/V4/V8/V9. *(nuevo)*
- 🔨 **Rigor estadístico** (intervalo de Wilson del CVR) — ver §9. *(nuevo)*

---

## 9. Capa de rigor estadístico (intervalo de Wilson) — extensión de Crezcamos

El curso no es estadístico, pero sus reglas ("un keyword no es no-rentable hasta que
lo es", "espera un puñado de órdenes y 20-30% CVR antes de cosechar") son en el fondo
afirmaciones sobre el **CVR verdadero**, que solo observamos por una muestra ruidosa.
Esta capa las formaliza sin cambiar la pedagogía.

- **CVR de equilibrio del término** (`beCVR`): el CVR que ESE término necesita a su
  CPC para no perder = `cpc / beCPA`. (Deriva de: CPA = cpc/CVR ≤ beCPA ⇒ CVR ≥ cpc/beCPA.)
- **Intervalo de Wilson** de `órdenes/clics` (se porta bien con n chico y cerca de 0/1):
  - **Negar** solo si el **techo** del intervalo `< beCVR` → aun en el mejor caso pierde.
    Con 0 ventas, esto exige ~`z²(1−beCVR)/beCVR` clics, que **escala con el precio**:
    producto caro (beCVR bajo) pide más clics antes de podar (el "sofá al clic 11");
    producto barato decide rápido. Reemplaza el crudo "10 clics + gastó el equilibrio".
  - **Cosechar** (en rentabilidad) solo si el **piso** del intervalo `≥ beCVR` → aun en
    el peor caso gana. Evita aislar a exacta un término que "vendió 2 veces" por suerte.
  - Si el intervalo aún cruza el equilibrio → **VIGILAR** ("faltan ~N clics" / "confírmalo
    una semana más"), en vez de fingir certeza.
- **Ranking** no exige la compuerta de rentabilidad (basta que convierta de verdad:
  ≥ MIN órdenes y ≥ piso de clics); solo se protege de la chiripa.
- Palanca: `Z_CONFIANZA` (default **1.28**, ≈90% de un lado). Más alto = más conservador.
- API: `SophiePPC.wilson(succ, trials, z)` y `SophiePPC.clicsParaNegar(beCVR, z)`; cada
  decisión trae `confianza:{cvrLo, cvrHi, beCVR}`.

**Beneficio:** menos negativos por mala suerte (no matas ganadores), menos cosechas
prematuras (no comprometes presupuesto por chiripa), y todo **auto-calibrado al AOV**.

### Prior Bayesiano (Empirical Bayes · shrinkage hacia la cuenta)

Wilson juzga cada término **en el vacío**. Pero conocemos la conversión típica de la
cuenta (`baseCVR = órdenes/clics del reporte, excluyendo segmentación`). La usamos como
**prior**: cada término arranca cerca de esa base y se despega conforme acumula evidencia.

- Prior **Beta(α₀, β₀)** con media = `baseCVR` y fuerza `k` = "clics equivalentes"
  (`PRIOR_FUERZA`, default **12**). Posterior tras `s` órdenes en `n` clics:
  `Beta(α₀+s, β₀+n−s)`. Intervalo por aproximación normal a la Beta (media ± z·desv).
- Con **poca data** el intervalo se **encoge hacia la base** → decide antes, no condena
  por ruido, no premia un "2/2 de suerte" (se encoge hacia ~baseCVR, no 100%). Con
  **mucha data**, el término manda (el prior se desvanece). Es **Empirical Bayes**: la
  base se estima de los propios datos del vendedor.
- **Adaptativo a la calidad de la cuenta:** cuenta sana (base alta) da **beneficio de la
  duda** a términos flojos con poca data (más paciente para negar); cuenta débil (base
  baja) **corta antes**. Verificado en tests.
- Sin base útil (cuenta sin conversiones) → cae a **Wilson** (no informativo).
- API: `SophiePPC.intervalo(succ, trials, baseCVR, k, z)`; palanca `PRIOR_FUERZA`
  (0 = desactiva, usa Wilson puro). El resumen trae `cvrBaseCuenta`.

**Beneficio:** decisiones más rápidas y estables con poca data (clave para vendedores de
bajo volumen), y un motor que se calibra a **la conversión real de cada cuenta**, no a
un número fijo.
