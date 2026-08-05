/* ============================================================
   CZ · INTENT CORE v1.0  —  Taxonomía y clasificador de intención
   Crezcamos Online — ui.crezcamosonline.com/cz-intent-core.js

   Infraestructura COMPARTIDA de la Suite (como cuenta.js y el tabbar).
   Un solo motor con la taxonomía de los 6 clusters de intención y el
   clasificador determinista. Lo consumen:
     · Producto     — mapa de intención y veredicto compuesto
     · Listing      — cobertura semántica del título/bullets/descripción
     · Ads          — segmentación de campañas por cluster
     · Lanzamiento  — priorización de keywords por cluster

   El ángulo elegido en Producto (clusters huérfanos + dolores) viaja por
   toda la Ruta en el expediente; este core es lo que cada módulo usa para
   LEER ese ángulo contra keywords o texto. Determinista y sin tokens: la
   misma entrada da el mismo resultado siempre.

   FUENTE ÚNICA de la taxonomía: vive AQUÍ. sophie-criterios.js la reexpone
   leyendo de este core; no la copia. Editar un marcador aquí recalibra
   Producto, Listing, Ads y Lanzamiento a la vez.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- Taxonomía de los 6 clusters de intención ----------
     Orden = prioridad de clasificación: de intención específica (ocasión,
     audiencia…) a componente genérico (formato). Así "ceremonial matcha kit"
     cuenta como Uso, no como Formato. Sin marcador => 'generico' (head term). */

  var CLUSTERS = [
    { id: 'ocasion', nombre: 'Ocasión / Regalo', captura: 'Compra para un evento o un tercero',
      marcadores: ['gift', 'gifts', 'birthday', "mother's day", 'mothers day', 'fathers day', 'wedding', 'christmas', 'xmas', 'anniversary', 'valentine', 'valentines', 'present', 'holiday', 'graduation'] },
    { id: 'audiencia', nombre: 'Audiencia', captura: 'Para quién es',
      marcadores: ['beginner', 'beginners', 'starter', 'kids', 'kid', 'children', 'child', 'toddler', 'baby', 'women', 'woman', 'womens', 'men', 'mens', 'girls', 'boys', 'seniors', 'elderly', 'lovers', 'professional', 'pro'] },
    { id: 'uso', nombre: 'Uso / Ritual', captura: 'Contexto o modo de uso',
      marcadores: ['ceremonial', 'traditional', 'japanese', 'travel', 'camping', 'office', 'outdoor', 'indoor', 'gym', 'party', 'wall', 'car', 'desk', 'bedroom', 'bathroom'] },
    { id: 'modernidad', nombre: 'Modernidad / Conveniencia', captura: 'Reinvención del formato tradicional',
      marcadores: ['electric', 'shaker', 'machine', 'portable', 'usb', 'rechargeable', 'automatic', 'smart', 'digital', 'wireless', 'maker', 'motorized', 'foldable', 'collapsible'] },
    { id: 'problema', nombre: 'Problema / Atributo', captura: 'Dolor resuelto o material exigido',
      marcadores: ['non-slip', 'non slip', 'nonslip', 'leak proof', 'leakproof', 'bamboo', 'ceramic', 'organic', 'bpa free', 'bpa-free', 'waterproof', 'stainless', 'silicone', 'adjustable', 'heavy duty', 'heavy-duty', 'reinforced', 'insulated', 'washable'] },
    { id: 'formato', nombre: 'Formato / Componente', captura: 'Variante física o pieza del sistema',
      marcadores: ['set', 'kit', 'bowl', 'whisk', 'holder', 'refill', 'pack', '2 pack', '2-pack', '3 pack', 'bundle', 'replacement', 'accessories', 'accessory', 'stand', 'case', 'with', 'and'] }
  ];

  var CLUSTER_HUERFANO = { svPctNicho: 2, svAbsoluto: 5000 };
  var LONG_TAIL_PALABRAS = 4;

  var POR_ID = {};
  CLUSTERS.forEach(function (c) { POR_ID[c.id] = c; });

  /* ---------- normalización (compartida) ---------- */

  // Baja a minúsculas y deja solo alfanumérico separado por espacios, para que
  // "Non-Slip", "2-Pack" y "BPA Free" comparen sin sorpresas de puntuación.
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function contarPalabras(sNorm) {
    if (!sNorm) return 0;
    return sNorm.split(' ').filter(Boolean).length;
  }

  // ¿El marcador aparece como palabra/frase completa dentro del texto normalizado?
  function contiene(textoNorm, marcador) {
    var mk = norm(marcador);
    if (!mk) return false;
    return (' ' + textoNorm + ' ').indexOf(' ' + mk + ' ') !== -1;
  }

  // Primer cluster (en orden de la taxonomía) cuyo marcador aparezca en la keyword.
  function clusterDeKeyword(kw) {
    var kwNorm = norm(kw);
    if (!kwNorm) return 'generico';
    for (var i = 0; i < CLUSTERS.length; i++) {
      var marc = CLUSTERS[i].marcadores;
      for (var j = 0; j < marc.length; j++) {
        if (contiene(kwNorm, marc[j])) return CLUSTERS[i].id;
      }
    }
    return 'generico';
  }

  function n(v) { v = parseFloat(v); return isFinite(v) && v > 0 ? v : 0; }

  /* ---------- clasificar un keyword list (aritmética cruda, sin umbrales) ----------
     entrada: [{kw, sv}] (acepta también {keyword, searchVolume})
     salida:  { totalSV, totalKw, largas, porCluster:{id:{sv,kw,ejemplos}}, generico:{sv,kw} }
     Los umbrales (huérfano, cola larga) los aplica quien consume, con sus reglas. */
  function clasificarLista(keywords) {
    var por = {};
    CLUSTERS.forEach(function (c) { por[c.id] = { sv: 0, kw: 0, ejemplos: [] }; });
    var gen = { sv: 0, kw: 0, ejemplos: [] };
    var totalSV = 0, totalKw = 0, largas = 0;

    (keywords || []).forEach(function (item) {
      var kwRaw = item && (item.kw !== undefined ? item.kw : item.keyword);
      if (kwRaw === undefined || kwRaw === null || String(kwRaw).trim() === '') return;
      var kwNorm = norm(kwRaw);
      if (!kwNorm) return;
      var sv = n(item.sv !== undefined ? item.sv : item.searchVolume);

      totalKw += 1; totalSV += sv;
      if (contarPalabras(kwNorm) >= LONG_TAIL_PALABRAS) largas += 1;

      var cid = clusterDeKeyword(kwNorm);
      var a = (cid === 'generico') ? gen : por[cid];
      a.sv += sv; a.kw += 1;
      if (a.ejemplos.length < 3) a.ejemplos.push(String(kwRaw).trim());
    });

    return { totalSV: totalSV, totalKw: totalKw, largas: largas, porCluster: por, generico: gen };
  }

  /* ---------- cobertura semántica de un texto (para Listing) ----------
     ¿El texto (título, bullets, descripción…) menciona explícitamente los
     marcadores de cada cluster? Devuelve, por cluster, si está presente y qué
     marcadores aparecieron. Si se pasa `soloClusters` (array de ids), evalúa
     solo esos — típicamente los clusters huérfanos elegidos en Producto. */
  function coberturaTexto(texto, soloClusters) {
    var t = norm(texto);
    var ids = (soloClusters && soloClusters.length) ? soloClusters : CLUSTERS.map(function (c) { return c.id; });
    var res = {};
    ids.forEach(function (id) {
      var c = POR_ID[id];
      if (!c) { res[id] = { presente: false, marcadores: [] }; return; }
      var hallados = [];
      c.marcadores.forEach(function (m) { if (contiene(t, m) && hallados.indexOf(m) === -1) hallados.push(m); });
      res[id] = { presente: hallados.length > 0, marcadores: hallados };
    });
    return res;
  }

  global.CzIntentCore = {
    version: '1.0',
    clusters: CLUSTERS,
    clusterHuerfano: CLUSTER_HUERFANO,
    longTailPalabras: LONG_TAIL_PALABRAS,
    porId: function (id) { return POR_ID[id] || null; },
    norm: norm,
    contarPalabras: contarPalabras,
    contiene: contiene,
    clusterDeKeyword: clusterDeKeyword,
    clasificarLista: clasificarLista,
    coberturaTexto: coberturaTexto
  };

})(typeof window !== 'undefined' ? window : this);
