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

      /* ===== Pipeline superior ===== */
      #sir-launch,#sii-launch,#svs-launch,#scb-launch,#scg-launch,#svq-launch{
        position:relative!important;
        flex:none!important;
        background:linear-gradient(90deg,var(--si-navy-850),var(--si-navy-800))!important;
        border:0!important;
        border-bottom:1px solid var(--si-line)!important;
        padding:0 18px!important;
        color:var(--si-text)!important;
        box-shadow:none!important;
      }
      #sir-launch{border-top:1px solid rgba(255,255,255,.025)!important}
      #svq-launch{box-shadow:0 10px 28px rgba(4,15,42,.14)!important}

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  g.SophieImagenesTheme = { version:'1.0', install:install };
})(typeof window !== 'undefined' ? window : this);
