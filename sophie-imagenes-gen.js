/* ============================================================
   SOPHIE · IMÁGENES · GENERADOR v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-imagenes-gen.js

   Compone en el navegador del estudiante las CUATRO imágenes de la
   galería que son gráficas —Index, medidas, comparativa y detalles—
   a 2000x2000 y listas para subir a Seller Central.

   Por qué en el navegador: un lienzo ES un renderizador. No hace falta
   Chromium en el servidor, no cuesta nada por alumno y escala a los que
   sean. Las otras tres del SOP (principal y las dos lifestyle) son
   fotografía y no se generan: para esas Sophie entrega el brief.

   Reglas que el generador impone por construcción, no por buena fe:
     · 2000x2000, zona segura de 130 px
     · NADA por debajo de 64 px — a 500 px de miniatura son 16 px reales,
       y por debajo de eso el comprador no lee
     · un solo color de acento
     · el título siempre arriba y a la misma altura, que es lo que hace
       que las cuatro se lean como una galería y no como cuatro sueltas
   ============================================================ */

(function (global) {
  'use strict';

  var L = 2000, M = 130, RADIO = 28;

  var TEMA = {
    tinta:  '#14171A',
    suave:  '#5B6670',
    marca:  '#1A6BFF',
    ok:     '#12874A',
    no:     '#C0392B',
    fondo:  '#FFFFFF',
    panel:  '#F2F4F7',
    realce: '#EEF3FF',
    linea:  '#DDE2E8'
  };

  var TIPO = {
    titulo: 104,
    grande:  78,
    medio:   68,
    cuerpo:  62,
    minimo:  64   // piso duro para cualquier texto que deba leerse en móvil
  };

  function fuente(peso, px) { return peso + ' ' + px + 'px Helvetica, Arial, sans-serif'; }

  /* ---------- Lienzo ---------- */
  function crear(tema) {
    var c = document.createElement('canvas');
    c.width = c.height = L;
    var x = c.getContext('2d');
    var t = Object.assign({}, TEMA, tema || {});
    x.fillStyle = t.fondo; x.fillRect(0, 0, L, L);
    x.textBaseline = 'top'; x.textAlign = 'left';
    return { c: c, x: x, t: t };
  }

  /* ---------- Texto con corte por ancho ---------- */
  function partir(x, texto, max) {
    var lineas = [], linea = '';
    String(texto).split(/\s+/).forEach(function (p) {
      var prueba = linea ? linea + ' ' + p : p;
      if (x.measureText(prueba).width > max && linea) { lineas.push(linea); linea = p; }
      else linea = prueba;
    });
    if (linea) lineas.push(linea);
    return lineas;
  }

  /* ---------- Título: siempre arriba, siempre igual ---------- */
  function titulo(g, texto, realce) {
    var x = g.x;
    x.font = fuente(800, TIPO.titulo);
    var lineas = partir(x, texto, L - M * 2);
    lineas.forEach(function (ln, i) {
      x.fillStyle = (realce && ln.indexOf(realce) >= 0) ? g.t.marca : g.t.tinta;
      x.fillText(ln, M, M + i * (TIPO.titulo + 14));
    });
    return M + lineas.length * (TIPO.titulo + 14) + 46;
  }

  function caja(g, x0, y0, w, h, color) {
    var x = g.x;
    x.fillStyle = color || g.t.panel;
    x.beginPath();
    if (x.roundRect) x.roundRect(x0, y0, w, h, RADIO);
    else x.rect(x0, y0, w, h);
    x.fill();
  }

  /* ---------- Íconos vectoriales ----------
     Dibujados, no emoji: el emoji depende de la fuente del sistema y
     sale distinto —o no sale— en cada máquina. */
  var ICONO = {
    check: function (g, cx, cy, r) {
      var x = g.x; x.strokeStyle = g.t.ok; x.lineWidth = r * 0.3;
      x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath();
      x.moveTo(cx - r * 0.5, cy); x.lineTo(cx - r * 0.12, cy + r * 0.45);
      x.lineTo(cx + r * 0.55, cy - r * 0.45); x.stroke();
    },
    equis: function (g, cx, cy, r) {
      var x = g.x; x.strokeStyle = g.t.no; x.lineWidth = r * 0.3; x.lineCap = 'round';
      x.beginPath();
      x.moveTo(cx - r * 0.42, cy - r * 0.42); x.lineTo(cx + r * 0.42, cy + r * 0.42);
      x.moveTo(cx + r * 0.42, cy - r * 0.42); x.lineTo(cx - r * 0.42, cy + r * 0.42);
      x.stroke();
    },
    bandera: function (g, cx, cy, r) {
      var x = g.x, w = r * 2.1, h = r * 1.35, x0 = cx - w / 2, y0 = cy - h / 2, i;
      for (i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#FFFFFF' : '#C0392B'; x.fillRect(x0, y0 + i * (h / 7), w, h / 7); }
      x.fillStyle = '#1F3A93'; x.fillRect(x0, y0, w * 0.42, h * 0.55);
      x.strokeStyle = g.t.linea; x.lineWidth = 3; x.strokeRect(x0, y0, w, h);
    },
    escudo: function (g, cx, cy, r) {
      var x = g.x; x.fillStyle = g.t.ok; x.beginPath();
      x.moveTo(cx, cy - r); x.lineTo(cx + r * 0.8, cy - r * 0.55); x.lineTo(cx + r * 0.8, cy + r * 0.15);
      x.quadraticCurveTo(cx + r * 0.8, cy + r * 0.85, cx, cy + r);
      x.quadraticCurveTo(cx - r * 0.8, cy + r * 0.85, cx - r * 0.8, cy + r * 0.15);
      x.lineTo(cx - r * 0.8, cy - r * 0.55); x.closePath(); x.fill();
      x.strokeStyle = '#FFFFFF'; x.lineWidth = r * 0.22; x.lineCap = 'round'; x.beginPath();
      x.moveTo(cx - r * 0.34, cy); x.lineTo(cx - r * 0.06, cy + r * 0.3);
      x.lineTo(cx + r * 0.4, cy - r * 0.32); x.stroke();
    }
  };

  /* ---------- Foto del producto, sin deformar ---------- */
  function foto(g, img, x0, y0, w, h) {
    if (!img) { caja(g, x0, y0, w, h); return; }
    var e = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    var iw = img.naturalWidth * e, ih = img.naturalHeight * e;
    g.x.drawImage(img, x0 + (w - iw) / 2, y0 + (h - ih) / 2, iw, ih);
  }

  /* ============================================================
     SLOT 2 · AMAZON INDEX IMAGE — "Top 5 Reasons Why"
     Estructura FIJA del SOP de Crezcamos. Razones 1-3 son los
     detonantes de compra; la 4 y la 5 no se negocian.
     ============================================================ */
  function index(d, tema) {
    var g = crear(tema), x = g.x;
    var y = titulo(g, 'Top 5 Reasons Why Our ' + d.producto + ' Is The Best', d.producto);

    var filas = (d.razones || []).slice(0, 3).map(function (t) { return { t: t, ico: 'check', fuerte: true }; });
    filas.push({ t: 'Proudly Sold by a US-Based Local Business', ico: 'bandera' });
    filas.push({ t: (d.marca || 'Our') + ' Risk-Free Guarantee — ' + (d.garantia || '30-Day Returns'), ico: 'escudo' });

    var HUECO = 22, alto = (L - M - y - HUECO * (filas.length - 1)) / filas.length;

    filas.forEach(function (f, i) {
      var cy = y + alto / 2;
      caja(g, M, y, L - M * 2, alto, f.fuerte ? g.t.realce : g.t.panel);

      x.fillStyle = g.t.marca;
      x.beginPath(); x.arc(M + 100, cy, 62, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#FFFFFF'; x.font = fuente(800, 68);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(i + 1), M + 100, cy + 3);

      x.textAlign = 'left'; x.fillStyle = g.t.tinta;
      x.font = fuente(f.fuerte ? 800 : 700, f.fuerte ? TIPO.grande : TIPO.minimo);
      var lineas = partir(x, f.t, L - M * 2 - 340);
      var paso = (f.fuerte ? TIPO.grande : TIPO.minimo) + 12;
      var y0 = cy - (lineas.length - 1) * paso / 2;
      lineas.forEach(function (ln, k) { x.fillText(ln, M + 210, y0 + k * paso); });

      ICONO[f.ico](g, L - M - 90, cy, 52);
      x.textBaseline = 'top';
      y += alto + HUECO;
    });
    return g.c;
  }

  /* ============================================================
     SLOT 4 · SPECS Y DIMENSIONES — "¿qué exactamente recibo?"
     ============================================================ */
  function medidas(d, img, tema) {
    var g = crear(tema), x = g.x;
    var y = titulo(g, d.titulo || 'Measurements & What You Get', null);

    var zonaAlto = 820;
    foto(g, img, M + 120, y, L - M * 2 - 300, zonaAlto);

    // cotas
    x.strokeStyle = g.t.tinta; x.lineWidth = 6; x.lineCap = 'round';
    var yb = y + zonaAlto + 40;
    x.beginPath(); x.moveTo(M + 120, yb); x.lineTo(L - M - 180, yb); x.stroke();
    x.font = fuente(800, TIPO.medio); x.fillStyle = g.t.tinta;
    x.textAlign = 'center';
    x.fillStyle = g.t.fondo; 
    var anchoTxt = x.measureText(d.ancho || '—').width + 40;
    x.fillRect((M + 120 + L - M - 180) / 2 - anchoTxt / 2, yb - TIPO.medio / 2, anchoTxt, TIPO.medio);
    x.fillStyle = g.t.tinta;
    x.textBaseline = 'middle';
    x.fillText(d.ancho || '—', (M + 120 + L - M - 180) / 2, yb);
    x.textAlign = 'left'; x.textBaseline = 'top';

    x.beginPath(); x.moveTo(L - M - 120, y); x.lineTo(L - M - 120, y + zonaAlto); x.stroke();
    x.save(); x.translate(L - M - 60, y + zonaAlto / 2); x.rotate(-Math.PI / 2);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = fuente(800, TIPO.medio); x.fillText(d.alto || '—', 0, 0);
    x.restore(); x.textAlign = 'left'; x.textBaseline = 'top';

    // qué incluye
    var y2 = yb + 90, items = (d.incluye || []).slice(0, 4);
    var anchoIt = (L - M * 2 - 36 * (items.length - 1)) / Math.max(items.length, 1);
    var altoIt = L - M - y2;
    items.forEach(function (it, i) {
      var x0 = M + i * (anchoIt + 36), cy = y2 + altoIt / 2;
      caja(g, x0, y2, anchoIt, altoIt);
      x.textBaseline = 'middle';
      x.fillStyle = g.t.tinta; x.font = fuente(800, TIPO.minimo);
      var ls = partir(x, it.que, anchoIt - 56);
      var paso = TIPO.minimo + 10;
      // el detalle cuenta como una línea más, para que el bloque quede centrado
      var total = ls.length + (it.detalle ? 1 : 0);
      var y0 = cy - (total - 1) * paso / 2;
      ls.forEach(function (ln, k) { x.fillText(ln, x0 + 28, y0 + k * paso); });
      if (it.detalle) {
        x.fillStyle = g.t.suave; x.font = fuente(400, TIPO.minimo);
        x.fillText(it.detalle, x0 + 28, y0 + ls.length * paso);
      }
      x.textBaseline = 'top';
    });
    return g.c;
  }

  /* ============================================================
     SLOT 5 · COMPARATIVA — nunca se nombra al competidor
     ============================================================ */
  function comparativa(d, tema) {
    var g = crear(tema), x = g.x;
    var y = titulo(g, d.titulo || 'Why Ours Is Different', null);

    var filas = (d.filas || []).slice(0, 5);
    var cols = [L - M * 2 - 760, 380, 380];
    var x0 = M, x1 = M + cols[0], x2 = x1 + cols[1];
    // Sin tope: la tabla reparte el alto disponible entre sus filas y llena el
    // lienzo. Un tope fijo dejaba medio encuadre vacío con pocas filas.
    var alto = (L - M - y) / (filas.length + 1);

    caja(g, x1 - 20, y, cols[1] + 40, alto * (filas.length + 1) + 20, g.t.realce);

    x.font = fuente(800, TIPO.minimo); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = g.t.tinta; x.fillText(d.nuestro || 'Ours', x1 + cols[1] / 2, y + alto / 2);
    x.fillStyle = g.t.suave; x.fillText(d.otros || 'Typical', x2 + cols[2] / 2, y + alto / 2);

    filas.forEach(function (f, i) {
      var yy = y + alto * (i + 1), cy = yy + alto / 2;
      x.strokeStyle = g.t.linea; x.lineWidth = 4;
      x.beginPath(); x.moveTo(M, yy); x.lineTo(L - M, yy); x.stroke();

      x.textAlign = 'left'; x.fillStyle = g.t.suave; x.font = fuente(400, TIPO.minimo);
      var lc = partir(x, f.criterio, cols[0] - 40).slice(0, 2);
      var pasoC = TIPO.minimo + 8;
      var yc = cy - (lc.length - 1) * pasoC / 2;
      lc.forEach(function (ln, k) { x.fillText(ln, x0, yc + k * pasoC); });

      x.textAlign = 'center';
      [[f.nuestro, x1 + cols[1] / 2, true], [f.otros, x2 + cols[2] / 2, false]].forEach(function (p) {
        if (p[0] === true || p[0] === false) {
          ICONO[p[0] ? 'check' : 'equis'](g, p[1], cy, 44);
        } else {
          x.fillStyle = p[2] ? g.t.tinta : g.t.suave;
          x.font = fuente(p[2] ? 800 : 400, TIPO.minimo);
          x.fillText(String(p[0]), p[1], cy);
        }
      });
    });
    x.textAlign = 'left'; x.textBaseline = 'top';
    return g.c;
  }

  /* ============================================================
     SLOT 6 · DETALLES DE CALIDAD — máximo 3 bloques.
     Al cuarto la imagen deja de comunicar y empieza a exigir esfuerzo.
     ============================================================ */
  function detalles(d, img, tema) {
    var g = crear(tema), x = g.x;
    var y = titulo(g, d.titulo || 'Built To Last', null);

    var bloques = (d.bloques || []).slice(0, 3);
    var zonaFoto = 820;
    foto(g, img, M, y, L - M * 2, zonaFoto);
    y += zonaFoto + 50;

    var HUECO = 26, alto = (L - M - y - HUECO * (bloques.length - 1)) / Math.max(bloques.length, 1);
    bloques.forEach(function (b, i) {
      var cy = y + alto / 2;
      caja(g, M, y, L - M * 2, alto);
      x.fillStyle = g.t.marca;
      x.beginPath(); x.arc(M + 96, cy, 56, 0, Math.PI * 2); x.fill();
      ICONO.check({ x: x, t: { ok: '#FFFFFF' } }, M + 96, cy, 44);

      x.fillStyle = g.t.tinta; x.font = fuente(800, TIPO.medio);
      x.textBaseline = 'middle';
      var ls = partir(x, b.que, L - M * 2 - 240);
      var y0 = cy - (ls.length - 1) * (TIPO.medio + 10) / 2 - (b.detalle ? 26 : 0);
      ls.forEach(function (ln, k) { x.fillText(ln, M + 190, y0 + k * (TIPO.medio + 10)); });
      if (b.detalle) {
        x.fillStyle = g.t.suave; x.font = fuente(400, TIPO.minimo);
        x.fillText(b.detalle, M + 190, y0 + ls.length * (TIPO.medio + 10) + 6);
      }
      x.textBaseline = 'top';
      y += alto + HUECO;
    });
    return g.c;
  }

  /* ---------- Marcador ----------
     Misma convención que sophie-listing: el modelo emite el contenido de la
     imagen como JSON dentro de un comentario, y la aplicación lo dibuja. El
     modelo decide QUÉ dice la imagen; el lienzo decide cómo se ve. */
  var MARCA = /<!--IMAGEN:([\s\S]*?)-->/;

  function detectar(texto) {
    var m = MARCA.exec(texto || '');
    if (!m) return null;
    try {
      var d = JSON.parse(m[1].trim());
      if (!d || !d.slot || !SLOTS[d.slot]) return null;
      return d;
    } catch (e) { return null; }
  }

  function limpiar(texto) {
    return String(texto || '').replace(MARCA, '').replace(/<!--M:[HS]-->/g, '').trim();
  }

  /* ---------- Prueba de miniatura: hay que MIRARLA ---------- */
  function miniatura(canvas, lado) {
    var m = document.createElement('canvas');
    m.width = m.height = lado || 500;
    m.getContext('2d').drawImage(canvas, 0, 0, m.width, m.height);
    return m.toDataURL('image/jpeg', 0.9);
  }

  function descargar(canvas, nombre) {
    canvas.toBlob(function (b) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = (nombre || 'sophie-imagen') + '.png';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, 'image/png');
  }

  var SLOTS = { index: index, medidas: medidas, comparativa: comparativa, detalles: detalles };

  function generar(tipo, datos, img, tema) {
    if (!SLOTS[tipo]) throw new Error('Slot desconocido: ' + tipo);
    return (tipo === 'medidas' || tipo === 'detalles')
      ? SLOTS[tipo](datos, img, tema)
      : SLOTS[tipo](datos, tema);
  }

  function disponible() {
    return typeof document !== 'undefined' && !!document.createElement('canvas').getContext;
  }

  global.SophieImagenesGen = {
    version: '1.0',
    lado: L, margen: M, tema: TEMA, tipo: TIPO,
    disponible: disponible,
    generar: generar, detectar: detectar, limpiar: limpiar,
    index: index, medidas: medidas, comparativa: comparativa, detalles: detalles,
    miniatura: miniatura, descargar: descargar
  };

})(typeof window !== 'undefined' ? window : this);
