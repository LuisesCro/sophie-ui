#!/usr/bin/env node
/* ============================================================
   RECORRIDO E2E — el camino de un producto por las Sophies
   Crezcamos Online · sophie-ui/tools/recorrido-e2e.mjs

   Los tests de tools/test-parsers.mjs fijan cada motor por
   separado. Este bot hace algo distinto: toma PRODUCTOS SINTÉTICOS
   y los pasa por el CAMINO COMPLETO de la suite, afirmando tres
   cosas que ningún test aislado cubre:

     1) VEREDICTO POR MÓDULO — cada Sophie devuelve el veredicto
        correcto para cada producto.
     2) COHERENCIA ENTRE MÓDULOS — la salida de un módulo encaja
        con la entrada del siguiente (la costura real de la suite:
        Producto → expediente → Puerta → resto; el candado de
        tracción; el contrato de congelado de Rescate).
     3) RENDER SIN ROMPERSE — cada pantalla se pinta en un DOM real
        (jsdom) sin lanzar, y produce contenido.

   Por qué existe: un cambio de prompt o de motor puede dejar a dos
   Sophies dando consejos que se contradicen (p.ej. Ads diciendo
   "sube pujas agresivo" sobre un producto que Rescate CONGELA). Un
   test por módulo no lo ve; este recorrido sí.

   Uso:  npm run test:e2e   (o: node tools/recorrido-e2e.mjs)
   Sale con código 1 si algún paso del recorrido falla.
   ============================================================ */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- DOM real (jsdom) para poder ejercitar los renders ---------- */

// runScripts:"outside-only" nos da un window.eval que corre el código EN el
// contexto del window de jsdom — igual que el navegador: `window` es el objeto
// global y las referencias sueltas (Sophie, SophieCriterios, document…) se
// resuelven como propiedades del window. Esto es clave para los renders, que
// referencian `Sophie` sin prefijo.
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: "https://sophie.crezcamosonline.com/",
  runScripts: "outside-only",
});
const win = dom.window;
const doc = win.document;
// Algunos módulos consultan la red (Puerta) o el storage (suite-nav). No los
// llamamos, pero blindamos por si alguna ruta de render los roza.
win.fetch = win.fetch || (() => Promise.reject(new Error("fetch deshabilitado en el bot")));

/* ---------- cargar cada sophie-*.js en el contexto del window de jsdom ------
   Los archivos son IIFEs (function(global){ global.SophieX = … })(window).
   Al evaluarlos con win.eval, `window` es el global real, los `window.X =`
   aterrizan en el mismo objeto y los renders ven un DOM de verdad. El ORDEN
   respeta las dependencias entre módulos.                                    */

function cargar(archivo) {
  try {
    win.eval(readFileSync(resolve(raiz, archivo), "utf8"));
  } catch (e) {
    console.error("✗ No se pudo cargar " + archivo + ": " + e.message);
    process.exit(1);
  }
}

cargar("cz-intent-core.js");      // CzIntentCore (motor de intención compartido)
cargar("sophie-criterios.js");    // SophieCriterios (fuente de verdad)
cargar("sophie-render.js");       // Sophie (motor de render; registra listeners al cargar)
cargar("sophie-motor.js");        // SophieMotor (GO/NO-GO, lee SophieCriterios)
cargar("sophie-keywords.js");     // SophieKeywords (clasificador + score de listing)
cargar("sophie-cotizaciones.js"); // SophieCotizaciones (costo aterrizado + veredicto proveedor)
cargar("sophie-pasos.js");        // SophiePasos (cabeceras de pantallas guiadas)
cargar("sophie-analisis.js");     // SophieAnalisis (glue motor↔render de Producto)
cargar("sophie-listing.js");      // SophieListing (parser + render sobre keywords)
cargar("sophie-proveedores.js");  // SophieProveedores (parser + render sobre cotizaciones)
cargar("sophie-candidatos.js");   // SophieCandidatos (pantalla de candidatos)
cargar("sophie-ppc.js");          // SophiePPC (Cosecha y Poda / Ads)
cargar("sophie-rescate.js");      // SophieRescate (diagnóstico de rescate)
cargar("sophie-lanzamiento.js");  // SophieLanzamiento (semáforo + reorden)
cargar("sophie-puerta.js");       // SophiePuerta (gate entre módulos por veredicto)
cargar("sophie-intencion.js");    // SophieIntencion (Capa 2 + anguloExpediente)
cargar("sophie-cobertura.js");    // SophieCobertura (audita el ángulo en Listing)

const {
  SophieCriterios, Sophie, SophieMotor, SophieKeywords, SophieCotizaciones,
  SophiePasos, SophieAnalisis, SophieListing, SophieProveedores,
  SophieCandidatos, SophiePPC, SophieRescate, SophieLanzamiento, SophiePuerta,
  SophieIntencion, SophieCobertura,
} = win;

/* ---------- arnés de aserciones (mismo estilo que test-parsers) ---------- */

let pasan = 0, fallan = 0;
const salida = [];
const registro = [];   // estructura para el reporte HTML (--html)
function grupo(t) { salida.push("\n" + t); registro.push({ tipo: "grupo", texto: t }); }
function t(nombre, fn) {
  try { fn(); pasan++; salida.push("  ✓ " + nombre); registro.push({ tipo: "test", nombre: nombre, ok: true }); }
  catch (e) { fallan++; salida.push("  ✗ " + nombre + " — " + e.message); registro.push({ tipo: "test", nombre: nombre, ok: false, error: e.message }); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || "esperaba verdadero"); }
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg ? msg + ": " : "") + "esperaba " + JSON.stringify(b) + " y dio " + JSON.stringify(a));
}
function incluye(hay, aguja, msg) {
  if (!(hay && String(hay).indexOf(aguja) > -1))
    throw new Error((msg ? msg + ": " : "") + "esperaba que incluyera " + JSON.stringify(aguja) + " y dio " + JSON.stringify(hay));
}
// Prepara un contenedor limpio en el DOM y devuelve su selector.
let _slot = 0;
function contenedor() {
  const id = "e2e-slot-" + (++_slot);
  const div = doc.createElement("div");
  div.id = id;
  doc.body.appendChild(div);
  return { sel: "#" + id, el: div };
}
// Ejercita un render: no debe lanzar y debe dejar contenido en el DOM.
function pinta(nombre, fn) {
  t(nombre, () => {
    const c = contenedor();
    fn(c.sel, c.el);
    ok(c.el.innerHTML && c.el.innerHTML.length > 0, "el contenedor quedó vacío (¿se pintó algo?)");
  });
}

