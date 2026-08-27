#!/usr/bin/env node
/* ============================================================
   GUARDA DE PROMPTS DEL COCKPIT — sophie-creador
   Crezcamos Online · sophie-ui/tools/verificar-creador.mjs

   sophie-creador/lib/sophie-system.js es una TERCERA copia en
   prosa de la metodología (además del prompt de sophie-producto
   y de sophie-pasos.js). Sus 7 prompts traen a mano los umbrales
   de SEIS motores distintos: keywords, criterios, cotizaciones,
   PPC, lanzamiento y rescate.

   Nadie la vigilaba. Podías mover un umbral en sophie-ui, correr
   la guarda de metodología, ver OK, desplegar — y el cockpit del
   creador seguía razonando con el número viejo, en silencio.

   Esta guarda cierra ese hueco. Regla de diseño: aquí NO se
   escribe ningún umbral a mano. Cada comprobación NOMBRA un valor
   canónico (SophieKeywords.limites.titulo.max, …) y confirma que
   ese número aparece en el prompt del módulo. Si escribiéramos el
   número, esto sería una cuarta copia — el problema, no la cura.

   Uso:
     node tools/verificar-creador.mjs            (lenient)
     node tools/verificar-creador.mjs --strict   (exige el repo)

   Sale con código 1 si un prompt discrepa del motor.
   Si sophie-creador no está montado, se OMITE y el cierre lo
   dice: "PARCIAL", nunca "OK".
   ============================================================ */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { RAIZ, repoHermano, crearReporte, cerrar, numerosDe } from "./guarda-comun.mjs";

/* ---------- 1. motores de sophie-ui (la fuente única) ---------- */

// Los motores son IIFE que se cuelgan de un global. Los ejecutamos sobre un
// objeto ventana falso para leer sus constantes tal como las ve el navegador.
const win = {};
for (const f of [
  "sophie-criterios.js",
  "sophie-keywords.js",
  "sophie-cotizaciones.js",
  "sophie-ppc.js",
  "sophie-lanzamiento.js",
  "sophie-rescate.js",
]) {
  new Function("window", readFileSync(resolve(RAIZ, f), "utf8"))(win);
}

const SC = win.SophieCriterios;
const K = win.SophieKeywords;
const COT = win.SophieCotizaciones;
const PPC = win.SophiePPC.config;
const LAN = win.SophieLanzamiento;
const RES = win.SophieRescate.config;

/* ---------- 2. contrato: qué número canónico exige cada zona del prompt ---------- */

/* Cada zona recorta el FRAGMENTO del prompt donde el número debe estar, y solo
   ahí se busca. Buscar en el prompt entero no sirve: el marcador de Capa 2 trae
   un campo "c15_pct", de donde salía un 15 suelto que hacía pasar el umbral de
   C7 aunque el prompt dijera 20. Un guardián que pasa por accidente es peor que
   ninguno — por eso esto va por zonas.

   Regla: aquí NO se escribe ningún umbral a mano; cada check NOMBRA un valor
   canónico del motor. Si lo escribiéramos, esto sería una cuarta copia. */

const c = SC.porId.bind(SC);

// Zona de un criterio dentro de la línea "Umbrales clave": de "C7 " hasta el
// separador " · " (o el punto final de la frase).
function zonaCriterio(n) {
  return { zona: "C" + n, re: new RegExp("C" + n + "\\b[^·\\n]*") };
}
function criterio(n, conAlerta = true) {
  const cr = c(n);
  const checks = [{ que: "umbral", valor: cr.umbral_num }];
  if (conAlerta && cr.alerta_num != null) checks.push({ que: "alerta", valor: cr.alerta_num });
  return { ...zonaCriterio(n), etiqueta: "C" + n + " " + cr.criterio, checks };
}

