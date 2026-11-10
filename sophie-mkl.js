/* ============================================================
   SOPHIE MKL — Lista maestra de keywords editable
   Crezcamos Online · sophie-ui/sophie-mkl.js

   La Master Keyword List deja de ser una foto que el estudiante solo
   mira: puede quitar lo que no es suyo, agregar lo que falta y excluir
   una palabra (una marca ajena, un material que no usa) para que se
   vaya de toda la lista de una vez. Cada keyword recuerda de dónde
   salió (los datos del nicho o el propio estudiante).

   RELEVANCIA — la misma fórmula que DataDive, verificada el 10 nov 2026
   contra un dive real (30 competidores, 161 keywords, coincide en las
   161):

       relevancia = competidores con rank orgánico ≤ 45 ÷ competidores consultados

   y una keyword entra a la lista con relevancia ≥ 0,30. Con 10
   competidores eso es "al menos 3 rankean en el top 45", que es justo
   el filtro que ya aplica /api/jungle (competidores_rankeando ≥ 3 y
   rank medio ≤ 45). Aquí solo se calcula y se muestra.

   Este archivo NO toca la red ni el DOM: son funciones puras sobre un
   objeto plano, para que el mismo objeto viaje al expediente y lo lea
   Sophie Ads.
   ============================================================ */

