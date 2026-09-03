/* =====================================================================
   sophie-fees.js — FUENTE ÚNICA de comisiones de Amazon y tarifas FBA.
   ---------------------------------------------------------------------
   Antes de este archivo, las tablas CATS + SS_BANDS + fbaEstimate() estaban
   COPIADAS Y PEGADAS, idénticas, en cuatro archivos:
     · sophie-producto/index.html
     · sophie-producto/producto-v2.html
     · sophie-ads/index.html
     · sophie-lanzamiento/index.html
   Cualquier cambio de tarifa obligaba a editar los cuatro. Ahora se edita
   AQUÍ y cambia para todos a la vez.

   Expone window.SophieFees. Cada función recibe el mercado ('us' | 'mx');
   si se omite, usa 'us' — así el comportamiento previo queda intacto.

   ⚠️ MÉXICO: las tablas de MX están marcadas `estimado:true`. Se armaron por
   triangulación (los dominios de Amazon estaban bloqueados durante la
   investigación). ANTES DE PRODUCCIÓN hay que validarlas contra
   vender.amazon.com.mx/precios y la Calculadora de Ingresos de Seller Central.
   Usa SophieFees.esEstimado('mx') para que la interfaz avise al estudiante.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ================== ESTADOS UNIDOS ================== */
  /* Comisión por referencia (38 categorías Amazon US) */
  var CATS_US = [
    {n:"Todo lo demás", t:"flat", r:0.15, m:0.30},
    {n:"Hogar y cocina", t:"flat", r:0.15, m:0.30},
    {n:"Deportes y aire libre", t:"flat", r:0.15, m:0.30},
    {n:"Belleza, salud y cuidado personal", t:"thr", b:[{u:10,r:0.08},{u:1e12,r:0.15}], m:0.30},
    {n:"Productos para bebé", t:"thr", b:[{u:10,r:0.08},{u:1e12,r:0.15}], m:0.30},
    {n:"Alimentación y bebidas", t:"thr", b:[{u:15,r:0.08},{u:1e12,r:0.15}], m:0},
    {n:"Ropa y accesorios", t:"thr", b:[{u:15,r:0.05},{u:20,r:0.10},{u:1e12,r:0.17}], m:0.30},
    {n:"Juguetes y juegos", t:"flat", r:0.15, m:0.30},
    {n:"Jardín", t:"flat", r:0.15, m:0.30},
    {n:"Bricolaje y herramientas", t:"flat", r:0.15, m:0.30},
    {n:"Oficina y papelería", t:"flat", r:0.15, m:0.30},
    {n:"Productos para mascotas", t:"flat", r:0.15, m:0.30},
    {n:"Mascotas: dietas veterinarias", t:"flat", r:0.22, m:0.30},
    {n:"Mochilas, bolsos y equipaje", t:"flat", r:0.15, m:0.30},
    {n:"Zapatos", t:"flat", r:0.15, m:0.30},
    {n:"Gafas y accesorios", t:"flat", r:0.15, m:0.30},
    {n:"Colchones", t:"flat", r:0.15, m:0.30},
    {n:"Instrumentos musicales y producción AV", t:"flat", r:0.15, m:0.30},
    {n:"Coche y Moto", t:"flat", r:0.12, m:0.30},
    {n:"Herramientas eléctricas de equipo base", t:"flat", r:0.12, m:0.30},
    {n:"Suministros de industria, empresa y ciencia", t:"flat", r:0.12, m:0.30},
    {n:"Neumáticos", t:"flat", r:0.10, m:0.30},
    {n:"Informática", t:"flat", r:0.08, m:0.30},
    {n:"Electrónica", t:"flat", r:0.08, m:0.30},
    {n:"Electrodomésticos de tamaño completo", t:"flat", r:0.08, m:0.30},
    {n:"Consolas de videojuegos", t:"flat", r:0.08, m:0},
    {n:"Videojuegos y accesorios", t:"flat", r:0.15, m:0},
    {n:"Libros, Música, Vídeo, DVD y Software", t:"flat", r:0.15, m:0},
    {n:"Tarjetas regalo", t:"flat", r:0.20, m:0},
    {n:"Servicios gestionados por el vendedor", t:"flat", r:0.20, m:0.30},
    {n:"Accesorios para dispositivos Amazon", t:"flat", r:0.45, m:0.30},
    {n:"Electrodomésticos compactos", t:"grad", b:[{u:300,r:0.15},{u:1e12,r:0.08}], m:0.30},
    {n:"Accesorios de electrónica", t:"grad", b:[{u:100,r:0.15},{u:1e12,r:0.08}], m:0.30},
    {n:"Mobiliario", t:"grad", b:[{u:200,r:0.15},{u:1e12,r:0.10}], m:0.30},
    {n:"Joyería", t:"grad", b:[{u:250,r:0.20},{u:1e12,r:0.05}], m:0.30},
    {n:"Relojes", t:"grad", b:[{u:1500,r:0.16},{u:1e12,r:0.03}], m:0.30},
    {n:"Arte", t:"grad", b:[{u:100,r:0.20},{u:1000,r:0.15},{u:5000,r:0.10},{u:1e12,r:0.05}], m:0},
    {n:"Cortacéspedes y quitanieves", t:"thr", b:[{u:500,r:0.15},{u:1e12,r:0.08}], m:0.30},
  ];

  /* Tarifa FBA (EE. UU., no-peak, vigente 15-ene-2026). Bandas: [<$10, $10-50, >$50] */
  var SS_BANDS_US = [
    {o:2,f:[2.43,3.32,3.58]},{o:4,f:[2.49,3.42,3.68]},{o:6,f:[2.56,3.45,3.71]},{o:8,f:[2.66,3.54,3.80]},
    {o:10,f:[2.77,3.68,3.94]},{o:12,f:[2.82,3.78,4.04]},{o:14,f:[2.92,3.91,4.17]},{o:16,f:[2.95,3.96,4.22]},
  ];
  var LS_BANDS_US = [
    {o:4,f:[2.91,3.73,3.99]},{o:8,f:[3.13,3.95,4.21]},{o:12,f:[3.38,4.20,4.46]},{o:16,f:[3.78,4.60,4.86]},
    {o:20,f:[4.22,5.04,5.30]},{o:24,f:[4.60,5.42,5.68]},{o:28,f:[4.75,5.57,5.83]},{o:32,f:[5.00,5.82,6.08]},
    {o:36,f:[5.10,5.92,6.18]},{o:40,f:[5.28,6.10,6.36]},{o:44,f:[5.44,6.26,6.52]},{o:48,f:[5.85,6.67,6.93]},
  ];
  var LS_OVER3_US = [6.15,6.97,7.23];   // 3+ a 20 lb: base + 0.08 por cada 4 oz arriba de 3 lb (48 oz)
  var SB_BASE_US  = [6.78,7.55,7.55];   // Small Bulky: + 0.38/lb arriba de la 1a lb
  var LB_BASE_US  = [8.58,9.35,9.35];   // Large Bulky: + 0.38/lb arriba de la 1a lb

  var TIERS_US = [
    {v:"small_std",   n:"Estándar pequeño (≤1 lb, ≤16 oz)"},
    {v:"large_std",   n:"Estándar grande (hasta 20 lb)"},
    {v:"small_bulky", n:"Voluminoso pequeño (Small Bulky)"},
    {v:"large_bulky", n:"Voluminoso grande (Large Bulky)"},
    {v:"manual",      n:"Ingresar la tarifa a mano"},
  ];

  /* ================== MÉXICO ==================
     ⚠️ ESTIMADO — pendiente de validar contra Seller Central MX.
     Contexto que sí está verificado y que cambia la aritmética:
       · El precio de lista YA INCLUYE IVA 16% → ingreso neto = precio / 1.16
       · Las tarifas FBA de MX se publican CON IVA incluido (en USA no)
       · MXN 299 es el umbral de envío gratis, MSI sin costo y subsidio de tarifas
       · Reforma del 17-feb-2026: comisiones hasta −50% y FBA −51% bajo MXN 299,
         pero SUBIERON en Salud/Cuidado Personal, Mascotas, Bebé y Alimentación.
     Las tarifas van en PESOS y por GRAMOS (no onzas): la estructura de tamaños
     de Amazon MX no es la de USA, por eso `unidadPeso` cambia por mercado.        */
  var CATS_MX = [
    {n:"Todo lo demás", t:"flat", r:0.15, m:0},
    {n:"Hogar y cocina", t:"flat", r:0.15, m:0},
    {n:"Deportes y aire libre", t:"flat", r:0.15, m:0},
    {n:"Belleza, salud y cuidado personal", t:"flat", r:0.15, m:0, nota:"Subió con la reforma feb-2026"},
    {n:"Productos para bebé", t:"flat", r:0.15, m:0, nota:"Subió con la reforma feb-2026"},
    {n:"Alimentación y bebidas", t:"flat", r:0.15, m:0, nota:"Subió con la reforma feb-2026"},
    {n:"Productos para mascotas", t:"flat", r:0.15, m:0, nota:"Subió con la reforma feb-2026"},
    {n:"Ropa y accesorios", t:"flat", r:0.15, m:0},
    {n:"Zapatos, bolsos y gafas", t:"flat", r:0.15, m:0},
    {n:"Juguetes y juegos", t:"flat", r:0.15, m:0},
    {n:"Bricolaje y herramientas", t:"flat", r:0.15, m:0},
    {n:"Jardín y exteriores", t:"flat", r:0.15, m:0},
    {n:"Oficina y papelería", t:"flat", r:0.15, m:0},
    {n:"Instrumentos musicales", t:"flat", r:0.15, m:0},
    {n:"Coche y Moto", t:"flat", r:0.12, m:0},
    {n:"Electrónica", t:"flat", r:0.08, m:0, nota:"Fuentes en conflicto: 8% vs 10%. VALIDAR."},
    {n:"Informática", t:"flat", r:0.08, m:0},
    {n:"Videojuegos y consolas", t:"flat", r:0.08, m:0},
    {n:"Libros, Música y Video", t:"flat", r:0.15, m:0},
    {n:"Joyería", t:"flat", r:0.20, m:0},
    {n:"Relojes", t:"flat", r:0.16, m:0},
  ];

  /* Bandas de precio MX: [< MXN 299, ≥ MXN 299] — el 299 manda en todo el mercado. */
  var FBA_MX = [
    {g:250,   f:[26, 52]},
    {g:500,   f:[31, 63]},
    {g:1000,  f:[38, 77]},
    {g:2000,  f:[49, 99]},
    {g:5000,  f:[72, 145]},
    {g:10000, f:[104, 210]},
  ];
  var FBA_MX_EXTRA_KG = 12;   // por kg adicional arriba de 10 kg (estimado)
  var NARF_MULT = 2.0;        // Remote Fulfillment desde USA ≈ 2x la tarifa local

  var TIERS_MX = [
    {v:"sobre",    n:"Sobre (≤250 g)",            g:250},
    {v:"paquete_s",n:"Paquete pequeño (≤500 g)",  g:500},
    {v:"paquete_m",n:"Paquete mediano (≤1 kg)",   g:1000},
    {v:"paquete_g",n:"Paquete grande (≤2 kg)",    g:2000},
    {v:"voluminoso",n:"Voluminoso (≤5 kg)",       g:5000},
    {v:"pesado",   n:"Pesado (más de 5 kg)",      g:10000},
    {v:"manual",   n:"Ingresar la tarifa a mano", g:0},
  ];

  /* ================== TABLA DE MERCADOS ================== */
  var FEES = {
    us: {
      codigo:'us', moneda:'USD', simbolo:'$', locale:'en-US',
      iva:0, precioIncluyeImpuesto:false,
      unidadPeso:'oz', umbralClave:null, estimado:false,
      cats:CATS_US, tiers:TIERS_US,
      /* Bandas: [<$10] | [$10–50 inclusive] | [>$50].
         OJO con los bordes: el 10 es exclusivo y el 50 INCLUSIVO. Se declara como
         función por mercado justamente para no perder ese matiz en una regla genérica. */
      banda: function (p) { return p < 10 ? 0 : (p <= 50 ? 1 : 2); },
    },
    mx: {
      codigo:'mx', moneda:'MXN', simbolo:'$', locale:'es-MX',
      iva:0.16, precioIncluyeImpuesto:true,
      unidadPeso:'g', umbralClave:299, estimado:true,
      cats:CATS_MX, tiers:TIERS_MX,
      /* Bandas MX: [< MXN 299] | [≥ MXN 299]. El 299 manda en todo el mercado. */
      banda: function (p) { return p < 299 ? 0 : 1; },
      notaEstimado:'Tarifas de México estimadas por triangulación. Valida en ' +
                   'vender.amazon.com.mx/precios y en la Calculadora de Ingresos de Seller Central.',
    },
  };

  function mkt(m) { return FEES[String(m || 'us').toLowerCase()] || FEES.us; }

  /* ================== CÁLCULOS ================== */

  /* Comisión por referencia. Misma matemática para los dos mercados. */
  function referral(price, cat, mercado) {
    var f = mkt(mercado), fee = 0;
    if (!cat) return 0;
    if (cat.t === 'flat') { fee = price * cat.r; }
    else if (cat.t === 'thr') {
      for (var i = 0; i < cat.b.length; i++) { if (price <= cat.b[i].u) { fee = price * cat.b[i].r; break; } }
    } else if (cat.t === 'grad') {
      var prev = 0;
      for (var j = 0; j < cat.b.length; j++) {
        var x = cat.b[j], portion = Math.min(price, x.u) - prev;
        if (portion > 0) fee += portion * x.r;
        prev = x.u;
        if (price <= x.u) break;
      }
    }
    if (cat.m && fee < cat.m) fee = cat.m;
    return fee;
  }

  /* Índice de banda de precio. Cada mercado declara su propia función porque
     los bordes no se comportan igual (ver comentario en FEES.us.banda). */
  function fbaBand(precio, mercado) {
    return mkt(mercado).banda(precio);
  }

  /* Tarifa FBA estimada.
     US: (tier, oz, precio). MX: (tier, gramos, precio, 'mx', {narf:true}). */
  function fbaEstimate(tier, peso, precio, mercado, opts) {
    var f = mkt(mercado), b = fbaBand(precio, mercado), i;

    if (f.codigo === 'us') {
      if (tier === 'small_std') {
        for (i = 0; i < SS_BANDS_US.length; i++) { if (peso <= SS_BANDS_US[i].o) return SS_BANDS_US[i].f[b]; }
        return SS_BANDS_US[SS_BANDS_US.length - 1].f[b];
      }
      if (tier === 'large_std') {
        for (i = 0; i < LS_BANDS_US.length; i++) { if (peso <= LS_BANDS_US[i].o) return LS_BANDS_US[i].f[b]; }
        return LS_OVER3_US[b] + Math.ceil((peso - 48) / 4) * 0.08;
      }
      if (tier === 'small_bulky' || tier === 'large_bulky') {
        var base = (tier === 'small_bulky' ? SB_BASE_US : LB_BASE_US)[b];
        return base + 0.38 * Math.max(0, Math.ceil(peso / 16) - 1);
      }
      return 0;
    }

    /* México: por gramos, dos bandas (bajo/sobre MXN 299). */
    if (tier === 'manual') return 0;
    var tarifa = null;
    for (i = 0; i < FBA_MX.length; i++) { if (peso <= FBA_MX[i].g) { tarifa = FBA_MX[i].f[b]; break; } }
    if (tarifa === null) {
      var ult = FBA_MX[FBA_MX.length - 1];
      tarifa = ult.f[b] + Math.ceil((peso - ult.g) / 1000) * FBA_MX_EXTRA_KG;
    }
    if (opts && opts.narf) tarifa *= NARF_MULT;   // Remote Fulfillment desde cuenta de USA
    return tarifa;
  }

  /* Recargo de temporada alta. US: 15 oct – 14 ene. MX: almacenamiento sube oct–dic. */
  function fbaPeakSurcharge(tier, peso, mercado) {
    if (mkt(mercado).codigo !== 'us') return 0;   // MX: el recargo va en almacenamiento, no por unidad
    if (tier === 'small_std') return 0.20;
    if (tier === 'large_std') {
      if (peso <= 16) return 0.20;
      if (peso <= 24) return 0.27;
      if (peso <= 32) return 0.33;
      if (peso <= 48) return 0.41;
      return 0.45;
    }
    if (tier === 'small_bulky') return 0.40;
    if (tier === 'large_bulky') return 1.04;
    return 0;
  }

  /* Ingreso neto de impuesto. En MX el precio de lista YA trae el IVA 16%;
     calcular margen sobre el precio de lista sobreestima ~13.8 puntos. */
  function ingresoNeto(precio, mercado) {
    var f = mkt(mercado);
    return f.precioIncluyeImpuesto ? (precio / (1 + f.iva)) : precio;
  }

  function esEstimado(mercado) { return !!mkt(mercado).estimado; }
  function config(mercado)     { return mkt(mercado); }
  function cats(mercado)       { return mkt(mercado).cats; }
  function tiers(mercado)      { return mkt(mercado).tiers; }

  global.SophieFees = {
    FEES: FEES,
    config: config,
    cats: cats,
    tiers: tiers,
    referral: referral,
    fbaBand: fbaBand,
    fbaEstimate: fbaEstimate,
    fbaPeakSurcharge: fbaPeakSurcharge,
    ingresoNeto: ingresoNeto,
    esEstimado: esEstimado,
  };
})(typeof window !== 'undefined' ? window : globalThis);
