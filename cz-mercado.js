/* =====================================================================
   cz-mercado.js — En qué MARKETPLACE está trabajando el estudiante.
   ---------------------------------------------------------------------
   Antes de este archivo el país estaba disuelto en prosa dentro de los
   prompts y en tablas numéricas duplicadas: no existía ninguna noción de
   mercado configurable. Este módulo es la fuente única.

   Mercados: 'us' (Amazon USA) y 'mx' (Amazon México).
   Por decisión de producto NO hay módulos separados por país: el mismo
   módulo pregunta el mercado y lo recuerda. Por eso el default es 'us'
   (comportamiento histórico) y sólo cambia cuando alguien lo elige.

   Orden de resolución:
     1. ?mercado=mx en la URL   (permite enlaces directos)
     2. lo último que eligió el estudiante (localStorage)
     3. 'us'

   Expone window.CzMercado.
   ===================================================================== */
(function (global) {
  'use strict';

  var LLAVE = 'cz_mercado';

  var MERCADOS = {
    us: {
      codigo: 'us',
      nombre: 'Amazon USA',
      bandera: '🇺🇸',
      dominio: 'amazon.com',
      sellerCentral: 'sellercentral.amazon.com',
      moneda: 'USD',
      simbolo: '$',
      locale: 'en-US',
      idiomaListing: 'en',
      idiomaListingNombre: 'inglés',
      iva: 0,
      precioIncluyeImpuesto: false,
      jungleMarketplace: 'us',      // parámetro de Jungle Scout
      heliumMarketplace: 'US',      // parámetro de Helium 10
    },
    mx: {
      codigo: 'mx',
      nombre: 'Amazon México',
      bandera: '🇲🇽',
      dominio: 'amazon.com.mx',
      sellerCentral: 'sellercentral.amazon.com.mx',
      moneda: 'MXN',
      simbolo: '$',
      locale: 'es-MX',
      idiomaListing: 'es',
      idiomaListingNombre: 'español mexicano',
      /* El precio de lista en México YA INCLUYE el IVA 16% (la ley obliga a
         exhibir precio con impuestos). Calcular margen sobre el precio de lista
         sobreestima el margen ~13.8 puntos. Usa ingresoNeto(). */
      iva: 0.16,
      precioIncluyeImpuesto: true,
      /* MXN 299: umbral simultáneo de envío gratis sin Prime, MSI sin costo para
         el vendedor y subsidio de comisiones/FBA. No existe equivalente en USA. */
      umbralClave: 299,
      jungleMarketplace: 'mx',
      heliumMarketplace: 'MX',
    },
  };

  var actual = null;
  var oyentes = [];

  function normalizar(c) {
    c = String(c || '').toLowerCase().trim();
    return MERCADOS[c] ? c : null;
  }

  function deUrl() {
    try {
      var m = /[?&]mercado=([a-z]{2})/i.exec(global.location && global.location.search || '');
      return m ? normalizar(m[1]) : null;
    } catch (e) { return null; }
  }

  function guardado() {
    try { return normalizar(global.localStorage.getItem(LLAVE)); } catch (e) { return null; }
  }

  function resolver() {
    if (actual) return actual;
    actual = deUrl() || guardado() || 'us';
    return actual;
  }

  /* Cambia el mercado y lo recuerda. Devuelve true si de verdad cambió. */
  function set(codigo) {
    var c = normalizar(codigo);
    if (!c) return false;
    var previo = resolver();
    actual = c;
    try { global.localStorage.setItem(LLAVE, c); } catch (e) {}
    if (c !== previo) {
      for (var i = 0; i < oyentes.length; i++) {
        try { oyentes[i](c, previo); } catch (e) {}
      }
    }
    return c !== previo;
  }

  function config(codigo) { return MERCADOS[normalizar(codigo) || resolver()]; }
  function es(codigo)     { return resolver() === normalizar(codigo); }

  /* Formatea un monto en la moneda del mercado. */
  function moneda(n, codigo) {
    var f = config(codigo);
    if (n == null || isNaN(n)) return '';
    try {
      return new Intl.NumberFormat(f.locale, {
        style: 'currency', currency: f.moneda, maximumFractionDigits: 2,
      }).format(n);
    } catch (e) {
      return f.simbolo + Number(n).toFixed(2);
    }
  }

  /* Ingreso neto de impuesto. En MX descuenta el IVA incluido en el precio. */
  function ingresoNeto(precio, codigo) {
    var f = config(codigo);
    return f.precioIncluyeImpuesto ? (precio / (1 + f.iva)) : precio;
  }

  function onCambio(cb) { if (typeof cb === 'function') oyentes.push(cb); }

  global.CzMercado = {
    MERCADOS: MERCADOS,
    actual: resolver,
    set: set,
    config: config,
    es: es,
    moneda: moneda,
    ingresoNeto: ingresoNeto,
    onCambio: onCambio,
    LLAVE: LLAVE,
  };
})(typeof window !== 'undefined' ? window : globalThis);
