/* ============================================================
   SOPHIE · CANDIDATOS v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-candidatos.js

   Puente entre el modelo y la pantalla de EVALUACIÓN DE CANDIDATOS
   (el turno donde Sophie pasa los 3-5 productos por el filtro rápido
   de descarte, entre el paso 3 y el 4).

   En ese turno Sophie ya no escribe HTML ni prosa. Emite:
     <!--CANDIDATOS_PRODUCTO:{
       "paso":3,                         // opcional (barra de progreso)
       "titulo":"Evalué tus 3 candidatos",   // opcional
       "intro":"Los pasé por el filtro…",    // opcional
       "candidatos":[
         { "nombre":"Dog Scratch Pad for Nails",
           "veredicto":"precaucion",     // viable | precaucion | descartado
           "chipTexto":"Con precaución", // opcional (texto corto del chip)
           "etiquetas":["Físico simple","Sin marca"],
           "notaTitulo":"Revisa antes de decidir",   // opcional
           "nota":"…",                   // opcional
           "conclusion":"Candidato viable, con precaución." }
       ],
       "recomendacion":"…",              // opcional
       "cta":"¿Con cuál seguimos? Dime el nombre 👇"  // opcional
     }-->

   y este archivo lo dibuja como tarjetas — una por candidato, con el
   veredicto de un vistazo. El diseño vive AQUÍ, no en el prompt: así
   es idéntico siempre y no depende de que el modelo escriba bien el HTML.

   Requiere: SophiePasos cargado antes (para la cabecera con la barra de
   progreso). Si no está, degrada sin cabecera. Todo el texto del modelo
   se escapa: un candidato no puede inyectar HTML.

   ESCAPE: si el marcador llega roto o incompleto (streaming), detectar()
   devuelve null y la página cae al formato normal. Degradación limpia.
   ============================================================ */

