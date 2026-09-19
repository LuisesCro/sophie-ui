/* ============================================================
   SOPHIE · LISTING v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-listing.js

   Conecta sophie-keywords.js con el módulo de Sophie Listing.

   Requiere, en este orden:
     sophie-ui.css · sophie-oscuro.css · sophie-render.js · sophie-keywords.js

   Hace tres cosas:

   1. INTERCEPTA el pegado de Cerebro. El estudiante pega 200 filas;
      la aplicación las clasifica aquí y al modelo solo le llega el
      reparto por destino. Ni lee las filas crudas ni las clasifica.

   2. MIDE los campos del listing. El modelo emite <!--LISTING:{...}-->
      con lo construido; aquí se cuentan caracteres y BYTES exactos.
      Contar bytes UTF-8 con acentos no es trabajo de un modelo.

   3. CALIFICA en el paso 10: score de 100 puntos con el reparto
      oficial, más la cobertura del volumen del nicho.
   ============================================================ */

(function (global) {
  'use strict';

  var MARCA = /<!--LISTING:([\s\S]*?)-->/;

  function disponible() { return !!(global.SophieKeywords && global.Sophie); }
  function esc(s) { return global.Sophie ? global.Sophie.esc(s) : String(s == null ? '' : s); }
  function el(sel) { return typeof sel === 'string' ? document.querySelector(sel) : sel; }

  /* ---------- 1 · pegado de Cerebro ---------- */

  // ¿Esto que pegó el estudiante es una Master Keyword List?
  // Devuelve la clasificación, o null si no lo es.
  function detectarKeywords(texto) {
    if (!disponible()) return null;
    var t = String(texto || '');
    if (t.length < 100) return null;
    try {
      var p = global.SophieKeywords.parsear(t);
      if (!p.filas || p.filas.length < 5) return null;
      // Que al menos la mitad traiga volumen real: si no, es texto normal.
      var conSV = p.filas.filter(function (f) { return !isNaN(f.sv) && f.sv > 0; });
      if (conSV.length < p.filas.length * 0.5) return null;
      return global.SophieKeywords.clasificar(t);
    } catch (e) { return null; }
  }

  // Lo que viaja al modelo en lugar de las 200 filas.
  function mensajeClasificado(c) {
    return 'MASTER KEYWORD LIST YA CLASIFICADA POR LA APLICACIÓN. ' +
      'Los umbrales del método Crezcamos ya se aplicaron y el reparto por destino ' +
      'ya está hecho: NO reclasifiques, NO recalcules, NO pidas las filas crudas. ' +
      'Tu trabajo es leer esto y explicárselo al estudiante con criterio. Datos: ' +
      JSON.stringify(global.SophieKeywords.paraElModelo(c));
  }

  function pintarClasificacion(sel, c) {
    var host = el(sel);
    if (!host || !c) return false;
    host.classList.add('sophie-panel', 'sophie-root');

    var r = c.resumen;
    var met = [
      { label: 'P1 · Título e Item Highlights', valor: String(r.P1.n), estado: r.P1.n >= 5 ? 'ok' : 'alerta',
        nota: r.P1.volumen.toLocaleString() + ' búsquedas/mes' },
      { label: 'P2 · Viñetas', valor: String(r.P2.n), estado: r.P2.n >= 8 ? 'ok' : 'alerta',
        nota: r.P2.volumen.toLocaleString() + ' búsquedas/mes' },
      { label: 'P3 · Backend', valor: String(r.P3.n), estado: r.P3.n >= 10 ? 'ok' : 'alerta',
        nota: r.P3.volumen.toLocaleString() + ' búsquedas/mes' },
      { label: 'Descartadas', valor: String(r.descarte.n), estado: 'neutro', nota: 'no cumplen umbrales' }
    ];

    function tabla(titulo, lista, destino) {
      if (!lista.length) return '';
      return '<section class="s-card">' +
        '<p class="s-card__eyebrow">' + esc(titulo) + '</p>' +
        '<div class="s-tabla-wrap"><table class="s-tabla"><thead><tr>' +
        '<th>Keyword</th><th>SV</th><th>IQ</th><th>Rank</th><th>Competidores</th>' +
        '</tr></thead><tbody>' +
        lista.map(function (f) {
          var rel = f.relevancia === 'alta' ? 'pass' : f.relevancia === 'baja' ? 'alerta' : '';
          return '<tr><td>' + esc(f.keyword) + '</td>' +
            '<td data-num>' + f.sv.toLocaleString() + '</td>' +
            '<td data-num>' + (isNaN(f.iq) ? '—' : f.iq) + '</td>' +
            '<td data-num>' + (isNaN(f.rank) ? '—' : f.rank) + '</td>' +
            '<td data-num' + (rel ? ' data-estado="' + rel + '"' : '') + '>' +
            (isNaN(f.count) ? '—' : f.count) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        (destino ? '<p class="s-veredicto__razon" style="margin:12px 0 0">' + esc(destino) + '</p>' : '') +
      '</section>';
    }

    var avisos = c.avisos.length
      ? '<section class="s-card"><p class="s-card__eyebrow">Lo que debes saber</p>' +
        c.avisos.map(function (a) {
          return '<p class="s-veredicto__razon" style="margin:0 0 10px">· ' + esc(a) + '</p>';
        }).join('') + '</section>'
      : '';

    host.innerHTML =
      '<section class="s-card">' +
        '<p class="s-card__eyebrow">Master Keyword List · ' + c.total + ' keywords clasificadas</p>' +
        '<div class="s-metricas">' + met.map(function (m) {
          return '<div class="s-metrica" data-estado="' + m.estado + '">' +
            '<div class="s-metrica__label"><span class="s-metrica__dot"></span>' + esc(m.label) + '</div>' +
            '<div class="s-metrica__valor">' + esc(m.valor) + '</div>' +
            '<div class="s-metrica__nota">' + esc(m.nota) + '</div></div>';
        }).join('') + '</div>' +
      '</section>' +
      tabla('Al título · la P1 de mayor volumen', c.reparto.titulo,
            'Con 75 caracteres el título aguanta una sola keyword P1.') +
      tabla('A Item Highlights · las P1 restantes', c.reparto.itemHighlights,
            'Item Highlights indexa igual que el título y hoy está vacío en casi todos los listings.') +
      tabla('A las viñetas · P2', c.reparto.vinetas.slice(0, 10), '') +
      tabla('Al backend · P3', c.reparto.backend.slice(0, 12), '') +
      avisos;
    return true;
  }

  /* ---------- 2 · medidas del listing ---------- */

  function detectarListing(texto) {
    var m = MARCA.exec(texto || '');
    if (!m) return null;
    try {
      var d = JSON.parse(m[1].trim());
      return (d && typeof d === 'object') ? d : null;
    } catch (e) { return null; }
  }

  function limpiar(texto) {
    return String(texto || '').replace(MARCA, '').replace(/<!--M:[HS]-->/g, '').trim();
  }

  function barra(valor, max, estado) {
    var pct = Math.min(100, Math.round(valor / max * 100));
    return '<div class="s-umbral" style="margin:6px 0 0" aria-hidden="true">' +
      '<div class="s-umbral__fill" style="width:' + pct + '%;background:' +
      (estado === 'fail' ? 'var(--s-fail)' : estado === 'alerta' ? 'var(--s-warn)' : 'var(--s-pass)') +
      '"></div></div>';
  }

  function medida(label, valor, max, unidad, nota) {
    var estado = valor > max ? 'fail' : valor > max * 0.95 ? 'alerta' : valor === 0 ? 'fail' : 'pass';
    return '<div class="s-metrica" data-estado="' +
      (estado === 'pass' ? 'ok' : estado === 'alerta' ? 'alerta' : 'critico') + '">' +
      '<div class="s-metrica__label"><span class="s-metrica__dot"></span>' + esc(label) + '</div>' +
      '<div class="s-metrica__valor">' + valor.toLocaleString() +
      '<span style="font-size:14px;opacity:.5"> / ' + max.toLocaleString() + '</span></div>' +
      '<div class="s-metrica__nota">' + esc(unidad + (nota ? ' · ' + nota : '')) + '</div>' +
      barra(valor, max, estado) + '</div>';
  }

  // Panel de conteos exactos mientras se construye el listing.
  function pintarMedidas(sel, L) {
    var host = el(sel);
    if (!host || !disponible() || !L) return false;
    var K = global.SophieKeywords, lim = K.limites;
    var m = [];

    if (L.titulo !== undefined)
      m.push(medida('Título', L.titulo.length, lim.titulo.max, 'caracteres',
        L.titulo.length > lim.titulo.max ? 'Amazon lo reescribe' : ''));
    if (L.itemHighlights !== undefined)
      m.push(medida('Item Highlights', L.itemHighlights.length, lim.itemHighlights.max, 'caracteres',
        L.itemHighlights.length === 0 ? 'campo vacío' : ''));
    if (Array.isArray(L.vinetas) && L.vinetas.length) {
      var idx = K.indexadoVinetas(L.vinetas);
      m.push(medida('Viñetas indexadas', idx.totalBytes, lim.vinetasIndexado.max, 'bytes acumulados',
        idx.primeraAfectada ? 'desde la ' + idx.primeraAfectada + ' no indexa' : 'las 5 completas'));
    }
    if (L.backend !== undefined)
      m.push(medida('Backend', K.bytes(L.backend), lim.backend.max, 'BYTES',
        K.bytes(L.backend) !== L.backend.length ? L.backend.length + ' caracteres' : ''));
    if (L.descripcion !== undefined)
      m.push(medida('Descripción', L.descripcion.length, lim.descripcion.max, 'caracteres',
        L.descripcion.length < lim.descripcion.min ? 'mínimo ' + lim.descripcion.min : ''));

    if (!m.length) return false;
    host.classList.add('sophie-panel', 'sophie-root');
    host.innerHTML = '<section class="s-card">' +
      '<p class="s-card__eyebrow">Medidas exactas</p>' +
      '<div class="s-metricas">' + m.join('') + '</div></section>';
    return true;
  }

  /* ---------- 3 · veredicto del paso 10 ---------- */

  function completo(L) {
    return !!(L && L.titulo && Array.isArray(L.vinetas) && L.vinetas.length >= 5 &&
              L.backend && L.descripcion);
  }

  function pintarVeredicto(sel, L, clasificacion) {
    var host = el(sel);
    if (!host || !disponible() || !L) return false;
    var K = global.SophieKeywords;
    var s = K.score(L);
    host.classList.add('sophie-panel', 'sophie-root');

    var filas = s.detalle.map(function (d) {
      return {
        criterio: d.seccion + ' · ' + d.criterio,
        valor: d.puntos + '/' + d.max + ' pts',
        umbral: d.nota || '—',
        estado: d.estado
      };
    });

    var met = Object.keys(s.secciones).map(function (k) {
      var etiqueta = { titulo: 'Título', itemHighlights: 'Item Highlights',
                       vinetas: 'Viñetas', backend: 'Backend', descripcion: 'Descripción' }[k];
      var v = s.secciones[k], mx = s.maximos[k];
      return { label: etiqueta, valor: v + '/' + mx,
               estado: v === mx ? 'ok' : v >= mx * 0.6 ? 'alerta' : 'critico' };
    });

    var cob = null;
    if (clasificacion) {
      try { cob = K.cobertura(L, clasificacion); } catch (e) {}
    }

    var htmlCob = '';
    if (cob) {
      htmlCob = '<section class="s-card">' +
        '<p class="s-card__eyebrow">Cobertura del nicho</p>' +
        '<div class="s-metricas">' +
          '<div class="s-metrica" data-estado="' +
            (cob.resumen.pctVolumen >= 85 ? 'ok' : cob.resumen.pctVolumen >= 65 ? 'alerta' : 'critico') + '">' +
            '<div class="s-metrica__label"><span class="s-metrica__dot"></span>Volumen cubierto</div>' +
            '<div class="s-metrica__valor">' + cob.resumen.pctVolumen + '%</div>' +
            '<div class="s-metrica__nota">' + cob.resumen.volumenCubierto.toLocaleString() +
            ' de ' + cob.resumen.volumen.toLocaleString() + ' búsquedas/mes</div></div>' +
          '<div class="s-metrica" data-estado="neutro">' +
            '<div class="s-metrica__label"><span class="s-metrica__dot"></span>Keywords cubiertas</div>' +
            '<div class="s-metrica__valor">' + cob.resumen.cubiertas + '/' + cob.resumen.total + '</div>' +
            '<div class="s-metrica__nota">' + cob.resumen.pct + '% de la lista</div></div>' +
        '</div>' +
        '<p class="s-veredicto__razon" style="margin:14px 0 0">' + esc(cob.diagnostico) + '</p>' +
        (cob.oportunidades.length
          ? '<p class="s-card__eyebrow" style="margin:18px 0 10px">Sin cubrir, por volumen</p>' +
            '<div class="s-tabla-wrap"><table class="s-tabla"><thead><tr>' +
            '<th>Keyword</th><th>Búsquedas/mes</th><th>Palabras que faltan</th></tr></thead><tbody>' +
            cob.oportunidades.slice(0, 8).map(function (k) {
              return '<tr><td>' + esc(k.keyword) + '</td><td data-num>' + k.sv.toLocaleString() +
                '</td><td>' + esc(k.faltan.join(', ')) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '') +
      '</section>';
    }

    host.innerHTML = '';
    var ctrl = global.Sophie.mount(host, { esqueleto: {} });
    ctrl.metricas(met, 'Puntaje por sección');
    ctrl.scorecard(filas, 'Auditoría · ' + s.detalle.length + ' criterios');
    ctrl.veredicto({
      veredicto: s.estado, etiqueta: s.etiqueta,
      puntaje: s.total, puntaje_max: 100,
      criterios: { aprobados: s.detalle.length - s.fallos.length, total: s.detalle.length },
      titular: s.bloqueante
        ? 'El título supera los 75 caracteres'
        : (s.fallos.length ? 'Quedan ' + s.fallos.length + ' ajustes por resolver' : 'Listing listo para Seller Central'),
      razon: s.bloqueante
        ? 'Desde el 27 de julio de 2026 Amazon reescribe con su propia IA cualquier título de más de 75 caracteres, y recuperar el original exige abrir un caso de soporte. **Esto se corrige antes de publicar**, no después.'
        : ''
    });

    if (htmlCob) {
      var d = document.createElement('div');
      d.innerHTML = htmlCob;
      host.appendChild(d.firstChild);
    }

    // Correcciones mecánicas LISTAS PARA PEGAR. El backend y las viñetas son los
    // dos campos que el motor puede reparar sin tocar la intención del copy
    // (bolsa de keywords y formato de encabezado). Si el motor los mejoró, se los
    // mostramos ya corregidos para que el estudiante los pegue tal cual.
    try {
      var repB = K.repararBackend ? K.repararBackend(L) : null;
      var repV = K.repararVinetas ? K.repararVinetas(L.vinetas) : null;
      var partes = '';
      if (repB && repB.cambio) {
        partes += '<p class="s-veredicto__razon" style="margin:14px 0 6px"><b>Backend corregido</b> · ' +
          repB.bytes + '/249 bytes · ' + repB.espanol.length + ' términos en español' +
          (repB.espanol.length ? ' (' + esc(repB.espanol.slice(0, 8).join(', ')) + ')' : '') + '</p>' +
          '<pre class="s-copy">' + esc(repB.backend) + '</pre>';
      }
      if (repV && repV.cambio) {
        partes += '<p class="s-veredicto__razon" style="margin:16px 0 6px"><b>Viñetas corregidas</b> · ' +
          'formato de encabezado listo · ' + repV.indexado.totalBytes + '/1000 bytes indexados' +
          (repV.indexado.totalBytes > 1000 ? ' — aún hay que recortar relleno' : '') + '</p>' +
          '<pre class="s-copy">' + esc(repV.vinetas.map(function (v, i) { return (i + 1) + '. ' + v; }).join('\n\n')) + '</pre>';
      }
      if (partes) {
        var dcorr = document.createElement('div');
        dcorr.innerHTML = '<section class="s-card">' +
          '<p class="s-card__eyebrow">Correcciones listas para pegar</p>' +
          '<p class="s-veredicto__razon" style="margin:0 0 4px">El motor ya arregló lo mecánico (formato de viñetas, bytes, términos en español y palabras repetidas del título). Copia estos campos tal cual — una viñeta por campo — sin reescribirlos a mano.</p>' +
          partes + '</section>';
        if (dcorr.firstChild) host.appendChild(dcorr.firstChild);
      }
    } catch (e) { /* si algo falla, el veredicto ya quedó pintado igual */ }

    return { score: s, cobertura: cob };
  }

  global.SophieListing = {
    version: '1.0',
    disponible: disponible,
    detectarKeywords: detectarKeywords,
    mensajeClasificado: mensajeClasificado,
    pintarClasificacion: pintarClasificacion,
    detectarListing: detectarListing,
    limpiar: limpiar,
    pintarMedidas: pintarMedidas,
    pintarVeredicto: pintarVeredicto,
    completo: completo
  };

})(window);