/* ============================================================
   PRODUCTOS SINTÉTICOS — tres arquetipos que recorren la suite
   ============================================================ */

// A · ESTRELLA — datos fuertes, sin vetos. Debe pasar todas las puertas.
const ESTRELLA = {
  datos: {
    searchVolume: 22400, tendencia: "estable", averageRevenue: 8200, concentracionTop1: 28,
    averageReviews: 280, topReviews: [310, 290, 240], averagePrice: 24.99, keywordsCerebro: 64,
    margenAntesPPC: 38, roi: 145, costoAterrizadoPct: 26, moq: 200, unidadesPosibles: 280,
  },
  juicios: { 6: { estado: "pass" }, 9: { estado: "pass" }, 12: { estado: "alerta" }, 13: { estado: "pass" } },
};

// B · MARGINAL — buen mercado pero margen bajo el piso: veto en C8.
//     La suite debe dejarlo AVANZAR pero AVISADO (RIESGO MODERADO).
const MARGINAL = {
  datos: { ...ESTRELLA.datos, margenAntesPPC: 12, roi: 70 },
  juicios: ESTRELLA.juicios,
};

// C · DESCARTAR — mercado flojo por todos lados y juicios en contra: NO GO.
const DESCARTAR = {
  datos: {
    searchVolume: 300, tendencia: "bajando", averageRevenue: 400, concentracionTop1: 82,
    averageReviews: 4200, topReviews: [6000, 5200, 4800], averagePrice: 7.5, keywordsCerebro: 3,
    margenAntesPPC: 6, roi: 20, costoAterrizadoPct: 68, moq: 3000, unidadesPosibles: 20,
  },
  juicios: { 6: { estado: "fail" }, 9: { estado: "fail" }, 12: { estado: "fail" }, 13: { estado: "fail" } },
};

// D · MEDIO — buen mercado pero con una grieta no fatal (distribución
//     concentrada): baja de ESTRELLA a GO CON AJUSTES sin activar veto.
const MEDIO = {
  datos: { ...ESTRELLA.datos, concentracionTop1: 80 },
  juicios: ESTRELLA.juicios,
};

// Listing completo y bien formado (se reusa en el score y en los renders).
const LISTING_BUENO = {
  keywordP1: "bamboo cutting board",
  marca: "GreenChef",
  titulo: "bamboo cutting board GreenChef extra large kitchen chopping set",
  itemHighlights: "Organic material, 15 inch size, for adults, dishwasher safe compatible",
  vinetas: [
    "DURABLE BAMBOO - Made from organic moso bamboo that resists knife scarring and holds up to years of daily kitchen use.",
    "EXTRA LARGE SIZE - Measures 15 by 12 inches, giving you room to chop vegetables, carve meat and plate a full meal.",
    "JUICE GROOVE - A deep perimeter channel catches liquids so your counter stays clean while you carve roasts and fruit.",
    "REVERSIBLE DESIGN - Flat face for slicing bread and grooved face for meats, keeping raw and ready foods separated.",
    "EASY CARE - Hand wash with warm water and oil the surface monthly to keep the board sealed and looking new.",
  ],
  backend: "tabla cortar cocina bambu madera picar utensilio reversible antibacterial",
  descripcion: (
    "This bamboo cutting board brings organic moso bamboo into your kitchen with a surface that resists deep " +
    "knife marks and stays smooth wash after wash. The extra large fifteen by twelve inch face gives you room " +
    "to work through a whole meal without crowding, from dicing onions to carving a roast. A deep juice groove " +
    "runs around the perimeter to catch liquids before they reach your counter, so cleanup stays quick and tidy. " +
    "Flip it over and the reversible design lets you keep raw meats on one face and bread or produce on the other, " +
    "a simple habit that keeps flavors and juices where they belong. Bamboo is naturally dense and gentle on your " +
    "knife edges, so your blades keep their sharpness longer than they would against plastic or glass. To keep the " +
    "board looking new, hand wash it with warm water and a mild soap, dry it standing on edge, and rub in a food " +
    "safe mineral oil once a month to seal the grain against moisture. With a little care this board becomes the " +
    "one you reach for every day, steady under the knife and handsome enough to carry straight to the table for " +
    "serving cheese, fruit and charcuterie to guests."
  ),
};

/* ============================================================
   1 · VEREDICTO POR MÓDULO — Producto (GO/NO-GO)
   ============================================================ */

grupo("Producto · SophieMotor.evaluar — veredicto por arquetipo");

t("ESTRELLA → PRODUCTO ESTRELLA (estado go, sin veto)", () => {
  const r = SophieMotor.evaluar(ESTRELLA.datos, ESTRELLA.juicios);
  eq(r.veredicto, "PRODUCTO ESTRELLA", "veredicto");
  eq(r.estado, "go", "estado");
  eq(r.limitadoPorVeto, false, "no debe haber veto");
});

t("MARGINAL → RIESGO MODERADO por veto en C8 (margen)", () => {
  const r = SophieMotor.evaluar(MARGINAL.datos, MARGINAL.juicios);
  eq(r.veredicto, "RIESGO MODERADO", "veredicto");
  ok(r.limitadoPorVeto, "el margen bajo debe activar el veto");
  ok(r.vetos.some((v) => v.id === 8), "el veto debe ser C8");
});

