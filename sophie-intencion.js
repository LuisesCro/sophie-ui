/* ============================================================
   SOPHIE · INTENCIÓN v1.0  —  Capa 2 (Selección Intent-First 3.0)
   Crezcamos Online — ui.crezcamosonline.com/sophie-intencion.js

   La capa semántica del método: clasifica el master keyword list en
   los 6 clusters de intención (criterio 14), mide la cola larga
   conversacional (criterio 15) y detecta las BRECHAS — clusters con
   demanda real que ningún competidor top está sirviendo.

   REPARTO DE TRABAJO (igual que el resto de la suite):
   - El modelo solo EXTRAE el keyword list del pegado del alumno y lo
     emite como marcador <!--INTENCION:{...}-->. No clasifica ni cuenta.
   - Este archivo hace TODA la aritmética: clasificación por marcadores,
     SV por cluster, % del nicho, ratio de cola larga y candidatos a
     brecha. Determinista: el mismo pegado da el mismo panel siempre.
   - El modelo, después, INTERPRETA los huérfanos y redacta el ángulo
     de entrada — lo que un archivo no puede escribir.

   Umbrales y taxonomía viven en sophie-criterios.js (fuente única).
   Si SophieCriterios no cargó, degrada con una taxonomía mínima local.

   ESCAPE: si el marcador llega roto o incompleto (streaming), detectar()
   devuelve null y la página cae al formato normal. Degradación limpia.
   ============================================================ */

