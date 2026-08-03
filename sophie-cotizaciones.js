/* ============================================================
   SOPHIE · COTIZACIONES v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-cotizaciones.js

   El motor de Sophie Proveedores.

   El error más caro del sourcing no es pagar de más: es comparar
   mal. Un proveedor a $5.80 FOB puede salir más caro puesto en
   FBA que uno a $7.20 DDP, porque en el primero el flete y el
   arancel van aparte y en el segundo ya están adentro.

   Aquí se normaliza todo a COSTO ATERRIZADO por unidad y de ahí
   sale el margen real. El modelo no calcula: interpreta.

   Los aranceles son estimados y volátiles. El porcentaje exacto
   depende del código HTS del producto y se confirma con el
   proveedor o un agente de carga ANTES del pedido.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- referencias del método ---------- */

  var UMBRALES = {
    costoAterrizadoPct: { objetivo: 30, alerta: 40 },  // % del precio de venta
    moq:                { objetivo: 300, alerta: 500 },
    margenAntesPPC:     { objetivo: 30, alerta: 20 },  // %
    roi:                { objetivo: 100, alerta: 60 }, // %
    reservaPPC:         0.40                            // 40% del capital no se gasta en inventario
  };

  // Estimados de arancel por origen, para modelar cuando el estudiante no
  // conoce su porcentaje. NO son cifras oficiales: el % real depende del
  // código HTS y hay que confirmarlo antes del pedido.
  var ARANCEL_ESTIMADO = {
    'china':   { min: 15, max: 30, nota: 'Alto y volátil. La exención de minimis para envíos chinos fue eliminada: todo paga.' },
    'vietnam': { min: 5,  max: 15, nota: 'Alternativa habitual cuando el arancel chino rompe el número.' },
    'india':   { min: 5,  max: 15, nota: 'Alternativa habitual cuando el arancel chino rompe el número.' },
    'mexico':  { min: 0,  max: 5,  nota: 'Suele ser el más bajo, pero verifica reglas de origen.' },
    'otro':    { min: 5,  max: 20, nota: 'Confirma con tu agente de carga.' }
  };

  // El incoterm decide qué costos ya vienen dentro del precio cotizado.
  var INCOTERM = {
    'DDP': { flete: false, arancel: false, nota: 'El proveedor entrega puesto en destino: flete y arancel ya están dentro del precio.' },
    'DAP': { flete: false, arancel: true,  nota: 'El proveedor lleva hasta destino pero el arancel lo pagas tú.' },
    'CIF': { flete: false, arancel: true,  nota: 'Incluye flete marítimo y seguro; el arancel y el despacho van aparte.' },
    'FOB': { flete: true,  arancel: true,  nota: 'El proveedor entrega en su puerto. Flete y arancel corren por tu cuenta.' },
    'EXW': { flete: true,  arancel: true,  nota: 'Sale de la fábrica. Tú pagas absolutamente todo el traslado.' }
  };

  // Estimados de flete puerta a puerta por kg (China→EE.UU.), MUY volátiles.
  // Se usan SOLO cuando el estudiante no declara su flete. El real lo cotiza un
  // agente de carga y depende de peso, volumen (CBM) y temporada.
  var FLETE = {
    porKg:         { mar: 1.20, aire: 6.50 }, // marítimo LCL vs aéreo, por kg
    minUnidad:     0.30,   // piso por unidad: un producto muy liviano igual paga manejo
    defaultUnidad: 1.60    // último recurso: ni flete ni peso declarados
  };

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (v === null || v === undefined || v === '') return NaN;
    return parseFloat(String(v).replace(/[$,\s]/g, ''));
  }
  function n0(v, d) { var x = num(v); return isNaN(x) ? (d || 0) : x; }
  function r2(x) { return Math.round(x * 100) / 100; }

  function arancelDe(pais) {
    var k = String(pais || 'otro').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (var p in ARANCEL_ESTIMADO) if (k.indexOf(p) > -1) return ARANCEL_ESTIMADO[p];
    return ARANCEL_ESTIMADO.otro;
  }

  function incotermDe(v) {
    var k = String(v || 'FOB').toUpperCase().replace(/[^A-Z]/g, '');
    return INCOTERM[k] ? { clave: k, reglas: INCOTERM[k] } : { clave: 'FOB', reglas: INCOTERM.FOB };
  }

  // 'aire' si el estudiante indica aéreo/air/avión; en cualquier otro caso, marítimo.
  function modoDe(v) {
    var k = String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (k.indexOf('air') > -1 || k.indexOf('aer') > -1 || k.indexOf('avi') > -1) ? 'aire' : 'mar';
  }

  /* ---------- costo aterrizado de una cotización ---------- */

  // c: { proveedor, precioUnidad, moq, incoterm, paisOrigen, leadTimeDias,
  //      arancelPct?, fleteUnidad?, muestraCosto?, personalizacion?, notas? }
  // ctx: { precioVenta, comisionPct, fbaUnidad, arancelPct?, fleteUnidad?,
  //        inboundPlacement, empaque, inspeccion, devolucionesPct, capital }
  function aterrizar(c, ctx) {
    c = c || {}; ctx = ctx || {};
    var inc = incotermDe(c.incoterm);
    var est = arancelDe(c.paisOrigen);

    var producto = n0(c.precioUnidad);
    // Arancel: el declarado por el estudiante manda; si no hay, se modela.
    var arancelPct = !isNaN(num(c.arancelPct)) ? num(c.arancelPct)
                   : !isNaN(num(ctx.arancelPct)) ? num(ctx.arancelPct)
                   : (est.min + est.max) / 2;
    var arancelEstimado = isNaN(num(c.arancelPct)) && isNaN(num(ctx.arancelPct));

    // Flete — prioridad: lo declarado por el estudiante manda; si no, se estima
    // por el peso del producto; y si tampoco hay peso, cae a un default plano.
    // Todo estimado se marca (fleteEstimado) para que el estudiante lo confirme
    // con su agente de carga, que es quien conoce peso, volumen (CBM) y temporada.
    var pesoKg    = !isNaN(num(c.pesoUnidadKg)) ? num(c.pesoUnidadKg)
                  : !isNaN(num(ctx.pesoUnidadKg)) ? num(ctx.pesoUnidadKg) : NaN;
    var modoEnvio = modoDe(c.modoEnvio || ctx.modoEnvio);
    var flete = 0, fleteEstimado = false, fleteBase = 'incluido';
    if (inc.reglas.flete) {
      var fleteDecl = !isNaN(num(c.fleteUnidad)) ? num(c.fleteUnidad)
                    : !isNaN(num(ctx.fleteUnidad)) ? num(ctx.fleteUnidad) : NaN;
      if (!isNaN(fleteDecl)) {
        flete = fleteDecl; fleteBase = 'declarado';
      } else if (!isNaN(pesoKg) && pesoKg > 0) {
        flete = Math.max(FLETE.minUnidad, r2(pesoKg * (FLETE.porKg[modoEnvio] || FLETE.porKg.mar)));
        fleteEstimado = true; fleteBase = 'peso';
      } else {
        flete = FLETE.defaultUnidad; fleteEstimado = true; fleteBase = 'default';
      }
    }
    var arancel = inc.reglas.arancel ? producto * arancelPct / 100 : 0;

    var placement  = n0(ctx.inboundPlacement, 0.35);
    var empaque    = n0(ctx.empaque, 0.55);
    var inspeccion = n0(ctx.inspeccion, 0.30);

    var aterrizado = producto + flete + arancel + placement + empaque + inspeccion;

    var precio = n0(ctx.precioVenta);
    var comision = precio * n0(ctx.comisionPct, 15) / 100;
    var fba = n0(ctx.fbaUnidad);
    var devoluciones = precio * n0(ctx.devolucionesPct, 3) / 100;

    var margen = precio - aterrizado - comision - fba - devoluciones;
    var margenPct = precio > 0 ? margen / precio * 100 : 0;
    var aterrizadoPct = precio > 0 ? aterrizado / precio * 100 : 0;

    // Con la reserva de PPC: el 60% del capital va a inventario.
    var capital = n0(ctx.capital);
    var paraInventario = capital * (1 - UMBRALES.reservaPPC);
    var unidadesPosibles = aterrizado > 0 ? Math.floor(paraInventario / aterrizado) : 0;
    var moq = n0(c.moq);
    var unidadesPedido = moq > 0 ? Math.max(moq, 0) : unidadesPosibles;
    var inversionMOQ = moq * aterrizado;
    var alcanza = moq > 0 ? inversionMOQ <= paraInventario : true;

    var roi = aterrizado > 0 ? (margen / aterrizado) * 100 : 0;

    return {
      proveedor: c.proveedor || 'Sin nombre',
      incoterm: inc.clave,
      incotermNota: inc.reglas.nota,
      paisOrigen: c.paisOrigen || '',
      moq: moq,
      leadTimeDias: n0(c.leadTimeDias),
      personalizacion: c.personalizacion === true,
      muestraCosto: n0(c.muestraCosto),

      desglose: {
        producto: r2(producto),
        flete: r2(flete),
        fleteEstimado: fleteEstimado,
        fleteBase: fleteBase,
        pesoUnidadKg: isNaN(pesoKg) ? null : r2(pesoKg),
        modoEnvio: modoEnvio,
        arancel: r2(arancel),
        arancelPct: r2(arancelPct),
        arancelEstimado: arancelEstimado,
        placement: r2(placement),
        empaque: r2(empaque),
        inspeccion: r2(inspeccion)
      },
      aterrizado: r2(aterrizado),
      aterrizadoPct: r2(aterrizadoPct),

      amazon: { comision: r2(comision), fba: r2(fba), devoluciones: r2(devoluciones) },
      margen: r2(margen),
      margenPct: r2(margenPct),
      breakEvenAcos: r2(margenPct),
      roi: r2(roi),

      capital: {
        paraInventario: r2(paraInventario),
        unidadesPosibles: unidadesPosibles,
        inversionMOQ: r2(inversionMOQ),
        alcanza: alcanza
      },
      referenciaArancel: est
    };
  }

  /* ---------- comparación ---------- */

  function evaluar(a) {
    var f = [];
    if (a.margenPct < UMBRALES.margenAntesPPC.alerta)
      f.push({ e: 'fail', t: 'Margen antes de PPC de ' + a.margenPct + '%. Bajo 20% no hay negocio.' });
    else if (a.margenPct < UMBRALES.margenAntesPPC.objetivo)
      f.push({ e: 'alerta', t: 'Margen de ' + a.margenPct + '%. Viable solo si puedes subir el precio con diferenciación.' });

    if (a.aterrizadoPct > UMBRALES.costoAterrizadoPct.alerta)
      f.push({ e: 'fail', t: 'El costo aterrizado es el ' + a.aterrizadoPct + '% del precio de venta. Sobre 40% no deja espacio para Amazon ni para PPC.' });
    else if (a.aterrizadoPct > UMBRALES.costoAterrizadoPct.objetivo)
      f.push({ e: 'alerta', t: 'Costo aterrizado en ' + a.aterrizadoPct + '% del precio. El estándar es no pasar de 30%.' });

    if (a.moq > UMBRALES.moq.alerta)
      f.push({ e: 'fail', t: 'MOQ de ' + a.moq + ' unidades. Demasiado para un primer pedido.' });
    else if (a.moq > UMBRALES.moq.objetivo)
      f.push({ e: 'alerta', t: 'MOQ de ' + a.moq + ' unidades, por encima de las 300 recomendadas.' });

    if (!a.capital.alcanza)
      f.push({ e: 'fail', t: 'Su MOQ cuesta $' + a.capital.inversionMOQ.toLocaleString() +
        ' aterrizado y solo tienes $' + a.capital.paraInventario.toLocaleString() +
        ' para inventario, dejando la reserva de PPC. Negocia el MOQ o busca otro proveedor.' });

    if (a.roi < UMBRALES.roi.alerta)
      f.push({ e: 'fail', t: 'ROI de ' + a.roi + '%. El estándar profesional es 100%: por cada dólar invertido, dos de vuelta.' });
    else if (a.roi < UMBRALES.roi.objetivo)
      f.push({ e: 'alerta', t: 'ROI de ' + a.roi + '%, por debajo del 100% objetivo.' });

    if (a.desglose.arancelEstimado && a.desglose.arancel > 0)
      f.push({ e: 'alerta', t: 'El arancel del ' + a.desglose.arancelPct + '% es un estimado, no un dato. ' +
        'Confírmalo con el proveedor o un agente de carga antes de pagar: depende del código HTS del producto.' });

    if (a.desglose.fleteEstimado && a.desglose.flete > 0) {
      var comoFlete = a.desglose.fleteBase === 'peso'
        ? 'un estimado por el peso (' + a.desglose.pesoUnidadKg + ' kg × tarifa ' +
          (a.desglose.modoEnvio === 'aire' ? 'aérea' : 'marítima') + ')'
        : 'un valor por defecto, porque no diste flete ni peso del producto';
      f.push({ e: 'alerta', t: 'El flete de $' + a.desglose.flete + '/unidad es ' + comoFlete +
        ', no un dato. El flete real lo cotiza tu agente de carga y depende de peso, volumen (CBM) y temporada. ' +
        'Confírmalo antes de pedir.' });
    }

    if (!a.personalizacion)
      f.push({ e: 'alerta', t: 'No confirmaste que acepte empaque personalizado. Sin marca en la caja, tu diferenciación se queda en el listing.' });

    var criticos = f.filter(function (x) { return x.e === 'fail'; }).length;
    return {
      hallazgos: f,
      criticos: criticos,
      estado: criticos ? 'fail' : f.length ? 'alerta' : 'pass',
      veredicto: criticos ? 'DESCARTAR' : f.length ? 'NEGOCIAR' : 'VIABLE'
    };
  }

  // cotizaciones: array. ctx: contexto compartido.
  function comparar(cotizaciones, ctx) {
    var lista = (cotizaciones || []).map(function (c) {
      var a = aterrizar(c, ctx);
      a.evaluacion = evaluar(a);
      return a;
    });

    var viables = lista.filter(function (a) { return a.evaluacion.estado !== 'fail'; });
    var orden = (viables.length ? viables : lista).slice()
      .sort(function (x, y) { return x.aterrizado - y.aterrizado; });

    var porPrecioLista = lista.slice().sort(function (x, y) {
      return x.desglose.producto - y.desglose.producto;
    });

    var mejorAterrizado = orden[0] || null;
    var masBarato = porPrecioLista[0] || null;

    // El hallazgo que justifica todo este cálculo.
    var trampa = null;
    if (mejorAterrizado && masBarato && mejorAterrizado.proveedor !== masBarato.proveedor) {
      var dif = r2(masBarato.aterrizado - mejorAterrizado.aterrizado);
      trampa = {
        masBarato: masBarato.proveedor,
        precioLista: masBarato.desglose.producto,
        aterrizadoDelBarato: masBarato.aterrizado,
        mejor: mejorAterrizado.proveedor,
        precioMejor: mejorAterrizado.desglose.producto,
        aterrizadoMejor: mejorAterrizado.aterrizado,
        diferenciaUnidad: dif,
        mensaje: masBarato.proveedor + ' cotiza más barato por unidad ($' + masBarato.desglose.producto +
          ' contra $' + mejorAterrizado.desglose.producto + '), pero puesto en la bodega de Amazon sale $' +
          Math.abs(dif) + ' más caro por el incoterm ' + masBarato.incoterm +
          '. El precio de lista no es el costo.'
      };
    }

    return {
      cotizaciones: lista,
      ranking: orden,
      recomendada: mejorAterrizado,
      masBarataDeLista: masBarato,
      trampaDelPrecioLista: trampa,
      viables: viables.length,
      total: lista.length
    };
  }

  /* ============================================================
     MATRIZ DE CANDIDATOS · 100 puntos (paso 5)
     Los umbrales se leen contra el EXPEDIENTE del estudiante:
     su MOQ objetivo y su precio de venta, no promedios genéricos.
     ============================================================ */

  function matriz(candidatos, ctx) {
    ctx = ctx || {};
    var precioVenta = n0(ctx.precioVenta);
    var unidadesObjetivo = n0(ctx.unidadesPrimerPedido, 300);

    var lista = (candidatos || []).map(function (c) {
      var det = [];
      function add(bloque, criterio, pts, max, ok, nota) {
        det.push({ bloque: bloque, criterio: criterio, puntos: pts, max: max,
                   estado: ok === true ? 'pass' : ok === 'alerta' ? 'alerta' : 'fail', nota: nota || '' });
        return pts;
      }

      var esFabricante = /manufact|fabric/i.test(String(c.tipo || ''));
      var ta  = c.tradeAssurance === true;
      var ver = c.verified === true;
      var anios = n0(c.anios);
      var moq = n0(c.moq);
      var precioRef = n0(c.precioReferencia);
      var pctPrecio = precioVenta > 0 ? precioRef / precioVenta * 100 : 999;

      /* NEGOCIO · 30 */
      var neg = 0;
      neg += add('Negocio', 'Fabricante real, no intermediario', esFabricante ? 20 : 5, 20, esFabricante,
        esFabricante ? '' : 'Trading company: sumas un margen intermedio salvo que aporte consolidación');
      var ptMoq = moq <= unidadesObjetivo ? 10 : moq <= unidadesObjetivo * 1.5 ? 5 : 0;
      neg += add('Negocio', 'MOQ dentro de tu primer pedido', ptMoq, 10,
        ptMoq === 10 ? true : ptMoq === 5 ? 'alerta' : false,
        moq + ' unidades contra tus ' + unidadesObjetivo);

      /* SEGURIDAD · 40 */
      var seg = 0;
      seg += add('Seguridad', 'Trade Assurance', ta ? 15 : 0, 15, ta,
        ta ? '' : 'Sin protección de pago no hay trato, no importa el precio');
      seg += add('Seguridad', 'Verified Supplier', ver ? 10 : 0, 10, ver);
      var ptAnios = anios >= 5 ? 15 : anios >= 3 ? 10 : 0;
      seg += add('Seguridad', 'Años en la plataforma', ptAnios, 15,
        ptAnios === 15 ? true : ptAnios === 10 ? 'alerta' : false,
        anios ? anios + ' años' : 'sin dato');

      /* COSTOS · 30 */
      var cost = 0;
      var ptCosto = pctPrecio <= 25 ? 30 : pctPrecio <= 30 ? 20 : pctPrecio <= 35 ? 10 : 0;
      cost += add('Costos', 'Precio de referencia vs tu precio de venta', ptCosto, 30,
        ptCosto >= 20 ? true : ptCosto === 10 ? 'alerta' : false,
        precioRef ? '$' + precioRef + ' = ' + r2(pctPrecio) + '% de $' + precioVenta +
          ' · ojo: es EXW o FOB, el aterrizado sube' : 'sin precio de referencia');

      var total = neg + seg + cost;
      // Sin Trade Assurance no compite, por bueno que sea el resto.
      var descalificado = !ta;

      return {
        proveedor: c.proveedor || 'Sin nombre',
        link: c.link || '',
        tipo: c.tipo || '',
        total: descalificado ? 0 : total,
        totalSinDescalificar: total,
        descalificado: descalificado,
        motivoDescalificacion: descalificado ? 'Sin Trade Assurance' : '',
        bloques: { negocio: neg, seguridad: seg, costos: cost },
        maximos: { negocio: 30, seguridad: 40, costos: 30 },
        detalle: det,
        datos: { esFabricante: esFabricante, tradeAssurance: ta, verified: ver,
                 anios: anios, moq: moq, precioReferencia: precioRef, pctPrecio: r2(pctPrecio) }
      };
    });

    var orden = lista.slice().sort(function (a, b) { return b.total - a.total; });
    var vivos = orden.filter(function (x) { return !x.descalificado; });
    var aviso = null;
    if (!vivos.length) {
      aviso = 'Ninguno tiene Trade Assurance. Sin protección de pago no se avanza: vuelve a la búsqueda con el filtro activado.';
    } else if (vivos[0].total < 60) {
      aviso = 'El mejor candidato saca ' + vivos[0].total + '/100. Tu lista verde necesita mejores perfiles antes de seguir: ninguno llega al piso de 60.';
    }

    return { candidatos: lista, ranking: orden, top3: vivos.slice(0, 3), aviso: aviso };
  }

  /* ============================================================
     SCORE DEL PROVEEDOR · 100 puntos (paso 12)
     ============================================================ */

  function scoreProveedor(p, ctx) {
    p = p || {}; ctx = ctx || {};
    var det = [];
    function add(bloque, criterio, pts, max, ok, nota) {
      det.push({ bloque: bloque, criterio: criterio, puntos: pts, max: max,
                 estado: ok === true ? 'pass' : ok === 'alerta' ? 'alerta' : 'fail', nota: nota || '' });
      return pts;
    }

    /* IDENTIDAD Y SEGURIDAD · 30 */
    var id = 0;
    id += add('Identidad', 'Fabricante verificado, licencia coincide', p.fabricanteVerificado ? 10 : 0, 10, !!p.fabricanteVerificado);
    id += add('Identidad', 'Trade Assurance o canal seguro activo', p.tradeAssurance ? 10 : 0, 10, !!p.tradeAssurance,
      p.tradeAssurance ? '' : 'Sin protección de pago pierdes toda palanca ante un problema');
    id += add('Identidad', 'Verificación nivel 2+ o video tour completado', p.verificacion ? 5 : 0, 5, !!p.verificacion);
    id += add('Identidad', 'Tres años o más de historial', n0(p.anios) >= 3 ? 5 : 0, 5, n0(p.anios) >= 3,
      p.anios ? p.anios + ' años' : '');

    /* NÚMEROS · 40 */
    var num_ = 0;
    var pct = n0(p.costoAterrizadoPct);
    var ptCosto = pct > 0 && pct < 25 ? 15 : pct <= 30 ? 10 : pct <= 35 ? 5 : 0;
    num_ += add('Números', 'Costo aterrizado vs precio de venta', ptCosto, 15,
      ptCosto >= 10 ? true : ptCosto === 5 ? 'alerta' : false,
      pct ? r2(pct) + '% del precio de venta' : 'sin dato');
    var moqOk = n0(p.moq) > 0 && n0(p.moq) <= n0(ctx.unidadesPrimerPedido, 300);
    num_ += add('Números', 'MOQ dentro de tu primer pedido', moqOk ? 10 : 0, 10, moqOk,
      p.moq ? p.moq + ' unidades contra tus ' + n0(ctx.unidadesPrimerPedido, 300) : '');
    var terminos = String(p.terminosPago || '').replace(/\s/g, '');
    var cienAdelantado = /100/.test(terminos) && !/\//.test(terminos);
    var terminosOk = /30\/70|70\/30|50\/50/.test(terminos);
    num_ += add('Números', 'Términos de pago sanos', terminosOk ? 10 : 0, 10, terminosOk,
      cienAdelantado ? '100% por adelantado: pierdes toda palanca de calidad'
                     : terminosOk ? terminos : 'sin acordar');
    num_ += add('Números', 'Muestra acreditada a la orden', p.muestraAcreditada ? 5 : 0, 5, !!p.muestraAcreditada,
      p.muestraAcreditada ? '' : 'Casi todos lo aceptan y casi nadie lo pide');

    /* PROCESO · 30 */
    var pro = 0;
    pro += add('Proceso', 'Muestra de pre-producción aprobada', p.muestraPreProduccion ? 10 : 0, 10, !!p.muestraPreProduccion,
      p.muestraPreProduccion ? '' : 'Se aprueba ANTES de pagar el 30%');
    pro += add('Proceso', 'Muestra o inspección de pre-embarque acordada', p.preEmbarque ? 10 : 0, 10, !!p.preEmbarque,
      p.preEmbarque ? '' : 'Es la palanca que protegiste al negociar 30/70');
    pro += add('Proceso', 'FNSKU y empaque confirmados', p.fnskuEmpaque ? 5 : 0, 5, !!p.fnskuEmpaque);
    pro += add('Proceso', 'Cronograma con festividades consideradas', p.cronograma ? 5 : 0, 5, !!p.cronograma,
      p.cronograma ? '' : 'Año Nuevo Chino y Golden Week cierran fábricas semanas enteras');

    var total = id + num_ + pro;

    var nivel = total >= 85 ? { v: 'APROBADO', e: 'go', t: '✅ PROVEEDOR APROBADO — Ordena con confianza' }
              : total >= 65 ? { v: 'APROBADO CON CONDICIONES', e: 'alerta', t: '⚠️ APROBADO CON CONDICIONES — Resuelve esto antes de pagar el 30%' }
                            : { v: 'BUSCAR OTRO', e: 'nogo', t: '❌ BUSCAR OTRO — Vuelve al finalista #2 de la matriz' };

    // Vetos: se aplican antes de la escala.
    var vetos = [];
    if (!p.tradeAssurance) vetos.push({ id: 'trade-assurance', t: 'Sin Trade Assurance ni canal seguro equivalente.' });
    if (pct > 35) vetos.push({ id: 'costo-aterrizado', t: 'Costo aterrizado sobre el 35% del precio de venta: renegocia o cambia de origen.' });
    if (cienAdelantado) vetos.push({ id: 'pago-adelantado', t: 'Exige el 100% por adelantado en una primera orden.' });

    if (cienAdelantado) {
      nivel = { v: 'BUSCAR OTRO', e: 'nogo', t: '❌ BUSCAR OTRO — Exige el 100% por adelantado' };
    } else if (vetos.length && nivel.v === 'APROBADO') {
      nivel = { v: 'APROBADO CON CONDICIONES', e: 'alerta',
                t: '⚠️ APROBADO CON CONDICIONES — Hay un veto activo que resolver primero' };
    }

    return {
      total: total,
      veredicto: nivel.v, etiqueta: nivel.t, estado: nivel.e,
      vetos: vetos,
      bloques: { identidad: id, numeros: num_, proceso: pro },
      maximos: { identidad: 30, numeros: 40, proceso: 30 },
      detalle: det,
      fallos: det.filter(function (d) { return d.estado !== 'pass'; })
    };
  }

  global.SophieCotizaciones = {
    version: '1.0',
    umbrales: UMBRALES,
    incoterms: INCOTERM,
    arancelEstimado: ARANCEL_ESTIMADO,
    aterrizar: aterrizar,
    evaluar: evaluar,
    comparar: comparar,
    matriz: matriz,
    scoreProveedor: scoreProveedor
  };

})(window);