t("MEDIO → GO CON AJUSTES (nivel intermedio, sin veto)", () => {
  const r = SophieMotor.evaluar(MEDIO.datos, MEDIO.juicios);
  eq(r.veredicto, "GO CON AJUSTES", "veredicto");
  eq(r.estado, "go", "estado");
  eq(r.limitadoPorVeto, false, "una grieta no fatal no debe activar veto");
});

t("DESCARTAR → NO GO (estado nogo, pocos aprobados)", () => {
  const r = SophieMotor.evaluar(DESCARTAR.datos, DESCARTAR.juicios);
  eq(r.veredicto, "NO GO", "veredicto");
  eq(r.estado, "nogo", "estado");
  ok(r.aprobados <= 6, "un NO GO no debería aprobar más de 6 criterios (dio " + r.aprobados + ")");
});

/* ============================================================
   2 · COHERENCIA — Producto → expediente → Puerta (la costura real)
   La Puerta gatea el resto de módulos según el veredicto guardado.
   ============================================================ */

grupo("Coherencia · expediente(Producto) → SophiePuerta.evaluar");

function accesoDe(arquetipo) {
  const r = SophieMotor.evaluar(arquetipo.datos, arquetipo.juicios);
  const exp = SophieMotor.aExpediente(r, arquetipo.datos, {});
  // el expediente lleva el LABEL del veredicto, que es lo que la Puerta interpreta
  incluye(exp.veredicto, r.veredicto, "el expediente debe llevar el veredicto del motor");
  return { r, exp, puerta: SophiePuerta.evaluar(exp.veredicto) };
}

t("ESTRELLA abre la Puerta (permitido)", () => {
  eq(accesoDe(ESTRELLA).puerta.acceso, "permitido");
});

t("MARGINAL pasa la Puerta con advertencia", () => {
  eq(accesoDe(MARGINAL).puerta.acceso, "advertencia");
});

t("MEDIO (GO CON AJUSTES) abre la Puerta (permitido)", () => {
  eq(accesoDe(MEDIO).puerta.acceso, "permitido");
});

t("DESCARTAR queda BLOQUEADO en la Puerta (no se construye sobre un NO GO)", () => {
  const a = accesoDe(DESCARTAR);
  eq(a.puerta.acceso, "bloqueado");
  ok(a.puerta.motivo && a.puerta.motivo.length > 0, "un bloqueo debe explicar el porqué");
});

t("la Puerta trata 'NO GO' antes que 'GO' (no lo deja pasar por contener 'GO')", () => {
  // regresión: 'NO GO'.indexOf('GO') > -1; el orden de las reglas importa.
  eq(SophiePuerta.evaluar("NO GO").acceso, "bloqueado");
  eq(SophiePuerta.evaluar("GO CON AJUSTES").acceso, "permitido");
});

/* ============================================================
   3 · VEREDICTO POR MÓDULO — Listing (keywords + score)
   ============================================================ */

grupo("Listing · SophieKeywords — clasificación y score");

// Master Keyword List sintética (Cerebro): encabezado + filas con SV/rank/IQ.
const MKL = [
  "Keyword Phrase\tSearch Volume\tKeyword Sales\tCerebro IQ Score\tOrganic Rank\tCompeting Products",
  "bamboo cutting board\t18000\t900\t42\t8\t1200",
  "wood cutting board\t9000\t400\t28\t12\t2100",
  "kitchen chopping board\t3200\t120\t14\t34\t3400",
  "small cutting board set\t1400\t60\t9\t51\t800",
  "charcuterie serving board\t2600\t110\t18\t22\t1500",
].join("\n");

t("clasificar reparte las keywords en P1/P2/P3/descarte con resumen", () => {
  const c = SophieKeywords.clasificar(MKL);
  ok(c.total >= 5, "debió parsear las 5 filas de datos (dio " + c.total + ")");
  ok(Array.isArray(c.P1) && Array.isArray(c.P2) && Array.isArray(c.P3), "faltan los buckets P1/P2/P3");
  ok(c.resumen && c.resumen.P1, "falta el resumen por prioridad");
  const conPrioridad = [...c.P1, ...c.P2, ...c.P3, ...c.descarte];
  ok(conPrioridad.every((f) => f.prioridad), "cada fila clasificada debe traer prioridad");
});

t("score de un listing sólido → veredicto y estado válidos, secciones suman el total", () => {
  const bueno = SophieKeywords.score(LISTING_BUENO);
  ok(["EXCELENTE", "BUENO", "MEJORABLE", "REHACER"].includes(bueno.veredicto), "veredicto fuera de la escala");
  ok(["go", "alerta", "nogo"].includes(bueno.estado), "estado fuera de la escala");
  const suma = bueno.secciones.titulo + bueno.secciones.itemHighlights + bueno.secciones.vinetas +
               bueno.secciones.backend + bueno.secciones.descripcion;
  eq(suma, bueno.total, "las secciones deben sumar el total");
});

t("título > 75 caracteres es BLOQUEANTE (Amazon lo reescribe) y no sale aprobado limpio", () => {
  const largo = { ...LISTING_BUENO, titulo: "x".repeat(120) };
  const s = SophieKeywords.score(largo);
  ok(s.bloqueante, "un título de 120 chars debe marcar bloqueante");
  ok(s.veredicto !== "EXCELENTE" && s.veredicto !== "BUENO", "no puede quedar aprobado limpio con título bloqueante");
});

/* ============================================================
   4 · VEREDICTO POR MÓDULO — Proveedores (costo aterrizado)
   ============================================================ */

grupo("Proveedores · SophieCotizaciones — aterrizar y evaluar");

// Proveedor sano en DDP (el proveedor cubre flete y arancel → sin estimados),
// margen holgado, MOQ razonable y empaque personalizado: debe salir VIABLE.
const PROV_CTX = { precioVenta: 30, comisionPct: 15, fbaUnidad: 5, capital: 20000, devolucionesPct: 3 };
const PROV_SANO = {
  proveedor: "Alpha Manufacturing", precioUnidad: 5, moq: 200, incoterm: "DDP",
  paisOrigen: "China", leadTimeDias: 30, personalizacion: true,
};
const PROV_MALO = {
  proveedor: "Barato pero caro", precioUnidad: 16, moq: 5000, incoterm: "DDP",
  paisOrigen: "China", leadTimeDias: 60, personalizacion: false,
};

