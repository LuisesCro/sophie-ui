/* ============================================================
   SOPHIE · PUERTA v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-puerta.js

   Convierte la metodología en software: ningún módulo se abre
   sobre un producto que no pasó la validación.

   Requiere: sophie-ui.css y sophie-render.js.

   USO MÍNIMO en cualquier módulo:

     const r = await SophiePuerta.consultar({ id: codigoEXP, code: accessCode });
     if (r.acceso === 'bloqueado') {
       SophiePuerta.pintar('#zona', r, { modulo: 'proveedores' });
       return;
     }
     if (r.acceso === 'advertencia') SophiePuerta.pintar('#zona', r, { modulo: 'proveedores' });
     precargarModulo(SophiePuerta.resumen(r.expediente));

   TRES ESTADOS, no dos — la escala de veredictos tiene cuatro niveles:
     PRODUCTO ESTRELLA / GO CON AJUSTES -> permitido
     RIESGO MODERADO                    -> advertencia (pasa, pero avisado)
     NO GO                              -> bloqueado
   ============================================================ */

(function (global) {
  'use strict';

  var API = 'https://sophie.crezcamosonline.com/api/expediente';

  // URLs = rutas de la app unificada (app.crezcamosonline.com), que el netlify.toml
  // proxea a cada sitio. Fuente única: así los enlaces entre módulos mantienen al
  // estudiante dentro de la app (misma sesión, misma barra) y no dependen de
  // subdominios sueltos que pueden estar mal escritos.
  var MODULOS = {
    proveedores: { nombre: 'Sophie Proveedores', url: 'https://app.crezcamosonline.com/proveedores/' },
    listing:     { nombre: 'Sophie Listing',     url: 'https://app.crezcamosonline.com/listado/' },
    ads:         { nombre: 'Sophie Ads',         url: 'https://app.crezcamosonline.com/ppc/' },
    lanzamiento: { nombre: 'Sophie Lanzamiento',  url: 'https://app.crezcamosonline.com/lanzamiento/' },
    rescate:     { nombre: 'Sophie Rescate',      url: 'https://app.crezcamosonline.com/rescate/' },
    producto:    { nombre: 'Sophie Producto',     url: 'https://app.crezcamosonline.com/producto/' }
  };

  function norm(v) {
    return String(v || '').toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Decide el acceso a partir del veredicto guardado.
  function evaluar(veredicto) {
    var v = norm(veredicto);
    if (!v) return { acceso: 'advertencia', motivo: 'Este expediente no tiene un veredicto registrado. Verifica que el análisis se haya completado en Sophie Producto.' };
    if (v.indexOf('NO GO') > -1 || v.indexOf('DESCARTAD') > -1) {
      return { acceso: 'bloqueado', motivo: 'Sophie Producto marcó este nicho como NO GO. Construir sobre un producto que no protege tu inversión solo hace más caro el error.' };
    }
    if (v.indexOf('RIESGO MODERADO') > -1) {
      return { acceso: 'advertencia', motivo: 'El veredicto fue RIESGO MODERADO. Puedes avanzar, pero solo si tienes claro cada riesgo y un plan para manejarlo.' };
    }
    if (v.indexOf('ESTRELLA') > -1 || v.indexOf('GO') > -1) {
      return { acceso: 'permitido', motivo: '' };
    }
    return { acceso: 'advertencia', motivo: 'No pude interpretar el veredicto de este expediente.' };
  }

  /* ---------- consulta ---------- */

  // opts: { id, code, sesion:{email,token} }
  function consultar(opts) {
    opts = opts || {};
    var id = String(opts.id || '').trim();
    if (!id) return Promise.resolve({ ok: false, acceso: 'bloqueado', motivo: 'Falta el código de expediente.' });

    var cuerpo = { action: 'get', code: opts.code, id: id };
    if (opts.sesion && opts.sesion.email && opts.sesion.token) {
      cuerpo.sesionEmail = opts.sesion.email;
      cuerpo.sesionToken = opts.sesion.token;
    }

    return fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo)
    })
    .then(function (r) { return r.json().then(function (d) { return { http: r.status, d: d }; }); })
    .then(function (x) {
      if (!x.d || !x.d.ok || !x.d.expediente) {
        return {
          ok: false,
          acceso: 'bloqueado',
          motivo: (x.d && x.d.error) || 'No pude leer el expediente (error ' + x.http + ').',
          esError: true
        };
      }
      var exp = x.d.expediente;
      var e = evaluar(exp.veredicto);
      return {
        ok: true,
        expediente: exp,
        veredicto: exp.veredicto || '',
        score: exp.score || '',
        acceso: e.acceso,
        motivo: e.motivo,
        vetos: Array.isArray(exp.vetosActivos) ? exp.vetosActivos : []
      };
    })
    .catch(function (err) {
      return { ok: false, acceso: 'bloqueado', motivo: 'No pude conectar con el sistema de expedientes.', esError: true, detalle: String(err) };
    });
  }

  /* ---------- lo que el módulo reutiliza sin volver a preguntar ---------- */

  function resumen(exp) {
    exp = exp || {};
    return {
      id: exp.id || '',
      keyword: exp.keyword || '',
      producto: exp.producto || '',
      caracteristicas: exp.caracteristicas || '',
      clienteTarget: exp.clienteTarget || '',
      insightsReviews: Array.isArray(exp.insightsReviews) ? exp.insightsReviews : [],
      asinsCompetidores: Array.isArray(exp.asinsCompetidores) ? exp.asinsCompetidores : [],
      categoriaSugerida: exp.categoriaSugerida || '',
      diferenciacion: exp.diferenciacion || '',
      precio: exp.precio || '',
      margenAntesPPC: exp.margenAntesPPC || '',
      breakEvenAcos: exp.breakEvenAcos || '',
      roi: exp.roi || '',
      capital: exp.capital || '',
      unidadesPrimerPedido: exp.unidadesPrimerPedido || '',
      origenSourcing: exp.origenSourcing || '',
      veredicto: exp.veredicto || '',
      score: exp.score || ''
    };
  }

  /* ---------- pantalla ---------- */

  function el(sel) { return typeof sel === 'string' ? document.querySelector(sel) : sel; }

  // Pinta el estado de la puerta. Devuelve true si pintó algo.
  // opts: { modulo, volverA }
  function pintar(sel, r, opts) {
    var host = el(sel);
    if (!host || !r) return false;
    opts = opts || {};
    var mod = MODULOS[opts.modulo] || { nombre: 'Este módulo' };
    var esc = global.Sophie ? global.Sophie.esc : function (s) { return String(s == null ? '' : s); };

    host.classList.add('sophie-panel', 'sophie-root');

    if (r.acceso === 'permitido') { host.innerHTML = ''; return false; }

    var vetos = r.vetos && r.vetos.length
      ? '<p class="s-veredicto__razon" style="margin-top:10px">Criterios con veto activado: <b>' +
        esc(r.vetos.join(', ')) + '</b>. Esos son los que quiebran negocios.</p>'
      : '';

    if (r.acceso === 'bloqueado') {
      host.innerHTML =
        '<div class="s-veredicto" data-estado="nogo" role="status">' +
          '<div class="s-veredicto__top">' +
            '<div class="s-veredicto__badge">&#128274; Bloqueado</div>' +
            (r.score ? '<div class="s-veredicto__puntaje"><b>' + esc(r.score) + '</b><span>score del análisis</span></div>' : '') +
          '</div>' +
          '<h3 class="s-veredicto__titular">' + esc(mod.nombre) + ' no se abre sobre un producto sin validar</h3>' +
          '<p class="s-veredicto__razon">' + esc(r.motivo) + '</p>' +
          vetos +
        '</div>' +
        '<div class="s-cadena">' +
          '<div class="s-cadena__txt">' +
            '<div class="s-cadena__paso">Siguiente</div>' +
            '<div class="s-cadena__t">Valida otro candidato</div>' +
            '<div class="s-cadena__d">Cada producto que descartas es capital que protegiste.</div>' +
          '</div>' +
          '<a class="s-btn" href="' + esc(opts.volverA || MODULOS.producto.url) + '">&#128260; Ir a Sophie Producto</a>' +
        '</div>';
      return true;
    }

    // advertencia
    host.innerHTML =
      '<div class="s-veredicto" data-estado="alerta" role="status">' +
        '<div class="s-veredicto__top">' +
          '<div class="s-veredicto__badge">&#9888; Avanza con cuidado</div>' +
          (r.score ? '<div class="s-veredicto__puntaje"><b>' + esc(r.score) + '</b><span>score del análisis</span></div>' : '') +
        '</div>' +
        '<h3 class="s-veredicto__titular">' + esc(r.veredicto || 'Veredicto con reservas') + '</h3>' +
        '<p class="s-veredicto__razon">' + esc(r.motivo) + '</p>' +
        vetos +
      '</div>';
    return true;
  }

  /* ---------- formulario de entrada (el mismo en todos los módulos) ---------- */

  // Pinta el campo del código EXP. Llama a onCodigo(codigo) al enviar.
  function formulario(sel, opts) {
    var host = el(sel);
    if (!host) return;
    opts = opts || {};
    var mod = MODULOS[opts.modulo] || { nombre: 'este módulo' };
    var esc = global.Sophie ? global.Sophie.esc : function (s) { return String(s == null ? '' : s); };

    host.classList.add('sophie-panel', 'sophie-root');
    host.innerHTML =
      '<section class="s-card">' +
        '<p class="s-card__eyebrow">Tu expediente</p>' +
        '<h3 class="s-veredicto__titular" style="margin-bottom:8px">Pega tu código EXP</h3>' +
        '<p class="s-veredicto__razon" style="margin-bottom:14px">' +
          'Con él, ' + esc(mod.nombre) + ' carga tu análisis completo — sin volver a pegar nada.' +
        '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<input id="sp-exp" type="text" placeholder="EXP-mi-producto-A1B2" autocomplete="off" ' +
            'style="flex:1 1 240px;min-width:0;padding:13px 15px;border-radius:12px;border:1px solid rgba(255,255,255,.16);' +
            'background:rgba(255,255,255,.05);color:#fff;font-family:ui-monospace,monospace;font-size:15px;outline:none">' +
          '<button class="s-btn" id="sp-ir" type="button">Cargar mi análisis</button>' +
        '</div>' +
        '<p id="sp-msg" class="s-veredicto__razon" style="margin:12px 0 0;min-height:18px"></p>' +
      '</section>';

    var input = host.querySelector('#sp-exp');
    var boton = host.querySelector('#sp-ir');
    var msg = host.querySelector('#sp-msg');

    function ir() {
      var v = (input.value || '').trim();
      if (!v) { msg.textContent = 'Escribe el código que te dio Sophie Producto.'; return; }
      boton.disabled = true;
      msg.textContent = 'Buscando tu expediente…';
      if (typeof opts.onCodigo === 'function') opts.onCodigo(v, { boton: boton, msg: msg });
    }

    boton.addEventListener('click', ir);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ir(); });
  }

  global.SophiePuerta = {
    version: '1.0',
    api: API,
    modulos: MODULOS,
    consultar: consultar,
    evaluar: evaluar,
    resumen: resumen,
    pintar: pintar,
    formulario: formulario
  };

})(window);
