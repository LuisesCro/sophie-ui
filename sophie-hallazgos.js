/* ============================================================
   SOPHIE · HALLAZGOS v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-hallazgos.js

   La pantalla de los CANDIDATOS QUE SOPHIE ENCONTRÓ (la salida de
   `descubrir`, que sustituyó a Black Box).

   POR QUÉ EXISTE: esa lista salía en prosa — ocho párrafos seguidos
   con el precio, el revenue, las reseñas, el ratio y los meses
   apelmazados entre puntos medios. Imposible comparar dos productos
   sin releer. Y salía en prosa por la razón de siempre: ese turno no
   tenía molde, y sin molde el modelo escribe párrafos, que es su
   forma por defecto.

   El diseño vive AQUÍ, no en el prompt. Sophie manda los datos:

     <!--HALLAZGOS:{
       "paso":3,                                  // opcional
       "titulo":"Encontré 45 productos…",         // opcional
       "intro":"Te muestro los más interesantes…",// opcional
       "cifras":[{"etq":"Productos que cumplen","valor":"45"}],
       "filtros":[{"que":"Peso","valor":"máx. 3 lb"}],
       "metodo":{"hice":"…","porque":"…","decides":"…"},
       "productos":[
         { "nombre":"Epoxy Resin Kit 1 Gal",
           "marca":"Waikxin", "asin":"B0GK8F18R7", // opcionales
           "imagen":"https://…",                   // opcional (miniatura)
           "precio":"$50", "peso":"8.77", "revenue":"$109K",
           "resenas":42, "rating":"4.5", "ratio":52, "meses":28,
           "variaciones":7,                       // opcional
           "nota":"…" }                           // opcional
       ],
       "cta":"¿Cuál te llama? 👇"                 // opcional
     }-->

   TRES COSAS QUE LA APLICACIÓN PONE Y EL MODELO NO PUEDE TOCAR, porque
   son currículum y no narración:
     · la leyenda del ratio
     · el POR QUÉ de cada filtro (`filtros[].que` lo elige el modelo;
       la razón sale de la tabla PORQUE de aquí abajo)
     · el aviso de que los promedios de una tabla sucia son
       PROVISIONALES — el Criterio 3 dice que solo valen sobre la
       tabla limpia, y enseñarlos como definitivos sería enseñar mal

   LA LEYENDA DEL RATIO NO LA ESCRIBE EL MODELO. Es método, no
   narración: si cambiara de turno en turno el estudiante aprendería
   una cosa distinta cada vez. Va fija, aquí, y en naranja — que es
   donde queremos que caiga el ojo después de la tabla.

   Requiere: SophiePasos cargado antes (para la cabecera con la barra
   de progreso). Si no está, degrada sin cabecera. Todo el texto del
   modelo se escapa: un nombre de producto no puede inyectar HTML.

   ESCAPE: si el marcador llega roto o a medias (streaming),
   detectar() devuelve null y la página cae al formato normal.
   ============================================================ */

