/* ============================================================
   SOPHIE · CURRÍCULUM GO/NO GO v2
   Crezcamos Online — ui.crezcamosonline.com/sophie-criterios.js

   Esta es la fuente única de la metodología. Los umbrales, la
   pedagogía y los vetos viven AQUÍ, no dentro de un prompt.
   El modelo no puede alterarlos, omitirlos ni suavizarlos.

   Para mejorar la metodología: se edita este archivo y se
   despliega. Cambia para todos los módulos a la vez.

   OJO — dos copias en PROSA repiten estos números a mano (un
   build step no las genera): el prompt del modelo en
   sophie-producto/chat.js y las pantallas del alumno en
   sophie-pasos.js. Tras cambiar un umbral aquí, actualiza esas
   copias y corre `node tools/verificar-metodologia.mjs`, que
   falla si algo quedó desincronizado.

   ESTRUCTURA de cada criterio:
     id           número del criterio (1–13)
     fase         1 = validación inicial · 2 = validación avanzada
     criterio     nombre visible
     umbral       regla en texto (lo que ve el estudiante)
     FUENTE DE LOS DATOS: los criterios se evalúan con el HEADER DE XRAY
     (Average Revenue, Average Price, Average Reviews). Los filtros de
     descubrimiento de Black Box > Keywords usan otra nomenclatura
     (Monthly Revenue, Price) y viven en el contenido del paso 3, no aquí.
     campo        clave del dato crudo que evalúa el motor
     direccion    'min' (valor ≥ umbral) | 'max' (valor ≤ umbral) | 'rango' | 'juicio'
     umbral_num   número para la barra de distancia
     veto         true = un ❌ aquí limita el veredicto a RIESGO MODERADO
     por_que      por qué el criterio existe
     leccion      la frase que el estudiante debe recordar
     error_comun  el error que este criterio previene
     glosario     términos del vocabulario del vendedor
   ============================================================ */

