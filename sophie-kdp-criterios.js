/* =====================================================================
   sophie-kdp-criterios.js — FUENTE ÚNICA de los criterios de Sophie KDP.
   ---------------------------------------------------------------------
   KDP no se valida como FBA: no hay inventario ni COGS. Lo que se arriesga
   es tiempo y la salud de la cuenta, y lo que se gana es la regalía. Por eso
   este archivo no reutiliza sophie-fees.js ni sophie-criterios.js.

   Aquí viven los números que usa sophie-kdp-motor.js. El modelo no los
   puede alterar; el prompt de Sophie KDP los repite en prosa, así que un
   cambio aquí obliga a actualizar esa copia (ver README, Sophie KDP).

   PROVISIONAL: los umbrales de validación son el punto de partida acordado
   el 18-oct-2026 mientras Luis fija los suyos. No vienen de ningún curso:
   son hipótesis para calibrar con datos reales. Mientras `provisional` sea
   true, el motor lo informa en cada resultado.

   Las tarifas de impresión NO están aquí a propósito: el alumno escribe el
   costo que KDP le muestra al cargar su archivo, así la calculadora nunca
   usa una tarifa vieja.

   Expone window.SophieKdpCriterios.
   ===================================================================== */
(function (global) {
  'use strict';

  global.SophieKdpCriterios = {
    version: '0.1',
    provisional: true,

    /* ---------- Regalía paperback ---------- */
    // Regalía = precio de lista × tasa − costo de impresión.
    // 60% es la tasa de paperback vendido en las tiendas de Amazon.
    // Pendiente: confirmar contra la ayuda de KDP y fechar la verificación.
    regalia: {
      tasaPaperbackAmazon: 0.60,
      verificadoEl: null
    },

    /* ---------- Validación de nicho (matriz demanda × competencia) ---------- */
    validacion: {
      topN: 10,                 // competidores que se revisan
      minimoCompetidores: 5,    // con menos, el motor no da veredicto
      demanda: {
        bsrMax: 150000,         // un libro "vende" si su BSR en Libros es menor
        minLibros: 3            // cuántos del top deben vender
      },
      competencia: {
        resenasMax: 50,         // un libro es "alcanzable" con menos reseñas
        minLibros: 3            // cuántos del top deben ser alcanzables
      },
      rentabilidad: {
        regaliaMin: 2.50        // US$ por unidad
      },
      // Demanda baja + competencia baja solo se acepta si producir el libro
      // es barato: en low-content el negocio es catálogo, no un solo título.
      esfuerzos: ['bajo', 'medio', 'alto']
    },

    /* ---------- Las 7 casillas de keywords ---------- */
    casillas: {
      total: 7,
      maxCaracteres: 50,
      // Una frase objetivo sola en su casilla rankea mejor que rodeada de
      // palabras; "sola" = como máximo estas palabras.
      maxPalabrasFraseSola: 5,
      reparto: { objetivo: [2, 3], categoria: [1, 2] }
    },

    /* ---------- Título y subtítulo ---------- */
    titulo: {
      maxPalabrasTitulo: 5,       // consejo, no regla de Amazon
      maxSeparadoresSubtitulo: 2  // más comas o barras = posible relleno
    },

    /* ---------- Términos que el auditor marca ----------
       Lista PROVISIONAL armada a mano. Reemplazar por la guía oficial de KDP
       ("terms to avoid") cuando Luis la descargue: kdp.amazon.com no es
       accesible desde el entorno donde se escribió este archivo.
       nivel 'error'  = Amazon lo prohíbe; hay que quitarlo.
       nivel 'alerta' = depende del contexto; Sophie pide revisarlo. */
    terminos: [
      // Marcas de Amazon
      { t: 'amazon', nivel: 'error', motivo: 'marca de Amazon' },
      { t: 'kindle', nivel: 'error', motivo: 'marca de Amazon' },
      { t: 'kdp', nivel: 'error', motivo: 'marca de Amazon' },
      { t: 'audible', nivel: 'error', motivo: 'marca de Amazon' },
      // Afirmaciones engañosas
      { t: 'bestseller', nivel: 'error', motivo: 'afirmación de ventas' },
      { t: 'best seller', nivel: 'error', motivo: 'afirmación de ventas' },
      { t: 'mas vendido', nivel: 'error', motivo: 'afirmación de ventas' },
      { t: 'new york times', nivel: 'error', motivo: 'afirmación de prestigio' },
      { t: '#1', nivel: 'error', motivo: 'afirmación de ventas' },
      // Precio y oferta
      { t: 'gratis', nivel: 'error', motivo: 'precio u oferta' },
      { t: 'free', nivel: 'error', motivo: 'precio u oferta' },
      { t: 'descuento', nivel: 'error', motivo: 'precio u oferta' },
      { t: 'discount', nivel: 'error', motivo: 'precio u oferta' },
      { t: 'oferta', nivel: 'error', motivo: 'precio u oferta' },
      { t: 'sale', nivel: 'alerta', motivo: 'puede leerse como oferta' },
      // Temporales
      { t: 'nuevo', nivel: 'alerta', motivo: 'término temporal' },
      { t: 'new release', nivel: 'error', motivo: 'término temporal' },
      { t: 'tiempo limitado', nivel: 'error', motivo: 'término temporal' },
      { t: 'limited time', nivel: 'error', motivo: 'término temporal' },
      // Marcas y personajes con licencia frecuentes en low-content
      { t: 'disney', nivel: 'error', motivo: 'marca registrada' },
      { t: 'marvel', nivel: 'error', motivo: 'marca registrada' },
      { t: 'pokemon', nivel: 'error', motivo: 'marca registrada' },
      { t: 'harry potter', nivel: 'error', motivo: 'marca registrada' },
      { t: 'barbie', nivel: 'error', motivo: 'marca registrada' },
      { t: 'lego', nivel: 'error', motivo: 'marca registrada' },
      { t: 'minecraft', nivel: 'error', motivo: 'marca registrada' },
      { t: 'star wars', nivel: 'error', motivo: 'marca registrada' },
      { t: 'hello kitty', nivel: 'error', motivo: 'marca registrada' },
      { t: 'bluey', nivel: 'error', motivo: 'marca registrada' }
    ],

    /* Palabras que no cuentan como repetición entre casillas. */
    vacias: ['de', 'del', 'la', 'el', 'los', 'las', 'para', 'por', 'con', 'sin',
      'y', 'e', 'o', 'a', 'en', 'un', 'una', 'the', 'for', 'and', 'with', 'of',
      'to', 'in', 'a', 'an', 'or', 'on', 'by']
  };

})(window);
