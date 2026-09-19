/* ============================================================
   SOPHIE · FICHA v1.0
   Crezcamos Online — ui.crezcamosonline.com/sophie-ficha.js

   La memoria corta de la conversación, en la aplicación y no en el modelo.

   POR QUÉ EXISTE. Sophie preguntaba tres veces el capital de inversión. No por
   despiste del modelo: por cómo llega la conversación de vuelta. En los pasos
   guiados Sophie no escribe la pantalla, escribe un marcador de cuarenta
   caracteres. Eso es justo lo que la hace rápida, y también lo que le borra el
   rastro: dos turnos después, el historial dice que Sophie emitió
   <!--PASO:{"paso":2}--> y nada más. La pregunta que hizo por el camino no está
   escrita en ninguna parte. La respuesta del estudiante sí, suelta, sin la
   pregunta al lado: un "$1,500" que ya no se sabe de qué era.

   Pedirle al modelo que se acuerde mejor es pedirle que adivine. Lo que hace
   falta es no depender de que se acuerde: los datos duros —capital, camino,
   categoría, subnicho, keyword— se anotan aquí según aparecen y se le devuelven
   enteros en cada turno, con una instrucción de una línea: esto ya lo sabes, no
   lo vuelvas a preguntar.

   Se anota SOLO lo que se puede leer sin interpretar: lo que el estudiante
   eligió con un clic, lo que el propio marcador de Sophie trae en `vars`, y las
   cifras de dinero que son inequívocas. Cuando hay duda, no se anota. Una ficha
   con un dato inventado es peor que una ficha vacía: haría que Sophie diera por
   sabido algo falso, y eso no se nota hasta el veredicto.

   No usa almacenamiento del navegador. Vive lo que vive la pestaña, igual que la
   conversación a la que pertenece.
   ============================================================ */

