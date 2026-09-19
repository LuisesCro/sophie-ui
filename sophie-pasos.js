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

  // NINGUNA ETIQUETA NOMBRA UNA HERRAMIENTA. La del paso 3 decia "Filtros en
  // Black Box" y era lo PRIMERO que leia el estudiante en esa pantalla: el
  // titulo de la cabecera, encima de la barra de progreso. Daba igual lo que
  // dijera el cuerpo debajo.
  //
  // Una etiqueta describe el PASO DEL METODO, no la herramienta con la que se
  // hace. La herramienta es un detalle de implementacion que cambia; el paso,
  // no. Ese era justo el criterio escrito para el mapa del metodo, y aqui no se
  // habia aplicado.
  var MAPA = {
    1: { etiqueta: 'Inicio',                     pct: 11 },
    2: { etiqueta: 'Categoría y subnicho',       pct: 22 },
    3: { etiqueta: 'Buscando candidatos',        pct: 33 },
    4: { etiqueta: 'Validación de keyword',      pct: 44 },
    5: { etiqueta: 'La tabla del mercado',       pct: 56 },
    6: { etiqueta: 'Fase 1 — Validación inicial', pct: 67 },
    7: { etiqueta: 'Datos para Fase 2',          pct: 78 },
    8: { etiqueta: 'Fase 2 — Validación avanzada', pct: 89 },
    9: { etiqueta: 'Veredicto final',            pct: 100 }
  };

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

    // AQUI VIVIAN LOS PASOS 2, 3, 4, 5 Y 7 EN VERSION MANUAL, y con ellos las
    // veintinueve menciones a Black Box, Cerebro y Xray que seguian saliendole
    // al estudiante semanas despues de darlas por quitadas.
    //
    // No salian por un fallo de logica: salian porque existian. Mientras la
    // aplicacion tuviera dos versiones de cada pantalla y una condicion para
    // elegir, CUALQUIER cosa que dejara esa condicion en false —una variable de
    // entorno sin poner, una sesion sin correo, un campo perdido en un puente—
    // devolvia al estudiante al guion de Helium 10. Un camino de repliegue que
    // nadie queria recorrer, esperando a que algo fallara para aparecer.
    //
    // Se borran, no se desactivan. El curso ya no se da con Helium 10, asi que
    // el repliegue correcto cuando no hay datos no es mandar a una herramienta
    // de pago: es decir la verdad. De eso se encarga PASOS_DATOS, que ahora es
    // la unica version que existe de estos cinco pasos.
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

    /* ---- 3 · El panel de filtros. La busqueda la hace la aplicacion ---- */
    //
    // ESTA PANTALLA ERA UN TEXTO QUE DESCRIBIA UNA BUSQUEDA. Decia "yo hago la
    // busqueda, no necesitas abrir nada" y despues el turno se lo quedaba el
    // modelo, que unas veces llamaba a la consulta y otras narraba un recorrido
    // de clics por una herramienta que el curso no usa.
    //
    // Ahora la pantalla ES el panel. El estudiante mueve los filtros y pulsa
    // Buscar; la pagina llama al servidor y pinta la tabla. No hay turno que
    // improvisar porque no hay nadie escribiendo.
    //
    // Y de paso arregla que salieran siempre los mismos productos: con la
    // categoria como unica entrada, treinta estudiantes mandaban la misma
    // consulta. Quien decide el rango de precio, el techo de resenas y las
    // palabras es el, asi que la busqueda ya es suya.
    3: function (v) {
      var h = '<h1>Ajusta tu busqueda</h1>' +
        '<p class="s-lead">Estos son los filtros del metodo, ya puestos. ' +
        'Muevelos si quieres: cada uno te dice para que sirve.</p>' +
        '<div class="s-why"><b>Por que los eliges tu y no yo</b>' +
          '<p>Si todos buscamos igual, todos encontramos lo mismo — y acabariamos compitiendo ' +
          'entre nosotros en el mismo nicho. Tus numeros y tus palabras hacen que tu lista no ' +
          'se parezca a la de nadie.</p>' +
        '</div>' +
        '<div id="panel-filtros"></div>';
      return h;
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
        // NO VOLVER A PEDIR EL CAPITAL. Lo pide el paso 3 y lo volvia a pedir
        // aqui, en el guion, no por olvido del modelo. Al estudiante le llegaba
        // como si no le hubieran escuchado, que es el error que mas confianza
        // cuesta. Si la ficha lo sabe, se CONFIRMA en una linea; si no, se pide.
        '<div class="s-card">' +
          '<p><b>1 · Tu dinero</b></p>' +
          (v && v.capital
            ? '<p>Tu capital ya me lo dijiste: <b>' + esc(v.capital) + '</b>. Si cambio, dimelo; si no, ' +
              'sigue.</p>' +
              '<p>Lo que si me falta es el <b>costo del producto en Alibaba</b>, si ya cotizaste. Si no has ' +
              'cotizado, dimelo y lo estimo — pero lo marcamos como estimado.</p>'
            : '<p>Capital disponible para el primer pedido, y el costo del producto en Alibaba si ya cotizaste. ' +
              'Si no has cotizado, dimelo y lo estimo — pero lo marcamos como estimado.</p>') +
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
    // LA VERSION DE JUNGLE SCOUT ES LA UNICA. Aqui habia una eleccion —"si hay
    // datos reales usa esta, si no, la manual"— y era la raiz de que Black Box
    // siguiera saliendo despues de semanas arreglandolo. Cualquier cosa que
    // dejara `datos` en false —una variable de entorno sin poner, una sesion sin
    // correo, un campo perdido en un puente— devolvia al estudiante al guion de
    // Helium 10. Un camino de repliegue que nadie queria recorrer, esperando a
    // que algo fallara para aparecer.
    //
    // El curso ya no se da con Helium 10. Asi que el repliegue no es enviar al
    // estudiante a una herramienta de pago que no tiene: es decirle la verdad,
    // que ahora mismo no se pueden traer los datos. Eso lo hace PASOS_DATOS, que
    // manda SIEMPRE cuando existe para ese paso.
    //
    // `datos` sigue existiendo, pero solo decide la ETIQUETA de la cabecera.
    var cuerpo = PASOS_DATOS[paso] || PASOS[paso];
    if (!cuerpo) return null; // no es un paso guiado (6, 8 y 9 los dibuja el motor)

    if (PASOS_DATOS[paso]) opts = { ...opts, datos: true };
    if (paso === 2 && PASOS_DATOS[2]) estiloCategorias();
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