(function (global) {
  'use strict';

  var MARCA = /<!--INTENCION:([\s\S]*?)-->/;

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function disponible() { return true; }

  /* ---------- fuente de la metodología (con respaldo si no cargó) ---------- */

  function criterios() { return global.SophieCriterios || null; }

  var CLUSTERS_FALLBACK = [
    { id: 'ocasion', nombre: 'Ocasión / Regalo', marcadores: ['gift', 'birthday', 'wedding', 'christmas', 'present'] },
    { id: 'audiencia', nombre: 'Audiencia', marcadores: ['beginner', 'starter', 'kids', 'women', 'men'] },
    { id: 'uso', nombre: 'Uso / Ritual', marcadores: ['ceremonial', 'traditional', 'travel', 'camping', 'office'] },
    { id: 'modernidad', nombre: 'Modernidad / Conveniencia', marcadores: ['electric', 'shaker', 'portable', 'usb', 'maker'] },
    { id: 'problema', nombre: 'Problema / Atributo', marcadores: ['non slip', 'bamboo', 'ceramic', 'waterproof', 'stainless'] },
    { id: 'formato', nombre: 'Formato / Componente', marcadores: ['set', 'kit', 'bowl', 'pack', 'with'] }
  ];

  function taxonomia() {
    var C = criterios();
    return (C && C.clusters && C.clusters.length) ? C.clusters : CLUSTERS_FALLBACK;
  }
  function umbralHuerfano() {
    var C = criterios();
    return (C && C.clusterHuerfano) ? C.clusterHuerfano : { svPctNicho: 2, svAbsoluto: 5000 };
  }
  function palabrasLargas() {
    var C = criterios();
    return (C && C.longTailPalabras) ? C.longTailPalabras : 4;
  }

  /* ---------- detección / limpieza del marcador ---------- */

  function detectar(texto) {
    var m = MARCA.exec(texto || '');
    if (!m) return null;
    try {
      var p = JSON.parse(m[1].trim());
      return (p && Array.isArray(p.keywords) && p.keywords.length) ? p : null;
    } catch (e) {
      return null; // aún llega incompleto o está roto
    }
  }

  function limpiar(texto) {
    return String(texto || '')
      .replace(MARCA, '')
      .replace(/<!--[PM]:[^>]*-->/g, '')
      .trim();
  }

  /* ---------- normalización y conteo de palabras ---------- */

  // Baja a minúsculas y deja solo alfanumérico separado por espacios, para que
  // "Non-Slip", "2-Pack" y "BPA Free" comparen sin sorpresas de puntuación.
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function contarPalabras(kwNorm) {
    if (!kwNorm) return 0;
    return kwNorm.split(' ').filter(Boolean).length;
  }

  // ¿El marcador aparece como palabra/frase completa dentro de la keyword?
  function contiene(kwNorm, marcador) {
    var mk = norm(marcador);
    if (!mk) return false;
    return (' ' + kwNorm + ' ').indexOf(' ' + mk + ' ') !== -1;
  }

  // Primer cluster (en orden de la taxonomía) cuyo marcador aparezca. La
  // taxonomía va de intención específica a componente genérico a propósito.
  function clusterDe(kwNorm, tax) {
    for (var i = 0; i < tax.length; i++) {
      var marc = tax[i].marcadores || [];
      for (var j = 0; j < marc.length; j++) {
        if (contiene(kwNorm, marc[j])) return tax[i].id;
      }
    }
    return 'generico';
  }

  function n(v) { v = parseFloat(v); return isFinite(v) && v > 0 ? v : 0; }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* ============================================================
     CLASIFICACIÓN — el cálculo determinista
     entrada: { nicho, keywords:[{kw, sv}], cubiertos:[idCluster] (opcional) }
     ============================================================ */
  function clasificar(payload) {
    payload = payload || {};
    var tax = taxonomia();
    var UH = umbralHuerfano();
    var minPalabras = palabrasLargas();

    var cubiertos = Array.isArray(payload.cubiertos) ? payload.cubiertos.slice() : null;

    // acumuladores por cluster (+ genérico)
    var acc = {};
    tax.forEach(function (c) { acc[c.id] = { id: c.id, nombre: c.nombre, sv: 0, kw: 0, ejemplos: [] }; });
    acc.generico = { id: 'generico', nombre: 'Genérico / Head', sv: 0, kw: 0, ejemplos: [] };

    var totalSV = 0, totalKw = 0, largas = 0;

    (payload.keywords || []).forEach(function (item) {
      var kwRaw = item && (item.kw !== undefined ? item.kw : item.keyword);
      if (kwRaw === undefined || kwRaw === null || String(kwRaw).trim() === '') return;
      var sv = n(item.sv !== undefined ? item.sv : item.searchVolume);
      var kwNorm = norm(kwRaw);
      if (!kwNorm) return;

      totalKw += 1; totalSV += sv;
      if (contarPalabras(kwNorm) >= minPalabras) largas += 1;

      var cid = clusterDe(kwNorm, tax);
      var a = acc[cid] || acc.generico;
      a.sv += sv; a.kw += 1;
      if (a.ejemplos.length < 3) a.ejemplos.push(String(kwRaw).trim());
    });

    // arma la lista de clusters (sin el genérico), ordenada por SV desc
    var lista = tax.map(function (c) {
      var a = acc[c.id];
      var pctSV = totalSV > 0 ? a.sv / totalSV * 100 : 0;
      var demandaOk = (pctSV >= UH.svPctNicho) || (a.sv >= UH.svAbsoluto);
      var cubierto = cubiertos ? (cubiertos.indexOf(c.id) !== -1) : null;
      // Huérfano de verdad = tiene demanda Y ningún top-5 lo cubre.
      // Sin dato de cobertura, queda como "candidato" (lo confirma el juicio).
      var huerfano = demandaOk && cubierto === false;
      return {
        id: c.id, nombre: c.nombre, sv: a.sv, kw: a.kw,
        pctSV: r1(pctSV), demandaOk: demandaOk,
        cubierto: cubierto, huerfano: huerfano, ejemplos: a.ejemplos
      };
    }).sort(function (x, y) { return y.sv - x.sv; });

    var gen = acc.generico;
    var generico = { sv: gen.sv, kw: gen.kw, pctSV: totalSV > 0 ? r1(gen.sv / totalSV * 100) : 0 };

    // criterio 15 — cola larga conversacional
    var ltPct = totalKw > 0 ? largas / totalKw * 100 : 0;
    var ltEstado = ltPct >= 30 ? 'go' : (ltPct >= 15 ? 'alerta' : 'nogo');

    // criterio 14 — brecha de intención
    var candidatos = lista.filter(function (c) { return c.demandaOk; }).map(function (c) { return c.id; });
    var huerfanos = lista.filter(function (c) { return c.huerfano; }).map(function (c) { return c.id; });
    var brechaEstado;
    if (cubiertos === null) {
      brechaEstado = 'pendiente'; // falta confirmar cobertura de competidores
    } else {
      brechaEstado = huerfanos.length >= 2 ? 'go' : (huerfanos.length === 1 ? 'alerta' : 'nogo');
    }

    return {
      ok: true,
      nicho: payload.nicho ? String(payload.nicho) : '',
      // Interpretación del modelo (opcional): el ángulo de entrada y el CTA.
      // El motor NO los inventa; si el modelo los manda, se pintan.
      recomendacion: payload.recomendacion ? String(payload.recomendacion) : '',
      ctaTexto: payload.ctaTexto ? String(payload.ctaTexto) : '',
      totalSV: totalSV, totalKw: totalKw,
      clusters: lista, generico: generico,
      longTail: { largas: largas, pct: r1(ltPct), estado: ltEstado, minPalabras: minPalabras },
      brecha: {
        candidatos: candidatos, huerfanos: huerfanos,
        estado: brechaEstado, coberturaConocida: cubiertos !== null,
        umbral: UH
      }
    };
  }

  /* ============================================================
     TEXTO PARA EL MODELO — que interprete, no que recalcule
     ============================================================ */
  var EMO = { go: '🟢', alerta: '🟠', nogo: '🔴', pendiente: '⚪' };

  function texto(r) {
    if (!r || !r.ok) return 'MOTOR INTENCION: sin resultado.';
    var o = 'MOTOR INTENCION (Capa 2 Intent-First) — YA CALCULADO POR LA APLICACION\n\n';
    o += 'NICHO: ' + (r.nicho || '(sin nombre)') + ' · ' + r.totalKw + ' keywords · ' +
         r.totalSV.toLocaleString('en') + ' SV total\n\n';
    o += 'CLUSTERS DE INTENCION (SV · #kw · % del nicho):\n';
    r.clusters.forEach(function (c) {
      o += '  - ' + c.nombre + ': ' + c.sv.toLocaleString('en') + ' SV · ' + c.kw + ' kws · ' +
           c.pctSV + '%' + (c.demandaOk ? '  [demanda suficiente' +
           (c.cubierto === false ? ' · SIN DUENO -> HUERFANO' : (c.cubierto === true ? ' · cubierto' : ' · candidato a brecha')) + ']' : '') +
           (c.ejemplos.length ? '  (ej: ' + c.ejemplos.join(', ') + ')' : '') + '\n';
    });
    o += '  - Genérico / Head: ' + r.generico.sv.toLocaleString('en') + ' SV · ' + r.generico.kw + ' kws · ' + r.generico.pctSV + '%\n\n';
    o += 'CRITERIO 14 BRECHA DE INTENCION: ' + EMO[r.brecha.estado] + ' ' + r.brecha.estado.toUpperCase();
    if (r.brecha.estado === 'pendiente') {
      o += ' — hay ' + r.brecha.candidatos.length + ' cluster(s) con demanda suficiente. ' +
           'Para cerrarlo dime cuáles de esos clusters NO están cubiertos explícitamente por los top 5 (título/bullets/A+). ' +
           'Con ≥2 sin dueño = GO.\n';
    } else {
      o += ' — ' + r.brecha.huerfanos.length + ' cluster(s) huérfano(s).\n';
    }
    o += 'CRITERIO 15 LONG-TAIL CONVERSACIONAL: ' + EMO[r.longTail.estado] + ' ' + r.longTail.estado.toUpperCase() +
         ' — ' + r.longTail.pct + '% de las keywords tienen ' + r.longTail.minPalabras + '+ palabras (' +
         r.longTail.largas + ' de ' + r.totalKw + ').\n\n';
    o += 'INSTRUCCION: estos números y semáforos YA se le mostraron al estudiante en pantalla. NO los recalcules ' +
         'ni los repitas en tablas. Tu trabajo es lo que un archivo no puede: (1) confirmar con él cuáles clusters ' +
         'con demanda están HUERFANOS (sin dueño en los top 5), (2) explicar por qué esa brecha es el ángulo de ' +
         'entrada, y (3) redactar el ángulo concreto (para quién, qué intención domina, cómo se refleja en título/' +
         'bullets/atributos). Si la brecha queda en 0 huérfanos, dilo con franqueza: sin brecha semántica el nicho ' +
         'es commodity y se entra solo con ventaja de costos.';
    return o;
  }

  /* ============================================================
     PINTADO — el panel visual (barras de clusters + brecha)
     ============================================================ */

  function chip(estado, txt) {
    return '<span class="s-int-pill s-int-' + estado + '">' + EMO[estado] + ' ' + esc(txt) + '</span>';
  }

  function barra(c, maxSV) {
    var w = maxSV > 0 ? Math.max(2, Math.round(c.sv / maxSV * 100)) : 2;
    var esBrecha = c.huerfano || (c.demandaOk && c.cubierto !== true);
    var flag = c.huerfano ? '<span class="s-int-flag huer">⚠️ Huérfano</span>'
      : (c.demandaOk && c.cubierto !== true ? '<span class="s-int-flag cand">⚠️ Candidato a brecha</span>' : '');
    return '<div class="s-int-row">' +
      '<div class="s-int-name">' + esc(c.nombre) + flag + '</div>' +
      '<div class="s-int-track"><div class="s-int-fill' + (esBrecha ? ' brecha' : '') +
        '" style="width:' + w + '%"></div></div>' +
      '<div class="s-int-val">' + c.sv.toLocaleString('en') + ' SV · ' + c.kw + ' kw</div>' +
    '</div>';
  }

  function cuerpo(r) {
    var maxSV = r.clusters.reduce(function (m, c) { return Math.max(m, c.sv); }, 0);
    var barras = r.clusters.map(function (c) { return barra(c, maxSV); }).join('');

    var lt = r.longTail;
    var brecha = r.brecha;

    var resumenBrecha;
    if (brecha.estado === 'pendiente') {
      resumenBrecha = brecha.candidatos.length
        ? '<b>' + brecha.candidatos.length + '</b> cluster(s) con demanda suficiente para ser una brecha. ' +
          'Sophie confirmará contigo cuáles no tienen dueño en los top 5.'
        : 'Ningún cluster llega al umbral de demanda para ser una brecha rentable.';
    } else {
      resumenBrecha = '<b>' + brecha.huerfanos.length + '</b> cluster(s) huérfano(s) — con demanda y sin dueño.';
    }

    var titulo = r.nicho ? 'Mapa de intención · ' + esc(r.nicho) : 'Mapa de intención';

    return '<div class="s-int">' +
      '<div class="s-int-head">' +
        '<div class="s-int-tag">Capa 2 · Brecha de intención (COSMO)</div>' +
        '<h1>' + titulo + '</h1>' +
        '<p class="s-int-lead">' + r.totalKw + ' keywords · ' + r.totalSV.toLocaleString('en') +
        ' de volumen · clasificadas en 6 intenciones de compra.</p>' +
      '</div>' +
      '<div class="s-int-bars">' + barras + '</div>' +
      '<div class="s-int-cards">' +
        '<div class="s-int-card">' +
          '<div class="s-int-c-top">Criterio 14 · Brecha de intención ' + chip(brecha.estado, brecha.estado === 'pendiente' ? 'Por confirmar' : brecha.estado.toUpperCase()) + '</div>' +
          '<p>' + resumenBrecha + '</p>' +
        '</div>' +
        '<div class="s-int-card">' +
          '<div class="s-int-c-top">Criterio 15 · Long-tail conversacional ' + chip(lt.estado, lt.estado.toUpperCase()) + '</div>' +
          '<p><b>' + lt.pct + '%</b> de las keywords tienen ' + lt.minPalabras + '+ palabras (' + lt.largas + ' de ' + r.totalKw + ') — lenguaje que Rufus y Alexa interceptan.</p>' +
        '</div>' +
      '</div>' +
      (r.recomendacion
        ? '<div class="s-int-angulo"><p class="s-int-a-t">★ Ángulo de entrada</p><p>' + esc(r.recomendacion) + '</p></div>'
        : '') +
      '<div class="s-int-cta">' + esc(r.ctaTexto || (brecha.estado === 'pendiente'
        ? '¿Cuáles de estos clusters con demanda NO están en los títulos/bullets de los top 5? 👇'
        : 'Sigamos con el ángulo de entrada 👇')) + '</div>' +
    '</div>';
  }

  function html(payload) {
    // acepta el resultado ya clasificado o el payload crudo del marcador
    var r = (payload && payload.ok && payload.clusters) ? payload : clasificar(payload);
    // Sin keywords clasificadas no hay mapa que pintar: degrada a null.
    if (!r || !r.ok || !r.totalKw) return null;
    return cuerpo(r);
  }

  /* ---------- estilos (una sola vez, con las variables del tema) ---------- */

  var CSS =
    '.s-int{font-family:inherit}' +
    '.s-int-head{margin:0 0 18px}' +
    '.s-int-tag{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--why-tx,#BA7517);margin-bottom:8px}' +
    '.s-int-head h1{font-size:22px;font-weight:800;letter-spacing:-.01em;color:var(--texto);margin:0 0 6px}' +
    '.s-int-lead{font-size:13.5px;color:var(--texto-2);margin:0}' +
    '.s-int-bars{display:flex;flex-direction:column;gap:9px;margin:0 0 18px}' +
    '.s-int-row{display:grid;grid-template-columns:180px 1fr 130px;align-items:center;gap:12px}' +
    '.s-int-name{font-size:12.5px;font-weight:700;color:var(--texto)}' +
    '.s-int-track{height:20px;background:rgba(127,127,127,.12);border-radius:6px;overflow:hidden}' +
    '.s-int-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--azul,#3271d6),var(--azul-2,#225195));min-width:3px}' +
    '.s-int-fill.brecha{background:linear-gradient(90deg,#7C3AED,#9F67F5)}' +
    '.s-int-val{font-size:11.5px;color:var(--texto-2);text-align:right;white-space:nowrap}' +
    '.s-int-flag{display:inline-block;margin-left:7px;font-size:10px;font-weight:800;letter-spacing:.02em;padding:2px 7px;border-radius:999px;vertical-align:middle}' +
    '.s-int-flag.huer{background:rgba(124,58,237,.15);color:#7C3AED}' +
    '.s-int-flag.cand{background:var(--why-bg,#FFF8EC);color:var(--why-tx,#BA7517)}' +
    '.s-int-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 16px}' +
    '.s-int-card{border:1px solid var(--borde);border-radius:12px;padding:14px 16px;background:rgba(127,127,127,.04)}' +
    '.s-int-c-top{font-size:12px;font-weight:800;color:var(--texto);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}' +
    '.s-int-card p{font-size:12.5px;line-height:1.55;color:var(--texto-2);margin:0}' +
    '.s-int-pill{font-size:10px;font-weight:800;letter-spacing:.04em;padding:3px 9px;border-radius:999px;white-space:nowrap}' +
    '.s-int-go{background:var(--exito-bg,#ECFDF3);color:var(--exito-tx,#1A5E43)}' +
    '.s-int-alerta{background:var(--why-bg,#FFF8EC);color:var(--why-tx,#BA7517)}' +
    '.s-int-nogo{background:rgba(217,83,79,.13);color:var(--rojo,#D9534F)}' +
    '.s-int-pendiente{background:rgba(127,127,127,.14);color:var(--texto-2)}' +
    '.s-int-angulo{background:var(--exito-bg,#ECFDF3);border:1px solid var(--check,#1D9E75);border-radius:12px;padding:14px 16px;margin:0 0 16px}' +
    '.s-int-a-t{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--exito-tx,#1A5E43);margin:0 0 7px}' +
    '.s-int-angulo p:last-child{margin:0;font-size:13px;line-height:1.6;color:var(--texto-2)}' +
    '.s-int-cta{font-size:14px;font-weight:700;color:var(--texto);border:1px dashed var(--borde);border-radius:12px;padding:13px 16px;background:rgba(127,127,127,.03)}' +
    '@media(max-width:560px){.s-int-row{grid-template-columns:120px 1fr;gap:8px}.s-int-val{grid-column:2;text-align:left}.s-int-cards{grid-template-columns:1fr}}';

  function asegurarEstilo() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sophie-int-css')) return;
    var s = document.createElement('style');
    s.id = 'sophie-int-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function pintar(container, payload) {
    var h = html(payload);
    if (!h || !container) return false;
    asegurarEstilo();
    container.innerHTML = h;
    return true;
  }

  global.SophieIntencion = {
    version: '1.0',
    disponible: disponible,
    detectar: detectar,
    limpiar: limpiar,
    clasificar: clasificar,
    texto: texto,
    html: html,
    pintar: pintar
  };

})(typeof window !== 'undefined' ? window : this);
