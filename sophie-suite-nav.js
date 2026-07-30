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
    // Registro de progreso: cada módulo llama window.crezProgreso("<id>") al
    // COMPLETAR su paso. El lanzador de la suite lo lee de localStorage (mismo
    // origen bajo la suite) y marca el paso como hecho. Inofensivo standalone.
    window.crezProgreso = function (id) {
      try {
        var a = JSON.parse(localStorage.getItem("crez_progreso")) || [];
        if (a.indexOf(id) === -1) { a.push(id); localStorage.setItem("crez_progreso", JSON.stringify(a)); }
        // Sincroniza a la cuenta (multi-dispositivo). Si hay sesión, guarda en el
        // backend; fire-and-forget, nunca rompe la página si falla o va standalone.
        var ses = JSON.parse(localStorage.getItem("crezcamos_sso") || "null");
        if (ses && ses.email && ses.token) {
          fetch("https://sophie.crezcamosonline.com/api/cuenta", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "guardar_progreso", email: ses.email, token: ses.token, progreso: a })
          }).catch(function () {});
        }
      } catch (e) {}
    };

    // Mismas subrutas que el proxy de la suite (netlify.toml).
    var PREFIJOS = ["/producto", "/proveedores", "/listado", "/ppc", "/lanzamiento", "/rescate"];
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
      // Abajo-izquierda, por ENCIMA de la barra de escribir (que va full-width
      // abajo) y lejos del header sticky de arriba: no tapa ni el título del
      // módulo ni el input.
      b.style.cssText = [
        "position:fixed",
        "bottom:calc(80px + env(safe-area-inset-bottom))",
        "left:calc(12px + env(safe-area-inset-left))",
        "z-index:2147483000",
        "display:inline-flex", "align-items:center", "gap:6px",
        "background:rgba(50,113,214,.94)", "color:#fff", "text-decoration:none",
        "font:600 12.5px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        "padding:8px 13px", "border-radius:999px",
        "box-shadow:0 4px 16px rgba(0,0,0,.30)",
        "cursor:pointer", "-webkit-tap-highlight-color:transparent",
        "user-select:none", "backdrop-filter:blur(4px)"
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