(function (global) {
  'use strict';

  var CRITERIOS = [

    /* ---------- FASE 1 — VALIDACIÓN INICIAL ---------- */

    {
      id: 1, fase: 1, veto: true, alerta_num: 4500,
      criterio: 'Tendencia y volumen de mercado',
      umbral: 'SV ≥ 4,500 + tendencia estable o alcista',
      campo: 'searchVolume', direccion: 'min', umbral_num: 4500,
      extra: 'tendencia',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Tendencia y volumen — SV ≥ 4,500/mes y tendencia alcista o estable. ⚠️ si el volumen alcanza pero la tendencia baja levemente. ❌ si SV < 4,500 o cae claramente.",
      prompt_extra: ["ALERTA ESTACIONALIDAD: si el nombre trae Christmas, Halloween, Valentine, Summer o Winter, o la gráfica tiene picos en 2-3 meses, advierte: \"⚠️ POSIBLE PRODUCTO ESTACIONAL. Inventario parado 6-9 meses del año, riesgo crítico con capital limitado. Y en 2026 el recargo por inventario envejecido empieza a los 181 días, así que el inventario parado no solo congela capital: paga multa. Valida en Google Trends con vista All Time.\""],
      por_que: 'El volumen mide cuánta gente busca. La tendencia mide si ese interés está creciendo o muriendo. Un mercado estable es predecible: puedes planificar inventario. Un mercado en caída es una trampa, porque cuando llegues con tu producto la demanda ya habrá bajado más.',
      leccion: 'La demanda no se crea en Amazon, se captura.',
      error_comun: 'Mirar el volumen y no mirar la curva. Un nicho con 20,000 búsquedas cayendo vale menos que uno con 6,000 estable.',
      glosario: ['search volume', 'Black Box']
    },

    {
      id: 2, fase: 1, veto: false, alerta_num: 3000,
      criterio: 'Ingresos reales del mercado',
      umbral: 'Average Revenue ≥ $4,500 /mes',
      campo: 'averageRevenue', direccion: 'min', umbral_num: 4500,
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Ingresos reales — Average Revenue ≥ $4,500/mes. ⚠️ entre $3,000 y $4,499. ❌ bajo $3,000. Si el precio promedio supera $45, puedes ser más flexible.",
      por_que: 'El ingreso promedio por listing es la estimación de lo que tú podrías generar cuando estés bien posicionado. Si el promedio es bajo, el mercado tiene poco dinero circulando: incluso siendo el mejor vendedor, tu techo de ingresos es bajo.',
      leccion: 'Ser el número uno de un mercado pequeño sigue siendo un mercado pequeño.',
      error_comun: 'Confundir búsquedas con dinero. Un nicho puede tener mucho tráfico y muy poca facturación por competidor.',
      glosario: ['average revenue', 'Xray']
    },

    {
      id: 3, fase: 1, veto: false, alerta_num: 60,
      criterio: 'Distribución de ingresos',
      umbral: 'Ningún producto concentra > 40% del revenue total',
      campo: 'concentracionTop1', direccion: 'max', umbral_num: 40,
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Distribución de ingresos — ningún producto supera el 40% del Total Revenue. ⚠️ si el #1 concentra 40-60%. ❌ si el #1 o los 2 primeros pasan del 60%.",
      por_que: 'Un mercado donde el 60% del dinero va a un solo producto está dominado por un ganador que probablemente tiene marca fuerte, miles de reseñas y presupuesto de PPC que tú no puedes igualar. Un mercado distribuido significa que hay espacio para varios ganadores, y tú puedes ser uno.',
      leccion: 'No entres a un mercado donde ya hay un rey coronado.',
      error_comun: 'Ver un revenue total alto sin revisar quién se lo lleva. El promedio esconde la concentración.',
      glosario: ['winner-take-all', 'total revenue']
    },

    {
      id: 4, fase: 1, veto: false, alerta_num: 500,
      criterio: 'Reseñas y ratio ventas/reseñas',
      umbral: 'Average Reviews ≤ 300 · ningún top 3 sobre 500',
      campo: 'averageReviews', direccion: 'max', umbral_num: 300,
      extra: 'ratioVentasReviews',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Reseñas y ratio ventas/reseñas — Average Reviews ≤ 300 y ningún top 3 sobre 500. Ratio = ASIN Sales / reseñas; ideal ≥ 3 en al menos 2 de los top 3. ⚠️ Average 301-500. ❌ Average > 500 o algún top 3 sobre 1,000.",
      por_que: 'El conteo de reseñas te dice la barrera de entrada. El ratio ventas/reseñas te dice cuánto te va a costar cruzarla. Si un producto tiene 100 reseñas y vende 400 unidades al mes, los clientes compran sin necesitar ver cientos de reseñas primero. Si el ratio es 0.5, necesitas cientos de reseñas antes de vender bien: ese es el mercado más caro de entrar.',
      leccion: 'El costo de entrada a un nicho no se mide en dólares, se mide en reseñas.',
      error_comun: 'Ver búsquedas altas y asumir oportunidad, ignorando la muralla social que la competencia ya construyó.',
      glosario: ['review count', 'ratio ventas/reseñas', 'Vine']
    },

    {
      id: 5, fase: 1, veto: false, alerta_num: 20,
      criterio: 'Precio promedio de venta',
      umbral: 'Average Price ≥ $20 (ideal ≥ $25)',
      campo: 'averagePrice', direccion: 'min', umbral_num: 20,
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Precio promedio — Average Price ≥ $20, ideal ≥ $25. ⚠️ entre $20 y $24.99. ❌ bajo $20.",
      por_que: 'El precio de venta es el techo de todo lo demás. Con las tarifas FBA de 2026, un producto de $15 no tiene margen viable después de fees, COGS y envío. El piso real hoy es $20, y para tener colchón cómodo para PPC y diferenciación el objetivo es $25 o más.',
      leccion: 'El precio define cuánto puedes gastar en publicidad. Sin margen no hay ranking.',
      error_comun: 'Elegir un producto barato pensando que se vende más fácil. Barato significa que no puedes anunciarlo.',
      glosario: ['FBA fees', 'COGS']
    },

    {
      id: 6, fase: 1, veto: false,
      criterio: 'Calidad de listings de la competencia',
      umbral: '3+ de los top 5 con listings débiles = oportunidad alta',
      direccion: 'juicio',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Calidad de listings — TÚ LO JUZGAS. Un listing es DÉBIL si falla en 2 o más de estas 4 áreas: (a) fotos: menos de 6-7 imágenes, sin infografías ni lifestyle; (b) título: sin la keyword principal, o corto, o amontonado ilegible; (c) sin contenido A+; (d) bullets genéricos: sin beneficio al inicio, sin números concretos, sin decir para quién es. ✅ oportunidad alta con 3+ de los top 5 débiles; ✅ moderada con 1-2; ⚠️ mercado ejecutado si los 5 son profesionales.",
      prompt_extra: ["\"En Amazon no siempre gana el mejor producto: gana el mejor listing. Si los competidores ejecutan mal, puedes superarlos sin un producto radicalmente distinto. Si ya tienen listings perfectos, necesitas una diferenciación de producto mucho más fuerte.\""],
      por_que: 'En Amazon no siempre gana el mejor producto: gana el mejor listing. Si los competidores tienen fotos mediocres, títulos mal optimizados y páginas sin A+, puedes superarlos con mejor ejecución sin necesitar un producto radicalmente distinto. Si ya tienen listings perfectos, necesitas una diferenciación de producto mucho más fuerte.',
      leccion: 'La mediocridad de tu competencia es un activo. Cuéntala antes de entrar.',
      error_comun: 'Evaluar listings por impresión en vez de por conteo. Fotos, título, A+ y bullets: cuatro áreas, se cuentan.',
      glosario: ['A+ content', 'keyword stuffing', 'lifestyle']
    },

    /* ---------- FASE 2 — VALIDACIÓN AVANZADA ---------- */

    {
      id: 7, fase: 2, veto: true, alerta_num: 15,
      criterio: 'Demanda en profundidad (Cerebro)',
      umbral: '≥ 30 keywords orgánicas tras filtrar',
      campo: 'keywordsCerebro', direccion: 'min', umbral_num: 30,
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Demanda en profundidad — mínimo 30 keywords orgánicas tras filtrar en Cerebro. ✅ excelente 60+, ✅ bueno 30-59, ⚠️ 15-29, ❌ menos de 15. Fíjate además si cubren INTENCIONES distintas y no solo sinónimos: un nicho repartido en varias intenciones es más defendible y más fácil de que la IA de Amazon lo recomiende.",
      por_que: 'Las keywords orgánicas de Cerebro son las rutas reales por las que los clientes encuentran y compran este tipo de producto. Sesenta keywords significan sesenta caminos distintos para generar ventas: si una baja, quedan cincuenta y nueve. Quince keywords significan que dependes de muy pocas rutas, y cualquier cambio de algoritmo puede tumbarte.',
      leccion: 'Un nicho robusto tiene muchas puertas de entrada, no una sola.',
      error_comun: 'Correr Cerebro sobre un solo competidor. El ruido de un ASIN individual no es la demanda del mercado.',
      glosario: ['Cerebro', 'organic rank', 'COSMO']
    },

    {
      id: 8, fase: 2, veto: true, alerta_num: 20,
      criterio: 'Margen antes de PPC y ROI',
      umbral: 'Margen ≥ 30% antes de PPC · ROI ≥ 100%',
      campo: 'margenAntesPPC', direccion: 'min', umbral_num: 30,
      extra: 'roi',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Margen y ROI — margen ≥ 30% antes de PPC y ROI ≥ 100%. ⚠️ margen 20-29%. ❌ bajo 20%. El cálculo incluye comisión, FBA, producto, aranceles, envío, colocación de inbound, devoluciones, empaque e inspección.",
      prompt_extra: ["Unidades del primer pedido = (capital × 0.60) / costo por unidad. El 40% restante se reserva para PPC.", "VIABILIDAD DE PPC con el CPC real: costo por venta ≈ CPC × 10. ✅ si consume menos de la mitad del margen por unidad; ⚠️ entre 50% y 90%; ❌ si iguala o supera el margen.", "Si el margen es bajo: \"Hay dos formas de rescatarlo: diferenciarte para justificar $5-10 más que el promedio, o negociar mejor el costo en Alibaba.\""],
      por_que: 'El ROI del 100% significa que por cada dólar que inviertes recuperas dos. No es ambicioso: es el mínimo para que el negocio sea sostenible mientras pagas PPC, gastos operativos y reinviertes en el siguiente pedido. El margen antes de PPC es el colchón del que sale todo lo demás.',
      leccion: 'Un producto con 11 de 13 criterios y 15% de margen no es un GO: es una trampa bien presentada.',
      error_comun: 'Calcular el margen sin aranceles, empaque, inspección, devoluciones ni colocación de inbound. El margen "de servilleta" siempre miente hacia arriba.',
      glosario: ['ROI', 'break-even ACOS', 'landed cost']
    },

    {
      id: 9, fase: 2, veto: false,
      criterio: 'Intención no satisfecha (COSMO)',
      umbral: '≥ 1 intención o problema claro y resoluble',
      direccion: 'juicio',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Intención no satisfecha (COSMO) — TÚ LO JUZGAS. Debe existir al menos 1 intención o problema claro, repetido y RESOLUBLE que el mercado no satisface. ✅ 2+ intenciones con soluciones viables incluyendo al menos 1 escenario no atendido; ✅ básico con 1; ⚠️ si las quejas son solo de precio o la intención es demasiado pequeña; ❌ si no hay ninguna.",
      prompt_extra: ["\"Las reseñas negativas de la competencia son la investigación de mercado más valiosa y gratuita que existe. Amazon ya no solo empareja palabras: su IA entiende la intención. Cuando alguien escribe '1 estrella, lo compré para viajar y pesa demasiado', te regala tu propuesta de valor (hazlo ligero) y la intención que vas a dominar (viajeros).\""],
      por_que: 'Amazon ya no solo empareja palabras: su IA entiende la intención detrás de la búsqueda, para quién es el producto, qué problema resuelve y en qué escenario se usa. Cuando alguien escribe "una estrella, lo compré para viajar y pesa demasiado" te regala dos cosas: tu propuesta de valor y la intención que vas a dominar.',
      leccion: 'Las reseñas negativas de tu competencia son la investigación de mercado más valiosa y gratuita que existe.',
      error_comun: 'Quedarse en quejas de precio. El precio no es una intención no satisfecha: es una guerra que no quieres pelear.',
      glosario: ['COSMO', 'Alexa for Shopping', 'Review Insights']
    },

    {
      id: 10, fase: 2, veto: true, alerta_num: 40,
      criterio: 'Sourcing y aranceles',
      umbral: 'MOQ ≤ 300 · costo aterrizado ≤ 30% del precio',
      campo: 'costoAterrizadoPct', direccion: 'max', umbral_num: 30,
      extra: 'moq',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Sourcing y aranceles — MOQ ≤ 300 y costo ATERRIZADO (producto + flete + arancel) ≤ 30% del precio. ⚠️ MOQ 300-500 o costo 30-40%. ❌ no existe, requiere molde caro, o costo sobre 40%. Si el origen es China y no conoce su arancel, modela 15-30% del costo y márcalo como estimado a verificar con el proveedor o un agente de carga ANTES del pedido. Si el arancel de China rompe el número, sugiere cotizar en Vietnam o India antes de descartar.",
      por_que: 'El análisis de mercado más perfecto no sirve si no puedes conseguir el producto a un precio que funcione aterrizado en la bodega de Amazon. En 2026 eso incluye aranceles: un producto de cinco dólares en Alibaba puede costarte siete puesto en Estados Unidos según el origen.',
      leccion: 'El costo aterrizado se calcula antes de enamorarse del producto, no después.',
      error_comun: 'Usar el precio FOB como si fuera el costo real. El flete, el arancel y la colocación de inbound no son detalles.',
      glosario: ['MOQ', 'DDP', 'FOB', 'landed cost', 'HTS']
    },

    {
      id: 11, fase: 2, veto: false, alerta_num: 100,
      criterio: 'Capital estructurado',
      umbral: 'Alcanza para 150+ unidades + reserva de PPC',
      campo: 'unidadesPosibles', direccion: 'min', umbral_num: 150,
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Capital estructurado — alcanza para 150+ unidades más envío, empaque y mínimo $300 de PPC. ⚠️ capital justo: recomienda bajar a 100-150 unidades para conservar reserva. ❌ insuficiente para el nicho.",
      por_que: 'El capital tiene que cubrir producto, envío, empaque y reserva de publicidad sin dejarte sin liquidez. La regla es que el 60% del capital va al inventario y el 40% se reserva para PPC y operación. Un pedido que consume todo tu dinero te deja sin combustible para rankear.',
      leccion: 'Comprar inventario que no puedes anunciar es comprar una bodega, no un negocio.',
      error_comun: 'Gastar el 100% del capital en el primer pedido para "aprovechar el descuento por volumen".',
      glosario: ['reserva PPC', 'primer pedido']
    },

    {
      id: 12, fase: 2, veto: false,
      criterio: 'Resistencia a competencia china',
      umbral: 'El nicho no está dominado por genéricos de $8–15',
      direccion: 'juicio',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Resistencia a competencia china — TÚ LO JUZGAS. ✅ si el nicho requiere diseño, certificación o personalización cultural difícil de replicar. ⚠️ si es replicable pero la marca y el listing pueden protegerlo. ❌ si es completamente genérico y ya lo dominan productos de $8-15 sin margen de diferenciación.",
      prompt_extra: ["\"Los nichos donde puedes ganar son los que el diseño importa, la marca genera confianza, o el cliente prefiere pagar más por calidad percibida.\""],
      por_que: 'Los nichos donde puedes ganar son aquellos donde el diseño importa, la marca genera confianza, o el cliente prefiere pagar más por percepción de calidad. Si el nicho ya está dominado por productos genéricos sin diferenciación posible, no hay espacio rentable por más bien que ejecutes.',
      leccion: 'Si tu única ventaja posible es el precio, no tienes ventaja.',
      error_comun: 'Creer que un mejor listing compensa un producto idéntico a uno que cuesta la mitad.',
      glosario: ['diferenciación', 'commodity']
    },

    {
      id: 13, fase: 2, veto: true,
      criterio: 'Barreras de entrada',
      umbral: 'Categoría abierta · sin patentes · líderes superables',
      direccion: 'juicio',
      extra: 'proofOfEntry',
      // Línea de este criterio en el prompt del modelo. FUENTE de
      // sophie-producto/chat.js: la genera tools/generar-bloque-criterios.mjs.
      prompt: "Barreras de entrada — TÚ LO JUZGAS. Cuatro barreras: (1) PRUEBA DE ENTRADA: cuántos de los 10 top se lanzaron en los últimos 12 meses. 2 o más con tracción = el nicho SÍ deja entrar, la mejor evidencia posible; 1 = neutral; 0 en un nicho antiguo = la barrera es real aunque las reseñas se vean bajas. (2) reseñas de los líderes: mejor si varios están bajo 500. (3) categoría gated según el chequeo en Seller Central. (4) patentes o marca dominante. ✅ líderes superables + categoría abierta + sin patentes. ⚠️ líderes con muchas reseñas pero hay competidores nuevos rankeando, o gated con acceso posible. ❌ todos con miles de reseñas, gated sin acceso, o patentado.",
      prompt_extra: ["Si no pudo verificar el gating, márcalo como pendiente obligatorio ANTES del pedido; nunca lo des por abierto sin el chequeo."],
      por_que: 'El mejor mercado del mundo no sirve si no puedes entrar. Si los líderes tienen miles de reseñas vas a tardar meses en rankear. Si la categoría está gated y no te aprueban, no puedes ni listar. Y si el producto está patentado, Amazon te suspende.',
      leccion: 'Que dos de los diez que más venden se hayan lanzado este año es la mejor prueba de que el nicho deja entrar.',
      error_comun: 'Dar la categoría por abierta sin verificarla en Seller Central. Se comprueba en sesenta segundos.',
      glosario: ['gated', 'ungating', 'proof of entry', 'creation date']
    }
  ];

  /* ---------- Filtros de herramientas ----------
     Los nombres de campo de Helium 10 cambian cada cierto tiempo y los
     umbrales se recalibran. Viven aquí para que una sola edición actualice
     las instrucciones de todos los módulos. */

  var FILTROS = {

    // Black Box > Keywords — descubrimiento de nichos (paso 3)
    // Nomenclatura vigente: 'Monthly Revenue' y 'Price'
    // (antes 'Average Revenue' y 'Average Monthly Price').
    blackBox: [
      { campo: 'Search Volume',       min: 4500, max: null, nota: 'sin máximo' },
      { campo: 'Monthly Sales Units', min: 300,  max: null },
      { campo: 'Review Count',        min: null, max: 500 },
      { campo: 'Monthly Revenue',     min: 4500, max: null, moneda: true },
      { campo: 'Price',               min: 20,   max: 60, moneda: true, nota: 'ideal desde $25' },
      { campo: 'Word Count',          min: 2,    max: null }
    ],

    // Cerebro — validación de keyword y medición de demanda (pasos 4 y 7)
    // Se corre sobre los 10 competidores marcados en Xray, nunca sobre un ASIN suelto.
    cerebro: [
      { campo: 'Search Volume',                min: 300, max: null },
      { campo: 'Match Type',                   valor: 'Organic' },
      { campo: 'Number of Organic Competitors', min: 3,  max: 10 },
      { campo: 'Competitor Organic Rank',       min: 1,  max: 45 }
    ]
  };

  /* ============================================================
     CAPA 2 · CRITERIOS SEMÁNTICOS (Selección Intent-First 3.0)
     ------------------------------------------------------------
     Van SEPARADOS de CRITERIOS (léxico 1–13) a propósito: el
     puntaje y el veredicto léxico NO cambian. Estos alimentan el
     VEREDICTO COMPUESTO (matriz léxico × semántico) y los pinta
     el motor sophie-intencion.js. fase 3 = capa de intención.
     ============================================================ */

  var SEMANTICOS = [
    {
      id: 14, fase: 3, capa: 2, veto: false, criterio: 'Brecha de intención',
      umbral: '≥ 2 clusters huérfanos (SV ≥ 2% del nicho o ≥ 5,000, sin dueño en top 5)',
      direccion: 'juicio',
      go_num: 2, alerta_num: 1,
      por_que: 'Amazon ya no solo empareja palabras: COSMO interpreta la intención detrás de cada búsqueda. Cuando un cluster de intención tiene demanda real pero ningún competidor top lo dice explícitamente en su título, bullets o A+, ese hueco es tuyo — entrar por ahí es más barato que pelear por los head terms y está alineado con hacia dónde migra el descubrimiento (Rufus, Alexa).',
      leccion: 'El nuevo moat no es una mejor keyword: es una intención con demanda que nadie está sirviendo.',
      error_comun: 'Validar solo por volumen total y entrar con el mismo ángulo genérico que ya tienen los líderes.',
      glosario: ['COSMO', 'cluster de intención', 'discovery attributes']
    },
    {
      id: 15, fase: 3, capa: 2, veto: false, alerta_num: 15,
      criterio: 'Long-tail conversacional',
      umbral: '≥ 30% de las keywords (por conteo) tienen 4+ palabras',
      campo: 'longTailPct', direccion: 'min', umbral_num: 30,
      por_que: 'Las keywords de 4+ palabras son compradores que "hablan" con el buscador ("matcha starter kit with bowl"). Ese lenguaje descriptivo es justo lo que Rufus y Alexa interceptan. Un nicho con mucha cola larga es un nicho donde el canal conversacional ya captura demanda que no ves en los head terms.',
      leccion: 'La cola larga no es ruido: es la demanda conversacional que tus reportes de volumen no miden.',
      error_comun: 'Descartar keywords de baja búsqueda individual sin ver que en conjunto revelan intenciones completas.',
      glosario: ['long-tail', 'Rufus', 'Alexa for Shopping']
    },
    {
      id: 16, fase: 3, capa: 2, veto: false, alerta_num: 1,
      criterio: 'Completitud de contenido de competidores',
      umbral: '≥ 2 de los top-sellers con huecos de contenido (descripción/A+, imagen, video)',
      campo: 'competidoresConHuecos', direccion: 'min', umbral_num: 2,
      por_que: 'Cada fallo de contenido de un competidor que vende fuerte es espacio semántico que COSMO no puede leerle — y que tú sí puedes ocupar. Si los que más venden tienen huecos en A+, imagen principal o video, hay lugar para ganar con mejor ejecución, no solo con mejor producto.',
      leccion: 'La compliance de contenido dejó de predecir el resultado: un LQS perfecto con la intención equivocada pierde contra un LQS mediocre con precio y momentum.',
      error_comun: 'Ver un LQS alto y dar el nicho por cerrado, sin mirar si los líderes REALES (los que venden) tienen huecos.',
      glosario: ['LQS', 'A+ content', 'discovery attributes']
    },
    {
      id: 17, fase: 3, capa: 2, veto: false, alerta_num: 1,
      criterio: 'Dolor sin responder en reseñas/Q&A',
      umbral: '≥ 3 dolores o preguntas recurrentes sin responder en top 3',
      campo: 'doloresRecurrentes', direccion: 'min', umbral_num: 3,
      por_que: 'Rufus lee reseñas y Q&A para recomendar, y penaliza los listings que no responden lo que la gente pregunta. Un dolor recurrente sin responder es a la vez tu ángulo de diferenciación y el contenido que Rufus citará de tu listing.',
      leccion: 'Las quejas recurrentes de tu competencia son el guion de tu A+ y tu propuesta de valor.',
      error_comun: 'Quedarse en quejas de precio o de envío: esas no son intención no satisfecha, son ruido.',
      glosario: ['Rufus', 'Review Insights', 'Q&A']
    },
    {
      id: 18, fase: 3, capa: 2, veto: false, alerta_num: 2,
      criterio: 'Explicabilidad por voz',
      umbral: '3/3: recomendable en una frase · no depende de ver · atributos recitables',
      campo: 'vozSi', direccion: 'min', umbral_num: 3,
      por_que: 'Alexa recita atributos por voz y Rufus resume en texto. Un producto que se recomienda en una frase y tiene atributos estructurados (medidas, material, cantidad, compatibilidad) gana en el canal conversacional; uno puramente visual o estético pierde porque no se puede narrar.',
      leccion: 'Si tu producto solo se vende mostrándolo, el canal conversacional no te va a recomendar.',
      error_comun: 'Elegir un producto puramente decorativo pensando en la foto, sin atributos que una voz pueda recitar.',
      glosario: ['Alexa for Shopping', 'discovery attributes', 'explicabilidad']
    }
  ];

  /* ---------- Matriz de veredicto compuesto (léxico × semántico) ----------
     El veredicto léxico (1–13) se cruza con el semántico (14–18) para decidir
     CÓMO se entra, no solo si se entra. Filas: léxico GO vs léxico PIVOTAR/NO-GO.
     Columnas: semántico GO (≥3 de los 5 en GO y el 14 no en NO-GO) vs NO-GO. */

  var MATRIZ_COMPUESTA = {
    go_go:        { clave: 'GO_PREMIUM',   etiqueta: 'GO PREMIUM',           estado: 'go',
                    resumen: 'Entrar con moat de contenido semántico: el nicho es vencible y hay una brecha de intención que nadie sirve.' },
    go_nogo:      { clave: 'GO_COMMODITY', etiqueta: 'GO COMMODITY',         estado: 'alerta',
                    resumen: 'Nicho válido pero sin brecha semántica: es guerra de precio. Entrar solo con ventaja de costos real.' },
    pivotar_go:   { clave: 'VIGILAR',      etiqueta: 'VIGILAR / DIFERENCIAR', estado: 'alerta',
                    resumen: 'El plano léxico está tomado, pero hay brecha de intención: entrar solo con producto diferenciado por esa brecha, o vigilar con Rank Radar.' },
    pivotar_nogo: { clave: 'DESCARTE',     etiqueta: 'DESCARTE',             estado: 'nogo',
                    resumen: 'Sin demanda vencible ni brecha semántica. No hay ángulo de entrada rentable.' }
  };

  /* ---------- Taxonomía de los 6 clusters de intención (criterio 14) ----------
     La taxonomía y el clasificador ahora viven en cz-intent-core.js, la
     infraestructura COMPARTIDA que también usan Listing, Ads y Lanzamiento.
     SophieCriterios la reexpone (abajo, con getters) leyendo del core, para
     no tener dos copias que se desincronicen. Editar los marcadores se hace
     en cz-intent-core.js y recalibra toda la Suite a la vez. */

  /* ---------- Escala de veredictos ---------- */

  var ESCALA = [
    { min: 12, veredicto: 'PRODUCTO ESTRELLA', etiqueta: 'PRODUCTO ESTRELLA 🌟', estado: 'go' },
    { min: 10, veredicto: 'GO CON AJUSTES',    etiqueta: 'GO CON AJUSTES 🟢',    estado: 'go' },
    { min: 7,  veredicto: 'RIESGO MODERADO',   etiqueta: 'RIESGO MODERADO 🟡',   estado: 'alerta' },
    { min: 0,  veredicto: 'NO GO',             etiqueta: 'NO GO 🔴',             estado: 'nogo' }
  ];

  // Un ❌ en cualquiera de estos limita el veredicto a RIESGO MODERADO,
  // sin importar el puntaje total. Son los criterios que quiebran negocios.
  var VETOS = CRITERIOS.filter(function (c) { return c.veto; }).map(function (c) { return c.id; });

  global.SophieCriterios = {
    version: '2.1',
    lista: CRITERIOS,
    escala: ESCALA,
    filtros: FILTROS,
    vetos: VETOS,
    // Capa 2 · Intent-First (criterios 14–18 + matriz). La taxonomía de
    // clusters se reexpone desde cz-intent-core.js (fuente única compartida).
    semanticos: SEMANTICOS,
    get clusters() { return (global.CzIntentCore && global.CzIntentCore.clusters) || []; },
    get clusterHuerfano() { return (global.CzIntentCore && global.CzIntentCore.clusterHuerfano) || { svPctNicho: 2, svAbsoluto: 5000 }; },
    get longTailPalabras() { return (global.CzIntentCore && global.CzIntentCore.longTailPalabras) || 4; },
    matrizCompuesta: MATRIZ_COMPUESTA,
    fase: function (n) {
      var todos = CRITERIOS.concat(SEMANTICOS);
      return todos.filter(function (c) { return c.fase === n; });
    },
    porId: function (id) {
      var todos = CRITERIOS.concat(SEMANTICOS);
      for (var i = 0; i < todos.length; i++) if (todos[i].id === id) return todos[i];
      return null;
    },
    // Los que el motor calcula solo, sin pedirle nada al modelo.
    calculables: CRITERIOS.filter(function (c) { return c.direccion !== 'juicio'; }).map(function (c) { return c.id; }),
    // Los que requieren juicio del modelo sobre observación del estudiante.
    dejuicio: CRITERIOS.filter(function (c) { return c.direccion === 'juicio'; }).map(function (c) { return c.id; })
  };

})(window);
