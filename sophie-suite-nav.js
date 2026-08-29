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
    var PREFIJOS = ["/producto", "/proveedores", "/listado", "/ppc", "/lanzamiento", "/rescate", "/optimizador"];
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
      // Ícono SVG "casa/inicio" (sin emoji) + etiqueta. En naranja de marca
      // para que NUNCA se pierda contra el fondo azul de los módulos.
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M15 18l-6-6 6-6"/></svg>' +
        '<span>Volver a Sophie</span>';
      // Ubicación NUEVA: pestaña anclada al borde izquierdo, centrada
      // verticalmente. No la tapa el header sticky (arriba) ni la barra de
      // escribir (abajo). En naranja sólido: imposible de perder.
      var GRAD = "linear-gradient(135deg,#f7aa2e,#e0921a)";
      b.style.cssText = [
        "position:fixed",
        "top:50%",
        "left:0",
        "transform:translateY(-50%)",
        "z-index:2147483000",
        "display:inline-flex", "align-items:center", "gap:7px",
        "background:" + GRAD, "color:#241000", "text-decoration:none",
        "font:800 13px/1 'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        "padding:12px 15px 12px 12px",
        "border-radius:0 14px 14px 0",
        "box-shadow:0 8px 24px rgba(224,146,26,.42)",
        "cursor:pointer", "-webkit-tap-highlight-color:transparent",
        "user-select:none",
        "transition:transform .16s ease, box-shadow .16s ease, filter .16s ease"
      ].join(";");
      b.addEventListener("mouseenter", function () {
        b.style.transform = "translateY(-50%) translateX(3px)";
        b.style.filter = "brightness(1.05)";
        b.style.boxShadow = "0 10px 30px rgba(224,146,26,.55)";
      });
      b.addEventListener("mouseleave", function () {
        b.style.transform = "translateY(-50%)";
        b.style.filter = "none";
        b.style.boxShadow = "0 8px 24px rgba(224,146,26,.42)";
      });
      document.body.appendChild(b);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  } catch (e) { /* nunca romper la página del módulo */ }
})();
