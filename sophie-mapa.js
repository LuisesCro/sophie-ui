/* ============================================================
   SOPHIE · MAPA DEL MÉTODO v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-mapa.js

   Los 9 pasos, siempre a la vista: dónde está, qué ya hizo, qué
   falta, y el POR QUÉ de cada paso a un clic.

   POR QUÉ EXISTE: "el hecho de automatizar procesos no significa que
   dejemos de enseñar paso a paso la metodología". Cuando el estudiante
   hacía la búsqueda a mano, el método se le quedaba en los dedos —
   tecleaba cada filtro y entendía para qué servía. Ahora la hace
   Sophie, y lo único que le quedaba era una barra con cuatro etapas y
   un número de paso. Eso dice DÓNDE está; no enseña NADA.

   El contenido vive en sophie-pasos.js (`metodo`), que es la fuente
   única. Aquí solo se dibuja. Si ese archivo no cargó, `montar()`
   devuelve false y la página se queda como estaba: sin mapa, pero
   entera.

   LO QUE NO HACE, A PROPÓSITO:
   · No repite los umbrales. Viven en el motor (sophie-criterios.js) y
     duplicarlos aquí crearía la tercera copia de una cifra que ya se
     desincronizó una vez.
   · No cambia de nombres según el estudiante tenga o no datos reales.
     La herramienta es un detalle; el método es el mismo, y un mapa que
     dijera "Black Box" a unos y "Buscar candidatos" a otros estaría
     enseñando dos métodos.
   ============================================================ */