const CONTRATO = {
  listing: [
    { zona: "límites de Amazon", re: /reglas de Amazon[^)]*\)/, checks: [
      { que: "título máx (chars)", valor: K.limites.titulo.max },
      { que: "item highlights máx (chars)", valor: K.limites.itemHighlights.max },
      { que: "backend máx (bytes)", valor: K.limites.backend.max },
      { que: "viñetas indexadas máx (bytes)", valor: K.limites.vinetasIndexado.max },
    ]},
    { zona: "margen de seguridad", re: /Deja margen \([^)]*\)/, checks: [
      { que: "backend objetivo (bytes)", valor: K.limites.backend.objetivo },
    ]},
    { zona: "clasificación P1/P2/P3", re: /clasifica P1\/P2\/P3 \([^)]*\)/, checks: [
      { que: "P1 · SV mín", valor: K.umbrales.P1.sv_min },
      { que: "P1 · rank máx", valor: K.umbrales.P1.rank_max },
      { que: "P1 · IQ mín", valor: K.umbrales.P1.iq_min },
      { que: "P2 · SV mín", valor: K.umbrales.P2.sv_min },
      { que: "P2 · SV máx", valor: K.umbrales.P2.sv_max },
      { que: "P2 · rank máx", valor: K.umbrales.P2.rank_max },
      { que: "P2 · IQ mín", valor: K.umbrales.P2.iq_min },
      { que: "P3 · SV mín", valor: K.umbrales.P3.sv_min },
      { que: "P3 · SV máx", valor: K.umbrales.P3.sv_max },
      { que: "P3 · IQ mín", valor: K.umbrales.P3.iq_min },
    ]},
    { zona: "filtro de Cerebro", re: /CSV de Cerebro:[^)]*/, checks: [
      { que: "SV mín", valor: filtroCerebro("Search Volume").min },
      { que: "competidores orgánicos mín", valor: filtroCerebro("Number of Organic Competitors").min },
      { que: "rank mín", valor: filtroCerebro("Competitor Organic Rank").min },
      { que: "rank máx", valor: filtroCerebro("Competitor Organic Rank").max },
    ]},
  ],
  producto: [
    { zona: "escala de veredicto", re: /VEREDICTO por puntaje[^\n]*/, checks: [
      { que: "PRODUCTO ESTRELLA desde", valor: SC.escala[0].min },
      { que: "GO CON AJUSTES desde", valor: SC.escala[1].min },
      { que: "RIESGO MODERADO desde", valor: SC.escala[2].min },
    ]},
    { zona: "lista de vetos", lista: { re: /VETOS = criterios ([\d,\s]+)/, esperado: SC.vetos } },
    criterio(1, false), // C1 solo declara el umbral; su alerta es el mismo número
    criterio(2), criterio(3), criterio(4),
    criterio(5, false),
    criterio(7), criterio(8), criterio(10), criterio(11),
  ],
  proveedores: [
    { zona: "umbrales", re: /UMBRALES:[^\n]*/, checks: [
      { que: "aterrizado objetivo (%)", valor: COT.umbrales.costoAterrizadoPct.objetivo },
      { que: "aterrizado alerta (%)", valor: COT.umbrales.costoAterrizadoPct.alerta },
      { que: "MOQ objetivo", valor: COT.umbrales.moq.objetivo },
      { que: "MOQ alerta", valor: COT.umbrales.moq.alerta },
      { que: "margen antes de PPC objetivo (%)", valor: COT.umbrales.margenAntesPPC.objetivo },
      { que: "margen antes de PPC alerta (%)", valor: COT.umbrales.margenAntesPPC.alerta },
      { que: "ROI objetivo", valor: COT.umbrales.roi.objetivo },
      { que: "ROI alerta", valor: COT.umbrales.roi.alerta },
      { que: "reserva PPC (%)", valor: COT.umbrales.reservaPPC * 100 },
    ]},
  ],
  // Ads y Optimizador citan las constantes del motor de PPC con su nombre, así
  // que se verifican como pares NOMBRE=valor: más estricto que buscar el número.
  ads: [{ zona: "constantes del motor", pares: PPC }],
  optimizador: [{ zona: "constantes del motor", pares: PPC }],
  lanzamiento: [
    { zona: "semáforo", re: /SEMÁFORO \(umbrales exactos\):[^\n]*/, checks: [
      { que: "ventas verde (%)", valor: LAN.config.VENTAS_VERDE },
      { que: "ventas amarillo (%)", valor: LAN.config.VENTAS_AMARILLO },
      { que: "CVR verde (%)", valor: LAN.config.CVR_VERDE },
      { que: "CVR amarillo (%)", valor: LAN.config.CVR_AMARILLO },
      { que: "techo ACoS · F1", valor: LAN.config.TECHO_ACOS[1] },
      { que: "techo ACoS · F2", valor: LAN.config.TECHO_ACOS[2] },
      { que: "techo ACoS · F3", valor: LAN.config.TECHO_ACOS[3] },
      { que: "holgura amarilla de ACoS (%)", valor: LAN.config.ACOS_HOLGURA_AMARILLO * 100 },
      { que: "reseñas amarillo", valor: LAN.config.REVIEWS_AMARILLO },
      { que: "quejas 1-2★ que fuerzan rojo", valor: LAN.config.REVIEWS_QUEJAS_ROJO },
      { que: "posición de página 1", valor: LAN.config.PAGINA_1 },
    ]},
    { zona: "fases por semana", re: /FASES por semana:[^\n]*/, checks: [
      { que: "fin de F1 (semana)", valor: LAN.fases[1][1] },
      { que: "fin de F2 (semana)", valor: LAN.fases[2][1] },
      { que: "fin de F3 (semana)", valor: LAN.fases[3][1] },
    ]},
    { zona: "punto de reorden", re: /PUNTO DE REORDEN[^\n]*/, checks: [
      { que: "tránsito marítimo (días)", valor: LAN.config.TRANSITO.maritimo },
      { que: "tránsito aéreo (días)", valor: LAN.config.TRANSITO.aereo },
      { que: "tránsito híbrido (días)", valor: LAN.config.TRANSITO.hibrido },
      { que: "buffer (días)", valor: LAN.config.BUFFER_DIAS },
    ]},
  ],
  rescate: [
    { zona: "frente · economía", re: /• Economía:[^\n]*/, checks: [
      { que: "referral (%)", valor: RES.REFERRAL * 100 },
      { que: "margen verde (%)", valor: RES.MARGEN_VERDE },
      { que: "margen ámbar (%)", valor: RES.MARGEN_AMBAR },
    ]},
    { zona: "frente · nicho", re: /• Nicho[^\n]*/, checks: [
      { que: "cobertura verde (meses)", valor: RES.COBERTURA_VERDE },
      { que: "cobertura ámbar (meses)", valor: RES.COBERTURA_AMBAR },
      { que: "edad de decisión (días)", valor: RES.EDAD_DECISION },
    ]},
    { zona: "frente · visibilidad", re: /• Visibilidad:[^\n]*/, checks: [
      { que: "puja mín (% de la sugerida)", valor: RES.VIS_PUJA_PCT },
      { que: "impresiones mín/mes", valor: RES.VIS_IMPRESIONES },
      { que: "sesiones mín/día", valor: RES.VIS_SESIONES_DIA },
      { que: "presupuesto mín ($)", valor: RES.VIS_PRESUPUESTO },
    ]},
    { zona: "frente · reputación", re: /• Reputación:[^\n]*/, checks: [
      { que: "rating rojo", valor: RES.REP_ROJO },
      { que: "rating verde", valor: RES.REP_VERDE },
      { que: "reseñas mínimas", valor: RES.REP_RESENAS_MINIMAS },
    ]},
    { zona: "frente · conversión", re: /• Conversión[^\n]*/, checks: [
      { que: "gate de clics", valor: RES.CONV_CLICS_MINIMOS },
      { que: "CTR rojo (%)", valor: RES.CTR_ROJO },
      { que: "CTR verde (%)", valor: RES.CTR_VERDE },
      { que: "CVR rojo (%)", valor: RES.CVR_ROJO },
      { que: "CVR verde (%)", valor: RES.CVR_VERDE },
    ]},
    { zona: "métrica del plan", re: /Métrica del plan:[^\n]*/, checks: [
      { que: "pedidos mínimos", valor: RES.VIS_PEDIDOS_MINIMOS },
      { que: "ACOS día 31+ (× break-even)", valor: RES.ACOS_TECHO_DIA31 },
    ]},
    { zona: "ventana del plan", re: /plan de \d+ días/, checks: [
      { que: "días de control", valor: RES.CONTROL_DIAS },
    ]},
  ],
};