t("proveedor sano (DDP, margen holgado, MOQ ok) → VIABLE", () => {
  const a = SophieCotizaciones.aterrizar(PROV_SANO, PROV_CTX);
  const e = SophieCotizaciones.evaluar(a);
  eq(e.veredicto, "VIABLE", "veredicto (margen " + a.margenPct + "%, aterrizado " + a.aterrizadoPct + "%)");
  eq(e.estado, "pass", "estado");
});

t("proveedor con precio alto y MOQ enorme → DESCARTAR (margen negativo / capital no alcanza)", () => {
  const a = SophieCotizaciones.aterrizar(PROV_MALO, PROV_CTX);
  const e = SophieCotizaciones.evaluar(a);
  eq(e.veredicto, "DESCARTAR", "veredicto");
  ok(e.criticos >= 1, "debe haber al menos un hallazgo crítico");
});

t("comparar rankea y evita la trampa del precio de lista", () => {
  const cmp = SophieCotizaciones.comparar([PROV_SANO, PROV_MALO], PROV_CTX);
  ok(cmp.recomendada, "debe recomendar una cotización");
  eq(cmp.recomendada.proveedor, "Alpha Manufacturing", "el sano debe rankear primero");
});

t("proveedor sano pero sin empaque personalizado → NEGOCIAR (alerta, no crítico)", () => {
  const a = SophieCotizaciones.aterrizar({ ...PROV_SANO, personalizacion: false }, PROV_CTX);
  const e = SophieCotizaciones.evaluar(a);
  eq(e.veredicto, "NEGOCIAR", "veredicto");
  eq(e.criticos, 0, "sin hallazgos críticos, solo alertas");
});

/* ============================================================
   5 · VEREDICTO POR MÓDULO — Lanzamiento (semáforo + reorden)
   ============================================================ */

grupo("Lanzamiento · SophieLanzamiento — semáforo y punto de reorden");

const LANZ_CTX = { breakEvenACOS: 33 };

t("semana sana (cinco verdes) → combinación 'celebrar'", () => {
  const sem = SophieLanzamiento.semaforo({
    semana: 3, unidadesVendidas: 120, metaUnidades: 100, posicion: 12, posicionAnterior: 30,
    sesiones: 900, cvr: 13, acos: 20, reviewsTotal: 18, metaReviews: 10, reviewsNegativas: 0,
  }, LANZ_CTX);
  eq(sem.ok, true, "ok");
  eq(sem.combinacion, "celebrar", "cinco verdes deberían celebrar");
  eq(sem.cuenta.rojo, 0, "no debería haber rojos");
});

t("reseñas negativas por calidad → congela el escalado (combinación 'calidad')", () => {
  const sem = SophieLanzamiento.semaforo({
    semana: 3, unidadesVendidas: 120, metaUnidades: 100, posicion: 12, posicionAnterior: 12,
    sesiones: 900, cvr: 13, acos: 20, reviewsTotal: 18, metaReviews: 10, reviewsNegativas: 5,
  }, LANZ_CTX);
  eq(sem.combinacion, "calidad", "un rojo de reseñas por calidad congela el escalado");
  incluye(sem.instruccion, "CONGELA", "la instrucción debe congelar el escalado");
});

t("inventario por debajo del punto de reorden → 'ordenar_ya'", () => {
  const reo = SophieLanzamiento.reorden(
    { inventarioActual: 40, velocidadDiaria: 6, unidadesVendidas: 180 },
    { leadTimeDias: 30, tipoEnvio: "mar", transitoDias: 35 });
  eq(reo.ok, true, "ok");
  eq(reo.estado, "ordenar_ya", "con 40 unidades y 6/día debería urgir ordenar");
});

t("dos o más rojos (sin rojo de calidad) → protocolo de 'rescate'", () => {
  const sem = SophieLanzamiento.semaforo({
    semana: 3, unidadesVendidas: 30, metaUnidades: 100, posicion: 60, posicionAnterior: 40,
    cayoSemanaAnterior: true, sesiones: 900, cvr: 2, acos: 20, reviewsTotal: 18, metaReviews: 10, reviewsNegativas: 0,
  }, LANZ_CTX);
  ok(sem.cuenta.rojo >= 2, "el fixture debe tener 2+ rojos (dio " + sem.cuenta.rojo + ")");
  eq(sem.combinacion, "rescate", "dos o más rojos activan el protocolo de rescate");
});

/* ============================================================
   6 · VEREDICTO POR MÓDULO — PPC (Cosecha y Poda)
   ============================================================ */

grupo("Ads/PPC · SophiePPC.clasificar — acciones por término");

const PPC_CTX = { precio: 30, breakEvenACOS: 33 };

t("término que gastó el CPA de equilibrio sin ventas → NEGAR", () => {
  const r = SophiePPC.clasificar(
    [{ term: "cheap gadget", imp: 500, clk: 12, spd: 12, sal: 0, ord: 0, src: { "Auto [broad]": { spd: 12, ord: 0 } } }],
    PPC_CTX);
  eq(r.ok, true, "ok");
  eq(r.decisiones[0].accion, "NEGAR", "acción");
});

t("término rentable fuera de exacta → COSECHAR", () => {
  const r = SophiePPC.clasificar(
    [{ term: "garlic press", imp: 1000, clk: 10, spd: 20, sal: 100, ord: 3, src: { "Auto [broad]": { spd: 20, ord: 3 } } }],
    PPC_CTX);
  eq(r.decisiones[0].accion, "COSECHAR", "acción");
});

t("gastó el equilibrio pero con muy pocos clics → VIGILAR (poca evidencia para negar)", () => {
  const r = SophiePPC.clasificar(
    [{ term: "niche term", imp: 300, clk: 2, spd: 14, sal: 0, ord: 0, src: { "Auto [broad]": { spd: 14, ord: 0 } } }],
    PPC_CTX);
  eq(r.decisiones[0].accion, "VIGILAR", "acción");
});

