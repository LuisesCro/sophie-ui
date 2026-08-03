/* ============================================================
   SOPHIE · PROVEEDORES v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-proveedores.js

   Conecta sophie-cotizaciones.js con el módulo de Sophie Proveedores.

   Requiere, en este orden:
     sophie-ui.css · sophie-oscuro.css · sophie-render.js · sophie-cotizaciones.js

   Lee tres marcadores que emite el modelo y dibuja el resultado:
     <!--CANDIDATOS:{...}-->   paso 5  · matriz de 100 puntos
     <!--COTIZACIONES:{...}--> paso 8  · costo aterrizado comparado
     <!--PROVEEDOR:{...}-->    paso 12 · score y veredicto final
   ============================================================ */

(function (global) {
  'use strict';

  var MARCAS = {
    candidatos:   /<!--CANDIDATOS:([\s\S]*?)-->/,
    cotizaciones: /<!--COTIZACIONES:([\s\S]*?)-->/,
    proveedor:    /<!--PROVEEDOR:([\s\S]*?)-->/
  };

  function disponible() { return !!(global.SophieCotizaciones && global.Sophie); }
  function esc(s) { return global.Sophie ? global.Sophie.esc(s) : String(s == null ? '' : s); }
  function el(sel) { return typeof sel === 'string' ? document.querySelector(sel) : sel; }
  function d2(x) { return (Math.round(x * 100) / 100).toFixed(2); }

  function detectar(texto) {
    var t = String(texto || '');
    for (var k in MARCAS) {
      var m = MARCAS[k].exec(t);
      if (m) {
        try { return { tipo: k, datos: JSON.parse(m[1].trim()) }; }
        catch (e) { return null; } // aún llega incompleto
      }
    }
    return null;
  }

  function limpiar(texto) {
    var t = String(texto || '');
    for (var k in MARCAS) t = t.replace(MARCAS[k], '');
    return t.replace(/<!--[PM]:[^>]*-->/g, '').trim();
  }

  function metrica(label, valor, estado, nota) {
    return '<div class="s-metrica" data-estado="' + (estado || 'neutro') + '">' +
      '<div class="s-metrica__label"><span class="s-metrica__dot"></span>' + esc(label) + '</div>' +
      '<div class="s-metrica__valor">' + esc(valor) + '</div>' +
      (nota ? '<div class="s-metrica__nota">' + esc(nota) + '</div>' : '') + '</div>';
  }

  /* ---------- paso 5 · matriz ---------- */

  function pintarMatriz(sel, payload) {
    var host = el(sel);
    if (!host || !disponible()) return false;
    var C = global.SophieCotizaciones;
    var r = C.matriz(payload.lista || [], payload.ctx || {});
    host.classList.add('sophie-panel', 'sophie-root');

    var tarjetas = r.ranking.map(function (x) {
      var estado = x.descalificado ? 'nogo' : x.total >= 80 ? 'go' : x.total >= 60 ? 'alerta' : 'nogo';
      var filas = x.detalle.map(function (d) {
        return '<tr><td>' + esc(d.bloque + ' · ' + d.criterio) + '</td>' +
          '<td data-num data-estado="' + d.estado + '">' + d.puntos + '/' + d.max + '</td>' +
          '<td>' + esc(d.nota || '—') + '</td></tr>';
      }).join('');
      return '<section class="s-card">' +
        '<div class="s-veredicto" data-estado="' + estado + '" style="margin:-2px 0 14px">' +
          '<div class="s-veredicto__top">' +
            '<div class="s-veredicto__badge" style="font-size:20px">' + esc(x.proveedor) + '</div>' +
            '<div class="s-veredicto__puntaje"><b>' + x.total + '<span style="opacity:.4">/100</span></b>' +
            '<span>' + esc(x.tipo || '') + '</span></div>' +
          '</div>' +
          (x.descalificado
            ? '<p class="s-veredicto__razon" style="margin:0"><b>Descalificado:</b> ' +
              esc(x.motivoDescalificacion) + '. Sin protección de pago no hay trato, no importa el precio.</p>'
            : '<p class="s-veredicto__razon" style="margin:0">Negocio ' + x.bloques.negocio + '/30 · ' +
              'Seguridad ' + x.bloques.seguridad + '/40 · Costos ' + x.bloques.costos + '/30</p>') +
        '</div>' +
        '<div class="s-tabla-wrap"><table class="s-tabla"><thead><tr>' +
        '<th>Criterio</th><th>Puntos</th><th>Detalle</th></tr></thead><tbody>' +
        filas + '</tbody></table></div>' +
      '</section>';
    }).join('');

    host.innerHTML =
      '<section class="s-card">' +
        '<p class="s-card__eyebrow">Matriz Crezcamos · ' + r.candidatos.length + ' candidatos</p>' +
        '<div class="s-metricas">' +
          metrica('Líder', r.top3.length ? r.top3[0].proveedor : '—',
            r.top3.length ? 'ok' : 'critico', r.top3.length ? r.top3[0].total + '/100' : 'ninguno viable') +
          metrica('Viables', String(r.ranking.filter(function (x) { return !x.descalificado; }).length),
            'neutro', 'con Trade Assurance') +
          metrica('Descalificados', String(r.ranking.filter(function (x) { return x.descalificado; }).length),
            'neutro', 'sin protección de pago') +
        '</div>' +
      '</section>' +
      tarjetas +
      (r.aviso ? '<section class="s-card"><p class="s-card__eyebrow">Lo que debes saber</p>' +
        '<p class="s-veredicto__razon">' + esc(r.aviso) + '</p></section>' : '');
    return true;
  }

  /* ---------- paso 8 · costo aterrizado ---------- */

  function pintarCotizaciones(sel, payload) {
    var host = el(sel);
    if (!host || !disponible()) return false;
    var C = global.SophieCotizaciones;
    var r = C.comparar(payload.lista || [], payload.ctx || {});
    host.classList.add('sophie-panel', 'sophie-root');

    var comparativa = '<div class="s-tabla-wrap"><table class="s-tabla"><thead><tr>' +
      '<th>Proveedor</th><th>Incoterm</th><th>Lista</th><th>Aterrizado</th>' +
      '<th>% precio</th><th>Margen</th><th>ROI</th><th>MOQ</th></tr></thead><tbody>' +
      r.cotizaciones.map(function (a) {
        var esLider = r.recomendada && a.proveedor === r.recomendada.proveedor;
        var e = a.evaluacion.estado;
        return '<tr' + (esLider ? ' data-destacar="true"' : '') + '>' +
          '<td>' + esc(a.proveedor) + (esLider ? ' ★' : '') + '</td>' +
          '<td>' + esc(a.incoterm) + '</td>' +
          '<td data-num>$' + d2(a.desglose.producto) + '</td>' +
          '<td data-num data-estado="' + e + '">$' + d2(a.aterrizado) + '</td>' +
          '<td data-num data-estado="' + (a.aterrizadoPct <= 30 ? 'pass' : a.aterrizadoPct <= 40 ? 'alerta' : 'fail') + '">' +
            d2(a.aterrizadoPct) + '%</td>' +
          '<td data-num data-estado="' + (a.margenPct >= 30 ? 'pass' : a.margenPct >= 20 ? 'alerta' : 'fail') + '">' +
            d2(a.margenPct) + '%</td>' +
          '<td data-num>' + d2(a.roi) + '%</td>' +
          '<td data-num>' + a.moq + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    var trampa = r.trampaDelPrecioLista
      ? '<section class="s-card">' +
          '<p class="s-card__eyebrow">La trampa del precio de lista</p>' +
          '<p class="s-veredicto__razon" style="font-size:15px">' + esc(r.trampaDelPrecioLista.mensaje) + '</p>' +
        '</section>' : '';

    var lider = r.recomendada;
    var desgloseLider = lider
      ? '<section class="s-card">' +
          '<p class="s-card__eyebrow">Desglose de ' + esc(lider.proveedor) + '</p>' +
          '<ul class="s-list" style="margin:0">' +
            '<li><b>Producto</b> $' + d2(lider.desglose.producto) + '</li>' +
            '<li><b>Flete</b> $' + d2(lider.desglose.flete) +
              (lider.desglose.flete === 0 ? ' — incluido en el incoterm ' + lider.incoterm
                : lider.desglose.fleteBase === 'peso' ? ' — estimado por peso (' + lider.desglose.pesoUnidadKg + ' kg, ' + (lider.desglose.modoEnvio === 'aire' ? 'aéreo' : 'marítimo') + '), confírmalo con tu agente'
                : lider.desglose.fleteEstimado ? ' — estimado, confírmalo con tu agente de carga'
                : '') + '</li>' +
            '<li><b>Arancel</b> $' + d2(lider.desglose.arancel) + ' (' + d2(lider.desglose.arancelPct) + '%)' +
              (lider.desglose.arancelEstimado ? ' — estimado, confirma con el código HTS antes de pagar' : '') + '</li>' +
            '<li><b>Colocación inbound</b> $' + d2(lider.desglose.placement) + '</li>' +
            '<li><b>Empaque</b> $' + d2(lider.desglose.empaque) + '</li>' +
            '<li><b>Inspección</b> $' + d2(lider.desglose.inspeccion) + '</li>' +
            '<li><b>Costo aterrizado</b> $' + d2(lider.aterrizado) + '</li>' +
          '</ul>' +
          '<p class="s-veredicto__razon" style="margin:14px 0 0"><b>' + esc(lider.incoterm) + ':</b> ' +
            esc(lider.incotermNota) + '</p>' +
          (lider.capital.alcanza
            ? '<p class="s-veredicto__razon" style="margin:8px 0 0">Su MOQ de ' + lider.moq +
              ' unidades cuesta $' + lider.capital.inversionMOQ.toLocaleString() +
              ' aterrizado, dentro de los $' + lider.capital.paraInventario.toLocaleString() +
              ' que tienes para inventario dejando la reserva de PPC.</p>'
            : '<p class="s-veredicto__razon" style="margin:8px 0 0"><b>Ojo:</b> su MOQ cuesta $' +
              lider.capital.inversionMOQ.toLocaleString() + ' y solo tienes $' +
              lider.capital.paraInventario.toLocaleString() + ' para inventario. Negocia el MOQ.</p>') +
        '</section>' : '';

    var hallazgos = r.cotizaciones.map(function (a) {
      if (!a.evaluacion.hallazgos.length) return '';
      return '<section class="s-card"><p class="s-card__eyebrow">' + esc(a.proveedor) + ' · ' +
        esc(a.evaluacion.veredicto) + '</p>' +
        a.evaluacion.hallazgos.map(function (h) {
          return '<div class="s-bloqueado" style="border-style:solid;border-color:' +
            (h.e === 'fail' ? 'rgba(229,72,77,.3)' : 'rgba(247,170,46,.28)') + '">' +
            '<span class="s-bloqueado__ico">' + (h.e === 'fail' ? '&#10007;' : '&#33;') + '</span>' +
            '<div class="s-bloqueado__t" style="font-weight:600">' + esc(h.t) + '</div></div>';
        }).join('') + '</section>';
    }).join('');

    host.innerHTML =
      '<section class="s-card">' +
        '<p class="s-card__eyebrow">Costo aterrizado · ' + r.total + ' cotizaciones</p>' +
        comparativa +
      '</section>' + trampa + desgloseLider + hallazgos;
    return true;
  }

  /* ---------- paso 12 · score del proveedor ---------- */

  function pintarProveedor(sel, payload) {
    var host = el(sel);
    if (!host || !disponible()) return false;
    var C = global.SophieCotizaciones;
    var s = C.scoreProveedor(payload.p || {}, payload.ctx || {});
    host.classList.add('sophie-panel', 'sophie-root');
    host.innerHTML = '';

    var ctrl = global.Sophie.mount(host, { esqueleto: {} });

    ctrl.metricas([
      { label: 'Identidad y seguridad', valor: s.bloques.identidad + '/30',
        estado: s.bloques.identidad >= 25 ? 'ok' : s.bloques.identidad >= 15 ? 'alerta' : 'critico' },
      { label: 'Números', valor: s.bloques.numeros + '/40',
        estado: s.bloques.numeros >= 32 ? 'ok' : s.bloques.numeros >= 20 ? 'alerta' : 'critico' },
      { label: 'Proceso', valor: s.bloques.proceso + '/30',
        estado: s.bloques.proceso >= 25 ? 'ok' : s.bloques.proceso >= 15 ? 'alerta' : 'critico' }
    ], 'Puntaje por bloque');

    ctrl.scorecard(s.detalle.map(function (d) {
      return { criterio: d.bloque + ' · ' + d.criterio,
               valor: d.puntos + '/' + d.max + ' pts',
               umbral: d.nota || '—', estado: d.estado };
    }), 'Auditoría del proveedor · ' + s.detalle.length + ' criterios');

    var razon = '';
    if (s.vetos.length) {
      razon = '**Veto activo:** ' + s.vetos.map(function (v) { return v.t; }).join(' ') +
        ' Ese criterio pesa más que el puntaje total.';
    } else if (s.fallos.length) {
      razon = 'Quedan ' + s.fallos.length + ' puntos por resolver antes de pagar el 30%.';
    }

    ctrl.veredicto({
      veredicto: s.estado, etiqueta: s.etiqueta,
      puntaje: s.total, puntaje_max: 100,
      criterios: { aprobados: s.detalle.length - s.fallos.length, total: s.detalle.length },
      titular: s.veredicto === 'APROBADO' ? 'Proveedor listo para ordenar'
             : s.veredicto === 'BUSCAR OTRO' ? 'Este proveedor no protege tu capital'
             : 'Resuelve esto antes de pagar el 30%',
      razon: razon
    });
    return { score: s };
  }

  /* ---------- despachador ---------- */

  function pintar(sel, det) {
    if (!det) return false;
    if (det.tipo === 'candidatos')   return pintarMatriz(sel, det.datos);
    if (det.tipo === 'cotizaciones') return pintarCotizaciones(sel, det.datos);
    if (det.tipo === 'proveedor')    return pintarProveedor(sel, det.datos);
    return false;
  }

  global.SophieProveedores = {
    version: '1.0',
    disponible: disponible,
    detectar: detectar,
    limpiar: limpiar,
    pintar: pintar,
    pintarMatriz: pintarMatriz,
    pintarCotizaciones: pintarCotizaciones,
    pintarProveedor: pintarProveedor
  };

})(window);
