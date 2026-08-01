/* ============================================================
   SOPHIE · RESCATE v1.0  —  Motor de diagnóstico
   Crezcamos Online — ui.crezcamosonline.com/sophie-rescate.js

   Rescate es el módulo con más aritmética de la suite: dos gates,
   cuatro modos de falla, una tabla de decisión de cinco filas y una
   métrica de control. Todo eso vivía en el prompt, y el modelo lo
   recalculaba de memoria en cada veredicto.

   Aquí el modelo hace lo suyo: recolectar el intake, juzgar lo que
   solo se juzga mirando (nicho migrado, defecto de producto) y
   redactar. Los umbrales y el veredicto los decide este archivo.
   ============================================================ */

(function (global) {
  'use strict';

  var CONFIG = {
    REFERRAL: 0.15,           // comisión de Amazon por defecto
    FBA_ESTIMADO: 8,          // tamaño estándar, cuando el estudiante no lo sabe

    MARGEN_VERDE: 27,         // %
    MARGEN_AMBAR: 20,

    COBERTURA_VERDE: 8,       // meses
    COBERTURA_AMBAR: 18,

    EDAD_DECISION: 150,       // días: por encima, el gate no puede ser verde
    EDAD_PRIMER_RECARGO: 181,

    VIS_PUJA_PCT: 70,         // puja mínima como % de la sugerida
    VIS_IMPRESIONES: 3000,    // al mes
    VIS_SESIONES_DIA: 10,
    VIS_PRESUPUESTO: 10,      // USD/día
    VIS_PUJA_SUGERIDA_ALTA: 0.80,
    VIS_ACOS_BONITO: 20,      // % — con pocos pedidos, es campaña apagada
    VIS_PEDIDOS_MINIMOS: 15,

    REP_ROJO: 4.0,            // rating
    REP_VERDE: 4.3,
    REP_RESENAS_MINIMAS: 15,
    REP_VINE_MAX_PCT: 50,

    CONV_CLICS_MINIMOS: 100,  // gate de datos
    CTR_ROJO: 0.25, CTR_VERDE: 0.40,
    CVR_ROJO: 7, CVR_VERDE: 10,

    ESC_COBERTURA: 24,        // meses -> mentoría
    ESC_EDAD: 300,            // días  -> mentoría

    ACOS_TECHO_DIA31: 0.75,   // × break-even
    CONTROL_DIAS: 30
  };

  var ORDEN = { verde: 0, ambar: 1, rojo: 2, pendiente: 1.5 };
  function peor(a, b) { return ORDEN[a] >= ORDEN[b] ? a : b; }
  function n(v) { v = parseFloat(v); return isFinite(v) ? v : null; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }

  function fechaMas(dias) {
    var d = new Date(); d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
  }

  /* ============================================================
     GATE 1 · ECONOMÍA UNITARIA
     ============================================================ */
  function economia(d, C) {
    var precio = n(d.precio), cogs = n(d.cogs), flete = n(d.flete), fba = n(d.fbaFee);
    var fbaEstimado = false;
    if (fba === null) { fba = C.FBA_ESTIMADO; fbaEstimado = true; }
    if (precio === null || precio <= 0 || cogs === null) {
      return { estado: 'pendiente', margenPct: null, acosBreakEven: null,
               nota: 'Faltan el precio o el COGS: sin eso no hay economía que evaluar.' };
    }
    if (flete === null) flete = 0;
    var referral = precio * (n(d.referralPct) !== null ? n(d.referralPct) / 100 : C.REFERRAL);
    var margen = (precio - referral - fba - cogs - flete) / precio * 100;

    var estado = margen > C.MARGEN_VERDE ? 'verde'
      : (margen >= C.MARGEN_AMBAR ? 'ambar' : 'rojo');

    var nota = 'Margen neto antes de PPC ' + r1(margen) + '%. Tu ACOS de equilibrio es ese mismo número: ' +
               r1(margen) + '%.';
    if (fbaEstimado) nota += ' La tarifa FBA va estimada en $' + C.FBA_ESTIMADO + ' (tamaño estándar): verifícala en Seller Central.';
    if (precio < 20) nota += ' Con precio bajo $20 la tarifa FBA se come el piso: reprecio o bundle es prerequisito de cualquier rescate por PPC.';
    if (margen < 0) nota += ' El margen es NEGATIVO: cada venta pierde dinero antes de gastar un centavo en publicidad.';

    return {
      estado: estado, margenPct: r1(margen), acosBreakEven: r1(margen),
      margenNegativo: margen < 0, fbaEstimado: fbaEstimado,
      desglose: { precio: r2(precio), referral: r2(referral), fba: r2(fba), cogs: r2(cogs), flete: r2(flete) },
      nota: nota
    };
  }

  /* ============================================================
     GATE 2 · NICHO E INVENTARIO — LOS DOS RELOJES
     ============================================================ */
  function nicho(d, C) {
    var unidades = n(d.unidadesFBA), pedidos = n(d.pedidosMes), edad = n(d.edadInventarioDias);
    var cobertura = (unidades !== null && pedidos !== null && pedidos > 0) ? unidades / pedidos : null;

    var eCob = cobertura === null ? 'pendiente'
      : (cobertura < C.COBERTURA_VERDE ? 'verde' : (cobertura <= C.COBERTURA_AMBAR ? 'ambar' : 'rojo'));

    // Reloj 2: la regla de los 150 días impide el verde.
    var eEdad = 'verde';
    if (edad === null) eEdad = 'pendiente';
    else if (edad > C.EDAD_DECISION) eEdad = 'ambar';

    var estado = peor(eCob, eEdad);
    if (d.nichoMigrado === true) estado = 'rojo';

    var nota = '';
    if (cobertura !== null) nota += 'Cobertura: ' + r1(cobertura) + ' meses de inventario al ritmo actual. ';
    if (edad !== null) {
      nota += 'Edad del inventario: ' + edad + ' días. ';
      if (edad > C.EDAD_DECISION && edad < C.EDAD_PRIMER_RECARGO) {
        nota += 'Pasaste los ' + C.EDAD_DECISION + ' días: tienes menos de ' + (C.EDAD_PRIMER_RECARGO - edad) +
                ' días para decidir precio, remoción o liquidación antes del primer recargo. ';
      } else if (edad >= C.EDAD_PRIMER_RECARGO) {
        nota += 'Ya estás pagando recargo por inventario envejecido, encima del almacenamiento mensual. ';
      }
    }
    if (d.nichoMigrado === true) nota += 'El nicho migró: el mercado ya no es el que era cuando lanzaste. ';
    if (eCob === 'rojo') nota += 'Con esta cobertura, "no invertir" es la estrategia más cara: el capital ya está muerto y sigue pagando bodega.';

    return {
      estado: estado, coberturaMeses: cobertura === null ? null : r1(cobertura),
      edadDias: edad, relojCobertura: eCob, relojEdad: eEdad,
      nichoMigrado: d.nichoMigrado === true, nota: nota.trim()
    };
  }

  /* ============================================================
     MODOS DE FALLA
     ============================================================ */
  function modoIndexacion(d) {
    var i = String(d.indexacion || '').toLowerCase();
    if (i === 'no' || i === 'no aparece' || i === 'false') {
      return { estado: 'rojo', congela: true,
        nota: 'Tu producto no aparece al buscar su keyword principal. Estás pagando clics hacia algo que Amazon no asocia con esa búsqueda: ningún ajuste de pujas sirve hasta cerrar esa brecha.',
        ruta: 'Sophie Listing (título + backend keywords) HOY, y repetir la búsqueda en 48-72 horas.' };
    }
    if (i === 'si' || i === 'sí' || i === 'aparece' || i === 'true') {
      return { estado: 'verde', congela: false, nota: 'El producto está indexado en su keyword principal.' };
    }
    return { estado: 'pendiente', congela: false,
      nota: 'Falta verificar la indexación. Es la tarea #1 del plan y hasta hacerla el diagnóstico de visibilidad es provisional.' };
  }

  function modoVisibilidad(d, C) {
    var disparos = [];
    var puja = n(d.pujaActual), sugerida = n(d.pujaSugerida);
    var imp = n(d.impresiones), sesiones = n(d.sesiones);
    var presu = n(d.presupuestoDiario), acos = n(d.acos), pedidos = n(d.pedidosMes);

    if (puja !== null && sugerida !== null && sugerida > 0 && (puja / sugerida * 100) < C.VIS_PUJA_PCT) {
      disparos.push('Tu puja está en ' + Math.round(puja / sugerida * 100) + '% de la sugerida (mínimo ' + C.VIS_PUJA_PCT + '%).');
    }
    if (imp !== null && imp < C.VIS_IMPRESIONES) {
      disparos.push('Solo ' + imp.toLocaleString('es') + ' impresiones al mes: nadie te está viendo.');
    }
    if (sesiones !== null && sesiones / 30 < C.VIS_SESIONES_DIA) {
      disparos.push('Menos de ' + C.VIS_SESIONES_DIA + ' sesiones al día (' + r1(sesiones / 30) + '): el problema es visibilidad, no listing.');
    }
    if (presu !== null && presu < C.VIS_PRESUPUESTO &&
        (d.presupuestoSeAgota === true || (sugerida !== null && sugerida > C.VIS_PUJA_SUGERIDA_ALTA))) {
      disparos.push('Presupuesto de $' + presu + '/día ' +
        (d.presupuestoSeAgota === true ? 'que se agota antes de terminar el día' : 'con puja sugerida de $' + sugerida) + '.');
    }
    if (acos !== null && acos <= C.VIS_ACOS_BONITO && pedidos !== null && pedidos < C.VIS_PEDIDOS_MINIMOS) {
      disparos.push('PARADOJA DEL ACOS BONITO: ' + r1(acos) + '% de ACOS con solo ' + pedidos +
        ' pedidos al mes. Eficiencia sobre volumen cero.');
    }

    if (!disparos.length) {
      var hayDatos = [puja, imp, sesiones, presu, acos].some(function (x) { return x !== null; });
      return { estado: hayDatos ? 'verde' : 'pendiente', disparos: [],
        nota: hayDatos ? 'La visibilidad no es el cuello de botella.' : 'Faltan datos de campaña para evaluar visibilidad.' };
    }
    return {
      estado: 'rojo', disparos: disparos,
      nota: 'Tu campaña no está fallando: está apagada. Estás optimizando el consumo de gasolina de un carro parqueado.',
      ruta: 'Sophie Ads y el ciclo semanal del Optimizador Cosecha y Poda.'
    };
  }

  function modoReputacion(d, C) {
    var rating = n(d.rating), total = n(d.resenas), vine = n(d.resenasVine, 0);
    if (vine === null) vine = 0;
    if (rating === null || total === null) {
      return { estado: 'pendiente', nota: 'Faltan el rating o el total de reseñas.' };
    }
    var organicas = Math.max(0, total - vine);
    var pctVine = total > 0 ? vine / total * 100 : 0;

    var estado;
    if (rating < C.REP_ROJO) estado = 'rojo';
    else if (rating >= C.REP_VERDE && total >= C.REP_RESENAS_MINIMAS) estado = 'verde';
    else estado = 'ambar';
    if (estado === 'verde' && (organicas < C.REP_RESENAS_MINIMAS || pctVine > C.REP_VINE_MAX_PCT)) estado = 'ambar';
    if (d.defectoProducto === true) estado = 'rojo';

    var nota = 'Rating ' + rating + ' con ' + total + ' reseñas' +
               (vine > 0 ? ' (' + vine + ' de Vine, ' + organicas + ' orgánicas)' : '') + '. ';
    if (rating < C.REP_ROJO) nota += 'Con rating bajo 4.0, minar las reseñas de 1-2 estrellas y las devoluciones es OBLIGATORIO antes de subir pujas. ';
    if (pctVine > C.REP_VINE_MAX_PCT) nota += 'Más de la mitad de tus reseñas son de Vine: te falta prueba social orgánica. ';
    if (d.defectoProducto === true) nota += 'DEFECTO DE PRODUCTO CONFIRMADO: nada se reordena con un defecto abierto.';

    return {
      estado: estado, rating: rating, total: total, organicas: organicas,
      pctVine: r1(pctVine), defecto: d.defectoProducto === true,
      vineDisponible: d.brandRegistry === 'si' && total < 30,
      nota: nota.trim()
    };
  }

  function modoConversion(d, C) {
    var clics = n(d.clics), imp = n(d.impresiones), sesiones = n(d.sesiones), pedidos = n(d.pedidosMes);
    if (clics === null || clics < C.CONV_CLICS_MINIMOS) {
      return { estado: 'pendiente',
        nota: 'Con ' + (clics === null ? 'sin datos de' : clics) + ' clics en 30 días no hay muestra suficiente. Se reevalúa al día 30 del plan de visibilidad.' };
    }
    var ctr = (imp !== null && imp > 0) ? clics / imp * 100 : null;
    var cvr = (sesiones !== null && sesiones > 0 && pedidos !== null) ? pedidos / sesiones * 100 : null;

    var eCtr = ctr === null ? 'pendiente' : (ctr < C.CTR_ROJO ? 'rojo' : (ctr <= C.CTR_VERDE ? 'ambar' : 'verde'));
    var eCvr = cvr === null ? 'pendiente' : (cvr < C.CVR_ROJO ? 'rojo' : (cvr <= C.CVR_VERDE ? 'ambar' : 'verde'));

    var nota = '';
    if (ctr !== null) nota += 'CTR ' + r2(ctr) + '%' + (eCtr !== 'verde' ? ' — apunta a imagen principal, precio visible y rating. ' : '. ');
    if (cvr !== null) nota += 'CVR ' + r1(cvr) + '%' + (eCvr !== 'verde' ? ' — apunta a listing, galería, precio y reseñas.' : '.');

    return { estado: peor(eCtr, eCvr), ctr: ctr === null ? null : r2(ctr), cvr: cvr === null ? null : r1(cvr),
             ctrEstado: eCtr, cvrEstado: eCvr, nota: nota.trim() };
  }

  /* ============================================================
     VEREDICTO · la tabla de decisión
     ============================================================ */
  function veredicto(eco, nic, rep) {
    if (rep && rep.defecto) {
      return { veredicto: 'CONGELAR', escala: true,
        motivo: 'Defecto de producto confirmado. Esa fila anula cualquier otra: nada se reordena con un defecto abierto.' };
    }
    var ecoOk = eco.estado === 'verde' || eco.estado === 'ambar';
    var nicOk = nic.estado === 'verde' || nic.estado === 'ambar';

    if (ecoOk && nicOk) return { veredicto: 'RESCATAR', escala: false, motivo: 'La economía aguanta y el nicho sigue vivo: hay con qué trabajar.' };
    if (!ecoOk && nicOk) return { veredicto: 'PIVOTAR', escala: true, motivo: 'El nicho sigue vivo, pero con este margen ningún ajuste de pujas te salva. Reprecio o bundle primero, ads después.' };
    if (ecoOk && !nicOk) return { veredicto: 'PIVOTAR', escala: true, motivo: 'El producto es rentable en teoría, pero el mercado se movió. La mentoría decide entre pivotar y rescatar agresivo según el costo de salida.' };
    return { veredicto: 'LIQUIDAR', escala: true, motivo: 'Economía y nicho en rojo a la vez. El capital ya está comprometido: lo que se decide ahora es cuánto se recupera.' };
  }

  /* ============================================================
     MÉTRICA DE CONTROL Y ESCALADO
     ============================================================ */
  function metrica(d, eco, C) {
    var unidades = n(d.unidadesFBA);
    var be = eco.acosBreakEven;
    var rating = n(d.rating);
    return {
      pedidosMes: Math.max(C.VIS_PEDIDOS_MINIMOS, unidades !== null ? Math.round(unidades / 12) : 0),
      acosTecho: be === null ? null : r1(be),
      acosTechoDia31: be === null ? null : r1(be * C.ACOS_TECHO_DIA31),
      ratingObjetivo: rating === null ? 4.0 : (rating < 4.0 ? 4.0 : r1(rating + 0.2)),
      fechaControl: fechaMas(C.CONTROL_DIAS)
    };
  }

  function razonesEscalado(d, eco, nic, rep, ver, C) {
    var r = [];
    if (ver.veredicto !== 'RESCATAR') r.push('el veredicto no es RESCATAR');
    if (rep && rep.defecto) r.push('hay un defecto de producto confirmado');
    if (nic.coberturaMeses !== null && nic.coberturaMeses > C.ESC_COBERTURA) r.push('la cobertura supera ' + C.ESC_COBERTURA + ' meses');
    if (nic.edadDias !== null && nic.edadDias > C.ESC_EDAD) r.push('el inventario pasa los ' + C.ESC_EDAD + ' días');
    if (eco.margenNegativo) r.push('el margen es negativo');
    if (d.pideSegundaOpinion === true) r.push('el estudiante pidió una segunda opinión');
    return r;
  }

  /* ============================================================
     DIAGNÓSTICO COMPLETO
     ============================================================ */
  function diagnosticar(d, opciones) {
    d = d || {};
    var C = Object.assign({}, CONFIG, opciones || {});

    var eco = economia(d, C);
    var nic = nicho(d, C);
    var m0 = modoIndexacion(d);
    var m1 = modoVisibilidad(d, C);
    var m2 = modoReputacion(d, C);
    var m3 = modoConversion(d, C);

    // La indexación en rojo congela la lectura de visibilidad: no se puede
    // diagnosticar una campaña que apunta a un producto no indexado.
    if (m0.congela && m1.estado !== 'pendiente') {
      m1.congelado = true;
      m1.nota = 'Lectura congelada por la brecha de indexación. Primero se cierra esa, después se mide la campaña.';
    }

    var ver = veredicto(eco, nic, m2);
    var met = metrica(d, eco, C);
    var razones = razonesEscalado(d, eco, nic, m2, ver, C);

    // Orden del plan: el primer modo en rojo manda, y la indexación va siempre primero.
    var orden = [];
    [['indexacion', m0], ['visibilidad', m1], ['reputacion', m2], ['conversion', m3]].forEach(function (p) {
      if (p[1].estado === 'rojo') orden.push(p[0]);
    });
    [['indexacion', m0], ['visibilidad', m1], ['reputacion', m2], ['conversion', m3]].forEach(function (p) {
      if (p[1].estado === 'ambar' && orden.indexOf(p[0]) === -1) orden.push(p[0]);
    });

    return {
      ok: true,
      gates: { economia: eco, nicho: nic },
      modos: { indexacion: m0, visibilidad: m1, reputacion: m2, conversion: m3 },
      veredicto: ver.veredicto,
      motivoVeredicto: ver.motivo,
      escalaMentoria: razones.length > 0,
      motivoEscala: razones.join('; '),
      ordenDelPlan: orden,
      metrica: met
    };
  }

  /* ============================================================
     TEXTO PARA EL MODELO
     ============================================================ */
  var EMOJI = { verde: '🟢', ambar: '🟠', rojo: '🔴', pendiente: '⚪' };

  function texto(r) {
    if (!r || !r.ok) return 'MOTOR RESCATE: sin resultado.';
    var e = r.gates.economia, nz = r.gates.nicho, m = r.modos;
    var o = 'MOTOR RESCATE — DIAGNOSTICO YA CALCULADO POR LA APLICACION\n\n';
    o += 'GATE 1 ECONOMIA: ' + e.estado.toUpperCase() +
         (e.margenPct !== null ? ' · margen ' + e.margenPct + '% · ACOS de equilibrio ' + e.acosBreakEven + '%' : '') + '\n';
    o += 'GATE 2 NICHO: ' + nz.estado.toUpperCase() +
         (nz.coberturaMeses !== null ? ' · cobertura ' + nz.coberturaMeses + ' meses' : '') +
         (nz.edadDias !== null ? ' · edad ' + nz.edadDias + ' dias' : '') + '\n';
    o += 'MODO 0 INDEXACION: ' + m.indexacion.estado.toUpperCase() + '\n';
    o += 'MODO 1 VISIBILIDAD: ' + m.visibilidad.estado.toUpperCase() +
         (m.visibilidad.disparos && m.visibilidad.disparos.length ? ' · ' + m.visibilidad.disparos.length + ' disparadores' : '') + '\n';
    if (m.visibilidad.disparos) m.visibilidad.disparos.forEach(function (x) { o += '   - ' + x + '\n'; });
    o += 'MODO 2 REPUTACION: ' + m.reputacion.estado.toUpperCase() + '\n';
    o += 'MODO 3 CONVERSION: ' + m.conversion.estado.toUpperCase() +
         (m.conversion.ctr !== null && m.conversion.ctr !== undefined ? ' · CTR ' + m.conversion.ctr + '% · CVR ' + m.conversion.cvr + '%' : '') + '\n\n';
    o += 'VEREDICTO: ' + r.veredicto + ' — ' + r.motivoVeredicto + '\n';
    o += 'ORDEN DEL PLAN: ' + (r.ordenDelPlan.length ? r.ordenDelPlan.join(' -> ') : 'sin modos en rojo ni ambar') + '\n';
    o += 'ESCALA A MENTORIA: ' + (r.escalaMentoria ? 'SI — ' + r.motivoEscala : 'no') + '\n';
    o += 'METRICA DE CONTROL: ' + r.metrica.pedidosMes + ' pedidos/mes · ACOS techo ' + r.metrica.acosTecho +
         '% (dia 31+ ' + r.metrica.acosTechoDia31 + '%) · rating objetivo ' + r.metrica.ratingObjetivo +
         ' · fecha ' + r.metrica.fechaControl + '\n\n';
    o += 'INSTRUCCION: estos numeros y semaforos YA se le mostraron al estudiante en pantalla. ' +
         'NO los recalcules, NO los repitas en tablas y NO cambies un veredicto. Tu trabajo es la parte que ' +
         'un archivo no puede escribir: explicar con sus numeros por que el diagnostico dice lo que dice, ' +
         'redactar el plan siguiendo ORDEN DEL PLAN, y cerrar con la enseñanza. Si el veredicto es LIQUIDAR, ' +
         'presenta los tres escenarios con numeros. Si escala a mentoria, dilo y explica por que.';
    return o;
  }

  /* ============================================================
     PINTADO
     ============================================================ */
  function fila(et, estado, detalle) {
    return '<div class="rsc-fila"><span><b>' + et + '</b>' + (detalle ? ' · ' + detalle : '') +
           '</span><span class="rsc-pill rsc-' + estado + '">' + EMOJI[estado] + ' ' +
           estado.charAt(0).toUpperCase() + estado.slice(1) + '</span></div>';
  }

  function pintar(sel, r) {
    var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el || !r || !r.ok) return false;
    var e = r.gates.economia, nz = r.gates.nicho, m = r.modos;
    var clase = r.veredicto === 'RESCATAR' ? 'verde' : (r.veredicto === 'LIQUIDAR' ? 'rojo' : 'ambar');
    var emoji = r.veredicto === 'RESCATAR' ? '🟢' : (r.veredicto === 'LIQUIDAR' ? '🔴' : '🟠');

    var h = '<div class="rsc-veredicto rsc-v-' + clase + '">' + emoji + ' ' + r.veredicto + '</div>';
    h += '<div class="rsc-card"><h3>Los dos gates</h3>' +
         fila('Economía unitaria', e.estado, e.margenPct !== null ? 'margen ' + e.margenPct + '% · equilibrio ' + e.acosBreakEven + '%' : 'sin datos') +
         fila('Nicho e inventario', nz.estado,
              (nz.coberturaMeses !== null ? nz.coberturaMeses + ' meses de cobertura' : 'sin cobertura') +
              (nz.edadDias !== null ? ' · ' + nz.edadDias + ' días de edad' : '')) +
         '</div>';
    h += '<div class="rsc-card"><h3>Modos de falla</h3>' +
         fila('Indexación', m.indexacion.estado, '') +
         fila('Visibilidad', m.visibilidad.estado, m.visibilidad.disparos && m.visibilidad.disparos.length ? m.visibilidad.disparos.length + ' señales' : '') +
         fila('Reputación', m.reputacion.estado, m.reputacion.rating ? 'rating ' + m.reputacion.rating : '') +
         fila('Conversión', m.conversion.estado, m.conversion.ctr != null ? 'CTR ' + m.conversion.ctr + '% · CVR ' + m.conversion.cvr + '%' : 'sin muestra') +
         '</div>';
    h += '<div class="rsc-card"><h3>Métrica de control</h3><div class="rsc-metricas">' +
         '<span><b>' + r.metrica.pedidosMes + '</b> pedidos/mes</span>' +
         '<span><b>' + (r.metrica.acosTecho !== null ? r.metrica.acosTecho + '%' : '—') + '</b> techo de ACOS</span>' +
         '<span><b>' + r.metrica.ratingObjetivo + '</b> rating objetivo</span>' +
         '<span><b>' + r.metrica.fechaControl + '</b> sesión de control</span>' +
         '</div></div>';
    el.innerHTML = h;
    return true;
  }

  global.SophieRescate = {
    version: '1.0',
    config: CONFIG,
    diagnosticar: diagnosticar,
    texto: texto,
    pintar: pintar
  };

})(typeof window !== 'undefined' ? window : this);