t("muchas impresiones y CTR bajísimo sin gastar el equilibrio → REVISAR_LISTING (no es puja)", () => {
  // Coherente con el gate '¿pujas o listing?' del Optimizador: cuando la gente
  // ve el anuncio y sigue de largo, el cuello de botella es imagen/precio, no puja.
  const r = SophiePPC.clasificar(
    [{ term: "relevant term", imp: 8000, clk: 12, spd: 4, sal: 0, ord: 0, src: { "Auto [broad]": { spd: 4, ord: 0 } } }],
    PPC_CTX);
  eq(r.decisiones[0].accion, "REVISAR_LISTING", "acción");
});

/* ============================================================
   6b · OPTIMIZADOR (repo hermano sophie-optiads) — gate "¿pujas o listing?"
   El gate NO vive en sophie-ui: es lógica a nivel de cuenta del Optimizador,
   en sophie-optiads/index.html. Cargamos ese index.html real en su propio DOM
   y ejercitamos el gate por unidad (la lógica) y por flujo completo (analizar).
   Si el repo no está montado como hermano, se OMITE con aviso (misma convención
   que las guardas del router: /workspace/sophie-*, ../sophie-*).
   ============================================================ */

grupo("Optimizador · gate '¿pujas o listing?' (sophie-optiads, repo hermano)");

const rutaOptiads = [
  "/workspace/sophie-optiads/index.html",
  resolve(raiz, "../sophie-optiads/index.html"),
  "/home/user/sophie-optiads/index.html",
].find((p) => existsSync(p));

if (!rutaOptiads) {
  salida.push("  ⚠ sophie-optiads no está montado como repo hermano — sección omitida (no bloquea)");
  registro.push({ tipo: "test", nombre: "Optimizador: sophie-optiads no montado — omitido (no bloquea)", ok: true });
} else {
  // El index.html del Optimizador con sus scripts, en su propio DOM.
  const domOpt = new JSDOM(readFileSync(rutaOptiads, "utf8"), {
    url: "https://optimizador.crezcamosonline.com/",
    runScripts: "dangerously",
  });
  const w = domOpt.window;
  w.HTMLElement.prototype.scrollIntoView = function () {}; // jsdom no lo implementa

  t("el Optimizador expone su gate y su flujo (evaluarGateListing / renderGateListing / analizar)", () => {
    ok(typeof w.evaluarGateListing === "function", "falta evaluarGateListing (¿cargó el index.html?)");
    ok(typeof w.renderGateListing === "function", "falta renderGateListing");
    ok(typeof w.analizar === "function", "falta analizar");
  });

  /* --- Unidad: la lógica del gate --- */
  t("con <100 clics no opina (datos insuficientes → null)", () => {
    eq(w.evaluarGateListing(50, 0, 0, 0), null);
  });
  t("relevante pero no convierte (cvr<8% con datos suficientes) → dispara el gate", () => {
    const g = w.evaluarGateListing(200, 2, 0, 1000);
    ok(g, "debió disparar");
    ok(g.cvr < 8, "reporta una conversión baja (cvr " + g.cvr + "%)");
  });
  t("40%+ del gasto sangrando en clics sin venta → dispara el gate aunque el cvr no sea bajo", () => {
    const g = w.evaluarGateListing(200, 30, 500, 1000); // cvr 15% pero 50% de sangrado
    ok(g, "debió disparar por sangrado");
    ok(g.pctSangrado >= 40, "reporta el sangrado (" + g.pctSangrado + "%)");
  });
  t("cuenta sana (buena conversión, poco sangrado) → no dispara (null)", () => {
    eq(w.evaluarGateListing(200, 40, 100, 1000), null);
  });

  /* --- Integración: el FLUJO completo analizar() con el gate --- */
  const H = "Customer Search Term\tClicks\tSpend\t7 Day Total Orders\t7 Day Total Sales";
  function correr(reporte, be, precio) {
    if (typeof w.setMode === "function") w.setMode("auto");
    w.document.getElementById("breakeven").value = String(be || 32);
    w.document.getElementById("precioVenta").value = String(precio || 34.95);
    w.document.getElementById("dataInput").value = reporte;
    w.analizar();
    return w.document.getElementById("gateListing");
  }

  t("FLUJO: tráfico relevante que no convierte → el gate se muestra y deriva a Sophie Listing", () => {
    const box = correr([H,
      "bamboo cutting board\t120\t180.00\t1\t34.95",
      "wood chopping board\t90\t120.00\t1\t34.95",
      "kitchen board large\t40\t60.00\t0\t0",
    ].join("\n"));
    eq(box.style.display, "block", "el gate debe hacerse visible");
    incluye(box.innerHTML, "pujas o de listing", "el mensaje del gate");
    incluye(box.innerHTML, "Sophie Listing", "debe derivar a Sophie Listing");
  });

  t("FLUJO: cuenta sana (buena conversión) → el gate queda oculto", () => {
    const box = correr([H,
      "bamboo cutting board\t120\t100.00\t20\t700.00",
      "wood chopping board\t90\t80.00\t16\t560.00",
    ].join("\n"));
    eq(box.style.display, "none", "sin problema de conversión, el gate no aparece");
  });

  t("FLUJO: <100 clics → el gate se calla (no opina sin datos)", () => {
    const box = correr([H,
      "bamboo cutting board\t40\t60.00\t0\t0",
      "wood chopping board\t30\t40.00\t0\t0",
    ].join("\n"));
    eq(box.style.display, "none", "por debajo de 100 clics no debe opinar");
  });
}

/* ============================================================
   7 · VEREDICTO POR MÓDULO — Rescate (diagnóstico) + contratos
   ============================================================ */

grupo("Rescate · SophieRescate.diagnosticar — veredicto y contratos");