(function (global) {
  'use strict';

  var MARCA = /<!--CANDIDATOS_PRODUCTO:([\s\S]*?)-->/;

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function disponible() { return true; }

  // ¿Ya llegó el marcador completo y con al menos un candidato?
  function detectar(texto) {
    var m = MARCA.exec(texto || '');
    if (!m) return null;
    try {
      var p = JSON.parse(m[1].trim());
      return (p && Array.isArray(p.candidatos) && p.candidatos.length) ? p : null;
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

  /* ---------- veredicto → estilo ---------- */

  var VEREDICTOS = {
    viable:     { clase: 'ok',   emoji: '✅', label: 'Viable' },
    go:         { clase: 'ok',   emoji: '✅', label: 'Viable' },
    ok:         { clase: 'ok',   emoji: '✅', label: 'Viable' },
    precaucion: { clase: 'warn', emoji: '⚠️', label: 'Con precaución' },
    revisar:    { clase: 'warn', emoji: '⚠️', label: 'Con precaución' },
    warn:       { clase: 'warn', emoji: '⚠️', label: 'Con precaución' },
    descartado: { clase: 'no',   emoji: '❌', label: 'Descartado' },
    nogo:       { clase: 'no',   emoji: '❌', label: 'Descartado' },
    no:         { clase: 'no',   emoji: '❌', label: 'Descartado' }
  };

  function veredictoDe(v) {
    var k = String(v || 'precaucion').toLowerCase().replace(/[^a-z]/g, '');
    return VEREDICTOS[k] || VEREDICTOS.precaucion;
  }

  /* ---------- armado del HTML ---------- */

  function tarjeta(c) {
    c = c || {};
    var v = veredictoDe(c.veredicto);
    var chip = v.emoji + ' ' + esc(c.chipTexto || v.label);

    var etiquetas = Array.isArray(c.etiquetas) ? c.etiquetas.slice(0, 5) : [];
    var tags = etiquetas.length
      ? '<div class="s-cand-tags">' + etiquetas.map(function (t) {
          return '<span class="s-cand-tag">' + esc(t) + '</span>';
        }).join('') + '</div>'
      : '';

    var nota = c.nota
      ? '<p class="s-cand-note ' + v.clase + '">' +
          (c.notaTitulo ? '<span class="s-cand-nlbl">' + esc(c.notaTitulo) + '</span>' : '') +
          esc(c.nota) + '</p>'
      : '';

    var concl = c.conclusion
      ? '<p class="s-cand-concl">→ ' + esc(c.conclusion) + '</p>'
      : '';

    return '<div class="s-cand ' + v.clase + '">' +
      '<div class="s-cand-stripe"></div>' +
      '<div class="s-cand-in">' +
        '<div class="s-cand-head">' +
          '<span class="s-cand-name">' + esc(c.nombre) + '</span>' +
          '<span class="s-cand-verdict ' + v.clase + '">' + chip + '</span>' +
        '</div>' +
        tags + nota + concl +
      '</div></div>';
  }

  function cabecera(payload) {
    var paso = (payload && payload.paso) ? payload.paso : 3;
    if (global.SophiePasos && global.SophiePasos.cabecera) {
      return global.SophiePasos.cabecera(paso);
    }
    return ''; // sin SophiePasos: degrada sin cabecera
  }

  function cuerpo(payload) {
    var n = payload.candidatos.length;
    var titulo = payload.titulo
      ? esc(payload.titulo)
      : ('Evalué tus ' + n + ' candidato' + (n === 1 ? '' : 's'));
    var intro = payload.intro
      ? esc(payload.intro)
      : 'Los pasé por el filtro de descarte rápido de 60 segundos. Este es el veredicto de cada uno:';

    var cards = payload.candidatos.map(tarjeta).join('');

    var rec = payload.recomendacion
      ? '<div class="s-cand-rec"><p class="s-cand-rec-t">★ Mi recomendación</p>' +
        '<p>' + esc(payload.recomendacion) + '</p></div>'
      : '';

    var cta = '<div class="s-cta">' +
      esc(payload.cta || '¿Con cuál seguimos? Dime el nombre 👇') + '</div>';

    return '<div class="s-body">' +
      '<h1>' + titulo + '</h1>' +
      '<p class="s-lead">' + intro + '</p>' +
      cards + rec + cta +
      '</div>';
  }

  // Devuelve el HTML de la pantalla, o null si no hay candidatos.
  function html(payload) {
    if (!payload || !Array.isArray(payload.candidatos) || !payload.candidatos.length) return null;
    return cabecera(payload) + cuerpo(payload);
  }

  /* ---------- estilos (se inyectan una vez, con las variables del tema) ----------
     Usa las variables semánticas que existen en AMBOS temas (claro en la
     página, oscuro en sophie-oscuro.css): --check/--exito-* (verde),
     --why-* (ámbar), --rojo/--riesgo (rojo), --borde, --texto, --texto-2.
     Así la pantalla se adapta sola al tema que cargue la página. */

  var CSS =
    '.s-cand{display:flex;border:1px solid var(--borde);border-radius:14px;overflow:hidden;margin:0 0 14px;background:rgba(127,127,127,.05)}' +
    '.s-cand-stripe{width:5px;flex:none}' +
    '.s-cand.ok .s-cand-stripe{background:var(--check,#1D9E75)}' +
    '.s-cand.warn .s-cand-stripe{background:var(--why-tx,#BA7517)}' +
    '.s-cand.no .s-cand-stripe{background:var(--rojo,#D9534F)}' +
    '.s-cand-in{padding:15px 17px;flex:1;min-width:0}' +
    '.s-cand-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:11px}' +
    '.s-cand-name{font-weight:800;font-size:15.5px;color:var(--texto);letter-spacing:-.01em}' +
    '.s-cand-verdict{flex:none;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:999px;white-space:nowrap}' +
    '.s-cand-verdict.ok{background:var(--exito-bg,#ECFDF3);color:var(--exito-tx,#1A5E43);border:1px solid var(--check,#1D9E75)}' +
    '.s-cand-verdict.warn{background:var(--why-bg,#FFF8EC);color:var(--why-tx,#BA7517);border:1px solid var(--why-tx,#BA7517)}' +
    '.s-cand-verdict.no{background:rgba(217,83,79,.13);color:var(--rojo,#D9534F);border:1px solid var(--rojo,#D9534F)}' +
    '.s-cand-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 11px}' +
    '.s-cand-tag{font-size:12px;color:var(--texto-2);background:rgba(127,127,127,.08);border:1px solid var(--borde);border-radius:8px;padding:3px 9px}' +
    '.s-cand-note{font-size:13px;line-height:1.6;border-radius:11px;padding:11px 13px;margin:0;color:var(--texto-2)}' +
    '.s-cand-nlbl{display:block;margin-bottom:5px;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}' +
    '.s-cand-note.warn{background:var(--why-bg,#FFF8EC);border:1px solid rgba(247,170,46,.35)}' +
    '.s-cand-note.warn .s-cand-nlbl{color:var(--why-tx,#BA7517)}' +
    '.s-cand-note.ok{background:var(--exito-bg,#ECFDF3);border:1px solid rgba(47,191,135,.35)}' +
    '.s-cand-note.ok .s-cand-nlbl{color:var(--exito-tx,#1A5E43)}' +
    '.s-cand-note.no{background:rgba(217,83,79,.10);border:1px solid rgba(217,83,79,.32)}' +
    '.s-cand-note.no .s-cand-nlbl{color:var(--rojo,#D9534F)}' +
    '.s-cand-concl{font-size:13px;font-weight:700;margin:11px 0 0;color:var(--texto)}' +
    '.s-cand-rec{background:var(--exito-bg,#ECFDF3);border:1px solid var(--check,#1D9E75);border-radius:14px;padding:15px 17px;margin:6px 0 14px}' +
    '.s-cand-rec-t{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--exito-tx,#1A5E43);margin:0 0 7px}' +
    '.s-cand-rec p{margin:0;font-size:14px;line-height:1.6;color:var(--texto-2)}';

  function asegurarEstilo() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sophie-cand-css')) return;
    var s = document.createElement('style');
    s.id = 'sophie-cand-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  // Pinta dentro de un contenedor .landing ya existente. Devuelve true si pudo.
  function pintar(container, payload) {
    var h = html(payload);
    if (!h || !container) return false;
    asegurarEstilo();
    container.innerHTML = h;
    return true;
  }

  global.SophieCandidatos = {
    version: '1.0',
    disponible: disponible,
    detectar: detectar,
    limpiar: limpiar,
    html: html,
    pintar: pintar
  };

})(window);
