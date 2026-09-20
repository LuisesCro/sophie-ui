/* ============================================================
   SOPHIE · IMÁGENES v1.0  —  Motor de medición de la galería
   Crezcamos Online — ui.crezcamosonline.com/sophie-imagenes.js

   Por qué existe: por lo mismo que sophie-keywords cuenta los bytes.
   Un modelo de lenguaje no puede mirar un JPEG y decirte si el fondo
   es 255,255,255 exacto, ni qué porcentaje del encuadre llena el
   producto, ni si el original tiene resolución para que Amazon active
   el zoom. Puede opinar. No puede medir.

   Así que se reparte el trabajo: esta librería MIDE en el navegador
   del estudiante —sin subir nada, sin costo, y determinista— y el
   modelo JUZGA lo que la medición no alcanza: si la imagen comunica,
   si rompe el patrón de la categoría, si el texto se entiende.

   Dos calibraciones que salieron de auditar un listado real y que
   NO son obvias:

   1. El blanco se mide POR CUADRANTES. Casi toda foto de producto
      lleva una sombra suave bajo la base. Medir el borde entero de
      golpe convierte esa sombra en un falso "fondo gris" y manda al
      estudiante a rehacer una imagen que estaba bien.

   2. El blanco "puro" real de un JPEG no es 255 exacto. La compresión
      lo ensucia a 240-254 sin que haya ningún fondo gris. Se exige
      255 para felicitar, pero solo se REPRUEBA por debajo de 250.
   ============================================================ */