const RESC_SANO = { precio: 30, cogs: 6, flete: 1.5, fbaFee: 5,
  unidadesFBA: 300, pedidosMes: 60, edadInventarioDias: 60, rating: 4.5, resenas: 40, indexacion: "si" };

t("economía y nicho sanos → RESCATAR, sin escalar", () => {
  const r = SophieRescate.diagnosticar(RESC_SANO);
  eq(r.veredicto, "RESCATAR", "veredicto");
  eq(r.escalaMentoria, false, "no debe escalar");
});

t("defecto de producto → CONGELAR (contrato de congelado)", () => {
  const r = SophieRescate.diagnosticar({ ...RESC_SANO, defectoProducto: true });
  eq(r.veredicto, "CONGELAR", "veredicto");
  ok(r.modos.reputacion.defecto, "reputación debe marcar el defecto");
});

t("economía roja + nicho vivo → PIVOTAR (ningún ajuste de pujas salva un margen así)", () => {
  // El test PIVOTAR que se formalizó en el prompt, verificado en el motor:
  // problema ESTRUCTURAL de economía, no ejecutivo.
  const r = SophieRescate.diagnosticar({
    precio: 18, cogs: 10, flete: 3, fbaFee: 5,
    unidadesFBA: 120, pedidosMes: 60, edadInventarioDias: 40, rating: 4.5, resenas: 40, indexacion: "si",
  });
  eq(r.gates.economia.estado, "rojo", "economía");
  ok(r.gates.nicho.estado === "verde" || r.gates.nicho.estado === "ambar", "el nicho debe seguir vivo");
  eq(r.veredicto, "PIVOTAR", "veredicto");
  eq(r.escalaMentoria, true, "PIVOTAR escala a mentoría");
});

t("economía viva + nicho migrado → PIVOTAR (el mercado se movió)", () => {
  const r = SophieRescate.diagnosticar({ ...RESC_SANO, nichoMigrado: true });
  eq(r.gates.nicho.estado, "rojo", "nicho migrado → rojo");
  eq(r.veredicto, "PIVOTAR", "veredicto");
});

/* ============================================================
   8 · COHERENCIA ENTRE MÓDULOS — donde dos Sophies podrían chocar
   ============================================================ */

grupo("Coherencia entre módulos · el consejo de una Sophie no contradice a otra");

t("CONGELADO manda: un producto con defecto NO recibe orden de gastar/escalar (Rescate)", () => {
  // La mejora pedagógica reciente: con defectoProducto, CONGELAR es un ESTADO.
  // El motor no debe emitir un plan de escalado sobre un producto defectuoso.
  const r = SophieRescate.diagnosticar({ ...RESC_SANO, defectoProducto: true, pujaActual: 0.5, pujaSugerida: 1.2 });
  eq(r.veredicto, "CONGELAR", "debe congelar");
  eq(r.escalaMentoria, true, "un defecto siempre escala a mentoría");
  // Coherencia con Ads: si Rescate congela, la visibilidad NO debe pedir más tráfico.
  ok(r.modos.reputacion.defecto === true, "el defecto queda registrado como el bloqueo activo");
});

t("un NO GO en Producto cierra la puerta a Proveedores/Listing/Ads aguas abajo", () => {
  // Coherencia de la costura: el mismo veredicto que ve la Puerta es el que
  // bloquea. Si esto se rompe, un producto descartado podría colarse a comprar
  // inventario. Verificamos el candado end-to-end.
  const a = accesoDe(DESCARTAR);
  eq(a.puerta.acceso, "bloqueado", "un NO GO no puede habilitar los módulos de inversión");
});

t("PPC 'sangra sin vender' es coherente con un diagnóstico de conversión, no de pujas", () => {
  // El término que gasta el CPA sin órdenes se NIEGA (no se sube puja).
  // Es la misma lógica que el gate '¿pujas o listing?' del Optimizador.
  const r = SophiePPC.clasificar(
    [{ term: "relevante pero no vende", imp: 2000, clk: 40, spd: 48, sal: 0, ord: 0, src: { "Exact": { spd: 48, ord: 0 } } }],
    PPC_CTX);
  const d = r.decisiones[0];
  ok(d.accion === "NEGAR" || d.accion === "NEGAR_EN_ORIGEN" || d.accion === "BAJAR_PUJA",
     "no debe recomendar SUBIR_PUJA sobre algo que sangra sin vender (dio " + d.accion + ")");
});

t("un rojo de CALIDAD congela el escalado en Lanzamiento igual que un defecto lo congela en Rescate", () => {
  // Coherencia transversal: la calidad manda sobre el ranking y sobre las pujas
  // en AMBOS módulos. Si uno congelara y el otro dejara escalar, la suite se
  // contradiría en el peor momento (un producto con problema de calidad).
  const lanz = SophieLanzamiento.semaforo({
    semana: 3, unidadesVendidas: 120, metaUnidades: 100, posicion: 12, posicionAnterior: 30,
    sesiones: 900, cvr: 13, acos: 20, reviewsTotal: 18, metaReviews: 10, reviewsNegativas: 5,
  }, LANZ_CTX);
  const resc = SophieRescate.diagnosticar({ ...RESC_SANO, defectoProducto: true });
  eq(lanz.combinacion, "calidad", "Lanzamiento congela el escalado por calidad");
  incluye(lanz.instruccion, "CONGELA", "la instrucción de Lanzamiento debe congelar");
  eq(resc.veredicto, "CONGELAR", "Rescate congela por defecto de producto");
});

