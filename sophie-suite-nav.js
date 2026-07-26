/* =====================================================================
   sophie-suite-nav.js — Botón flotante "Volver a Sophie"
   ---------------------------------------------------------------------
   Aparece SOLO cuando un módulo corre DENTRO de la app unificada
   (app.crezcamosonline.com/<modulo>/...), para que quien entre a un
   módulo por error pueda volver al lanzador de un clic.

   En el sitio standalone del módulo (su propio dominio, ruta "/") no
   hace absolutamente nada. Se carga con `defer` desde cada módulo.
   ===================================================================== */
(function () {
  try {
    // Mismas subrutas que el proxy de la suite (netlify.toml).
    var PREFIJOS = ["/producto", "/proveedores", "/listado", "/ppc", "/lanzamiento"];
    var p = location.pathname;
    var enSuite = PREFIJOS.some(function (x) {
      return p === x || p.indexOf(x + "/") === 0;
    });
    if (!enSuite) return; // standalone → sin botón

    function montar() {
      if (document.getElementById("crez-volver")) return;
      var b = document.createElement("a");
      b.id = "crez-volver";
      b.href = "/";                       // raíz de la app = el lanzador
      b.setAttribute("aria-label", "Volver a la app Sophie");
      b.innerHTML = '<span aria-hidden="true" style="font-size:15px;line-height:1">←</span>' +
                    '<span>Volver a Sophie</span>';
      b.style.cssText = [
        "position:fixed",
        "top:calc(10px + env(safe-area-inset-top))",
        "left:calc(10px + env(safe-area-inset-left))",
        "z-index:2147483000",
        "display:inline-flex", "align-items:center", "gap:7px",
        "background:#3271d6", "color:#fff", "text-decoration:none",
        "font:600 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        "padding:9px 14px", "border-radius:999px",
        "box-shadow:0 4px 16px rgba(0,0,0,.30)",
        "cursor:pointer", "-webkit-tap-highlight-color:transparent",
        "user-select:none"
      ].join(";");
      b.addEventListener("mouseenter", function () { b.style.background = "#255bbd"; });
      b.addEventListener("mouseleave", function () { b.style.background = "#3271d6"; });
      document.body.appendChild(b);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  } catch (e) { /* nunca romper la página del módulo */ }
})();
