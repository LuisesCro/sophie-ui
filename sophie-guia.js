/* ============================================================
   SOPHIE · GUÍA v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-guia.js

   Puente entre el modelo y las pantallas guiadas (pasos 1-5 y 7).

   Requiere: sophie-pasos.js cargado antes.

   En estos pasos Sophie ya no escribe la pantalla. Emite:
     <!--PASO:{"paso":3,"reaccion":"...","vars":{...},"chips":[...]}-->

   y este archivo la arma desde el guion local. Salida del modelo:
   de ~1,200 tokens a ~40.

   ESCAPE: si el turno es genuinamente generativo (evaluar candidatos,
   corregir una keyword, un caso raro), Sophie escribe HTML como
   siempre y aquí no pasa nada. Degradación limpia.
   ============================================================ */

(function (global) {
  'use strict';

  var MARCA = /<!--PASO:([\s\S]*?)-->/;

  function disponible() {
    return !!global.SophiePasos;
  }

  // ¿Ya llegó el marcador completo en el texto acumulado?
  function detectar(texto) {
    var m = MARCA.exec(texto || '');
    if (!m) return null;
    try {
      var p = JSON.parse(m[1].trim());
      return (p && p.paso) ? p : null;
    } catch (e) {
      return null; // aún llega incompleto
    }
  }

  function limpiar(texto) {
    return String(texto || '')
      .replace(MARCA, '')
      .replace(/<!--[PM]:[^>]*-->/g, '')
      .trim();
  }

  // Devuelve el HTML de la pantalla, o null si ese paso no tiene guion.
  function html(payload) {
    if (!disponible() || !payload || !payload.paso) return null;
    return global.SophiePasos.pantalla(payload.paso, {
      reaccion: payload.reaccion || '',
      chips: payload.chips || [],
      vars: payload.vars || {},
      win: payload.win === true
    });
  }

  // Pinta dentro de un contenedor .landing ya existente.
  // Devuelve true si pudo pintar.
  function pintar(container, payload) {
    var h = html(payload);
    if (!h || !container) return false;
    container.innerHTML = h;
    return true;
  }

  /* ---------- pantalla de bienvenida sin llamar a la API ---------- */

  // El paso 1 es idéntico para todos los estudiantes. No hay nada que
  // generar: se pinta al instante al entrar, sin esperar al modelo.
  function bienvenida(container) {
    if (!disponible() || !container) return false;
    container.innerHTML = global.SophiePasos.pantalla(1);
    return true;
  }

  // El turno equivalente que se guarda en el historial, para que la
  // conversación siga coherente aunque el modelo nunca lo haya escrito.
  function turnoBienvenida() {
    return '<!--PASO:{"paso":1}-->';
  }

  global.SophieGuia = {
    version: '1.0',
    disponible: disponible,
    detectar: detectar,
    limpiar: limpiar,
    html: html,
    pintar: pintar,
    bienvenida: bienvenida,
    turnoBienvenida: turnoBienvenida
  };

})(window);