t("VIAJE DE CICLO DE VIDA: un producto que entró ESTRELLA puede caer a Rescate, y la costura aguanta", () => {
  // 1) Entra sano: Producto ESTRELLA → Puerta permitido.
  const entrada = accesoDe(ESTRELLA);
  eq(entrada.r.veredicto, "PRODUCTO ESTRELLA", "entra como estrella");
  eq(entrada.puerta.acceso, "permitido", "la puerta lo deja construir");
  // 2) Consigue proveedor viable y un listing evaluable (sin romperse).
  eq(SophieCotizaciones.evaluar(SophieCotizaciones.aterrizar(PROV_SANO, PROV_CTX)).veredicto, "VIABLE", "proveedor viable");
  ok(["EXCELENTE", "BUENO", "MEJORABLE", "REHACER"].includes(SophieKeywords.score(LISTING_BUENO).veredicto), "listing evaluable");
  // 3) Meses después la economía se degrada (reprecio del nicho, márgenes): Rescate.
  const rescate = SophieRescate.diagnosticar({
    precio: 18, cogs: 10, flete: 3, fbaFee: 5,
    unidadesFBA: 120, pedidosMes: 60, edadInventarioDias: 40, rating: 4.4, resenas: 60, indexacion: "si",
  });
  // El mismo producto que fue GO ahora NO es RESCATAR ingenuo: el motor escala.
  ok(rescate.veredicto === "PIVOTAR" || rescate.veredicto === "LIQUIDAR", "un GO puede degradarse a PIVOTAR/LIQUIDAR (dio " + rescate.veredicto + ")");
  eq(rescate.escalaMentoria, true, "un veredicto que no es RESCATAR siempre escala a mentoría");
});

t("HILO DEL ÁNGULO: lo elegido en Producto viaja en el expediente y Listing lo audita contra el texto real", () => {
  // La costura nueva de la Capa 2 (cosmo-rufus). El estudiante elige su ángulo
  // UNA vez en Producto; ese ángulo tiene que llegar entero hasta Listing para
  // que la cobertura semántica se mida contra ÉL, no contra los 6 clusters.

  // 1) En Producto, el modelo confirma el ángulo: 3 clusters de intención + dolores C17.
  const veredicto = SophieIntencion.veredictoSemantico({
    lexico: "GO CON AJUSTES", c14_huerfanos: 3, c15_pct: 33, c16_huecos: 2, c17_dolores: 3, c18_si: 3,
    clustersElegidos: ["problema", "ocasion", "uso"],
    dolores: ["las tablas de plástico se rayan", "no sé si es segura para carne cruda"],
    nota: "Entrar como tabla premium reversible para cocina seria.",
  });
  eq(veredicto.clustersElegidos.length, 3, "el veredicto confirma el ángulo del estudiante");
  const ang = SophieIntencion.anguloExpediente(null, veredicto);

  // 2) El ángulo se guarda en el expediente — el hilo que viaja por la Ruta.
  const exp = SophieMotor.aExpediente(SophieMotor.evaluar(ESTRELLA), {}, {
    keyword: LISTING_BUENO.keywordP1,
    clustersElegidos: ang.clustersElegidos, doloresC17: ang.doloresC17, recomendacion: ang.recomendacion,
  });
  ok(exp.clustersElegidos.indexOf("problema") !== -1, "el expediente lleva el ángulo");
  eq(exp.doloresC17.length, 2, "y arrastra los dolores del C17");

  // 3) Aguas abajo, Listing lee el ángulo del expediente y AUDITA el texto real.
  const cob = SophieCobertura.evaluar(LISTING_BUENO, exp.clustersElegidos);
  eq(cob.total, 3, "Listing audita exactamente los 3 clusters del ángulo, no los 6");
  const porId = (id) => cob.porCluster.filter((c) => c.id === id)[0];
  ok(porId("problema").cubierto, "el atributo (bambú) SÍ está cubierto en el listing");
  ok(!porId("ocasion").cubierto, "el ángulo de regalo NO está en el texto → hueco que Rufus no lee");
  ok(cob.faltantes.indexOf("ocasion") !== -1, "el hueco queda señalado como faltante");
});

/* ============================================================
   9 · RENDER SIN ROMPERSE — cada pantalla se pinta en el DOM real
   ============================================================ */

grupo("Render · cada pantalla se pinta en jsdom sin lanzar");

pinta("Producto: Sophie.render pinta el veredicto completo", (sel) => {
  const r = SophieMotor.evaluar(ESTRELLA.datos, ESTRELLA.juicios);
  const payload = SophieMotor.aVeredicto(r, {
    titular: "Producto estrella", razon: "Cumple los 13 criterios", siguiente_paso: "Sigue a Proveedores",
  });
  Sophie.render(sel, payload);
});

pinta("Producto: SophieAnalisis pinta la fase 9 desde un marcador del modelo", (sel) => {
  const marca = "<!--SOPHIE:" + JSON.stringify({ fase: 9, datos: ESTRELLA.datos, juicios: ESTRELLA.juicios }) + "-->";
  const flujo = SophieAnalisis.iniciar(sel, {});
  flujo.fin(marca);
});

pinta("Listing: pinta la clasificación de keywords", (sel) => {
  const c = SophieKeywords.clasificar(MKL);
  SophieListing.pintarClasificacion(sel, c);
});

pinta("Listing: pinta el veredicto del score", (sel) => {
  SophieListing.pintarVeredicto(sel, LISTING_BUENO, SophieKeywords.clasificar(MKL));
});

pinta("Proveedores: pinta el score de un proveedor", (sel) => {
  SophieProveedores.pintar(sel, { tipo: "cotizaciones", datos: { lista: [PROV_SANO, PROV_MALO], ctx: PROV_CTX } });
});

pinta("Rescate: pinta el diagnóstico (RESCATAR)", (sel) => {
  SophieRescate.pintar(sel, SophieRescate.diagnosticar(RESC_SANO));
});

pinta("Rescate: pinta un veredicto PIVOTAR (ruta distinta a RESCATAR)", (sel) => {
  SophieRescate.pintar(sel, SophieRescate.diagnosticar({ ...RESC_SANO, nichoMigrado: true }));
});

pinta("Lanzamiento: pinta el semáforo + reorden", (sel) => {
  const sem = SophieLanzamiento.semaforo({
    semana: 3, unidadesVendidas: 120, metaUnidades: 100, posicion: 12, posicionAnterior: 30,
    sesiones: 900, cvr: 13, acos: 20, reviewsTotal: 18, metaReviews: 10, reviewsNegativas: 0,
  }, LANZ_CTX);
  const reo = SophieLanzamiento.reorden(
    { inventarioActual: 40, velocidadDiaria: 6, unidadesVendidas: 180 },
    { leadTimeDias: 30, tipoEnvio: "mar", transitoDias: 35 });
  SophieLanzamiento.pintar(sel, sem, reo);
});

