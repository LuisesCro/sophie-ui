/* =====================================================================
   sophie-suite-nav.js — Botón flotante "Volver a Sophie" + loader módulos
   ===================================================================== */
(function () {
  try {
    window.crezProgreso = function (id) {
      try {
        var a = JSON.parse(localStorage.getItem("crez_progreso")) || [];
        if (a.indexOf(id) === -1) { a.push(id); localStorage.setItem("crez_progreso", JSON.stringify(a)); }
        var ses = JSON.parse(localStorage.getItem("crezcamos_sso") || "null");
        if (ses && ses.email && ses.token) {
          fetch("https://sophie.crezcamosonline.com/api/cuenta", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "guardar_progreso", email: ses.email, token: ses.token, progreso: a })
          }).catch(function () {});
        }
      } catch (e) {}
    };

    var PREFIJOS = ["/producto", "/proveedores", "/listado", "/imagenes", "/ppc", "/lanzamiento", "/rescate", "/optimizador"];
    var p = location.pathname;
    var enSuite = PREFIJOS.some(function (x) { return p === x || p.indexOf(x + "/") === 0; });

    // Sophie Imágenes se abre por dos puertas: la ruta /imagenes del lanzador
    // (app.crezcamosonline.com, que la proxea) y su propio dominio. La V2
    // —Image Index, Visual Stack, Creative Briefs, Producción, QA y créditos—
    // tiene que cargar en las dos. Mirando solo la ruta, en el dominio propio
    // el módulo se quedaba en la versión vieja: el chat y nada más, sin
    // ninguno de los seis paneles. El regex cubre también los dominios de
    // previsualización de Netlify (deploy-preview-N--sophie-imagenes...).
    var esImagenes = p === "/imagenes" || p.indexOf("/imagenes/") === 0 ||
                     /(^|\.|--)sophie-imagenes\./.test(location.hostname);

    if (!enSuite && !esImagenes) return;

    function montar() {
      if (document.getElementById("crez-volver")) return;
      var st = document.createElement("style");
      st.textContent = [
        "#crez-volver{position:fixed;top:50%;left:0;transform:translateY(-50%);z-index:2147483000;display:inline-flex;align-items:center;background:linear-gradient(135deg,#f7aa2e,#e0921a);color:#241000;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;font:800 13px/1 'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:11px 9px;border-radius:0 13px 13px 0;box-shadow:0 6px 20px rgba(224,146,26,.42);transition:padding .2s ease,box-shadow .2s ease,filter .2s ease}",
        "#crez-volver svg{flex:none;display:block}",
        "#crez-volver .crez-lbl{max-width:0;overflow:hidden;white-space:nowrap;opacity:0;margin-left:0;transition:max-width .24s ease,opacity .18s ease,margin-left .24s ease}",
        "#crez-volver.crez-open{padding:11px 15px 11px 11px;box-shadow:0 9px 28px rgba(224,146,26,.55);filter:brightness(1.03)}",
        "#crez-volver.crez-open .crez-lbl{max-width:170px;opacity:1;margin-left:7px}",
        "@media (hover:hover){#crez-volver:hover{padding:11px 15px 11px 11px;box-shadow:0 9px 28px rgba(224,146,26,.55);filter:brightness(1.03)}#crez-volver:hover .crez-lbl{max-width:170px;opacity:1;margin-left:7px}}"
      ].join("");
      document.head.appendChild(st);

      var b = document.createElement("a");
      b.id = "crez-volver"; b.href = "/"; b.setAttribute("aria-label", "Volver a la app Sophie");
      b.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span class="crez-lbl">Volver a Sophie</span>';
      var tactil = !(window.matchMedia && window.matchMedia("(hover:hover)").matches);
      if (tactil) {
        var t = null;
        var abrir = function () { b.classList.add("crez-open"); if (t) clearTimeout(t); t = setTimeout(function () { b.classList.remove("crez-open"); }, 3200); };
        b.addEventListener("click", function (e) { if (!b.classList.contains("crez-open")) { e.preventDefault(); abrir(); } });
        document.addEventListener("touchstart", function (ev) { if (b.classList.contains("crez-open") && !b.contains(ev.target)) { b.classList.remove("crez-open"); if (t) clearTimeout(t); } }, { passive: true });
      }
      document.body.appendChild(b);
    }

    // El botón flotante apunta a "/", que solo es la app unificada cuando
    // estamos dentro de ella. En el dominio propio de un módulo ese enlace
    // llevaría al propio módulo, así que ahí no se monta.
    if (enSuite) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
    }

    if (esImagenes) {
      function cargar(src, tag) {
        return new Promise(function (resolve) {
          var s = document.createElement("script"); s.src = src; s.defer = true; s.setAttribute("data-sophie", tag);
          s.onload = function () { resolve(true); }; s.onerror = function () { resolve(false); }; document.head.appendChild(s);
        });
      }
      cargar("https://ui.crezcamosonline.com/sophie-image-strategy.js", "image-strategy-v2")
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-imagenes-context.js", "imagenes-context-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-creditos.js", "creditos-visuales-v1"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-creditos-ui.js", "creditos-visuales-ui-v1"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-imagenes-research.js", "imagenes-research-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-imagenes-research-ui.js", "imagenes-research-ui-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-imagenes-research-multiline-fix.js", "imagenes-research-multiline-fix-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-image-index.js", "image-index-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-image-index-safety.js", "image-index-safety-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-image-index-ui.js", "image-index-ui-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-visual-stack.js", "visual-stack-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-visual-stack-ui.js", "visual-stack-ui-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-creative-brief.js", "creative-brief-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-creative-brief-ui.js", "creative-brief-ui-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-creative-generator.js", "creative-generator-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-creative-generator-ui.js", "creative-generator-ui-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-visual-qa.js", "visual-qa-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-visual-qa-client.js", "visual-qa-client-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-visual-qa-ui.js", "visual-qa-ui-v2"); })
        .then(function () { return cargar("https://ui.crezcamosonline.com/sophie-imagenes-theme.js", "imagenes-unified-theme-v1"); });
    }
  } catch (e) {}
})();