(function (global) {
  'use strict';

  var CAMPOS = ['camino', 'capital', 'categoria', 'subnicho', 'keyword', 'producto', 'intereses'];

  var ETIQUETA = {
    camino:    'camino elegido',
    capital:   'capital de inversión',
    categoria: 'categoría',
    subnicho:  'subnicho',
    keyword:   'keyword principal',
    producto:  'producto en estudio',
    intereses: 'intereses del estudiante'
  };

  var datos = {};

  function limpiar(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  // Anotar NO pisa lo ya anotado salvo que se pida explícitamente. La keyword y
  // el producto sí cambian legítimamente a mitad de camino (se descarta un
  // candidato y entra otro); el capital y el camino, no. Pisar el capital porque
  // más tarde aparece otra cifra en la conversación —un precio, un revenue— es
  // exactamente el error que esta ficha viene a evitar.
  var PISABLES = { keyword: true, producto: true, subnicho: true, categoria: true, intereses: true };

  function anotar(campo, valor) {
    if (CAMPOS.indexOf(campo) === -1) return false;
    var v = limpiar(valor);
    if (!v) return false;
    if (datos[campo] && !PISABLES[campo]) return false;
    if (datos[campo] === v) return false;
    datos[campo] = v;
    return true;
  }

  /* ---------- lo que trae el marcador de Sophie ---------- */
  // `vars` es la vía limpia: son valores que el propio modelo ya decidió y que
  // la pantalla va a imprimir. Si están ahí, son ciertos por construcción.
  function deMarcador(pg) {
    if (!pg || !pg.vars) return false;
    var toco = false;
    for (var i = 0; i < CAMPOS.length; i++) {
      var c = CAMPOS[i];
      if (pg.vars[c] != null && anotar(c, pg.vars[c])) toco = true;
    }
    return toco;
  }

  /* ---------- lo que el estudiante eligió con un clic ---------- */
  // Los botones de categoría mandan "Arts, Crafts & Sewing — Embroidery". Es un
  // dato de clic, no de interpretación: se parte por el guion largo y ya está.
  function deEleccionCategoria(texto) {
    var t = limpiar(texto);
    if (!t) return false;
    var p = t.split(/\s+—\s+|\s+-\s+/);
    var toco = anotar('categoria', p[0]);
    if (p.length > 1 && anotar('subnicho', p.slice(1).join(' — '))) toco = true;
    return toco;
  }

  /* ---------- lo que se lee del mensaje del estudiante ---------- */

  // Una cifra es capital solo si viene marcada como dinero o como respuesta a la
  // pregunta del capital. Un "3" suelto es la categoría número 3, no tres
  // dólares; un "500" suelto puede ser reseñas. Por eso el mínimo y por eso el
  // requisito de señal: sin una de las dos, no se anota.
  var SENAL_DINERO = /\$|\bd[oó]lar|\busd\b|capital|presupuest|invertir|inversi[oó]n|tengo para|cuento con/i;

  function capitalDe(texto) {
    var t = String(texto || '');
    if (!SENAL_DINERO.test(t)) return '';
    // 1.500 / 1,500 / 1500 / 1.5k / $1,500 USD
    var m = t.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,7})(?:\s*(?:usd|d[oó]lares?))?/i);
    if (m) {
      var n = parseInt(String(m[1]).replace(/[.,]/g, ''), 10);
      if (n >= 100 && n <= 1000000) return '$' + n.toLocaleString('en-US');
      return '';
    }
    var k = t.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
    if (k) {
      var nk = Math.round(parseFloat(String(k[1]).replace(',', '.')) * 1000);
      if (nk >= 100 && nk <= 1000000) return '$' + nk.toLocaleString('en-US');
    }
    return '';
  }

  function caminoDe(texto) {
    var t = String(texto || '').trim();
    var m = t.match(/^(?:camino\s+)?([abc])[\s.,)]*$/i);
    if (m) return m[1].toUpperCase();
    m = t.match(/^(?:elijo|quiero|voy con|opci[oó]n)\s+(?:la\s+|el\s+)?([abc])\b/i);
    return m ? m[1].toUpperCase() : '';
  }

  // LA PREGUNTA ANTERIOR ES CONTEXTO, Y SIN ELLA UNA CIFRA NO SIGNIFICA NADA.
  //
  // "1500" a secas no se puede anotar: podría ser reseñas, revenue o el número
  // de una lista. Pero si la pantalla que el estudiante acaba de leer preguntaba
  // por el capital, entonces "1500" es el capital y no hay ambigüedad ninguna.
  //
  // Se mira el TEXTO de la pantalla, no el número del paso. Así vale también
  // cuando Sophie lo pregunta con sus propias palabras, fuera del guion — que
  // es justo donde se escapaba la segunda pregunta.
  var pendiente = '';
  var PREGUNTA_CAPITAL = /capital|presupuest|cu[aá]nto\s+(?:tienes|puedes|vas a)\s+(?:para\s+)?invertir|dinero\s+(?:tienes|disponible)/i;

  function observarPantalla(texto) {
    var t = String(texto || '');
    pendiente = (!datos.capital && PREGUNTA_CAPITAL.test(t)) ? 'capital' : '';
    return pendiente;
  }

  function deUsuario(texto, pregunta) {
    var toco = false;
    var cap = capitalDe(texto);
    // Si la pantalla anterior preguntaba por el capital, una cifra a secas vale.
    if (!cap && (pregunta === 'capital' || (pregunta === undefined && pendiente === 'capital'))) {
      var m = String(texto || '').match(/^\s*\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,7})\s*(?:usd|d[oó]lares?)?\s*$/i);
      if (m) {
        var n = parseInt(String(m[1]).replace(/[.,]/g, ''), 10);
        if (n >= 100 && n <= 1000000) cap = '$' + n.toLocaleString('en-US');
      }
    }
    if (cap && anotar('capital', cap)) { toco = true; pendiente = ''; }
    var cam = caminoDe(texto);
    if (cam && anotar('camino', cam)) toco = true;
    return toco;
  }

  /* ---------- lo que se le manda al servidor ---------- */
  // Una línea por dato, en el idioma del método. Va como texto y no como JSON
  // porque el destinatario es un modelo leyendo, no un programa parseando.
  function resumen() {
    var fuera = [];
    for (var i = 0; i < CAMPOS.length; i++) {
      var c = CAMPOS[i];
      if (datos[c]) fuera.push(ETIQUETA[c] + ': ' + datos[c]);
    }
    return fuera.join(' · ');
  }

  function todo() {
    var copia = {};
    for (var k in datos) if (Object.prototype.hasOwnProperty.call(datos, k)) copia[k] = datos[k];
    return copia;
  }

  function vaciar() { datos = {}; pendiente = ''; }

  global.SophieFicha = {
    anotar: anotar,
    deMarcador: deMarcador,
    deEleccionCategoria: deEleccionCategoria,
    deUsuario: deUsuario,
    observarPantalla: observarPantalla,
    capitalDe: capitalDe,
    caminoDe: caminoDe,
    resumen: resumen,
    todo: todo,
    vaciar: vaciar,
    CAMPOS: CAMPOS
  };

})(typeof window !== 'undefined' ? window : this);
