/* ============================================================
   SOPHIE · PPC v2.0  —  Motor de Ads y Optimizador (Cosecha y Poda)
   Crezcamos Online — ui.crezcamosonline.com/sophie-ppc.js

   Una sola fuente de verdad para los tres módulos que hacen PPC
   (Sophie Ads, Sophie Optimizador y Sophie Creador). Aplica al pie
   de la letra los manuales sophie-ads y sophie-optimizador:

     economia()     Margen → break-even ACOS → factor de fase → targetCPA
                    → maxCPC → pujas por nivel → presupuesto (sophie-ads).
     leerReporte()  Lee el Search Term Report de Amazon (CSV/TSV o filas
                    de un XLSX), SUMA las filas de un mismo término (el
                    reporte trae una por campaña/grupo/día) y descarta las
                    filas de totales.
     clasificar()   Decide término por término con CVR bayesiano, límite
                    inferior de Wilson, grupos G1–G5, cosecha, poda y ajuste
                    de puja con tope de ±25% (sophie-optimizador).
     texto()        La salida obligatoria del manual, para el modelo.
     acciones()     Las acciones como filas para exportar (CSV).

   Las constantes del método no se cambian aquí: si el manual cambia,
   cambia este archivo y las pruebas de tools/test-parsers.mjs.
   ============================================================ */

