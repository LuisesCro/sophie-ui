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

    var flete   = inc.reglas.flete   ? n0(c.fleteUnidad, n0(ctx.fleteUnidad, 1.60)) : 0;
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

  global.SophieCotizaciones = {
    version: '1.0',
    umbrales: UMBRALES,
    incoterms: INCOTERM,
    arancelEstimado: ARANCEL_ESTIMADO,
    aterrizar: aterrizar,
    evaluar: evaluar,
    comparar: comparar
  };

})(window);
