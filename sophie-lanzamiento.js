/* ============================================================
   SOPHIE · LANZAMIENTO v1.0  —  Motor del semáforo y el reorden
   Crezcamos Online — ui.crezcamosonline.com/sophie-lanzamiento.js

   Por qué existe: el prompt traía este párrafo —

     "APLICA LOS UMBRALES AL PIE DE LA LETRA. Si un valor cae en
      amarillo, el color ES amarillo aunque el contexto sea positivo.
      Verifica tu aritmética antes de asignar color."

   Eso es una cicatriz, no una instrucción. Está ahí porque el modelo
   pintó verde un amarillo y multiplicó mal un techo de ACoS. Ningún
   prompt arregla la aritmética: la aritmética se saca del prompt.

   El modelo recolecta los seis datos de la semana y los manda en el
   marcador. Esta librería decide los colores y calcula el reorden.
   ============================================================ */

(function (global) {
  'use strict';

  /* ============================================================
     UMBRALES OFICIALES · el único lugar donde se tocan
     ============================================================ */
  var CONFIG = {
    VENTAS_VERDE: 90,        // % de la meta
    VENTAS_AMARILLO: 60,

    CVR_VERDE: 10,           // %
    CVR_AMARILLO: 6,

    // Techo de ACoS como múltiplo del break-even, por fase.
    TECHO_ACOS: { 1: 2, 2: 1.5, 3: 1.2 },
    ACOS_HOLGURA_AMARILLO: 0.20,   // hasta 20% sobre el techo = amarillo

    REVIEWS_AMARILLO: 5,     // hasta 5 bajo la meta = amarillo
    REVIEWS_QUEJAS_ROJO: 2,  // 2+ reseñas de 1-2 estrellas en la semana = rojo

    PAGINA_1: 48,            // posición orgánica que todavía es página 1

    // Reorden
    TRANSITO: { maritimo: 30, aereo: 7, hibrido: 20 },
    BUFFER_DIAS: 14,
    VENTANA_VELOCIDAD: 14
  };

  var FASES = { 1: [1, 2], 2: [3, 4], 3: [5, 8] };

  function n(v, d) { v = parseFloat(v); return isFinite(v) ? v : (d === undefined ? null : d); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r0(v) { return Math.round(v); }

  function faseDeSemana(semana) {
    var s = n(semana, 1);
    if (s <= 2) return 1;
    if (s <= 4) return 2;
    return 3;
  }

  /* ============================================================
     EL SEMÁFORO
     ============================================================ */
  function semaforo(d, ctx, opciones) {
    d = d || {}; ctx = ctx || {};
    var C = Object.assign({}, CONFIG, opciones || {});
    var fase = n(d.fase) || faseDeSemana(d.semana);
    var be = n(ctx.breakEvenACOS);
    var filas = [];

    function fila(clave, etiqueta, color, detalle, motivo) {
      filas.push({ clave: clave, etiqueta: etiqueta, color: color, detalle: detalle, motivo: motivo });
    }

    /* --- VENTAS --- */
    var u = n(d.unidadesVendidas), meta = n(d.metaUnidades);
    if (u !== null && meta !== null && meta > 0) {
      var pct = u / meta * 100;
      var c = pct >= C.VENTAS_VERDE ? 'verde' : (pct >= C.VENTAS_AMARILLO ? 'amarillo' : 'rojo');
      fila('ventas', 'Ventas', c,
        u + ' de ' + meta + ' unidades (' + (pct >= 100 ? '+' : '') + r0(pct - 100) + '%)',
        'La regla: verde desde ' + C.VENTAS_VERDE + '% de la meta, amarillo desde ' + C.VENTAS_AMARILLO + '%.');
    } else {
      fila('ventas', 'Ventas', 'sin_dato', 'Falta el dato', 'Sin unidades vendidas o sin meta no hay con qué comparar.');
    }

    /* --- RANKING --- */
    var pos = n(d.posicion), posAnt = n(d.posicionAnterior);
    if (pos !== null) {
      var enPagina1 = pos <= C.PAGINA_1;
      var mejoro = posAnt !== null && pos < posAnt;
      var empeoro = posAnt !== null && pos > posAnt;
      var cr;
      if (mejoro || enPagina1) cr = 'verde';
      else if (empeoro && d.cayoSemanaAnterior === true) cr = 'rojo';
      else cr = 'amarillo';
      fila('ranking', 'Ranking', cr,
        '#' + pos + ' en tu keyword principal' + (enPagina1 ? ', página 1' : '') +
        (posAnt !== null ? ' (antes #' + posAnt + ')' : ''),
        mejoro ? 'Mejoró respecto a la semana pasada.'
          : enPagina1 ? 'Está en página 1.'
          : cr === 'rojo' ? 'Cayó dos semanas seguidas.' : 'Estable, fuera de página 1.');
    } else {
      fila('ranking', 'Ranking', 'sin_dato', 'Falta el dato', 'Sin posición no se puede evaluar.');
    }

    /* --- CVR --- */
    var ses = n(d.sesiones), cvr = n(d.cvr);
    if (cvr === null && ses !== null && ses > 0 && u !== null) cvr = u / ses * 100;
    if (cvr !== null) {
      var cc = cvr >= C.CVR_VERDE ? 'verde' : (cvr >= C.CVR_AMARILLO ? 'amarillo' : 'rojo');
      fila('cvr', 'CVR', cc,
        r1(cvr) + '%' + (ses ? ' (' + u + '/' + ses + ')' : '') + ' — meta ≥' + C.CVR_VERDE + '%',
        'La regla no admite matices: verde solo desde ' + C.CVR_VERDE + '%, amarillo desde ' + C.CVR_AMARILLO + '%.');
    } else {
      fila('cvr', 'CVR', 'sin_dato', 'Falta el dato', 'Hacen falta sesiones y unidades vendidas.');
    }

    /* --- ACoS --- */
    var acos = n(d.acos);
    var techo = null;
    if (be !== null && be > 0) techo = be * (C.TECHO_ACOS[fase] || 2);
    if (acos !== null && techo !== null) {
      var ac = acos <= techo ? 'verde'
        : (acos <= techo * (1 + C.ACOS_HOLGURA_AMARILLO) ? 'amarillo' : 'rojo');
      fila('acos', 'ACoS', ac,
        r1(acos) + '% — techo Fase ' + fase + ': ' + r1(techo) + '%',
        'Techo = break-even ' + r1(be) + '% × ' + (C.TECHO_ACOS[fase] || 2) +
        '. Amarillo hasta ' + r1(techo * (1 + C.ACOS_HOLGURA_AMARILLO)) + '%.');
    } else {
      fila('acos', 'ACoS', 'sin_dato',
        acos !== null ? r1(acos) + '% — falta el break-even' : 'Falta el dato',
        'Sin break-even ACoS no hay techo contra el cual medir. Sale de la pestaña COGS.');
    }

    /* --- REVIEWS --- */
    var rev = n(d.reviewsTotal), metaRev = n(d.metaReviews), quejas = n(d.reviewsNegativas, 0);
    if (rev !== null) {
      var rc;
      if (quejas >= C.REVIEWS_QUEJAS_ROJO) rc = 'rojo';
      else if (metaRev !== null && rev >= metaRev) rc = 'verde';
      else if (metaRev !== null && (metaRev - rev) <= C.REVIEWS_AMARILLO) rc = 'amarillo';
      else if (metaRev === null) rc = quejas > 0 ? 'amarillo' : 'verde';
      else rc = 'rojo';
      fila('reviews', 'Reseñas', rc,
        rev + (metaRev !== null ? ' de ' + metaRev : '') +
        (quejas > 0 ? ' · ' + quejas + ' de 1-2 estrellas' : ' sin quejas'),
        quejas >= C.REVIEWS_QUEJAS_ROJO
          ? 'Dos o más reseñas de 1-2 estrellas en la semana: la calidad va primero.'
          : 'Verde en meta y sin quejas; amarillo hasta ' + C.REVIEWS_AMARILLO + ' por debajo.');
    } else {
      fila('reviews', 'Reseñas', 'sin_dato', 'Falta el dato', 'Sin total de reseñas no se puede evaluar.');
    }

    /* --- Combinación --- */
    var cuenta = { verde: 0, amarillo: 0, rojo: 0, sin_dato: 0 };
    filas.forEach(function (f) { cuenta[f.color]++; });

    var rojoReviews = filas.some(function (f) { return f.clave === 'reviews' && f.color === 'rojo'; });
    var combinacion, instruccion;
    if (rojoReviews) {
      combinacion = 'calidad';
      instruccion = 'Rojo de reseñas por calidad: CONGELA el escalado. Identificar el defecto, contactar al proveedor y responder las reseñas. La calidad va primero, antes que el ranking y antes que el precio.';
    } else if (cuenta.rojo >= 2) {
      combinacion = 'rescate';
      instruccion = 'Dos o más rojos: entra el protocolo de rescate. Revisar EN ORDEN precio contra el top 10, foto principal y CTR, pujas, y stock. Una hipótesis, un cambio, medir 7 días. No cambies dos cosas a la vez.';
    } else if (cuenta.verde === 5) {
      combinacion = 'celebrar';
      instruccion = 'Cinco verdes: celebrar y poner un micro-objetivo para la semana.' +
        (fase === 3 ? ' En Fase 3 y con dos semanas seguidas en verde total, aplica la escalera de precio: +5% semanal hasta el precio objetivo.' : '');
    } else {
      combinacion = 'normal';
      instruccion = 'Una sola acción sobre la métrica más desviada, con el porqué en una línea.';
    }

    // La métrica más desviada, para que el modelo sepa dónde enfocar.
    var prioridad = { rojo: 0, amarillo: 1, sin_dato: 2, verde: 3 };
    var foco = filas.slice().sort(function (a, b) { return prioridad[a.color] - prioridad[b.color]; })[0];

    return {
      ok: true,
      semana: n(d.semana),
      fase: fase,
      filas: filas,
      cuenta: cuenta,
      combinacion: combinacion,
      instruccion: instruccion,
      foco: foco && foco.color !== 'verde' ? foco.clave : null,
      breakEvenACOS: be,
      techoACOS: techo === null ? null : r1(techo)
    };
  }

  /* ============================================================
     REORDEN
     Punto de reorden = velocidad diaria × (lead time + tránsito + buffer)
     ============================================================ */
  function reorden(d, ctx, opciones) {
    d = d || {}; ctx = ctx || {};
    var C = Object.assign({}, CONFIG, opciones || {});

    var inventario = n(d.inventarioActual);
    var lead = n(ctx.leadTimeDias);
    var tipo = String(ctx.tipoEnvio || 'maritimo').toLowerCase();
    var transito = n(ctx.transitoDias) !== null ? n(ctx.transitoDias) : (C.TRANSITO[tipo] || C.TRANSITO.maritimo);

    // Velocidad: la explícita, o la derivada de las unidades de la semana.
    var velocidad = n(d.velocidadDiaria);
    if (velocidad === null && n(d.unidadesVendidas) !== null) velocidad = n(d.unidadesVendidas) / 7;

    if (inventario === null || velocidad === null || velocidad <= 0 || lead === null) {
      return {
        ok: false,
        falta: [inventario === null ? 'inventario actual' : null,
                (velocidad === null || velocidad <= 0) ? 'velocidad de ventas' : null,
                lead === null ? 'lead time del proveedor' : null].filter(Boolean)
      };
    }

    var diasCobertura = inventario / velocidad;
    var puntoReorden = velocidad * (lead + transito + C.BUFFER_DIAS);
    var diasParaOrdenar = (inventario - puntoReorden) / velocidad;

    var estado;
    if (inventario <= puntoReorden) estado = 'ordenar_ya';
    else if (diasParaOrdenar <= 7) estado = 'proximo';
    else estado = 'holgado';

    return {
      ok: true,
      inventario: r0(inventario),
      velocidadDiaria: r1(velocidad),
      leadTime: lead,
      transito: transito,
      buffer: C.BUFFER_DIAS,
      puntoReorden: r0(puntoReorden),
      diasCobertura: r0(diasCobertura),
      diasParaOrdenar: r0(diasParaOrdenar),
      estado: estado,
      mensaje: estado === 'ordenar_ya'
        ? 'Ya cruzaste el punto de reorden. Ordenar es LA prioridad de esta semana, por encima de todo lo demás.'
        : estado === 'proximo'
          ? 'Te quedan ' + r0(diasParaOrdenar) + ' días antes de cruzar el punto de reorden. Empieza a mover el pedido ahora.'
          : 'Cobertura holgada: ' + r0(diasCobertura) + ' días de inventario, y ' + r0(diasParaOrdenar) + ' días antes de tener que ordenar.'
    };
  }

  /* ============================================================
     PINTADO · usa las clases de la suite, nunca colores fijos
     ============================================================ */
  var ETIQUETA = { verde: '🟢 Verde', amarillo: '🟡 Amarillo', rojo: '🔴 Rojo', sin_dato: '⚪ Sin dato' };

  function pintar(sel, sem, reo) {
    var el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el || !sem || !sem.ok) return false;

    var h = '<div class="s-card"><h3>🚦 Tu semáforo — Semana ' + (sem.semana || '?') +
            ' · Fase ' + sem.fase + '</h3>';
    sem.filas.forEach(function (f, i) {
      h += '<div class="sem-fila' + (i === sem.filas.length - 1 ? ' sem-ultima' : '') + '">' +
           '<span><b>' + f.etiqueta + '</b> · ' + f.detalle + '</span>' +
           '<span class="sem-pill sem-' + f.color + '">' + ETIQUETA[f.color] + '</span></div>';
    });
    h += '</div>';

    if (reo && reo.ok && reo.estado !== 'holgado') {
      h += '<div class="s-card"><h3>📦 Reorden</h3><p>' + reo.mensaje + '</p>' +
           '<p><b>' + reo.velocidadDiaria + '</b> unidades/día · inventario <b>' + reo.inventario +
           '</b> · punto de reorden <b>' + reo.puntoReorden + '</b> unidades ' +
           '(lead time ' + reo.leadTime + ' + tránsito ' + reo.transito + ' + buffer ' + reo.buffer + ' días)</p></div>';
    }
    el.innerHTML = h;
    return true;
  }

  /* ============================================================
     TEXTO PARA EL MODELO
     ============================================================ */
  function texto(sem, reo) {
    if (!sem || !sem.ok) return 'MOTOR LANZAMIENTO: sin resultado.';
    var out = 'MOTOR LANZAMIENTO — SEMAFORO YA CALCULADO POR LA APLICACION\n';
    out += 'Semana ' + (sem.semana || '?') + ' · Fase ' + sem.fase +
           (sem.techoACOS !== null ? ' · techo de ACoS ' + sem.techoACOS + '% (break-even ' + sem.breakEvenACOS + '%)' : '') + '\n';
    sem.filas.forEach(function (f) {
      out += '- ' + f.etiqueta + ': ' + f.color.toUpperCase() + ' · ' + f.detalle + '\n';
    });
    out += 'Conteo: ' + sem.cuenta.verde + ' verde, ' + sem.cuenta.amarillo + ' amarillo, ' +
           sem.cuenta.rojo + ' rojo' + (sem.cuenta.sin_dato ? ', ' + sem.cuenta.sin_dato + ' sin dato' : '') + '\n';
    out += 'Combinacion: ' + sem.combinacion + '. ' + sem.instruccion + '\n';
    if (sem.foco) out += 'Metrica mas desviada: ' + sem.foco + '\n';
    if (reo && reo.ok) {
      out += 'Reorden: ' + reo.estado + ' · ' + reo.velocidadDiaria + ' u/dia · inventario ' + reo.inventario +
             ' · punto de reorden ' + reo.puntoReorden + ' · ' + reo.diasParaOrdenar + ' dias para ordenar\n';
    } else if (reo && reo.falta && reo.falta.length) {
      out += 'Reorden: no se pudo calcular, falta ' + reo.falta.join(' y ') + '\n';
    }
    out += '\nINSTRUCCION: el semaforo y el reorden YA se le mostraron al estudiante en pantalla. ' +
           'NO los repitas, NO los recalcules y NO discutas los colores. Escribe UNICAMENTE la tarjeta ' +
           'de la accion de la semana sobre la metrica mas desviada, y una linea de cierre.';
    return out;
  }

  global.SophieLanzamiento = {
    version: '1.0',
    config: CONFIG,
    fases: FASES,
    faseDeSemana: faseDeSemana,
    semaforo: semaforo,
    reorden: reorden,
    pintar: pintar,
    texto: texto
  };

})(typeof window !== 'undefined' ? window : this);
