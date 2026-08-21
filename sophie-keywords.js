/* ============================================================
   SOPHIE · KEYWORDS Y SCORE DE LISTING v2.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-keywords.js

   ACTUALIZADO A LAS REGLAS DE AMAZON DEL 27 DE JULIO DE 2026
   ------------------------------------------------------------
   1. TÍTULO: 200 -> 75 caracteres, espacios incluidos, en todas
      las categorías excepto medios. Los que se pasen los reescribe
      la IA de Amazon sola. La marca CUENTA dentro de los 75.

   2. ITEM HIGHLIGHTS: campo nuevo, 125 caracteres, SEARCHABLE.
      Cuarto destino de keywords, separado de viñetas y backend.
      75 + 125 = los 200 caracteres indexables de siempre, ahora
      repartidos en dos campos con reglas distintas.

   3. BACKEND: 249 bytes, no 250. Un byte de más des-indexa el
      campo ENTERO en silencio. Objetivo de trabajo: 240.

   4. VIÑETAS: solo los primeros ~1,000 bytes ACUMULADOS de las
      cinco se indexan. Cinco viñetas de 250 caracteres suman
      1,250: las últimas quedan fuera del índice.

   Verificado el 25 de julio de 2026. Amazon ajusta límites sin
   aviso: la guía de estilo de tu categoría es la palabra final.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- límites vigentes ---------- */

  var LIMITES = {
    titulo:         { max: 75,   unidad: 'caracteres', desde: '2026-07-27' },
    itemHighlights: { max: 125,  unidad: 'caracteres', desde: '2026-07-27' },
    vineta:         { max: 250,  unidad: 'caracteres' },
    vinetasIndexado:{ max: 1000, unidad: 'bytes', nota: 'solo lo que cabe aquí se indexa' },
    backend:        { max: 249,  objetivo: 240, unidad: 'bytes',
                      nota: 'un byte de más des-indexa el campo entero' },
    descripcion:    { min: 1000, max: 2000, unidad: 'caracteres' }
  };

  /* ============================================================
     1 · CLASIFICADOR DE KEYWORDS — MÉTODO CREZCAMOS
     ============================================================ */

  var UMBRALES = {
    P1: { sv_min: 5000, sv_max: Infinity, rank_max: 15, iq_min: 15, destino: 'TÍTULO / ITEM HIGHLIGHTS' },
    P2: { sv_min: 1000, sv_max: 4999,     rank_max: 30, iq_min: 8,  destino: 'VIÑETAS' },
    P3: { sv_min: 300,  sv_max: 999,      rank_max: Infinity, iq_min: 5, destino: 'BACKEND' }
  };

  // Relevancia multi-ASIN: no cambia los umbrales, informa los bordes.
  var RELEVANCIA = { alta: 5, baja: 2 };

  /* ---- Lectura de números escritos por personas -------------------------
     El estudiante teclea en español ("24,9") y pega exportaciones de Helium 10
     en inglés ("22,400"). Un parser que borra todas las comas convierte 24,9
     en 249 — un error de 10x en un criterio de VETO.

     Reglas, tomadas de lo que ya funcionaba en la suite:
       · Con AMBOS separadores, manda el ÚLTIMO: "1.234,56" y "1,234.56" → 1234.56
       · Con UNO SOLO, es separador de miles si agrupa de tres en tres y el
         primer grupo no empieza en 0: "22,400" y "1.234" → 22400 y 1234.
         Si no agrupa así, es decimal: "24,9" → 24.9 · "0.325" → 0.325
       · Sufijo k: "1.2k" → 1200

     Devuelve NaN —nunca 0— cuando no hay número: el motor distingue
     "sin dato" de "cero", y confundirlos aprueba criterios que deberían
     quedar en alerta. Esta función está DUPLICADA a propósito en los motores
     que la necesitan (cada módulo carga un subconjunto distinto); el test
     tools/test-numeros.mjs verifica que las copias no diverjan. */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (v === null || v === undefined || v === '') return NaN;

    var bruto = String(v).trim();
    var esK = /k$/i.test(bruto);
    var s = bruto.replace(/[^0-9.,\-]/g, '');
    if (!s) return NaN;

    var signo = s.charAt(0) === '-' ? -1 : 1;
    s = s.replace(/-/g, '');

    // ¿El separador agrupa de tres en tres? "1.234.567" sí; "0.325" no
    // (una agrupación nunca empieza en 0); "24,9" tampoco.
    function esMiles(sep) {
      var partes = s.split(sep);
      if (partes.length < 2) return false;
      if (!/^\d{1,3}$/.test(partes[0]) || partes[0] === '0') return false;
      for (var i = 1; i < partes.length; i++) if (!/^\d{3}$/.test(partes[i])) return false;
      return true;
    }

    var coma = s.indexOf(','), punto = s.indexOf('.');
    if (coma > -1 && punto > -1) {
      // Los dos presentes: el último es el decimal, el otro agrupa.
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (coma > -1) {
      s = esMiles(',') ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (punto > -1) {
      if (esMiles('.')) s = s.replace(/\./g, '');
    }

    var x = parseFloat(s);
    if (!isFinite(x)) return NaN;
    return signo * (esK ? x * 1000 : x);
  }

  // Reconoce los encabezados de Cerebro, incluidos los nombres antiguos.
  var COLUMNAS = {
    keyword:  [/keyword\s*phrase/i, /^keyword$/i, /^frase/i],
    sv:       [/search\s*volume/i, /^sv$/i, /volumen/i],
    iq:       [/cerebro\s*iq/i, /^iq\s*score/i, /^iq$/i],
    // "organic rank" cubre tanto el export de un solo ASIN (columna "Organic
    // Rank") como el multi-ASIN ("Organic Rank Average"); "sponsored rank" NO
    // matchea aquí a propósito (clasificamos por rank orgánico).
    rank:     [/competitor\s*rank/i, /organic\s*rank/i, /rank\s*\(avg\)/i, /^rank$/i],
    count:    [/ranking\s*competitors/i, /competitors\s*\(count\)/i, /^competidores/i],
    productos:[/competing\s*products/i, /^productos/i]
  };

  function detectarColumnas(celdas) {
    var mapa = {};
    celdas.forEach(function (c, i) {
      Object.keys(COLUMNAS).forEach(function (campo) {
        if (mapa[campo] !== undefined) return;
        for (var k = 0; k < COLUMNAS[campo].length; k++) {
          if (COLUMNAS[campo][k].test(c)) { mapa[campo] = i; return; }
        }
      });
    });
    return mapa;
  }

  function partir(linea) {
    // Tabulaciones primero (pegado desde Excel), luego punto y coma, luego comas
    // fuera de comillas (CSV real).
    if (linea.indexOf('\t') > -1) return linea.split('\t');
    if (linea.indexOf(';') > -1 && linea.indexOf(',') === -1) return linea.split(';');
    var out = [], actual = '', dentro = false;
    for (var i = 0; i < linea.length; i++) {
      var ch = linea[i];
      if (ch === '"') { dentro = !dentro; continue; }
      if (ch === ',' && !dentro) { out.push(actual); actual = ''; continue; }
      actual += ch;
    }
    out.push(actual);
    return out;
  }

  // Convierte el pegado del estudiante en filas normalizadas.
  function parsear(texto) {
    var lineas = String(texto || '').split(/\r?\n/)
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; });
    if (!lineas.length) return { filas: [], descartadasSinDatos: 0, columnas: null };

    var mapa = detectarColumnas(partir(lineas[0]).map(function (c) { return c.trim(); }));
    var conEncabezado = mapa.keyword !== undefined && mapa.sv !== undefined;
    // Sin encabezado reconocible, se asume el orden que pide el prompt.
    if (!conEncabezado) mapa = { keyword: 0, sv: 1, iq: 2, rank: 3, count: 4, productos: 5 };

    var filas = [], sinDatos = 0;
    lineas.slice(conEncabezado ? 1 : 0).forEach(function (l) {
      var c = partir(l).map(function (x) { return x.trim(); });
      var kw = c[mapa.keyword];
      var sv = num(c[mapa.sv]);
      if (!kw || isNaN(sv)) { sinDatos++; return; }
      filas.push({
        keyword: kw,
        sv: sv,
        iq: mapa.iq !== undefined ? num(c[mapa.iq]) : NaN,
        rank: mapa.rank !== undefined ? num(c[mapa.rank]) : NaN,
        count: mapa.count !== undefined ? num(c[mapa.count]) : NaN,
        productos: mapa.productos !== undefined ? num(c[mapa.productos]) : NaN
      });
    });

    return { filas: filas, descartadasSinDatos: sinDatos, columnas: mapa, conEncabezado: conEncabezado };
  }

  function prioridadDe(f) {
    var iq = isNaN(f.iq) ? 0 : f.iq;
    var rank = isNaN(f.rank) ? Infinity : f.rank;
    if (f.sv >= UMBRALES.P1.sv_min && rank <= UMBRALES.P1.rank_max && iq >= UMBRALES.P1.iq_min) return 'P1';
    if (f.sv >= UMBRALES.P2.sv_min && f.sv <= UMBRALES.P2.sv_max && rank <= UMBRALES.P2.rank_max && iq >= UMBRALES.P2.iq_min) return 'P2';
    if (f.sv >= UMBRALES.P3.sv_min && f.sv <= UMBRALES.P3.sv_max && iq >= UMBRALES.P3.iq_min) return 'P3';
    return 'descarte';
  }

  // ¿Está en el borde de subir de prioridad? Solo informa; no mueve umbrales.
  function enBorde(f, p) {
    if (p === 'P2') {
      var faltaSV = UMBRALES.P1.sv_min - f.sv;
      return f.sv >= UMBRALES.P1.sv_min * 0.8 && f.rank <= UMBRALES.P1.rank_max && f.iq >= UMBRALES.P1.iq_min * 0.8;
    }
    if (p === 'P3') {
      return f.sv >= UMBRALES.P2.sv_min * 0.8 && f.iq >= UMBRALES.P2.iq_min * 0.8;
    }
    return false;
  }

  // Con 75 caracteres el título ya no aguanta 3 keywords P1.
  // Una va al título; el resto de P1 pasa a Item Highlights, que también indexa.
  function repartir(grupos) {
    return {
      titulo: grupos.P1.slice(0, 1),
      itemHighlights: grupos.P1.slice(1, 5),
      vinetas: grupos.P2.slice(0, 15),
      backend: grupos.P3.slice(0, 25)
    };
  }

  function clasificar(texto) {
    var p = parsear(texto);
    var grupos = { P1: [], P2: [], P3: [], descarte: [] };

    p.filas.forEach(function (f) {
      var pr = prioridadDe(f);
      f.prioridad = pr;
      f.relevancia = isNaN(f.count) ? 'nd'
        : f.count >= RELEVANCIA.alta ? 'alta'
        : f.count <= RELEVANCIA.baja ? 'baja' : 'media';
      f.borde = enBorde(f, pr);
      grupos[pr].push(f);
    });

    ['P1', 'P2', 'P3', 'descarte'].forEach(function (k) {
      grupos[k].sort(function (a, b) { return b.sv - a.sv; });
    });

    function vol(a) { return a.reduce(function (s, x) { return s + x.sv; }, 0); }

    var reparto = repartir(grupos);
    var p1AltaRel = grupos.P1.filter(function (f) { return f.relevancia === 'alta'; }).length;
    var candidatosSubir = grupos.P2.filter(function (f) { return f.borde && f.relevancia === 'alta'; });

    var avisos = [];
    if (grupos.P1.length < 5) {
      avisos.push('Solo ' + grupos.P1.length + ' keywords P1. Puede ser un nicho pequeño (está bien), ' +
        'filtros muy estrictos en Cerebro (prueba bajar el IQ Score a 10), o que la keyword principal ' +
        'no tenga la demanda que suponíamos.');
    }
    if (p.filas.length < 20) {
      avisos.push('La lista trae solo ' + p.filas.length + ' keywords. Con menos de 20 la cobertura SEO ' +
        'queda corta: vale la pena revisar los filtros o sumar competidores en Cerebro.');
    }
    if (candidatosSubir.length) {
      avisos.push(candidatosSubir.length + ' keyword(s) P2 están en el borde de P1 y las rankean 5+ ' +
        'competidores. Con el título de 75 caracteres su lugar natural es Item Highlights: ' +
        candidatosSubir.slice(0, 3).map(function (f) { return '"' + f.keyword + '"'; }).join(', ') + '.');
    }
    if (grupos.P1.length > 1) {
      avisos.push('Desde el 27 de julio el título solo aguanta 75 caracteres, así que va UNA keyword P1: ' +
        '"' + grupos.P1[0].keyword + '". Las otras ' + Math.min(grupos.P1.length - 1, 4) +
        ' pasan a Item Highlights, que también indexa.');
    }
    if (p.descartadasSinDatos > 0) {
      avisos.push(p.descartadasSinDatos + ' línea(s) del pegado no traían datos legibles y se ignoraron.');
    }

    return {
      total: p.filas.length,
      conEncabezado: p.conEncabezado,
      P1: grupos.P1, P2: grupos.P2, P3: grupos.P3, descarte: grupos.descarte,
      reparto: reparto,
      resumen: {
        P1: { n: grupos.P1.length, volumen: vol(grupos.P1), altaRelevancia: p1AltaRel },
        P2: { n: grupos.P2.length, volumen: vol(grupos.P2) },
        P3: { n: grupos.P3.length, volumen: vol(grupos.P3) },
        descarte: { n: grupos.descarte.length }
      },
      avisos: avisos
    };
  }

  // Lo que viaja al modelo: el reparto por destino, no las 200 filas crudas.
  function paraElModelo(c) {
    function corta(a) {
      return a.map(function (f) {
        return { kw: f.keyword, sv: f.sv, iq: isNaN(f.iq) ? null : f.iq,
                 rank: isNaN(f.rank) ? null : f.rank, rel: f.relevancia };
      });
    }
    return {
      total: c.total,
      resumen: c.resumen,
      destinos: {
        titulo: corta(c.reparto.titulo),
        itemHighlights: corta(c.reparto.itemHighlights),
        vinetas: corta(c.reparto.vinetas),
        backend: corta(c.reparto.backend)
      },
      avisos: c.avisos
    };
  }

  /* ============================================================
     2 · SCORE DEL LISTING — 100 puntos, reparto v2
        Título 25 · Item Highlights 15 · Viñetas 25 · Backend 15 · Descripción 20
     ============================================================ */

  // Bytes UTF-8 reales. Un acento español ocupa 2: por eso el backend
  // de 250 bytes no se puede estimar contando letras.
  function bytes(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(s || '')).length;
    return unescape(encodeURIComponent(String(s || ''))).length;
  }
  function chars(s) { return String(s || '').length; }

  var PROHIBIDAS = [
    'best', 'the best quality', '#1', 'number one', 'perfect for',
    'top rated', 'award winning'
  ];
  var PROHIBIDAS_SALUD = ['cure', 'heal', 'treatment', 'medical grade', 'fda approved'];

  function frasesProhibidas(texto, permitirIdealForPrefijo) {
    var t = ' ' + String(texto || '').toLowerCase() + ' ';
    var halladas = [];
    PROHIBIDAS.concat(PROHIBIDAS_SALUD).forEach(function (f) {
      if (t.indexOf(f) > -1) halladas.push(f);
    });
    // 'IDEAL FOR' vale como prefijo de sección en la descripción, no como afirmación.
    if (!permitirIdealForPrefijo && t.indexOf('ideal for') > -1) halladas.push('ideal for');
    return halladas;
  }

  function palabrasRepetidas(texto, limite) {
    limite = limite || 2;
    var cuenta = {}, exceso = [];
    String(texto || '').toLowerCase().replace(/[^a-záéíóúñü0-9\s]/g, ' ')
      .split(/\s+/).filter(function (w) { return w.length > 2; })
      .forEach(function (w) { cuenta[w] = (cuenta[w] || 0) + 1; });
    Object.keys(cuenta).forEach(function (w) {
      if (cuenta[w] > limite) exceso.push({ palabra: w, veces: cuenta[w] });
    });
    return exceso.sort(function (a, b) { return b.veces - a.veces; });
  }

  // Marcadores de español: acentos, ñ, y vocabulario frecuente del nicho.
  var ES_COMUNES = ['kit','set','para','ninos','ninas','adultos','mujer','hombre','regalo','casa','cocina',
    'bano','jardin','oficina','viaje','bebe','mascota','perro','gato','organizador','soporte','juego',
    'tabla','bolsa','estuche','manualidades','bordado','tejido','hilo','aguja','lana','madera','acero',
    'cuero','algodon','vidrio','plastico','bambu','portatil','plegable','ajustable','antideslizante'];

  function terminosEspanol(backend) {
    var palabras = String(backend || '').toLowerCase().split(/\s+/).filter(Boolean);
    var hallados = [];
    palabras.forEach(function (w) {
      var limpia = w.replace(/[^a-záéíóúñü]/g, '');
      if (!limpia) return;
      if (/[áéíóúñü]/.test(limpia) || ES_COMUNES.indexOf(limpia) > -1) {
        if (hallados.indexOf(limpia) === -1) hallados.push(limpia);
      }
    });
    return hallados;
  }

  function solapan(a, b) {
    var setA = {}, comunes = [];
    String(a || '').toLowerCase().split(/\s+/).forEach(function (w) {
      var x = w.replace(/[^a-z0-9]/g, ''); if (x.length > 3) setA[x] = 1;
    });
    String(b || '').toLowerCase().split(/\s+/).forEach(function (w) {
      var x = w.replace(/[^a-z0-9]/g, '');
      if (x.length > 3 && setA[x] && comunes.indexOf(x) === -1) comunes.push(x);
    });
    return comunes;
  }

  // Cuánto de las viñetas cae dentro de los ~1,000 bytes que Amazon indexa.
  function indexadoVinetas(vinetas) {
    var acumulado = 0, corte = null, detalle = [];
    (vinetas || []).forEach(function (v, i) {
      var b = bytes(v);
      var inicio = acumulado;
      acumulado += b;
      var estado = acumulado <= LIMITES.vinetasIndexado.max ? 'completa'
                 : inicio < LIMITES.vinetasIndexado.max ? 'parcial' : 'fuera';
      if (estado !== 'completa' && corte === null) corte = i + 1;
      detalle.push({ vineta: i + 1, bytes: b, acumulado: acumulado, estado: estado });
    });
    return { totalBytes: acumulado, limite: LIMITES.vinetasIndexado.max,
             primeraAfectada: corte, detalle: detalle };
  }

  // listing: { titulo, itemHighlights, vinetas[5], backend, descripcion, marca, keywordP1 }
  function score(listing) {
    listing = listing || {};
    var L = {
      titulo: listing.titulo || '',
      itemHighlights: listing.itemHighlights || '',
      vinetas: Array.isArray(listing.vinetas) ? listing.vinetas : [],
      backend: listing.backend || '',
      descripcion: listing.descripcion || '',
      marca: listing.marca || '',
      keywordP1: listing.keywordP1 || ''
    };
    var det = [];
    function add(seccion, criterio, puntos, max, ok, nota) {
      det.push({ seccion: seccion, criterio: criterio, puntos: puntos, max: max,
                 estado: ok === true ? 'pass' : ok === 'alerta' ? 'alerta' : 'fail', nota: nota || '' });
      return puntos;
    }

    /* --- TÍTULO · 25 --- */
    var tChars = chars(L.titulo);
    var empieza = L.keywordP1 && L.titulo.toLowerCase().indexOf(L.keywordP1.toLowerCase()) === 0;
    var tit = 0;
    tit += add('Título', 'Empieza con la keyword P1', empieza ? 10 : 0, 10, !!empieza,
      empieza ? '' : (L.keywordP1 ? 'Debe abrir con "' + L.keywordP1 + '" — el título carga el mayor peso de ranking'
                                  : 'No se indicó la keyword P1'));
    var cabe = tChars > 0 && tChars <= LIMITES.titulo.max;
    tit += add('Título', 'Máximo 75 caracteres (regla del 27-jul-2026)', cabe ? 10 : 0, 10, cabe,
      tChars + '/75 chars' + (tChars > LIMITES.titulo.max
        ? ' — la IA de Amazon lo reescribe sola y recuperarlo exige un caso de soporte' : ''));
    var conMarca = L.marca && L.titulo.toLowerCase().indexOf(L.marca.toLowerCase()) > -1;
    tit += add('Título', 'Incluye la marca (cuenta dentro de los 75)', conMarca ? 3 : 0, 3, !!conMarca);
    var tProh = frasesProhibidas(L.titulo);
    var tRep = palabrasRepetidas(L.titulo, 2);
    var limpio = tProh.length === 0 && tRep.length === 0;
    tit += add('Título', 'Sin frases prohibidas ni palabras repetidas', limpio ? 2 : 0, 2, limpio,
      [tProh.length ? 'Prohibidas: ' + tProh.join(', ') : '',
       tRep.length ? 'Repetidas: ' + tRep.map(function(r){return r.palabra+' x'+r.veces;}).join(', ') : ''
      ].filter(Boolean).join(' · '));

    /* --- ITEM HIGHLIGHTS · 15 (campo nuevo del 27-jul-2026) --- */
    var ihChars = chars(L.itemHighlights);
    var ih = 0;
    var ihOk = ihChars > 0 && ihChars <= LIMITES.itemHighlights.max;
    ih += add('Item Highlights', 'Presente y dentro de 125 caracteres', ihOk ? 8 : 0, 8, ihOk,
      ihChars === 0 ? 'Campo vacío: son 125 caracteres indexables que le estás regalando a la competencia'
                    : ihChars + '/125 chars' + (ihChars > 125 ? ' — se corta' : ''));
    var ihDupTit = solapan(L.titulo, L.itemHighlights);
    ih += add('Item Highlights', 'Sin repetir palabras del título', ihDupTit.length > 1 ? 0 : 4, 4,
      ihDupTit.length <= 1, ihDupTit.length > 1 ? 'Repite: ' + ihDupTit.slice(0, 4).join(', ') : '');
    var atributos = /\b(material|cotton|bamboo|steel|wood|silicone|inch|cm|size|pack|set of|for (adults|kids|beginners|women|men|pets)|compatible|includes)\b/i.test(L.itemHighlights);
    ih += add('Item Highlights', 'Cubre material, medida, audiencia o compatibilidad', atributos ? 3 : 0, 3, atributos,
      atributos ? '' : 'Es el campo que Amazon diseñó para materiales, casos de uso y comparación');

    /* --- VIÑETAS · 25 --- */
    var vin = 0;
    var formatoOk = L.vinetas.length === 5 && L.vinetas.every(function (v) {
      return /^[A-ZÁÉÍÓÚÑ0-9&\s]{4,}\s-\s/.test(String(v || '').trim());
    });
    vin += add('Viñetas', 'Las 5 abren en MAYÚSCULAS seguidas de " - "', formatoOk ? 8 : 0, 8, formatoOk,
      L.vinetas.length !== 5 ? 'Hay ' + L.vinetas.length + ' viñetas, deben ser 5' : '');
    var largas = L.vinetas.map(function (v, i) { return { i: i + 1, n: chars(v) }; })
                          .filter(function (x) { return x.n > LIMITES.vineta.max; });
    vin += add('Viñetas', 'Cada una ≤ 250 caracteres', largas.length ? 0 : 5, 5, !largas.length,
      largas.length ? 'Se pasan: ' + largas.map(function(x){return 'viñeta '+x.i+' ('+x.n+')';}).join(', ') : '');
    var idx = indexadoVinetas(L.vinetas);
    var dentroIndice = idx.totalBytes <= LIMITES.vinetasIndexado.max;
    vin += add('Viñetas', 'Las 5 caben en los ~1,000 bytes que Amazon indexa',
      dentroIndice ? 8 : (idx.primeraAfectada >= 4 ? 4 : 0), 8,
      dentroIndice ? true : (idx.primeraAfectada >= 4 ? 'alerta' : false),
      idx.totalBytes + '/1000 bytes' + (dentroIndice ? '' :
        ' — desde la viñeta ' + idx.primeraAfectada + ' el texto deja de indexarse para búsqueda'));
    var vProh = frasesProhibidas(L.vinetas.join(' '));
    vin += add('Viñetas', 'Sin frases sensacionalistas', vProh.length ? 0 : 4, 4, !vProh.length,
      vProh.length ? 'Encontradas: ' + vProh.join(', ') : '');

    /* --- BACKEND · 15 --- */
    var bBytes = bytes(L.backend);
    var back = 0;
    var bOk = bBytes > 0 && bBytes <= LIMITES.backend.max;
    var bHolgado = bBytes <= LIMITES.backend.objetivo;
    back += add('Backend', 'Dentro de 249 bytes', bOk ? (bHolgado ? 8 : 6) : 0, 8,
      bOk ? (bHolgado ? true : 'alerta') : false,
      bBytes + '/249 bytes' + (bBytes > LIMITES.backend.max
        ? ' — un byte de más des-indexa TODO el campo, en silencio'
        : bHolgado ? '' : ' — muy al límite, deja margen en 240'));
    var es = terminosEspanol(L.backend);
    back += add('Backend', 'Mínimo 5 términos en español', es.length >= 5 ? 4 : 0, 4, es.length >= 5,
      es.length + ' detectados' + (es.length ? ': ' + es.slice(0, 6).join(', ') : ''));
    var conVisible = solapan(L.titulo + ' ' + L.itemHighlights, L.backend);
    back += add('Backend', 'Sin repetir palabras del título ni de Item Highlights',
      conVisible.length > 2 ? 0 : 3, 3, conVisible.length <= 2,
      conVisible.length > 2 ? 'Repite: ' + conVisible.slice(0, 4).join(', ') + ' — Amazon indexa una vez por sección' : '');

    /* --- DESCRIPCIÓN · 20 --- */
    var dChars = chars(L.descripcion);
    var desc = 0;
    var dOk = dChars >= LIMITES.descripcion.min && dChars <= LIMITES.descripcion.max;
    desc += add('Descripción', 'Entre 1,000 y 2,000 caracteres', dOk ? 10 : 0, 10, dOk,
      dChars + '/2000 chars' + (dChars < 1000 ? ' — muy corta' : dChars > 2000 ? ' — se corta' : ''));
    var hook = L.descripcion.slice(0, 200);
    var hookOk = hook.length >= 120 && (!L.keywordP1 || hook.toLowerCase().indexOf(L.keywordP1.toLowerCase().split(' ')[0]) > -1);
    desc += add('Descripción', 'Hook con la keyword en los primeros 200 chars', hookOk ? 5 : 0, 5, hookOk,
      hookOk ? '' : 'Es lo único que se ve en móvil sin tocar "Ver más"');
    var dProh = frasesProhibidas(L.descripcion, true);
    desc += add('Descripción', 'Sin palabras prohibidas', dProh.length ? 0 : 5, 5, !dProh.length,
      dProh.length ? 'Encontradas: ' + dProh.join(', ') : '');

    var total = tit + ih + vin + back + desc;
    var nivel = total >= 90 ? { v: 'EXCELENTE', e: 'go',    t: '✅ EXCELENTE — Listing listo para Seller Central' }
              : total >= 75 ? { v: 'BUENO',     e: 'go',    t: '✅ BUENO — Aplica los ajustes marcados' }
              : total >= 60 ? { v: 'MEJORABLE', e: 'alerta',t: '⚠️ MEJORABLE — Necesita ajustes importantes' }
                            : { v: 'REHACER',   e: 'nogo',  t: '❌ REHACER — Revisa el listing desde el título' };

    // Un título de más de 75 caracteres no es un punto menos: es un listing que
    // Amazon reescribe solo. No puede salir aprobado por bueno que sea el resto.
    var bloqueante = tChars > LIMITES.titulo.max;
    if (bloqueante && total >= 75) {
      nivel = { v: 'MEJORABLE', e: 'alerta',
        t: '⚠️ MEJORABLE — El título supera los 75 caracteres y Amazon lo reescribirá' };
    }

    return {
      total: total,
      veredicto: nivel.v, etiqueta: nivel.t, estado: nivel.e,
      bloqueante: bloqueante,
      secciones: { titulo: tit, itemHighlights: ih, vinetas: vin, backend: back, descripcion: desc },
      maximos: { titulo: 25, itemHighlights: 15, vinetas: 25, backend: 15, descripcion: 20 },
      detalle: det,
      fallos: det.filter(function (d) { return d.estado !== 'pass'; }),
      medidas: {
        tituloChars: tChars,
        itemHighlightsChars: ihChars,
        vinetasChars: L.vinetas.map(chars),
        vinetasIndexado: idx,
        backendBytes: bBytes,
        descripcionChars: dChars,
        espanolDetectado: es
      }
    };
  }

  /* ============================================================
     3 · COBERTURA DEL NICHO
        Amazon no indexa frases: indexa palabras y arma las
        combinaciones. Una keyword está cubierta si TODAS sus
        palabras significativas aparecen en algún campo del
        listing, aunque nunca estén juntas.

        La métrica que importa no es cuántas keywords cubres,
        sino cuánto VOLUMEN de búsqueda cubres. Cubrir 40 de 90
        keywords puede ser el 85% del volumen (bien) o el 20%
        (te faltan puertas de entrada).
     ============================================================ */

  var VACIAS = ['for','the','and','with','your','you','our','a','an','of','to','in','on','by',
                'or','is','are','it','this','that','from','at','as','be','all','can','de','la',
                'el','los','las','para','con','por','un','una','y','o'];

  function palabrasDe(texto) {
    return String(texto || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w.length > 1 && VACIAS.indexOf(w) === -1; });
  }

  // listing: mismos campos que score(). clasificacion: salida de clasificar().
  function cobertura(listing, clasificacion) {
    listing = listing || {};
    var campos = {
      titulo:         palabrasDe(listing.titulo),
      itemHighlights: palabrasDe(listing.itemHighlights),
      vinetas:        palabrasDe((listing.vinetas || []).join(' ')),
      backend:        palabrasDe(listing.backend),
      descripcion:    palabrasDe(listing.descripcion)
    };
    var indice = {};
    Object.keys(campos).forEach(function (c) {
      campos[c].forEach(function (w) {
        if (!indice[w]) indice[w] = [];
        if (indice[w].indexOf(c) === -1) indice[w].push(c);
      });
    });

    var todas = []
      .concat(clasificacion.P1 || [], clasificacion.P2 || [], clasificacion.P3 || []);

    var porKeyword = todas.map(function (f) {
      var ws = palabrasDe(f.keyword);
      var faltan = ws.filter(function (w) { return !indice[w]; });
      var ubic = [];
      ws.forEach(function (w) {
        (indice[w] || []).forEach(function (c) { if (ubic.indexOf(c) === -1) ubic.push(c); });
      });
      return {
        keyword: f.keyword, sv: f.sv, prioridad: f.prioridad,
        relevancia: f.relevancia,
        cubierta: faltan.length === 0,
        faltan: faltan,
        ubicaciones: faltan.length === 0 ? ubic : []
      };
    });

    function stats(lista) {
      var cub = lista.filter(function (k) { return k.cubierta; });
      var volT = lista.reduce(function (s, k) { return s + k.sv; }, 0);
      var volC = cub.reduce(function (s, k) { return s + k.sv; }, 0);
      return {
        total: lista.length, cubiertas: cub.length,
        pct: lista.length ? Math.round(cub.length / lista.length * 100) : 0,
        volumen: volT, volumenCubierto: volC,
        pctVolumen: volT ? Math.round(volC / volT * 100) : 0
      };
    }

    var sinCubrir = porKeyword.filter(function (k) { return !k.cubierta; })
      .sort(function (a, b) { return b.sv - a.sv; });

    var general = stats(porKeyword);
    var diagnostico;
    if (general.pctVolumen >= 85) {
      diagnostico = 'Cobertura alta. El copy no es lo que te está frenando: lo que falta es velocidad de ventas y conversión.';
    } else if (general.pctVolumen >= 65) {
      diagnostico = 'Cobertura aceptable con margen. Sumar las keywords sin cubrir de mayor volumen al backend o a Item Highlights abre puertas de entrada que hoy no tienes.';
    } else {
      diagnostico = 'Cobertura baja: tu listing está dejando fuera la mayor parte del volumen del nicho. Antes de invertir en publicidad, cierra esta brecha — el tráfico que no puedes recibir no se compra, se indexa.';
    }

    return {
      resumen: general,
      porPrioridad: {
        P1: stats(porKeyword.filter(function (k) { return k.prioridad === 'P1'; })),
        P2: stats(porKeyword.filter(function (k) { return k.prioridad === 'P2'; })),
        P3: stats(porKeyword.filter(function (k) { return k.prioridad === 'P3'; }))
      },
      sinCubrir: sinCubrir,
      oportunidades: sinCubrir.slice(0, 15),
      porKeyword: porKeyword,
      diagnostico: diagnostico
    };
  }

  global.SophieKeywords = {
    version: '2.0',
    vigenteDesde: '2026-07-27',
    limites: LIMITES,
    umbrales: UMBRALES,
    parsear: parsear,
    clasificar: clasificar,
    paraElModelo: paraElModelo,
    score: score,
    cobertura: cobertura,
    bytes: bytes,
    indexadoVinetas: indexadoVinetas,
    frasesProhibidas: frasesProhibidas,
    palabrasRepetidas: palabrasRepetidas,
    terminosEspanol: terminosEspanol
  };

})(window);