(function (global) {
  'use strict';

  var MARCA = /<!--HALLAZGOS:([\s\S]*?)-->/;

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function disponible() { return true; }

  // ¿Ya llegó el marcador completo y con al menos un producto?
  function detectar(texto) {
    var m = MARCA.exec(texto || '');
    if (!m) return null;
    try {
      var p = JSON.parse(m[1].trim());
      return (p && Array.isArray(p.productos) && p.productos.length) ? p : null;
    } catch (e) {
      return null; // aún llega incompleto o está roto
    }
  }

  function limpiar(texto) {
    return String(texto || '')
      .replace(MARCA, '')
      .replace(/<!--(?:[PM]|DATOS):[^>]*-->/g, '')
      .trim();
  }

  /* ---------- celdas ---------- */

  // El modelo puede mandar un número o un rango en texto ("$24–51",
  // "230–246"). Los dos son válidos: un producto con variaciones tiene
  // rango de verdad, y redondearlo a un número sería inventar precisión.
  // EL NOMBRE DEL PRODUCTO VIENE CON DOS NOMBRES, y esa es toda la historia.
  //
  // La API de Amazon lo devuelve como `titulo`. Este modulo leia `nombre`,
  // porque asi se lo pedia el prompt al modelo cuando era el quien armaba el
  // marcador. Mientras el modelo estuvo en medio, el traducia sin que nadie lo
  // supiera. En cuanto la pagina empezo a pasar los candidatos DIRECTOS de la
  // API —que es lo que queriamos— el campo dejo de existir: la tabla salio con
  // los nombres en blanco y el mensaje "Quiero analizar estos productos: · ·".
  //
  // Es el mismo fallo que ya ha pasado cinco veces en este proyecto y siempre
  // igual: un campo que se cae entre dos capas sin que nada falle. Por eso se
  // aceptan los dos nombres y hay UN solo sitio donde se decide, en vez de
  // cuatro `p.nombre` repartidos.
  //
  // Y el ASIN como ultimo recurso: un producto sin nombre sigue siendo
  // identificable, y un mensaje con un ASIN es infinitamente mejor que uno con
  // un punto y nada al lado.
  function nom(p) {
    if (!p) return '';
    return String(p.nombre || p.titulo || p.title || p.asin || '').trim();
  }

  function celda(v) {
    if (v === null || v === undefined || v === '') return '—';
    // Un punto de corte DESPUES del guion de un rango, para que "$19K-50K"
    // pueda partirse en dos lineas en vez de ensanchar su columna. `<wbr>` no
    // pinta nada: solo dice donde se PUEDE partir si hace falta.
    return esc(v).replace(/([–—-])\s*/g, '$1<wbr>');
  }

  // El ratio es la columna que el estudiante tiene que mirar, así que se
  // marca. No lleva semáforo: un ratio alto NO es un aprobado por sí solo
  // —depende de la edad del producto— y pintarlo verde diría lo contrario
  // de lo que enseña la leyenda de abajo.
  function ratio(v) {
    if (v === null || v === undefined || v === '') return '<span class="s-hz-r">—</span>';
    return '<span class="s-hz-r">' + esc(v) + '</span>';
  }

  // EL PESO, CON SU AVISO. El método recomienda peso estándar para un primer
  // producto, y la lista llegaba con kits de resina de 20 lb sin que nada lo
  // dijera. Ahora el filtro los deja fuera, pero cuando uno pase —porque el
  // estudiante subió el techo, o porque el dato venía vacío en la API— tiene
  // que verse: un número a secas no enseña nada, un número marcado sí.
  var PESO_AVISO = 3;
  function peso(v) {
    if (v === null || v === undefined || v === '') return '—';
    var n = parseFloat(String(v));
    var txt = esc(v) + (/lb/i.test(String(v)) ? '' : ' lb');
    if (isNaN(n) || n <= PESO_AVISO) return txt;
    return '<span class="s-hz-pesado" title="Por encima del techo del método para un primer producto">' +
      txt + ' ⚠</span>';
  }

  // La miniatura, cuando la API la trae. Sin ella la fila se dibuja igual: una
  // tabla sin fotos se lee, una tabla rota no.
  function foto(p) {
    if (!p.imagen) return '';
    return '<img class="s-hz-img" src="' + esc(p.imagen) + '" alt="" loading="lazy" ' +
      'onerror="this.remove()">';
  }

  function fila(p) {
    p = p || {};
    var badge = p.variaciones && Number(p.variaciones) > 1
      ? '<span class="s-hz-var" title="Un mismo producto con varias variaciones">' +
        esc(p.variaciones) + ' variaciones</span>'
      : '';

    var tr = '<tr>' +
      // LA CASILLA. El estudiante elige aqui que productos analiza — hasta
      // tres. El tope no es capricho: analizar a fondo cuesta consultas y
      // tiempo, y quien se lleva ocho candidatos a la vez no analiza ninguno.
      '<td class="s-hz-ckc" data-l="Elegir">' +
        '<label class="s-hz-lb"><input type="checkbox" class="s-hz-ck" value="' +
        esc(nom(p)) + '"><span></span></label></td>' +
      '<td data-l="Producto"><div class="s-hz-prod">' + foto(p) +
        '<div><span class="s-hz-n">' + esc(nom(p)) + '</span>' +
        ((p.marca || p.asin) ? '<span class="s-hz-meta">' +
          (p.marca ? esc(p.marca) : '') + (p.marca && p.asin ? ' · ' : '') +
          (p.asin ? '<code>' + esc(p.asin) + '</code>' : '') + '</span>' : '') +
        badge + '</div></div></td>' +
      '<td data-l="Precio"   data-num>' + celda(p.precio) + '</td>' +
      '<td data-l="Peso"     data-num>' + peso(p.peso) + '</td>' +
      '<td data-l="Revenue"  data-num>' + celda(p.revenue) + '</td>' +
      // DOS DATOS POR CELDA, NO DOS COLUMNAS. Once columnas dejaban tres fuera
      // del borde en una tarjeta de chat: el estudiante no veia ni el ratio ni
      // los meses, que son los dos que la leyenda de abajo le enseña a leer.
      // Apilados se ven los cuatro, y el par que va junto queda junto — las
      // ventas al dia son las del mes divididas, y la estrella no significa
      // nada sin el numero de resenas que la sostiene.
      '<td data-l="Vendidas" data-num>' + celda(p.ventas_mes) +
        '<span class="s-hz-sub">' + (p.ventas_dia ? esc(p.ventas_dia) + '/día' : '') + '</span></td>' +
      '<td data-l="Reseñas"  data-num>' + celda(p.resenas) +
        (p.rating ? '<span class="s-hz-star">' + esc(p.rating) + '★</span>' : '') + '</td>' +
      '<td data-l="Ratio"    data-num>' + ratio(p.ratio) + '</td>' +
      '<td data-l="Meses"    data-num>' + celda(p.meses) + '</td>' +
      '</tr>';

    // LA NOTA VA EN SU PROPIA FILA, a lo ancho. Dentro de la primera celda se
    // envolvía en una columna estrecha —siete líneas para una frase— y dejaba
    // el resto de la fila en blanco: la tabla se rompía justo en el producto
    // que más explicación necesita, que es el que tiene variaciones.
    if (p.nota) tr += '<tr class="s-hz-nr"><td colspan="9">' + esc(p.nota) + '</td></tr>';
    return tr;
  }

  /* ---------- la leyenda: método, no narración ---------- */

  var LEYENDA =
    '<div class="s-hz-leyenda">' +
      '<div class="s-hz-lt">Cómo leer el <b>ratio</b></div>' +
      '<p class="s-hz-lf">ratio = ventas del mes ÷ reseñas acumuladas</p>' +
      '<ul class="s-hz-ll">' +
        '<li><b>Ratio alto en producto joven</b> (menos de 12 meses): el nicho deja entrar gente ' +
          'nueva. <em>No</em> quiere decir que sea fácil de replicar.</li>' +
        '<li><b>Ratio alto en producto maduro</b> (más de 18 meses): la gente compra sin necesitar ' +
          'cientos de reseñas. Esa es una barrera baja de verdad.</li>' +
      '</ul>' +
    '</div>';

  // `cabecera(paso, datos)` — EL SEGUNDO ARGUMENTO NO ES OPCIONAL AQUÍ.
  //
  // Sin él la barra decía "PASO 3 DE 9 — FILTROS EN BLACK BOX" encima de una
  // tabla que Sophie acababa de traer ella sola. Es el mismo campo que se caía
  // en sophie-guia.js, en otro sitio: una función con un parámetro de más y una
  // llamada con uno de menos no dan error, dan la pantalla equivocada.
  //
  // Estas pantallas SOLO existen con datos reales —son la salida de `descubrir`
  // y de `competidores`—, así que aquí siempre va true.
  function cabecera(payload, pasoPorDefecto) {
    var paso = (payload && payload.paso) ? payload.paso : pasoPorDefecto;
    if (global.SophiePasos && global.SophiePasos.cabecera) {
      return global.SophiePasos.cabecera(paso, true);
    }
    return '';
  }

  /* ---------- elegir productos: hasta tres ---------- */

  // POR QUE UN TOPE. Analizar a fondo cuesta consultas, tiempo y atencion.
  // Quien se lleva ocho candidatos a la vez no analiza ninguno: los compara por
  // encima y elige por gusto, que es justo lo que el metodo intenta evitar.
  var MAX_ELEGIDOS = 3;

  var BARRA_ELECCION =
    '<div class="s-hz-sel" hidden>' +
      '<span class="s-hz-selc"></span>' +
      '<button type="button" class="s-hz-selb">Analizar los elegidos</button>' +
    '</div>';

  // Se engancha UNA vez por pantalla pintada, delegado: las filas se rehacen
  // con la tabla y un listener por casilla se quedaria colgando.
  function engancharEleccion(container) {
    var sel = container.querySelector('.s-hz-sel');
    if (!sel) return;
    var cuenta = sel.querySelector('.s-hz-selc');
    var boton = sel.querySelector('.s-hz-selb');

    function elegidos() {
      return Array.prototype.slice.call(container.querySelectorAll('.s-hz-ck:checked'))
        .map(function (c) { return c.value; });
    }
    function refrescar() {
      var n = elegidos().length;
      // Al llegar al tope se apagan las demas casillas en vez de dejar que
      // marque una cuarta y quitarsela despues: un limite que se explica
      // quitando algo que ya diste se vive como un fallo.
      Array.prototype.forEach.call(container.querySelectorAll('.s-hz-ck'), function (c) {
        c.disabled = !c.checked && n >= MAX_ELEGIDOS;
        var fila = c.closest && c.closest('tr');
        if (fila) fila.classList.toggle('elegida', c.checked);
      });
      sel.hidden = n === 0;
      cuenta.textContent = n === MAX_ELEGIDOS
        ? 'Elegiste ' + n + ' — el máximo'
        : 'Elegiste ' + n + ' de ' + MAX_ELEGIDOS;
      boton.textContent = n === 1 ? 'Analizar este' : 'Analizar los ' + n;
    }

    container.addEventListener('change', function (ev) {
      if (ev.target && ev.target.classList.contains('s-hz-ck')) refrescar();
    });
    container.addEventListener('click', function (ev) {
      if (!ev.target.closest || !ev.target.closest('.s-hz-selb')) return;
      var lista = elegidos();
      if (!lista.length) return;
      // El modulo no sabe hablar con el chat, y no deberia: avisa, y la pagina
      // decide que hacer. Asi sirve igual en las dos paginas sin conocerlas.
      container.dispatchEvent(new CustomEvent('sophie-analizar', {
        bubbles: true, detail: { productos: lista }
      }));
    });
    refrescar();
  }

  /* ---------- la franja de cifras (la cabecera de la tabla) ---------- */

  // LAS CIFRAS DE ARRIBA, CON UNA DIFERENCIA QUE ES DE METODO.
  //
  // La extensión de Jungle Scout pone los promedios del nicho arriba y ya. Aquí
  // no se puede: el Criterio 3 dice que los promedios SOLO valen sobre la tabla
  // LIMPIA, y la tabla llega sucia — la búsqueda de un accesorio devuelve
  // también los sets completos que lo incluyen, con otro precio y otro peso.
  //
  // Así que se muestran marcados como PROVISIONALES hasta que el estudiante
  // quite lo que no compite con él. Y eso enseña el Filtro 3 mejor que
  // cualquier párrafo: ve el número moverse cuando saca al que no encajaba.
  function cifras(lista, provisional) {
    if (!Array.isArray(lista) || !lista.length) return '';
    var tiles = lista.slice(0, 6).map(function (c) {
      return '<div class="s-hz-tile">' +
        '<div class="s-hz-te">' + esc(c.etq) + '</div>' +
        '<div class="s-hz-tv">' + esc(c.valor) + '</div>' +
        (c.nota ? '<div class="s-hz-tn">' + esc(c.nota) + '</div>' : '') +
        '</div>';
    }).join('');
    return '<div class="s-hz-cifras' + (provisional ? ' prov' : '') + '">' + tiles + '</div>' +
      (provisional
        ? '<p class="s-hz-prov">Provisionales: estos promedios se calculan sobre la tabla como ' +
          'llegó. Cuentan de verdad cuando saques los productos que no compiten contigo.</p>'
        : '');
  }

  /* ---------- la parte pedagógica ---------- */

  // POR QUÉ CADA FILTRO, EN PALABRAS FIJAS.
  //
  // Automatizar un paso no puede significar dejar de enseñarlo. Cuando el
  // estudiante hacía la búsqueda a mano en Black Box, aprendía el método
  // TECLEANDO cada filtro; ahora la hace Sophie y él solo veía el resultado.
  //
  // Así que los filtros se muestran, y cada uno con su razón. La razón la pone
  // la aplicación, no el modelo: es currículum, y si se redactara de nuevo cada
  // turno dos estudiantes aprenderían dos cosas distintas del mismo filtro.
  var PORQUE = {
    precio: 'Debajo de $20 las tarifas de Amazon se comen el margen. El techo lo pone tu capital.',
    peso: 'Peso estándar. Por encima de ahí el flete y la tarifa de FBA se comen el margen de quien empieza.',
    resenas: 'Un tope de reseñas deja fuera los mercados amurallados, donde ya no se puede entrar.',
    revenue: 'Un piso de facturación descarta los nichos muertos: no son pequeños, están vacíos.',
    categoria: 'La categoría acota el terreno. Las bloqueadas piden permiso y no son para un primer producto.',
    intereses: 'Tus intereses son lo que hace que esta lista sea TUYA y no la de todo el salón.',
    marcas: 'Fuera los nichos que domina una marca grande: ahí no se entra por mucho que cuadren los números.'
  };
  function porqueDe(f) {
    if (f.porque) return f.porque;                       // el modelo puede matizar
    var k = String(f.que || '').toLowerCase();
    for (var c in PORQUE) if (k.indexOf(c) !== -1) return PORQUE[c];
    return '';
  }

  function filtros(lista) {
    if (!Array.isArray(lista) || !lista.length) return '';
    return '<div class="s-hz-filtros">' +
      '<div class="s-hz-lt">Con qué filtré</div>' +
      '<ul class="s-hz-fl">' + lista.map(function (f) {
        var p = porqueDe(f);
        return '<li><span class="s-hz-fq">' + esc(f.que) + '</span>' +
          '<span class="s-hz-fv">' + esc(f.valor) + '</span>' +
          (p ? '<span class="s-hz-fp">' + esc(p) + '</span>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<p class="s-hz-ajusta">¿Alguno no te cuadra? Dímelo y lo movemos — es tu búsqueda.</p>' +
      '</div>';
  }

  // QUÉ HICE · POR QUÉ · QUÉ DECIDES TÚ.
  //
  // El bloque que devuelve el paso a paso. Los tres van juntos a propósito: sin
  // el primero el estudiante no sabe qué pasó, sin el segundo no aprende nada,
  // y sin el tercero cree que ya está hecho y se queda esperando.
  function metodo(m) {
    if (!m || (!m.hice && !m.porque && !m.decides)) return '';
    var fila = function (etq, txt, clase) {
      return txt ? '<div class="s-hz-mf ' + clase + '"><span class="s-hz-me">' + etq +
        '</span><span class="s-hz-mt">' + esc(txt) + '</span></div>' : '';
    };
    return '<div class="s-hz-metodo">' +
      fila('Qué hice', m.hice, 'hice') +
      fila('Por qué', m.porque, 'porque') +
      fila('Qué decides tú', m.decides, 'decides') +
      '</div>';
  }

  function html(payload) {
    if (!payload || !Array.isArray(payload.productos) || !payload.productos.length) return null;

    var filas = payload.productos.map(fila).join('');

    return cabecera(payload, 3) +
      '<div class="s-body">' +
        '<h1>' + esc(payload.titulo || 'Esto es lo que encontré') + '</h1>' +
        (payload.intro ? '<p class="s-lead">' + esc(payload.intro) + '</p>' : '') +
        cifras(payload.cifras, false) +
        filtros(payload.filtros) +
        '<div class="s-hz-wrap">' +
          '<table class="s-hz">' +
            '<colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4">' +
            '<col class="c5"><col class="c6"><col class="c7"><col class="c8"><col class="c9"></colgroup>' +
            '<thead><tr>' +
              '<th class="s-hz-ckc"><span class="s-hz-oculto">Elegir</span></th>' +
              '<th>Producto</th><th>Precio</th><th>Peso</th><th>Revenue</th>' +
              '<th>Vendidas</th><th>Reseñas</th>' +
              '<th class="s-hz-th-r">Ratio</th><th>Meses</th>' +
            '</tr></thead>' +
            '<tbody>' + filas + '</tbody>' +
          '</table>' +
        '</div>' +
        BARRA_ELECCION +
        LEYENDA +
        metodo(payload.metodo) +
        (payload.cta ? '<div class="s-cta">' + esc(payload.cta) + '</div>' : '') +
      '</div>';
  }

  /* ============================================================
     LA OTRA PANTALLA CON TABLA: VALIDACIÓN DE LA KEYWORD (Filtro 3)

     Mismo problema y misma solución. Salía en prosa: los tres filtros
     como párrafos sueltos, los cuatro competidores como líneas con
     puntos medios, y el "Por qué lo decides tú" perdido al final en
     el mismo gris que todo lo demás — cuando es la parte que le pide
     al estudiante que decida.

       <!--VALIDACION:{
         "paso":4,
         "keyword":"chunky chenille yarn",
         "intro":"Tengo los datos del nicho…",
         "filtros":[
           {"nombre":"Sin marcas","estado":"ok","nota":"Ninguna marca registrada domina."},
           {"nombre":"Específica","estado":"ok","nota":"Describe un tipo concreto de hilo."},
           {"nombre":"Homogeneidad","estado":"pendiente","nota":"Aquí necesito tu ojo."}
         ],
         "competidores":[
           {"nombre":"Waikxin — 10 Pack Jumbo Chunky Yarn","precio":"$38.19","peso":"4.83 lb","resenas":653}
         ],
         "porque":"El peso y el precio lo dicen todo…",
         "cta":"¿Cuáles compiten con lo que piensas vender? 👇"
       }-->
     ============================================================ */

  var MARCA_V = /<!--VALIDACION:([\s\S]*?)-->/;

  function detectarValidacion(texto) {
    var m = MARCA_V.exec(texto || '');
    if (!m) return null;
    try {
      var p = JSON.parse(m[1].trim());
      return (p && Array.isArray(p.competidores) && p.competidores.length) ? p : null;
    } catch (e) {
      return null;
    }
  }

  function limpiarValidacion(texto) {
    return String(texto || '')
      .replace(MARCA_V, '')
      .replace(/<!--(?:[PM]|DATOS):[^>]*-->/g, '')
      .trim();
  }

  var ESTADOS = {
    ok:        { icono: '✅', clase: 'ok',   label: 'Pasa' },
    pass:      { icono: '✅', clase: 'ok',   label: 'Pasa' },
    pendiente: { icono: '⏳', clase: 'pend', label: 'Pendiente de ti' },
    tuyo:      { icono: '⏳', clase: 'pend', label: 'Pendiente de ti' },
    no:        { icono: '❌', clase: 'no',   label: 'No pasa' },
    fail:      { icono: '❌', clase: 'no',   label: 'No pasa' }
  };
  function estadoDe(v) {
    var k = String(v || 'pendiente').toLowerCase().replace(/[^a-z]/g, '');
    return ESTADOS[k] || ESTADOS.pendiente;
  }

  function filtro(f) {
    f = f || {};
    var e = estadoDe(f.estado);
    return '<li class="s-hz-f ' + e.clase + '">' +
      '<span class="s-hz-fi">' + e.icono + '</span>' +
      '<span class="s-hz-fn">' + esc(nom(f)) + '</span>' +
      (f.nota ? '<span class="s-hz-fx">' + esc(f.nota) + '</span>' : '') +
      '</li>';
  }

  // El PESO es la columna que delata al que no compite contigo —un pack de 10
  // pesa cuatro veces lo que un ovillo— así que va marcada, igual que el ratio
  // en la otra tabla. Es donde tiene que caer el ojo para contestar.
  function filaComp(c) {
    c = c || {};
    return '<tr>' +
      '<td data-l="Competidor"><div class="s-hz-prod">' + foto(c) +
        '<div><span class="s-hz-n">' + esc(nom(c)) + '</span>' +
        ((c.marca || c.asin) ? '<span class="s-hz-meta">' +
          (c.marca ? esc(c.marca) : '') + (c.marca && c.asin ? ' · ' : '') +
          (c.asin ? '<code>' + esc(c.asin) + '</code>' : '') + '</span>' : '') +
        '</div></div></td>' +
      '<td data-l="Precio"  data-num>' + celda(c.precio) + '</td>' +
      '<td data-l="Peso"    data-num><span class="s-hz-r">' + celda(c.peso) + '</span></td>' +
      '<td data-l="Reseñas" data-num>' + celda(c.resenas) + '</td>' +
      '</tr>';
  }

  function htmlValidacion(payload) {
    if (!payload || !Array.isArray(payload.competidores) || !payload.competidores.length) return null;

    var filtros = Array.isArray(payload.filtros) && payload.filtros.length
      ? '<ul class="s-hz-fs">' + payload.filtros.map(filtro).join('') + '</ul>'
      : '';

    var porque = payload.porque
      ? '<div class="s-hz-leyenda">' +
          '<div class="s-hz-lt">Por qué lo decides tú</div>' +
          '<p class="s-hz-lp">' + esc(payload.porque) + '</p>' +
        '</div>'
      : '';

    return cabecera(payload, 4) +
      '<div class="s-body">' +
        '<h1>' + esc(payload.titulo || 'Validemos la keyword') + '</h1>' +
        (payload.keyword ? '<div class="s-done">✓ Keyword: ' + esc(payload.keyword) + '</div>' : '') +
        (payload.intro ? '<p class="s-lead">' + esc(payload.intro) + '</p>' : '') +
        cifras(payload.cifras, payload.provisional !== false) +
        filtros +
        '<div class="s-hz-wrap">' +
          '<table class="s-hz s-hz-4">' +
            '<colgroup><col><col class="c3"><col class="c4"><col class="c7"></colgroup>' +
            '<thead><tr>' +
              '<th>Competidor</th><th>Precio</th><th class="s-hz-th-r">Peso</th><th>Reseñas</th>' +
            '</tr></thead>' +
            '<tbody>' + payload.competidores.map(filaComp).join('') + '</tbody>' +
          '</table>' +
        '</div>' +
        porque +
        metodo(payload.metodo) +
        (payload.cta ? '<div class="s-cta">' + esc(payload.cta) + '</div>' : '') +
      '</div>';
  }

  function pintarValidacion(container, payload) {
    var h = htmlValidacion(payload);
    if (!h || !container) return false;
    asegurarEstilo();
    container.innerHTML = h;
    return true;
  }

  /* ---------- estilo propio, inyectado una sola vez ---------- */

  // COLORES POR TOKEN, NO A MANO.
  //
  // La primera version llevaba los colores del tema oscuro escritos dentro
  // (#fff, #cbd6ea, #8b9bbd). Al renderizarlo sobre el tema claro los nombres
  // de producto quedaban BLANCOS SOBRE BLANCO: la tabla entera invisible, sin
  // un solo error. Las paginas de estudiante van en oscuro hoy, asi que no
  // llego a produccion — pero el dia que una cambie de tema, habria llegado.
  //
  // Se leen los tokens de la suite: --so-* los define sophie-oscuro.css y
  // --sc-* sophie-claro.css. Si no hay ninguno, el valor final es el oscuro,
  // que es lo que usan estas pantallas.
  var CSS = [
    // LA LISTA TIENE QUE CUBRIR TODO LO QUE USA LOS TOKENS.
    //
    // Al principio solo estaban los tres primeros, y las cifras, el bloque del
    // paso a paso y el aviso de "provisionales" no son descendientes de
    // ninguno: son hermanos. Una variable CSS solo baja a los descendientes del
    // elemento donde se declara, así que ahí `var(--hz-or)` no resolvía y el
    // color caía al heredado — naranja escrito y gris en pantalla, sin error.
    '.s-hz-wrap,.s-hz-leyenda,.s-hz-fs,.s-hz-cifras,.s-hz-prov,.s-hz-filtros,.s-hz-metodo{',
    '--hz-tx:var(--so-tx,var(--sc-tx,#fff));',
    '--hz-tx2:var(--so-tx-2,var(--sc-tx-2,#cbd6ea));',
    '--hz-tx3:var(--so-tx-3,var(--sc-tx-3,#8b9bbd));',
    '--hz-or:var(--so-orange,var(--sc-orange,#f7aa2e));',
    '--hz-line:var(--so-line,rgba(128,128,128,.22));',
    '--hz-line2:var(--so-line-2,rgba(128,128,128,.12));',
    '--hz-card:var(--so-card,rgba(128,128,128,.05));',
    '}',
    /* Propio, para no depender de que la pagina anfitriona lo ponga. Sin esto,
       en movil el `width:100%` de cada celda se suma a su padding y los numeros
       se salen por la derecha — cortados, que es peor que no estar. */
    '.s-hz,.s-hz *,.s-hz-wrap,.s-hz-leyenda,.s-hz-f{box-sizing:border-box}',
    // ONCE COLUMNAS NO CABEN EN UNA TARJETA DE CHAT. Se desplaza en horizontal,
    // como la extension: recortar columnas para que quepan seria decidir por el
    // estudiante cual de los datos le sobra.
    '.s-hz-wrap{margin:14px 0 4px;border:1px solid var(--hz-line);border-radius:14px;',
    'overflow-x:auto;overflow-y:hidden;background:var(--hz-card);',
    '-webkit-overflow-scrolling:touch;container-type:inline-size;',
    // SOMBRAS EN LOS BORDES, y solo cuando hay algo mas que ver. La primera
    // version se cortaba en seco en "RATIN…" y nada decia que la tabla seguia:
    // el estudiante daba por hecho que esas columnas no existian.
    //
    // Es el truco de `background-attachment: local`: los dos degradados que
    // tapan viajan CON el contenido y los dos que hacen sombra se quedan
    // quietos, asi que la sombra solo asoma cuando queda tabla por ese lado.
    // Sin JavaScript, sin medir nada y sin una barra que ocupe sitio.
    'background-image:linear-gradient(to right,var(--hz-card) 40%,rgba(0,0,0,0)),',
    'linear-gradient(to left,var(--hz-card) 40%,rgba(0,0,0,0)),',
    'radial-gradient(farthest-side at 0 50%,rgba(0,0,0,.34),rgba(0,0,0,0)),',
    'radial-gradient(farthest-side at 100% 50%,rgba(0,0,0,.34),rgba(0,0,0,0));',
    'background-position:0 0,100% 0,0 0,100% 0;background-repeat:no-repeat;',
    'background-size:36px 100%,36px 100%,15px 100%,15px 100%;',
    'background-attachment:local,local,scroll,scroll}',
    // Se aprieta lo justo para que en una tarjeta ancha quepa entera y la
    // sombra ni aparezca; en una estrecha, se desliza.
    // LOS ANCHOS, MEDIDOS. Se envio dos veces una tabla que no cabia: las
    // columnas se estiraban por el TEXTO DE LA CABECERA ("Vendidas al mes / al
    // día" pedia 102px para un numero de cuatro cifras), no por los datos.
    // Cabeceras de una palabra, la unidad dentro de la celda, y tope al nombre
    // del producto. Medido en la tarjeta real: 647px de tabla en 676 de hueco.
    // `table-layout:fixed` ES LO QUE HACE IMPOSIBLE EL DESBORDE.
    //
    // Con el reparto automatico la tabla se ensancha hasta donde pida su
    // contenido y luego se sale del hueco: eso es lo que se corrigio tres veces
    // a base de apretar pixeles, y volvia con el primer titulo o rango mas
    // largo. Con anchos fijos la tabla NUNCA pasa de su contenedor — lo que
    // sobra se parte en dos lineas, que es lo correcto.
    //
    // Las columnas de cifras llevan su ancho; la del producto se queda con lo
    // que sobre, que es la que tiene texto de verdad. Medido: 494px de
    // columnas fijas, asi que en una tarjeta de 676 le quedan 182 al nombre.
    '.s-hz{min-width:0;table-layout:fixed}',
    '.s-hz col.c1{width:34px}.s-hz col.c3{width:68px}.s-hz col.c4{width:64px}',
    '.s-hz col.c5{width:78px}.s-hz col.c6{width:72px}.s-hz col.c7{width:68px}',
    '.s-hz col.c8{width:56px}.s-hz col.c9{width:54px}',
    // Medido: con 8px de relleno la tabla pedia 689 en un hueco de 676. Las
    // columnas numericas no necesitan tanto aire —su contenido son cuatro o
    // cinco caracteres— y bajarlo a 6 deja 28px de margen para el dia que un
    // rango venga mas largo. La del producto conserva los 8: ahi va la foto.
    '.s-hz td,.s-hz thead th{padding-left:6px;padding-right:6px}',
    '.s-hz td:nth-child(2),.s-hz thead th:nth-child(2){padding-left:8px;padding-right:10px}',
    // LAS NUMERICAS, JUNTAS. Cuando la tabla cabe sobra ancho, y una tabla
    // reparte el sobrante entre TODAS las columnas: los numeros acababan
    // separados por un desierto. Dandole el 100% a la del producto, el sobrante
    // se lo queda ella —que es la que tiene texto largo— y las de cifras se
    // encogen a su contenido, que es donde se comparan de un vistazo.

    // El `nowrap` va SOLO en las cabeceras, que son una palabra. En las celdas
    // no puede volver: es lo que desbordaba la tabla con los rangos.
    '.s-hz thead th{white-space:nowrap}',
    '.s-hz thead th:nth-child(2){white-space:normal}',
    '.s-hz thead th{white-space:normal}',
    '.s-hz td:nth-child(2){min-width:132px;max-width:190px}',
    '.s-hz-n{overflow-wrap:anywhere}',
    '@container (max-width:580px){.s-hz-wrap{overflow-x:hidden;background-image:none}}',
    '@media (max-width:580px){.s-hz-wrap{overflow-x:hidden;background-image:none}}',
    // POR QUE LLEVAN `position:relative` LOS PADRES. Esconder algo con
    // `position:absolute` lo saca de la caja que hace scroll si por encima no
    // hay ningun elemento posicionado: su bloque contenedor pasa a ser la
    // pagina entera, y entonces su posicion —que esta abajo del todo del hilo—
    // ESTIRA el area de scroll del BODY. El sintoma es el que se veia: una
    // segunda barra vertical que se pasa por debajo de la ventana de Sophie.
    //
    // Un `<span>` de un pixel movia 777 px de scroll. Pesa lo mismo contenerlo:
    // basta con que su padre este posicionado.
    '.s-hz-ckc{position:relative}',
    '.s-hz-oculto{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',

    /* La casilla y la fila elegida. */
    '.s-hz-ckc{width:38px;padding-right:0!important}',
    '.s-hz-lb{display:inline-flex;cursor:pointer;padding:2px}',
    '.s-hz-ck{width:17px;height:17px;accent-color:var(--hz-or);cursor:pointer;margin:0}',
    '.s-hz-ck:disabled{cursor:not-allowed;opacity:.35}',
    '.s-hz tbody tr.elegida{background:rgba(247,170,46,.10)}',
    '.s-hz tbody tr.elegida td:first-child{box-shadow:inset 3px 0 0 var(--hz-or)}',

    /* La barra de "analizar los elegidos". */
    '.s-hz-sel{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0 0;',
    'padding:11px 14px;border-radius:13px;background:rgba(247,170,46,.10);',
    'border:1px solid rgba(247,170,46,.30)}',
    '.s-hz-sel[hidden]{display:none}',
    '.s-hz-selc{font-size:13px;font-weight:700;color:var(--hz-or)}',
    // VERDE, NO NARANJA. En naranja con texto oscuro se leia negro y se perdia
    // entre los otros dos bloques naranjas de la pantalla. El verde es el unico
    // color de la suite que no se usa para avisar de nada: aqui dice "adelante".
    '.s-hz-selb{margin-left:auto;padding:10px 20px;border:0;border-radius:11px;cursor:pointer;',
    'background:#2fbf87;color:#06231a;font:inherit;font-size:13.5px;font-weight:800;',
    'box-shadow:0 2px 10px rgba(47,191,135,.28)}',
    '.s-hz-selb:hover{background:#35d499}',
    '.s-hz-selb:focus-visible{outline:2px solid #5fd6a6;outline-offset:2px}',
    '.s-hz{width:100%;border-collapse:collapse;font-size:14px}',
    '.s-hz thead th{text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.09em;',
    'text-transform:uppercase;color:var(--hz-tx3);padding:11px 12px;background:var(--hz-card);',
    'border-bottom:1px solid var(--hz-line);white-space:nowrap}',
    '.s-hz .s-hz-th-r{color:var(--hz-or)}',
    '.s-hz td{padding:12px;border-bottom:1px solid var(--hz-line2);vertical-align:top}',
    '.s-hz tbody tr:last-child td{border-bottom:0}',
    // SIN `nowrap`. Era eso lo que empujaba la tabla fuera del borde: los
    // rangos de un producto con variaciones —"$19K-50K", "1.28 - 1.30 lb",
    // "230-246"— no cabian y, en vez de partirse, ensanchaban su columna
    // hasta cortar las tres ultimas. Partir un rango en dos lineas no pierde
    // nada; empujarlo fuera de la pantalla si.
    '.s-hz td[data-num]{font-variant-numeric:tabular-nums;color:var(--hz-tx2);',
    'font-size:13px;overflow-wrap:anywhere}',
    '.s-hz-n{font-weight:700;color:var(--hz-tx);line-height:1.35;display:block}',
    /* El ratio (y el peso, en la otra tabla) en naranja: es la columna que hay
       que mirar, y engancha con el bloque naranja de abajo. */
    '.s-hz-r{color:var(--hz-or);font-weight:800}',
    '.s-hz-var{display:inline-block;margin-top:5px;padding:2px 8px;border-radius:999px;',
    'font-size:11px;font-weight:700;color:var(--hz-tx2);background:var(--hz-card);',
    'border:1px solid var(--hz-line)}',
    '.s-hz-nr td{padding-top:0;font-size:12.5px;line-height:1.5;color:var(--hz-tx3)}',
    '.s-hz-prod{display:flex;gap:10px;align-items:flex-start}',
    // AL PASAR EL RATON SE VE GRANDE. Una miniatura de 42px dice que hay una
    // foto; no deja mirarla. Y mirar el producto es la mitad del descarte.
    // Crece en su sitio, sobre lo demas, sin abrir nada ni pedir otro clic.
    '.s-hz-prod{position:relative}',
    '.s-hz-img{width:42px;height:42px;flex:none;border-radius:8px;object-fit:contain;',
    'background:#fff;padding:3px;transition:transform .16s ease,box-shadow .16s ease;',
    'transform-origin:left center;cursor:zoom-in}',
    '.s-hz-img:hover,.s-hz-img:focus-visible{transform:scale(4.2);z-index:5;position:relative;',
    'box-shadow:0 10px 34px rgba(0,0,0,.5);border-radius:4px}',
    // La fila que tiene el raton encima se pone por delante: sin esto la foto
    // ampliada queda por DEBAJO de la fila siguiente y se ve cortada.
    '.s-hz tbody tr:hover{position:relative;z-index:4}',
    '@media (hover:none){.s-hz-img:hover{transform:none}}',
    '@media (prefers-reduced-motion:reduce){.s-hz-img{transition:none}}',
    '.s-hz-pesado{color:var(--hz-or);font-weight:800}',
    '.s-hz-meta{display:block;margin-top:2px;font-size:11.5px;color:var(--hz-tx3);font-weight:600}',
    '.s-hz-meta code{font-size:11px;letter-spacing:.02em;opacity:.85}',
    '.s-hz-star{display:block;font-size:11.5px;color:var(--hz-or);font-weight:700}',
    '.s-hz-sub{display:block;font-size:11.5px;color:var(--hz-tx3);font-weight:600}',
    '.s-hz-th2{font-size:9px;letter-spacing:.05em;opacity:.75;font-weight:700}',

    /* La franja de cifras, al estilo de la extension pero con la identidad de
       Sophie: navy, naranja y el mismo radio de esquina que el resto. */
    /* TRES O SEIS, NUNCA CINCO Y UNA HUÉRFANA. Con `auto-fit` la sexta tarjeta
       se quedaba sola en una segunda fila en cuanto el ancho no daba para las
       seis. Tres y seis dividen exacto una franja de seis cifras. */
    '.s-hz-cifras{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:13px 0 0}',
    '@media (min-width:780px){.s-hz-cifras{grid-template-columns:repeat(6,1fr)}}',
    '@media (max-width:430px){.s-hz-cifras{grid-template-columns:repeat(2,1fr)}}',
    /* La caja tiene que VERSE. Con el gris de tarjeta de la suite (4% de blanco)
       las cifras quedaban flotando sobre el fondo, sin la forma de panel que es
       justo lo que hace que se lean de un vistazo. */
    '.s-hz-tile{padding:11px 13px;border-radius:12px;background:rgba(255,255,255,.055);',
    'border:1px solid var(--hz-line);min-width:0}',
    '.s-hz-cifras.prov .s-hz-tile{background:rgba(247,170,46,.07);',
    'border-color:rgba(247,170,46,.30)}',
    '.s-hz-te{font-size:9.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;',
    'color:var(--hz-tx3);line-height:1.3}',
    '.s-hz-tv{margin-top:4px;font-size:19px;font-weight:800;color:var(--hz-tx);',
    'font-variant-numeric:tabular-nums;line-height:1.15}',
    '.s-hz-cifras.prov .s-hz-tv{color:var(--hz-or)}',
    '.s-hz-tn{margin-top:2px;font-size:11px;color:var(--hz-tx3)}',
    '.s-hz-prov.s-hz-prov{margin:8px 0 0;font-size:12px;line-height:1.5;color:var(--hz-or)}',

    /* Con qué filtré: el paso que antes tecleaba el estudiante, ahora visible. */
    '.s-hz-filtros{margin:12px 0 0;padding:13px 15px;border-radius:14px;',
    'background:var(--hz-card);border:1px solid var(--hz-line)}',
    '.s-hz-fl{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}',
    '.s-hz-fl li{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;font-size:13px;line-height:1.45}',
    '.s-hz-fq{font-weight:800;color:var(--hz-tx);min-width:74px}',
    '.s-hz-fv{font-weight:800;color:var(--hz-or);font-variant-numeric:tabular-nums}',
    '.s-hz-fp{color:var(--hz-tx2);flex:1 1 240px}',
    '.s-hz-ajusta.s-hz-ajusta{margin:10px 0 0;font-size:12.5px;color:var(--hz-tx3);font-style:italic}',

    /* Qué hice · Por qué · Qué decides tú. El paso a paso, en cada pantalla. */
    '.s-hz-metodo{margin:14px 0 0;border-radius:14px;overflow:hidden;',
    'border:1px solid var(--hz-line)}',
    '.s-hz-mf{display:flex;gap:11px;padding:11px 15px;font-size:13px;line-height:1.5;',
    'border-bottom:1px solid var(--hz-line2);background:var(--hz-card)}',
    '.s-hz-mf:last-child{border-bottom:0}',
    '.s-hz-mf.decides{background:rgba(247,170,46,.10)}',
    '.s-hz-me{flex:none;min-width:108px;font-weight:800;font-size:11px;letter-spacing:.06em;',
    'text-transform:uppercase;color:var(--hz-tx3);padding-top:2px}',
    '.s-hz-mf.decides .s-hz-me{color:var(--hz-or)}',
    '.s-hz-mt{color:var(--hz-tx)}',
    '@media (max-width:620px){.s-hz-mf{flex-direction:column;gap:3px}.s-hz-me{min-width:0}}',

    /* Los tres filtros de la puerta: el estado de un vistazo, y el que esta
       pendiente en naranja porque es lo unico que se le pide al estudiante. */
    '.s-hz-fs{list-style:none;margin:12px 0 0;padding:0;display:flex;',
    'flex-direction:column;gap:7px}',
    '.s-hz-f{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;',
    'padding:9px 12px;border-radius:11px;background:var(--hz-card);',
    'border:1px solid var(--hz-line2);font-size:13.5px;line-height:1.45}',
    '.s-hz-f.pend{background:rgba(247,170,46,.10);border-color:rgba(247,170,46,.32)}',
    '.s-hz-fi{flex:none}',
    '.s-hz-fn{font-weight:800;color:var(--hz-tx)}',
    '.s-hz-f.pend .s-hz-fn{color:var(--hz-or)}',
    '.s-hz-fx{color:var(--hz-tx2);flex:1 1 220px}',

    '.s-hz-leyenda{margin:14px 0 4px;padding:14px 16px;border-radius:14px;',
    'background:rgba(247,170,46,.10);border:1px solid rgba(247,170,46,.32)}',
    '.s-hz-lt{font-size:13px;font-weight:800;color:var(--hz-or);margin-bottom:5px}',
    '.s-hz-lf.s-hz-lf{margin:0 0 8px;font-size:12.5px;color:var(--hz-or);opacity:.85;',
    'font-variant-numeric:tabular-nums}',
    '.s-hz-lp.s-hz-lp{margin:0;font-size:13.5px;line-height:1.6;color:var(--hz-tx)}',
    '.s-hz-ll{margin:0;padding-left:18px;font-size:13px;line-height:1.55;color:var(--hz-tx)}',
    '.s-hz-ll li{margin:4px 0}',
    '.s-hz-ll b{color:var(--hz-or)}',
    '.s-hz-ll em{font-style:normal;text-decoration:underline;text-underline-offset:2px}',

    /* En pantalla estrecha una tabla de seis columnas no se lee: se rompe en
       bloques, uno por producto, con la etiqueta de cada dato al lado. Sigue
       siendo la misma tabla — no hay una segunda version que mantener. */
    // QUIEN DECIDE: EL ANCHO DE LA TARJETA, NO EL DE LA VENTANA.
    //
    // Con `@media` la tabla miraba el viewport y la tarjeta de chat mide
    // siempre ~676px, sea la ventana de 760 o de 1400. Resultado: en una
    // ventana ancha el navegador creia que cabia una tabla de columnas dentro
    // de un hueco de 676 y cortaba las tres ultimas. Eso es lo que se vio.
    //
    // `@container` pregunta por el hueco DE VERDAD. Las mismas reglas se emiten
    // dos veces —una en @container y otra en @media— porque un navegador sin
    // soporte de contenedores tiene que apilar igual: en ese caso el corte por
    // viewport es una aproximacion peor, pero nunca deja un dato fuera.
    '@container (max-width:580px){',
    '.s-hz{position:relative}',
    '.s-hz thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
    '.s-hz,.s-hz tbody,.s-hz tr,.s-hz td{display:block;width:100%}',
    '.s-hz tbody tr{padding:12px 6px;border-bottom:1px solid var(--hz-line2)}',
    '.s-hz tbody tr:last-child{border-bottom:0}',
    '.s-hz tbody tr.s-hz-nr{padding-top:0;border-bottom:0}',
    '.s-hz td{border:0;padding:3px 8px;display:flex;justify-content:space-between;gap:14px}',
    '.s-hz td:first-child{display:block;padding-bottom:7px}',
    // En movil la casilla va arriba de su bloque, sola y sin etiqueta: la fila
    // entera es el producto, asi que "Elegir" no aporta nada y roba una linea.
    '.s-hz td.s-hz-ckc{display:block;padding:0 8px 4px}',
    '.s-hz td.s-hz-ckc::before{content:none}',
    '.s-hz td[data-num]::before{content:attr(data-l);font-size:11px;font-weight:800;',
    'letter-spacing:.07em;text-transform:uppercase;color:var(--hz-tx3)}',

    '}',
    '@media (max-width:580px){',
    '.s-hz{position:relative}',
    '.s-hz thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
    '.s-hz,.s-hz tbody,.s-hz tr,.s-hz td{display:block;width:100%}',
    '.s-hz tbody tr{padding:12px 6px;border-bottom:1px solid var(--hz-line2)}',
    '.s-hz tbody tr:last-child{border-bottom:0}',
    '.s-hz tbody tr.s-hz-nr{padding-top:0;border-bottom:0}',
    '.s-hz td{border:0;padding:3px 8px;display:flex;justify-content:space-between;gap:14px}',
    '.s-hz td:first-child{display:block;padding-bottom:7px}',
    // En movil la casilla va arriba de su bloque, sola y sin etiqueta: la fila
    // entera es el producto, asi que "Elegir" no aporta nada y roba una linea.
    '.s-hz td.s-hz-ckc{display:block;padding:0 8px 4px}',
    '.s-hz td.s-hz-ckc::before{content:none}',
    '.s-hz td[data-num]::before{content:attr(data-l);font-size:11px;font-weight:800;',
    'letter-spacing:.07em;text-transform:uppercase;color:var(--hz-tx3)}',

    '}',  ].join('');

  function asegurarEstilo() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sophie-hz-css')) return;
    var s = document.createElement('style');
    s.id = 'sophie-hz-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  // Pinta dentro de un contenedor .landing ya existente. Devuelve true si pudo.
  function pintar(container, payload) {
    var h = html(payload);
    if (!h || !container) return false;
    asegurarEstilo();
    container.innerHTML = h;
    try { engancharEleccion(container); } catch (e) { /* la tabla ya esta: se lee igual */ }
    return true;
  }

  global.SophieHallazgos = {
    version: '1.0',
    nombreDe: nom,
    disponible: disponible,
    // La lista de candidatos que Sophie encontró (salida de `descubrir`).
    detectar: detectar,
    limpiar: limpiar,
    html: html,
    pintar: pintar,
    // La puerta de entrada: los 3 filtros + la tabla de competidores.
    detectarValidacion: detectarValidacion,
    limpiarValidacion: limpiarValidacion,
    htmlValidacion: htmlValidacion,
    pintarValidacion: pintarValidacion
  };

})(window);
