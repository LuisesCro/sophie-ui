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
       "productos":[
         { "nombre":"Epoxy Resin Kit 1 Gal",
           "precio":"$50", "revenue":"$109K",
           "resenas":42, "ratio":52, "meses":28,
           "variaciones":7,                       // opcional
           "nota":"…" }                           // opcional
       ],
       "cta":"¿Cuál te llama? 👇"                 // opcional
     }-->

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
      .replace(/<!--[PM]:[^>]*-->/g, '')
      .trim();
  }

  /* ---------- celdas ---------- */

  // El modelo puede mandar un número o un rango en texto ("$24–51",
  // "230–246"). Los dos son válidos: un producto con variaciones tiene
  // rango de verdad, y redondearlo a un número sería inventar precisión.
  function celda(v) {
    if (v === null || v === undefined || v === '') return '—';
    return esc(v);
  }

  // El ratio es la columna que el estudiante tiene que mirar, así que se
  // marca. No lleva semáforo: un ratio alto NO es un aprobado por sí solo
  // —depende de la edad del producto— y pintarlo verde diría lo contrario
  // de lo que enseña la leyenda de abajo.
  function ratio(v) {
    if (v === null || v === undefined || v === '') return '<span class="s-hz-r">—</span>';
    return '<span class="s-hz-r">' + esc(v) + '</span>';
  }

  function fila(p) {
    p = p || {};
    var badge = p.variaciones && Number(p.variaciones) > 1
      ? '<span class="s-hz-var" title="Un mismo producto con varias variaciones">' +
        esc(p.variaciones) + ' variaciones</span>'
      : '';

    var tr = '<tr>' +
      '<td data-l="Producto"><span class="s-hz-n">' + esc(p.nombre) + '</span>' + badge + '</td>' +
      '<td data-l="Precio"   data-num>' + celda(p.precio) + '</td>' +
      '<td data-l="Revenue"  data-num>' + celda(p.revenue) + '</td>' +
      '<td data-l="Reseñas"  data-num>' + celda(p.resenas) + '</td>' +
      '<td data-l="Ratio"    data-num>' + ratio(p.ratio) + '</td>' +
      '<td data-l="Meses"    data-num>' + celda(p.meses) + '</td>' +
      '</tr>';

    // LA NOTA VA EN SU PROPIA FILA, a lo ancho. Dentro de la primera celda se
    // envolvía en una columna estrecha —siete líneas para una frase— y dejaba
    // el resto de la fila en blanco: la tabla se rompía justo en el producto
    // que más explicación necesita, que es el que tiene variaciones.
    if (p.nota) tr += '<tr class="s-hz-nr"><td colspan="6">' + esc(p.nota) + '</td></tr>';
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

  function html(payload) {
    if (!payload || !Array.isArray(payload.productos) || !payload.productos.length) return null;

    var filas = payload.productos.map(fila).join('');

    return cabecera(payload, 3) +
      '<div class="s-body">' +
        '<h1>' + esc(payload.titulo || 'Esto es lo que encontré') + '</h1>' +
        (payload.intro ? '<p class="s-lead">' + esc(payload.intro) + '</p>' : '') +
        '<div class="s-hz-wrap">' +
          '<table class="s-hz">' +
            '<thead><tr>' +
              '<th>Producto</th><th>Precio</th><th>Revenue</th>' +
              '<th>Reseñas</th><th class="s-hz-th-r">Ratio</th><th>Meses</th>' +
            '</tr></thead>' +
            '<tbody>' + filas + '</tbody>' +
          '</table>' +
        '</div>' +
        LEYENDA +
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
      .replace(/<!--[PM]:[^>]*-->/g, '')
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
      '<span class="s-hz-fn">' + esc(f.nombre) + '</span>' +
      (f.nota ? '<span class="s-hz-fx">' + esc(f.nota) + '</span>' : '') +
      '</li>';
  }

  // El PESO es la columna que delata al que no compite contigo —un pack de 10
  // pesa cuatro veces lo que un ovillo— así que va marcada, igual que el ratio
  // en la otra tabla. Es donde tiene que caer el ojo para contestar.
  function filaComp(c) {
    c = c || {};
    return '<tr>' +
      '<td data-l="Competidor"><span class="s-hz-n">' + esc(c.nombre) + '</span></td>' +
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
        filtros +
        '<div class="s-hz-wrap">' +
          '<table class="s-hz">' +
            '<thead><tr>' +
              '<th>Competidor</th><th>Precio</th><th class="s-hz-th-r">Peso</th><th>Reseñas</th>' +
            '</tr></thead>' +
            '<tbody>' + payload.competidores.map(filaComp).join('') + '</tbody>' +
          '</table>' +
        '</div>' +
        porque +
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
    '.s-hz-wrap,.s-hz-leyenda,.s-hz-fs{',
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
    '.s-hz-wrap{margin:14px 0 4px;border:1px solid var(--hz-line);border-radius:14px;',
    'overflow:hidden;background:var(--hz-card)}',
    '.s-hz{width:100%;border-collapse:collapse;font-size:14px}',
    '.s-hz thead th{text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.09em;',
    'text-transform:uppercase;color:var(--hz-tx3);padding:11px 12px;background:var(--hz-card);',
    'border-bottom:1px solid var(--hz-line);white-space:nowrap}',
    '.s-hz .s-hz-th-r{color:var(--hz-or)}',
    '.s-hz td{padding:12px;border-bottom:1px solid var(--hz-line2);vertical-align:top}',
    '.s-hz tbody tr:last-child td{border-bottom:0}',
    '.s-hz td[data-num]{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--hz-tx2)}',
    '.s-hz-n{font-weight:700;color:var(--hz-tx);line-height:1.35;display:block}',
    /* El ratio (y el peso, en la otra tabla) en naranja: es la columna que hay
       que mirar, y engancha con el bloque naranja de abajo. */
    '.s-hz-r{color:var(--hz-or);font-weight:800}',
    '.s-hz-var{display:inline-block;margin-top:5px;padding:2px 8px;border-radius:999px;',
    'font-size:11px;font-weight:700;color:var(--hz-tx2);background:var(--hz-card);',
    'border:1px solid var(--hz-line)}',
    '.s-hz-nr td{padding-top:0;font-size:12.5px;line-height:1.5;color:var(--hz-tx3)}',

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
    '.s-hz-lf{margin:0 0 8px;font-size:12.5px;color:var(--hz-or);opacity:.85;',
    'font-variant-numeric:tabular-nums}',
    '.s-hz-lp{margin:0;font-size:13.5px;line-height:1.6;color:var(--hz-tx)}',
    '.s-hz-ll{margin:0;padding-left:18px;font-size:13px;line-height:1.55;color:var(--hz-tx)}',
    '.s-hz-ll li{margin:4px 0}',
    '.s-hz-ll b{color:var(--hz-or)}',
    '.s-hz-ll em{font-style:normal;text-decoration:underline;text-underline-offset:2px}',

    /* En pantalla estrecha una tabla de seis columnas no se lee: se rompe en
       bloques, uno por producto, con la etiqueta de cada dato al lado. Sigue
       siendo la misma tabla — no hay una segunda version que mantener. */
    '@media (max-width:620px){',
    '.s-hz thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
    '.s-hz,.s-hz tbody,.s-hz tr,.s-hz td{display:block;width:100%}',
    '.s-hz tbody tr{padding:12px 6px;border-bottom:1px solid var(--hz-line2)}',
    '.s-hz tbody tr:last-child{border-bottom:0}',
    '.s-hz tbody tr.s-hz-nr{padding-top:0;border-bottom:0}',
    '.s-hz td{border:0;padding:3px 8px;display:flex;justify-content:space-between;gap:14px}',
    '.s-hz td:first-child{display:block;padding-bottom:7px}',
    '.s-hz td[data-num]::before{content:attr(data-l);font-size:11px;font-weight:800;',
    'letter-spacing:.07em;text-transform:uppercase;color:var(--hz-tx3)}',
    '}'
  ].join('');

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
    return true;
  }

  global.SophieHallazgos = {
    version: '1.0',
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
