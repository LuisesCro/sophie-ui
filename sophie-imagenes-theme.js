/* ============================================================
   SOPHIE · IMÁGENES — Unified Visual Theme v1.0
   Capa de presentación: NO modifica lógica, estados ni persistencia.
   Unifica Créditos + Contexto + Research + Index + Stack + Briefs +
   Producción + QA para evitar estilos incompatibles entre módulos.
   ============================================================ */
(function (g) {
  'use strict';
  if (typeof document === 'undefined') return;

  function install() {
    if (document.getElementById('sophie-imagenes-unified-theme')) return;
    var s = document.createElement('style');
    s.id = 'sophie-imagenes-unified-theme';
    s.textContent = `
      :root{
        --si-navy-950:#07142f;
        --si-navy-900:#0a1b3f;
        --si-navy-850:#0d234d;
        --si-navy-800:#102957;
        --si-line:rgba(193,211,244,.13);
        --si-text:#f7f9ff;
        --si-muted:#afbdd9;
        --si-orange:#f6a91a;
        --si-orange-2:#ffbd3d;
        --si-green:#55d89b;
        --si-blue:#67a9ff;
        --si-shadow:0 12px 34px rgba(3,12,34,.24);
      }

      /* ===== Cabecera de créditos ===== */
      #scw{
        background:linear-gradient(90deg,var(--si-navy-950),#0c2250 52%,var(--si-navy-950))!important;
        border-bottom:1px solid var(--si-line)!important;
        padding:10px 18px!important;
        box-shadow:0 5px 18px rgba(2,10,30,.18)!important;
        color:var(--si-text)!important;
      }
      #scw .scw-in{max-width:1040px!important;min-height:38px!important;gap:12px!important}
      #scw .scw-count{color:var(--si-orange-2)!important;font-size:17px!important}
      #scw .scw-txt{color:var(--si-text)!important;font-size:12.5px!important}
      #scw .scw-txt small{color:var(--si-muted)!important}
      #scw .scw-btn{
        background:rgba(255,255,255,.08)!important;
        border:1px solid rgba(255,255,255,.18)!important;
        color:#fff!important;
        border-radius:10px!important;
        padding:8px 11px!important;
      }
      #scw .scw-btn:hover{background:rgba(255,255,255,.14)!important}

      /* ===== Producto / expediente ===== */
      #sophie-imagenes-contexto{
        background:linear-gradient(90deg,#0c2048,#102957)!important;
        border-bottom:1px solid var(--si-line)!important;
        padding:9px 18px!important;
        box-shadow:none!important;
        color:var(--si-text)!important;
      }
      #sophie-imagenes-contexto>div{max-width:1040px!important;min-height:34px!important;gap:9px!important}
      #sophie-imagenes-contexto span:not(:last-child){color:#91a7ce!important}
      #sophie-imagenes-contexto strong{color:#fff!important;font-size:13.5px!important}
      #sophie-imagenes-contexto span:last-child{
        color:#bdf5d9!important;
        background:rgba(50,190,125,.12)!important;
        border-color:rgba(99,224,161,.28)!important;
      }

      /* ===== Orden de la cabecera =====
         #app es un flex en columna y cada capa se inserta como primer hijo
         según va cargando, así que el orden dependía de quién llegara antes.
         Fijarlo aquí lo vuelve estable: qué producto → en qué paso vas →
         cuántos créditos te quedan → la conversación. Todos negativos para
         quedar por encima de #messages y #bar, que van en 0. */
      #sophie-imagenes-contexto{order:-4!important}
      #si-flujo{order:-3!important}
      #scw{order:-2!important}

      /* ===== Pipeline superior =====
         Seis barras a lo ancho se comían más de 400px antes de que empezara
         la conversación. Van agrupadas en una sola franja: cada paso es una
         pastilla, el subtítulo sobra —el nombre ya lo dice— y el botón solo
         aparece en el paso que de verdad puedes tocar. */
      #si-flujo{
        flex:none!important;
        background:linear-gradient(90deg,var(--si-navy-850),var(--si-navy-800))!important;
        border-bottom:1px solid var(--si-line)!important;
        box-shadow:0 10px 28px rgba(4,15,42,.14)!important;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        scrollbar-width:thin!important;
      }
      #si-flujo-in{
        display:flex!important;
        align-items:center!important;
        /* Envuelve en vez de desbordar: con dos pasos abiertos a la vez la fila
           pasa de 1040px y el último —QA— quedaba cortado contra el borde. */
        flex-wrap:wrap!important;
        gap:6px!important;
        max-width:1040px!important;
        margin:0 auto!important;
        padding:7px 18px!important;
      }
      /* Si todavía no ha cargado ningún paso, la franja no debe dejar un hueco. */
      #si-flujo:not(:has(.sir-in,.sii-in,.svs-in,.scb-in,.scg-in,.svq-in)){display:none!important}

      #si-flujo>#si-flujo-in>div{
        position:relative!important;
        flex:0 0 auto!important;
        background:transparent!important;
        border:0!important;
        padding:0!important;
        box-shadow:none!important;
        color:var(--si-text)!important;
      }
      /* La franja naranja lateral servía para separar barras apiladas.
         En pastillas sobra: el borde de cada una ya hace ese trabajo. */
      #si-flujo>#si-flujo-in>div:before{display:none!important}

      #si-flujo .sir-in,#si-flujo .sii-in,#si-flujo .svs-in,
      #si-flujo .scb-in,#si-flujo .scg-in,#si-flujo .svq-in{
        max-width:none!important;
        min-height:0!important;
        margin:0!important;
        padding:5px 9px!important;
        gap:7px!important;
        background:rgba(255,255,255,.05)!important;
        border:1px solid var(--si-line)!important;
        border-radius:11px!important;
      }
      #si-flujo .sir-sub,#si-flujo .sii-sub,#si-flujo .svs-sub,
      #si-flujo .scb-sub,#si-flujo .scg-sub,#si-flujo .svq-sub{display:none!important}
      #si-flujo .sir-title,#si-flujo .sii-title,#si-flujo .svs-title,
      #si-flujo .scb-title,#si-flujo .scg-title,#si-flujo .svq-title{
        font-size:11.6px!important;
        white-space:nowrap!important;
      }
      /* Un paso bloqueado se lee, pero no compite por la atención. */
      #si-flujo>#si-flujo-in>div:has(button:disabled){opacity:.5!important}
      #si-flujo>#si-flujo-in>div:has(button:disabled) .sir-in,
      #si-flujo>#si-flujo-in>div:has(button:disabled) .sii-in,
      #si-flujo>#si-flujo-in>div:has(button:disabled) .svs-in,
      #si-flujo>#si-flujo-in>div:has(button:disabled) .scb-in,
      #si-flujo>#si-flujo-in>div:has(button:disabled) .scg-in,
      #si-flujo>#si-flujo-in>div:has(button:disabled) .svq-in{background:transparent!important}
      /* El botón del paso bloqueado no se puede pulsar: ocupar sitio es ruido. */
      #si-flujo button:disabled{display:none!important}
      #si-flujo .sir-btn,#si-flujo .sii-btn,#si-flujo .svs-btn,
      #si-flujo .scb-btn,#si-flujo .scg-btn,#si-flujo .svq-btn{
        min-width:0!important;
        padding:5px 9px!important;
        font-size:11px!important;
      }
      /* Un paso ya terminado lleva su distintivo verde y se puede volver a
         abrir, pero no es lo siguiente que hay que hacer. En naranja se deja
         solo el paso actual: si no, dos botones idénticos compiten y la franja
         deja de decir por dónde vas. */
      #si-flujo>#si-flujo-in>div:has([class$="-badge"]) button{
        background:rgba(255,255,255,.07)!important;
        color:#d6e2fb!important;
        border:1px solid var(--si-line)!important;
        box-shadow:none!important;
      }
      #si-flujo>#si-flujo-in>div:has([class$="-badge"]) button:hover{
        background:rgba(255,255,255,.13)!important;
      }

      .sir-in,.sii-in,.svs-in,.scb-in,.scg-in,.svq-in{
        max-width:1040px!important;
        min-height:58px!important;
        margin:0 auto!important;
        padding:8px 0!important;
        gap:14px!important;
      }
      .sir-grow,.sii-grow,.svs-grow,.scb-grow,.scg-grow,.svq-grow{min-width:0!important}
      .sir-title,.sii-title,.svs-title,.scb-title,.scg-title,.svq-title{
        color:#fff!important;
        font-size:13.5px!important;
        font-weight:800!important;
        letter-spacing:-.01em!important;
        line-height:1.25!important;
      }
      .sir-sub,.sii-sub,.svs-sub,.scb-sub,.scg-sub,.svq-sub{
        color:var(--si-muted)!important;
        font-size:11.7px!important;
        line-height:1.35!important;
        margin-top:2px!important;
      }

      /* Accent bar: hace legible el orden sin meter más texto */
      #sir-launch:before,#sii-launch:before,#svs-launch:before,#scb-launch:before,#scg-launch:before,#svq-launch:before{
        content:'';
        position:absolute;
        left:0;top:10px;bottom:10px;
        width:3px;border-radius:0 4px 4px 0;
        background:rgba(246,169,26,.28);
      }
      #sir-launch:before{background:var(--si-orange)}

      /* Botones activos */
      #sir-launch .sir-btn,#sii-launch .sii-btn,#svs-launch .svs-btn,#scb-launch .scb-btn,#scg-launch .scg-btn,#svq-launch .svq-btn{
        flex:none!important;
        min-width:132px!important;
        background:linear-gradient(180deg,var(--si-orange-2),var(--si-orange))!important;
        color:#2b1b00!important;
        border:1px solid rgba(255,205,91,.62)!important;
        border-radius:10px!important;
        padding:9px 13px!important;
        font-size:11.8px!important;
        font-weight:850!important;
        box-shadow:0 5px 14px rgba(246,169,26,.15)!important;
        transition:transform .16s ease,filter .16s ease,box-shadow .16s ease!important;
      }
      #sir-launch .sir-btn:hover,#sii-launch .sii-btn:hover,#svs-launch .svs-btn:hover,#scb-launch .scb-btn:hover,#scg-launch .scg-btn:hover,#svq-launch .svq-btn:hover{
        transform:translateY(-1px)!important;
        filter:brightness(1.04)!important;
        box-shadow:0 8px 18px rgba(246,169,26,.20)!important;
      }
      #sir-launch .sir-btn:disabled,#sii-launch .sii-btn:disabled,#svs-launch .svs-btn:disabled,#scb-launch .scb-btn:disabled,#scg-launch .scg-btn:disabled,#svq-launch .svq-btn:disabled{
        background:rgba(149,170,208,.10)!important;
        color:#6f85ac!important;
        border-color:rgba(166,188,226,.10)!important;
        box-shadow:none!important;
        opacity:1!important;
        cursor:not-allowed!important;
        transform:none!important;
      }
      .sir-badge,.sii-badge,.svs-badge,.scb-badge,.scg-badge,.svq-badge{
        background:rgba(57,205,139,.12)!important;
        color:#aaf2cf!important;
        border-color:rgba(91,220,160,.22)!important;
      }

      /* ===== Modales: sistema visual compartido ===== */
      .sir-sheet,.sii-sheet,.svs-sheet,.scb-sheet,.scg-sheet,.svq-sheet,.scw-sheet{
        border:1px solid #dfe5ee!important;
        box-shadow:0 28px 80px rgba(5,18,48,.28)!important;
      }
      .sir-head,.sii-head,.svs-head,.scb-head,.scg-head,.svq-head{
        background:#fff!important;
        color:#17233a!important;
      }
      .sir-btn,.sii-btn,.svs-btn,.scb-btn,.scg-btn,.svq-btn{
        border-radius:10px!important;
      }
      .sir-card,.sir-field,.sii-card,.sii-row,.svs-card,.svs-row,.scb-card,.scb-row,.scg-card,.scg-row,.svq-card,.svq-row,.scw-pack{
        box-shadow:0 3px 12px rgba(21,46,88,.035)!important;
      }

      /* ===== Evita saltos visuales si una capa tarda en cargar ===== */
      #app>#scw + #sophie-imagenes-contexto,
      #app>#sophie-imagenes-contexto + #sir-launch{margin-top:0!important}

      @media(max-width:760px){
        #scw,#sophie-imagenes-contexto,#sir-launch,#sii-launch,#svs-launch,#scb-launch,#scg-launch,#svq-launch{padding-left:12px!important;padding-right:12px!important}
        .sir-in,.sii-in,.svs-in,.scb-in,.scg-in,.svq-in{min-height:54px!important;gap:8px!important}
        #sir-launch .sir-btn,#sii-launch .sii-btn,#svs-launch .svs-btn,#scb-launch .scb-btn,#scg-launch .scg-btn,#svq-launch .svq-btn{min-width:112px!important;padding:8px 9px!important}
      }
      @media(max-width:560px){
        .sir-sub,.sii-sub,.svs-sub,.scb-sub,.scg-sub,.svq-sub{display:none!important}
        .sir-title,.sii-title,.svs-title,.scb-title,.scg-title,.svq-title{font-size:12.5px!important}
        #sir-launch .sir-btn,#sii-launch .sii-btn,#svs-launch .svs-btn,#scb-launch .scb-btn,#scg-launch .scg-btn,#svq-launch .svq-btn{min-width:auto!important;font-size:11px!important}
      }
    `;
    document.head.appendChild(s);
    document.documentElement.setAttribute('data-sophie-imagenes-theme','unified-v1');
  }

  /* ------------------------------------------------------------------
     Agrupado de la franja de flujo.

     Cada una de las seis librerías se monta sola y se inserta como primer
     hijo de #app, así que apiladas ocupaban toda la parte de arriba y en un
     orden que dependía de cuál cargara antes. Aquí solo se mueven de sitio:
     no se toca su marcado, ni sus manejadores, ni su estado. Cada librería
     puede seguir haciendo remove() + insertBefore() cuando cambia de estado;
     el observador las vuelve a recoger.
     ------------------------------------------------------------------ */
  var PASOS = ['sir-launch','sii-launch','svs-launch','scb-launch','scg-launch','svq-launch'];
  var agrupando = false;

  function agrupar() {
    if (agrupando) return;
    var app = document.getElementById('app');
    if (!app) return;

    var sueltos = PASOS.filter(function (id) {
      var el = document.getElementById(id);
      return el && el.parentNode === app;
    });
    if (!sueltos.length) return;   // nada nuevo que recoger

    agrupando = true;
    try {
      var franja = document.getElementById('si-flujo');
      if (!franja) {
        franja = document.createElement('div');
        franja.id = 'si-flujo';
        var dentro = document.createElement('div');
        dentro.id = 'si-flujo-in';
        franja.appendChild(dentro);
        app.insertBefore(franja, app.firstChild);
      }
      var caja = document.getElementById('si-flujo-in');
      if (caja) {
        // Se recorren todos, no solo los sueltos: así el orden queda siempre
        // el del proceso —Research, Index, Stack, Briefs, Producción, QA—
        // y no el del azar de la carga.
        PASOS.forEach(function (id) {
          var el = document.getElementById(id);
          if (el) caja.appendChild(el);
        });
      }
    } finally {
      agrupando = false;
    }
  }

  function observar() {
    var app = document.getElementById('app');
    if (!app || typeof MutationObserver === 'undefined') return;
    agrupar();
    new MutationObserver(agrupar).observe(app, { childList: true });
  }

  function arrancar() { install(); observar(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
  g.SophieImagenesTheme = { version:'1.1', install:install, agrupar:agrupar };
})(typeof window !== 'undefined' ? window : this);
