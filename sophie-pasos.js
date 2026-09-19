/* ============================================================
   SOPHIE · PASOS GUIADOS v1.3
   Crezcamos Online — ui.crezcamosonline.com/sophie-pasos.js

   El guion de los pasos 1, 2, 3, 4, 5 y 7 vive aquí, no en el
   prompt. Es texto idéntico para todos los estudiantes: hacer
   que el modelo lo reescriba en cada turno es pagar y esperar
   por algo que ya está escrito.

   Produce el MISMO HTML que hoy (clases s-head, s-body, s-card…),
   así que el estudiante no ve ningún cambio visual: solo velocidad.

   Para mejorar una instrucción se edita este archivo y se despliega.
   Cambia para todos los módulos y de inmediato.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- utilidades ---------- */

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Sustituye [keyword], [categoria], [producto] por los valores del expediente.
  function vars(txt, v) {
    v = v || {};
    return String(txt).replace(/\[(\w+)\]/g, function (m, k) {
      return v[k] !== undefined && v[k] !== '' ? esc(v[k]) : m;
    });
  }

  /* ---------- mapa de pasos ---------- */

  var MAPA = {
    1: { etiqueta: 'Inicio',                     pct: 11 },
    2: { etiqueta: 'Categoría',                  pct: 22 },
    3: { etiqueta: 'Filtros en Black Box',       pct: 33 },
    4: { etiqueta: 'Validación de keyword',      pct: 44 },
    5: { etiqueta: 'Recolección de datos',       pct: 56 },
    6: { etiqueta: 'Fase 1 — Validación inicial', pct: 67 },
    7: { etiqueta: 'Datos para Fase 2',          pct: 78 },
    8: { etiqueta: 'Fase 2 — Validación avanzada', pct: 89 },
    9: { etiqueta: 'Veredicto final',            pct: 100 }
  };

  // Con datos reales cambian dos etiquetas: ya no se filtra en Black Box ni se
  // recolecta de Xray. Dejarlas rompia la ilusion antes de leer una sola linea.
  var ETIQUETAS_DATOS = { 2: 'Categoria y subnicho', 3: 'Buscando candidatos', 5: 'Limpiar la tabla' };

  // PANTALLAS QUE NO PIDEN NADA AL ESTUDIANTE.
  //
  // El paso 4 con datos reales dice "Eso lo miro yo... dame un momento y te digo
  // cual manda de verdad" — y ahi se acababa el turno. El estudiante se quedaba
  // mirando un 👇 que apunta a una caja de texto donde no tiene nada que
  // escribir. Sophie prometia algo y no lo hacia: no por un fallo suyo, sino
  // porque un chat va por turnos y nadie habia pedido el siguiente.
  //
  // Estas pantallas se marcan, y la aplicacion continua sola. Si una pantalla
  // PIDE algo (capital, intereses, marcar competidores) NO entra aqui: ahi el
  // turno tiene que parar, que para eso se pregunta.
  var AUTO_DATOS = { 4: true };

  // EL MAPA DEL METODO. Lo que el estudiante aprendia haciendo los clics.
  //
  // Automatizar un paso no puede significar dejar de ensenarlo. Cuando la
  // busqueda la hacia el a mano, el metodo se le quedaba en los dedos; ahora la
  // hace Sophie y la barra de arriba solo le dice un numero de paso. Esto es lo
  // que va debajo del numero.
  //
  // NOMBRES NEUTRALES A PROPOSITO. `etiqueta` dice la herramienta ("Filtros en
  // Black Box") porque encabeza una pantalla concreta; `nombre` dice el PASO
  // DEL METODO, que es el mismo tanto si lo hace el estudiante en Helium 10
  // como si lo trae Sophie. La herramienta es un detalle de implementacion del
  // metodo, no al reves — y un mapa que cambiara de nombres segun quien tiene
  // datos estaria ensenando dos metodos distintos.
  //
  // `porque` es el curriculum. No describe el clic: dice por que el metodo hace
  // ese paso en ese orden, que es lo unico que el estudiante se lleva cuando
  // deje de usar Sophie.
  var METODO = {
    1: { etapa: 1, nombre: 'Por dónde empiezas',
         que: 'Eliges si partimos de lo que te interesa, de una idea tuya, o de un producto que ya validaste.',
         porque: 'El punto de partida cambia el riesgo. Partir del mercado da mejores productos que enamorarse de una idea y buscar después los datos que le den la razón.' },
    2: { etapa: 1, nombre: 'El terreno',
         que: 'Eliges la categoría y, si puedes, el subnicho.',
         porque: 'Hay categorías que piden permiso a Amazon. Un primer producto no puede jugarse el pedido entero a que te lo aprueben, así que esas quedan fuera antes de mirar un solo número.' },
    3: { etapa: 1, nombre: 'Buscar candidatos',
         que: 'Se filtra el catálogo de Amazon por precio, peso, reseñas, facturación y lo que a ti te interesa.',
         porque: 'Primero se acota el terreno con números y solo después se mira producto por producto. Al revés uno se queda con el primero que le gustó y ya no lo suelta.' },
    4: { etapa: 2, nombre: 'Validar la keyword',
         que: 'Tres filtros: que no la domine una marca, que sea específica, y que traiga productos parecidos entre sí.',
         porque: 'Si mides el mercado con la palabra equivocada, todo lo que sigue —el análisis, el listing, las campañas— apunta al mercado equivocado. Es el error que más caro sale y casi nadie lo revisa.' },
    5: { etapa: 3, nombre: 'La tabla limpia',
         que: 'Se quitan de la tabla los productos que no compiten con lo que tú piensas vender.',
         porque: 'Los promedios solo valen sobre la tabla limpia. Buscar un accesorio devuelve también los sets que lo incluyen, con otro precio y otro peso: promediar el revoltijo deja todo el análisis mal sin que nadie lo note.' },
    6: { etapa: 3, nombre: 'Fase 1 — el mercado',
         que: 'Demanda, ingresos, cómo se reparten, reseñas y precio.',
         porque: 'Aquí se decide si el mercado existe y si deja entrar gente nueva. Un mercado que no deja entrar no se arregla con un producto mejor.' },
    7: { etapa: 3, nombre: 'Lo que solo tú puedes traer',
         que: 'Tu costo de proveedor, tu capital, las reseñas de 1 y 2 estrellas, las patentes y los permisos.',
         porque: 'Los vetos que ningún dato ve —patente, categoría restringida, costo real, margen— son justo los que quiebran negocios. Por eso esos los traes tú, y no se delegan.' },
    8: { etapa: 3, nombre: 'Fase 2 — tu negocio',
         que: 'Margen antes de PPC, ROI, sourcing, capital y barreras de entrada.',
         porque: 'El mercado puede ser bueno y el negocio malo. Esta fase no pregunta si el nicho sirve: pregunta si TÚ puedes hacerlo, con tu dinero y tu proveedor.' },
    9: { etapa: 4, nombre: 'Veredicto',
         que: 'GO o NO GO, con el porqué y el siguiente paso.',
         porque: 'Un veto no se compensa con criterios verdes. Y un NO GO nunca se queda sin salida: lo que hace abandonar no es el rechazo, es quedarse sin saber qué hacer después.' }
  };

  var ETAPAS = { 1: 'Investigación', 2: 'Validación', 3: 'Análisis', 4: 'Veredicto' };

  function cabecera(paso, datos) {
    var m = MAPA[paso] || MAPA[1];
    if (datos && ETIQUETAS_DATOS[paso]) m = { etiqueta: ETIQUETAS_DATOS[paso], pct: m.pct };
    return '<div class="s-head">' +
      '<div class="s-brand"><span class="s-logo">🛒</span><div>' +
      '<div class="s-name">Crezcamos Online</div>' +
      '<div class="s-sub">Sophie · Selección de producto</div></div></div>' +
      '<div class="s-prog"><span>Paso ' + paso + ' de 9 — ' + esc(m.etiqueta) + '</span>' +
      '<span>' + m.pct + '%</span></div>' +
      '<div class="s-bar"><i style="width:' + m.pct + '%"></i></div></div>';
  }

  // Chips de lo ya confirmado. Se arman del estado, no los escribe el modelo.
  function chips(lista) {
    if (!lista || !lista.length) return '';
    return lista.map(function (t) {
      return '<div class="s-done">✓ ' + esc(t) + '</div>';
    }).join('');
  }


  /* ---------- categorias para el DESCUBRIMIENTO ----------

     Las ocho de la pantalla 2 vienen de Black Box, donde el estudiante elegia UNA
     de una lista corta. Con `descubrir` la categoria viaja como filtro real a la
     API, asi que ya no hay razon para limitarse a ocho cajones enormes: se puede
     buscar en un subnicho concreto, que es donde de verdad se encuentran huecos.

     Las que estan bloqueadas siguen bloqueadas, y no por comodidad: piden
     certificaciones, tienen regulacion estricta o Amazon las restringe a
     vendedores nuevos. Un principiante que entra ahi pierde el pedido entero.
     -------------------------------------------------------- */

  // EN INGLES, Y NO ES UN DETALLE DE ESTILO.
  //
  // Estos nombres no son etiquetas: viajan como filtro real a la consulta
  // `descubrir`, contra el catalogo de Amazon USA. "Tejido y crochet" no existe
  // ahi; "Knitting & Crochet" si. Traducirlos al español para que se lean
  // bonito y mandar otra cosa por debajo seria enseñar un vocabulario que no
  // sirve el dia que el estudiante busque por su cuenta.
  var CATEGORIAS_DESCUBRIR = {
    'Arts, Crafts & Sewing':    ['Embroidery & Sewing', 'Knitting & Crochet', 'Scrapbooking', 'Painting & Drawing', 'Candle & Soap Making', 'Jewelry Making'],
    'Home & Kitchen':           ['Home Organization', 'Bedding', 'Bath', 'Home Décor', 'Laundry', 'Kitchen Storage'],
    'Kitchen & Dining':         ['Cookware', 'Bakeware', 'Coffee & Tea', 'Dinnerware & Serving', 'Food Prep', 'Bar & Cocktail'],
    'Office Products':          ['Desk Organization', 'Stationery & Planners', 'School Supplies', 'Filing & Storage', 'Ergonomics'],
    'Patio, Lawn & Garden':     ['Indoor Gardening', 'Planters & Growing', 'Garden Tools', 'Outdoor & Patio', 'Composting', 'Pest Control'],
    'Pet Supplies':             ['Dog Toys', 'Dog Grooming', 'Cat Scratching & Play', 'Feeders & Waterers', 'Birds & Small Pets', 'Aquariums'],
    'Sports & Outdoors':        ['Yoga & Home Fitness', 'Camping', 'Fishing', 'Cycling Accessories', 'Racquet Sports', 'Swimming'],
    'Tools & Home Improvement': ['Workshop Organization', 'Measuring Tools', 'Hardware & Fasteners', 'Paint & Finishing', 'Home Security', 'Plumbing'],
    'Toys & Games':             ['Board Games', 'Puzzles', 'Educational Toys', "Kids' Crafts", 'Outdoor Play'],
    'Musical Instruments':      ['Guitar Accessories', 'Percussion', 'Keyboard Accessories', 'Home Recording'],
    'Baby Products':            ['Nursery Organization', 'Nursery Décor', 'Feeding Accessories']
  };

  // Baby lleva aviso propio: la categoria esta abierta, pero la mitad de lo que
  // hay dentro (sillas, cunas, arneses) exige certificacion CPSC y esta en la
  // lista bloqueada de abajo. Se ofrece acotada, no entera.
  var CATEGORIAS_OJO = { 'Baby Products': 'Solo organizacion y decoracion. Nada que sujete, alimente o transporte a un bebe: eso exige certificacion.' };

  // Categorias que NO se ofrecen, con el motivo. Va aqui y no en un comentario
  // porque el estudiante tiene derecho a saber por que no aparece la suya.
  var CATEGORIAS_BLOQUEADAS = {
    'Electronics':                 'Certificaciones FCC y alta tasa de devolucion por fallo.',
    'Health & Personal Care':      'Regulacion FDA y restricciones para vendedores nuevos.',
    'Beauty':                      'Ingredientes regulados y categoria con gating frecuente.',
    'Grocery & Gourmet Food':      'Caducidad, cadena de frio y permisos sanitarios.',
    'Automotive':                  'Compatibilidad por vehiculo y responsabilidad por fallo.',
    'Baby: seguridad':             'Sillas, cunas y arneses exigen certificacion CPSC.',
    'Supplements':                 'De las categorias mas restringidas de Amazon.'
  };

  /* ---------- banners de logro entre etapas ---------- */

  var WINS = {
    4: '💪 ¡Lo lograste! Ya tienes un producto candidato con números reales. La mayoría se lanza aquí, a ciegas — tú no. Ahora confirmamos que la gente REALMENTE busca y compra esto. Siguiente fase: validar tu keyword.',
    5: '🎯 ¡Keyword confirmada! Ya sabes que hay demanda y por qué palabra se compra este producto. Ahora viene lo serio: pasarlo por los criterios para saber si es un ganador o una trampa. Siguiente fase: el análisis a fondo.',
    9: '🔥 ¡Completaste el análisis más riguroso que existe para validar un producto en Amazon! Llegó el momento de la verdad. Siguiente fase: tu veredicto GO / NO GO.'
  };

  /* ============================================================
     CONTENIDO DE CADA PASO
     Cada función devuelve lo que va DENTRO de <div class="s-body">
     ============================================================ */

  var PASOS = {

    /* ---- 1 · Bienvenida y elección de camino ---- */
    1: function () {
      return '<h1>¡Hola! Soy Sophie 👋</h1>' +
        '<p class="s-lead">Tu especialista en selección de producto de Crezcamos Online. ' +
        'Vamos a encontrar y validar tu producto juntos, paso a paso.</p>' +
        '<div class="s-card">' +
          '<p>Para empezar, dime en qué punto estás hoy:</p>' +
          '<div class="s-grid">' +
            // El texto NO nombra ninguna herramienta, y es a proposito: esta
            // pantalla la pinta la app sin llamar al modelo, asi que aqui no se
            // sabe si el estudiante tiene datos reales. Tiene que ser cierta en
            // los dos casos — antes decia "desde cero en Helium 10", que para
            // quien tiene Jungle Scout ya era falso.
            //
            // Y A deja de sonar a confesion de ignorancia. Con el
            // descubrimiento cableado es el camino FUERTE, no el de consolacion:
            // partir sin idea y dejarse guiar por el mercado da mejores
            // productos que enamorarse de uno antes de mirar los numeros.
            '<div class="s-opt"><span class="s-num">A</span> Quiero que busquemos el producto juntos, partiendo de lo que me interesa.</div>' +
            '<div class="s-opt"><span class="s-num">B</span> Ya tengo una idea de producto o vi algo que me llamó la atención.</div>' +
            '<div class="s-opt"><span class="s-num">C</span> Ya validé un producto contigo antes y quiero analizar uno nuevo (modo express).</div>' +
          '</div>' +
        '</div>' +
        '<div class="s-cta">¿Cuál es tu caso? Escribe A, B o C 👇</div>';
    },

    /* ---- 2 · Categoría (solo Camino A) ---- */
    2: function () {
      return '<h1>Elige tu categoría</h1>' +
        '<p class="s-lead">Vamos a usar Black Box de Helium 10 con los filtros optimizados para 2026, ' +
        'diseñados para encontrar nichos con demanda real comprobada, no solo con búsquedas.</p>' +
        '<p>Abre Helium 10 → <b>Tools → Black Box → pestaña Keywords</b>. Selecciona UNA de estas ' +
        'categorías recomendadas para principiantes:</p>' +
        '<div class="s-grid">' +
          '<div class="s-opt"><span class="s-num">1</span> Arts, Crafts &amp; Sewing</div>' +
          '<div class="s-opt"><span class="s-num">2</span> Home &amp; Kitchen</div>' +
          '<div class="s-opt"><span class="s-num">3</span> Kitchen &amp; Dining</div>' +
          '<div class="s-opt"><span class="s-num">4</span> Office Products</div>' +
          '<div class="s-opt"><span class="s-num">5</span> Patio, Lawn &amp; Garden</div>' +
          '<div class="s-opt"><span class="s-num">6</span> Pet Supplies</div>' +
          '<div class="s-opt"><span class="s-num">7</span> Sports &amp; Outdoors</div>' +
          '<div class="s-opt"><span class="s-num">8</span> Tools &amp; Home Improvement</div>' +
        '</div>' +
        '<div class="s-why"><b>¿Por qué estas y no otras?</b>' +
          '<p>Tienen alta demanda, sin restricciones de entrada para vendedores nuevos y márgenes manejables.</p>' +
          '<p class="s-warn">Evita Electronics, Health &amp; Beauty, Grocery, Baby y Automotive — requieren ' +
          'certificaciones, tienen regulaciones estrictas o Amazon los tiene restringidos para nuevos sellers.</p>' +
        '</div>' +
        '<div class="s-cta">¿Cuál elegiste? Dime el número o el nombre 👇</div>';
    },

    /* ---- 3 · Filtros de Black Box ---- */
    3: function (v) {
      return '<h1>Configura estos filtros</h1>' +
        '<p class="s-lead">Con <b>[categoria]</b> seleccionada, aplica exactamente estos filtros en Black Box → Keywords.</p>' +
        '<ul class="s-list">' +
          '<li><b>Search Volume</b> (mínimo): 4,500 — sin máximo</li>' +
          '<li><b>Monthly Sales Units</b> (mínimo): 300</li>' +
          '<li><b>Review Count</b> (máximo): 500</li>' +
          '<li><b>Monthly Revenue</b> (mínimo): $4,500</li>' +
          '<li><b>Price</b> (mínimo): $20 — ideal desde $25</li>' +
          '<li><b>Price</b> (máximo): $60</li>' +
          '<li><b>Word Count</b> (mínimo): 2</li>' +
        '</ul>' +
        '<h2>¿Por qué estos filtros específicos?</h2>' +
        '<div class="s-card">' +
          '<p><b>Search Volume ≥ 4,500</b>, sin máximo: asegura un ecosistema de keywords con tráfico real, ' +
          'para que el producto indexe y genere ventas orgánicas constantes. No le ponemos techo: más demanda ' +
          'nunca es algo que quieras filtrar fuera.</p>' +
          '<p><b>Monthly Sales Units ≥ 300</b>: el filtro más importante que la mayoría omite. El volumen de ' +
          'búsqueda mide intención; las unidades vendidas miden comportamiento real. Un nicho puede tener 10,000 ' +
          'búsquedas y solo 50 ventas al mes — eso es un nicho de curiosos, no de compradores.</p>' +
          '<p><b>Review Count ≤ 500</b>: este es el filtro de descubrimiento, más permisivo que el criterio de ' +
          'evaluación posterior. Queremos ver más nichos para que tengas mayor superficie de candidatos. En Fase 1 ' +
          'aplicamos un criterio más estricto que descarta los quemados. La diferencia es intencional: el filtro ' +
          'abre la puerta, el criterio cierra la trampa.</p>' +
          '<p><b>Monthly Revenue ≥ $4,500/mes</b>: valida que el nicho tiene tamaño comercial saludable y evita ' +
          'que pierdas tiempo en mercados muertos que no cubrirían tus costos operativos.</p>' +
          '<p><b>Price desde $20</b>: las tarifas FBA subieron fuerte. Hoy un producto de $15 con FBA ($3–5), ' +
          'comisión del 15% ($2.25) y COGS ($3) no deja margen real. El piso viable es $20; el objetivo, $25+.</p>' +
          '<p><b>Word Count ≥ 2</b>: las keywords de una palabra (bag, mat, kit) son demasiado genéricas y mezclan ' +
          'productos distintos. Con mínimo 2 palabras llegas a keywords con intención de compra definida, que es ' +
          'donde viven los nichos más rentables.</p>' +
        '</div>' +
        '<div class="s-why"><b>💡 Consejo</b>' +
          '<p>Si los resultados son muy pocos, no toques el Search Volume ni las Units — juega con el precio en ' +
          'rangos estrechos: $20–$30, luego $30–$40, luego $40–$60. Cada rango te muestra oportunidades distintas.</p>' +
        '</div>' +
        '<div class="s-cta">Haz clic en Search y dime 3 a 5 productos o keywords que te llamaron la atención 👇</div>';
    },

    /* ---- 4 · Validación de keyword con Cerebro (tras pasar los 3 filtros) ---- */
    4: function (v) {
      return '<h1>Confirmemos la keyword real del nicho</h1>' +
        '<p class="s-lead">Tu keyword <b>[keyword]</b> pasó los 3 primeros filtros. Pero esos solo confirman que ' +
        'es limpia y específica.</p>' +
        '<p>Todavía no sabemos si es la palabra con la que el mercado <b>realmente compra</b> este producto, ni si ' +
        'hay demanda suficiente. Eso lo confirmamos con Cerebro, que cruza las keywords de varios competidores a la ' +
        'vez. Este es el paso que casi todos hacen mal o se saltan. Hazlo conmigo, sin adelantarte.</p>' +
        '<div class="s-card">' +
          '<p><b>Paso 1 — Reutiliza tu tabla de Xray.</b> Usa la tabla de Xray Product Research que ya abriste y ' +
          'limpiaste, con los productos no similares descartados. Si no la tienes abierta, busca <b>[keyword]</b> ' +
          'en amazon.com en inglés, activa Helium 10 y abre Xray.</p>' +
          '<p><b>Paso 2 — Marca a tus competidores reales.</b> Ordena por <b>ASIN Sales</b> y marca la casilla de ' +
          'los 10 que más venden y se parezcan a tu producto. Ignora accesorios, repuestos o cosas de otra ' +
          'categoría. Si hay menos de 10 similares, marca los que haya (mínimo 5 o 6).</p>' +
          '<p><b>Paso 3 — Run Cerebro sobre todos a la vez.</b> Con esas casillas marcadas, clic en <b>Run Cerebro</b> ' +
          'arriba de la tabla. Vemos por qué palabras compite el mercado entero, no un solo producto.</p>' +
          '<p><b>Paso 4 — Aplica exactamente estos filtros</b> y dale Apply Filters:</p>' +
        '</div>' +
        '<ul class="s-list">' +
          '<li><b>Search Volume</b> → Min: 300</li>' +
          '<li><b>Match Type</b> → Organic</li>' +
          '<li><b>Number of Organic Competitors</b> → ASIN Min: 3 · ASIN Max: 10</li>' +
          '<li><b>Competitor Organic Rank</b> → Rank Min: 1 · Rank Max: 45</li>' +
        '</ul>' +
        '<div class="s-why"><b>Qué acabas de hacer</b>' +
          '<p>Le pediste a Cerebro solo las keywords con demanda real (≥300 búsquedas/mes) por las que entre 3 y 10 ' +
          'de esos competidores aparecen de forma orgánica en la primera página o cerca. Ese filtro de "al menos 3 ' +
          'competidores" limpia el ruido: deja las palabras que de verdad mueven ventas, no las que un solo producto ' +
          'rankea por casualidad. Son los mismos filtros con los que medimos la demanda, así que el número nos sirve doble.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>Paso 5 — Ordena por volumen.</b> Clic en el encabezado <b>Search Volume</b> para ordenar de mayor a ' +
          'menor. La keyword de hasta arriba es la palabra raíz del nicho.</p>' +
        '</div>' +
        '<h2>Ahora cópiame estos datos</h2>' +
        '<div class="s-card">' +
          '<p><b>📋 Para validar la keyword</b></p>' +
          '<ul class="s-list">' +
            '<li>Keyword #1 por volumen (la de más arriba)</li>' +
            '<li>Su Search Volume</li>' +
            '<li>¿Esa keyword #1 es igual, parecida o distinta a la que elegiste?</li>' +
            '<li>¿Tu keyword principal aparece dentro de la lista filtrada? (sí / no)</li>' +
          '</ul>' +
          '<p><b>📋 Demanda del mercado</b></p>' +
          '<ul class="s-list">' +
            '<li>¿Cuántas keywords quedaron en total tras aplicar los filtros? Cerebro lo muestra arriba de la tabla</li>' +
          '</ul>' +
          '<p><b>📋 Tus competidores (para tu expediente)</b></p>' +
          '<ul class="s-list">' +
            '<li>Los ASINs que marcaste para Run Cerebro, separados por coma. Cuando construyas el listing con ' +
            'Sophie Listing los vas a reutilizar tal cual, sin buscarlos de nuevo</li>' +
          '</ul>' +
        '</div>' +
        '<div class="s-cta">Pégame los datos y seguimos 💪</div>';
    },

    /* ---- 5 · Recolección de datos de Xray ---- */
    5: function (v) {
      return '<h1>Recolectemos los datos del mercado</h1>' +
        '<p class="s-lead"><b>[keyword]</b> es tu keyword principal. Búscala en Amazon, activa Xray y activa ' +
        '<b>Hide Sponsored Products</b>.</p>' +
        '<div class="s-why"><b>⚠️ Antes de darme los datos</b>' +
          '<p>En Xray, elimina los productos que NO sean similares a lo que quieres vender: accesorios, repuestos, ' +
          'variantes raras, multipacks o productos de otra categoría. Deja solo competidores reales.</p>' +
          '<p class="s-warn">Los promedios se recalculan según lo que dejes. Si no limpias, el análisis mide un ' +
          'mercado equivocado y todo lo que sigue queda contaminado.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>📋 Resumen general (header de Xray)</b></p>' +
          '<ul class="s-list">' +
            '<li>Search Volume</li>' +
            '<li>Tendencia del volumen: ¿la gráfica de los últimos 12 meses sube, está estable o baja?</li>' +
            '<li>Total Revenue (top 10)</li>' +
            '<li>Average Revenue</li>' +
            '<li>Average Price</li>' +
            '<li>Average BSR</li>' +
            '<li>Average Reviews</li>' +
          '</ul>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>📋 Top 5 productos por ASIN Sales</b></p>' +
          '<p>Selecciona las 5 filas de mayor ventas y pégalas tal cual, con sus columnas. No escribas campo por ' +
          'campo: copia y pega, y yo extraigo lo que necesito.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>📋 Prueba de entrada</b> — 30 segundos, casi nadie la hace</p>' +
          '<p>En la tabla de Xray busca la columna <b>Creation Date</b>. ¿Cuántos de los 10 que más venden se ' +
          'lanzaron en los últimos 12 meses? Dame el número.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>📋 Tu situación</b></p>' +
          '<ul class="s-list">' +
            '<li>Capital disponible para invertir</li>' +
            '<li>Costo estimado por unidad en Alibaba, si ya lo consultaste</li>' +
          '</ul>' +
        '</div>' +
        '<div class="s-why"><b>Nota sobre variaciones</b>' +
          '<p>Si varios resultados son variaciones del mismo producto padre (colores o tamaños del mismo listing), ' +
          'cuéntalos como UN solo competidor. El revenue fragmentado entre variaciones engaña los promedios.</p>' +
        '</div>' +
        '<div class="s-cta">Cuando tengas todo, pégalo aquí 💪</div>';
    },

    /* ---- 7 · Datos para Fase 2 ---- */
    7: function (v) {
      return '<h1>Datos para la Fase 2</h1>' +
        '<p class="s-lead">Tu producto pasa a la Validación Avanzada. Necesito 4 datos más antes del veredicto final.</p>' +
        '<div class="s-card">' +
          '<p><b>Paso A — Demanda del mercado (Cerebro)</b></p>' +
          '<p>Ya lo tenemos de la validación de keyword: mismos 10 competidores, mismos filtros. No lo repitas.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>Paso B — Reseñas negativas (diferenciación)</b></p>' +
          '<ul class="s-list">' +
            '<li>Abre en Amazon los 2-3 productos con más ventas de tu nicho</li>' +
            '<li>Filtra reseñas por 1 y 2 estrellas</li>' +
            '<li>Lee las primeras 15-20 negativas de cada uno</li>' +
            '<li>Dime las 3 quejas más repetidas</li>' +
            '<li>¿Hay alguna intención o escenario que el producto actual no atiende bien? ' +
            'Busca frases tipo "ojalá sirviera para…" o "lo compré para X y no funcionó"</li>' +
          '</ul>' +
          '<p>Si tu plan de Helium 10 incluye <b>Review Insights</b>, úsalo. Si no aparece, ve directo a Amazon — ' +
          'el resultado es idéntico.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>Paso C — Verificación en Alibaba</b></p>' +
          '<ul class="s-list">' +
            '<li>¿Existe el producto? ¿Cuál es el rango de precio por unidad?</li>' +
            '<li>¿El MOQ es manejable, menos de 500 unidades?</li>' +
            '<li>¿De qué país sale el producto?</li>' +
            '<li>¿La cotización es DDP (incluye flete y aranceles) o FOB/EXW (van aparte)?</li>' +
          '</ul>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>Paso D — Costo de publicidad</b></p>' +
          '<p>En Cerebro, busca tu keyword principal y dime el <b>Suggested PPC Bid</b> que aparece.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>Paso E — Barreras de entrada</b></p>' +
          '<ul class="s-list">' +
            '<li>¿Cuántas reseñas tienen los 3 productos líderes? Dame el número de cada uno</li>' +
            '<li>¿La categoría está gated? Verifícalo en 60 segundos: Seller Central → Catálogo → Agregar productos ' +
            '→ busca el ASIN de un competidor líder. Si dice <b>Vender este producto</b>, está abierta. Si dice ' +
            '<b>Solicitar aprobación</b>, está gated</li>' +
            '<li>¿Ves alguna patente o marca registrada fuerte que domine el nicho?</li>' +
          '</ul>' +
          '<p>Si todavía no tienes cuenta de Seller Central, dímelo y lo marcamos como pendiente antes del pedido.</p>' +
        '</div>' +
        '<div class="s-why"><b>¿Por qué estos datos?</b>' +
          '<p>El margen, el sourcing con aranceles, la diferenciación COSMO y las barreras de entrada son los 4 ' +
          'factores que más negocios quiebran después del lanzamiento. Los verificamos antes de invertir, no después.</p>' +
        '</div>' +
        '<div class="s-cta">Pega los datos de los 5 pasos, o los que ya tengas, y seguimos 👇</div>';
    }
  };


  /* ---------- pasos CON DATOS REALES (Jungle Scout) ----------

     Los mismos pasos, pero sin mandar al estudiante a recolectar lo que Sophie
     ya tiene. Solo se usan cuando la pantalla llega con `datos: true`.

     Por que es una TABLA APARTE y no un parche sobre la de arriba: se intento
     primero decirle al modelo "no le pidas que abra Xray" desde el prompt, y no
     funciono. Es logico — enfrente tenia esta pantalla, escrita al detalle, con
     los filtros exactos y las casillas que pegar. Una prohibicion corta no gana
     contra una instruccion larga y concreta. Habia que quitar la instruccion.

     La de arriba NO se toca: es la unica que sirve para quien no tiene datos
     reales, que hoy son casi todos.
     ---------------------------------------------------------- */

  var PASOS_DATOS = {

    /* ---- 2 · Categoria: ya no son ocho cajones, son subnichos ---- */
    2: function (v) {
      // SE ELIGE CON EL DEDO, NO ESCRIBIENDO. Antes esto era una lista dentro de
      // un parrafo y el estudiante tenia que teclear la categoria: se
      // equivocaba de nombre, escribia el subnicho en español, o ponia uno que
      // no existe. Cada una de esas tres cosas manda un filtro que Amazon no
      // reconoce y devuelve una busqueda vacia sin decir por que.
      //
      // Pulsando, lo que sale es exactamente el nombre que entiende la API.
      var h = '<h1>Elige dónde buscamos</h1>' +
        '<p class="s-lead">Pulsa el subnicho que te interese. Cuanto más concreto, más posibilidades ' +
        'de encontrar un hueco que nadie está mirando — y si prefieres abrir el abanico, pulsa la ' +
        'categoría entera.</p>';

      Object.keys(CATEGORIAS_DESCUBRIR).forEach(function (cat) {
        h += '<div class="s-cat">' +
          '<button type="button" class="s-cat-t" data-pick="' + esc(cat) + '">' +
            esc(cat) + '<span class="s-cat-all">toda la categoría</span>' +
          '</button>';
        if (CATEGORIAS_OJO[cat]) h += '<p class="s-cat-ojo">' + esc(CATEGORIAS_OJO[cat]) + '</p>';
        h += '<div class="s-cat-s">' +
          CATEGORIAS_DESCUBRIR[cat].map(function (s) {
            return '<button type="button" class="s-pick" data-pick="' + esc(cat) + ' → ' + esc(s) + '">' +
              esc(s) + '</button>';
          }).join('') +
          '</div></div>';
      });

      h += '<div class="s-why"><b>Las que no vas a ver, y por qué</b><p>' +
        Object.keys(CATEGORIAS_BLOQUEADAS).map(function (c) {
          return esc(c) + ': ' + esc(CATEGORIAS_BLOQUEADAS[c]);
        }).join(' ') +
        '</p><p class="s-warn">No es que no se pueda vender ahí. Es que un primer producto en esas ' +
        'categorías se juega el pedido entero a que te aprueben un permiso.</p></div>';
      h += '<div class="s-cta">Pulsa una y arrancamos 👇</div>';
      return h;
    },

    /* ---- 3 · Sophie busca los candidatos (sustituye a Black Box) ---- */
    3: function (v) {
      return '<h1>Voy a buscarte candidatos</h1>' +
        '<p class="s-lead">Con <b>[categoria]</b> elegida, yo hago la busqueda. No necesitas abrir ninguna ' +
        'herramienta.</p>' +
        '<div class="s-card">' +
          '<p><b>Lo que voy a filtrar por ti</b></p>' +
          '<ul class="s-list">' +
            '<li><b>Precio</b> desde $20 — por debajo de ahi las tarifas de Amazon se comen el margen</li>' +
            '<li><b>Resenas</b> maximo 500 — los mercados amurallados quedan fuera</li>' +
            '<li><b>Revenue</b> minimo real, para que el nicho tenga dinero de verdad</li>' +
            '<li><b>Sin marcas dominantes</b>, que son las que no te dejan entrar</li>' +
          '</ul>' +
        '</div>' +
        // SIN ADVERTENCIA. Aqui habia un `s-warn` —rojo, con "esto no es
        // relleno"— explicando que si treinta estudiantes buscan igual acaban
        // compitiendo entre ellos. Cierto, pero en el paso 3 el estudiante aun
        // no tiene con que preocuparse: se le estaba dando una alarma antes que
        // un producto. La personalizacion se consigue PREGUNTANDO bien, no
        // avisando de lo que pasa si no contesta.
        //
        // Las tres defensas anti-clon siguen intactas: viven en el motor
        // (repartir() con semilla por persona, yaTomados(), y la cache de
        // descubrimiento por usuario), no en este parrafo.
        '<div class="s-why"><b>Para ajustarlo a ti</b>' +
          '<p>Dime dos cosas y la busqueda sale distinta: <b>cuanto capital tienes</b> para el primer pedido, y ' +
          '<b>que te interesa de verdad</b> — un hobby que practicas, un problema que conoces, algo que ya compras.</p>' +
        '</div>' +
        '<div class="s-cta">Dime tu capital y que temas te interesan 👇</div>';
    },

    /* ---- 4 · La keyword raiz la confirmo yo ---- */
    4: function (v) {
      return '<h1>Confirmemos la keyword real del nicho</h1>' +
        '<p class="s-lead"><b>[keyword]</b> paso los 3 primeros filtros. Pero esos solo confirman que es limpia y ' +
        'especifica.</p>' +
        '<div class="s-card">' +
          '<p>Todavia no sabemos si es la palabra con la que el mercado <b>realmente compra</b>. Eso se ve mirando por ' +
          'que palabras compiten varios de tus competidores a la vez, no uno solo.</p>' +
          '<p><b>Eso lo miro yo.</b> Ya tengo los competidores del nicho y sus keywords: no tienes que abrir nada ni ' +
          'copiarme datos.</p>' +
        '</div>' +
        '<div class="s-why"><b>Por que importa tanto</b>' +
          '<p>Si mides y optimizas para una palabra que no es la del nicho, todo lo que sigue —el analisis, el ' +
          'listing, las campanas— apunta al mercado equivocado. Es el error que mas caro sale y casi nadie lo revisa.</p>' +
        '</div>' +
        '<div class="s-cta">Voy a mirarlo ahora mismo — no cierres esto</div>';
    },

    /* ---- 5 · La tabla la traigo yo; limpiarla es suyo ---- */
    5: function (v) {
      return '<h1>Limpia la tabla del mercado</h1>' +
        '<p class="s-lead">Aqui estan los competidores de <b>[keyword]</b>. Los traje yo — tu haces lo unico que yo ' +
        'no puedo hacer.</p>' +
        '<div class="s-why"><b>Lo que necesito de ti, y por que</b>' +
          '<p>Mira el <b>PESO</b> y el <b>PRECIO</b> de cada fila. Son las dos senales que delatan al producto que no ' +
          'compite contigo: en un nicho de accesorios, los sets completos que incluyen el accesorio pesan tres o ' +
          'cuatro veces mas y cuestan el triple.</p>' +
          '<p class="s-warn">No puedo decidirlo yo. La pregunta no es cuales se parecen entre si, es cuales compiten ' +
          'con <b>lo que TU piensas vender</b> — y eso solo lo sabes tu. Si lo decido yo y me equivoco, todos los ' +
          'promedios del analisis salen de un mercado que no es el tuyo.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>Dime cuales SI son comparables</b></p>' +
          '<p>Por numero de fila o por ASIN. Con eso calculo el resto.</p>' +
        '</div>' +
        '<div class="s-cta">Marcame los que de verdad compiten contigo 👇</div>';
    },

    /* ---- 7 · Solo lo que ninguna consulta puede ver ---- */
    7: function (v) {
      return '<h1>Lo ultimo, y es lo mas valioso</h1>' +
        '<p class="s-lead">Los numeros del mercado ya los tengo. Faltan cuatro cosas que ningun dato puede ' +
        'contestarme.</p>' +
        '<div class="s-card">' +
          '<p><b>1 · Tu dinero</b></p>' +
          '<p>Capital disponible para el primer pedido, y el costo del producto en Alibaba si ya cotizaste. Si no has ' +
          'cotizado, dimelo y lo estimo — pero lo marcamos como estimado.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>2 · Las resenas de 1 y 2 estrellas del lider</b></p>' +
          '<ul class="s-list">' +
            '<li>Abre en Amazon el producto que mas vende de tu nicho</li>' +
            '<li>Filtra las resenas por 1 y 2 estrellas y lee las primeras 15 o 20</li>' +
            '<li>Dime las quejas que se REPITAN, no las sueltas</li>' +
            '<li>Y sobre todo: frases tipo "ojala sirviera para…" o "lo compre para X y no funciono"</li>' +
          '</ul>' +
          '<p>Esto es gratis y esta en la pagina de Amazon. No necesitas ninguna herramienta.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>3 · Los listings de los 5 primeros</b></p>' +
          '<p>Abrelos y dime en cuantos falla cada cosa: fotos pobres, titulo sin la keyword, sin contenido A+, ' +
          'vinetas genericas.</p>' +
        '</div>' +
        '<div class="s-card">' +
          '<p><b>4 · Las dos barreras que no se ven en los numeros</b></p>' +
          '<p>Busca si el producto o alguna caracteristica esta patentada, y comprueba en Seller Central si la ' +
          'categoria esta abierta (boton "Vender este producto") o cerrada ("Solicitar aprobacion").</p>' +
        '</div>' +
        '<div class="s-why"><b>Por que esto no te lo quito</b>' +
          '<p>Los numeros dicen si el mercado sirve. Estos cuatro dicen si <b>TU</b> puedes ganarlo, y son los que ' +
          'deciden el veredicto. Leer veinte resenas negativas es donde dejas de mirar cifras y empiezas a entender ' +
          'a un cliente — es lo mas valioso que vas a hacer en todo el proceso.</p>' +
        '</div>' +
        '<div class="s-cta">Pegame lo que tengas de los cuatro y cerramos 👇</div>';
    }
  };

  /* ---------- armado de la pantalla completa ---------- */

  // opts: { reaccion, chips: [], vars: {}, win: bool }
  function pantalla(paso, opts) {
    opts = opts || {};
    // Con datos reales se usa la version que no manda a recolectar. Si ese paso
    // no tiene variante, cae a la de siempre — y si la senal no llega, tambien.
    // El fallo seguro es ese: ver la pantalla manual, que es lo que pasa hoy.
    var cuerpo = (opts.datos && PASOS_DATOS[paso]) || PASOS[paso];
    if (!cuerpo) return null; // no es un paso guiado (6, 8 y 9 los dibuja el motor)

    if (opts.datos && paso === 2) estiloCategorias();
    var html = cabecera(paso, opts.datos) + '<div class="s-body">';

    if (opts.win && WINS[paso]) html += '<div class="s-win">' + WINS[paso] + '</div>';
    if (opts.chips) html += chips(opts.chips);
    // La reacción es Sophie respondiendo a lo que el estudiante acaba de decir.
    // Va como párrafo, no como chip verde: los chips son datos confirmados.
    if (opts.reaccion) html += '<p>' + esc(opts.reaccion) + '</p>';

    html += vars(cuerpo(opts.vars || {}), opts.vars || {});
    html += '</div>';
    return html;
  }

  // El estilo del selector viaja con el modulo: es suyo y no existe en la hoja
  // de la suite. Se inyecta una vez, como hacen los demas modulos.
  var CSS_CAT = [
    '.s-cat{margin:11px 0 0;padding:11px 13px;border-radius:13px;',
    'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10)}',
    '.s-cat-t{display:flex;align-items:baseline;gap:9px;width:100%;padding:0;margin:0 0 8px;',
    'background:none;border:0;cursor:pointer;text-align:left;font:inherit;font-size:13.5px;',
    'font-weight:800;color:#fff}',
    '.s-cat-t:hover .s-cat-all{opacity:1}',
    '.s-cat-all{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;',
    'color:#f7aa2e;opacity:.55;transition:opacity .15s}',
    '.s-cat-ojo{margin:-3px 0 8px;font-size:12px;line-height:1.45;color:#f7aa2e}',
    '.s-cat-s{display:flex;flex-wrap:wrap;gap:6px}',
    '.s-pick{padding:7px 12px;border-radius:999px;cursor:pointer;font:inherit;font-size:12.5px;',
    'font-weight:600;color:#cbd6ea;background:rgba(255,255,255,.05);',
    'border:1px solid rgba(255,255,255,.13);transition:all .14s}',
    '.s-pick:hover{color:#0b1638;background:#f7aa2e;border-color:#f7aa2e}',
    '.s-cat-t:focus-visible,.s-pick:focus-visible{outline:2px solid #f7aa2e;outline-offset:2px}'
  ].join('');

  function estiloCategorias() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sophie-cat-css')) return;
    var s = document.createElement('style');
    s.id = 'sophie-cat-css';
    s.textContent = CSS_CAT;
    (document.head || document.documentElement).appendChild(s);
  }

  global.SophiePasos = {
    version: '1.4',
    mapa: MAPA,
    metodo: METODO,
    // ¿Esta pantalla continua sola? La consulta la pagina despues de pintarla.
    sigueSola: function (paso, datos) { return !!(datos && AUTO_DATOS[paso]); },
    etapas: ETAPAS,
    pantalla: pantalla,
    cabecera: cabecera,
    chips: chips,
    wins: WINS,
    tiene: function (paso) { return !!PASOS[paso]; },
    tieneDatos: function (paso) { return !!PASOS_DATOS[paso]; },
    categorias: CATEGORIAS_DESCUBRIR,
    bloqueadas: CATEGORIAS_BLOQUEADAS
  };

})(window);
