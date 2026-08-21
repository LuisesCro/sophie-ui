/* ============================================================
   SOPHIE · PPC v1.0  —  Motor de Cosecha y Poda
   Crezcamos Online — ui.crezcamosonline.com/sophie-ppc.js

   Clasifica cada término del Search Term Report contra los
   números REALES del estudiante. La METODOLOGÍA —qué es
   desperdicio, cuándo cosechar a exacta, cuándo negar en
   origen— es la estrategia de optimización de Crezcamos Online
   (Cosecha y Poda). Lo que NO se copia son las constantes: cada
   umbral en dólares se deriva del precio y del break-even ACOS
   del estudiante, que ya calcula la pestaña COGS. Así la
   estrategia está calibrada a la economía real de cada producto,
   no a un número fijo que sirve para unas cuentas y arruina otras.

   Entrada: el array de términos que arma pivotSearchTerms()
            { term, imp, clk, spd, sal, ord, src, ctr, cpc, cvr }
   Salida:  una decisión por término + un resumen de cuenta.

   El modelo NO recalcula nada de esto. Interpreta, nombra la
   campaña, explica el porqué y escribe el bloque de negaciones.
   ============================================================ */

(function (global) {
  'use strict';

  /* ============================================================
     MAPA METODOLÓGICO · Cosecha y Poda
     Cada acción de este motor es una jugada de la metodología,
     calibrada al break-even del estudiante y no a un número fijo:

     - DESPERDICIO vs. SEÑAL. La metodología maneja dos umbrales de clics
       sin venta: ~5 clics / ~$10 es la primera bandera de desperdicio;
       ~10 clics / ~$20 es la significancia para actuar. La suite unifica
       en el más conservador (10 clics = PISO_CLICS) para no podar por
       mala suerte, pero la compuerta que REALMENTE decide es el gasto
       contra el CPA de equilibrio (beCPA), no el conteo de clics.
     - COSECHA (harvest). Término que convierte en Auto/Broad/Phrase y
       NO vive en exacta -> se promueve a su exacta (COSECHAR) y se niega
       en exacto en la de origen para que no compitan. Señal:
       CPA bajo + CVR alto -> exacta aislada (ISO).
     - NEGAR_EN_ORIGEN. Ya tiene su exacta pero sigue corriendo en otra:
       solo falta la negación (mata la autocompetencia que infla el CPC).
     - TIPO DE NEGACIÓN (phrase/exact/marca/ASIN) y RELEVANCIA los decide
       el modelo, no el motor: ningún precio salva a un término irrelevante,
       pero negar uno relevante y caro mata ranking -> ahí se baja la puja.
     ============================================================ */

  /* ============================================================
     UMBRALES · el único lugar donde se tocan
     ============================================================ */
  var CONFIG = {
    // Piso estadístico para negar. Por debajo de esto no hay señal,
    // solo mala suerte. La industria profesional usa 15-20, pero eso
    // asume cuentas con volumen: un estudiante a 12 USD/día tardaría
    // semanas en llegar. Como el gasto es la SEGUNDA compuerta y casi
    // siempre es la que manda, este piso solo protege del clic caro
    // aislado. Subirlo a 12-15 hace el motor más conservador.
    // UNIFICADO con el Optimizador (decisión de Luis, metodología híbrida):
    // el piso de clics oficial de la suite es 10. La compuerta de gasto sigue
    // siendo la que decide; este piso solo exige evidencia mínima.
    PISO_CLICS: 10,

    // Cosecha: órdenes mínimas para promover a exacta.
    MIN_ORDENES_COSECHA: 2,

    // Margen que se le exige a las PUJAS por encima del equilibrio.
    // Operar exactamente en break-even es operar en cero: el techo de
    // puja se calcula contra un CPA objetivo 20% por debajo.
    // Ojo: esto aplica SOLO a pujas. Negar y cosechar usan el
    // break-even puro, para no podar de más ni cosechar de menos.
    MARGEN_OBJETIVO: 0.20,

    // Banda muerta de pujas: no se sugiere subir hasta estar 20% por
    // debajo del techo. Evita recomendar movimientos de dos centavos.
    HOLGURA_SUBIR: 0.80,

    // CTR de cementerio: muchas impresiones, nadie hace clic.
    // Señal de imagen principal o de relevancia, no de puja.
    MIN_IMP_CTR: 1000,
    CTR_MINIMO: 0.30,

    // Rigor estadístico: z del intervalo de Wilson. 1.28 ≈ 90% de confianza
    // de un lado. Más alto = más conservador (exige más evidencia antes de
    // negar o cosechar). Es la palanca de "qué tan seguro antes de actuar".
    Z_CONFIANZA: 1.28,

    // Prior Bayesiano: "fuerza" del prior en clics equivalentes. El CVR de la
    // cuenta pesa como si fueran ~12 clics de evidencia previa; con menos clics
    // que esto el prior manda, con más manda el término. 0 = desactiva el prior
    // y usa Wilson puro (cada término en el vacío).
    PRIOR_FUERZA: 12
  };

  /* ============================================================
     Utilidades
     ============================================================ */
  function n(v, d) { v = parseFloat(v); return isFinite(v) ? v : (d || 0); }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* ============================================================
     RIGOR ESTADISTICO · Intervalo de Wilson para una proporcion
     El CVR (ordenes/clics) es una proporcion medida en una muestra
     ruidosa. En vez de creerle al punto (3/10 = "30%") comparamos la
     BANDA de confianza contra el CVR de equilibrio:
       - negar solo si el TECHO del CVR sigue por debajo del equilibrio
         (aun en el mejor caso pierde),
       - cosechar solo si el PISO del CVR ya supera el equilibrio
         (aun en el peor caso gana).
     Wilson se porta bien con n chico y cerca de 0/1, donde la
     aproximacion normal se rompe. z = nivel de confianza (1.28 ~ 90%
     de un lado): mas alto = mas conservador = mas evidencia exigida.
     ============================================================ */
  function wilson(succ, trials, z) {
    trials = n(trials, 0); succ = n(succ, 0);
    if (trials <= 0) return { lo: 0, hi: 1 };
    z = z || 1.28;
    var p = succ / trials, z2 = z * z;
    var denom = 1 + z2 / trials;
    var centro = p + z2 / (2 * trials);
    var margen = z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials));
    return {
      lo: Math.max(0, (centro - margen) / denom),
      hi: Math.min(1, (centro + margen) / denom)
    };
  }

  // Clics de 0 ventas necesarios para negar con confianza, dado el CVR de
  // equilibrio: el techo de Wilson de 0/n es z²/(n+z²); se despeja n para que
  // caiga por debajo de beCVR. Sirve para decirle al estudiante "faltan ~M clics".
  function clicsParaNegar(beCVR, z) {
    z = z || 1.28; var z2 = z * z;
    if (!(beCVR > 0) || beCVR >= 1) return 0;
    return Math.max(1, Math.ceil(z2 * (1 - beCVR) / beCVR));
  }

  /* ============================================================
     PRIOR BAYESIANO (Empirical Bayes · shrinkage hacia la cuenta)
     Wilson juzga cada término en el vacío. Pero sabemos la conversión
     TÍPICA de la cuenta (baseCVR = órdenes/clics del reporte). La
     usamos como PRIOR: cada término arranca cerca de esa base y se
     despega conforme acumula evidencia propia. Así:
       - poca data -> el intervalo se ENCOGE hacia la base (decide antes,
         no condena por ruido, no premia un 2/2 de suerte),
       - mucha data -> el término manda (el prior se desvanece).
     Prior Beta(a0,b0) con media = baseCVR y fuerza k = "clics
     equivalentes". Posterior Beta(a0+ord, b0+clics-ord); intervalo por
     aproximación normal a la Beta (media ± z·desv), que es cerrada,
     estable y suficiente cerca de la frontera de decisión. Si no hay
     base útil (cuenta sin conversiones), cae a Wilson (no informativo).
     ============================================================ */
  function intervalo(succ, trials, baseCVR, k, z) {
    if (!(baseCVR > 0) || !(k > 0)) return wilson(succ, trials, z);   // sin prior útil
    z = z || 1.28;
    var a = baseCVR * k + succ;
    var b = (1 - baseCVR) * k + (trials - succ);
    var tot = a + b;
    var media = a / tot;
    var desv = Math.sqrt(a * b / (tot * tot * (tot + 1)));
    return {
      lo: Math.max(0, media - z * desv),
      hi: Math.min(1, media + z * desv),
      media: media,
      base: baseCVR
    };
  }

  // ¿El término ya vive en una campaña exacta? Se lee de las claves
  // de src, que vienen como "Nombre de campaña [match type]".
  function enExacta(src) {
    if (!src) return false;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (/\[(.*\b(exact|exacta|exacto)\b.*)\]/i.test(k)) return true;
    }
    return false;
  }

  // ¿Y además aparece FUERA de la exacta? Sin esto no hay campaña de
  // origen que negar: un término que solo vive en su exacta no está
  // compitiendo consigo mismo, está trabajando bien.
  function enNoExacta(src) {
    if (!src) return false;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (!/\[(.*\b(exact|exacta|exacto)\b.*)\]/i.test(k)) return true;
    }
    return false;
  }

  // Campaña donde el término gastó más: es donde hay que actuar.
  function campanaPrincipal(src) {
    var mejor = '', max = -1;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (src[k].spd > max) { max = src[k].spd; mejor = k; }
    }
    return mejor;
  }

  function listaCampanas(src) {
    var out = [];
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      out.push({ origen: k, gasto: r2(src[k].spd), ordenes: src[k].ord });
    }
    return out.sort(function (a, b) { return b.gasto - a.gasto; });
  }

  // Marcas de competidores: economía de conversión distinta, no se
  // pueden juzgar con los umbrales normales.
  function esMarcaExcluida(term, marcas) {
    if (!marcas || !marcas.length) return false;
    var t = String(term).toLowerCase();
    for (var i = 0; i < marcas.length; i++) {
      var m = String(marcas[i]).toLowerCase().trim();
      if (m && t.indexOf(m) !== -1) return true;
    }
    return false;
  }

  /* ============================================================
     CLASIFICADOR
     ============================================================ */
  // Filas que NO son busquedas de un cliente sino EXPRESIONES DE SEGMENTACION de
  // Amazon: grupos de la Auto (close/loose-match, substitutes, complements), temas
  // (keyword-group="..."), o targets de producto/categoria (asin="...", category="...").
  // Amazon las mete como "termino" cuando el gasto no se atribuye a una query. No se
  // negativizan como keyword ni se cosechan a exacta: se gestionan a nivel de target.
  var SEG_LABELS = {
    'close match': 1, 'loose match': 1, 'substitutes': 1, 'complements': 1,
    'coincidencia cercana': 1, 'coincidencia lejana': 1, 'concordancia amplia': 1, 'concordancia cercana': 1, 'concordancia lejana': 1,
    'sustitutos': 1, 'substitutos': 1, 'complementarios': 1, 'complementos': 1,
    'queryhighrelmatches': 1, 'querybroadrelmatches': 1, 'asinsubstituterelated': 1, 'asinaccessoryrelated': 1
  };
  function esSegmentacion(term) {
    var raw = String(term == null ? '' : term).trim();
    if (!raw || raw === '*' || raw === '-') return true;
    if (/=\s*"/.test(raw)) return true;                                  // clave="valor"
    if (/^(keyword-group|audience|product|category)\b/i.test(raw)) return true;
    var t = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    return !!SEG_LABELS[t];
  }

  function clasificar(terminos, ctx, opciones) {
    ctx = ctx || {};
    var C = Object.assign({}, CONFIG, opciones || {});

    var precio = n(ctx.precio);
    var beACOS = n(ctx.breakEvenACOS);          // en porcentaje: 32 = 32%
    var marcas = ctx.marcasCompetidores || [];
    var dias = n(ctx.diasReporte, 0);
    // Objetivo de la campaña (PPC Mastery V9-V10): reencuadra el veredicto de los
    // terminos que CONVIERTEN. rentabilidad = default (ACOS/CPA manda); ranking =
    // se acepta operar hasta break-even para rankear; conquista/PAT = ROAS bajo
    // esperado. Si no viene, se comporta como antes (rentabilidad).
    var objetivo = String(ctx.objetivo || 'rentabilidad').toLowerCase();
    var ventasTotales = n(ctx.ventasTotales, 0);   // ventas TOTALES del producto (orgánicas+ads) -> TACOS

    if (precio <= 0 || beACOS <= 0) {
      return {
        ok: false,
        error: 'Faltan el precio de venta o el break-even ACOS. Sin esos dos números no hay contra qué medir: el estudiante los obtiene en la pestaña COGS.'
      };
    }

    // Los dos números de los que cuelga todo lo demás.
    var beCPA = precio * (beACOS / 100);                       // equilibrio
    var targetACOS = beACOS * (1 - C.MARGEN_OBJETIVO);
    var targetCPA = precio * (targetACOS / 100);               // con margen

    var lista = Array.isArray(terminos) ? terminos : [];

    // Clics por orden de la CUENTA: sirve de referencia cuando un
    // término convierte pero tiene muy poca data propia.
    var totClk = 0, totOrd = 0, totSpd = 0, totSal = 0;
    var baseClk = 0, baseOrd = 0;   // para el prior: excluye filas de segmentación
    lista.forEach(function (t) {
      totClk += n(t.clk); totOrd += n(t.ord); totSpd += n(t.spd); totSal += n(t.sal);
      if (!esSegmentacion(t.term)) { baseClk += n(t.clk); baseOrd += n(t.ord); }
    });
    var cpoCuenta = totOrd > 0 ? (totClk / totOrd) : 0;
    // Línea base de conversión de la cuenta: el PRIOR Bayesiano de cada término.
    // Solo si hay evidencia real (clics y al menos una conversión) y se excluyen
    // las expresiones de segmentación (no son búsquedas). Si no, null -> Wilson.
    var baseCVR = (baseClk > 0 && baseOrd > 0) ? (baseOrd / baseClk) : null;

    var decisiones = lista.map(function (t) {
      var clk = n(t.clk), ord = n(t.ord), spd = n(t.spd), sal = n(t.sal), imp = n(t.imp);
      var cpc = clk > 0 ? spd / clk : 0;
      var cvr = clk > 0 ? (ord / clk * 100) : 0;
      var acos = sal > 0 ? (spd / sal * 100) : null;
      var cpo = ord > 0 ? (clk / ord) : 0;          // clics por orden del término

      // Rigor estadístico: banda de confianza del CVR real vs. el CVR de
      // equilibrio (el CVR que ESTE término necesita para no perder a su CPC).
      var beCVR = (cpc > 0 && beCPA > 0) ? (cpc / beCPA) : null;   // CVR de equilibrio
      // Intervalo del CVR real con PRIOR de la cuenta (Empirical Bayes); si no
      // hay base útil, es Wilson puro. Misma comparación contra beCVR.
      var ci = intervalo(ord, clk, baseCVR, C.PRIOR_FUERZA, C.Z_CONFIANZA);
      var confiadoPerdedor = (beCVR !== null) && (ci.hi < beCVR);  // aun en el mejor caso pierde
      var confiadoGanador  = (beCVR !== null) && (ci.lo >= beCVR); // aun en el peor caso gana

      // Techo de puja: lo que puedes pagar por clic y aún llegar al
      // CPA objetivo, dado cuántos clics te cuesta una orden.
      var maxCPC = null;
      if (cpo > 0) maxCPC = targetCPA / cpo;
      else if (cpoCuenta > 0) maxCPC = targetCPA / cpoCuenta;   // referencia

      var d = {
        termino: t.term,
        clics: clk, ordenes: ord,
        gasto: r2(spd), ventas: r2(sal),
        cpc: r2(cpc), cvr: r2(cvr),
        acos: acos === null ? null : r2(acos),
        clicsPorOrden: cpo ? r2(cpo) : null,
        maxCPC: maxCPC === null ? null : r2(maxCPC),
        maxCPCEsReferencia: ord === 0,
        confianza: {
          cvrLo: r2(ci.lo * 100),
          cvrHi: r2(ci.hi * 100),
          beCVR: beCVR === null ? null : r2(beCVR * 100),
          baseCuenta: baseCVR === null ? null : r2(baseCVR * 100),
          conPrior: baseCVR !== null && C.PRIOR_FUERZA > 0
        },
        campanas: listaCampanas(t.src),
        campanaPrincipal: campanaPrincipal(t.src),
        yaEnExacta: enExacta(t.src),
        tambienFueraDeExacta: enNoExacta(t.src),
        accion: 'MANTENER',
        motivo: '',
        requiereJuicio: false
      };

      /* --- Segmentacion (grupo de la Auto, tema o target de producto/categoria): NO es un termino --- */
      if (esSegmentacion(t.term)) {
        d.accion = 'SEGMENTACION';
        d.motivo = 'No es una busqueda de cliente sino una expresion de segmentacion (grupo de la Auto, tema o target de producto/categoria). No se negativiza como keyword ni se cosecha a exacta: se gestiona por puja/pausa, o con negativo de producto/categoria.';
        d.requiereJuicio = true;
        return d;
      }

      /* --- Marca de competidor: fuera de los umbrales normales --- */
      if (esMarcaExcluida(t.term, marcas)) {
        d.accion = 'REVISAR_MARCA';
        d.motivo = 'Término de marca de competidor. Se evalúa aparte: la conquista tiene economía distinta y puede justificar un ACOS alto a propósito.';
        d.requiereJuicio = true;
        return d;
      }

      /* --- Sin órdenes --- */
      if (ord === 0) {
        var pasaGasto = spd >= beCPA;
        var pasaClics = clk >= C.PISO_CLICS;
        var ctrTerm = (imp > 0) ? (clk / imp * 100) : null;   // CTR del termino si vino la columna

        if (pasaGasto && pasaClics && objetivo === 'ranking') {
          // En lanzamiento se es paciente: puede ser una "priming query" del embudo (V4).
          d.accion = 'VIGILAR';
          d.motivo = 'Gastó $' + r2(spd) + ' sin vender, pero el objetivo es RANKING: negar solo si es ' +
                     'IRRELEVANTE. Si es relevante puede ser priming/intent mismatch (baja la puja o arregla ' +
                     'el listing), no lo mates.';
          d.requiereJuicio = true;
        } else if (pasaClics && confiadoPerdedor) {
          // RIGOR: no basta con haber gastado el equilibrio; el techo del CVR real
          // ya cayó por debajo del CVR de equilibrio -> aun con suerte pierde.
          d.accion = 'NEGAR';
          var intent = (ctrTerm !== null && ctrTerm >= 0.40);
          d.motivo = (intent
            ? ('CTR ' + r2(ctrTerm) + '% y 0 ventas tras $' + r2(spd) + '. Hacen clic pero no compran: si el ' +
               'termino es relevante es tu LISTING o PRECIO (intent mismatch); si no, negativo exacto.')
            : ('Gastó $' + r2(spd) + ' sin una sola venta con ' + clk + ' clics.')) +
            ' Evidencia: aun en el mejor caso su CVR real (≤' + r2(ci.hi * 100) + '%) no llega a tu equilibrio de ' +
            r2(beCVR * 100) + '%. Negar ya no es adivinar.';
          d.requiereJuicio = true;  // el modelo decide negar vs. bajar puja según relevancia
        } else if (pasaGasto && pasaClics && !confiadoPerdedor) {
          // Gastó el equilibrio, pero con estos clics el intervalo aún no descarta
          // rentabilidad: podría ser mala suerte. Se protege de negar un ganador.
          d.accion = 'VIGILAR';
          d.motivo = 'Gastó $' + r2(spd) + ' sin vender, pero con solo ' + clk + ' clics su CVR real todavía ' +
                     'podría llegar a ' + r2(ci.hi * 100) + '% — cruza tu equilibrio de ' +
                     (beCVR === null ? 'n/d' : r2(beCVR * 100) + '%') + '. Aún es mala suerte plausible: espera a ~' +
                     clicsParaNegar(beCVR, C.Z_CONFIANZA) + ' clics antes de negar.';
        } else if (pasaGasto && !pasaClics) {
          d.accion = 'VIGILAR';
          d.motivo = 'Ya pasó el gasto de equilibrio ($' + r2(spd) + ' contra $' + r2(beCPA) +
                     ') pero solo con ' + clk + ' clics. Muy poca evidencia para negar: puede ser un clic caro, no un mal término.';
        } else if (imp >= C.MIN_IMP_CTR && (imp > 0 ? (clk / imp * 100) : 0) < C.CTR_MINIMO) {
          d.accion = 'REVISAR_LISTING';
          d.motivo = imp + ' impresiones y CTR de ' + r2(clk / imp * 100) + '%. La gente ve el anuncio y sigue de largo: eso es imagen principal, precio o relevancia, no puja.';
          d.requiereJuicio = true;
        } else {
          d.accion = 'MANTENER';
          d.motivo = 'Todavía sin datos suficientes para decidir.';
        }
        return d;
      }

      /* --- Con órdenes: el término CONVIERTE. Aquí el objetivo manda. --- */
      var rentable = acos !== null && acos <= beACOS;
      // Techo de puja a break-even puro (sin margen): lo que se usa en RANKING,
      // donde se acepta operar hasta el equilibrio con tal de ganar posición.
      var maxCPCbe = cpo > 0 ? (beCPA / cpo) : null;

      // Conquista/PAT: ROAS bajo es esperado. Solo se alerta si pierde más de lo que entra.
      if (objetivo === 'conquista') {
        var roas = spd > 0 ? (sal / spd) : null;
        if (roas !== null && roas < 1) {
          d.accion = 'BAJAR_PUJA';
          d.motivo = 'Conquista cara: ROAS ' + r2(roas) + ' (gastas más de lo que entra). Baja la puja o pausa, ' +
                     'salvo que el producto tenga LTV alto (consumible / subscribe & save) que lo justifique.';
          if (maxCPC !== null) d.pujaSugerida = r2(maxCPC);
          return d;
        }
        d.accion = 'MANTENER';
        d.motivo = 'Conquista/PAT: ROAS ' + (roas === null ? 'n/d' : r2(roas)) + '. Un ACOS alto es esperado aquí; ' +
                   'mantén si absorbes el margen, tomas venta al competidor o hay LTV. No se juzga con el break-even normal.';
        return d;
      }

      // Cosecha en RANKING: no exige rentabilidad (basta que convierta de verdad,
      // no de chiripa: >= MIN órdenes y >= piso de clics). Aislar para rankear.
      if (objetivo === 'ranking' && ord >= C.MIN_ORDENES_COSECHA && clk >= C.PISO_CLICS && !d.yaEnExacta) {
        d.accion = 'COSECHAR';
        d.motivo = ord + ' órdenes (CVR ' + r2(cvr) + '%, IC ' + r2(ci.lo * 100) + '–' + r2(ci.hi * 100) +
                   '%). Aíslalo en campaña exacta + Top-of-Search para rankear, y niégalo en exacto en la de origen.';
        return d;
      }

      // Cosecha en RENTABILIDAD: solo si estamos CONFIADOS de que gana. Con pocas
      // órdenes el CVR observado puede ser suerte; se exige que el PISO del
      // intervalo ya supere el equilibrio antes de comprometer una campaña propia.
      if (objetivo !== 'ranking' && ord >= C.MIN_ORDENES_COSECHA && rentable && !d.yaEnExacta) {
        if (confiadoGanador) {
          d.accion = 'COSECHAR';
          d.motivo = ord + ' órdenes, ACOS ' + r2(acos) + '% y CVR real de al menos ' + r2(ci.lo * 100) +
                     '% (sobre tu equilibrio de ' + (beCVR === null ? 'n/d' : r2(beCVR * 100) + '%') +
                     '): es un ganador confirmado, no suerte. A campaña exacta propia, y niégalo en la de origen.';
          return d;
        }
        // Convierte y es rentable, pero la muestra aún es fina: no lo aísles todavía.
        d.accion = 'VIGILAR';
        d.motivo = 'Va muy bien (' + ord + ' órdenes, ACOS ' + r2(acos) + '%), pero con esta muestra su CVR real ' +
                   'aún cruza tu equilibrio (IC ' + r2(ci.lo * 100) + '–' + r2(ci.hi * 100) + '%, equilibrio ' +
                   (beCVR === null ? 'n/d' : r2(beCVR * 100) + '%') + '). Confírmalo una semana más antes de aislarlo ' +
                   'a exacta: cosechar en falso te compromete presupuesto en algo que quizá fue suerte.';
        d.requiereJuicio = true;
        return d;
      }

      // Solo si ADEMÁS sigue corriendo fuera de la exacta: ahí es donde
      // el estudiante está pujando contra sí mismo. Si solo vive en su
      // exacta, no hay nada que negar y pasa a evaluación de puja.
      if (ord >= C.MIN_ORDENES_COSECHA && rentable && d.yaEnExacta && d.tambienFueraDeExacta) {
        d.accion = 'NEGAR_EN_ORIGEN';
        d.motivo = 'Ya existe en una campaña exacta pero sigue corriendo en otra: están compitiendo por el mismo comprador e inflando tu CPC. Solo falta negarlo en exacto en la campaña de origen.';
        return d;
      }

      // Techo de puja según objetivo: con margen (rentabilidad) o a break-even (ranking).
      var techo = (objetivo === 'ranking') ? maxCPCbe : maxCPC;

      if (techo !== null && cpc > techo) {
        if (objetivo === 'ranking') {
          // No se mata un término que convierte; solo se avisa si está MUY caro.
          if (cpc > techo * 1.5) {
            d.accion = 'BAJAR_PUJA';
            d.motivo = 'Convierte pero pagas $' + r2(cpc) + ' por clic contra un break-even de $' + r2(techo) +
                       '. Para rankear rentable, baja la puja o sube el CVR (listing, precio, reseñas).';
            d.pujaSugerida = r2(techo);
            return d;
          }
          d.accion = 'MANTENER';
          d.motivo = 'Convierte a $' + r2(cpc) + ' por clic (break-even $' + r2(techo) + '). En ranking está bien ' +
                     'invertir cerca del equilibrio para ganar posición.';
          return d;
        }
        d.accion = 'BAJAR_PUJA';
        d.motivo = 'Convierte cada ' + r2(cpo) + ' clics. A tu CPA objetivo de $' + r2(targetCPA) +
                   ' puedes pagar hasta $' + r2(techo) + ' por clic, y estás pagando $' + r2(cpc) + '.';
        d.pujaSugerida = r2(techo);
        return d;
      }

      if (techo !== null && cpc < techo * C.HOLGURA_SUBIR) {
        d.accion = 'SUBIR_PUJA';
        d.motivo = 'Convierte cada ' + r2(cpo) + ' clics y pagas $' + r2(cpc) + ' por clic, con techo en $' + r2(techo) +
                   '. Hay espacio para ganar más impresiones sin salir de rentabilidad.';
        d.pujaSugerida = r2(Math.min(techo, cpc * 1.10));  // pasos de 10%, nunca saltos
        return d;
      }

      d.accion = 'MANTENER';
      d.motivo = 'Dentro de la banda rentable. No lo toques esta semana.';
      return d;
    });

    /* ---------- Resumen de cuenta ---------- */
    var por = {};
    decisiones.forEach(function (d) { por[d.accion] = (por[d.accion] || 0) + 1; });

    var gastoANegar = decisiones
      .filter(function (d) { return d.accion === 'NEGAR'; })
      .reduce(function (s, d) { return s + d.gasto; }, 0);

    var desperdicio = decisiones
      .filter(function (d) { return d.ordenes === 0; })
      .reduce(function (s, d) { return s + d.gasto; }, 0);

    var resumen = {
      terminos: decisiones.length,
      porAccion: por,
      gasto: r2(totSpd),
      ventas: r2(totSal),
      ordenes: totOrd,
      acosCuenta: totSal > 0 ? r2(totSpd / totSal * 100) : null,
      // TACOS = gasto en ads / ventas TOTALES del producto (orgánicas + ads). El KPI norte.
      tacos: ventasTotales > 0 ? r2(totSpd / ventasTotales * 100) : null,
      clicsPorOrdenCuenta: cpoCuenta ? r2(cpoCuenta) : null,
      cvrBaseCuenta: baseCVR === null ? null : r2(baseCVR * 100),   // prior Bayesiano
      priorFuerza: C.PRIOR_FUERZA,
      gastoDesperdiciado: r2(desperdicio),
      pctDesperdiciado: totSpd > 0 ? r2(desperdicio / totSpd * 100) : 0,
      gastoRecuperableAhora: r2(gastoANegar)
    };
    if (dias > 0 && gastoANegar > 0) {
      resumen.proyeccionMensual = r2(gastoANegar / dias * 30);
    }

    return {
      ok: true,
      economia: {
        precio: r2(precio),
        breakEvenACOS: r2(beACOS),
        breakEvenCPA: r2(beCPA),
        targetACOS: r2(targetACOS),
        targetCPA: r2(targetCPA),
        pisoClics: C.PISO_CLICS,
        objetivo: objetivo
      },
      resumen: resumen,
      decisiones: decisiones
    };
  }

  /* ============================================================
     TEXTO PARA EL MODELO
     Compacto a propósito: el modelo no necesita las 300 filas,
     necesita las decisiones y los números que las sostienen.
     ============================================================ */
  function texto(res, limite) {
    if (!res || !res.ok) return 'MOTOR PPC: ' + ((res && res.error) || 'sin resultado');
    limite = limite || 25;
    var e = res.economia, s = res.resumen;
    var OBJ_TXT = {
      rentabilidad: 'RENTABILIDAD (producto maduro: ACOS/CPA manda; el norte real es el TACOS)',
      ranking: 'RANKING/LANZAMIENTO (se acepta operar hasta break-even; un termino que CONVIERTE aunque su ACOS pase el equilibrio es victoria, no algo que pausar)',
      conquista: 'CONQUISTA/PAT (ROAS bajo esperado; se justifica por LTV o por tomar venta al competidor)'
    };
    var out = 'MOTOR PPC — DECISIONES YA CALCULADAS POR LA APLICACION\n';
    out += 'Objetivo de la campaña: ' + (OBJ_TXT[e.objetivo] || OBJ_TXT.rentabilidad) + '\n';
    out += 'Economia del estudiante: precio $' + e.precio + ' | break-even ACOS ' + e.breakEvenACOS +
           '% | CPA de equilibrio $' + e.breakEvenCPA + ' | CPA objetivo $' + e.targetCPA +
           ' (ACOS objetivo ' + e.targetACOS + '%)\n';
    out += 'Cuenta: gasto $' + s.gasto + ' | ventas $' + s.ventas + ' | ordenes ' + s.ordenes +
           ' | ACOS ads ' + (s.acosCuenta === null ? 'n/d' : s.acosCuenta + '%') +
           (s.tacos !== null && s.tacos !== undefined ? ' | TACOS ' + s.tacos + '% (el norte)' : ' | TACOS n/d (pide ventas totales)') +
           ' | clics por orden ' + (s.clicsPorOrdenCuenta || 'n/d') + '\n';
    out += 'Desperdicio: $' + s.gastoDesperdiciado + ' (' + s.pctDesperdiciado + '% del gasto). ' +
           'Recuperable negando ya: $' + s.gastoRecuperableAhora +
           (s.proyeccionMensual ? ' (~$' + s.proyeccionMensual + '/mes al ritmo actual)' : '') + '\n\n';

    var orden = ['NEGAR', 'COSECHAR', 'SEGMENTACION', 'NEGAR_EN_ORIGEN', 'BAJAR_PUJA', 'SUBIR_PUJA', 'REVISAR_LISTING', 'REVISAR_MARCA', 'VIGILAR'];
    orden.forEach(function (acc) {
      var g = res.decisiones.filter(function (d) { return d.accion === acc; });
      if (!g.length) return;
      out += acc + ' (' + g.length + '):\n';
      g.slice(0, limite).forEach(function (d) {
        out += '- "' + d.termino + '" | ' + d.clics + ' clics, ' + d.ordenes + ' ord, $' + d.gasto +
               (d.acos !== null ? ', ACOS ' + d.acos + '%' : '') +
               ', CPC $' + d.cpc +
               (d.pujaSugerida ? ' -> puja sugerida $' + d.pujaSugerida : '') +
               ' | en: ' + d.campanaPrincipal + '\n';
      });
      if (g.length > limite) out += '  (y ' + (g.length - limite) + ' mas del mismo tipo)\n';
      out += '\n';
    });

    out += 'RECUERDA AL ESTUDIANTE: el ACOS de ads es DIRECCIONAL; el norte es el TACOS y los dolares de ' +
           'utilidad. Un termino con ACOS alto puede estar bien si las ventas organicas lo compensan (TACOS sano) ' +
           'o si el objetivo es rankear. Nunca mandes a pausar/negativizar un termino que CONVIERTE solo porque su ' +
           'ACOS supera el break-even: mira primero el objetivo y el TACOS.\n\n';
    out += 'INSTRUCCION: estas decisiones ya estan calculadas y NO se recalculan. Tu trabajo es explicar ' +
           'las de mayor impacto, nombrar la campaña exacta donde se ejecuta cada una, y escribir el bloque ' +
           'de negaciones para copiar. En NEGAR y REVISAR_LISTING usa tu juicio de RELEVANCIA: si el termino ' +
           'es irrelevante al producto se niega; si es relevante pero caro, se baja la puja en vez de negarlo. ' +
           'Las filas SEGMENTACION NO son terminos de busqueda (son grupos de la Auto o targets de producto/' +
           'categoria): NUNCA las metas en el bloque de negaciones ni las mandes a manual exacta; explica que se ' +
           'gestionan por puja/pausa del grupo, o con negativo de PRODUCTO/CATEGORIA, no de keyword.';
    return out;
  }


  /* ============================================================
     TRASPASO AL MÓDULO DE ADS
     ------------------------------------------------------------
     El Optimizador decide por matemática, en el navegador, sin
     modelo. Este puente empaqueta LO QUE EL ALUMNO YA VIO para que
     Sophie Ads lo explique y arme el plan — no para que lo recalcule.

     Regla de oro: aquí no se decide nada. Si el texto dijera algo
     distinto de la pantalla, el alumno tendría dos verdades. Por eso
     recibe las decisiones ya tomadas (f.decision.g y .accion) y se
     limita a ordenarlas y resumirlas.
     ============================================================ */

  // datos = {
  //   economia:  { precio, breakEvenACOS, diasReporte, objetivo }
  //   totales:   { gasto, ventas, ordenes, clics, desperdicio, cosechables, ventasTotales }
  //   filas:     [ { term, spend, sales, orders, clicks, acos, cpc, decision:{g,accion} } ]
  //   gate:      { veredicto, motivo }   // el "¿pujas o listing?", opcional
  // }
  function traspaso(datos, limitePorGrupo) {
    if (!datos || !Array.isArray(datos.filas)) return null;
    var lim = limitePorGrupo || 6;
    var e = datos.economia || {}, t = datos.totales || {};

    var precio = n(e.precio), be = n(e.breakEvenACOS);
    if (precio <= 0 || be <= 0) return null;

    var beCPA = precio * (be / 100);
    var targetACOS = be * (1 - CONFIG.MARGEN_OBJETIVO);

    var out = 'OPTIMIZADOR PPC — DECISIONES YA CALCULADAS EN EL NAVEGADOR DEL ESTUDIANTE\n';
    out += 'NO recalcules ni contradigas estas decisiones: son las que el estudiante ya vio en pantalla.\n';
    out += 'Tu trabajo es explicarlas, priorizarlas y convertirlas en un plan de ejecución.\n\n';

    out += 'ECONOMÍA DEL ESTUDIANTE\n';
    out += '  precio $' + precio.toFixed(2) + ' | break-even ACOS ' + be + '%';
    out += ' | CPA de equilibrio $' + beCPA.toFixed(2);
    out += ' | ACOS objetivo ' + targetACOS.toFixed(1) + '%\n';
    if (e.objetivo) out += '  objetivo de campaña: ' + String(e.objetivo).toUpperCase() + '\n';
    if (n(e.diasReporte) > 0) out += '  periodo del reporte: ' + n(e.diasReporte) + ' días\n';

    out += '\nLA CUENTA EN ESTE REPORTE\n';
    out += '  gasto $' + n(t.gasto).toFixed(2) + ' | ventas de ads $' + n(t.ventas).toFixed(2);
    out += ' | órdenes ' + n(t.ordenes) + ' | clics ' + n(t.clics) + '\n';
    if (n(t.ventas) > 0) out += '  ACOS de la cuenta: ' + (n(t.gasto) / n(t.ventas) * 100).toFixed(1) + '%\n';
    // TACOS: el norte real. Solo si el estudiante aportó sus ventas totales.
    if (n(t.ventasTotales) > 0) {
      out += '  TACOS: ' + (n(t.gasto) / n(t.ventasTotales) * 100).toFixed(1) + '%';
      out += ' (sobre $' + n(t.ventasTotales).toFixed(2) + ' de ventas totales, orgánicas + ads)\n';
    } else {
      out += '  TACOS: no calculable — el estudiante no aportó sus ventas totales. Pídeselas: sin TACOS\n';
      out += '  no se puede juzgar si el gasto vale la pena.\n';
    }
    if (n(t.desperdicio) > 0) out += '  gasto sin una sola venta: $' + n(t.desperdicio).toFixed(2) + '\n';
    if (n(t.cosechables) > 0) out += '  términos listos para cosechar: ' + n(t.cosechables) + '\n';

    if (datos.gate && datos.gate.veredicto) {
      out += '\n¿PUJAS O LISTING?\n  ' + datos.gate.veredicto;
      if (datos.gate.motivo) out += ' — ' + datos.gate.motivo;
      out += '\n';
    }

    // Decisiones agrupadas, cada grupo ordenado por gasto: lo que más cuesta primero.
    var porGrupo = {};
    datos.filas.forEach(function (f) {
      var g = (f.decision && f.decision.g) || 'sin-grupo';
      (porGrupo[g] = porGrupo[g] || []).push(f);
    });

    out += '\nDECISIONES POR GRUPO (hasta ' + lim + ' términos por grupo, los de mayor gasto)\n';
    Object.keys(porGrupo).sort().forEach(function (g) {
      var lista = porGrupo[g].slice().sort(function (a, b) { return n(b.spend) - n(a.spend); });
      out += '\n  [' + g.toUpperCase() + '] ' + lista.length + ' término(s)\n';
      lista.slice(0, lim).forEach(function (f) {
        out += '    · "' + String(f.term || '').slice(0, 70) + '"';
        out += ' — $' + n(f.spend).toFixed(2) + ' gasto, ' + n(f.clicks) + ' clics, ' + n(f.orders) + ' órdenes';
        if (f.acos !== null && f.acos !== undefined && !isNaN(n(f.acos))) out += ', ACOS ' + n(f.acos).toFixed(1) + '%';
        out += '\n      → ' + ((f.decision && f.decision.accion) || 'sin acción') + '\n';
      });
      if (lista.length > lim) out += '    (+' + (lista.length - lim) + ' más en el mismo grupo)\n';
    });

    return out;
  }

  global.SophiePPC = {
    version: '1.4',
    config: CONFIG,
    clasificar: clasificar,
    texto: texto,
    wilson: wilson,             // intervalo de confianza (no informativo) de una proporción
    intervalo: intervalo,       // intervalo con prior Bayesiano (Empirical Bayes)
    clicsParaNegar: clicsParaNegar,
    traspaso: traspaso        // empaqueta lo ya decidido para Sophie Ads
  };

})(typeof window !== 'undefined' ? window : this);
