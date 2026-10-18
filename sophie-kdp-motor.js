/* =====================================================================
   sophie-kdp-motor.js — motor determinista de Sophie KDP.
   ---------------------------------------------------------------------
   Calcula antes de que el modelo opine, igual que Sophie Ads: la regalía,
   el veredicto del nicho y la auditoría de título y casillas salen de aquí,
   leyendo los números de sophie-kdp-criterios.js. Sophie interpreta el
   resultado; no lo inventa.

   Expone window.SophieKdpMotor:
     · regalia({ precio, costoImpresion })
     · evaluarNicho({ competidores, esfuerzo, riesgos, precio, costoImpresion })
     · auditarCasillas(casillas, { titulo, subtitulo })
     · auditarTitulo({ titulo, subtitulo, tituloPortada })
     · buscarTerminos(texto)

   Requiere cargar antes sophie-kdp-criterios.js.
   ===================================================================== */
(function (global) {
  'use strict';

  var C = global.SophieKdpCriterios;
  if (!C) throw new Error('sophie-kdp-motor.js necesita sophie-kdp-criterios.js cargado antes');

  /* ---------- utilidades ---------- */

  function num(v) {
    if (v === null || v === undefined || v === '') return NaN;
    if (typeof v === 'number') return v;
    var s = String(v).replace(/[$\s]/g, '');
    // "1,234" o "1.234" como miles; "2,50" como decimal
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
    else s = s.replace(',', '.');
    return parseFloat(s);
  }

  function redondear(n) { return Math.round(n * 100) / 100; }

  // Minúsculas y sin acentos, para comparar sin importar cómo se escribió.
  function normalizar(texto) {
    return String(texto || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  function palabras(texto) {
    return normalizar(texto).split(/[^a-z0-9#ñ]+/).filter(Boolean);
  }

  var VACIAS = {};
  C.vacias.forEach(function (w) { VACIAS[w] = true; });

  // Raíz simple para detectar singular y plural (es / en).
  function raiz(w) {
    if (w.length > 4 && /es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function hallazgo(nivel, codigo, mensaje, extra) {
    var h = { nivel: nivel, codigo: codigo, mensaje: mensaje };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  /* ---------- Términos prohibidos o de cuidado ---------- */

  function buscarTerminos(texto) {
    var n = ' ' + normalizar(texto).replace(/[^a-z0-9#ñ]+/g, ' ') + ' ';
    var encontrados = [];
    C.terminos.forEach(function (item) {
      var t = ' ' + normalizar(item.t).replace(/[^a-z0-9#ñ]+/g, ' ').trim() + ' ';
      var conMarca = item.t.indexOf('#') !== -1;
      var hit = conMarca ? normalizar(texto).indexOf(item.t) !== -1 : n.indexOf(t) !== -1;
      if (hit) encontrados.push({ termino: item.t, nivel: item.nivel, motivo: item.motivo });
    });
    return encontrados;
  }

  /* ---------- Regalía paperback ---------- */

  function regalia(entrada) {
    var precio = num(entrada && entrada.precio);
    var costo = num(entrada && entrada.costoImpresion);
    var tasa = C.regalia.tasaPaperbackAmazon;
    if (!(costo >= 0)) {
      return { ok: false, motivo: 'Falta el costo de impresión que muestra KDP al cargar el interior.' };
    }
    var minimo = redondear(costo / tasa);
    var res = { ok: true, tasa: tasa, costoImpresion: costo, precioMinimo: minimo };
    if (precio > 0) {
      var r = redondear(precio * tasa - costo);
      res.precio = precio;
      res.regalia = r;
      res.viable = precio >= minimo;
      res.cumplePiso = r >= C.validacion.rentabilidad.regaliaMin;
      res.precioParaPiso = redondear((costo + C.validacion.rentabilidad.regaliaMin) / tasa);
    }
    return res;
  }

  /* ---------- Validación del nicho ---------- */

  var VEREDICTOS = {
    IR: 'Hay demanda y la competencia es alcanzable.',
    PIVOTAR: 'Hay demanda pero la competencia está fuerte: buscar una subaudiencia o un ángulo.',
    IR_CATALOGO: 'Poca demanda y poca competencia: vale solo si producir el libro es barato.',
    DESCARTAR: 'Poca demanda y competencia fuerte.',
    BLOQUEADO: 'Hay un riesgo que impide publicar (marca, política o cumplimiento).',
    REVISAR_PRECIO: 'El nicho sirve, pero la regalía no llega al mínimo con este precio.',
    FALTAN_DATOS: 'No hay suficientes competidores para dar un veredicto.'
  };

  function evaluarNicho(entrada) {
    var V = C.validacion;
    var e = entrada || {};
    var comps = (e.competidores || []).slice(0, V.topN).map(function (c) {
      return { bsr: num(c.bsr), resenas: num(c.resenas), precio: num(c.precio) };
    }).filter(function (c) { return c.bsr > 0; });

    var base = { provisional: C.provisional, criterios: V, competidores: comps.length };

    var riesgos = (e.riesgos || []).filter(Boolean);
    if (riesgos.length) {
      return Object.assign(base, { veredicto: 'BLOQUEADO', explicacion: VEREDICTOS.BLOQUEADO, motivos: riesgos });
    }
    if (comps.length < V.minimoCompetidores) {
      return Object.assign(base, {
        veredicto: 'FALTAN_DATOS', explicacion: VEREDICTOS.FALTAN_DATOS,
        motivos: ['Se necesitan al menos ' + V.minimoCompetidores + ' competidores con BSR; llegaron ' + comps.length + '.']
      });
    }

    var venden = comps.filter(function (c) { return c.bsr < V.demanda.bsrMax; }).length;
    var alcanzables = comps.filter(function (c) { return c.resenas < V.competencia.resenasMax; }).length;
    var demandaAlta = venden >= V.demanda.minLibros;
    var competenciaBaja = alcanzables >= V.competencia.minLibros;
    var esfuerzo = V.esfuerzos.indexOf(e.esfuerzo) !== -1 ? e.esfuerzo : 'medio';

    var veredicto;
    if (demandaAlta && competenciaBaja) veredicto = 'IR';
    else if (demandaAlta) veredicto = 'PIVOTAR';
    else if (competenciaBaja) veredicto = esfuerzo === 'bajo' ? 'IR_CATALOGO' : 'DESCARTAR';
    else veredicto = 'DESCARTAR';

    var motivos = [
      venden + ' de ' + comps.length + ' competidores con BSR menor a ' + V.demanda.bsrMax + ' (mínimo ' + V.demanda.minLibros + ').',
      alcanzables + ' de ' + comps.length + ' con menos de ' + V.competencia.resenasMax + ' reseñas (mínimo ' + V.competencia.minLibros + ').'
    ];
    if (!demandaAlta && competenciaBaja) motivos.push('Esfuerzo de producción: ' + esfuerzo + '.');

    var precios = comps.map(function (c) { return c.precio; }).filter(function (p) { return p > 0; }).sort(function (a, b) { return a - b; });
    var banda = precios.length ? { min: precios[0], max: precios[precios.length - 1], mediana: precios[Math.floor(precios.length / 2)] } : null;

    var reg = null;
    if (e.costoImpresion !== undefined && e.costoImpresion !== '') {
      reg = regalia({ precio: e.precio || (banda && banda.mediana), costoImpresion: e.costoImpresion });
      if (reg.ok && reg.precio && !reg.cumplePiso && (veredicto === 'IR' || veredicto === 'IR_CATALOGO')) {
        motivos.push('Regalía de US$' + reg.regalia.toFixed(2) + ' contra un mínimo de US$' + V.rentabilidad.regaliaMin.toFixed(2) + '.');
        veredicto = 'REVISAR_PRECIO';
      }
    }

    return Object.assign(base, {
      veredicto: veredicto,
      explicacion: VEREDICTOS[veredicto],
      demandaAlta: demandaAlta,
      competenciaBaja: competenciaBaja,
      esfuerzo: esfuerzo,
      bandaPrecio: banda,
      regalia: reg,
      motivos: motivos
    });
  }

  /* ---------- Auditoría de las 7 casillas ---------- */

  function auditarCasillas(casillas, contexto) {
    var K = C.casillas;
    var ctx = contexto || {};
    var lista = (casillas || []).slice(0, K.total);
    while (lista.length < K.total) lista.push('');
    var hallazgos = [];

    var enTitulo = {};
    palabras((ctx.titulo || '') + ' ' + (ctx.subtitulo || '')).forEach(function (w) {
      if (!VACIAS[w]) enTitulo[raiz(w)] = true;
    });

    var vistas = {};      // raíz → número de casilla donde apareció primero
    var usadas = 0, frasesSolas = 0;

    lista.forEach(function (texto, i) {
      var n = i + 1;
      var bruto = String(texto || '');
      if (!bruto.trim()) {
        hallazgos.push(hallazgo('info', 'vacia', 'Casilla ' + n + ' vacía: es espacio sin usar.', { casilla: n }));
        return;
      }
      usadas++;
      if (bruto.length > K.maxCaracteres) {
        hallazgos.push(hallazgo('error', 'largo', 'Casilla ' + n + ': ' + bruto.length + ' caracteres; el máximo es ' + K.maxCaracteres + '.', { casilla: n }));
      }
      if (/["“”«»]/.test(bruto)) {
        hallazgos.push(hallazgo('error', 'comillas', 'Casilla ' + n + ': las comillas limitan la búsqueda a la frase exacta. Quítalas.', { casilla: n }));
      }
      buscarTerminos(bruto).forEach(function (t) {
        hallazgos.push(hallazgo(t.nivel, 'termino', 'Casilla ' + n + ': "' + t.termino + '" (' + t.motivo + ').', { casilla: n, termino: t.termino }));
      });

      var ws = palabras(bruto);
      if (ws.length <= K.maxPalabrasFraseSola) frasesSolas++;

      var repetidasAqui = {};
      ws.forEach(function (w) {
        if (VACIAS[w]) return;
        var r = raiz(w);
        if (enTitulo[r] && !repetidasAqui['t' + r]) {
          repetidasAqui['t' + r] = true;
          hallazgos.push(hallazgo('alerta', 'en_titulo', 'Casilla ' + n + ': "' + w + '" ya está en el título o subtítulo; ese espacio rinde más con otra palabra.', { casilla: n, palabra: w }));
        }
        if (vistas[r] && vistas[r] !== n && !repetidasAqui['c' + r]) {
          repetidasAqui['c' + r] = true;
          hallazgos.push(hallazgo('alerta', 'repetida', 'Casilla ' + n + ': "' + w + '" ya aparece en la casilla ' + vistas[r] + '. Repetirla no suma.', { casilla: n, palabra: w }));
        }
        if (!vistas[r]) vistas[r] = n;
      });
    });

    if (usadas >= 2 && frasesSolas === 0) {
      hallazgos.push(hallazgo('alerta', 'sin_frase_sola', 'Ninguna casilla lleva una frase objetivo sola. Reserva ' + K.reparto.objetivo[0] + ' o ' + K.reparto.objetivo[1] + ' casillas para tus frases principales, sin palabras alrededor.'));
    }

    return {
      usadas: usadas,
      frasesSolas: frasesSolas,
      errores: hallazgos.filter(function (h) { return h.nivel === 'error'; }).length,
      hallazgos: hallazgos
    };
  }

  /* ---------- Auditoría de título y subtítulo ---------- */

  function auditarTitulo(entrada) {
    var T = C.titulo;
    var e = entrada || {};
    var titulo = String(e.titulo || '').trim();
    var subtitulo = String(e.subtitulo || '').trim();
    var hallazgos = [];

    if (!titulo) {
      return { hallazgos: [hallazgo('error', 'sin_titulo', 'Falta el título.')], errores: 1 };
    }

    if (e.tituloPortada !== undefined && e.tituloPortada !== null && String(e.tituloPortada).trim()) {
      var portada = String(e.tituloPortada).trim().replace(/\s+/g, ' ');
      var kdp = titulo.replace(/\s+/g, ' ');
      if (portada !== kdp) {
        var soloMayus = portada.toLowerCase() === kdp.toLowerCase();
        hallazgos.push(hallazgo(soloMayus ? 'alerta' : 'error', 'portada',
          soloMayus ? 'El título difiere de la portada solo en mayúsculas; KDP pide que coincida.'
                    : 'El título en KDP no coincide con el de la portada. KDP lo rechaza.'));
      }
    }

    var nTitulo = palabras(titulo).length;
    if (nTitulo > T.maxPalabrasTitulo) {
      hallazgos.push(hallazgo('alerta', 'titulo_largo', 'El título tiene ' + nTitulo + ' palabras; funciona mejor con ' + T.maxPalabrasTitulo + ' o menos y el detalle en el subtítulo.'));
    }

    var separadores = (subtitulo.match(/[,|\/;]/g) || []).length;
    if (separadores > T.maxSeparadoresSubtitulo) {
      hallazgos.push(hallazgo('error', 'relleno', 'El subtítulo parece una lista de keywords (' + separadores + ' separadores). Amazon lo trata como relleno.'));
    }

    var conteo = {};
    palabras(titulo + ' ' + subtitulo).forEach(function (w) {
      if (VACIAS[w] || w.length < 3) return;
      var r = raiz(w);
      conteo[r] = (conteo[r] || 0) + 1;
    });
    Object.keys(conteo).forEach(function (r) {
      if (conteo[r] >= 3) hallazgos.push(hallazgo('alerta', 'repeticion', 'Una palabra se repite ' + conteo[r] + ' veces entre título y subtítulo ("' + r + '…").'));
    });

    buscarTerminos(titulo + ' ' + subtitulo).forEach(function (t) {
      hallazgos.push(hallazgo(t.nivel, 'termino', '"' + t.termino + '" en título o subtítulo (' + t.motivo + ').', { termino: t.termino }));
    });

    var largas = (titulo + ' ' + subtitulo).split(/\s+/).filter(function (w) { return w.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').length > 3; });
    var gritadas = largas.filter(function (w) { return w === w.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(w); });
    if (largas.length >= 3 && gritadas.length / largas.length > 0.5) {
      hallazgos.push(hallazgo('alerta', 'mayusculas', 'Más de la mitad de las palabras van en mayúsculas; usa mayúsculas normales de título.'));
    }
    if (/[☀-➿\uD83C-\uDBFF]|[★☆✓✔♥]/.test(titulo + subtitulo)) {
      hallazgos.push(hallazgo('error', 'simbolos', 'El título o subtítulo lleva emojis o símbolos decorativos.'));
    }

    return {
      hallazgos: hallazgos,
      errores: hallazgos.filter(function (h) { return h.nivel === 'error'; }).length
    };
  }

  global.SophieKdpMotor = {
    version: '0.1',
    regalia: regalia,
    evaluarNicho: evaluarNicho,
    auditarCasillas: auditarCasillas,
    auditarTitulo: auditarTitulo,
    buscarTerminos: buscarTerminos,
    veredictos: VEREDICTOS,
    num: num
  };

})(window);
