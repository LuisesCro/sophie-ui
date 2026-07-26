/* ============================================================
   PILOTO · Motor de análisis automático para Sophie Producto
   ------------------------------------------------------------
   Demuestra el flujo que tendría una integración con Helium 10:
     Xray (search_products) -> LIMPIEZA -> criterios Fase 1
     Cerebro (get_keywords_by_asin) -> criterio 7
   Los datos aquí están CONGELADOS en sample_products.json y
   sample_cerebro.json (una consulta real al nicho "matcha whisk").
   En producción, `raw` vendría en vivo de la API de H10.
   Correr:  node xray-auto.js
   ============================================================ */
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const products = JSON.parse(fs.readFileSync(path.join(DIR, 'sample_products.json'), 'utf8'));
const cerebro  = JSON.parse(fs.readFileSync(path.join(DIR, 'sample_cerebro.json'), 'utf8'));

// ---------- CAPA DE LIMPIEZA (lo que faltaba, el valor real) ----------
// Los money vienen en centavos; se dedup por ASIN PADRE porque las
// variaciones de un mismo listing comparten el revenue del padre e
// inflarían el promedio si se cuentan varias veces.
function limpiar(raw) {
  const vistos = new Set();
  const limpios = [];
  for (const x of raw) {
    if (vistos.has(x.parent)) continue;      // 1 fila por listing padre
    vistos.add(x.parent);
    limpios.push({
      asin: x.asin,
      title: x.title,
      precio: x.precio,                        // dólares
      revenue: Math.round(x.revenue / 100),    // centavos -> dólares
      reviews: x.reviews,
      rating: x.rating,
      edadMeses: x.edad
    });
  }
  limpios.sort((a, b) => b.revenue - a.revenue);
  return limpios.slice(0, 10);                 // top 10, lo que Xray muestra
}

// ---------- CRITERIOS FASE 1 (mismos umbrales que sophie-criterios.js) ----------
function evaluarFase1(top) {
  const avg = (f) => top.reduce((s, x) => s + f(x), 0) / top.length;
  const avgPrice   = avg(x => x.precio);
  const avgRev     = avg(x => x.revenue);
  const avgReviews = avg(x => x.reviews);
  const totalRev   = top.reduce((s, x) => s + x.revenue, 0);
  const conc       = top[0].revenue / totalRev * 100;
  return [
    { n: 2, nombre: 'Ingresos reales (Average Revenue ≥ $4,500)', valor: `$${Math.round(avgRev)}/mes`, pasa: avgRev >= 4500 },
    { n: 5, nombre: 'Precio promedio (Average Price ≥ $20)',      valor: `$${avgPrice.toFixed(2)}`,     pasa: avgPrice >= 20 },
    { n: 4, nombre: 'Reseñas (Average Reviews ≤ 300)',            valor: `${Math.round(avgReviews)}`,   pasa: avgReviews <= 300 },
    { n: 3, nombre: 'Distribución (top1 ≤ 40% del revenue)',      valor: `${conc.toFixed(0)}%`,          pasa: conc <= 40 },
  ];
}

// ---------- CEREBRO (criterio 7) ----------
function evaluarCerebro(c) {
  return { n: 7, nombre: 'Demanda en profundidad (≥30 keywords orgánicas)', valor: `${c.organic}`, pasa: c.organic >= 30 };
}

// ---------- CORRER ----------
const top  = limpiar(products);
const crit = evaluarFase1(top);
crit.push(evaluarCerebro(cerebro));

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║  SOPHIE PRODUCTO · Análisis automático (nicho: matcha whisk) ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");
console.log(`Xray crudo: ${products.length} filas  ->  limpio (dedup por padre): ${top.length} competidores\n`);
console.log("XRAY LIMPIO — top " + top.length + " del nicho:");
console.log("  " + "Producto".padEnd(38) + "Precio   Rev/mes    Reviews");
top.forEach(x => console.log("  " + (x.title || '').slice(0, 37).padEnd(38) +
  "$" + String(x.precio.toFixed(0)).padEnd(7) + " $" + String(Math.round(x.revenue)).padEnd(9) + " " + x.reviews));
console.log("\nCRITERIOS (mismos umbrales de sophie-criterios.js):");
let pasan = 0;
crit.forEach(c => { console.log(`  ${c.pasa ? '✅' : '❌'} Criterio ${c.n}: ${c.nombre}\n       → ${c.valor}`); if (c.pasa) pasan++; });
console.log(`\nRESULTADO PARCIAL: ${pasan}/${crit.length} criterios de esta muestra pasan.`);
console.log("(En Sophie real, el motor completo suma los 13 criterios y aplica los 5 vetos.)");
