/* ============================================================
   SOPHIE · PASOS GUIADOS v1.0
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

  function cabecera(paso) {
    var m = MAPA[paso] || MAPA[1];
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
            '<div class="s-opt"><span class="s-num">A</span> No tengo ninguna idea todavía. Necesito encontrar una desde cero en Helium 10.</div>' +
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

  /* ---------- armado de la pantalla completa ---------- */

  // opts: { reaccion, chips: [], vars: {}, win: bool }
  function pantalla(paso, opts) {
    opts = opts || {};
    var cuerpo = PASOS[paso];
    if (!cuerpo) return null; // no es un paso guiado (6, 8 y 9 los dibuja el motor)

    var html = cabecera(paso) + '<div class="s-body">';

    if (opts.win && WINS[paso]) html += '<div class="s-win">' + WINS[paso] + '</div>';
    if (opts.chips) html += chips(opts.chips);
    // La reacción es Sophie respondiendo a lo que el estudiante acaba de decir.
    // Va como párrafo, no como chip verde: los chips son datos confirmados.
    if (opts.reaccion) html += '<p>' + esc(opts.reaccion) + '</p>';

    html += vars(cuerpo(opts.vars || {}), opts.vars || {});
    html += '</div>';
    return html;
  }

  global.SophiePasos = {
    version: '1.0',
    mapa: MAPA,
    pantalla: pantalla,
    cabecera: cabecera,
    chips: chips,
    wins: WINS,
    tiene: function (paso) { return !!PASOS[paso]; }
  };

})(window);
