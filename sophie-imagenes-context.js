/* ============================================================
   SOPHIE · IMÁGENES v2 — Fase 1: contexto de expediente compartido

   Esta capa NO cambia el auditor V1. Conecta Imágenes con el expediente
   que ya usan Producto, Listing y Ads, para que el estudiante no vuelva
   a escribir lo que la Suite ya sabe.

   Prioridad para resolver el producto activo:
     1) ?exp=EXP-... en la URL
     2) expediente activo de Sophie Listing (mismo origen dentro de la Suite)
     3) expediente más recientemente actualizado de la cuenta
     4) último expediente usado por Sophie Imágenes

   La persistencia se hace únicamente bajo `expediente.imagenes`.
   Se reutiliza la acción `merge` actual del backend central y se envía
   un patch de una sola propiedad; Producto, Listing, Ads, eventos,
   fase_actual y estado quedan intactos.
   ============================================================ */

(function (global) {
  'use strict';

  if (typeof document === 'undefined' || !global.fetch) return;

  var CUENTA_API = 'https://sophie.crezcamosonline.com/api/cuenta';
  var EXP_API = 'https://sophie.crezcamosonline.com/api/expediente';
  var KEY_IMAGENES_EXP = 'sophie_imagenes_expid_v2';
  var KEY_LISTING_EXP = 'sophie_listing_expid_v1';
  var KEY_CLAVE_IMAGENES = 'sophie_imagenes_clave';
  var FETCH_ORIGINAL = global.fetch.bind(global);

  var estado = {
    ready: false,
    loading: false,
    error: '',
    sesion: null,
    accessCode: '',
    expedienteId: '',
    expediente: null,
    resumen: null,
    promise: null
  };

  function esObjeto(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function mergeProfundo(base, patch) {
    var out = esObjeto(base) ? Object.assign({}, base) : {};
    if (!esObjeto(patch)) return out;
    Object.keys(patch).forEach(function (k) {
      if (esObjeto(patch[k]) && esObjeto(out[k])) out[k] = mergeProfundo(out[k], patch[k]);
      else out[k] = patch[k];
    });
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function leerCookieSesion() {
    try {
      var m = document.cookie.match(/(?:^|; )crz_sesion=([^;]*)/);
      if (!m) return null;
      var ses = JSON.parse(decodeURIComponent(m[1]));
      return (ses && ses.email && ses.token) ? ses : null;
    } catch (e) { return null; }
  }

  function normalizarExpId(id) {
    var s = String(id || '').trim();
    if (!s) return '';
    if (s.indexOf('EXP-') !== 0) s = 'EXP-' + s.replace(/^EXP-/i, '');
    return s;
  }

  function expDesdeURL() {
    try {
      var u = new URL(global.location.href);
      return normalizarExpId(u.searchParams.get('exp') || u.searchParams.get('expediente') || '');
    } catch (e) { return ''; }
  }

  function expDesdeListing() {
    try {
      var raw = localStorage.getItem(KEY_LISTING_EXP);
      if (!raw) return '';
      var d = JSON.parse(raw);
      return normalizarExpId(d && d.id);
    } catch (e) { return ''; }
  }

  function expDesdeImagenes() {
    try { return normalizarExpId(localStorage.getItem(KEY_IMAGENES_EXP) || ''); }
    catch (e) { return ''; }
  }

  function guardarExpLocal(id) {
    try { if (id) localStorage.setItem(KEY_IMAGENES_EXP, normalizarExpId(id)); } catch (e) {}
  }

  async function obtenerLlave(sesion) {
    if (sesion && sesion.email && sesion.token) {
      try {
        var r = await FETCH_ORIGINAL(CUENTA_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'llave', email: sesion.email, token: sesion.token })
        });
        var d = null; try { d = await r.json(); } catch (e) {}
        if (r.ok && d && d.ok && d.llave) return String(d.llave);
      } catch (e) {}
    }
    try { return String(localStorage.getItem(KEY_CLAVE_IMAGENES) || ''); }
    catch (e) { return ''; }
  }

  async function misExpedientes(sesion) {
    if (!sesion || !sesion.email || !sesion.token) return [];
    try {
      var r = await FETCH_ORIGINAL(CUENTA_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mis_expedientes',
          email: sesion.email,
          token: sesion.token
        })
      });
      var d = null; try { d = await r.json(); } catch (e) {}
      if (r.ok && d && d.ok && Array.isArray(d.expedientes)) return d.expedientes;
    } catch (e) {}
    return [];
  }

  async function traerExpediente(id, code, sesion) {
    id = normalizarExpId(id);
    if (!id || !code) return null;
    try {
      var body = { code: code, action: 'get', id: id };
      if (sesion) {
        body.sesionEmail = sesion.email;
        body.sesionToken = sesion.token;
      }
      var r = await FETCH_ORIGINAL(EXP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var d = null; try { d = await r.json(); } catch (e) {}
      return (r.ok && d && d.ok && d.expediente) ? d.expediente : null;
    } catch (e) { return null; }
  }

  function tieneListing(exp) {
    return !!(exp && (
      exp.listingTitulo ||
      (Array.isArray(exp.listingVinetas) && exp.listingVinetas.length) ||
      (esObjeto(exp.listing) && (
        exp.listing.titulo ||
        (Array.isArray(exp.listing.vinetas) && exp.listing.vinetas.length) ||
        exp.listing.keywordStrategy
      ))
    ));
  }

  function tieneAds(exp) {
    if (!exp) return false;
    if (exp.adsIniciado || esObjeto(exp.ads)) return true;
    return Array.isArray(exp.eventos) && exp.eventos.some(function (e) {
      return e && (e.tipo === 'ads_configuradas' || e.modulo === 'ads');
    });
  }

  function valor(exp, rutas) {
    for (var i = 0; i < rutas.length; i++) {
      var p = rutas[i].split('.');
      var v = exp;
      for (var j = 0; j < p.length && v != null; j++) v = v[p[j]];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return '';
  }

  function resumirExpediente(exp) {
    var vinetas = valor(exp, ['listing.vinetas', 'listingVinetas']);
    if (!Array.isArray(vinetas)) vinetas = [];

    var keywordStrategy = valor(exp, ['listing.keywordStrategy']);
    if (!esObjeto(keywordStrategy)) keywordStrategy = {};

    return {
      expedienteId: normalizarExpId(exp.id || estado.expedienteId),
      producto: valor(exp, ['producto', 'nombreProducto', 'keyword']) || 'Producto',
      asin: valor(exp, ['asin', 'ASIN']),
      marketplace: valor(exp, ['marketplace', 'mercado']) || 'Amazon',
      categoria: valor(exp, ['categoria', 'category']),
      keywordPrincipal: valor(exp, [
        'listing.keywordStrategy.principal',
        'keywordPrincipal',
        'keyword'
      ]),
      veredicto: valor(exp, ['veredicto']),
      scoreProducto: valor(exp, ['score']),
      listing: {
        disponible: tieneListing(exp),
        titulo: valor(exp, ['listing.titulo', 'listingTitulo']),
        itemHighlights: valor(exp, ['listing.itemHighlights', 'listingItemHighlights']),
        vinetas: vinetas.slice(0, 5),
        keywordStrategy: keywordStrategy
      },
      senalesProducto: {
        clustersElegidos: Array.isArray(exp.clustersElegidos) ? exp.clustersElegidos : [],
        dolores: Array.isArray(exp.doloresC17) ? exp.doloresC17 : [],
        anguloRecomendacion: valor(exp, ['anguloRecomendacion'])
      },
      adsDisponible: tieneAds(exp),
      imagenes: esObjeto(exp.imagenes) ? {
        version: exp.imagenes.version || 1,
        status: exp.imagenes.status || ''
      } : null
    };
  }

  function fuentes(exp) {
    var prev = esObjeto(exp.imagenes) && esObjeto(exp.imagenes.sources) ? exp.imagenes.sources : {};
    return Object.assign({}, prev, {
      producto: true,
      listing: tieneListing(exp),
      ads: tieneAds(exp)
    });
  }

  async function guardarImagenes(patch) {
    if (!estado.expedienteId || !estado.accessCode) return { ok: false, error: 'sin_expediente' };

    // Relee antes de escribir: así preserva cualquier cambio hecho por otro módulo
    // o por otra pestaña desde que se cargó esta pantalla.
    var reciente = await traerExpediente(estado.expedienteId, estado.accessCode, estado.sesion);
    if (!reciente) reciente = estado.expediente || {};
    var actual = esObjeto(reciente.imagenes) ? reciente.imagenes : {};
    var siguiente = mergeProfundo(actual, patch || {});

    var body = {
      code: estado.accessCode,
      action: 'merge',
      id: estado.expedienteId,
      patch: { imagenes: siguiente }
    };
    if (estado.sesion) {
      body.sesionEmail = estado.sesion.email;
      body.sesionToken = estado.sesion.token;
    }

    try {
      var r = await FETCH_ORIGINAL(EXP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var d = null; try { d = await r.json(); } catch (e) {}
      if (!(r.ok && d && d.ok)) return { ok: false, error: (d && d.error) || 'merge_fallo' };
      reciente.imagenes = siguiente;
      estado.expediente = reciente;
      estado.resumen = resumirExpediente(reciente);
      return { ok: true, imagenes: siguiente };
    } catch (e) {
      return { ok: false, error: 'red' };
    }
  }

  // Cuando el contexto no se puede establecer, el módulo se quedaba mudo. Las
  // barras de la V2 se montan apagadas —necesitan expediente— y la de Research,
  // que es la puerta de entrada a toda la cadena, ni siquiera aparece. El
  // resultado era una pared de botones grises, sin una sola explicación y sin
  // manera de avanzar. El motivo ya estaba en estado.error desde el principio;
  // lo que faltaba es que alguien lo leyera. Esto lo pone en pantalla.
  var MOTIVOS = {
    sin_expediente: {
      titulo: 'Todavía no hay un producto conectado',
      detalle: 'Sophie Imágenes construye la galería sobre un producto ya validado: de ahí salen los dolores del comprador, las keywords y la verdad del producto. Abre Sophie Producto, termina el análisis y vuelve aquí.',
      accion: 'Ir a Sophie Producto',
      url: 'https://app.crezcamosonline.com/producto/'
    },
    sin_acceso: {
      titulo: 'No pude leer tu llave de acceso',
      detalle: 'Vuelve a entrar a la app para renovar la sesión y abre Sophie Imágenes otra vez.',
      accion: 'Volver a la app',
      url: 'https://app.crezcamosonline.com/'
    },
    contexto_error: {
      titulo: 'No pude conectar con tu expediente',
      detalle: 'Puede ser un corte momentáneo de conexión. Recarga la página; si sigue igual, escríbenos.',
      accion: 'Recargar',
      url: ''
    }
  };

  function pintarFaltaContexto(motivo) {
    var app = document.getElementById('app');
    if (!app) return;
    var m = MOTIVOS[motivo] || MOTIVOS.contexto_error;

    var viejo = document.getElementById('sophie-imagenes-sin-contexto');
    if (viejo) viejo.remove();

    var bar = document.createElement('div');
    bar.id = 'sophie-imagenes-sin-contexto';
    // order:-10 porque las capas de la V2 se montan DESPUÉS que esta y cada una
    // se inserta como primer hijo, así que en el DOM este aviso acaba enterrado
    // bajo los pasos apagados que viene justamente a explicar. #app es un flex
    // en columna: el orden visual lo decide `order`, no el DOM. El tema reparte
    // -4 al contexto, -3 al flujo y -2 a los créditos; -10 lo deja por encima
    // de todos ellos, que es donde tiene que leerse.
    bar.style.cssText =
      'order:-10;flex:none;background:#FFF8EC;border-bottom:1px solid #F3E3C2;' +
      'padding:12px 16px;z-index:36';

    bar.innerHTML =
      '<div style="max-width:720px;margin:0 auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:220px">' +
          '<div style="font-size:13px;font-weight:800;color:#8B631A">' + esc(m.titulo) + '</div>' +
          '<div style="font-size:12.3px;line-height:1.45;color:#8B631A;margin-top:3px">' + esc(m.detalle) + '</div>' +
        '</div>' +
        '<button type="button" style="border:0;border-radius:9px;padding:9px 13px;' +
          'background:#8B631A;color:#fff;font:700 12.5px inherit;cursor:pointer">' + esc(m.accion) + '</button>' +
      '</div>';

    app.insertBefore(bar, app.firstChild);

    var b = bar.querySelector('button');
    if (b) b.onclick = function () {
      if (m.url) global.location.href = m.url; else global.location.reload();
    };
  }

  function pintarContexto() {
    var app = document.getElementById('app');
    if (!app || !estado.resumen) return;

    // Si veníamos de un aviso, el expediente ya llegó: el aviso sobra.
    var aviso = document.getElementById('sophie-imagenes-sin-contexto');
    if (aviso) aviso.remove();

    var viejo = document.getElementById('sophie-imagenes-contexto');
    if (viejo) viejo.remove();

    var r = estado.resumen;
    var bar = document.createElement('div');
    bar.id = 'sophie-imagenes-contexto';
    bar.style.cssText =
      'flex:none;background:#fff;border-bottom:1px solid var(--borde,#E6E8EC);' +
      'padding:9px 16px;z-index:35;box-shadow:0 2px 10px rgba(20,40,80,.04)';

    bar.innerHTML =
      '<div style="max-width:720px;margin:0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<span style="font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--texto-2,#5F6B7A)">Producto actual</span>' +
        '<strong style="font-size:13.5px;color:var(--texto,#1A1A2E)">' + esc(r.producto) + '</strong>' +
        (r.keywordPrincipal ? '<span style="font-size:12.5px;color:var(--texto-2,#5F6B7A)">· ' + esc(r.keywordPrincipal) + '</span>' : '') +
        '<span style="margin-left:auto;font-size:11.5px;font-weight:700;color:#1A7A4E;background:#ECFDF3;border:1px solid #C6EAD6;border-radius:999px;padding:4px 8px">' +
          '✓ Expediente conectado' +
        '</span>' +
      '</div>';

    app.insertBefore(bar, app.firstChild);
  }

  function contextoParaModelo() {
    if (!estado.resumen) return '';
    return '\n\n[CONTEXTO AUTOMÁTICO DE LA SUITE — NO SE LO PIDAS DE NUEVO AL ESTUDIANTE]\n' +
      JSON.stringify(estado.resumen) +
      '\nINSTRUCCIÓN: La aplicación ya cargó este expediente desde Sophie Producto/Listing. ' +
      'No vuelvas a preguntar por producto, ASIN, keyword, beneficios, viñetas o listing si aparecen arriba. ' +
      'Confirma brevemente lo que ya sabes y pide únicamente la información que falte para trabajar las imágenes.';
  }

  function inyectarContexto(messages) {
    if (!estado.resumen || !Array.isArray(messages) || !messages.length) return messages;

    var out = messages.map(function (m) {
      if (!m || typeof m !== 'object') return m;
      return { role: m.role, content: Array.isArray(m.content) ? m.content.slice() : m.content };
    });

    var idx = -1;
    for (var i = 0; i < out.length; i++) {
      if (out[i] && out[i].role === 'user') { idx = i; break; }
    }
    if (idx < 0) return out;

    var extra = contextoParaModelo();
    var c = out[idx].content;
    if (typeof c === 'string') {
      if (c.indexOf('[CONTEXTO AUTOMÁTICO DE LA SUITE') < 0) out[idx].content = c + extra;
    } else if (Array.isArray(c)) {
      var ya = c.some(function (b) {
        return b && b.type === 'text' && String(b.text || '').indexOf('[CONTEXTO AUTOMÁTICO DE LA SUITE') >= 0;
      });
      if (!ya) c.push({ type: 'text', text: extra });
      out[idx].content = c;
    }
    return out;
  }

  async function cargarContexto() {
    if (estado.ready && estado.expediente) return estado.resumen;
    if (estado.loading && estado.promise) return estado.promise;

    estado.loading = true;
    estado.promise = (async function () {
      try {
        var sesion = leerCookieSesion();
        var code = await obtenerLlave(sesion);
        if (!code) {
          estado.error = 'sin_acceso';
          pintarFaltaContexto('sin_acceso');
          return null;
        }

        var idURL = expDesdeURL();
        var idListing = expDesdeListing();
        var idLocal = expDesdeImagenes();
        var exp = null;
        var id = idURL || idListing || '';

        if (id) exp = await traerExpediente(id, code, sesion);

        // Si no llegó un handoff explícito desde Listing, la cuenta es la mejor
        // fuente para encontrar el producto más recientemente trabajado.
        if (!exp && sesion) {
          var lista = await misExpedientes(sesion);
          if (lista.length) {
            exp = lista[0];
            id = normalizarExpId(exp.id);
          }
        }

        // Último recurso: el expediente que Sophie Imágenes usó anteriormente.
        if (!exp && idLocal) {
          id = idLocal;
          exp = await traerExpediente(id, code, sesion);
        }

        if (!exp) {
          estado.error = 'sin_expediente';
          pintarFaltaContexto('sin_expediente');
          return null;
        }

        estado.sesion = sesion;
        estado.accessCode = code;
        estado.expedienteId = normalizarExpId(exp.id || id);
        estado.expediente = exp;
        estado.resumen = resumirExpediente(exp);
        estado.ready = true;
        estado.error = '';
        guardarExpLocal(estado.expedienteId);
        pintarContexto();

        // Crea el namespace V2 una sola vez. Si ya existe, no toca el expediente
        // por el mero hecho de abrir la pantalla.
        var img = esObjeto(exp.imagenes) ? exp.imagenes : {};
        if (!img.version || Number(img.version) < 2) {
          await guardarImagenes({
            version: 2,
            status: img.status || 'context_ready',
            sources: fuentes(exp),
            context: {
              expedienteId: estado.expedienteId,
              linkedAt: new Date().toISOString()
            }
          });
        }

        try {
          global.dispatchEvent(new CustomEvent('sophie:imagenes-contexto', {
            detail: { expedienteId: estado.expedienteId, resumen: estado.resumen }
          }));
        } catch (e) {}

        return estado.resumen;
      } catch (e) {
        estado.error = 'contexto_error';
        pintarFaltaContexto('contexto_error');
        return null;
      } finally {
        estado.loading = false;
      }
    })();

    return estado.promise;
  }

  /* Intercepta SOLO el chat de Sophie Imágenes. El historial visible no cambia:
     el contexto se añade a la copia que viaja por red, no al chat del estudiante. */
  global.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var esChatImagenes = /sophie-imagenes\.crezcamosonline\.com\/api\/chat/i.test(url) ||
      (/\/api\/chat(?:\?|$)/.test(url) && /(?:^|\/)imagenes(?:\/|$)/.test(global.location.pathname));

    if (!esChatImagenes || !init || !init.body) return FETCH_ORIGINAL(input, init);

    try {
      var body = JSON.parse(init.body);
      if (body && body.action === 'chat' && Array.isArray(body.messages)) {
        await cargarContexto();
        if (estado.resumen) {
          body.messages = inyectarContexto(body.messages);
          init = Object.assign({}, init, { body: JSON.stringify(body) });
        }
      }
    } catch (e) {}

    return FETCH_ORIGINAL(input, init);
  };

  // Si la entrada fue manual, el access code aparece en localStorage justo antes
  // de que #app pase a display:flex. Este observador permite cargar el contexto
  // sin modificar el index.html del módulo.
  function observarEntradaManual() {
    var app = document.getElementById('app');
    if (!app || typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function () {
      if (app.style.display === 'flex' && !estado.ready) cargarContexto();
    });
    obs.observe(app, { attributes: true, attributeFilter: ['style'] });
  }

  global.SophieImagenesContext = {
    version: '2.0-phase1',
    listo: function () { return !!estado.ready; },
    get: function () { return estado.resumen; },
    getExpediente: function () { return estado.expediente; },
    getExpedienteId: function () { return estado.expedienteId; },
    refrescar: cargarContexto,
    guardar: guardarImagenes
  };

  observarEntradaManual();
  cargarContexto();

})(typeof window !== 'undefined' ? window : this);
