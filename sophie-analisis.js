/* ============================================================
   SOPHIE · ANÁLISIS v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-analisis.js

   Puente entre el modelo y la pantalla en los pasos 6, 8 y 9.

   Requiere, en este orden:
     sophie-ui.css · sophie-render.js · sophie-criterios.js · sophie-motor.js

   El modelo YA NO escribe HTML en estos pasos. Emite un marcador:
     <!--SOPHIE:{"fase":9,"datos":{...},"juicios":{...},...}-->

   Este archivo lo detecta, corre el motor y dibuja.
   ============================================================ */

(function (global) {
  'use strict';

  var MARCA = /<!--SOPHIE:([\s\S]*?)-->/;

  /* ---------- detección ---------- */

  // ¿El texto acumulado ya trae el marcador completo?
  function detectar(texto) {
    var m = MARCA.exec(texto || '');
    if (!m) return null;
    try {
      return JSON.parse(m[1].trim());
    } catch (e) {
      return null; // aún llega incompleto
    }
  }

  // Quita el marcador para que nunca se vea en pantalla.
  function limpiar(texto) {
    return String(texto || '').replace(MARCA, '').replace(/<!--[PM]:[^>]*-->/g, '').trim();
  }

  /* ---------- títulos por fase ---------- */

  var TITULOS = {
    1: { scorecard: 'Fase 1 · Validación inicial', metricas: 'Radiografía del nicho' },
    2: { scorecard: 'Fase 2 · Validación avanzada', metricas: 'Números del negocio' },
    9: { scorecard: 'Scorecard · 13 criterios', metricas: 'Resumen del análisis' }
  };

  /* ---------- pintado ---------- */

  // ctrl = el controlador devuelto por Sophie.mount()
  function pintar(ctrl, payload, opts) {
    opts = opts || {};
    var fase = payload.fase || 9;
    var t = TITULOS[fase] || TITULOS[9];

    var r = SophieMotor.evaluar(payload.datos || {}, payload.juicios || {});

    // En fase 1 y 2 solo se muestran los criterios de esa fase.
    var filas = fase === 9 ? r.filas : r.filas.filter(function (f) { return f.fase === fase; });

    ctrl.metricas(SophieMotor.metricas(payload.datos || {}, r), t.metricas);
    ctrl.scorecard(filas, t.scorecard);

    if (fase === 9) {
      var narr = payload.narrativa || {};
      if (!narr.siguiente_paso) {
        narr.siguiente_paso = r.estado === 'go'
          ? { paso: 'Paso 2', titulo: 'Cotiza antes de enamorarte del producto',
              detalle: 'Sophie Proveedores calcula tu costo real puesto en FBA.',
              cta: 'Continuar → Sophie Proveedores', modulo: 'proveedores' }
          : { paso: 'Siguiente', titulo: 'Valida otro candidato',
              detalle: 'Cada producto que descartas es capital que protegiste.',
              cta: '🔁 Validar otro producto', modulo: 'producto', fantasma: true };
      }
      ctrl.veredicto(SophieMotor.aVeredicto(r, narr));

      if (payload.plan && payload.plan.length) pintarPlan(ctrl, payload.plan);

      var exp = SophieMotor.aExpediente(r, payload.datos || {}, payload.expediente || {});
      if (opts.onExpediente) {
        try { opts.onExpediente(exp); } catch (e) { console.warn('Sophie: expediente no guardado', e); }
      }
      return { resultado: r, expediente: exp };
    }

    // En fase 1 y 2 no hay veredicto: solo un resumen de avance.
    var apr = filas.filter(function (f) { return f.estado === 'pass'; }).length;
    ctrl.veredicto({
      veredicto: apr >= filas.length - 1 ? 'info' : 'alerta',
      etiqueta: 'Fase ' + fase + ' completada',
      puntaje: apr, puntaje_max: filas.length,
      criterios: { aprobados: apr, total: filas.length },
      titular: (payload.narrativa && payload.narrativa.titular) || '',
      razon: (payload.narrativa && payload.narrativa.razon) || '',
      siguiente_paso: { paso: 'Continúa', titulo: fase === 1 ? 'Pasas a la Validación Avanzada' : 'Listo para el veredicto',
        detalle: 'Escribe "continuar" para seguir.', cta: 'Seguir con Sophie', fantasma: true }
    });

    return { resultado: r };
  }

  function pintarPlan(ctrl, pasos) {
    var lis = pasos.map(function (p, i) {
      return '<div class="s-capa" data-estado="neutro" style="animation-delay:' + (i * 60) + 'ms">' +
        '<div class="s-capa__n">' + (i + 1) + '</div>' +
        '<div><div class="s-capa__nombre">' + Sophie.esc(typeof p === 'string' ? p : p.titulo) + '</div>' +
        (p.detalle ? '<div class="s-capa__det">' + Sophie.esc(p.detalle) + '</div>' : '') + '</div>' +
        '<span class="s-pill">' + Sophie.esc((typeof p === 'object' && p.plazo) || 'Acción') + '</span>' +
      '</div>';
    }).join('');

    var div = document.createElement('div');
    div.innerHTML = '<section class="s-card"><p class="s-card__eyebrow">Plan de acción</p>' +
                    '<div class="s-arbol">' + lis + '</div></section>';
    var cadena = ctrl.host.querySelector('[data-slot="cadena"]');
    ctrl.host.insertBefore(div.firstChild, cadena);
  }

  /* ---------- consumo del stream ---------- */

  // Envuelve tu bucle de streaming actual. Muestra el esqueleto de inmediato
  // y dibuja en cuanto el marcador llega completo.
  //   var sesion = SophieAnalisis.iniciar('#resultado', { fase: 9 });
  //   ... por cada chunk: sesion.chunk(textoAcumulado);
  //   ... al terminar:    sesion.fin(textoAcumulado);
  function iniciar(sel, opts) {
    opts = opts || {};
    var fase = opts.fase || 9;
    var nCrit = fase === 1 ? 6 : fase === 2 ? 7 : 13;

    var ctrl = Sophie.mount(sel, {
      esqueleto: { metricas: 4, scorecard: nCrit },
      mensaje: fase === 9 ? 'Sophie está construyendo tu veredicto…' : 'Sophie está evaluando los criterios…'
    });

    var pintado = false;

    function intentar(texto) {
      if (pintado) return true;
      var payload = detectar(texto);
      if (!payload) return false;
      payload.fase = payload.fase || fase;
      pintado = true;
      pintar(ctrl, payload, opts);
      return true;
    }

    return {
      ctrl: ctrl,
      chunk: intentar,
      fin: function (texto) {
        if (intentar(texto)) return;
        // El modelo no emitió marcador válido: no dejamos la pantalla colgada.
        ctrl.error(
          'Sophie no pudo estructurar el análisis',
          'Los datos siguen en la conversación. Escribe "repite el análisis" y lo reconstruye.'
        );
        console.warn('Sophie: sin marcador válido. Respuesta cruda:', limpiar(texto).slice(0, 400));
      }
    };
  }

  global.SophieAnalisis = {
    version: '1.0',
    iniciar: iniciar,
    detectar: detectar,
    limpiar: limpiar,
    pintar: pintar
  };

})(window);