(function (global) {
  'use strict';

  var CONFIG = {
    BLANCO: 255,          // blanco literal
    BLANCO_EFECTIVO: 250, // el ojo y Amazon lo leen como blanco
    UMBRAL_FONDO: 250,    // por debajo de esto ya es producto
    COBERTURA_MIN: 0.85,  // Amazon: el producto llena ≥85% del encuadre
    LADO_MIN_ZOOM: 1000,  // bajo esto Amazon NO activa el zoom
    LADO_SOP: 2000,       // el mínimo del SOP de Crezcamos
    LADO_MAX: 10000,
    MINIATURA: 500,       // ancho de la prueba móvil
    MUESTRA: 600          // lado al que se reduce para analizar
  };

  /* ---------- Lectura de píxeles ---------- */

  function aLienzo(img, lado) {
    var c = document.createElement('canvas');
    var esc = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.max(1, Math.round(img.naturalWidth * esc));
    c.height = Math.max(1, Math.round(img.naturalHeight * esc));
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, c.width, c.height);
    return { lienzo: c, ctx: x };
  }

  /* ---------- La medición ---------- */

  function medir(img) {
    var W = img.naturalWidth, H = img.naturalHeight;
    var l = aLienzo(img, CONFIG.MUESTRA);
    var aw = l.lienzo.width, ah = l.lienzo.height;
    var d = l.ctx.getImageData(0, 0, aw, ah).data;
    var px = function (x, y) { var i = (y * aw + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };

    // --- Blanco del borde, POR CUADRANTES (ver cabecera) ---
    function franja(pts) {
      var puro = 0, efec = 0;
      for (var i = 0; i < pts.length; i++) {
        var c = px(pts[i][0], pts[i][1]);
        if (c[0] === CONFIG.BLANCO && c[1] === CONFIG.BLANCO && c[2] === CONFIG.BLANCO) puro++;
        if (Math.min(c[0], c[1], c[2]) >= CONFIG.BLANCO_EFECTIVO) efec++;
      }
      return { puro: puro / pts.length, efec: efec / pts.length };
    }
    var sup = [], inf = [], izq = [], der = [], x, y;
    for (x = 0; x < aw; x++) { sup.push([x, 0]); inf.push([x, ah - 1]); }
    for (y = 0; y < ah; y++) { izq.push([0, y]); der.push([aw - 1, y]); }
    var lados = { superior: franja(sup), inferior: franja(inf), izquierdo: franja(izq), derecho: franja(der) };
    var puro = 0, efec = 0, k;
    for (k in lados) { puro += lados[k].puro / 4; efec += lados[k].efec / 4; }

    // --- Caja del producto ---
    var x0 = aw, y0 = ah, x1 = -1, y1 = -1;
    for (y = 0; y < ah; y++) {
      for (x = 0; x < aw; x++) {
        var c = px(x, y);
        if (Math.min(c[0], c[1], c[2]) < CONFIG.UMBRAL_FONDO) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    var vacia = x1 < 0;
    var pw = vacia ? 0 : (x1 - x0 + 1) / aw;
    var ph = vacia ? 0 : (y1 - y0 + 1) / ah;

    return {
      ancho: W, alto: H, cuadrada: W === H,
      bordePuro: puro, bordeEfectivo: efec, lados: lados,
      vacia: vacia,
      coberturaLineal: Math.max(pw, ph),
      coberturaCaja: pw * ph,
      centroX: vacia ? 0.5 : (x0 + x1) / 2 / aw,
      centroY: vacia ? 0.5 : (y0 + y1) / 2 / ah
    };
  }

  /* ---------- El veredicto ---------- */

  function auditar(img, papel) {
    var m = medir(img);
    var fallos = [], avisos = [], bien = [];
    var esPrincipal = papel === 'principal';
    var menor = Math.min(m.ancho, m.alto);

    // I4 · dimensiones y zoom
    if (menor < CONFIG.LADO_MIN_ZOOM) {
      fallos.push('I4 · ' + m.ancho + '×' + m.alto + ' px. Bajo ' + CONFIG.LADO_MIN_ZOOM +
        ' Amazon NO activa el zoom, y sin zoom el comprador no puede inspeccionar el producto.');
    } else if (menor < CONFIG.LADO_SOP) {
      avisos.push('I4 · ' + m.ancho + '×' + m.alto + ' px: el zoom funciona, pero el SOP pide ' +
        CONFIG.LADO_SOP + '×' + CONFIG.LADO_SOP + ' para que se vea nítida al ampliar.');
    } else { bien.push('I4 · ' + m.ancho + '×' + m.alto + ' px, zoom activo.'); }
    if (menor > CONFIG.LADO_MAX) fallos.push('I4 · más de ' + CONFIG.LADO_MAX + ' px: Amazon la rechaza.');
    if (!m.cuadrada) avisos.push('I4 · no es cuadrada (' + m.ancho + '×' + m.alto +
      '). Amazon muestra 1:1; lo que no sea cuadrado se recorta o se rellena.');

    if (esPrincipal) {
      // I1 · fondo blanco
      var malos = [];
      for (var k in m.lados) if (m.lados[k].efec < 0.95) malos.push(k);
      if (malos.length === 1 && malos[0] === 'inferior') {
        avisos.push('I1 · solo el borde inferior baja de blanco: es la sombra del producto. ' +
          'Normal y aceptable, no es motivo de supresión.');
      } else if (malos.length) {
        fallos.push('I1 · el fondo NO es blanco en: ' + malos.join(', ') +
          '. Amazon exige 255,255,255 puro en la principal y puede suprimir la imagen.');
      } else if (m.bordePuro < 0.90) {
        avisos.push('I1 · el fondo se lee blanco, pero solo el ' + pct(m.bordePuro) +
          ' es 255 exacto: es ruido de compresión JPEG. Se limpia exportando con menos compresión o en PNG.');
      } else { bien.push('I1 · fondo blanco puro.'); }

      // I2 · cuánto llena
      if (m.vacia) {
        fallos.push('I2 · no detecto ningún producto: la imagen está vacía o casi.');
      } else if (m.coberturaLineal < CONFIG.COBERTURA_MIN) {
        fallos.push('I2 · el producto llena el ' + pct(m.coberturaLineal) + ' del encuadre, y el mínimo es 85%. ' +
          'Recorta el aire sobrante: en la miniatura de búsqueda se va a ver diminuto frente a la competencia.');
      } else { bien.push('I2 · el producto llena el ' + pct(m.coberturaLineal) + ' del encuadre.'); }

      if (!m.vacia && (Math.abs(m.centroX - 0.5) > 0.06 || Math.abs(m.centroY - 0.5) > 0.06)) {
        avisos.push('I6 · el producto está descentrado. Se nota más en móvil que en escritorio.');
      }
    }

    return {
      papel: papel, medidas: m, fallos: fallos, avisos: avisos, bien: bien,
      veredicto: fallos.length ? 'FALLA' : (avisos.length ? 'REVISAR' : 'PASA')
    };
  }

  function pct(v) { return (v * 100).toFixed(1) + '%'; }

  /* ---------- La prueba de miniatura ----------
     No es decorativa: Amazon muestra la galería a ~500 px en el móvil,
     que es donde ocurre la mayoría de las ventas. Si el texto no se lee
     ahí, no se lee. Hay que MIRARLA, no deducirla. */
  function miniatura(img, lado) {
    var l = aLienzo(img, lado || CONFIG.MINIATURA);
    return l.lienzo.toDataURL('image/jpeg', 0.9);
  }

  /* ---------- Lo que viaja al modelo en el siguiente turno ----------
     Mismo patrón que el listing: la aplicación mide, y el modelo recibe
     la medición ya hecha para juzgar sobre datos, no sobre impresiones. */
  function auditoriaParaModelo(r) {
    var L = ['MEDICIÓN DE LA APLICACIÓN (no la repitas, ya está hecha):',
      'Imagen ' + r.papel + ' · ' + r.medidas.ancho + '×' + r.medidas.alto + ' px · veredicto mecánico ' + r.veredicto];
    if (r.papel === 'principal') {
      L.push('Borde blanco puro ' + pct(r.medidas.bordePuro) + ' · efectivo ' + pct(r.medidas.bordeEfectivo));
      L.push('El producto llena el ' + pct(r.medidas.coberturaLineal) + ' del encuadre (mínimo 85%)');
    }
    r.fallos.forEach(function (f) { L.push('FALLA: ' + f); });
    r.avisos.forEach(function (a) { L.push('AVISO: ' + a); });
    L.push('Ahora MIRA la imagen y juzga lo que la medición no alcanza: si comunica en 3 segundos, ' +
      'si rompe el patrón de la categoría, si el texto se lee en la miniatura, y si cumple el SOP del slot.');
    return L.join('\n');
  }

  /* ---------- Pintado ---------- */
  function pintar(el, r, miniSrc) {
    var color = r.veredicto === 'FALLA' ? '#C0392B' : (r.veredicto === 'REVISAR' ? '#B7791F' : '#12874A');
    var h = '<div style="border:1px solid var(--linea,#DDE2E8);border-radius:12px;padding:14px 16px;margin-top:12px">' +
      '<div style="font-weight:800;color:' + color + ';margin-bottom:8px">' +
      (r.veredicto === 'PASA' ? '✅' : r.veredicto === 'REVISAR' ? '⚠️' : '❌') + ' ' + r.veredicto +
      ' · ' + r.medidas.ancho + '×' + r.medidas.alto + ' px</div>';
    ['fallos', 'avisos', 'bien'].forEach(function (grupo) {
      var ico = grupo === 'fallos' ? '✗' : grupo === 'avisos' ? '·' : '✓';
      r[grupo].forEach(function (t) {
        h += '<div style="font-size:13.5px;line-height:1.5;margin:4px 0"><b>' + ico + '</b> ' + t + '</div>';
      });
    });
    if (miniSrc) {
      h += '<div style="margin-top:12px;font-size:12.5px;color:var(--texto-2,#5B6670)">' +
        'Así se ve en el móvil, a tamaño real. Si no puedes leer el texto aquí, tu comprador tampoco.</div>' +
        '<img src="' + miniSrc + '" width="250" style="margin-top:8px;border:1px solid var(--linea,#DDE2E8);border-radius:8px;display:block">';
    }
    el.innerHTML = h + '</div>';
    return r;
  }

  function disponible() { return typeof document !== 'undefined' && !!document.createElement('canvas').getContext; }

  global.SophieImagenes = {
    version: '1.0',
    config: CONFIG,
    disponible: disponible,
    medir: medir,
    auditar: auditar,
    miniatura: miniatura,
    auditoriaParaModelo: auditoriaParaModelo,
    pintar: pintar
  };

})(typeof window !== 'undefined' ? window : this);
