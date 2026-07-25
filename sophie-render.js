/* ============================================================
   SOPHIE RENDER — Renderizador de componentes de Crezcamos Online
   v1.0 · ui.crezcamosonline.com/sophie-render.js
   Sin dependencias. Sin build. Cargar con <script src="...">.

   USO BÁSICO (render de una sola vez):
     Sophie.render('#resultado', payload);

   USO PROGRESIVO (3 llamadas en paralelo — el modo rápido):
     const s = Sophie.mount('#resultado', {
       esqueleto: { metricas: 4, scorecard: 13 }
     });
     s.metricas(datos);      // llega la llamada Haiku
     s.scorecard(filas);     // lo calcula tu motor local (instantáneo)
     s.veredicto(v);         // llega la llamada Sonnet
     s.cadena(siguiente);
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- utilidades ---------- */

  // Todo texto que venga del modelo pasa por aquí. No negociable.
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Permite **negrita** dentro de textos del modelo, sin abrir la puerta a HTML.
  function md(v) {
    return esc(v).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function el(sel) {
    return typeof sel === 'string' ? document.querySelector(sel) : sel;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  var ICONO = { pass: '&#10003;', alerta: '&#33;', fail: '&#10007;' };

  function norm(e) {
    e = String(e || '').toLowerCase();
    if (['pass', 'ok', 'aprobado', 'go', 'si', 'sí'].indexOf(e) > -1) return 'pass';
    if (['fail', 'critico', 'crítico', 'reprobado', 'nogo', 'no'].indexOf(e) > -1) return 'fail';
    if (['alerta', 'warn', 'riesgo', 'parcial'].indexOf(e) > -1) return 'alerta';
    return 'neutro';
  }

  /* ---------- componentes (devuelven HTML) ---------- */

  function cVeredicto(v) {
    if (!v) return '';
    var estado = String(v.veredicto || v.estado || 'info').toLowerCase().replace(/[\s_-]/g, '');
    var apr = v.criterios && v.criterios.aprobados;
    var tot = v.criterios && v.criterios.total;

    var puntaje = '';
    if (v.puntaje !== undefined && v.puntaje !== null) {
      puntaje =
        '<div class="s-veredicto__puntaje">' +
          '<b>' + esc(v.puntaje) + (v.puntaje_max ? '<span style="opacity:.4">/' + esc(v.puntaje_max) + '</span>' : '') + '</b>' +
          '<span>' + (apr != null && tot != null ? esc(apr) + ' de ' + esc(tot) + ' criterios' : 'puntaje') + '</span>' +
        '</div>';
    }

    return '' +
      '<div class="s-veredicto" data-estado="' + esc(estado) + '" role="status">' +
        '<div class="s-veredicto__top">' +
          '<div class="s-veredicto__badge">' + esc(v.etiqueta || v.veredicto || '') + '</div>' +
          puntaje +
        '</div>' +
        (v.titular ? '<h3 class="s-veredicto__titular">' + esc(v.titular) + '</h3>' : '') +
        (v.razon ? '<p class="s-veredicto__razon">' + md(v.razon) + '</p>' : '') +
      '</div>';
  }

  function cMetricas(items, titulo) {
    if (!items || !items.length) return '';
    var h = items.map(function (m) {
      return '' +
        '<div class="s-metrica" data-estado="' + esc(norm(m.estado) === 'pass' ? 'ok' : norm(m.estado) === 'fail' ? 'critico' : norm(m.estado)) + '">' +
          '<div class="s-metrica__label"><span class="s-metrica__dot"></span>' + esc(m.label) + '</div>' +
          '<div class="s-metrica__valor">' + esc(m.valor) + '</div>' +
          (m.nota ? '<div class="s-metrica__nota">' + esc(m.nota) + '</div>' : '') +
        '</div>';
    }).join('');

    return '<section class="s-card">' +
      '<p class="s-card__eyebrow">' + esc(titulo || 'Radiografía') + '</p>' +
      '<div class="s-metricas">' + h + '</div>' +
    '</section>';
  }

  // Barra de distancia al umbral: marca central = umbral.
  // Izquierda del centro = por debajo. Derecha = por encima.
  function barraUmbral(f) {
    var v = parseFloat(f.valor_num), u = parseFloat(f.umbral_num);
    if (isNaN(v) || isNaN(u) || u === 0) return '';
    var dir = (f.direccion || 'min').toLowerCase();
    var ratio = dir === 'max' ? (v === 0 ? 2 : u / v) : v / u;
    var ancho = clamp(ratio, 0, 2) / 2 * 100;
    return '' +
      '<div class="s-umbral" aria-hidden="true">' +
        '<div class="s-umbral__fill" style="width:' + ancho.toFixed(1) + '%"></div>' +
        '<div class="s-umbral__marca"></div>' +
      '</div>';
  }

  function cScorecard(filas, titulo) {
    if (!filas || !filas.length) return '';

    var h = filas.map(function (f, i) {
      var e = norm(f.estado);
      var id = 's-lec-' + Math.random().toString(36).slice(2, 8);
      var tieneLeccion = !!(f.por_que || f.leccion || f.error_comun || (f.glosario && f.glosario.length));

      var leccion = '';
      if (tieneLeccion) {
        leccion = '<div class="s-leccion" id="' + id + '" hidden>' +
          (f.por_que ? '<div><p class="s-leccion__t">Por qué este criterio</p><p class="s-leccion__p">' + md(f.por_que) + '</p></div>' : '') +
          (f.leccion ? '<div><p class="s-leccion__t">La lección</p><p class="s-leccion__p"><em>' + md(f.leccion) + '</em></p></div>' : '') +
          (f.error_comun ? '<div><p class="s-leccion__t">Error común</p><p class="s-leccion__p">' + md(f.error_comun) + '</p></div>' : '') +
          (f.glosario && f.glosario.length
            ? '<div class="s-glosario">' + f.glosario.map(function (g) { return '<span>' + esc(g) + '</span>'; }).join('') + '</div>'
            : '') +
        '</div>';
      }

      return '' +
        '<div class="s-fila" data-estado="' + e + '" aria-expanded="false" style="animation-delay:' + (i * 22) + 'ms">' +
          '<button class="s-fila__head" type="button"' +
            (tieneLeccion ? ' aria-controls="' + id + '"' : ' disabled style="cursor:default"') + '>' +
            '<span class="s-fila__icono">' + (ICONO[e] || '&#8226;') + '</span>' +
            '<span class="s-fila__criterio">' + esc(f.criterio) + '</span>' +
            '<span class="s-fila__cifras"><b>' + esc(f.valor) + '</b> <span>vs ' + esc(f.umbral) + '</span></span>' +
            '<span class="s-fila__chev">' + (tieneLeccion ? '&#9656;' : '') + '</span>' +
          '</button>' +
          barraUmbral(f) +
          leccion +
        '</div>';
    }).join('');

    return '<section class="s-card">' +
      '<p class="s-card__eyebrow">' + esc(titulo || 'Scorecard · 13 criterios') + '</p>' +
      '<div class="s-scorecard">' + h + '</div>' +
    '</section>';
  }

  function cArbol(capas, titulo) {
    if (!capas || !capas.length) return '';
    var h = capas.map(function (c, i) {
      var e = norm(c.estado);
      var mapa = { pass: 'ok', fail: 'critico', alerta: 'alerta' };
      return '' +
        '<div class="s-capa" data-estado="' + (mapa[e] || 'neutro') + '" style="animation-delay:' + (i * 70) + 'ms">' +
          '<div class="s-capa__n">' + (i + 1) + '</div>' +
          '<div>' +
            '<div class="s-capa__nombre">' + esc(c.nombre) + '</div>' +
            (c.detalle ? '<div class="s-capa__det">' + esc(c.detalle) + '</div>' : '') +
          '</div>' +
          '<span class="s-pill">' + esc(c.etiqueta || c.estado) + '</span>' +
        '</div>';
    }).join('');

    return '<section class="s-card">' +
      '<p class="s-card__eyebrow">' + esc(titulo || 'Árbol de diagnóstico') + '</p>' +
      '<div class="s-arbol">' + h + '</div>' +
    '</section>';
  }

  function cTabla(t) {
    if (!t || !t.filas || !t.filas.length) return '';
    var cols = t.columnas || Object.keys(t.filas[0]);

    var thead = '<tr>' + cols.map(function (c) {
      return '<th>' + esc(typeof c === 'object' ? c.label : c) + '</th>';
    }).join('') + '</tr>';

    var tbody = t.filas.map(function (f) {
      var celdas = cols.map(function (c) {
        var key = typeof c === 'object' ? c.key : c;
        var val = f[key];
        var attrs = '';
        if (typeof c === 'object' && c.num) attrs += ' data-num';
        if (f._estados && f._estados[key]) attrs += ' data-estado="' + norm(f._estados[key]) + '"';
        return '<td' + attrs + '>' + esc(val) + '</td>';
      }).join('');
      return '<tr' + (f._destacar ? ' data-destacar="true"' : '') + '>' + celdas + '</tr>';
    }).join('');

    return '<section class="s-card">' +
      (t.titulo ? '<p class="s-card__eyebrow">' + esc(t.titulo) + '</p>' : '') +
      '<div class="s-tabla-wrap"><table class="s-tabla"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div>' +
    '</section>';
  }

  function cBloqueados(items) {
    if (!items || !items.length) return '';
    var h = items.map(function (b, i) {
      return '' +
        '<div class="s-bloqueado" style="animation-delay:' + (i * 60) + 'ms">' +
          '<span class="s-bloqueado__ico">&#128274;</span>' +
          '<div>' +
            '<div class="s-bloqueado__t">' + esc(b.titulo) + '</div>' +
            (b.motivo ? '<div class="s-bloqueado__d">' + esc(b.motivo) + '</div>' : '') +
          '</div>' +
          '<span class="s-bloqueado__tag">' + esc(b.tag || 'Bloqueado') + '</span>' +
        '</div>';
    }).join('');
    return '<div class="s-bloqueos">' + h + '</div>';
  }

  function cCadena(c) {
    if (!c) return '';
    var boton = c.url
      ? '<a class="s-btn' + (c.fantasma ? ' s-btn--fantasma' : '') + '" href="' + esc(c.url) + '">' + esc(c.cta) + '</a>'
      : '<button class="s-btn' + (c.fantasma ? ' s-btn--fantasma' : '') + '" type="button" data-sophie-cadena="' + esc(c.modulo || '') + '"' +
        (c.enviar ? ' data-sophie-enviar="' + esc(c.enviar) + '"' : '') + '>' + esc(c.cta) + '</button>';

    return '' +
      '<div class="s-cadena">' +
        '<div class="s-cadena__txt">' +
          (c.paso ? '<div class="s-cadena__paso">' + esc(c.paso) + '</div>' : '') +
          '<div class="s-cadena__t">' + esc(c.titulo || '') + '</div>' +
          (c.detalle ? '<div class="s-cadena__d">' + esc(c.detalle) + '</div>' : '') +
        '</div>' +
        boton +
      '</div>';
  }

  function cError(msg, detalle) {
    return '<div class="s-error">' +
      '<div class="s-error__t">' + esc(msg || 'Sophie no pudo completar el análisis') + '</div>' +
      '<div class="s-error__d">' + esc(detalle || 'Vuelve a intentarlo. Si persiste, revisa que los datos de entrada estén completos.') + '</div>' +
    '</div>';
  }

  /* ---------- esqueletos ---------- */

  function esqMetricas(n) {
    var c = '';
    for (var i = 0; i < (n || 4); i++) c += '<div class="s-esq s-esq--met"></div>';
    return '<section class="s-card">' +
      '<p class="s-card__eyebrow">Radiografía</p>' +
      '<div class="s-metricas">' + c + '</div>' +
    '</section>';
  }

  function esqScorecard(n) {
    var c = '';
    for (var i = 0; i < (n || 13); i++) c += '<div class="s-esq s-esq--fila"></div>';
    return '<section class="s-card">' +
      '<p class="s-card__eyebrow">Scorecard · ' + (n || 13) + ' criterios</p>' +
      c +
    '</section>';
  }

  function esqVeredicto(msg) {
    return '<section class="s-card">' +
      '<div class="s-cargando"><span class="s-cargando__punto"></span>' + esc(msg || 'Sophie está evaluando el veredicto…') + '</div>' +
      '<div class="s-esq s-esq--card" style="margin-top:14px"></div>' +
    '</section>';
  }

  function esqTabla() { return '<section class="s-card"><div class="s-esq s-esq--card"></div></section>'; }
  function esqArbol()  { return '<section class="s-card"><div class="s-esq s-esq--card"></div></section>'; }

  /* ---------- montaje progresivo ---------- */

  // Orden canónico: la evidencia primero, el veredicto después.
  // Los bloques se pintan en este orden sin importar en qué orden lleguen las llamadas.
  var SLOTS = ['error', 'metricas', 'tabla', 'arbol', 'scorecard', 'veredicto', 'bloqueados', 'cadena'];

  function mount(sel, opts) {
    var host = el(sel);
    if (!host) throw new Error('Sophie: no encuentro el contenedor ' + sel);
    opts = opts || {};

    host.classList.add('sophie-root');
    host.innerHTML = SLOTS.map(function (s) {
      return '<div data-slot="' + s + '"></div>';
    }).join('');

    var slot = {};
    SLOTS.forEach(function (s) { slot[s] = host.querySelector('[data-slot="' + s + '"]'); });

    // Esqueleto inmediato: esto es lo que hace que Sophie se sienta rápida.
    var esq = opts.esqueleto || {};
    if (esq.metricas)  slot.metricas.innerHTML  = esqMetricas(esq.metricas);
    if (esq.scorecard) slot.scorecard.innerHTML = esqScorecard(esq.scorecard);
    if (esq.arbol)     slot.arbol.innerHTML     = esqArbol();
    if (esq.tabla)     slot.tabla.innerHTML     = esqTabla();
    if (esq.veredicto !== false) slot.veredicto.innerHTML = esqVeredicto(opts.mensaje);

    var api = {
      host: host,

      metricas: function (d, t) { slot.metricas.innerHTML = cMetricas(d, t); return api; },
      scorecard: function (d, t) { slot.scorecard.innerHTML = cScorecard(d, t); return api; },
      arbol: function (d, t) { slot.arbol.innerHTML = cArbol(d, t); return api; },
      tabla: function (d) { slot.tabla.innerHTML = cTabla(d); return api; },
      bloqueados: function (d) { slot.bloqueados.innerHTML = cBloqueados(d); return api; },
      cadena: function (d) { slot.cadena.innerHTML = cCadena(d); return api; },

      veredicto: function (d) {
        slot.veredicto.innerHTML = cVeredicto(d);
        if (d && d.bloqueados) api.bloqueados(d.bloqueados);
        if (d && d.siguiente_paso) api.cadena(d.siguiente_paso);
        return api;
      },

      error: function (m, d) {
        SLOTS.forEach(function (s) { if (s !== 'error') slot[s].innerHTML = ''; });
        slot.error.innerHTML = cError(m, d);
        return api;
      },

      limpiar: function () {
        SLOTS.forEach(function (s) { slot[s].innerHTML = ''; });
        return api;
      },

      // Pinta un payload completo de una sola vez.
      todo: function (p) {
        p = p || {};
        if (p.metricas)   api.metricas(p.metricas, p.titulo_metricas);
        else slot.metricas.innerHTML = '';
        if (p.tabla)      api.tabla(p.tabla);       else slot.tabla.innerHTML = '';
        if (p.arbol)      api.arbol(p.arbol, p.titulo_arbol); else slot.arbol.innerHTML = '';
        if (p.scorecard)  api.scorecard(p.scorecard, p.titulo_scorecard); else slot.scorecard.innerHTML = '';
        api.veredicto(p.veredicto || p);
        if (p.bloqueados) api.bloqueados(p.bloqueados);
        if (p.siguiente_paso) api.cadena(p.siguiente_paso);
        return api;
      }
    };

    return api;
  }

  function render(sel, payload) {
    return mount(sel, { esqueleto: {} }).todo(payload);
  }

  /* ---------- parser tolerante de JSON del modelo ---------- */

  // Claude a veces envuelve el JSON en backticks o añade un preámbulo.
  // Esto lo rescata en vez de romper la pantalla del estudiante.
  function parseJSON(texto) {
    if (typeof texto === 'object') return texto;
    var t = String(texto).trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(t); } catch (e) {}
    var i = t.indexOf('{'), j = t.lastIndexOf('}');
    if (i > -1 && j > i) {
      try { return JSON.parse(t.slice(i, j + 1)); } catch (e2) {}
    }
    throw new Error('Sophie: la respuesta no es JSON válido');
  }

  /* ---------- acordeón académico (delegación de eventos) ---------- */

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.s-fila__head');
    if (!btn) return;
    var fila = btn.closest('.s-fila');
    var lec = fila.querySelector('.s-leccion');
    if (!lec) return;
    var abierto = fila.getAttribute('aria-expanded') === 'true';
    fila.setAttribute('aria-expanded', abierto ? 'false' : 'true');
    lec.hidden = abierto;
  });

  /* ---------- botón de la cadena (delegación de eventos) ---------- */

  // La página anfitriona decide qué hacer definiendo Sophie.alContinuar:
  //   Sophie.alContinuar = function (modulo, texto) { if (texto) send(texto); };
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-sophie-cadena]');
    if (!btn) return;
    var modulo = btn.getAttribute('data-sophie-cadena') || '';
    var texto = btn.getAttribute('data-sophie-enviar') || '';
    if (typeof global.Sophie.alContinuar === 'function') {
      btn.disabled = true;
      try { global.Sophie.alContinuar(modulo, texto); }
      catch (e) { btn.disabled = false; console.warn('Sophie: alContinuar falló', e); }
    }
  });

  /* ---------- API pública ---------- */

  global.Sophie = {
    version: '1.0',
    mount: mount,
    render: render,
    parseJSON: parseJSON,
    componentes: {
      veredicto: cVeredicto,
      metricas: cMetricas,
      scorecard: cScorecard,
      arbol: cArbol,
      tabla: cTabla,
      bloqueados: cBloqueados,
      cadena: cCadena,
      error: cError
    },
    esc: esc
  };

})(window);