pinta("Candidatos: pinta las tarjetas de evaluación", (sel, el) => {
  SophieCandidatos.pintar(el, {
    paso: 3, titulo: "Candidatos", candidatos: [
      { nombre: "Tabla de bambú", veredicto: "viable", nota: "Buen margen" },
      { nombre: "Funda de silicón", veredicto: "descartado", nota: "Saturado" },
    ],
  });
});

pinta("Puerta: pinta la advertencia de un RIESGO MODERADO", (sel) => {
  const r = SophiePuerta.evaluar("RIESGO MODERADO");
  SophiePuerta.pintar(sel, r, { modulo: "proveedores" });
});

/* ---------- reporte de texto ---------- */

console.log("RECORRIDO E2E · el camino de un producto por las Sophies");
console.log("productos sintéticos: ESTRELLA · MARGINAL · MEDIO · DESCARTAR   |   " +
            "valida: veredicto por módulo · coherencia entre módulos · render sin romperse");
console.log(salida.join("\n"));
console.log("");
console.log("RESULTADO: " + pasan + " pasan · " + fallan + " fallan");

/* ---------- reporte HTML opcional (node tools/recorrido-e2e.mjs --html ruta) --
   Un reporte visual del recorrido, para ver "qué hizo el bot" sin la terminal.
   Se genera SIEMPRE desde una corrida real, así que nunca miente.            */

function reporteHTML() {
  const i = process.argv.indexOf("--html");
  if (i === -1) return;
  const ruta = process.argv[i + 1] || resolve(raiz, "recorrido-e2e-reporte.html");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const totalOK = fallan === 0;

  let cuerpo = "";
  registro.forEach((e) => {
    if (e.tipo === "grupo") {
      cuerpo += '<h2>' + esc(e.texto.trim()) + '</h2>\n';
    } else {
      cuerpo += '<div class="t ' + (e.ok ? "ok" : "no") + '">' +
        '<span class="ic">' + (e.ok ? "✓" : "✗") + '</span>' +
        '<span class="nm">' + esc(e.nombre) + '</span>' +
        (e.ok ? "" : '<span class="er">' + esc(e.error) + '</span>') +
        '</div>\n';
    }
  });

  const html =
'<!doctype html><html lang="es"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>Recorrido E2E · Sophie</title><style>' +
':root{--bg:#0f1115;--card:#171a21;--tx:#e7e9ee;--mut:#9aa1ad;--ok:#3fb98a;--no:#e5484d;--bd:#262b35;--ac:#f7aa2e}' +
'@media(prefers-color-scheme:light){:root{--bg:#f6f7f9;--card:#fff;--tx:#1a1d23;--mut:#5b626d;--bd:#e4e7ec}}' +
'*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);' +
'font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:28px 18px}' +
'.wrap{max-width:820px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}' +
'.sub{color:var(--mut);font-size:13.5px;margin-bottom:20px}' +
'.hero{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--bd);' +
'border-radius:14px;padding:18px 20px;margin-bottom:8px}' +
'.big{font-size:40px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;' +
'color:' + (totalOK ? 'var(--ok)' : 'var(--no)') + '}' +
'.hero .d{font-size:13.5px;color:var(--mut)}.hero .d b{color:var(--tx);font-size:15px}' +
'.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;' +
'background:' + (totalOK ? 'rgba(63,185,138,.16)' : 'rgba(229,72,77,.16)') + ';' +
'color:' + (totalOK ? 'var(--ok)' : 'var(--no)') + '}' +
'.pilares{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 22px}' +
'.pilares span{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:8px 12px;font-size:12.5px;color:var(--mut)}' +
'.pilares b{color:var(--ac)}' +
'h2{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut);' +
'margin:22px 0 8px;font-weight:700}' +
'.t{display:flex;align-items:baseline;gap:10px;padding:9px 12px;border:1px solid var(--bd);' +
'border-radius:10px;margin-bottom:6px;background:var(--card)}' +
'.t .ic{font-weight:800}.t.ok .ic{color:var(--ok)}.t.no .ic{color:var(--no)}' +
'.t .nm{flex:1}.t .er{color:var(--no);font-size:12.5px;font-family:ui-monospace,monospace}' +
'.foot{color:var(--mut);font-size:12px;margin-top:24px;text-align:center}' +
'</style></head><body><div class="wrap">' +
'<h1>Recorrido E2E — el camino de un producto por las Sophies</h1>' +
'<div class="sub">Productos sintéticos ESTRELLA · MARGINAL · MEDIO · DESCARTAR recorriendo toda la suite.</div>' +
'<div class="hero"><div class="big">' + pasan + '/' + (pasan + fallan) + '</div>' +
'<div class="d"><div><b>' + (totalOK ? "Todo verde" : fallan + " fallando") + '</b> ' +
'<span class="pill">' + (totalOK ? "OK" : "REVISAR") + '</span></div>' +
'<div>' + pasan + ' aserciones pasan · ' + fallan + ' fallan</div></div></div>' +
'<div class="pilares"><span><b>1</b> Veredicto por módulo</span>' +
'<span><b>2</b> Coherencia entre módulos</span><span><b>3</b> Render sin romperse (jsdom)</span></div>' +
cuerpo +
'<div class="foot">Generado por <code>tools/recorrido-e2e.mjs --html</code> · Crezcamos Online · Sophie Suite</div>' +
'</div></body></html>';

  try {
    writeFileSync(ruta, html, "utf8");
    console.log("\nReporte HTML escrito en: " + ruta);
  } catch (e) {
    console.error("No se pudo escribir el reporte HTML: " + e.message);
  }
}
reporteHTML();

process.exit(fallan ? 1 : 0);