function filtroCerebro(campo) {
  const f = SC.filtros.cerebro.find((x) => x.campo === campo);
  if (!f) throw new Error("filtro de Cerebro desconocido: " + campo);
  return f;
}

/* ---------- 3. verificación ---------- */

const rep = crearReporte();
const { ruta, revisados } = repoHermano("sophie-creador", "lib/sophie-system.js");

if (!ruta) {
  rep.seccion("PROMPTS DEL COCKPIT (sophie-creador/lib/sophie-system.js)");
  rep.aviso("No encuentro sophie-system.js (repo no montado). Revisado: " + revisados.join(" | "));
} else {
  const { SYSTEMS } = await import(pathToFileURL(ruta).href);

  for (const [modulo, zonas] of Object.entries(CONTRATO)) {
    rep.seccion("MÓDULO " + modulo.toUpperCase());
    const prompt = SYSTEMS[modulo];
    if (!prompt) { rep.fail("el cockpit no define un prompt para este módulo"); continue; }

    for (const z of zonas) {
      const nombre = z.etiqueta || z.zona;

      // Pares NOMBRE=valor (constantes del motor de PPC citadas por su nombre).
      if (z.pares) {
        for (const [nom, valor] of Object.entries(z.pares)) {
          const m = prompt.match(new RegExp("\\b" + nom + "\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)"));
          if (!m) rep.fail(nombre + " · " + nom + ": el motor dice " + valor + " y el prompt no la cita");
          else if (Number(m[1]) !== valor) rep.fail(nombre + " · " + nom + ": el motor dice " + valor + " y el prompt dice " + m[1]);
          else rep.ok(nombre + " · " + nom + " = " + valor);
        }
        continue;
      }

      // Lista exacta (p.ej. qué criterios son veto): comparar el conjunto
      // completo, no la presencia de cada número por separado.
      if (z.lista) {
        const m = prompt.match(z.lista.re);
        if (!m) { rep.fail(nombre + ": no encuentro esta zona en el prompt (¿la reescribieron?)"); continue; }
        const enPrompt = m[1].split(/[,\s]+/).filter(Boolean).map(Number);
        const esperado = z.lista.esperado;
        const igual = enPrompt.length === esperado.length && esperado.every((v, i) => enPrompt[i] === v);
        if (igual) rep.ok(nombre + " = [" + esperado.join(", ") + "]");
        else rep.fail(nombre + ": el motor dice [" + esperado.join(", ") + "] y el prompt dice [" + enPrompt.join(", ") + "]");
        continue;
      }

      const trozo = prompt.match(z.re);
      if (!trozo) { rep.fail(nombre + ": no encuentro esta zona en el prompt (¿la reescribieron?)"); continue; }
      const nums = numerosDe(trozo[0]);
      const faltan = z.checks.filter((x) => !nums.has(x.valor));
      if (faltan.length) {
        for (const f of faltan) {
          rep.fail(nombre + " · " + f.que + ": el motor dice " + f.valor + ", y la zona del prompt no lo menciona → \"" + trozo[0].trim() + "\"");
        }
      } else {
        rep.ok(nombre + ": " + z.checks.length + " valor(es) del motor presentes");
      }
    }
  }

  // Módulos del cockpit sin contrato: no fallan, pero que no pasen inadvertidos.
  const sinContrato = Object.keys(SYSTEMS).filter((m) => !CONTRATO[m]);
  if (sinContrato.length) {
    rep.seccion("SIN CONTRATO");
    rep.aviso("prompts que esta guarda todavía no cubre: " + sinContrato.join(", "));
  }
}

/* ---------- reporte ---------- */

cerrar(rep, {
  titulo: "GUARDA DE PROMPTS DEL COCKPIT · motores de sophie-ui como fuente única",
  falla: "umbral(es) del cockpit fuera de sincronía. Corrige lib/sophie-system.js en sophie-creador (el motor manda).",
  parcial: "que los prompts del cockpit sigan los umbrales de los motores",
  ok: "los prompts del cockpit citan los umbrales vigentes de los motores.",
  comando: "node tools/verificar-creador.mjs",
});