(function (global) {
  'use strict';

  var ABIERTO_KEY = 'sophie_mapa_abierto';
  var raiz = null;      // el contenedor que montamos
  var pasoActual = 0;

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function disponible() {
    return !!(global.SophiePasos && global.SophiePasos.metodo);
  }

  // Lo que el viewer dejó abierto la última vez. Es una comodidad suya y solo
  // suya: si el almacenamiento falla —ventana privada, datos bloqueados— se
  // usa el valor por defecto y no pasa nada.
  //
  // CERRADO POR DEFECTO, y no es una rebaja de la idea. El panel vive en la
  // franja fija de arriba, encima del chat: abierto de entrada, nueve pasos
  // desplegados le comen media pantalla al estudiante antes de que Sophie diga
  // nada. Lo que SIEMPRE se ve es la barra, y la barra ya enseña — dice en qué
  // paso va y CÓMO SE LLAMA ese paso en el método. El mapa entero está a un
  // clic, y si lo deja abierto se queda abierto.
  function recordado() {
    try {
      var v = global.localStorage && global.localStorage.getItem(ABIERTO_KEY);
      return v === '1';
    } catch (e) { return false; }
  }
  function recordar(abierto) {
    try { global.localStorage && global.localStorage.setItem(ABIERTO_KEY, abierto ? '1' : '0'); }
    catch (e) { /* sin memoria, pero funcionando */ }
  }

  function estadoDe(n) {
    if (!pasoActual) return 'pendiente';
    if (n < pasoActual) return 'hecho';
    if (n === pasoActual) return 'aqui';
    return 'pendiente';
  }

  function fila(n) {
    var m = global.SophiePasos.metodo[n];
    var e = estadoDe(n);
    var marca = e === 'hecho' ? '✓' : String(n);
    return '<li class="s-mp-p ' + e + '" data-paso="' + n + '">' +
      '<button type="button" class="s-mp-cab" aria-expanded="false">' +
        '<span class="s-mp-n">' + marca + '</span>' +
        '<span class="s-mp-tx">' +
          '<span class="s-mp-nom">' + esc(m.nombre) + '</span>' +
          '<span class="s-mp-que">' + esc(m.que) + '</span>' +
        '</span>' +
        '<span class="s-mp-chev" aria-hidden="true">›</span>' +
      '</button>' +
      '<div class="s-mp-pq" hidden><b>Por qué</b> ' + esc(m.porque) + '</div>' +
      '</li>';
  }

  function cuerpo() {
    var M = global.SophiePasos.metodo, E = global.SophiePasos.etapas || {};
    var ns = Object.keys(M).map(Number).sort(function (a, b) { return a - b; });
    var html = '', etapaPrev = null;
    for (var i = 0; i < ns.length; i++) {
      var n = ns[i];
      if (M[n].etapa !== etapaPrev) {
        if (etapaPrev !== null) html += '</ul>';
        html += '<div class="s-mp-et">' + esc(E[M[n].etapa] || '') + '</div><ul class="s-mp-l">';
        etapaPrev = M[n].etapa;
      }
      html += fila(n);
    }
    return html + '</ul>';
  }

  function pintar() {
    if (!raiz) return;
    var abierto = raiz.classList.contains('abierto');
    var hechos = Math.max(0, pasoActual - 1);
    // LA BARRA CERRADA TAMBIÉN ENSEÑA. Dice el NOMBRE del paso en el método, no
    // solo el número: "Paso 4 de 9 · Validar la keyword". Un número no enseña
    // nada, y es lo único que el estudiante tenía hasta ahora.
    var m = pasoActual && global.SophiePasos.metodo[pasoActual];
    raiz.innerHTML =
      '<button type="button" class="s-mp-tog" aria-expanded="' + (abierto ? 'true' : 'false') + '">' +
        '<span class="s-mp-tt">' +
          (m ? 'Paso ' + pasoActual + ' de 9 · <b>' + esc(m.nombre) + '</b>'
             : 'El método, paso a paso') +
        '</span>' +
        '<span class="s-mp-cont">' + hechos + ' hecho' + (hechos === 1 ? '' : 's') + '</span>' +
        '<span class="s-mp-chev" aria-hidden="true">›</span>' +
      '</button>' +
      '<div class="s-mp-body">' + cuerpo() + '</div>';
  }

  // UN SOLO LISTENER, DELEGADO. `pintar()` rehace el HTML en cada paso; con
  // listeners por botón habría que volver a engancharlos cada vez y, el día que
  // se olvide uno, el panel deja de abrirse sin que nada falle.
  function enganchar() {
    raiz.addEventListener('click', function (ev) {
      var tog = ev.target.closest && ev.target.closest('.s-mp-tog');
      if (tog) {
        var ahora = !raiz.classList.contains('abierto');
        raiz.classList.toggle('abierto', ahora);
        tog.setAttribute('aria-expanded', ahora ? 'true' : 'false');
        recordar(ahora);
        return;
      }
      var cab = ev.target.closest && ev.target.closest('.s-mp-cab');
      if (!cab) return;
      var li = cab.parentNode;
      var pq = li.querySelector('.s-mp-pq');
      var abrir = pq.hasAttribute('hidden');
      if (abrir) pq.removeAttribute('hidden'); else pq.setAttribute('hidden', '');
      li.classList.toggle('desplegado', abrir);
      cab.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
  }

  // Marca en qué paso va. Se llama desde la página, con el mismo número que ya
  // usa la barra de progreso: no hay una segunda fuente que pueda discrepar.
  function marcar(paso) {
    var n = parseInt(paso, 10);
    if (!n || n < 1 || n > 9 || n === pasoActual) return;
    pasoActual = n;
    pintar();
  }

  function montar(contenedor) {
    if (!disponible() || !contenedor || typeof document === 'undefined') return false;
    asegurarEstilo();
    raiz = document.createElement('div');
    raiz.className = 's-mp' + (recordado() ? ' abierto' : '');
    contenedor.appendChild(raiz);
    pintar();
    enganchar();
    return true;
  }

  /* ---------- estilo propio, inyectado una sola vez ---------- */

  var CSS = [
    // Los mismos tokens que el resto de la suite, con el tema claro de
    // repliegue. Se declaran en la raíz del panel: todo lo demás cuelga de ahí.
    '.s-mp{--mp-tx:var(--so-tx,var(--sc-tx,#fff));',
    '--mp-tx2:var(--so-tx-2,var(--sc-tx-2,#cbd6ea));',
    '--mp-tx3:var(--so-tx-3,var(--sc-tx-3,#8b9bbd));',
    '--mp-or:var(--so-orange,var(--sc-orange,#f7aa2e));',
    '--mp-line:var(--so-line,rgba(128,128,128,.22));',
    'margin:0 0 12px;border:1px solid var(--mp-line);border-radius:14px;',
    'background:rgba(255,255,255,.04);overflow:hidden}',
    '.s-mp *{box-sizing:border-box}',

    '.s-mp-tog{display:flex;align-items:center;gap:10px;width:100%;padding:11px 14px;',
    'background:none;border:0;cursor:pointer;text-align:left;font:inherit;color:var(--mp-tx)}',
    '.s-mp-tt{font-size:12.5px;font-weight:600;color:var(--mp-tx3);min-width:0;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.s-mp-tt b{color:var(--mp-tx);font-weight:800}',
    '.s-mp-cont{margin-left:auto;font-size:11.5px;font-weight:700;color:var(--mp-or);',
    'font-variant-numeric:tabular-nums}',
    '.s-mp-tog .s-mp-chev{font-size:17px;color:var(--mp-tx3);transition:transform .18s}',
    '.s-mp.abierto .s-mp-tog .s-mp-chev{transform:rotate(90deg)}',

    '.s-mp-body{display:none;padding:0 14px 12px}',
    '.s-mp.abierto .s-mp-body{display:block}',
    '.s-mp-et{margin:10px 0 5px;font-size:9.5px;font-weight:800;letter-spacing:.11em;',
    'text-transform:uppercase;color:var(--mp-tx3)}',
    '.s-mp-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}',

    '.s-mp-cab{display:flex;align-items:flex-start;gap:10px;width:100%;padding:7px 9px;',
    'background:none;border:0;border-radius:10px;cursor:pointer;text-align:left;font:inherit}',
    '.s-mp-cab:hover{background:rgba(255,255,255,.05)}',
    '.s-mp-n{flex:none;width:21px;height:21px;border-radius:50%;display:flex;',
    'align-items:center;justify-content:center;font-size:11px;font-weight:800;',
    'border:1px solid var(--mp-line);color:var(--mp-tx3);margin-top:1px}',
    '.s-mp-tx{display:flex;flex-direction:column;gap:1px;min-width:0}',
    '.s-mp-nom{font-size:13px;font-weight:700;color:var(--mp-tx2);line-height:1.35}',
    '.s-mp-que{font-size:11.5px;color:var(--mp-tx3);line-height:1.4}',
    '.s-mp-cab .s-mp-chev{margin-left:auto;font-size:15px;color:var(--mp-tx3);',
    'transition:transform .18s;flex:none}',
    '.s-mp-p.desplegado .s-mp-cab .s-mp-chev{transform:rotate(90deg)}',

    // Los tres estados. `aqui` es el único en naranja: si se marcaran también
    // los hechos, el ojo no sabría dónde está — que es lo primero que viene a
    // preguntarle a este panel.
    '.s-mp-p.hecho .s-mp-n{border-color:rgba(47,191,135,.55);color:#5fd6a6}',
    '.s-mp-p.hecho .s-mp-nom{color:var(--mp-tx3)}',
    '.s-mp-p.aqui .s-mp-n{border-color:var(--mp-or);background:var(--mp-or);color:#0b1638}',
    '.s-mp-p.aqui .s-mp-nom{color:var(--mp-or);font-weight:800}',
    '.s-mp-p.aqui{background:rgba(247,170,46,.08);border-radius:10px}',

    '.s-mp-pq{margin:2px 0 8px 40px;padding:9px 11px;border-radius:10px;',
    'background:rgba(247,170,46,.09);border:1px solid rgba(247,170,46,.26);',
    'font-size:12.5px;line-height:1.55;color:var(--mp-tx)}',
    '.s-mp-pq b{color:var(--mp-or)}',
    '@media (max-width:430px){.s-mp-pq{margin-left:0}}',
    '@media (prefers-reduced-motion:reduce){.s-mp .s-mp-chev{transition:none}}'
  ].join('');

  function asegurarEstilo() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sophie-mp-css')) return;
    var s = document.createElement('style');
    s.id = 'sophie-mp-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  global.SophieMapa = {
    version: '1.0',
    disponible: disponible,
    montar: montar,
    marcar: marcar,
    // Para las pruebas: el HTML sin tocar el DOM de la página.
    html: function (paso) {
      if (!disponible()) return null;
      var antes = pasoActual;
      pasoActual = parseInt(paso, 10) || 0;
      var h = cuerpo();
      pasoActual = antes;
      return h;
    }
  };

})(window);
