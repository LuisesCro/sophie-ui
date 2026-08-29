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

      // Estilos: pestaña naranja anclada al borde izquierdo, centrada.
      // COLAPSADA por defecto = solo la flecha asoma del borde (no estorba en
      // móvil). Se DESPLIEGA mostrando "Volver a Sophie" al pasar el mouse
      // (desktop) o al primer toque (móvil). En móvil el segundo toque navega.
      var st = document.createElement("style");
      st.textContent = [
        "#crez-volver{position:fixed;top:50%;left:0;transform:translateY(-50%);",
        "z-index:2147483000;display:inline-flex;align-items:center;",
        "background:linear-gradient(135deg,#f7aa2e,#e0921a);color:#241000;",
        "text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;",
        "user-select:none;font:800 13px/1 'Plus Jakarta Sans',-apple-system,",
        "BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
        "padding:11px 9px;border-radius:0 13px 13px 0;",
        "box-shadow:0 6px 20px rgba(224,146,26,.42);",
        "transition:padding .2s ease, box-shadow .2s ease, filter .2s ease;}",
        "#crez-volver svg{flex:none;display:block}",
        "#crez-volver .crez-lbl{max-width:0;overflow:hidden;white-space:nowrap;",
        "opacity:0;margin-left:0;transition:max-width .24s ease, opacity .18s ease, margin-left .24s ease;}",
        "#crez-volver.crez-open{padding:11px 15px 11px 11px;box-shadow:0 9px 28px rgba(224,146,26,.55);filter:brightness(1.03);}",
        "#crez-volver.crez-open .crez-lbl{max-width:170px;opacity:1;margin-left:7px;}",
        "@media (hover:hover){",
        "#crez-volver:hover{padding:11px 15px 11px 11px;box-shadow:0 9px 28px rgba(224,146,26,.55);filter:brightness(1.03);}",
        "#crez-volver:hover .crez-lbl{max-width:170px;opacity:1;margin-left:7px;}}"
      ].join("");
      document.head.appendChild(st);

      var b = document.createElement("a");
      b.id = "crez-volver";
      b.href = "/";                       // raíz de la app = el lanzador
      b.setAttribute("aria-label", "Volver a la app Sophie");
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
        '<span class="crez-lbl">Volver a Sophie</span>';

      // ¿El dispositivo tiene hover real (mouse)? Entonces el CSS ya se encarga
      // y el clic navega directo. Si NO (táctil), colapsa y usa dos toques.
      var tactil = !(window.matchMedia && window.matchMedia("(hover:hover)").matches);
      if (tactil) {
        var t = null;
        var abrir = function () {
          b.classList.add("crez-open");
          if (t) clearTimeout(t);
          t = setTimeout(function () { b.classList.remove("crez-open"); }, 3200);
        };
        b.addEventListener("click", function (e) {
          if (!b.classList.contains("crez-open")) { e.preventDefault(); abrir(); }
          // Ya abierta → deja navegar (href).
        });
        // Tocar fuera la vuelve a colapsar.
        document.addEventListener("touchstart", function (ev) {
          if (b.classList.contains("crez-open") && !b.contains(ev.target)) {
            b.classList.remove("crez-open");
            if (t) clearTimeout(t);
          }
        }, { passive: true });
      }

      document.body.appendChild(b);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", montar);
    } else {
      montar();
    }
  } catch (e) { /* nunca romper la página del módulo */ }
})();
