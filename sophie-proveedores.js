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
  function n0p(v) { var x = parseFloat(String(v == null ? '' : v).replace(/[$,\s]/g, '')); return isNaN(x) ? 0 : x; }
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

  /* ---------- tarifas de Amazon por ASIN (Jungle Scout) con respaldo ----------
     Si el modelo manda el ASIN de referencia y no hay tarifa FBA, el panel la
     trae solo: primero Jungle Scout (/api/ficha), y si no aparece, las tablas
     propias de Sophie 2026 con categoría y peso. Los datos se escriben en el
     mismo ctx del marcador, así al restaurar la sesión no se vuelve a pedir. */

  function baseProveedores() {
    if (global.SOPHIE_PROVEEDORES_BASE) return global.SOPHIE_PROVEEDORES_BASE;
    var enSuite = typeof location !== 'undefined' && location.pathname.indexOf('/proveedores') === 0;
    return enSuite ? 'https://sophie-proveedores.crezcamosonline.com/' : '/';
  }
  function correoSesion() {
    try {
      var m = document.cookie.match(/(?:^|; )crz_sesion=([^;]*)/);
      if (m) { var c = JSON.parse(decodeURIComponent(m[1])); if (c && c.email) return c.email; }
    } catch (e) {}
    return '';
  }
  function feesTablas(ctx) {
    var F = global.SophieFees;
    var precio = n0p(ctx.precioVenta), peso = n0p(ctx.pesoLb);
    if (!F || !(precio > 0) || !(peso > 0)) return null;
    var cats = F.cats('us'), cat = null, k = String(ctx.categoria || '').toLowerCase().trim();
    if (k) cat = cats.filter(function (c) { return c.n.toLowerCase() === k; })[0] ||
                 cats.filter(function (c) { var n = c.n.toLowerCase(); return n.indexOf(k) > -1 || k.indexOf(n) > -1; })[0] || null;
    var tier = /small|peque/i.test(String(ctx.tamano || '')) ? 'small_std'
             : /bulky|volum/i.test(String(ctx.tamano || '')) ? 'small_bulky' : 'large_std';
    var fba = F.fbaEstimate(tier, peso * 16, precio, 'us') * 1.035;
    if (!(fba > 0)) return null;
    var com = cat ? F.referral(precio, cat, 'us') : precio * 0.15;
    return { fbaUnidad: Math.round(fba * 100) / 100, comisionPct: Math.round(com / precio * 10000) / 100,
             fuente: 'Tablas de Sophie 2026 (estimado' + (cat ? ', ' + cat.n : ', comisión 15%') + ')' };
  }
  function aplicarTarifas(ctx, t) {
    ctx.fbaUnidad = t.fbaUnidad;
    if (t.comisionPct > 0) ctx.comisionPct = t.comisionPct;
    if (!(n0p(ctx.precioVenta) > 0) && t.precio > 0) ctx.precioVenta = t.precio;
    ctx._fuenteTarifas = t.fuente;
  }
  function necesitaTarifas(payload) {
    var ctx = payload && payload.ctx;
    return !!(ctx && !(n0p(ctx.fbaUnidad) > 0) && !ctx._tarifasIntentadas &&
              (ctx.asin || (n0p(ctx.pesoLb) > 0 && global.SophieFees)));
  }
  function traerTarifas(sel, payload) {
    var host = el(sel), ctx = payload.ctx;
    ctx._tarifasIntentadas = true;
    if (host) {
      host.classList.add('sophie-panel', 'sophie-root');
      host.innerHTML = '<section class="s-card"><p class="s-card__eyebrow">Tarifas de Amazon</p>' +
        '<p class="s-veredicto__razon" style="margin:0">Calculando con datos de Amazon' +
        (ctx.asin ? ' del ASIN ' + esc(String(ctx.asin).toUpperCase()) : '') + '…</p></section>';
    }
    function terminar() { pintarCotizaciones(sel, payload); }
    function respaldo() { var t = feesTablas(ctx); if (t) aplicarTarifas(ctx, t); terminar(); }
    if (!ctx.asin || !global.fetch) return respaldo();
    var listo = false;
    var reloj = setTimeout(function () { if (!listo) { listo = true; respaldo(); } }, 20000);
    global.fetch(baseProveedores() + 'api/ficha', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ asin: ctx.asin, keyword: ctx.keyword || '', email: correoSesion() })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (listo) return; listo = true; clearTimeout(reloj);
      if (d && d.ok && d.fbaUnidad > 0) {
        aplicarTarifas(ctx, { fbaUnidad: d.fbaUnidad, comisionPct: d.comisionPct, precio: d.precio,
          fuente: 'Jungle Scout · ASIN ' + d.asin + (d.variacion ? ' (familia de variaciones)' : '') });
        terminar();
      } else respaldo();
    }).catch(function () { if (listo) return; listo = true; clearTimeout(reloj); respaldo(); });
  }

  function pintarCotizaciones(sel, payload) {
    var host = el(sel);
    if (!host || !disponible()) return false;
    if (necesitaTarifas(payload)) { traerTarifas(sel, payload); return true; }
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
            (lider.desglose.comisionAgente > 0
              ? '<li><b>Comisión del agente</b> $' + d2(lider.desglose.comisionAgente) + '</li>' : '') +
            (lider.desglose.envioDDP
              ? '<li><b>Envío DDP</b> $' + d2(lider.desglose.flete) +
                  ' — flete, aduana y arancel incluidos según tu cotización' +
                  (lider.desglose.zonas && lider.desglose.zonas.length > 1
                    ? ' (zona ' + esc(lider.desglose.zonaUsada) + '; ' +
                      lider.desglose.zonas.map(function (z) { return esc(z.zona) + ' $' + d2(z.unidad); }).join(' · ') + ' por unidad)'
                    : '') + '</li>'
              : '<li><b>Flete</b> $' + d2(lider.desglose.flete) +
              (lider.desglose.flete === 0 ? ' — incluido en el incoterm ' + lider.incoterm
                : lider.desglose.fleteBase === 'peso' ? ' — estimado por peso (' + lider.desglose.pesoUnidadKg + ' kg, ' + (lider.desglose.modoEnvio === 'aire' ? 'aéreo' : 'marítimo') + '), confírmalo con tu agente'
                : lider.desglose.fleteEstimado ? ' — estimado, confírmalo con tu agente de carga'
                : '') + '</li>' +
                '<li><b>Arancel</b> $' + d2(lider.desglose.arancel) +
                  (lider.desglose.arancel > 0 ? ' (' + d2(lider.desglose.arancelPct) + '%)' : '') +
                  (lider.desglose.arancelEstimado && lider.desglose.arancel > 0 ? ' — estimado, confirma con el código HTS antes de pagar' : '') + '</li>') +
            '<li><b>Colocación inbound (Amazon)</b> $' + d2(lider.desglose.placement) + '</li>' +
            '<li><b>Empaque</b> ' + (lider.desglose.empaque > 0 ? '$' + d2(lider.desglose.empaque) : 'no viene en la cotización') + '</li>' +
            '<li><b>Inspección</b> ' + (lider.desglose.inspeccion > 0 ? '$' + d2(lider.desglose.inspeccion) : 'no viene en la cotización') + '</li>' +
            '<li><b>Costo aterrizado</b> $' + d2(lider.aterrizado) + '</li>' +
          '</ul>' +
          '<p class="s-veredicto__razon" style="margin:14px 0 0"><b>' + esc(lider.incoterm) + ':</b> ' +
            esc(lider.incotermNota) + '</p>' +
          (!(lider.capital.paraInventario > 0) ? '' : lider.capital.alcanza
            ? '<p class="s-veredicto__razon" style="margin:8px 0 0">Su MOQ de ' + lider.moq +
              ' unidades cuesta $' + lider.capital.inversionMOQ.toLocaleString() +
              ' aterrizado, dentro de los $' + lider.capital.paraInventario.toLocaleString() +
              ' que tienes para inventario dejando la reserva de PPC.</p>'
            : '<p class="s-veredicto__razon" style="margin:8px 0 0"><b>Ojo:</b> su MOQ cuesta $' +
              lider.capital.inversionMOQ.toLocaleString() + ' y solo tienes $' +
              lider.capital.paraInventario.toLocaleString() + ' para inventario. Negocia el MOQ.</p>') +
        '</section>' : '';

    // PRECIOS META (rentabilidad): el piso para no perder (break-even) y los
    // precios de venta que dan 20% y 30% de margen, calculados del costo aterrizado.
    var pm = lider && lider.preciosMeta;
    // A TU PRECIO: lo primero que pregunta el estudiante es cuánto gana al
    // precio que piensa vender. Los precios meta van después.
    var aTuPrecio = (lider && !lider.faltaFba && !lider.faltaPrecio)
      ? '<section class="s-card">' +
          '<p class="s-card__eyebrow">A tu precio de venta de $' + d2(n0p(payload.ctx && payload.ctx.precioVenta)) + '</p>' +
          '<div class="s-metricas">' +
            metrica('Ganancia por unidad', '$' + d2(lider.margen), lider.margenPct >= 30 ? 'pass' : lider.margenPct >= 20 ? 'alerta' : 'fail', 'antes de publicidad') +
            metrica('Margen', d2(lider.margenPct) + '%', lider.margenPct >= 30 ? 'pass' : lider.margenPct >= 20 ? 'alerta' : 'fail', 'meta 30% o más') +
            metrica('ROI', d2(lider.roi) + '%', lider.roi >= 100 ? 'pass' : lider.roi >= 60 ? 'alerta' : 'fail', 'meta 100%') +
          '</div>' +
          '<p class="s-veredicto__razon" style="margin:12px 0 0">Amazon se queda con $' + d2(lider.amazon.comision) + ' de comisión y $' + d2(lider.amazon.fba) +
            ' de FBA; tu costo aterrizado es $' + d2(lider.aterrizado) + '. Lo que queda, $' + d2(lider.margen) + ', es tu ganancia antes de publicidad. ' +
            'Ese mismo margen (' + d2(lider.margenPct) + '%) es lo máximo que puedes gastar en ads por venta sin perder.</p>' +
          (payload.ctx && payload.ctx._fuenteTarifas ? '<p class="s-veredicto__razon" style="margin:8px 0 0;opacity:.8">Tarifas de Amazon: ' + esc(payload.ctx._fuenteTarifas) + '.</p>' : '') +
        '</section>' : '';

    var preciosSec = (lider && lider.faltaFba)
      ? '<section class="s-card">' +
          '<p class="s-card__eyebrow">Tu precio de venta: piso y metas</p>' +
          '<p class="s-veredicto__razon" style="font-size:15px;margin:0"><b>Falta la tarifa FBA de Amazon.</b> ' +
          'Sin ella, el precio mínimo saldría casi igual a tu costo aterrizado ($' + d2(lider.aterrizado) + ') y no es un precio de venta real. ' +
          'Escríbele a Sophie tu tarifa FBA (calculadora de Amazon o Helium 10) o el ASIN del producto de referencia, y aquí aparecen tu piso y tus metas.</p>' +
        '</section>'
      : (pm && pm.breakEven != null)
      ? '<section class="s-card">' +
          '<p class="s-card__eyebrow">Tu precio de venta: piso y metas</p>' +
          '<div class="s-metricas">' +
            metrica('Punto de equilibrio', '$' + d2(pm.breakEven), 'fail', 'por debajo, pierdes') +
            metrica('Para ganar 20%', '$' + d2(pm.m20), 'alerta', 'margen sano') +
            metrica('Para ganar 30%', '$' + d2(pm.m30), 'pass', 'margen ideal') +
          '</div>' +
          '<p class="s-veredicto__razon" style="margin:12px 0 0">El punto de equilibrio es tu piso: por debajo de $' + d2(pm.breakEven) + ' pierdes dinero. Apunta a vender entre $' + d2(pm.m20) + ' y $' + d2(pm.m30) + ' para un margen sano.</p>' +
        '</section>' : '';

    // VEREDICTO DE RENTABILIDAD: el estudiante no debe esperar al cierre para
    // saber si el producto sirve. Se decide con el margen antes de publicidad
    // (mismo umbral del cierre: 30% / 20%) y se muestra cuánto queda después de
    // un gasto estimado en publicidad (TACoS, 8% por defecto).
    var precioV = n0p(payload.ctx && payload.ctx.precioVenta);
    var tacos = n0p(payload.ctx && payload.ctx.tacosPct) || 8;
    var hayVeredicto = lider && !lider.faltaFba && !lider.faltaPrecio && precioV > 0;
    var vd = null;
    if (hayVeredicto) {
      var mp = lider.margenPct;
      vd = mp >= 30 ? { e: 'go', t: 'RENTABLE', s: 'El producto cumple la meta de margen (30% o más).' }
         : mp >= 20 ? { e: 'alerta', t: 'AJUSTAR', s: 'Es rentable con poco colchón. Conviene renegociar el costo o subir el precio con diferenciación.' }
         : { e: 'nogo', t: 'NO RENTABLE', s: 'Con estos costos el margen no alcanza. Renegocia el costo, cambia de proveedor o evalúa otro producto.' };
      var ads = precioV * tacos / 100;
      vd.netoUsd = lider.margen - ads;
      vd.netoPct = mp - tacos;
      vd.adsUsd = ads;
    }
    var veredictoSec = vd
      ? '<section class="s-card">' +
          '<div class="s-veredicto" data-estado="' + vd.e + '" style="margin:0">' +
            '<div class="s-veredicto__top">' +
              '<div class="s-veredicto__badge" style="font-size:22px">' + vd.t + '</div>' +
              '<div class="s-veredicto__puntaje"><b>' + d2(lider.margenPct) + '%</b><span>margen a $' + d2(precioV) + '</span></div>' +
            '</div>' +
            '<p class="s-veredicto__razon" style="margin:0">' + vd.s + '</p>' +
          '</div>' +
          '<div class="s-metricas" style="margin-top:14px">' +
            metrica('Te queda por unidad', '$' + d2(vd.netoUsd), vd.netoPct >= 20 ? 'pass' : vd.netoPct >= 10 ? 'alerta' : 'fail', 'después de publicidad') +
            metrica('Te queda', d2(vd.netoPct) + '%', vd.netoPct >= 20 ? 'pass' : vd.netoPct >= 10 ? 'alerta' : 'fail', 'del precio de venta') +
            metrica('Publicidad estimada', '$' + d2(vd.adsUsd), 'info', tacos + '% del precio (TACoS)') +
          '</div>' +
        '</section>'
      : (lider && !lider.faltaFba && !(precioV > 0))
      ? '<section class="s-card"><p class="s-card__eyebrow">Veredicto de rentabilidad</p>' +
          '<p class="s-veredicto__razon" style="margin:0"><b>Falta tu precio de venta.</b> Escríbele a Sophie a cuánto piensas vender (o el ASIN de referencia) y aquí aparece si el producto es rentable y cuánto te queda.</p></section>'
      : '';

    var opcionesSig = !vd ? [] : vd.e === 'go'
      ? ['Pedir la muestra']
      : vd.e === 'alerta'
      ? ['Negociar el costo con el proveedor', 'Pedir la muestra de todos modos']
      : ['Negociar el costo con el proveedor', 'Cotizar con otro proveedor'];
    var siguienteSec = vd
      ? '<section class="s-card">' +
          '<p class="s-card__eyebrow">Siguiente paso</p>' +
          '<p class="s-veredicto__razon" style="margin:0 0 12px">' +
            (vd.e === 'go'
              ? 'Los números dan. Ahora pide <b>una muestra</b> tal cual la vas a vender y apruébala antes de pagar la producción.'
              : vd.e === 'alerta'
              ? 'Para llegar al 30% necesitas vender a $' + d2(pm && pm.m30) + ' o bajar el costo. Negocia antes de pedir la muestra.'
              : 'Para que sea rentable tendrías que vender a $' + d2(pm && pm.m30) + ' o bajar bastante el costo. No pidas muestra todavía.') +
          '</p>' +
          '<div style="display:grid;gap:10px">' + opcionesSig.map(function (o, i) {
            // s-opt: el chat lo envía como respuesta al tocarlo; s-btn le da el estilo.
            return '<button type="button" class="s-btn s-opt' + (i ? ' s-btn--fantasma' : '') + '">' + esc(o) + '</button>';
          }).join('') + '</div>' +
        '</section>' : '';

    var hallazgos = r.cotizaciones.map(function (a) {
      if (!a.evaluacion.hallazgos.length) return '';
      return '<section class="s-card"><p class="s-card__eyebrow">' + esc(a.proveedor) + ' · ' +
        esc(a.evaluacion.veredicto) + '</p>' +
        (vd && vd.e !== 'nogo' ? '<p class="s-veredicto__razon" style="margin:0 0 10px;opacity:.85">Puntos para negociar con el proveedor. No cambian el veredicto de rentabilidad de arriba.</p>' : '') +
        a.evaluacion.hallazgos.map(function (h) {
          return '<div class="s-bloqueado" style="border-style:solid;border-color:' +
            (h.e === 'fail' ? 'rgba(229,72,77,.3)' : 'rgba(247,170,46,.28)') + '">' +
            '<span class="s-bloqueado__ico">' + (h.e === 'fail' ? '&#10007;' : '&#33;') + '</span>' +
            '<div class="s-bloqueado__t" style="font-weight:600">' + esc(h.t) + '</div></div>';
        }).join('') + '</section>';
    }).join('');

    host.innerHTML = veredictoSec +
      '<section class="s-card">' +
        '<p class="s-card__eyebrow">Costo aterrizado · ' + r.total + ' cotizaciones</p>' +
        comparativa +
      '</section>' + trampa + desgloseLider + aTuPrecio + preciosSec + hallazgos + siguienteSec;
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
