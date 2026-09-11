/* ============================================================
   SOPHIE · IMÁGENES — Proveedor de generación (cliente)

   Es la pieza que faltaba: SophieCreativeGenerator tenía el hueco
   (registerProvider / generateAsset) pero nadie lo llenaba, así que
   generateAsset lanzaba "No hay proveedor de imágenes configurado".

   Aquí NO hay ninguna llave. Todo va contra /api/imagen, que es quien
   guarda FAL_KEY y quien cobra los Créditos Visuales antes de generar.

   Lo único que este archivo hace de su parte es reducir las fotos de
   referencia antes de subirlas, y eso es dinero: fal cobra por megapíxel
   de ENTRADA y de SALIDA sumados, redondeando hacia arriba. Una referencia
   de 2000x2000 son 4 MP que se pagan sin aportar nada, porque la referencia
   solo sirve para preservar la identidad del producto, no para el render.
   Con 4 MP de salida: 8 MP en total = $0.135. Bajando la referencia a 1 MP:
   5 MP = $0.09. Un tercio menos, sin tocar la calidad de lo que sale.
   ============================================================ */
(function (g) {
  'use strict';
  if (typeof document === 'undefined' || !g.fetch) return;

  var API = 'https://sophie-imagenes.crezcamosonline.com/api/imagen';
  var KEY_CLAVE = 'sophie_imagenes_clave';
  var MAX_PIXELES_REFERENCIA = 1000000;   // 1 MP
  var MAX_REFERENCIAS = 3;

  var calidad = 'pro';

  function sesion() {
    if (g.SophieCreditos && g.SophieCreditos.session) {
      var s = g.SophieCreditos.session();
      if (s) return s;
    }
    try {
      var m = document.cookie.match(/(?:^|; )crz_sesion=([^;]*)/);
      if (m) {
        var c = JSON.parse(decodeURIComponent(m[1]));
        if (c && c.email && c.token) return c;
      }
    } catch (e) {}
    try {
      var l = JSON.parse(localStorage.getItem('crezcamos_sso') || 'null');
      if (l && l.email && l.token) return l;
    } catch (e) {}
    return null;
  }

  function clave() {
    try { return String(localStorage.getItem(KEY_CLAVE) || ''); } catch (e) { return ''; }
  }

  function expedienteId() {
    try {
      return (g.SophieImagenesContext && g.SophieImagenesContext.getExpedienteId)
        ? String(g.SophieImagenesContext.getExpedienteId() || '') : '';
    } catch (e) { return ''; }
  }

  function operacion(exp) {
    if (g.SophieCreditos && g.SophieCreditos.operationId) return g.SophieCreditos.operationId('imagen', exp);
    var r;
    try { r = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2); }
    catch (e) { r = String(Math.random()).slice(2); }
    return 'imagen:' + String(exp || 'global').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60) + ':' + r;
  }

  /* ---------- referencias ---------- */

  // Acepta lo que traiga el que llame: data URI, URL, Blob/File, <img> o canvas.
  // Una URL ajena no se puede dibujar en un lienzo sin CORS (lo dejaría
  // "tainted" y toDataURL lanzaría), así que primero se baja a Blob.
  function aDataUrl(origen) {
    if (!origen) return Promise.resolve('');

    if (typeof origen === 'string') {
      if (/^data:image\//i.test(origen)) return Promise.resolve(origen);
      return fetch(origen)
        .then(function (r) { return r.ok ? r.blob() : null; })
        .then(function (b) { return b ? deBlob(b) : ''; })
        .catch(function () { return ''; });
    }
    if (typeof Blob !== 'undefined' && origen instanceof Blob) return deBlob(origen);
    if (origen.tagName === 'CANVAS') { try { return Promise.resolve(origen.toDataURL('image/jpeg', 0.92)); } catch (e) { return Promise.resolve(''); } }
    if (origen.tagName === 'IMG' && origen.src) return aDataUrl(origen.src);
    if (origen.dataUrl) return aDataUrl(origen.dataUrl);
    if (origen.url) return aDataUrl(origen.url);
    return Promise.resolve('');
  }

  function deBlob(blob) {
    return new Promise(function (resolve) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result || '')); };
      fr.onerror = function () { resolve(''); };
      fr.readAsDataURL(blob);
    });
  }

  function cargar(dataUrl) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = dataUrl;
    });
  }

  function reducir(dataUrl) {
    return cargar(dataUrl).then(function (im) {
      if (!im || !im.width || !im.height) return '';
      var pixeles = im.width * im.height;
      // Ya viene pequeña: no la reprocesamos. Recomprimir un JPEG por gusto
      // solo le quita calidad a la referencia.
      if (pixeles <= MAX_PIXELES_REFERENCIA) return dataUrl;

      // Cuidado con el redondeo: fal cobra por megapíxel REDONDEANDO HACIA
      // ARRIBA, así que quedarse en 1.0002 MP no cuesta "casi 1 MP", cuesta 2.
      // Redondear cada lado por separado no garantiza que el producto quepa
      // (2400x1800 daba 1155x866 = 1.0002 MP). Partiendo del alto y derivando
      // el ancho, ambos truncados, el área nunca puede pasarse del tope.
      var proporcion = im.width / im.height;
      var alto = Math.max(1, Math.floor(Math.sqrt(MAX_PIXELES_REFERENCIA / proporcion)));
      var ancho = Math.max(1, Math.floor(alto * proporcion));
      var c = document.createElement('canvas');
      c.width = ancho;
      c.height = alto;
      var x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, 0, 0, c.width, c.height);
      try { return c.toDataURL('image/jpeg', 0.92); } catch (e) { return ''; }
    });
  }

  function prepararReferencias(lista) {
    var arr = (Array.isArray(lista) ? lista : (lista ? [lista] : [])).slice(0, MAX_REFERENCIAS);
    return Promise.all(arr.map(function (x) {
      return aDataUrl(x).then(function (d) { return d ? reducir(d) : ''; });
    })).then(function (out) { return out.filter(Boolean); });
  }

  /* ---------- generación ---------- */

  function generateImage(peticion) {
    peticion = peticion || {};
    var ses = sesion();
    if (!ses) return Promise.reject(new Error('Entra con tu cuenta para generar imágenes.'));
    var code = clave();
    if (!code) return Promise.reject(new Error('Falta tu clave de acceso a Sophie Imágenes.'));

    var exp = expedienteId();
    var opId = peticion.operationId || operacion(exp);
    // generateAsset() no pasa calidad —fija 2000x2000— así que la decide el
    // proveedor. El tamaño real lo impone /api/imagen según la calidad, que es
    // lo que está atado a la tabla de costos del wallet (draft 1, pro 2).
    var q = peticion.quality || calidad;

    return prepararReferencias(peticion.sourceImages).then(function (referencias) {
      if (!referencias.length) {
        throw new Error('Necesito al menos una foto real del producto: es un modelo de edición, no de invención.');
      }
      return fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generar',
          code: code,
          email: ses.email,
          sesionToken: ses.token,
          operationId: opId,
          expedienteId: exp,
          slot: peticion.slot,
          quality: q,
          prompt: peticion.prompt,
          negativePrompt: peticion.negativePrompt,
          referencias: referencias
        })
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || !d || !d.ok) {
          var err = new Error((d && d.error) || ('No se pudo generar la imagen (HTTP ' + r.status + ').'));
          err.status = r.status;
          err.detail = d && d.detail;
          err.wallet = d && d.wallet;
          err.available = d && d.available;
          err.needed = d && d.needed;
          throw err;
        }
        try {
          g.dispatchEvent(new CustomEvent('sophie:imagen-generada', {
            detail: { operationId: d.operationId, quality: d.quality, wallet: d.wallet }
          }));
        } catch (e) {}
        return {
          // dataUrl primero: viene del mismo origen y el lienzo puede usarla
          // sin quedar "tainted", que es como el alumno la descarga.
          url: d.image.dataUrl || d.image.archivoUrl || d.image.url,
          remoteUrl: d.image.url,
          // Lo que se guarda en el expediente: el id del archivo, no los bytes.
          archivoId: d.image.archivoId || '',
          archivoUrl: d.image.archivoUrl || '',
          width: d.image.width,
          height: d.image.height,
          operationId: d.operationId,
          credits: d.credits,
          wallet: d.wallet
        };
      });
    });
  }

  var proveedor = {
    nombre: 'fal.ai · FLUX.2 [pro] Edit',
    generateImage: generateImage
  };

  function registrar() {
    if (!g.SophieCreativeGenerator || !g.SophieCreativeGenerator.registerProvider) return false;
    if (g.SophieCreativeGenerator.getProvider && g.SophieCreativeGenerator.getProvider()) return true;
    try { g.SophieCreativeGenerator.registerProvider(proveedor); return true; } catch (e) { return false; }
  }

  // El generador se carga antes que este archivo en la cadena de
  // sophie-suite-nav, pero no damos por hecho el orden: si todavía no está,
  // se reintenta un momento después.
  if (!registrar()) setTimeout(registrar, 400);

  g.SophieImagenProveedor = {
    version: '1.0',
    proveedor: proveedor,
    registrar: registrar,
    generateImage: generateImage,
    prepararReferencias: prepararReferencias,
    calidad: function (v) { if (v === 'draft' || v === 'pro') calidad = v; return calidad; }
  };
})(typeof window !== 'undefined' ? window : this);