(function (global) {
  'use strict';

  /* ============================================================
     CONSTANTES DEL MÉTODO (sophie-optimizador · "no las cambies")
     ============================================================ */
  var CONFIG = {
    Z_CONFIANZA: 1.28,        // Wilson, 90% de confianza de una cola
    PRIOR_FUERZA: 12,         // PRIOR_CLICS: pseudo-clics del prior bayesiano
    PISO_CLICS: 12,           // < 12 clics = G5 inmaduro: no se toca. También UMBRAL_PODA.
    MIN_ORDENES_COSECHA: 2,   // UMBRAL_COSECHA
    TOPE_CAMBIO_PUJA: 0.25,   // ±25% por revisión
    FACTOR_PUJA_COSECHA: 0.90,// puja inicial de una exacta cosechada
    TOP_GASTO_G1: 0.20,       // G1 = top 20% del gasto
    CAMBIO_MINIMO: 0.05,      // no se recomiendan movimientos de menos de 5% (ruido)
    VENTANA_PUJAS: 30,        // días
    VENTANA_PODA: 60,         // días
    // Ya no se usan, se conservan para no romper a quien los lea:
    MIN_IMP_CTR: 1000,
    CTR_MINIMO: 0.30
  };

  /* Factor de fase del ACOS objetivo (sophie-ads). */
  var FASES = {
    lanzamiento:  { factor: 1.30, nombre: 'Lanzamiento (0–60 días)',  intencion: 'Comprar ranking a pérdida controlada' },
    escalamiento: { factor: 0.70, nombre: 'Escalamiento (60–180 días)', intencion: 'Crecer con rentabilidad' },
    madurez:      { factor: 0.50, nombre: 'Madurez (180+ días)',       intencion: 'Defender posición y extraer margen' },
    liquidacion:  { factor: 1.50, nombre: 'Liquidación',               intencion: 'Recuperar capital de inventario' }
  };

  /* Arquitectura por nivel (sophie-ads). */
  var NIVELES = [
    { id: 'N1', nombre: 'Descubrimiento', reparto: 0.20, factorPuja: 0.60, tipo: 'SP Auto (4 grupos separados) + SP Broad con 10–15 semillas' },
    { id: 'N2', nombre: 'Validación',     reparto: 0.25, factorPuja: 0.80, tipo: 'SP Frase con lo cosechado del Nivel 1' },
    { id: 'N3', nombre: 'Rentabilidad',   reparto: 0.40, factorPuja: 1.00, tipo: 'SP Exacta, un ad group por keyword' },
    { id: 'N4', nombre: 'Defensa y expansión', reparto: 0.15, factorPuja: 0.80, tipo: 'SP Product Targeting (propios y competidores débiles), SB Video, SD Remarketing' }
  ];
  var CLICS_DIA_PRESUPUESTO = 25;
  var IVA_MX = 0.16;

  /* ============================================================
     Utilidades
     ============================================================ */
  function n(v, d) { v = parseFloat(v); return isFinite(v) ? v : (d || 0); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pct(v) { return v === null || v === undefined ? 'n/d' : r2(v) + '%'; }
  function usd(v) { return v === null || v === undefined ? 'n/d' : '$' + r2(v).toFixed(2); }

  /* ============================================================
     ESTADÍSTICA
     ============================================================ */
  // Intervalo de Wilson de una proporción (lo = Wilson_LB del manual).
  function wilson(succ, trials, z) {
    trials = n(trials, 0); succ = Math.min(n(succ, 0), trials);
    if (trials <= 0) return { lo: 0, hi: 1 };
    z = z || CONFIG.Z_CONFIANZA;
    var p = succ / trials, z2 = z * z;
    var denom = 1 + z2 / trials;
    var centro = p + z2 / (2 * trials);
    var margen = z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials));
    return { lo: Math.max(0, (centro - margen) / denom), hi: Math.min(1, (centro + margen) / denom) };
  }

  // CVR bayesiano del manual: (órdenes + k·CVR_cuenta) / (clics + k).
  function cvrBayes(ord, clk, cvrCuenta, k) {
    k = (k === undefined || k === null) ? CONFIG.PRIOR_FUERZA : k;
    var base = n(cvrCuenta, 0);
    var den = n(clk, 0) + k;
    return den > 0 ? (n(ord, 0) + k * base) / den : 0;
  }

  // Compatibilidad (v1): intervalo con prior. Su media es el CVR bayesiano.
  function intervalo(succ, trials, baseCVR, k, z) {
    if (!(baseCVR > 0) || !(k > 0)) return wilson(succ, trials, z);
    z = z || CONFIG.Z_CONFIANZA;
    var a = baseCVR * k + succ, b = (1 - baseCVR) * k + (trials - succ), tot = a + b;
    var media = a / tot, desv = Math.sqrt(a * b / (tot * tot * (tot + 1)));
    return { lo: Math.max(0, media - z * desv), hi: Math.min(1, media + z * desv), media: media, base: baseCVR };
  }

  // Compatibilidad (v1). Con el método actual la poda es a 12 clics sin órdenes.
  function clicsParaNegar() { return CONFIG.PISO_CLICS; }

  /* ============================================================
     ECONOMÍA (sophie-ads · "Los cinco números")
     e = { precio, cau, referral (monto) | referralPct, fba, devolucionesPct | devoluciones,
           cvr (en %), fase, mercado: 'US' | 'MX', presupuestoMaximo? }
     ============================================================ */
  function economia(e) {
    e = e || {};
    var precio = n(e.precio), cau = n(e.cau), fba = n(e.fba);
    var referral = e.referral !== undefined && e.referral !== null && e.referral !== ''
      ? n(e.referral) : precio * n(e.referralPct) / 100;
    var devol = e.devoluciones !== undefined && e.devoluciones !== null && e.devoluciones !== ''
      ? n(e.devoluciones) : precio * n(e.devolucionesPct) / 100;
    var mx = String(e.mercado || 'US').toUpperCase() === 'MX';
    var faseId = String(e.fase || 'lanzamiento').toLowerCase();
    var fase = FASES[faseId];
    var errores = [];

    if (!(precio > 0)) errores.push('Falta el precio de venta.');
    if (!(cau > 0)) errores.push('Falta el costo aterrizado por unidad (CAU).');
    if (!(fba > 0)) errores.push('Falta la tarifa FBA (o el peso para calcularla): sin ella el break-even sale inflado.');
    if (!(referral > 0)) errores.push('Falta la comisión de referido de Amazon.');
    if (!fase) errores.push('Fase desconocida: usa lanzamiento, escalamiento, madurez o liquidación.');
    if (cau < 0 || fba < 0 || referral < 0 || devol < 0) errores.push('Ningún costo puede ser negativo.');
    if (errores.length) return { ok: false, errores: errores, error: errores.join(' ') };

    // Margen de contribución. En México el precio y las tarifas llevan IVA: se descuenta
    // antes de restar el costo (el break-even se expresa sobre el precio con IVA, que es
    // como Amazon mide el ACOS).
    var margen = mx ? (precio - referral - fba - devol) / (1 + IVA_MX) - cau
                    : precio - cau - referral - fba - devol;
    var margenPct = margen / precio * 100;

    var base = {
      precio: r2(precio), cau: r2(cau), referral: r2(referral), fba: r2(fba), devoluciones: r2(devol),
      mercado: mx ? 'MX' : 'US', margen: r2(margen), margenPct: r2(margenPct), breakEvenACOS: r2(margenPct),
      fase: faseId, faseNombre: fase.nombre, factorFase: fase.factor
    };
    if (margenPct <= 0) {
      base.ok = false; base.viable = false;
      base.error = 'Margen de ' + r2(margenPct) + '%: no hay estrategia de ads posible. El problema es el precio o el costo, no la publicidad.';
      return base;
    }

    var acosObj = margenPct * fase.factor;
    var targetCPA = precio * acosObj / 100;
    var cvr = n(e.cvr);
    var cvrValido = cvr > 0 && cvr <= 100;
    var maxCPC = cvrValido ? targetCPA * cvr / 100 : null;

    var niveles = null, presupuesto = null;
    if (maxCPC !== null) {
      // Del maxCPC redondeado que ve el alumno: 0,61 × 25 = 15,25 (no 0,6098 × 25 = 15,24).
      presupuesto = r2(maxCPC) * CLICS_DIA_PRESUPUESTO;
      niveles = NIVELES.map(function (l) {
        return { id: l.id, nombre: l.nombre, tipo: l.tipo, reparto: l.reparto,
                 presupuestoDia: r2(presupuesto * l.reparto), puja: r2(maxCPC * l.factorPuja) };
      });
    }
    base.ok = true; base.viable = true;
    base.acosObjetivo = r2(acosObj);
    base.targetCPA = r2(targetCPA);
    base.cvr = cvrValido ? r2(cvr) : null;
    base.cvrEstimado = !!e.cvrEstimado;
    base.maxCPC = maxCPC === null ? null : r2(maxCPC);
    base.pujaArranque = maxCPC === null ? null : r2(maxCPC * 0.80);
    base.presupuestoDia = presupuesto === null ? null : r2(presupuesto);
    base.presupuestoMes = presupuesto === null ? null : r2(r2(presupuesto) * 30);
    base.niveles = niveles;
    if (!cvrValido) base.aviso = 'Falta la conversión (CVR): sin ella no hay maxCPC. Usa la del nicho y márcala como estimación.';
    if (e.presupuestoMaximo > 0 && presupuesto !== null && presupuesto > n(e.presupuestoMaximo)) {
      base.avisoPresupuesto = 'El presupuesto del método (' + usd(presupuesto) + '/día) supera tu tope de ' + usd(e.presupuestoMaximo) +
        '/día: recorta niveles (empieza por Defensa), no subas el gasto.';
    }
    return base;
  }

  function textoEconomia(E) {
    if (!E) return '';
    if (!E.ok) return 'ECONOMÍA: ' + (E.error || (E.errores || []).join(' '));
    var out = 'ECONOMÍA CALCULADA POR LA APLICACIÓN (usa estos números tal cual; no los recalcules)\n';
    out += 'Precio ' + usd(E.precio) + '  CAU ' + usd(E.cau) + '  Referral ' + usd(E.referral) + '  FBA ' + usd(E.fba) +
           '  Devoluciones ' + usd(E.devoluciones) + (E.mercado === 'MX' ? '  (México: IVA del 16% descontado)' : '') +
           '  →  Margen ' + usd(E.margen) + ' (' + pct(E.margenPct) + ')\n';
    out += 'Break-even ACOS: ' + pct(E.breakEvenACOS) + '\n';
    out += 'Fase: ' + E.faseNombre + '  ×' + E.factorFase + '  →  ACOS objetivo: ' + pct(E.acosObjetivo) + '\n';
    out += 'targetCPA: ' + usd(E.targetCPA) + '   CVR: ' + (E.cvr === null ? 'n/d' : E.cvr + '%' + (E.cvrEstimado ? ' (estimación del nicho)' : '')) +
           '   maxCPC: ' + usd(E.maxCPC) + '   Puja arranque: ' + usd(E.pujaArranque) + '\n';
    if (E.niveles) {
      out += 'ARQUITECTURA (presupuesto = maxCPC × 25 clics = ' + usd(E.presupuestoDia) + '/día · ' + usd(E.presupuestoMes) + '/mes)\n';
      E.niveles.forEach(function (l) {
        out += l.id + ' ' + l.nombre + '  ' + usd(l.presupuestoDia) + '/día (' + Math.round(l.reparto * 100) + '%)  puja ' + usd(l.puja) + '  ·  ' + l.tipo + '\n';
      });
    }
    if (E.aviso) out += 'AVISO: ' + E.aviso + '\n';
    if (E.avisoPresupuesto) out += 'AVISO: ' + E.avisoPresupuesto + '\n';
    return out;
  }

  /* ============================================================
     LECTURA DEL SEARCH TERM REPORT
     ============================================================ */
  function detectarSeparador(linea) {
    var c = { ',': 0, ';': 0, '\t': 0 }, dentro = false;
    for (var i = 0; i < linea.length; i++) {
      var ch = linea[i];
      if (ch === '"') dentro = !dentro;
      else if (!dentro && c[ch] !== undefined) c[ch]++;
    }
    return c['\t'] >= c[','] && c['\t'] >= c[';'] && c['\t'] > 0 ? '\t' : (c[';'] > c[','] ? ';' : ',');
  }

  function parseCSV(texto) {
    texto = String(texto || '').replace(/^﻿/, '');
    var primera = texto.split(/\r?\n/)[0] || '';
    var sep = detectarSeparador(primera);
    var filas = [], fila = [], campo = '', dentro = false;
    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (dentro) {
        if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else dentro = false; }
        else campo += ch;
      } else if (ch === '"' && campo === '') dentro = true;
      else if (ch === sep) { fila.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo); campo = '';
        if (fila.some(function (x) { return String(x).trim() !== ''; })) filas.push(fila);
        fila = [];
      } else campo += ch;
    }
    fila.push(campo);
    if (fila.some(function (x) { return String(x).trim() !== ''; })) filas.push(fila);
    return filas;
  }

  // Números en formato US (1,234.56), latino (1.234,56 · 14,00), con $, €, %, y (12.50) negativo.
  function leerNumero(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    var neg = /^\(.*\)$/.test(s) || /^-/.test(s);
    s = s.replace(/[()\s$€%]|MX\$|US\$|MXN|USD/gi, '').replace(/^-/, '');
    if (!s) return 0;
    var hasDot = s.indexOf('.') >= 0, hasComma = s.indexOf(',') >= 0;
    if (hasDot && hasComma) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (hasComma) {
      s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
    } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    var x = parseFloat(s);
    if (!isFinite(x)) return 0;
    return neg ? -x : x;
  }

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }

  var FILA_TOTAL = /^(total|totales|grand total|total general|suma|sum|totals|subtotal)$/;

  function col(H, pred) { for (var i = 0; i < H.length; i++) if (pred(H[i])) return i; return -1; }

  function leerFecha(s, diaPrimero) {
    s = String(s || '').trim(); if (!s) return null;
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})$/);
    if (m) {
      var a = +m[1], b = +m[2], y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      // Ambiguo: si el primero > 12 es día (latino); si no, se asume mes/día (formato de Amazon US).
      return (a > 12 || (diaPrimero && b <= 12)) ? new Date(Date.UTC(y, b - 1, a)) : new Date(Date.UTC(y, a - 1, b));
    }
    var t = Date.parse(s);
    return isFinite(t) ? new Date(t) : null;
  }

  /* entrada: texto CSV/TSV, o un array de filas (la primera son encabezados). */
  function leerReporte(entrada) {
    var filas = Array.isArray(entrada) ? entrada : parseCSV(entrada);
    if (!filas || filas.length < 2) return { ok: false, error: 'El archivo está vacío o no tiene filas de datos.' };
    // El encabezado puede no estar en la primera fila (algunas exportaciones traen título).
    var h0 = 0;
    for (var t = 0; t < Math.min(filas.length, 10); t++) {
      var hh = filas[t].map(norm);
      if (hh.some(function (h) { return h.indexOf('search term') >= 0 || h.indexOf('termino de busqueda') >= 0 || h === 'customer search term'; })) { h0 = t; break; }
    }
    var H = filas[h0].map(norm);
    var iTerm = col(H, function (h) { return h.indexOf('search term') >= 0 || h.indexOf('termino de busqueda') >= 0 || h.indexOf('consulta de busqueda') >= 0; });
    var iImp = col(H, function (h) { return h.indexOf('impression') >= 0 || h.indexOf('impresion') >= 0; });
    var iClk = col(H, function (h) { return (h.indexOf('click') >= 0 && !/rate|through|per|cost/.test(h)) || h === 'clics' || (h.indexOf('clics') >= 0 && !/por|tasa|costo/.test(h)); });
    var iSpd = col(H, function (h) { return h === 'spend' || h.indexOf('spend') >= 0 || h.indexOf('gasto') >= 0 || h.indexOf('inversion') >= 0 || h === 'cost' || h === 'costo'; });
    var iSal = col(H, function (h) { return (h.indexOf('total sales') >= 0 || h.indexOf('ventas totales') >= 0 || h.indexOf('7 day total sales') >= 0) && !/cost|costo|acos|roas/.test(h); });
    if (iSal < 0) iSal = col(H, function (h) { return (h.indexOf('sales') >= 0 || h.indexOf('ventas') >= 0) && !/cost|costo|acos|roas|units|unidades/.test(h); });
    var iOrd = col(H, function (h) { return (h.indexOf('order') >= 0 || h.indexOf('pedido') >= 0) && !/rate|tasa/.test(h); });
    var iUni = col(H, function (h) { return h.indexOf('units') >= 0 || h.indexOf('unidades') >= 0; });
    var iCamp = col(H, function (h) { return h.indexOf('campaign name') >= 0 || h.indexOf('nombre de la campana') >= 0 || h === 'campana' || h === 'campaign'; });
    var iGrp = col(H, function (h) { return h.indexOf('ad group name') >= 0 || h.indexOf('nombre del grupo de anuncios') >= 0 || h === 'grupo de anuncios' || h === 'ad group'; });
    var iMt = col(H, function (h) { return h.indexOf('match type') >= 0 || h.indexOf('tipo de concordancia') >= 0 || h === 'concordancia'; });
    var iTgt = col(H, function (h) { return h === 'targeting' || h.indexOf('segmentacion') >= 0 || h.indexOf('orientacion') >= 0 || h === 'keyword' || h === 'palabra clave'; });
    var iDate = col(H, function (h) { return h === 'date' || h === 'fecha' || h.indexOf('start date') >= 0 || h.indexOf('fecha de inicio') >= 0; });
    var iDateEnd = col(H, function (h) { return h.indexOf('end date') >= 0 || h.indexOf('fecha de finalizacion') >= 0 || h.indexOf('fecha de fin') >= 0; });

    var faltan = [];
    if (iTerm < 0) faltan.push('término de búsqueda');
    if (iClk < 0) faltan.push('clics');
    if (iSpd < 0) faltan.push('gasto');
    if (iOrd < 0 && iUni < 0) faltan.push('órdenes');
    if (faltan.length) return { ok: false, error: 'No encontré estas columnas: ' + faltan.join(', ') + '. Descarga el Search Term Report de Sponsored Products desde Campaign Manager → Reports.' };

    var str = function (row, i) { return i < 0 || row[i] == null ? '' : String(row[i]).trim(); };
    var mapa = {}, campanas = {}, calidad = { filasLeidas: 0, filasUsadas: 0, totalesDescartados: 0, vacias: 0, datosInvalidos: 0, desde: null, hasta: null, dias: null, usaUnidades: iOrd < 0 };
    var fMin = null, fMax = null;
    // Orden día/mes de las fechas con barra: se decide con TODA la columna. Si algún valor
    // trae un primer número > 12, es día/mes; si alguno trae el segundo > 12, es mes/día;
    // si no se puede saber, manda el idioma de los encabezados (español = día/mes).
    var diaPrimero = null;
    [iDate, iDateEnd].forEach(function (ci) {
      if (ci < 0) return;
      for (var q = h0 + 1; q < filas.length; q++) {
        var mm = String(filas[q][ci] || '').trim().match(/^(\d{1,2})[\/.](\d{1,2})[\/.]\d{2,4}$/);
        if (!mm) continue;
        if (+mm[1] > 12) { diaPrimero = true; break; }
        if (+mm[2] > 12) { diaPrimero = false; break; }
      }
    });
    if (diaPrimero === null) diaPrimero = H.some(function (h) { return h === 'fecha' || h.indexOf('fecha de') >= 0; });

    for (var r = h0 + 1; r < filas.length; r++) {
      var row = filas[r]; calidad.filasLeidas++;
      var term = str(row, iTerm);
      var k = norm(term);
      var campNorm = iCamp >= 0 ? norm(str(row, iCamp)) : '';
      if (FILA_TOTAL.test(k) || (!k && FILA_TOTAL.test(campNorm))) { calidad.totalesDescartados++; continue; }
      if (!k) { calidad.vacias++; continue; }
      var imp = Math.max(0, leerNumero(row[iImp])), clk = Math.max(0, leerNumero(row[iClk])), spd = Math.max(0, leerNumero(row[iSpd]));
      var sal = Math.max(0, leerNumero(row[iSal])), ord = Math.max(0, leerNumero(row[iOrd >= 0 ? iOrd : iUni]));
      calidad.filasUsadas++;
      var camp = str(row, iCamp) || '(sin campaña)';
      var grp = str(row, iGrp);
      var mt = (str(row, iMt) || '').toLowerCase() || (/^auto/i.test(camp) ? 'auto' : '-');
      var tgt = str(row, iTgt);

      if (!mapa[k]) mapa[k] = { term: term, imp: 0, clk: 0, spd: 0, sal: 0, ord: 0, src: {}, filas: 0 };
      var t0 = mapa[k];
      t0.imp += imp; t0.clk += clk; t0.spd += spd; t0.sal += sal; t0.ord += ord; t0.filas++;
      var sk = camp + ' [' + mt + ']';
      if (!t0.src[sk]) t0.src[sk] = { campana: camp, grupo: grp, grupos: [], concordancia: mt, segmentacion: tgt, spd: 0, ord: 0, clk: 0 };
      t0.src[sk].spd += spd; t0.src[sk].ord += ord; t0.src[sk].clk += clk;
      if (grp && t0.src[sk].grupos.indexOf(grp) < 0) t0.src[sk].grupos.push(grp);
      if (tgt && !t0.src[sk].segmentacion) t0.src[sk].segmentacion = tgt;

      if (!campanas[camp]) campanas[camp] = { campana: camp, spd: 0, sal: 0, ord: 0, clk: 0 };
      campanas[camp].spd += spd; campanas[camp].sal += sal; campanas[camp].ord += ord; campanas[camp].clk += clk;

      [iDate, iDateEnd].forEach(function (ci) {
        if (ci < 0) return;
        var f = leerFecha(str(row, ci), diaPrimero); if (!f) return;
        if (!fMin || f < fMin) fMin = f;
        if (!fMax || f > fMax) fMax = f;
      });
    }
    var terminos = Object.keys(mapa).map(function (key) {
      var x = mapa[key];
      x.spd = r2(x.spd); x.sal = r2(x.sal);
      x.ctr = x.imp ? x.clk / x.imp * 100 : 0;
      x.cpc = x.clk ? x.spd / x.clk : 0;
      x.cvr = x.clk ? x.ord / x.clk * 100 : 0;
      if (x.ord > x.clk) calidad.datosInvalidos++;
      return x;
    });
    calidad.terminosUnicos = terminos.length;
    calidad.filasSumadas = calidad.filasUsadas - terminos.length;
    if (fMin && fMax) {
      calidad.desde = fMin.toISOString().slice(0, 10);
      calidad.hasta = fMax.toISOString().slice(0, 10);
      calidad.dias = Math.round((fMax - fMin) / 864e5) + 1;
    }
    calidad.avisos = [];
    if (calidad.usaUnidades) calidad.avisos.push('El reporte no trae "órdenes": se usaron las unidades.');
    if (calidad.dias !== null && calidad.dias < CONFIG.VENTANA_PUJAS) calidad.avisos.push('El reporte cubre ' + calidad.dias + ' días: el método pide 30 para decidir pujas y 60 para podar.');
    else if (calidad.dias !== null && calidad.dias < CONFIG.VENTANA_PODA) calidad.avisos.push('El reporte cubre ' + calidad.dias + ' días: sirve para pujas; para podar el método pide 60.');
    if (calidad.dias === null) calidad.avisos.push('No encontré las fechas del reporte: el método pide 30 días para pujas y 60 para podar.');
    if (calidad.datosInvalidos) calidad.avisos.push(calidad.datosInvalidos + ' término(s) con más órdenes que clics: revisa que el archivo sea el Search Term Report.');

    return { ok: true, terminos: terminos, campanas: Object.keys(campanas).map(function (c) { return campanas[c]; }), calidad: calidad };
  }

  /* ============================================================
     CLASIFICADOR (sophie-optimizador)
     ============================================================ */
  function esExacta(clave, info) {
    var mt = info && info.concordancia ? info.concordancia : clave;
    return /\b(exact|exacta|exacto)\b/i.test(String(mt));
  }
  function enExacta(src) { for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k) && esExacta(k, src[k])) return true; return false; }
  function enNoExacta(src) { for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k) && !esExacta(k, src[k])) return true; return false; }
  function campanaPrincipal(src) {
    var mejor = '', max = -1;
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k) && n(src[k].spd) > max) { max = n(src[k].spd); mejor = k; }
    return mejor;
  }
  function origenesNoExactos(src) {
    var out = [];
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k) && !esExacta(k, src[k])) out.push(k);
    return out;
  }
  function listaCampanas(src) {
    var out = [];
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) out.push({ origen: k, gasto: r2(n(src[k].spd)), ordenes: n(src[k].ord), clics: n(src[k].clk), grupo: src[k].grupo || '', grupos: (src[k].grupos && src[k].grupos.length) ? src[k].grupos.slice() : (src[k].grupo ? [src[k].grupo] : ['']), segmentacion: src[k].segmentacion || '' });
    return out.sort(function (a, b) { return b.gasto - a.gasto; });
  }
  function esMarcaExcluida(term, marcas) {
    if (!marcas || !marcas.length) return false;
    var t = String(term).toLowerCase();
    for (var i = 0; i < marcas.length; i++) { var m = String(marcas[i]).toLowerCase().trim(); if (m && t.indexOf(m) !== -1) return true; }
    return false;
  }
  var SEG_LABELS = {
    'close match': 1, 'loose match': 1, 'substitutes': 1, 'complements': 1,
    'coincidencia cercana': 1, 'coincidencia lejana': 1, 'concordancia amplia': 1, 'concordancia cercana': 1, 'concordancia lejana': 1,
    'sustitutos': 1, 'substitutos': 1, 'complementarios': 1, 'complementos': 1,
    'queryhighrelmatches': 1, 'querybroadrelmatches': 1, 'asinsubstituterelated': 1, 'asinaccessoryrelated': 1
  };
  function esSegmentacion(term) {
    var raw = String(term == null ? '' : term).trim();
    if (!raw || raw === '*' || raw === '-') return true;
    if (/=\s*"/.test(raw)) return true;
    if (/^(keyword-group|audience|product|category)\b/i.test(raw)) return true;
    var t = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    return !!SEG_LABELS[t];
  }
  function esAsin(term) { return /^b0[a-z0-9]{8}$/i.test(String(term).trim()); }

  function lecturaTacos(t) {
    if (t === null || t === undefined) return null;
    if (t > 25) return { banda: '> 25%', lectura: 'Dependencia del pago: congela aumentos, corta G3 y G4 agresivamente y revisa el listing.' };
    if (t >= 15) return { banda: '15–25%', lectura: 'Normal en lanzamiento; en madurez, recorta G3.' };
    if (t >= 8) return { banda: '8–15%', lectura: 'Saludable: escala G1.' };
    return { banda: '< 8%', lectura: 'Sub-invertido: sube el presupuesto de G1 y G2. Estás dejando volumen sobre la mesa.' };
  }

  // ctx: { precio, breakEvenACOS (en %), fase | factorFase | objetivo (compat), cvrCuenta? (0–1),
  //        marcasCompetidores?, diasReporte?, ventasTotales? }
  function clasificar(terminos, ctx, opciones) {
    ctx = ctx || {};
    var C = Object.assign({}, CONFIG, opciones || {});
    var precio = n(ctx.precio);
    var beACOS = n(ctx.breakEvenACOS);
    var marcas = ctx.marcasCompetidores || [];
    var dias = n(ctx.diasReporte, 0);
    var ventasTotales = n(ctx.ventasTotales, 0);

    if (precio <= 0 || beACOS <= 0) {
      return { ok: false, error: 'Faltan el precio de venta o el break-even ACOS (margen %). Sin esos dos números no hay contra qué medir. Si el margen es 0 o negativo, no hay estrategia de ads posible.' };
    }

    // Fase → factor. Compatibilidad: objetivo 'ranking' = lanzamiento; 'rentabilidad'/'conquista' = escalamiento.
    var faseId = String(ctx.fase || '').toLowerCase();
    if (!FASES[faseId]) faseId = String(ctx.objetivo || '').toLowerCase() === 'ranking' ? 'lanzamiento' : 'escalamiento';
    var factor = n(ctx.factorFase) > 0 ? n(ctx.factorFase) : FASES[faseId].factor;
    var beCPA = precio * beACOS / 100;
    var targetACOS = beACOS * factor;
    var targetCPA = precio * targetACOS / 100;

    var lista = Array.isArray(terminos) ? terminos : [];

    // CVR de la cuenta (base del prior): excluye filas de segmentación.
    var totClk = 0, totOrd = 0, totSpd = 0, totSal = 0, baseClk = 0, baseOrd = 0;
    lista.forEach(function (t) {
      totClk += n(t.clk); totOrd += n(t.ord); totSpd += n(t.spd); totSal += n(t.sal);
      if (!esSegmentacion(t.term)) { baseClk += n(t.clk); baseOrd += n(t.ord); }
    });
    var cvrCuenta = n(ctx.cvrCuenta, -1) >= 0 && ctx.cvrCuenta !== undefined ? n(ctx.cvrCuenta) : (baseClk > 0 ? baseOrd / baseClk : 0);
    var priorOrdenes = C.PRIOR_FUERZA * cvrCuenta;

    // G1 = top 20% del gasto entre los términos con datos y órdenes.
    var conDatos = lista.filter(function (t) { return !esSegmentacion(t.term) && n(t.clk) >= C.PISO_CLICS && n(t.ord) >= 1; })
                        .sort(function (a, b) { return n(b.spd) - n(a.spd); });
    var cupoG1 = Math.max(1, Math.ceil(conDatos.length * C.TOP_GASTO_G1));
    var topGasto = {};
    conDatos.slice(0, cupoG1).forEach(function (t) { topGasto[norm(t.term)] = true; });

    var decisiones = lista.map(function (t) {
      var clk = n(t.clk), ord = n(t.ord), spd = n(t.spd), sal = n(t.sal), imp = n(t.imp);
      var src = t.src || {};
      var cpc = clk > 0 ? spd / clk : 0;
      var acos = sal > 0 ? spd / sal * 100 : null;
      var bayes = cvrBayes(ord, clk, cvrCuenta, C.PRIOR_FUERZA);
      var wl = wilson(ord, clk, C.Z_CONFIANZA).lo;
      var d = {
        termino: t.term, clics: clk, ordenes: ord, impresiones: imp,
        gasto: r2(spd), ventas: r2(sal), cpc: r2(cpc),
        cvr: clk > 0 ? r2(ord / clk * 100) : 0,
        cvrBayes: r2(bayes * 100), wilsonLB: r4(wl),
        acos: acos === null ? null : r2(acos),
        campanas: listaCampanas(src), campanaPrincipal: campanaPrincipal(src),
        origenes: origenesNoExactos(src),
        yaEnExacta: enExacta(src), tambienFueraDeExacta: enNoExacta(src),
        grupo: null, accion: 'MANTENER', motivo: '', pujaSugerida: null, cambioPct: null,
        negativo: null, requiereJuicio: false,
        // compatibilidad v1
        maxCPC: r2(bayes * targetCPA), clicsPorOrden: ord > 0 ? r2(clk / ord) : null,
        confianza: { cvrLo: r2(wl * 100), cvrHi: r2(wilson(ord, clk, C.Z_CONFIANZA).hi * 100), beCVR: cpc > 0 ? r2(cpc / beCPA * 100) : null, baseCuenta: r2(cvrCuenta * 100), conPrior: C.PRIOR_FUERZA > 0 }
      };
      var disparo = function (txt) { d.motivo = txt; };

      if (esSegmentacion(t.term)) {
        d.accion = 'SEGMENTACION';
        disparo('No es una búsqueda de cliente: es un grupo de la Auto o un target de producto/categoría. No se niega como keyword ni se cosecha a exacta; se gestiona por puja o pausa del grupo, o con negativo de producto/categoría.');
        d.requiereJuicio = true; return d;
      }
      if (ord > clk) {
        d.accion = 'REVISAR_DATO';
        disparo(ord + ' órdenes con ' + clk + ' clics es imposible: el archivo trae columnas mezcladas o no es el Search Term Report. No se decide nada sobre este término.');
        return d;
      }
      if (esMarcaExcluida(t.term, marcas)) {
        d.accion = 'REVISAR_MARCA';
        disparo('Término con marca de un competidor: la conquista tiene otra economía. Se decide aparte.');
        d.requiereJuicio = true; return d;
      }

      /* G5 · Inmaduros: < 12 clics. Nunca se tocan. */
      if (clk < C.PISO_CLICS) {
        d.grupo = 'G5'; d.accion = 'MANTENER';
        disparo(clk + ' clics: menos de ' + C.PISO_CLICS + ', no hay datos para decidir. No se toca.' +
          (ord === 0 && spd >= 2 * targetCPA ? ' Ojo: ya gastó ' + usd(spd) + ' (≥ 2× targetCPA) con clics caros; revísalo en la próxima revisión.' : ''));
        return d;
      }

      /* G4 · Muertos: ≥ 12 clics y 0 órdenes → PODAR (negativo exacto). */
      if (ord === 0) {
        d.grupo = 'G4'; d.accion = 'NEGAR';
        d.negativo = esAsin(t.term) ? 'negativo de producto (ASIN)' : 'negativo exacto';
        disparo(clk + ' clics y ' + usd(spd) + ' sin una sola orden (umbral de poda: ' + C.PISO_CLICS + ' clics' +
          (spd >= 2 * targetCPA ? '; además gastó ≥ 2× targetCPA' : '') + '). ' + (d.negativo === 'negativo exacto' ? 'Negativo exacto' : 'Negativo de producto') +
          ' en ' + (d.campanaPrincipal || 'la campaña donde ocurre') + '.');
        d.requiereJuicio = true;   // relevancia: si es relevante y caro, el modelo puede proponer bajar puja
        return d;
      }

      // A partir de aquí: ≥ 12 clics y ≥ 1 orden.
      var rentableObjetivo = acos !== null && acos <= targetACOS;
      var sobreEquilibrio = acos !== null && acos > beACOS;
      d.grupo = topGasto[norm(t.term)] && rentableObjetivo ? 'G1' : (sobreEquilibrio ? 'G3' : 'G2');

      /* PODAR con órdenes: ni en el caso pesimista paga la mitad de su clic. */
      if (wl * precio < cpc * 0.5) {
        d.accion = 'NEGAR'; d.negativo = esAsin(t.term) ? 'negativo de producto (ASIN)' : 'negativo exacto';
        disparo('Wilson_LB ' + r2(wl * 100) + '% × precio ' + usd(precio) + ' = ' + usd(wl * precio) + ' por clic, menos de la mitad de su CPC (' + usd(cpc) +
          '): gasta el doble de lo que puede pagar. Negativo exacto donde ocurre.');
        d.requiereJuicio = true; return d;
      }

      /* COSECHAR: ≥ 2 órdenes, CVR bayesiano ≥ CVR de la cuenta, y vive fuera de una exacta. */
      if (ord >= C.MIN_ORDENES_COSECHA && bayes >= cvrCuenta && !d.yaEnExacta) {
        d.accion = 'COSECHAR';
        d.pujaSugerida = r2(bayes * targetCPA * C.FACTOR_PUJA_COSECHA);
        d.negativo = 'negativo exacto en el origen';
        disparo(ord + ' órdenes, CVR bayesiano ' + r2(bayes * 100) + '% (cuenta ' + r2(cvrCuenta * 100) + '%). Crear exacta en Nivel 3, en su propio ad group, con puja ' +
          usd(d.pujaSugerida) + ' (CVR bayes × targetCPA × 0,90), y negativo exacto en ' + (d.origenes.join(', ') || 'la campaña de origen') + '.');
        return d;
      }

      /* NEGAR CRUZADO: ya tiene su exacta pero sigue corriendo en niveles inferiores. */
      if (ord >= C.MIN_ORDENES_COSECHA && d.yaEnExacta && d.tambienFueraDeExacta && bayes >= cvrCuenta) {
        d.accion = 'NEGAR_EN_ORIGEN'; d.negativo = 'negativo exacto en el origen';
        disparo('Ya se graduó a exacta pero sigue corriendo en ' + d.origenes.join(', ') + ': compite consigo mismo y sube el CPC. Falta el negativo exacto en el nivel inferior.');
        return d;
      }

      /* Ajuste de puja por grupo. */
      var nueva;
      if (d.grupo === 'G3') {
        nueva = cpc * (targetACOS / acos);   // Sangrador: bajar a CPC × (ACOS objetivo / ACOS real)
      } else {
        nueva = bayes * targetCPA;           // G1 / G2: CVR bayesiano × targetCPA
      }
      nueva = clamp(nueva, cpc * (1 - C.TOPE_CAMBIO_PUJA), cpc * (1 + C.TOPE_CAMBIO_PUJA));

      if (nueva > cpc) {
        // Nunca subir sin pasar el test de Wilson: Wilson_LB ≥ CPC / targetCPA.
        var umbral = targetCPA > 0 ? cpc / targetCPA : Infinity;
        if (wl < umbral) {
          d.accion = 'MANTENER';
          disparo('Convierte (CVR bayesiano ' + r2(bayes * 100) + '%), pero no pasa el test de Wilson para subir: Wilson_LB ' + r2(wl * 100) +
            '% < CPC/targetCPA ' + r2(umbral * 100) + '%. Se mantiene hasta tener más evidencia.');
          return d;
        }
      }
      var cambio = cpc > 0 ? (nueva - cpc) / cpc : 0;
      if (Math.abs(cambio) < C.CAMBIO_MINIMO) {
        d.accion = 'MANTENER';
        disparo('Puja en su punto: la fórmula da ' + usd(nueva) + ' contra ' + usd(cpc) + ' actual (' + (cambio >= 0 ? '+' : '') + r2(cambio * 100) + '%). No se toca.');
        return d;
      }
      d.pujaSugerida = r2(nueva);
      d.cambioPct = r2(cambio * 100);
      d.accion = nueva > cpc ? 'SUBIR_PUJA' : 'BAJAR_PUJA';
      if (d.grupo === 'G1') disparo('Motor: top del gasto con ACOS ' + pct(acos) + ' ≤ objetivo ' + pct(targetACOS) + ' y pasa Wilson. Subir a ' + usd(nueva) + ' (' + (cambio >= 0 ? '+' : '') + r2(cambio * 100) + '%), aislarlo en su propio ad group y darle presupuesto.');
      else if (d.grupo === 'G3') disparo('Sangrador: ACOS ' + pct(acos) + ' sobre el equilibrio ' + pct(beACOS) + '. Bajar a ' + usd(nueva) + ' (' + r2(cambio * 100) + '%, tope ±25%). Revisar en 7 días.');
      else disparo('Prometedor: puja = CVR bayesiano ' + r2(bayes * 100) + '% × targetCPA ' + usd(targetCPA) + ' → ' + usd(nueva) + ' (' + (cambio >= 0 ? '+' : '') + r2(cambio * 100) + '%, tope ±25%). Revisar en 14 días.');
      return d;
    });

    /* ---------- Resumen ---------- */
    var por = {}, grupos = { G1: { n: 0, gasto: 0, ventas: 0 }, G2: { n: 0, gasto: 0, ventas: 0 }, G3: { n: 0, gasto: 0, ventas: 0 }, G4: { n: 0, gasto: 0, ventas: 0 }, G5: { n: 0, gasto: 0, ventas: 0 } };
    decisiones.forEach(function (d) {
      por[d.accion] = (por[d.accion] || 0) + 1;
      if (d.grupo) { var g = grupos[d.grupo]; g.n++; g.gasto += d.gasto; g.ventas += d.ventas; }
    });
    Object.keys(grupos).forEach(function (k) { var g = grupos[k]; g.gasto = r2(g.gasto); g.ventas = r2(g.ventas); g.acos = g.ventas > 0 ? r2(g.gasto / g.ventas * 100) : null; });

    var gastoPodado = decisiones.filter(function (d) { return d.accion === 'NEGAR'; }).reduce(function (s, d) { return s + d.gasto; }, 0);
    var ventasPodadas = decisiones.filter(function (d) { return d.accion === 'NEGAR'; }).reduce(function (s, d) { return s + d.ventas; }, 0);
    var desperdicio = decisiones.filter(function (d) { return d.ordenes === 0 && d.accion !== 'SEGMENTACION'; }).reduce(function (s, d) { return s + d.gasto; }, 0);
    var tacos = ventasTotales > 0 ? r2(totSpd / ventasTotales * 100) : null;
    var resumen = {
      terminos: decisiones.length, porAccion: por, grupos: grupos,
      gasto: r2(totSpd), ventas: r2(totSal), ordenes: totOrd, clics: totClk,
      acosCuenta: totSal > 0 ? r2(totSpd / totSal * 100) : null,
      cvrCuenta: r2(cvrCuenta * 100), cvrBaseCuenta: r2(cvrCuenta * 100),
      prior: { clics: C.PRIOR_FUERZA, ordenes: r2(priorOrdenes) }, priorFuerza: C.PRIOR_FUERZA,
      tacos: tacos, lecturaTacos: lecturaTacos(tacos),
      gastoDesperdiciado: r2(desperdicio), pctDesperdiciado: totSpd > 0 ? r2(desperdicio / totSpd * 100) : 0,
      gastoRecuperableAhora: r2(gastoPodado),
      acosProyectado: (totSal - ventasPodadas) > 0 ? r2((totSpd - gastoPodado) / (totSal - ventasPodadas) * 100) : null,
      clicsPorOrdenCuenta: totOrd > 0 ? r2(totClk / totOrd) : null,
      diasReporte: dias || null
    };
    if (dias > 0 && gastoPodado > 0) resumen.proyeccionMensual = r2(gastoPodado / dias * 30);

    return {
      ok: true,
      economia: {
        precio: r2(precio), breakEvenACOS: r2(beACOS), breakEvenCPA: r2(beCPA),
        fase: faseId, factorFase: factor, targetACOS: r2(targetACOS), targetCPA: r2(targetCPA),
        pisoClics: C.PISO_CLICS, objetivo: faseId
      },
      resumen: resumen,
      decisiones: decisiones
    };
  }

  /* ============================================================
     SALIDA OBLIGATORIA DEL MANUAL (texto para el modelo)
     ============================================================ */
  function texto(res, limite) {
    if (!res || !res.ok) return 'MOTOR PPC: ' + ((res && res.error) || 'sin resultado');
    limite = limite || 25;
    var e = res.economia, s = res.resumen, D = res.decisiones;
    var out = 'MOTOR PPC — DECISIONES YA CALCULADAS POR LA APLICACIÓN (método Sophie: no se recalculan)\n';
    out += 'REVISIÓN PPC' + (s.diasReporte ? ' — ventana ' + s.diasReporte + ' días' : '') + '\n\nBASE\n';
    out += 'CVR cuenta: ' + s.cvrCuenta + '%   Prior: ' + s.prior.clics + ' clics / ' + s.prior.ordenes + ' órdenes\n';
    out += 'Break-even ACOS: ' + e.breakEvenACOS + '%   Fase: ' + e.fase + ' ×' + e.factorFase + '   ACOS objetivo: ' + e.targetACOS + '%   targetCPA: $' + e.targetCPA + '\n';
    out += 'TACOS: ' + (s.tacos === null ? 'n/d (faltan las ventas totales del producto)' : s.tacos + '% → ' + s.lecturaTacos.lectura) + '\n';
    out += 'Cuenta: gasto $' + s.gasto + ' · ventas $' + s.ventas + ' · órdenes ' + s.ordenes + ' · ACOS ads ' + pct(s.acosCuenta) + '\n\n';
    out += 'SEGMENTACIÓN\n';
    var NOM = { G1: 'G1 Motores     ', G2: 'G2 Prometedores', G3: 'G3 Sangradores ', G4: 'G4 Muertos     ', G5: 'G5 Inmaduros   ' };
    ['G1', 'G2', 'G3', 'G4', 'G5'].forEach(function (g) {
      var x = s.grupos[g];
      out += NOM[g] + ' ' + x.n + ' términos · $' + x.gasto + ' gasto' + (g === 'G5' ? ' (no se tocan)' : ' · ACOS ' + pct(x.acos)) + '\n';
    });
    var bloque = function (titulo, acciones, fila) {
      var g = D.filter(function (d) { return acciones.indexOf(d.accion) >= 0; });
      if (!g.length) return;
      out += '\n' + titulo + ' (' + g.length + ')\n';
      g.sort(function (a, b) { return b.gasto - a.gasto; }).slice(0, limite).forEach(function (d) { out += fila(d) + '\n'; });
      if (g.length > limite) out += '  (y ' + (g.length - limite) + ' más)\n';
    };
    bloque('COSECHAR', ['COSECHAR'], function (d) { return '"' + d.termino + '" | ' + d.clics + ' clics | ' + d.ordenes + ' órd | CVR bayes ' + d.cvrBayes + '% | puja nueva $' + d.pujaSugerida + ' | exacta en Nivel 3; negativo exacto en ' + (d.origenes.join(', ') || d.campanaPrincipal); });
    bloque('PODAR', ['NEGAR'], function (d) { return '"' + d.termino + '" | ' + d.clics + ' clics | $' + d.gasto + ' | ' + d.motivo.split(/\.(?=\s|$)/)[0] + ' | ' + d.negativo + ' en ' + d.campanaPrincipal; });
    bloque('NEGAR EN ORIGEN', ['NEGAR_EN_ORIGEN'], function (d) { return '"' + d.termino + '" | negativo exacto en ' + d.origenes.join(', '); });
    bloque('AJUSTES DE PUJA', ['SUBIR_PUJA', 'BAJAR_PUJA'], function (d) { return '"' + d.termino + '" (' + d.grupo + ') | CPC $' + d.cpc + ' | CVR bayes ' + d.cvrBayes + '% | Wilson_LB ' + r2(d.wilsonLB * 100) + '% | puja nueva $' + d.pujaSugerida + ' | Δ ' + (d.cambioPct > 0 ? '+' : '') + d.cambioPct + '%'; });
    bloque('SEGMENTACIÓN DE AMAZON (no son términos)', ['SEGMENTACION'], function (d) { return '"' + d.termino + '" | ' + d.clics + ' clics | $' + d.gasto; });
    bloque('A REVISAR', ['REVISAR_DATO', 'REVISAR_MARCA'], function (d) { return '"' + d.termino + '" | ' + d.motivo; });
    out += '\nIMPACTO ESPERADO\nGasto liberado: $' + s.gastoRecuperableAhora + (s.proyeccionMensual ? ' (~$' + s.proyeccionMensual + '/mes)' : '') +
           '   ACOS proyectado: ' + pct(s.acosProyectado) + '\n\n';
    out += 'INSTRUCCIÓN: estas decisiones ya siguen el método (12 clics, CVR bayesiano, Wilson, tope ±25%) y NO se recalculan. ' +
           'Explica las de mayor impacto con el dato que las dispara, nombra la campaña exacta donde se ejecuta cada una y escribe el bloque ' +
           'de negativos para copiar. Nunca propongas acción sobre G5. En PODAR usa tu juicio de RELEVANCIA: si el término es relevante y caro, ' +
           'propón bajar la puja en vez de negarlo, y dilo. Los negativos son EXACTOS; un negativo de frase exige justificarlo. ' +
           'Las filas de SEGMENTACIÓN no van al bloque de negativos.';
    return out;
  }

  /* ============================================================
     ACCIONES PARA EXPORTAR (una fila por acción ejecutable)
     ============================================================ */
  function csvSeguro(v) {
    var s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;          // evita fórmulas en Excel/Sheets
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function acciones(res) {
    if (!res || !res.ok) return [];
    var filas = [];
    res.decisiones.forEach(function (d) {
      var base = { termino: d.termino, grupo: d.grupo || '', clics: d.clics, ordenes: d.ordenes, gasto: d.gasto, acos: d.acos, cvrBayes: d.cvrBayes, motivo: d.motivo };
      if (d.accion === 'NEGAR') {
        d.campanas.forEach(function (c) {
          if (c.gasto <= 0 && c.clics <= 0) return;
          c.grupos.forEach(function (g) {
            filas.push(Object.assign({}, base, { accion: 'Negativo exacto', campana: campanaDe(c.origen), grupoAnuncios: g, tipo: d.negativo && d.negativo.indexOf('ASIN') >= 0 ? 'Negative product targeting' : 'Negative exact', keyword: d.termino, puja: '' }));
          });
        });
      } else if (d.accion === 'COSECHAR') {
        filas.push(Object.assign({}, base, { accion: 'Crear exacta (Nivel 3)', campana: '(tu campaña de Rentabilidad)', grupoAnuncios: d.termino, tipo: 'Exact', keyword: d.termino, puja: d.pujaSugerida }));
        negOrigen(d, base, filas);
      } else if (d.accion === 'NEGAR_EN_ORIGEN') {
        negOrigen(d, base, filas);
      } else if (d.accion === 'SUBIR_PUJA' || d.accion === 'BAJAR_PUJA') {
        var c0 = d.campanas[0] || {};
        filas.push(Object.assign({}, base, { accion: d.accion === 'SUBIR_PUJA' ? 'Subir puja' : 'Bajar puja', campana: campanaDe(c0.origen || ''), grupoAnuncios: c0.grupo || '', tipo: 'Keyword (' + (c0.segmentacion || d.termino) + ')', keyword: c0.segmentacion || d.termino, puja: d.pujaSugerida, cambio: d.cambioPct }));
      }
    });
    return filas;
  }
  function campanaDe(origen) { return String(origen || '').replace(/\s*\[[^\]]*\]\s*$/, ''); }
  function gruposDe(d, origen) { for (var i = 0; i < d.campanas.length; i++) if (d.campanas[i].origen === origen) return d.campanas[i].grupos; return ['']; }
  function negOrigen(d, base, filas) {
    d.origenes.forEach(function (o) {
      gruposDe(d, o).forEach(function (g) {
        filas.push(Object.assign({}, base, { accion: 'Negativo exacto en origen', campana: campanaDe(o), grupoAnuncios: g, tipo: 'Negative exact', keyword: d.termino, puja: '' }));
      });
    });
  }
  function accionesCSV(res) {
    var cab = ['Acción', 'Campaña', 'Grupo de anuncios', 'Tipo', 'Keyword / término', 'Puja', 'Cambio %', 'Grupo Sophie', 'Clics', 'Órdenes', 'Gasto', 'ACOS %', 'CVR bayes %', 'Motivo'];
    var lineas = [cab.map(csvSeguro).join(',')];
    acciones(res).forEach(function (f) {
      lineas.push([f.accion, f.campana, f.grupoAnuncios, f.tipo, f.keyword, f.puja, f.cambio === undefined ? '' : f.cambio, f.grupo, f.clics, f.ordenes, f.gasto, f.acos === null ? '' : f.acos, f.cvrBayes, f.motivo].map(csvSeguro).join(','));
    });
    return lineas.join('\n');
  }

  global.SophiePPC = {
    version: '2.0',
    config: CONFIG,
    fases: FASES,
    niveles: NIVELES,
    economia: economia,
    textoEconomia: textoEconomia,
    leerReporte: leerReporte,
    leerNumero: leerNumero,
    parseCSV: parseCSV,
    clasificar: clasificar,
    texto: texto,
    acciones: acciones,
    accionesCSV: accionesCSV,
    lecturaTacos: lecturaTacos,
    wilson: wilson,
    cvrBayes: cvrBayes,
    intervalo: intervalo,
    clicsParaNegar: clicsParaNegar,
    esSegmentacion: esSegmentacion
  };

})(typeof window !== 'undefined' ? window : this);
