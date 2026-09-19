/* ============================================================
   SOPHIE · FILTROS v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-filtros.js

   El panel de búsqueda. El estudiante mueve los filtros, pulsa Buscar, y la
   aplicación llama a la API. Sophie no interviene en ese turno.

   POR QUÉ EXISTE, Y SON DOS RAZONES DISTINTAS.

   LA PRIMERA es que siempre salían los mismos productos. Con la categoría como
   único dato de entrada, treinta estudiantes de la misma clase mandaban la
   misma consulta y recibían la misma lista. Las defensas anti-clon que ya hay
   —semilla por persona, memoria de lo ya entregado— reparten una lista que
   sigue siendo la misma; no crean variedad, solo la barajan. La variedad tiene
   que entrar por delante: si el estudiante decide el rango de precio, el techo
   de reseñas y las palabras que le interesan, la consulta ya es suya.

   LA SEGUNDA es más de fondo. Mientras el paso de buscar sea un TURNO DEL
   MODELO, existe la posibilidad de que improvise: que narre un recorrido, que
   invente una herramienta, que prometa y no llame. Se puso un veto en la página
   para que eso no llegue a pantalla, y está bien como red — pero una red no
   quita el agujero. Aquí el paso deja de ser un turno: el estudiante pulsa, la
   aplicación consulta, la tabla aparece. No hay nada que improvisar porque no
   hay nadie escribiendo.

   Y AUTOMATIZAR NO ES DEJAR DE ENSEÑAR. Cada filtro trae su porqué al lado y
   arranca con el valor del método. El estudiante puede moverlo —debe poder— y
   cuando lo mueve fuera del rango que el método recomienda, se lo decimos sin
   impedírselo. Un filtro que no explica nada es un formulario; uno que explica
   es una clase.

   Emite: CustomEvent('sophie-buscar', { detail: spec })
   Requiere: sophie-pasos.js cargado antes (de ahí salen las categorías).
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- los valores del método ---------- */
  // Arrancan donde el método dice, no en blanco. Un panel vacío le pide al
  // estudiante que adivine seis números el primer día, y adivinando se pone
  // cualquier cosa: es la forma más rápida de que la búsqueda no devuelva nada
  // y concluya que la herramienta no sirve.
  var CAMPOS = [
    { id: 'precio_min', etiqueta: 'Precio mínimo', prefijo: '$', valor: 20, min: 5, max: 200,
      porque: 'Por debajo de $20 las tarifas de Amazon y el PPC se comen el margen. ' +
              'No es que no se pueda vender: es que casi no queda nada.' },
    { id: 'precio_max', etiqueta: 'Precio máximo', prefijo: '$', valor: 60, min: 10, max: 500,
      porque: 'Por encima de $60 el cliente se lo piensa más, la conversión baja y tu ' +
              'primer pedido cuesta mucho más capital.' },
    { id: 'ventas_min', etiqueta: 'Unidades vendidas al mes (mínimo)', valor: 300, min: 0, max: 5000,
      porque: 'Diez ventas al día es el suelo de un nicho que da de comer. ' +
              'Por debajo, aunque todo lo demás cuadre, el volumen no sostiene el negocio.' },
    { id: 'revenue_min', etiqueta: 'Revenue mensual mínimo', prefijo: '$', valor: 3000, min: 0, max: 100000,
      porque: 'Confirma que hay dinero real moviéndose, no solo búsquedas. ' +
              'Mucha gente buscando y nadie comprando es la trampa más común.' },
    { id: 'resenas_max', etiqueta: 'Reseñas máximo', valor: 500, min: 10, max: 5000,
      porque: 'El techo de reseñas es tu puerta de entrada. Si los líderes tienen miles, ' +
              'el mercado está amurallado y tardarías años en alcanzarlos.' },
    { id: 'peso_max', etiqueta: 'Peso máximo (lb)', sufijo: ' lb', valor: 3, min: 0.5, max: 20, paso: 0.5,
      porque: 'Hasta 3 libras las tarifas de FBA son manejables y el envío desde China no ' +
              'se dispara. Para un primer producto, el peso es lo que más margen se lleva.' }
  ];

  /* ---------- lo que no es un filtro, pero hace falta ---------- */
  // EL CAPITAL DEJA DE SER UNA PREGUNTA DE CHAT. Se preguntaba escribiendo, y
  // escribiendo se perdia: el turno guiado no dejaba rastro de la pregunta, la
  // respuesta quedaba suelta —un "1500" del que ya no se sabia de que era— y
  // Sophie acababa preguntandolo tres, cuatro, cinco veces.
  //
  // Un campo de formulario no tiene ese problema. Se escribe una vez, se ve
  // escrito, y la aplicacion lo guarda sin que nadie tenga que acordarse.
  //
  // No viaja como filtro de busqueda: el capital no filtra productos. Decide
  // cuantas unidades puedes pedir, y eso se usa en el veredicto.
  var CAPITAL = {
    id: 'capital', etiqueta: '¿Con cuánto capital cuentas para el primer pedido?',
    prefijo: '$', valor: '', min: 100, max: 1000000, paso: 100,
    porque: 'No filtra la búsqueda: decide cuántas unidades puedes pedir, y por eso aparece ' +
            'en el veredicto final. Si aún no lo sabes, déjalo vacío y lo vemos luego.'
  };

  /* ---------- atajos, como los de Jungle Scout ---------- */
  // No son magia: cada uno mueve los mismos campos de arriba. Se enseña QUÉ
  // movió, porque un atajo que cambia seis números en silencio no enseña nada.
  var ATAJOS = [
    { id: 'metodo', nombre: 'Criterios del método', ayuda: 'Los valores con los que enseñamos. Empieza aquí.',
      pone: { precio_min: 20, precio_max: 60, ventas_min: 300, revenue_min: 3000, resenas_max: 500, peso_max: 3 } },
    { id: 'entrar', nombre: 'Fácil de entrar', ayuda: 'Baja el techo de reseñas: nichos con menos muralla.',
      pone: { resenas_max: 200, ventas_min: 200, revenue_min: 2500 } },
    { id: 'margen', nombre: 'Margen alto', ayuda: 'Sube el precio y baja el peso: lo que más margen deja.',
      pone: { precio_min: 30, precio_max: 80, peso_max: 2 } },
    { id: 'volumen', nombre: 'Mucha demanda', ayuda: 'Exige más ventas y más revenue. Más competido, más grande.',
      pone: { ventas_min: 600, revenue_min: 8000, resenas_max: 800 } },
    { id: 'ligero', nombre: 'Muy ligero', ayuda: 'Menos de 1 libra: envío barato y FBA mínimo.',
      pone: { peso_max: 1, precio_min: 18 } }
  ];

  /* ---------- lo que se considera fuera del método ---------- */
  // No bloquea. Avisa. El estudiante manda sobre su búsqueda; lo que no puede
  // es mover un número sin saber que se salió del criterio.
  var AVISOS = {
    precio_min: function (v) { return v < 15 ? 'Por debajo de $15 es muy difícil que quede margen tras FBA y PPC.' : ''; },
    precio_max: function (v) { return v > 100 ? 'Por encima de $100 tu primer pedido exige mucho capital.' : ''; },
    resenas_max: function (v) { return v > 1000 ? 'Con más de 1,000 reseñas de tope vas a ver mercados ya amurallados.' : ''; },
    peso_max: function (v) { return v > 5 ? 'Más de 5 lb dispara las tarifas de FBA y el flete. Para empezar, no lo recomendamos.' : ''; },
    ventas_min: function (v) { return v < 100 ? 'Menos de 100 unidades al mes es un nicho que no da de comer.' : ''; }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var CSS = [
    '.s-ft{--ft-bg:var(--so-card,var(--sc-card,rgba(255,255,255,.04)));',
    '--ft-line:var(--so-line,var(--sc-line,rgba(255,255,255,.12)));',
    '--ft-tx:var(--so-tx,var(--sc-tx,#e9eef5));',
    '--ft-tx2:var(--so-tx2,var(--sc-tx2,#9fb0c4));',
    '--ft-ac:#f0883e;--ft-ok:#2fbf87;',
    'margin:12px 0 0;color:var(--ft-tx);font-size:13.5px}',
    '.s-ft h4{margin:16px 0 8px;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--ft-tx2)}',
    '.s-ft-box{background:var(--ft-bg);border:1px solid var(--ft-line);border-radius:13px;padding:13px 15px}',

    /* atajos */
    '.s-ft-at{display:flex;flex-wrap:wrap;gap:7px}',
    '.s-ft-at button{background:transparent;border:1px solid var(--ft-line);color:var(--ft-tx);',
    'border-radius:999px;padding:6px 13px;font:inherit;font-size:12.5px;cursor:pointer}',
    '.s-ft-at button:hover{border-color:var(--ft-ac)}',
    '.s-ft-at button[aria-pressed="true"]{background:var(--ft-ac);border-color:var(--ft-ac);color:#231003;font-weight:700}',
    '.s-ft-ay{margin:7px 0 0;font-size:12.5px;color:var(--ft-tx2);min-height:17px}',

    /* categorias */
    '.s-ft-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px 14px}',
    '.s-ft-cat{display:flex;align-items:flex-start;gap:8px;padding:4px 0;cursor:pointer;line-height:1.35}',
    '.s-ft-cat input{margin:2px 0 0;flex:0 0 auto;accent-color:var(--ft-ac);width:15px;height:15px}',
    '.s-ft-sub{display:none;margin:2px 0 6px 23px;flex-wrap:wrap;gap:5px}',
    '.s-ft-cat-w.abierta .s-ft-sub{display:flex}',
    '.s-ft-sub button{background:transparent;border:1px solid var(--ft-line);color:var(--ft-tx2);',
    'border-radius:999px;padding:3px 10px;font:inherit;font-size:11.5px;cursor:pointer}',
    '.s-ft-sub button[aria-pressed="true"]{background:var(--ft-ok);border-color:var(--ft-ok);color:#06231a;font-weight:700}',

    /* campos */
    '.s-ft-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:13px}',
    '.s-ft-c label{display:block;font-weight:700;font-size:13px;margin:0 0 5px}',
    '.s-ft-in{display:flex;align-items:center;gap:6px;background:rgba(0,0,0,.18);',
    'border:1px solid var(--ft-line);border-radius:9px;padding:7px 10px}',
    '.s-ft-in span{color:var(--ft-tx2);font-size:13px}',
    '.s-ft-in input{flex:1;min-width:0;background:none;border:0;outline:none;color:var(--ft-tx);',
    'font:inherit;font-size:14px;font-variant-numeric:tabular-nums}',
    '.s-ft-p{margin:5px 0 0;font-size:12px;line-height:1.45;color:var(--ft-tx2)}',
    '.s-ft-w{margin:5px 0 0;font-size:12px;line-height:1.45;color:var(--ft-ac);font-weight:600}',
    '.s-ft-w:empty{display:none}',

    /* palabras */
    '.s-ft-kw{display:grid;grid-template-columns:1fr 1fr;gap:13px}',
    '@media (max-width:560px){.s-ft-kw{grid-template-columns:1fr}}',

    /* pie */
    '.s-ft-pie{display:flex;align-items:center;justify-content:space-between;gap:12px;',
    'flex-wrap:wrap;margin:15px 0 0}',
    '.s-ft-go{background:var(--ft-ok);color:#06231a;border:none;border-radius:10px;',
    'padding:12px 26px;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer}',
    '.s-ft-go:hover{filter:brightness(1.06)}',
    '.s-ft-go:disabled{opacity:.5;cursor:default}',
    '.s-ft-reset{background:none;border:0;color:var(--ft-tx2);font:inherit;font-size:12.5px;',
    'cursor:pointer;text-decoration:underline}',
    '.s-ft-est{font-size:12.5px;color:var(--ft-tx2)}'
  ].join('');

  var puesto = false;
  function estilo() {
    if (puesto || !global.document) return;
    puesto = true;
    var e = document.createElement('style');
    e.textContent = CSS;
    document.head.appendChild(e);
  }

  function categorias() {
    var P = global.SophiePasos;
    return (P && P.categorias) || {};
  }

  /* ---------- pintado ---------- */

  function campoHTML(c) {
    return '<div class="s-ft-c" data-campo="' + c.id + '">' +
      '<label for="ft-' + c.id + '">' + esc(c.etiqueta) + '</label>' +
      '<div class="s-ft-in">' +
        (c.prefijo ? '<span>' + esc(c.prefijo) + '</span>' : '') +
        '<input id="ft-' + c.id + '" type="number" inputmode="decimal" value="' + c.valor + '"' +
        ' min="' + c.min + '" max="' + c.max + '" step="' + (c.paso || 1) + '">' +
        (c.sufijo ? '<span>' + esc(c.sufijo) + '</span>' : '') +
      '</div>' +
      '<p class="s-ft-p">' + esc(c.porque) + '</p>' +
      '<p class="s-ft-w" data-aviso="' + c.id + '"></p>' +
    '</div>';
  }

  function html() {
    var cats = categorias();
    var h = '<div class="s-ft">' +
      '<h4>Tu punto de partida</h4>' +
      '<div class="s-ft-box"><div class="s-ft-c">' +
        '<label for="ft-capital">' + esc(CAPITAL.etiqueta) + '</label>' +
        '<div class="s-ft-in"><span>$</span>' +
        '<input id="ft-capital" type="number" inputmode="decimal" placeholder="1500"' +
        ' min="' + CAPITAL.min + '" max="' + CAPITAL.max + '" step="' + CAPITAL.paso + '"></div>' +
        '<p class="s-ft-p">' + esc(CAPITAL.porque) + '</p>' +
      '</div></div>' +

      '<h4>Empieza por un atajo</h4>' +
      '<div class="s-ft-box">' +
        '<div class="s-ft-at">' +
          ATAJOS.map(function (a) {
            return '<button type="button" data-atajo="' + a.id + '" aria-pressed="' +
              (a.id === 'metodo') + '">' + esc(a.nombre) + '</button>';
          }).join('') +
        '</div>' +
        '<p class="s-ft-ay" data-ayuda>' + esc(ATAJOS[0].ayuda) + '</p>' +
      '</div>' +

      '<h4>¿Dónde buscamos?</h4>' +
      '<div class="s-ft-box">' +
        '<div class="s-ft-cats">' +
          Object.keys(cats).map(function (nombre) {
            var subs = cats[nombre] || [];
            return '<div class="s-ft-cat-w" data-cat="' + esc(nombre) + '">' +
              '<label class="s-ft-cat">' +
                '<input type="checkbox" data-catbox value="' + esc(nombre) + '">' +
                '<span>' + esc(nombre) + '</span>' +
              '</label>' +
              '<div class="s-ft-sub">' +
                subs.map(function (s) {
                  return '<button type="button" data-sub="' + esc(s) + '" aria-pressed="false">' +
                    esc(s) + '</button>';
                }).join('') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="s-ft-p" style="margin-top:10px">Marca una categoría y se abren sus subnichos. ' +
        'Elegir subnicho afina mucho: es la diferencia entre "cocina" y "accesorios de café".</p>' +
      '</div>' +

      '<h4>Los números</h4>' +
      '<div class="s-ft-box"><div class="s-ft-grid">' +
        CAMPOS.map(campoHTML).join('') +
      '</div></div>' +

      '<h4>Palabras</h4>' +
      '<div class="s-ft-box"><div class="s-ft-kw">' +
        '<div class="s-ft-c">' +
          '<label for="ft-inc">Que contengan</label>' +
          '<div class="s-ft-in"><input id="ft-inc" type="text" placeholder="organizer, storage"></div>' +
          '<p class="s-ft-p">Aquí entra lo que te interesa de verdad. Un hobby que practicas o un ' +
          'problema que conoces te da ventaja sobre quien elige por número.</p>' +
        '</div>' +
        '<div class="s-ft-c">' +
          '<label for="ft-exc">Que NO contengan</label>' +
          '<div class="s-ft-in"><input id="ft-exc" type="text" placeholder="electric, battery"></div>' +
          '<p class="s-ft-p">Para quitar lo que ya sabes que no quieres: electrónica, cosas con ' +
          'batería, tallas, marcas concretas.</p>' +
        '</div>' +
      '</div></div>' +

      '<div class="s-ft-pie">' +
        '<span class="s-ft-est" data-estado>Marca al menos una categoría</span>' +
        '<span><button type="button" class="s-ft-reset" data-reset>Volver a los criterios del método</button>' +
        ' &nbsp; <button type="button" class="s-ft-go" data-go disabled>Buscar productos</button></span>' +
      '</div>' +
    '</div>';
    return h;
  }

  /* ---------- lectura del panel ---------- */

  function num(raiz, id) {
    var el = raiz.querySelector('#ft-' + id);
    if (!el) return null;
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isFinite(v) ? v : null;
  }

  function palabras(raiz, id) {
    var el = raiz.querySelector('#ft-' + id);
    if (!el) return [];
    return String(el.value || '').split(/[,;]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .slice(0, 12);
  }

  function leer(raiz) {
    var cats = [], subs = [];
    raiz.querySelectorAll('[data-catbox]').forEach(function (b) {
      if (b.checked) cats.push(b.value);
    });
    raiz.querySelectorAll('[data-sub][aria-pressed="true"]').forEach(function (b) {
      subs.push(b.getAttribute('data-sub'));
    });
    var spec = { categorias: cats, subnichos: subs };
    CAMPOS.forEach(function (c) {
      var v = num(raiz, c.id);
      if (v !== null) spec[c.id] = v;
    });
    // Los subnichos son palabras de búsqueda, igual que las que escribe el
    // estudiante. Se juntan: el subnicho acota el terreno y sus palabras lo
    // afinan dentro.
    spec.palabras = subs.concat(palabras(raiz, 'inc'));
    spec.excluir = palabras(raiz, 'exc');
    // Va fuera de los filtros a proposito: el servidor no debe mandarlo a la
    // API —no es un filtro de producto— pero la pagina si tiene que anotarlo.
    var cap = num(raiz, 'capital');
    if (cap !== null && cap >= CAPITAL.min) spec.capital = cap;
    return spec;
  }

  /* ---------- avisos y estado ---------- */

  function repasar(raiz) {
    CAMPOS.forEach(function (c) {
      var p = raiz.querySelector('[data-aviso="' + c.id + '"]');
      if (!p) return;
      var v = num(raiz, c.id);
      p.textContent = (v !== null && AVISOS[c.id]) ? (AVISOS[c.id](v) || '') : '';
    });
    var spec = leer(raiz);
    var go = raiz.querySelector('[data-go]');
    var est = raiz.querySelector('[data-estado]');
    var hayCat = spec.categorias.length > 0;
    // Precio invertido no es un aviso, es un error: la API devolvería vacío y el
    // estudiante concluiría que no hay productos, no que se equivocó al teclear.
    var precioMal = spec.precio_min != null && spec.precio_max != null &&
                    spec.precio_min >= spec.precio_max;
    if (go) go.disabled = !hayCat || precioMal;
    if (est) {
      est.textContent = precioMal ? 'El precio mínimo tiene que ser menor que el máximo'
        : !hayCat ? 'Marca al menos una categoría'
        : spec.categorias.length + (spec.categorias.length === 1 ? ' categoría' : ' categorías') +
          (spec.subnichos.length ? ' · ' + spec.subnichos.length + ' subnichos' : '');
    }
    return spec;
  }

  function aplicarAtajo(raiz, id) {
    var a = ATAJOS.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    Object.keys(a.pone).forEach(function (k) {
      var el = raiz.querySelector('#ft-' + k);
      if (el) el.value = a.pone[k];
    });
    raiz.querySelectorAll('[data-atajo]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-atajo') === id));
    });
    var ay = raiz.querySelector('[data-ayuda]');
    if (ay) ay.textContent = a.ayuda;
    repasar(raiz);
  }

  /* ---------- montaje ---------- */

  function pintar(contenedor) {
    if (!contenedor) return false;
    estilo();
    contenedor.innerHTML = html();
    enganchar(contenedor);
    repasar(contenedor);
    return true;
  }

  // UN SOLO ESCUCHADOR DELEGADO. Con seis campos, once categorías y cincuenta y
  // nueve subnichos, enganchar uno por uno son más de setenta suscripciones que
  // hay que acordarse de soltar. Delegando, el panel se puede repintar entero
  // sin dejar nada colgando.
  function enganchar(raiz) {
    raiz.addEventListener('click', function (ev) {
      var t = ev.target;

      var atajo = t.closest && t.closest('[data-atajo]');
      if (atajo) { aplicarAtajo(raiz, atajo.getAttribute('data-atajo')); return; }

      var sub = t.closest && t.closest('[data-sub]');
      if (sub) {
        var on = sub.getAttribute('aria-pressed') === 'true';
        sub.setAttribute('aria-pressed', String(!on));
        // Elegir un subnicho marca su categoría: pedir el subnicho sin la
        // categoría manda un filtro incompleto y la búsqueda vuelve vacía.
        if (!on) {
          var caja = sub.closest('.s-ft-cat-w');
          var box = caja && caja.querySelector('[data-catbox]');
          if (box && !box.checked) { box.checked = true; caja.classList.add('abierta'); }
        }
        repasar(raiz);
        return;
      }

      var reset = t.closest && t.closest('[data-reset]');
      if (reset) { aplicarAtajo(raiz, 'metodo'); return; }

      var go = t.closest && t.closest('[data-go]');
      if (go && !go.disabled) {
        var spec = leer(raiz);
        go.disabled = true;
        go.textContent = 'Buscando…';
        raiz.dispatchEvent(new CustomEvent('sophie-buscar', { bubbles: true, detail: spec }));
      }
    });

    raiz.addEventListener('change', function (ev) {
      var box = ev.target.closest && ev.target.closest('[data-catbox]');
      if (box) {
        var caja = box.closest('.s-ft-cat-w');
        if (caja) caja.classList.toggle('abierta', box.checked);
        // Al desmarcar la categoría se sueltan sus subnichos: si no, quedarían
        // activos e invisibles y viajarían en la consulta sin que nadie los vea.
        if (!box.checked && caja)
          caja.querySelectorAll('[data-sub]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      }
      repasar(raiz);
    });

    raiz.addEventListener('input', function () { repasar(raiz); });
  }

  global.SophieFiltros = {
    pintar: pintar,
    html: html,
    leer: leer,
    repasar: repasar,
    CAMPOS: CAMPOS,
    CAPITAL: CAPITAL,
    ATAJOS: ATAJOS,
    AVISOS: AVISOS
  };

})(typeof window !== 'undefined' ? window : this);
