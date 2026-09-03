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

   MÉXICO: tarifas OFICIALES verificadas al 3-sep-2026 (fuente:
   vender.amazon.com.mx/precios). Tres diferencias estructurales contra USA
   que rompen cualquier cálculo heredado:
     1. El precio de lista YA INCLUYE IVA 16% → ingreso neto = precio / 1.16
     2. Las tarifas FBA también se publican CON IVA (en USA no)
     3. Cuatro bandas de precio (<150 | 150-298.99 | 299-498.99 | >=499),
        no las tres de USA, y el peso va en KILOGRAMOS, no en onzas.
   Quedan dos salvedades: el multiplicador NARF es estimado, y en tamaño
   "grande" arriba de 1 kg la cifra es una cota inferior (usa la Calculadora
   de Ingresos de Seller Central). Ver fbaEsAproximado().
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
     ✅ DATOS OFICIALES de Amazon México, verificados al 3-sep-2026.
     Tarifas FBA actualizadas el 4-jun-2026; ajuste para >1 kg con precio
     >MXN 299 desde el 6-jul-2026. Fuente: vender.amazon.com.mx/precios

     TODAS las cifras de México INCLUYEN IVA (a diferencia de USA).
     Y el precio de lista también lo incluye: ingreso neto = precio / 1.16.

     Cuatro bandas de precio (no dos): <150 | 150-298.99 | 299-498.99 | >=499  */

  var CATS_MX = [
    {n:"Todo lo demás", t:"flat", r:0.15, m:8},
    {n:"Hogar y Cocina", t:"flat", r:0.15, m:8},
    {n:"Deportes y Aire libre", t:"flat", r:0.15, m:8},
    {n:"Salud y Cuidado personal", t:"thr", b:[{u:200,r:0.12},{u:1e12,r:0.15}], m:8, fbaEspecial:true},
    {n:"Belleza", t:"thr", b:[{u:200,r:0.12},{u:1e12,r:0.15}], m:8},
    {n:"Productos para bebé", t:"flat", r:0.15, m:8},
    {n:"Alimentación y Comida gourmet", t:"thr", b:[{u:500,r:0.12},{u:1e12,r:0.15}], m:8, fbaEspecial:true},
    {n:"Bebidas alcohólicas", t:"flat", r:0.08, m:8, fbaEspecial:true},
    {n:"Juguetes y Juegos", t:"thr", b:[{u:300,r:0.08},{u:1e12,r:0.15}], m:8},
    {n:"Mascotas", t:"flat", r:0.15, m:8},
    {n:"Patio y Jardín", t:"flat", r:0.15, m:8},
    {n:"Herramientas y Mejoras del hogar", t:"flat", r:0.15, m:8},
    {n:"Herramientas eléctricas", t:"flat", r:0.12, m:8},
    {n:"Herramientas eléctricas de equipo básico", t:"flat", r:0.12, m:8},
    {n:"Oficina y Papelería", t:"flat", r:0.10, m:8},
    {n:"Muebles", t:"flat", r:0.15, m:8},
    {n:"Colchones", t:"flat", r:0.15, m:8},
    {n:"Electrodomésticos principales", t:"flat", r:0.15, m:8},
    {n:"Instrumentos musicales y Producción audiovisual", t:"flat", r:0.15, m:8},
    {n:"Electrónicos", t:"flat", r:0.10, m:8},
    {n:"Accesorios para electrónicos", t:"grad", b:[{u:2000,r:0.15},{u:1e12,r:0.08}], m:8},
    {n:"Computadoras", t:"flat", r:0.10, m:8},
    {n:"Videoconsolas", t:"flat", r:0.08, m:8},
    {n:"Videojuegos y Accesorios para juegos", t:"flat", r:0.15, m:8},
    {n:"Accesorios para dispositivos Amazon", t:"flat", r:0.45, m:8},
    {n:"Multimedia: Libros, DVD, Música, Software y Video", t:"flat", r:0.15, m:8},
    {n:"Automotriz y Motocicletas", t:"flat", r:0.12, m:8},
    {n:"Neumáticos", t:"flat", r:0.10, m:8},
    {n:"Ropa y Accesorios", t:"flat", r:0.15, m:8},
    {n:"Calzado", t:"flat", r:0.15, m:8},
    {n:"Lentes y accesorios", t:"flat", r:0.15, m:8},
    {n:"Mochilas, Bolsos y Equipaje", t:"flat", r:0.15, m:8},
    {n:"Joyería", t:"flat", r:0.15, m:8},
    {n:"Relojes", t:"grad", b:[{u:5000,r:0.16},{u:1e12,r:0.05}], m:8},
    {n:"Industria, Empresas y Ciencia", t:"flat", r:0.14, m:8},
  ];

  /* Tarifas FBA estándar. Bandas: [<150 | 150-298.99 | 299-498.99 | >=499] */
  var FBA_MX_STD = {
    sobre: {
      filas: [{kg:0.10,f:[27.00,33.00,49.00,60.00]},{kg:0.20,f:[27.20,34.00,50.00,60.40]},
              {kg:0.30,f:[27.40,35.00,51.00,60.80]},{kg:0.40,f:[27.60,36.00,52.00,61.20]}],
      exceso:[27.80,37.00,53.00,61.50],   // > 0.40 kg: tarifa plana
    },
    estandar: {
      filas: [{kg:0.10,f:[28.00,33.00,50.00,61.80]},{kg:0.20,f:[28.05,34.00,51.00,63.00]},
              {kg:0.30,f:[28.10,35.00,52.00,64.00]},{kg:0.40,f:[28.15,36.00,53.00,66.00]},
              {kg:0.50,f:[28.20,37.00,54.00,67.00]},{kg:0.60,f:[28.25,37.50,55.00,68.30]},
              {kg:0.70,f:[28.30,38.00,56.00,69.60]},{kg:0.80,f:[28.35,38.50,57.00,71.00]},
              {kg:0.90,f:[28.40,39.00,58.00,72.00]},{kg:1.00,f:[28.45,39.50,59.00,72.70]}],
      base:[28.50,40.00,60.00,72.80], inc:[1.15,1.15,1.75,1.50], incCada:0.25,
    },
    grande: { base:[32.00,38.00,61.00,75.40], aproximado:true },
  };

  /* Tabla especial: Salud y Cuidado personal, Alimentación y Bebidas alcohólicas.
     Mucho más barata bajo MXN 499 — cambia por completo la viabilidad de esas categorías. */
  var FBA_MX_ESP = {
    sobre: {
      filas: [{kg:0.10,f:[4.50,5.50,14.00,60.00]},{kg:0.20,f:[4.60,5.60,14.10,60.40]},
              {kg:0.30,f:[4.70,5.70,14.20,60.80]},{kg:0.40,f:[4.80,5.80,14.30,61.20]}],
      exceso:[4.90,5.90,14.40,61.50],
    },
    estandar: {
      filas: [{kg:0.10,f:[5.00,6.00,14.50,61.80]},{kg:0.20,f:[5.10,6.10,14.60,63.00]},
              {kg:0.30,f:[5.20,6.20,14.70,64.00]},{kg:0.40,f:[5.30,6.30,14.80,66.00]},
              {kg:0.50,f:[5.40,6.40,14.90,67.00]},{kg:0.60,f:[5.50,6.50,15.00,68.30]},
              {kg:0.70,f:[5.60,6.60,15.10,69.60]},{kg:0.80,f:[5.70,6.70,15.20,71.00]},
              {kg:0.90,f:[5.80,6.80,15.30,72.00]},{kg:1.00,f:[5.90,6.90,15.40,72.70]}],
      base:[6.00,7.00,15.50,72.80], inc:[0.15,0.30,0.45,1.50], incCada:0.25,
    },
    grande: { base:[32.00,38.00,61.00,75.40], aproximado:true },
  };

  var TIERS_MX = [
    {v:"sobre",    n:"Sobre (máx. 38 × 27 × 2 cm)"},
    {v:"estandar", n:"Estándar (máx. 45 × 35 × 20 cm)"},
    {v:"grande",   n:"Grande (mayor a 45 × 35 × 20 cm)"},
    {v:"manual",   n:"Ingresar la tarifa a mano"},
  ];

  /* Almacenamiento mensual por dm³ (IVA incluido). Sube de octubre a diciembre. */
  var ALMACEN_MX = {
    normal: { estandar:0.36, grande:0.19 },   // enero–septiembre
    alta:   { estandar:0.53, grande:0.43 },   // octubre–diciembre
  };

  /* Recargo por inventario de 181+ días (IVA incluido). */
  var ALMACEN_LARGO_MX = [
    {dias:210, c:0.30}, {dias:240, c:0.60}, {dias:270, c:0.90}, {dias:300, c:2.56},
    {dias:330, c:2.73}, {dias:365, c:2.82},
    {dias:1e9, c:4.76, porUnidad:2.32},       // 366+: el mayor entre dm³ y unidad
  ];

  /* ⚠️ ÚNICO dato de México aún ESTIMADO: el multiplicador de Remote Fulfillment
     (NARF), la ruta del vendedor de USA que despacha a México sin RFC. El documento
     oficial de tarifas no cubre NARF. Se estimó ~2x la tarifa local a partir de
     ~MXN 122.87 (estándar pequeño NARF) contra ~MXN 52–63 de FBA local.
     Valídalo en Seller Central → Remote Fulfillment antes de darlo por cierto. */
  var NARF_MULT = 2.0;
  var NARF_ESTIMADO = true;

  /* Cuota de suscripción mensual (MXN). */
  var SUSCRIPCION_MX = {
    promoMeses: 12, promoCuota: 0,
    umbralVentas: 26000, cuotaBaja: 75, cuotaAlta: 600,
    unificadaNorteamericaUSD: 39.99,
  };

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
      /* El peso va en KILOGRAMOS y Amazon usa el mayor entre peso unitario y
         peso dimensional (el viejo "peso del embalaje" ya no aplica aparte). */
      unidadPeso:'kg', umbralClave:299, estimado:false,
      vigencia:'Tarifas oficiales al 3-sep-2026 (FBA actualizado 4-jun-2026; >1 kg y >MXN 299 desde 6-jul-2026).',
      cats:CATS_MX, tiers:TIERS_MX,
      almacen:ALMACEN_MX, almacenLargo:ALMACEN_LARGO_MX, suscripcion:SUSCRIPCION_MX,
      /* Cuatro bandas: [<150] | [150–298.99] | [299–498.99] | [>=499] */
      banda: function (p) { return p < 150 ? 0 : (p < 299 ? 1 : (p < 499 ? 2 : 3)); },
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

  /* Tarifa FBA.
     US: (tier, ONZAS, precio).
     MX: (tier, KILOGRAMOS, precio, 'mx', {especial:true, narf:true})
         `especial` = Salud y Cuidado personal, Alimentación o Bebidas alcohólicas
         (tienen tabla logística propia, mucho más barata bajo MXN 499).
         Puedes pasar la categoría en vez del flag: {cat: CATS_MX[i]}. */
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

    /* México: peso en kg, cuatro bandas de precio, tabla normal o especial. */
    if (tier === 'manual') return 0;
    var especial = !!(opts && (opts.especial || (opts.cat && opts.cat.fbaEspecial)));
    var t = (especial ? FBA_MX_ESP : FBA_MX_STD)[tier];
    if (!t) return 0;

    var tarifa;
    if (tier === 'grande') {
      /* Amazon publica incrementos por 0.5 kg con escalas distintas hasta 50, 100
         y +100 kg que no están en la tabla pública. Arriba de 1 kg esto es solo
         una cota inferior: usa la Calculadora de Ingresos de Seller Central. */
      tarifa = t.base[b];
    } else {
      tarifa = null;
      for (i = 0; i < t.filas.length; i++) { if (peso <= t.filas[i].kg) { tarifa = t.filas[i].f[b]; break; } }
      if (tarifa === null) {
        if (t.exceso) {
          tarifa = t.exceso[b];                    // Sobre: tarifa plana arriba de 0.40 kg
        } else {
          var tope = t.filas[t.filas.length - 1].kg;
          tarifa = t.base[b] + Math.ceil((peso - tope) / t.incCada) * t.inc[b];
        }
      }
    }
    if (opts && opts.narf) tarifa *= NARF_MULT;   // Remote Fulfillment desde cuenta de USA
    return tarifa;
  }

  /* ¿La cifra de FBA es solo aproximada? (MX tamaño grande arriba de 1 kg) */
  function fbaEsAproximado(tier, peso, mercado) {
    return mkt(mercado).codigo === 'mx' && tier === 'grande' && peso > 1;
  }

  /* Almacenamiento mensual en MX: dm³ × tarifa del periodo.
     mes: 1–12. De octubre a diciembre la tarifa sube. */
  function almacenamientoMX(dm3, mes, grande) {
    var alta = (mes >= 10 && mes <= 12);
    var tabla = alta ? ALMACEN_MX.alta : ALMACEN_MX.normal;
    return dm3 * (grande ? tabla.grande : tabla.estandar);
  }

  /* Precio de lista mínimo (MXN) para alcanzar un margen objetivo antes de PPC,
     dado el costo aterrizado real. Deriva de:
        margen = [(P − referral(P) − fba(P)) / 1.16 − COGS] / (P / 1.16)
     => (1 − margen)·P − referral(P) − fba(P) >= 1.16 · COGS

     Sustituye al piso plano de MXN 299 con el piso REAL del producto concreto.
     Hallazgo al calcularlo con las tarifas oficiales: para costos típicos
     (MXN 20–100) el piso de rentabilidad cae entre MXN 94 y 279, o sea SIEMPRE
     por debajo de 299. Conclusión: MXN 299 no es un piso de margen sino
     COMERCIAL (envío gratis + Meses Sin Intereses). Hay que distinguirlos:
     el precio final debe ser >= max(este piso, 299 por conversión), salvo en
     las categorías de tarifa especial, donde bajar de 299 sí puede tener sentido. */
  function precioMinimoMX(cogs, cat, tier, kg, margen) {
    var m = (margen == null ? 0.30 : margen), P;
    for (P = 30; P <= 6000; P += 1) {
      var ref = referral(P, cat, 'mx');
      var fba = fbaEstimate(tier, kg, P, 'mx', { cat: cat });
      if ((1 - m) * P - ref - fba >= 1.16 * cogs) return P;
    }
    return null;   // ningún precio razonable alcanza ese margen con ese costo
  }

  /* Desglose por unidad en MX, en términos NETOS de IVA (los únicos que sirven
     para medir margen: el IVA que cobras no es tuyo y el de las tarifas es
     acreditable). Ojo: la comisión se calcula sobre el precio CON IVA, como en
     el ejemplo oficial de Amazon (399 × 15% = 59.85). */
  function desgloseMX(precio, cogs, cat, tier, kg) {
    var ref = referral(precio, cat, 'mx');
    var fba = fbaEstimate(tier, kg, precio, 'mx', { cat: cat });
    var neto = precio / 1.16;
    var utilidad = (precio - ref - fba) / 1.16 - cogs;
    return {
      precio: precio, ingresoNeto: neto,
      referral: ref, fba: fba, cogs: cogs,
      utilidad: utilidad,
      margen: neto ? utilidad / neto : 0,
      roi: cogs ? utilidad / cogs : null,
      cargaTarifas: precio ? (ref + fba) / precio : 0,
      aproximado: fbaEsAproximado(tier, kg, 'mx'),
    };
  }

  /* Cuota mensual de suscripción en MX según ventas del mes anterior. */
  function suscripcionMX(ventasMes, mesesDesdeAlta) {
    var s = SUSCRIPCION_MX;
    if (mesesDesdeAlta != null && mesesDesdeAlta < s.promoMeses) return s.promoCuota;
    return (ventasMes < s.umbralVentas) ? s.cuotaBaja : s.cuotaAlta;
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
    fbaEsAproximado: fbaEsAproximado,
    fbaPeakSurcharge: fbaPeakSurcharge,
    almacenamientoMX: almacenamientoMX,
    suscripcionMX: suscripcionMX,
    precioMinimoMX: precioMinimoMX,
    desgloseMX: desgloseMX,
    ingresoNeto: ingresoNeto,
    esEstimado: esEstimado,
    narfEstimado: NARF_ESTIMADO,
  };
})(typeof window !== 'undefined' ? window : globalThis);
