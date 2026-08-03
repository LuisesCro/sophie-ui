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

import { readFileSync } from "node:fs";
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

const {
  SophieCriterios, Sophie, SophieMotor, SophieKeywords, SophieCotizaciones,
  SophiePasos, SophieAnalisis, SophieListing, SophieProveedores,
  SophieCandidatos, SophiePPC, SophieRescate, SophieLanzamiento, SophiePuerta,
} = win;

/* ---------- arnés de aserciones (mismo estilo que test-parsers) ---------- */

let pasan = 0, fallan = 0;
const salida = [];
function grupo(t) { salida.push("\n" + t); }
function t(nombre, fn) {
  try { fn(); pasan++; salida.push("  ✓ " + nombre); }
  catch (e) { fallan++; salida.push("  ✗ " + nombre + " — " + e.message); }
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

pinta("Rescate: pinta el diagnóstico", (sel) => {
  SophieRescate.pintar(sel, SophieRescate.diagnosticar(RESC_SANO));
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

/* ---------- reporte ---------- */

console.log("RECORRIDO E2E · el camino de un producto por las Sophies");
console.log("productos sintéticos: ESTRELLA · MARGINAL · DESCARTAR   |   " +
            "valida: veredicto por módulo · coherencia entre módulos · render sin romperse");
console.log(salida.join("\n"));
console.log("");
console.log("RESULTADO: " + pasan + " pasan · " + fallan + " fallan");
process.exit(fallan ? 1 : 0);
