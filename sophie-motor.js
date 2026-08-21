/* ============================================================
   SOPHIE · MOTOR DE EVALUACIÓN v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-motor.js

   Requiere: sophie-criterios.js cargado antes.

   Convierte los datos crudos del estudiante en el scorecard,
   el puntaje, los vetos y el veredicto. Sin llamar al modelo.

   El modelo NO calcula. El modelo interpreta.

   USO:
     var r = SophieMotor.evaluar(datos, juicios);
     s.scorecard(r.filas);
     s.veredicto(SophieMotor.aVeredicto(r, narrativa));
   ============================================================ */

(function (global) {
  'use strict';

  var C = global.SophieCriterios;
  if (!C) throw new Error('SophieMotor: falta cargar sophie-criterios.js');

  // Nombres equivalentes del mismo dato. Helium 10 cambió su nomenclatura
  // (Average Revenue → Monthly Revenue, Average Price → Price en Black Box).
  // Al añadir un alias aquí, todos los módulos lo entienden.
  var ALIAS = {
    averageRevenue: ['monthlyRevenue', 'revenue'],
    averagePrice:   ['price', 'precio'],
    averageReviews: ['reviews', 'reseñas'],
    searchVolume:   ['sv', 'volumen']
  };

  /* ---- Lectura de números escritos por personas -------------------------
     El estudiante teclea en español ("24,9") y pega exportaciones de Helium 10
     en inglés ("22,400"). Un parser que borra todas las comas convierte 24,9
     en 249 — un error de 10x en un criterio de VETO.

     Reglas, tomadas de lo que ya funcionaba en la suite:
       · Con AMBOS separadores, manda el ÚLTIMO: "1.234,56" y "1,234.56" → 1234.56
       · Con UNO SOLO, es separador de miles si agrupa de tres en tres y el
         primer grupo no empieza en 0: "22,400" y "1.234" → 22400 y 1234.
         Si no agrupa así, es decimal: "24,9" → 24.9 · "0.325" → 0.325
       · Sufijo k: "1.2k" → 1200

     Devuelve NaN —nunca 0— cuando no hay número: el motor distingue
     "sin dato" de "cero", y confundirlos aprueba criterios que deberían
     quedar en alerta. Esta función está DUPLICADA a propósito en los motores
     que la necesitan (cada módulo carga un subconjunto distinto); el test
     tools/test-numeros.mjs verifica que las copias no diverjan. */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (v === null || v === undefined || v === '') return NaN;

    var bruto = String(v).trim();
    var esK = /k$/i.test(bruto);
    var s = bruto.replace(/[^0-9.,\-]/g, '');
    if (!s) return NaN;

    var signo = s.charAt(0) === '-' ? -1 : 1;
    s = s.replace(/-/g, '');

    // ¿El separador agrupa de tres en tres? "1.234.567" sí; "0.325" no
    // (una agrupación nunca empieza en 0); "24,9" tampoco.
    function esMiles(sep) {
      var partes = s.split(sep);
      if (partes.length < 2) return false;
      if (!/^\d{1,3}$/.test(partes[0]) || partes[0] === '0') return false;
      for (var i = 1; i < partes.length; i++) if (!/^\d{3}$/.test(partes[i])) return false;
      return true;
    }

    var coma = s.indexOf(','), punto = s.indexOf('.');
    if (coma > -1 && punto > -1) {
      // Los dos presentes: el último es el decimal, el otro agrupa.
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (coma > -1) {
      s = esMiles(',') ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (punto > -1) {
      if (esMiles('.')) s = s.replace(/\./g, '');
    }

    var x = parseFloat(s);
    if (!isFinite(x)) return NaN;
    return signo * (esK ? x * 1000 : x);
  }

  function fmt(v, campo) {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'string') return v;
    var s = Number(v).toLocaleString('en-US');
    if (/precio|price|revenue|costo/i.test(campo || '')) return '$' + s;
    if (/pct|porcentaje|margen|roi|concentracion/i.test(campo || '')) return s + '%';
    return s;
  }

  /* ---------- evaluación de un criterio ---------- */

  function evaluarUno(c, datos, juicios) {
    // Criterios de juicio: el estado lo aporta el modelo.
    if (c.direccion === 'juicio') {
      var j = (juicios && (juicios[c.id] || juicios['c' + c.id])) || {};
      if (typeof j === 'string') j = { estado: j };
      return {
        id: c.id, fase: c.fase, veto: c.veto,
        criterio: c.criterio,
        valor: j.valor || j.nota || 'Evaluado',
        umbral: c.umbral,
        estado: j.estado || 'alerta',
        nota: j.nota || '',
        por_que: c.por_que, leccion: c.leccion,
        error_comun: c.error_comun, glosario: c.glosario
      };
    }

    // Helium 10 renombra campos cada cierto tiempo. Aceptamos ambos nombres
    // para no romper expedientes ya guardados con la nomenclatura anterior.
    var bruto = datos ? datos[c.campo] : undefined;
    if (bruto === undefined && datos && ALIAS[c.campo]) {
      for (var a = 0; a < ALIAS[c.campo].length; a++) {
        if (datos[ALIAS[c.campo][a]] !== undefined) { bruto = datos[ALIAS[c.campo][a]]; break; }
      }
    }
    var v = num(bruto);
    var estado, valorTexto;

    if (isNaN(v)) {
      estado = 'alerta';
      valorTexto = 'Sin dato';
    } else {
      valorTexto = fmt(bruto, c.campo);
      if (c.direccion === 'min') {
        estado = v >= c.umbral_num ? 'pass' : (v >= c.alerta_num ? 'alerta' : 'fail');
      } else { // max
        estado = v <= c.umbral_num ? 'pass' : (v <= c.alerta_num ? 'alerta' : 'fail');
      }
    }

    // Condiciones adicionales del prompt que degradan un pass.
    if (estado === 'pass' && c.id === 1 && datos && /baj|descend|caída|caida/i.test(String(datos.tendencia || ''))) {
      estado = 'alerta';
    }
    if (estado === 'pass' && c.id === 4 && datos && Array.isArray(datos.topReviews)) {
      var maxTop = Math.max.apply(null, datos.topReviews.map(num).filter(function (n) { return !isNaN(n); }));
      if (maxTop > 1000) estado = 'fail';
      else if (maxTop > 500) estado = 'alerta';
    }
    if (estado === 'pass' && c.id === 8 && datos && !isNaN(num(datos.roi)) && num(datos.roi) < 100) {
      estado = 'alerta';
    }
    if (estado === 'pass' && c.id === 10 && datos && !isNaN(num(datos.moq)) && num(datos.moq) > 300) {
      estado = 'alerta';
    }

    return {
      id: c.id, fase: c.fase, veto: c.veto,
      criterio: c.criterio,
      valor: valorTexto,
      umbral: c.umbral,
      valor_num: isNaN(v) ? undefined : v,
      umbral_num: c.umbral_num,
      direccion: c.direccion,
      estado: estado,
      por_que: c.por_que, leccion: c.leccion,
      error_comun: c.error_comun, glosario: c.glosario
    };
  }

  /* ---------- evaluación completa ---------- */

  function evaluar(datos, juicios) {
    var filas = C.lista.map(function (c) { return evaluarUno(c, datos, juicios); });

    var aprobados = filas.filter(function (f) { return f.estado === 'pass'; }).length;
    var total = filas.length;

    // Vetos: un ❌ en 1, 7, 8, 10 o 13 limita el veredicto.
    var vetosActivos = filas.filter(function (f) {
      return f.veto && f.estado === 'fail';
    }).map(function (f) { return { id: f.id, criterio: f.criterio }; });

    // Escala por puntaje
    var nivel = C.escala.filter(function (e) { return aprobados >= e.min; })[0];

    // Aplicación del veto: nunca por encima de RIESGO MODERADO.
    var limitado = false;
    if (vetosActivos.length && (nivel.veredicto === 'PRODUCTO ESTRELLA' || nivel.veredicto === 'GO CON AJUSTES')) {
      nivel = C.escala.filter(function (e) { return e.veredicto === 'RIESGO MODERADO'; })[0];
      limitado = true;
    }

    return {
      filas: filas,
      aprobados: aprobados,
      total: total,
      puntaje: Math.round((aprobados / total) * 100),
      vetos: vetosActivos,
      limitadoPorVeto: limitado,
      veredicto: nivel.veredicto,
      etiqueta: nivel.etiqueta,
      estado: nivel.estado,
      fase1: filas.filter(function (f) { return f.fase === 1; }),
      fase2: filas.filter(function (f) { return f.fase === 2; })
    };
  }

  /* ---------- métricas de cabecera ---------- */

  // filas (opcional): si se pasa, el conteo se hace sobre esas filas y no
  // sobre los 13 criterios. Necesario en Fase 1 y Fase 2, que muestran
  // solo una parte — decir "6/13" cuando solo existen 6 confunde al estudiante.
  function metricas(datos, r, filas) {
    var m = [];
    var lista = filas && filas.length ? filas : r.filas;
    var aprobados = lista.filter(function (f) { return f.estado === 'pass'; }).length;
    var total = lista.length;

    function add(label, valor, estado, nota) {
      if (valor === undefined || valor === null || valor === '') return;
      m.push({ label: label, valor: valor, estado: estado, nota: nota });
    }
    add('Criterios aprobados', aprobados + ' / ' + total,
        aprobados >= total - 1 ? 'ok' : aprobados >= Math.ceil(total * 0.6) ? 'alerta' : 'critico');
    if (datos.margenAntesPPC !== undefined)
      add('Margen antes de PPC', fmt(datos.margenAntesPPC, 'margen'),
          num(datos.margenAntesPPC) >= 30 ? 'ok' : num(datos.margenAntesPPC) >= 20 ? 'alerta' : 'critico');
    if (datos.roi !== undefined)
      add('ROI proyectado', fmt(datos.roi, 'roi'),
          num(datos.roi) >= 100 ? 'ok' : 'alerta');
    if (datos.unidadesPosibles !== undefined)
      add('Primer pedido', fmt(datos.unidadesPosibles) + ' u',
          num(datos.unidadesPosibles) >= 150 ? 'ok' : 'alerta', 'con tu capital');
    return m;
  }

  /* ---------- armado del payload de veredicto ---------- */

  // narrativa = lo ÚNICO que aporta el modelo:
  //   { titular, razon, siguiente_paso }
  function aVeredicto(r, narrativa) {
    narrativa = narrativa || {};
    var razon = narrativa.razon || '';

    if (r.limitadoPorVeto && r.vetos.length) {
      var nombres = r.vetos.map(function (v) { return 'criterio ' + v.id + ' · ' + v.criterio; }).join(' y ');
      razon += (razon ? ' ' : '') +
        '**Veto activado en ' + nombres + '.** Ese criterio pesa más que el puntaje total: ' +
        'aunque el resto del análisis salga bien, un fallo aquí es de los que quiebran negocios. ' +
        'El veredicto queda limitado hasta resolverlo.';
    }

    return {
      veredicto: r.estado,
      etiqueta: r.etiqueta,
      puntaje: r.aprobados,
      puntaje_max: r.total,
      criterios: { aprobados: r.aprobados, total: r.total },
      titular: narrativa.titular || '',
      razon: razon,
      siguiente_paso: narrativa.siguiente_paso,
      bloqueados: r.estado === 'go' ? [] : [
        { titulo: 'Sophie Proveedores', motivo: 'Se habilita cuando un producto obtiene veredicto GO.', tag: 'Bloqueado sin GO' },
        { titulo: 'Sophie Listing',     motivo: 'No se construye un listing sobre un nicho no validado.', tag: 'Bloqueado sin GO' }
      ]
    };
  }

  /* ---------- expediente (compatible con tu marcador v2) ---------- */

  function aExpediente(r, datos, extra) {
    extra = extra || {};
    return {
      keyword: extra.keyword || '',
      producto: extra.producto || '',
      veredicto: r.veredicto,
      score: r.aprobados + '/' + r.total,
      margenAntesPPC: datos.margenAntesPPC != null ? datos.margenAntesPPC + '%' : '',
      roi: datos.roi != null ? datos.roi + '%' : '',
      breakEvenAcos: extra.breakEvenAcos || '',
      precio: datos.averagePrice != null ? '$' + datos.averagePrice : '',
      capital: extra.capital || '',
      unidadesPrimerPedido: datos.unidadesPosibles != null ? String(datos.unidadesPosibles) : '',
      diferenciacion: extra.diferenciacion || '',
      riesgos: r.filas.filter(function (f) { return f.estado === 'fail'; })
                      .map(function (f) { return f.criterio; }).join('; '),
      vetosActivos: r.vetos.map(function (v) { return v.id; }),
      origenSourcing: extra.origenSourcing || '',
      asinsCompetidores: extra.asinsCompetidores || [],
      caracteristicas: extra.caracteristicas || '',
      clienteTarget: extra.clienteTarget || '',
      insightsReviews: extra.insightsReviews || [],
      categoriaSugerida: extra.categoriaSugerida || '',
      // El ÁNGULO de intención elegido en la Capa 2 (Producto). Es el hilo que
      // viaja a Listing/Ads/Lanzamiento: allí se audita la cobertura contra él.
      // Ver SophieIntencion.anguloExpediente().
      clustersElegidos: Array.isArray(extra.clustersElegidos) ? extra.clustersElegidos : [],
      anguloRecomendacion: extra.anguloRecomendacion || extra.recomendacion || '',
      doloresC17: Array.isArray(extra.doloresC17) ? extra.doloresC17 : [],
      // Esto es lo que se acumula y nadie te puede copiar.
      scorecard: r.filas.map(function (f) {
        return { id: f.id, estado: f.estado, valor: f.valor };
      }),
      fecha: new Date().toISOString().slice(0, 10)
    };
  }

  global.SophieMotor = {
    version: '1.0',
    evaluar: evaluar,
    metricas: metricas,
    aVeredicto: aVeredicto,
    aExpediente: aExpediente,
    num: num
  };

})(window);
