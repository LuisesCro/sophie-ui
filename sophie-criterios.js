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
     CAPA DE MERCADO · AMAZON MÉXICO
     ------------------------------------------------------------
     Los umbrales de arriba son de Amazon USA y NO sirven en México:
     aplicarlos daría NO GO a casi todo producto viable. Esta capa
     los sustituye para 'mx' sin tocar los de USA, que siguen siendo
     los canónicos que valida tools/verificar-metodologia.mjs.

     CALIBRACIÓN (medida, no inventada):
      · Volumen de búsqueda ≈ 10x menor que USA. Medido con Helium 10
        sobre marcas idénticas en los dos marketplaces: owala 180,456 vs
        2,493,936 (13.8x) · ipad 172,177 vs 1,563,582 (9.1x).
      · Reseñas: la barrera es mucho más baja. En tres nichos reales de
        MX (botella de agua, organizador de cocina, juguetes para perro,
        n≈190 c/u) entre 29% y 48% de los productos compiten con menos
        de 100 reseñas.
      · Precio: mediana real de esos nichos MXN 215–375, p75 hasta 521.
      · Ingreso: mediana por producto MXN 6,882 / 32,857 / 63,082 al mes.

     MXN 299 es el umbral que gobierna el mercado: envío gratis sin Prime,
     MSI sin costo para el vendedor y subsidio de comisiones. MXN 499 es
     donde arranca la banda cara de FBA.
     ============================================================ */

  var UMBRALES_MX = {
    1: { umbral_num: 500, alerta_num: 300,
         umbral: 'SV ≥ 500 + tendencia estable o alcista',
         nota_mx: 'En México el volumen es ~10x menor que en USA. Una keyword de 500 búsquedas aquí equivale a ~5,000 allá: no la descartes con el criterio gringo.' },

    2: { umbral_num: 80000, alerta_num: 50000,
         umbral: 'Average Revenue ≥ MXN 80,000 /mes',
         nota_mx: 'Medido sobre 30 nichos reales de MX (promedio del top 10 orgánico, que es lo que muestra Xray). Distribución: p10 $35,406 · p25 $71,925 · mediana $188,535 · p75 $470,333. El umbral se pone justo arriba del p25, para rechazar el cuartil más flaco conservando la selectividad de USA; cae además muy cerca de convertir los USD 4,500 gringos. La calibración es sólida: el p25 salió $71,925 en los primeros 15 nichos y $66,942 en los siguientes 15, medidos por separado. NO bajarlo a MXN 25,000: aprobaría absolutamente todo.' },

    /* 3 (concentración) no cambia de umbral: es estructural, no depende del mercado.
       Pero sí lleva contexto medido de México. */
    3: { nota_mx: 'Tensión medida en México entre tamaño y facilidad, para que no la busques de más: los nichos grandes tienen barrera más alta. Sobre 30 nichos, la correlación de Spearman entre el ingreso del nicho y la mediana de reseñas del top 10 es +0.51, y contra el porcentaje de productos con menos de 100 reseñas es -0.45. En números: los nichos bajo MXN 100,000 traen 59% de productos con menos de 100 reseñas; los de más de MXN 300,000 traen 42%. Es una relación MODERADA, no una ley: hay excepciones y son justo las que hay que buscar. El mejor ejemplo medido es "difusor de aceites esenciales", con MXN 255,266 de ingreso y a la vez mediana de 55 reseñas y 74% del nicho bajo 100 reseñas: mercado grande con puerta abierta. Cuando un nicho sea fácil Y chico, dilo explícitamente en vez de venderlo como oportunidad.' },

    4: { umbral_num: 2000, alerta_num: 3500,
         umbral: 'Average Reviews ≤ 2,000 · idealmente mediana del top 10 ≤ 400',
         /* Metadatos para la Fase 2: el promedio es un mal estadístico aquí y
            conviene migrar el motor a la mediana. Se deja documentado en vez de
            cambiar el campo hoy, para no romper el puntaje en producción. */
         campo_mejor: 'medianaReviewsTop10', umbral_mejor: 400, alerta_mejor: 800,
         nota_mx: 'OJO con el estadístico: el promedio de reseñas está dominado por outliers y engaña. Medido en MX: "organizador de closet" promedia 782 reseñas pero su mediana es 42; "tabla para picar" promedia 157 y su mediana es 31. Un solo gigante infla el promedio y hace ver inexpugnable un nicho penetrable. Pide SIEMPRE la mediana del top 10 además del promedio. Sobre 30 nichos: la mediana de reseñas del top 10 se distribuye p25=144 · p50=385 · p75=880, así que el umbral de 400 cae casi exactamente en la mediana del mercado. El promedio se distribuye p25=687 · p50=2,212 · p75=3,495. Contexto: en los nichos medidos, entre 28% y 80% de los productos tienen menos de 100 reseñas.' },

    5: { umbral_num: 299, alerta_num: 299,
         umbral: 'Average Price ≥ MXN 299 (ideal ≥ MXN 499)',
         nota_mx: 'MXN 299 es un piso COMERCIAL, no de rentabilidad — la distinción importa. Calculado con las tarifas oficiales, el punto de equilibrio real para 30% de margen cae en MXN 94 (costo 20), 136 (costo 40), 194 (costo 60) y 279 (costo 100): siempre POR DEBAJO de 299. Lo que manda casi nunca es el margen, sino perder envío gratis y Meses Sin Intereses (50% abandona el carrito sin MSI). Usa SophieFees.precioMinimoMX() para el piso real del producto concreto y toma el mayor de los dos. EXCEPCIÓN: en Salud y Cuidado personal, Alimentación y Bebidas alcohólicas la tarifa FBA es hasta 6x más barata bajo MXN 499 (un sobre de 100 g paga $4.50 en vez de $27), así que ahí sí conviene bajar de 299. Medido sobre 30 nichos: el precio promedio del top 10 se concentra en p25 MXN 270 · mediana MXN 322 · p75 MXN 543. Solo 2 de 30 nichos superan los MXN 900 de promedio, así que la banda de margen alto es mucho más delgada de lo que parece: el mercado mexicano vive entre MXN 270 y 545.' },

    7: { umbral_num: 20, alerta_num: 12,
         umbral: '≥ 20 keywords orgánicas tras filtrar',
         nota_mx: 'Baja de 30 a 20 porque la cola larga mexicana se agota antes: al medir, 4 de 7 keywords específicas de 3–4 palabras ("organizador de especias giratorio", "almohada cervical memoria", "tapete antiderrapante para tina", "porta cosmeticos de viaje") devolvieron CERO productos en la base de Helium 10 MX. En USA esas mismas búsquedas tienen nicho propio. El filtro de volumen en Cerebro también baja de 300 a 40.' },

    8: { umbral_num: 30, alerta_num: 20,
         umbral: 'Margen ≥ 30% antes de PPC · ROI ≥ 100% (sobre ingreso neto de IVA)',
         nota_mx: 'CRÍTICO: en México el precio de lista YA INCLUYE el IVA 16%. El margen se calcula sobre precio / 1.16, nunca sobre el precio de lista — hacerlo mal infla el margen ~13.8 puntos.' },

    10: { umbral_num: 30, alerta_num: 40,
          umbral: 'MOQ ≤ 300 · costo aterrizado ≤ 30% del precio',
          nota_mx: 'China dejó de ser el default en México: el impuesto a paquetería subió de 19% a 33.5% y la reforma de 2026 grava 1,371 fracciones con 5–50%. Origen EE.UU. o Canadá conserva preferencias del T-MEC. Suma siempre el costo del etiquetado NOM al costo aterrizado.' },

    12: { umbral: 'El nicho no está dominado por genéricos de MXN 150–300',
          nota_mx: 'El competidor a vencer no siempre es chino: en México también compites contra el mismo producto en Mercado Libre.' },

    13: { nota_mx: 'Además de categoría gated y patentes, verifica NOM-050 (etiquetado en español con RFC y domicilio del importador) y, si aplica, COFEPRIS para suplementos y cosméticos.' }
  };

  var FILTROS_MX = {
    blackBox: [
      { campo: 'Search Volume',       min: 500,   max: null, nota: 'sin máximo' },
      { campo: 'Monthly Sales Units', min: 50,    max: null },
      { campo: 'Review Count',        min: null,  max: 1000 },
      { campo: 'Monthly Revenue',     min: 80000, max: null, moneda: true },
      { campo: 'Price',               min: 299,   max: 2500, moneda: true, nota: 'ideal desde MXN 499' },
      { campo: 'Word Count',          min: 2,     max: null }
    ],
    cerebro: [
      { campo: 'Search Volume',                 min: 40, max: null },
      { campo: 'Match Type',                    valor: 'Organic' },
      { campo: 'Number of Organic Competitors', min: 3,  max: 10 },
      { campo: 'Competitor Organic Rank',       min: 1,  max: 45 }
    ]
  };


  /* ============================================================
     MODO COMPATIBILIDAD · productos de repuesto
     ------------------------------------------------------------
     Aplica a productos cuya demanda NO es descriptiva sino de
     COMPATIBILIDAD: el comprador busca un código o el aparato al
     que le sirve. Tóner y tinta (CF283A, TN-1060), autopartes,
     fundas y micas por modelo de celular, filtros, correas de
     reloj, baterías, refacciones de electrodoméstico.

     Qué cambia y por qué: quien teclea "CF283A" ya tiene la
     impresora y viene a comprar. La intención es de compra, no de
     exploración, así que la conversión es muy superior a la de un
     nicho descriptivo y un volumen bajo NO significa poca demanda.
     Aplicar el umbral normal daría NO GO a códigos rentables.

     ⚠️ Estos factores son de CRITERIO, no medidos: no tengo datos
     de conversión por código para calibrarlos. Se eligió dividir
     el umbral de volumen entre 3, que es conservador. Valídalos
     con ventas reales antes de darlos por firmes.
     ============================================================ */

  var UMBRALES_COMPAT = {
    us: {
      1: { umbral_num: 1500, alerta_num: 1000,
           umbral: 'SV ≥ 1,500 por código + tendencia estable',
           nota_compat: 'Umbral reducido: la búsqueda por código es de intención de compra.' },
      7: { umbral_num: 15, alerta_num: 8,
           umbral: '≥ 15 modelos o códigos compatibles',
           nota_compat: 'En un producto de repuesto las puertas de entrada no son sinónimos: son los APARATOS a los que le sirve. Un cartucho que cubre ocho impresoras tiene ocho rutas de venta.' }
    },
    mx: {
      1: { umbral_num: 150, alerta_num: 100,
           umbral: 'SV ≥ 150 por código + tendencia estable',
           nota_compat: 'Umbral reducido sobre el de México (500) por la misma razón: intención de compra.' },
      7: { umbral_num: 10, alerta_num: 6,
           umbral: '≥ 10 modelos o códigos compatibles',
           nota_compat: 'Cuenta los aparatos compatibles, no los sinónimos.' }
    }
  };

  /* Criterio que MANDA en este modo: el 13 (barreras de entrada). Los repuestos
     compatibles viven cerca de patentes, chips propietarios y marcas registradas.
     Verificarlo ANTES de comprar inventario, no al final. */
  var NOTA_COMPAT_13 = 'MODO COMPATIBILIDAD: este criterio pasa a ser el primero, no el último. Los repuestos compatibles conviven con patentes vigentes, chips propietarios y marcas en Brand Registry, y ahí es donde se pierde el inventario. Antes de comprar: revisa patentes del consumible y del chip, si la marca original restringe la categoría, y si está gated en Seller Central.';

  /* Devuelve la lista de criterios con los umbrales del mercado pedido.
     'us' (o sin argumento) devuelve los canónicos, sin copiar nada. */
  function criteriosDe(mercado, opts) {
    var mx = String(mercado || 'us').toLowerCase() === 'mx';
    var compat = !!(opts && opts.compatibilidad);
    if (!mx && !compat) return CRITERIOS;          // caso de siempre: misma referencia
    var capaCompat = compat ? (UMBRALES_COMPAT[mx ? 'mx' : 'us'] || {}) : {};
    return CRITERIOS.map(function (c) {
      var ovMx = mx ? UMBRALES_MX[c.id] : null;
      var ovCo = capaCompat[c.id];
      if (!ovMx && !ovCo && !(compat && c.id === 13)) return c;
      var copia = {}, k;
      for (k in c) if (Object.prototype.hasOwnProperty.call(c, k)) copia[k] = c[k];
      if (ovMx) for (k in ovMx) if (Object.prototype.hasOwnProperty.call(ovMx, k)) copia[k] = ovMx[k];
      // La capa de compatibilidad va DESPUÉS de la de mercado: es la más específica.
      if (ovCo) for (k in ovCo) if (Object.prototype.hasOwnProperty.call(ovCo, k)) copia[k] = ovCo[k];
      if (compat && c.id === 13) copia.nota_compat = NOTA_COMPAT_13;
      if (mx) copia.mercado = 'mx';
      if (compat) copia.compatibilidad = true;
      return copia;
    });
  }

  function filtrosDe(mercado) {
    return String(mercado || 'us').toLowerCase() === 'mx' ? FILTROS_MX : FILTROS;
  }

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
    version: '2.2',
    // lista/filtros = Amazon USA (canónicos; son los que valida la guarda).
    lista: CRITERIOS,
    escala: ESCALA,
    filtros: FILTROS,
    vetos: VETOS,
    // Capa de mercado: mismos 13 criterios, umbrales recalibrados para México.
    criteriosDe: criteriosDe,
    filtrosDe: filtrosDe,
    umbralesMX: UMBRALES_MX,
    umbralesCompat: UMBRALES_COMPAT,
    mercados: ['us', 'mx'],
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
