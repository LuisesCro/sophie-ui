/* ============================================================
   SOPHIE · COBERTURA SEMÁNTICA v1.0  —  Capa 2 en Sophie Listing
   Crezcamos Online — ui.crezcamosonline.com/sophie-cobertura.js

   La segunda dimensión del listing. Sophie Listing ya juega el juego de
   A9 (densidad y cobertura de keywords). Este motor agrega el juego de
   COSMO/Rufus: ¿el título, los bullets y la descripción responden
   EXPLÍCITAMENTE a los clusters de intención huérfanos que el estudiante
   eligió como ángulo en Sophie Producto?

   El ángulo (los clusters elegidos) viaja en el expediente desde Producto.
   Aquí se cruza contra el texto del listing usando la MISMA taxonomía de
   marcadores del core compartido (cz-intent-core.js). Determinista y sin
   tokens: el motor marca la cobertura; el modelo juzga la calidad (que no
   sea keyword-stuffing) y redacta.

   El caso matcha lo justifica: un LQS de 10 con las intenciones equivocadas
   pierde contra un LQS de 8.9 con las correctas. La cobertura de keywords
   no basta; hay que cubrir la intención.
   ============================================================ */

(function (global) {
  'use strict';

  function core() { return global.CzIntentCore || null; }
  function disponible() { return !!core(); }

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Las superficies que leen COSMO y Rufus (título, item highlights, bullets,
  // descripción/A+) más el backend (discovery attributes). "cubierto" = aparece
  // en alguna superficie visible; el backend suma pero no basta solo.
  var SUPERFICIES = [
    { id: 'titulo', nombre: 'Título', visible: true },
    { id: 'highlights', nombre: 'Item Highlights', visible: true },
    { id: 'vinetas', nombre: 'Bullets', visible: true },
    { id: 'descripcion', nombre: 'Descripción / A+', visible: true },
    { id: 'backend', nombre: 'Backend', visible: false }
  ];

  function textoDe(L, campo) {
    if (!L) return '';
    if (campo === 'vinetas') {
      var v = L.vinetas;
      return Array.isArray(v) ? v.join('  •  ') : (v || '');
    }
    if (campo === 'highlights') return L.itemHighlights || L.highlights || '';
    return L[campo] || '';
  }

  /* ---------- evaluación ----------
     L: el listing ({titulo, itemHighlights, vinetas:[], descripcion, backend})
     elegidos: ids de los clusters huérfanos elegidos como ángulo (del expediente).
               Si viene vacío, evalúa los 6 (modo diagnóstico general). */
  function evaluar(L, elegidos) {
    L = L || {};
    var C = core();
    if (!C) return { ok: false };

    var ids = (elegidos && elegidos.length)
      ? elegidos.slice()
      : C.clusters.map(function (c) { return c.id; });

    var porCluster = ids.map(function (id) {
      var c = C.porId(id);
      var campos = {}, marc = [];
      SUPERFICIES.forEach(function (s) {
        var cov = C.coberturaTexto(textoDe(L, s.id), [id])[id];
        campos[s.id] = !!(cov && cov.presente);
        if (cov && cov.marcadores) cov.marcadores.forEach(function (m) { if (marc.indexOf(m) === -1) marc.push(m); });
      });
      // cubierto en superficie visible (lo que leen COSMO/Rufus)
      var cubierto = SUPERFICIES.some(function (s) { return s.visible && campos[s.id]; });
      var soloBackend = !cubierto && campos.backend;
      return {
        id: id, nombre: c ? c.nombre : id, elegido: !!(elegidos && elegidos.length),
        cubierto: cubierto, soloBackend: soloBackend, campos: campos, marcadores: marc
      };
    });

    var total = porCluster.length;
    var cubiertos = porCluster.filter(function (c) { return c.cubierto; }).length;
    var faltantes = porCluster.filter(function (c) { return !c.cubierto; }).map(function (c) { return c.id; });
    var pct = total ? Math.round(cubiertos / total * 100) : 0;
    var estado = total === 0 ? 'pendiente'
      : (cubiertos === total ? 'go' : (cubiertos > 0 ? 'alerta' : 'nogo'));

    return {
      ok: true, dirigido: !!(elegidos && elegidos.length),
      porCluster: porCluster, total: total, cubiertos: cubiertos,
      faltantes: faltantes, pct: pct, estado: estado
    };
  }

  /* ---------- texto para el modelo ---------- */
  var EMO = { go: '🟢', alerta: '🟠', nogo: '🔴', pendiente: '⚪' };

  function texto(r) {
    if (!r || !r.ok) return 'MOTOR COBERTURA: sin resultado (¿cargó cz-intent-core.js?).';
    var o = 'MOTOR COBERTURA SEMÁNTICA — YA CALCULADO POR LA APLICACION\n\n';
    o += 'COBERTURA DE INTENCION: ' + EMO[r.estado] + ' ' + r.cubiertos + '/' + r.total +
         ' clusters' + (r.dirigido ? ' del ángulo elegido' : '') + ' cubiertos en superficie visible (' + r.pct + '%).\n';
    r.porCluster.forEach(function (c) {
      var donde = ['titulo', 'highlights', 'vinetas', 'descripcion', 'backend']
        .filter(function (k) { return c.campos[k]; });
      o += '  - ' + c.nombre + ': ' + (c.cubierto ? 'CUBIERTO' : (c.soloBackend ? 'SOLO EN BACKEND' : 'FALTA')) +
           (donde.length ? ' [' + donde.join(', ') + ']' : '') +
           (c.marcadores.length ? ' (' + c.marcadores.slice(0, 4).join(', ') + ')' : '') + '\n';
    });
    o += '\nINSTRUCCION: estos semáforos YA se le mostraron al estudiante. NO los recalcules. ' +
         'Tu trabajo: por cada cluster que FALTA, redacta cómo incorporarlo con naturalidad (sin keyword-stuffing) ' +
         'en el título, un bullet o la descripción — y verifica que los que ya están se lean como beneficio real, ' +
         'no como relleno. La cobertura de intención pesa tanto como la de keywords.';
    return o;
  }

  /* ---------- pintado ---------- */
  function marca(ok) {
    return ok ? '<span class="s-cob-y">✓</span>' : '<span class="s-cob-n">·</span>';
  }

  function fila(c) {
    var estado = c.cubierto ? 'go' : (c.soloBackend ? 'alerta' : 'nogo');
    var celdas = SUPERFICIES.map(function (s) {
      return '<td class="s-cob-cell" title="' + esc(s.nombre) + '">' + marca(c.campos[s.id]) + '</td>';
    }).join('');
    var etiqueta = c.cubierto ? '✅ Cubierto' : (c.soloBackend ? '⚠️ Solo backend' : '❌ Falta');
    return '<tr class="s-cob-row s-cob-' + estado + '">' +
      '<td class="s-cob-name">' + esc(c.nombre) + '</td>' + celdas +
      '<td class="s-cob-tag">' + etiqueta + '</td></tr>';
  }

  function html(r) {
    if (!r || !r.ok || !r.total) return null;
    var cab = SUPERFICIES.map(function (s) {
      return '<th class="s-cob-h" title="' + esc(s.nombre) + '">' + esc(s.nombre.split(' ')[0]) + '</th>';
    }).join('');
    var filas = r.porCluster.map(fila).join('');
    var sub = r.dirigido
      ? 'de los clusters de intención que elegiste como ángulo en Sophie Producto'
      : 'de los 6 clusters de intención (diagnóstico general)';
    var falta = r.faltantes.length
      ? '<div class="s-cob-falta">Faltan por cubrir en superficie visible: <b>' +
        r.porCluster.filter(function (c) { return !c.cubierto; }).map(function (c) { return esc(c.nombre); }).join(', ') +
        '</b>. Ese es el hueco que Rufus y COSMO no te van a leer.</div>'
      : '<div class="s-cob-ok">Todos los clusters de tu ángulo están cubiertos en el texto visible. 🎯</div>';

    return '<div class="s-cob">' +
      '<div class="s-cob-head"><div class="s-cob-tagline">Capa 2 · Cobertura semántica de intención</div>' +
        '<h3>' + r.cubiertos + ' de ' + r.total + ' intenciones cubiertas <span class="s-cob-pct s-cob-' + r.estado + '">' + r.pct + '%</span></h3>' +
        '<p class="s-cob-lead">Chequeo ' + sub + '.</p></div>' +
      '<div class="s-cob-scroll"><table class="s-cob-tabla"><thead><tr><th class="s-cob-h">Cluster</th>' + cab + '<th class="s-cob-h"></th></tr></thead>' +
      '<tbody>' + filas + '</tbody></table></div>' + falta + '</div>';
  }

  var CSS =
    '.s-cob{font-family:inherit}' +
    '.s-cob-head{margin:0 0 12px}' +
    '.s-cob-tagline{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--why-tx,#BA7517);margin-bottom:6px}' +
    '.s-cob-head h3{font-size:18px;font-weight:800;color:var(--texto);margin:0 0 4px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
    '.s-cob-pct{font-size:12px;font-weight:800;padding:3px 9px;border-radius:999px}' +
    '.s-cob-lead{font-size:13px;color:var(--texto-2);margin:0}' +
    '.s-cob-scroll{overflow-x:auto}' +
    '.s-cob-tabla{width:100%;border-collapse:collapse;font-size:13px;min-width:420px}' +
    '.s-cob-h{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--texto-2);padding:6px 8px;text-align:center;border-bottom:2px solid var(--borde);white-space:nowrap}' +
    '.s-cob-h:first-child{text-align:left}' +
    '.s-cob-name{font-weight:700;color:var(--texto);padding:9px 8px;border-bottom:1px solid var(--borde);white-space:nowrap}' +
    '.s-cob-cell{text-align:center;padding:9px 8px;border-bottom:1px solid var(--borde)}' +
    '.s-cob-tag{text-align:right;padding:9px 8px;border-bottom:1px solid var(--borde);font-size:11px;font-weight:700;white-space:nowrap}' +
    '.s-cob-y{color:var(--check,#1D9E75);font-weight:800}' +
    '.s-cob-n{color:var(--texto-2);opacity:.45}' +
    '.s-cob-go .s-cob-name{color:var(--exito-tx,#1A5E43)}' +
    '.s-cob-nogo .s-cob-name{color:var(--rojo,#D9534F)}' +
    '.s-cob-pct.s-cob-go{background:var(--exito-bg,#ECFDF3);color:var(--exito-tx,#1A5E43)}' +
    '.s-cob-pct.s-cob-alerta{background:var(--why-bg,#FFF8EC);color:var(--why-tx,#BA7517)}' +
    '.s-cob-pct.s-cob-nogo{background:rgba(217,83,79,.13);color:var(--rojo,#D9534F)}' +
    '.s-cob-falta{margin-top:12px;font-size:12.5px;line-height:1.55;color:var(--texto-2);background:var(--why-bg,#FFF8EC);border:1px solid rgba(247,170,46,.35);border-radius:10px;padding:11px 13px}' +
    '.s-cob-ok{margin-top:12px;font-size:12.5px;color:var(--exito-tx,#1A5E43);background:var(--exito-bg,#ECFDF3);border:1px solid var(--check,#1D9E75);border-radius:10px;padding:11px 13px}';

  function asegurarEstilo() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sophie-cob-css')) return;
    var s = document.createElement('style');
    s.id = 'sophie-cob-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function pintar(container, L, elegidos) {
    var r = (L && L.ok && L.porCluster) ? L : evaluar(L, elegidos);
    var h = html(r);
    if (!h || !container) return false;
    asegurarEstilo();
    container.innerHTML = h;
    return true;
  }

  global.SophieCobertura = {
    version: '1.0',
    disponible: disponible,
    superficies: SUPERFICIES,
    evaluar: evaluar,
    texto: texto,
    html: html,
    pintar: pintar
  };

})(typeof window !== 'undefined' ? window : this);