(function (global) {
  'use strict';

  var RELEVANCIA_MIN = 0.30;
  var RANK_TOP = 45;
  var PRIORIDADES = ['P1', 'P2', 'P3'];
  var TOPES = { P1: 20, P2: 30, P3: 40 };

  function limpiarTermino(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function numero(v) {
    return (typeof v === 'number' && isFinite(v)) ? v : null;
  }

  function relevancia(rankeando, consultados) {
    if (!(consultados > 0) || typeof rankeando !== 'number') return null;
    return Math.round((rankeando / consultados) * 1000) / 1000;
  }

  /* ---------- construir ---------- */

  // Desde el marcador del servidor (flujo autónomo):
  //   { n: competidores consultados, marcas: [...],
  //     f: [[keyword, volumen, iq, rankMedio, rankeando, prioridad], ...] }
  // Si no vienen filas (marcador viejo), se arma desde P1/P2/P3 sin cifras.
  function desdeMarcador(d) {
    if (!d || typeof d !== 'object') return null;
    var n = numero(d.n);
    var items = [];
    var vistos = {};
    function poner(it) {
      var k = limpiarTermino(it.keyword);
      if (!k || vistos[k]) return;
      vistos[k] = true;
      it.keyword = k;
      items.push(it);
    }
    if (Array.isArray(d.f) && d.f.length) {
      d.f.forEach(function (r) {
        if (!Array.isArray(r)) return;
        var p = PRIORIDADES.indexOf(r[5]) >= 0 ? r[5] : null;
        if (!p) return;
        poner({
          keyword: r[0], sv: numero(r[1]), iq: numero(r[2]),
          rankMedio: numero(r[3]), rankeando: numero(r[4]),
          relevancia: relevancia(numero(r[4]), n),
          prioridad: p, fuente: 'nicho'
        });
      });
    } else {
      PRIORIDADES.forEach(function (p) {
        (Array.isArray(d[p]) ? d[p] : []).forEach(function (k) {
          poner({ keyword: k, sv: null, iq: null, rankMedio: null, rankeando: null,
                  relevancia: null, prioridad: p, fuente: 'nicho' });
        });
      });
    }
    if (!items.length) return null;
    var marcas = (Array.isArray(d.marcas) ? d.marcas : [])
      .map(limpiarTermino).filter(function (m) { return m.length >= 2; });
    return { version: 1, competidores: n, marcas: unicos(marcas), items: items, exclusiones: [] };
  }

  function unicos(a) {
    var v = {}, out = [];
    a.forEach(function (x) { if (!v[x]) { v[x] = true; out.push(x); } });
    return out;
  }

  /* ---------- exclusiones ---------- */

  // Una exclusión es una palabra o frase: saca toda keyword que la contenga
  // como palabra completa ("pink" saca "pink matcha set", no "pinky").
  function contiene(keyword, termino) {
    var k = ' ' + limpiarTermino(keyword) + ' ';
    var t = limpiarTermino(termino);
    if (!t) return false;
    return k.indexOf(' ' + t + ' ') >= 0;
  }

  function excluidaPor(mkl, keyword) {
    var ex = (mkl && mkl.exclusiones) || [];
    for (var i = 0; i < ex.length; i++) if (contiene(keyword, ex[i])) return ex[i];
    return null;
  }

  function copiar(mkl) { return JSON.parse(JSON.stringify(mkl)); }

  function excluir(mkl, termino) {
    var t = limpiarTermino(termino);
    if (!mkl || !t) return mkl;
    var m = copiar(mkl);
    if (m.exclusiones.indexOf(t) < 0) m.exclusiones.push(t);
    return m;
  }

  function restaurar(mkl, termino) {
    var t = limpiarTermino(termino);
    if (!mkl) return mkl;
    var m = copiar(mkl);
    m.exclusiones = m.exclusiones.filter(function (x) { return x !== t; });
    return m;
  }

  /* ---------- agregar / quitar / mover ---------- */

  // Lo que agrega el estudiante entra sin cifras (no hay de dónde sacarlas)
  // y en la prioridad que él diga; P3 por defecto, que es el backend.
  function agregar(mkl, keyword, prioridad) {
    var k = limpiarTermino(keyword);
    if (!mkl || !k) return mkl;
    var m = copiar(mkl);
    var p = PRIORIDADES.indexOf(prioridad) >= 0 ? prioridad : 'P3';
    var ya = buscar(m, k);
    if (ya) { ya.prioridad = p; return m; }
    m.items.push({ keyword: k, sv: null, iq: null, rankMedio: null, rankeando: null,
                   relevancia: null, prioridad: p, fuente: 'manual' });
    return m;
  }

  // Quitar de verdad solo lo que agregó el estudiante. Lo que vino del nicho
  // se excluye (frase exacta) para que pueda deshacerlo y quede constancia.
  function quitar(mkl, keyword) {
    var k = limpiarTermino(keyword);
    if (!mkl || !k) return mkl;
    var it = buscar(mkl, k);
    if (!it) return mkl;
    if (it.fuente === 'manual') {
      var m = copiar(mkl);
      m.items = m.items.filter(function (x) { return x.keyword !== k; });
      return m;
    }
    return excluir(mkl, k);
  }

  function mover(mkl, keyword, prioridad) {
    if (!mkl || PRIORIDADES.indexOf(prioridad) < 0) return mkl;
    var m = copiar(mkl);
    var it = buscar(m, limpiarTermino(keyword));
    if (it) it.prioridad = prioridad;
    return m;
  }

  function buscar(mkl, k) {
    for (var i = 0; i < mkl.items.length; i++) if (mkl.items[i].keyword === k) return mkl.items[i];
    return null;
  }

  /* ---------- sugerencias ---------- */

  // Lo que casi siempre sobra en una lista sacada de datos de Amazon:
  //   · marcas de los competidores ("buucup matcha whisk set")
  //   · keywords en otro alfabeto (chino, árabe, japonés…)
  // Solo se SUGIERE: el estudiante decide. Una marca puede ser suya.
  function sugerirExclusiones(mkl) {
    if (!mkl) return [];
    var out = [];
    var activos = mkl.items.filter(function (it) { return !excluidaPor(mkl, it.keyword); });
    (mkl.marcas || []).forEach(function (marca) {
      var n = activos.filter(function (it) { return contiene(it.keyword, marca); }).length;
      if (n && mkl.exclusiones.indexOf(marca) < 0) out.push({ termino: marca, motivo: 'marca de un competidor', afecta: n });
    });
    activos.forEach(function (it) {
      if (/[^\u0000-ɏ\s'’\-&.,0-9]/.test(it.keyword) && mkl.exclusiones.indexOf(it.keyword) < 0) {
        out.push({ termino: it.keyword, motivo: 'otro idioma o alfabeto', afecta: 1 });
      }
    });
    return out;
  }

  /* ---------- lectura ---------- */

  function porVolumen(a, b) { return (b.sv || 0) - (a.sv || 0); }

  function vista(mkl) {
    var r = { P1: [], P2: [], P3: [], excluidas: [], volumen: { P1: 0, P2: 0, P3: 0 } };
    if (!mkl) return r;
    mkl.items.forEach(function (it) {
      var por = excluidaPor(mkl, it.keyword);
      if (por) { r.excluidas.push({ keyword: it.keyword, por: por, sv: it.sv }); return; }
      r[it.prioridad].push(it);
      r.volumen[it.prioridad] += it.sv || 0;
    });
    PRIORIDADES.forEach(function (p) { r[p].sort(porVolumen); });
    r.excluidas.sort(porVolumen);
    return r;
  }

  // Lo que viaja a Sophie Ads: las tres listas de siempre (mismo contrato,
  // keywordsP1/P2/P3) más la lista completa para que se pueda reabrir.
  function aExpediente(mkl) {
    var v = vista(mkl);
    function terms(p) { return v[p].slice(0, TOPES[p]).map(function (it) { return it.keyword; }); }
    return {
      keywordsP1: terms('P1'), keywordsP2: terms('P2'), keywordsP3: terms('P3'),
      mklExclusiones: (mkl && mkl.exclusiones) ? mkl.exclusiones.slice() : [],
      mklManuales: mkl ? mkl.items.filter(function (it) { return it.fuente === 'manual'; })
                                  .map(function (it) { return { keyword: it.keyword, prioridad: it.prioridad }; }) : []
    };
  }

  // Aviso corto para el modelo cuando el estudiante editó la lista: lo que
  // cambió y la lista vigente. El modelo construye con ESTA, no con la vieja.
  function paraElModelo(mkl) {
    if (!mkl) return '';
    var v = vista(mkl);
    function linea(p) { return p + ': ' + (v[p].length ? v[p].map(function (it) { return it.keyword; }).join(', ') : '(vacía)'); }
    var partes = ['[LISTA MAESTRA EDITADA POR EL ESTUDIANTE — usa ESTA lista desde ahora; no vuelvas a proponer lo excluido]'];
    if (mkl.exclusiones.length) partes.push('Excluido: ' + mkl.exclusiones.join(', '));
    var man = mkl.items.filter(function (it) { return it.fuente === 'manual'; });
    if (man.length) partes.push('Agregado por el estudiante: ' + man.map(function (it) { return it.keyword + ' (' + it.prioridad + ')'; }).join(', '));
    PRIORIDADES.forEach(function (p) { partes.push(linea(p)); });
    return partes.join('\n');
  }

  global.SophieMKL = {
    RELEVANCIA_MIN: RELEVANCIA_MIN, RANK_TOP: RANK_TOP,
    relevancia: relevancia, desdeMarcador: desdeMarcador,
    excluir: excluir, restaurar: restaurar, agregar: agregar, quitar: quitar, mover: mover,
    excluidaPor: excluidaPor, sugerirExclusiones: sugerirExclusiones,
    vista: vista, aExpediente: aExpediente, paraElModelo: paraElModelo
  };
})(typeof window !== 'undefined' ? window : this);
