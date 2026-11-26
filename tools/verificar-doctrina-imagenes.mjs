#!/usr/bin/env node
/* ============================================================
   GUARDA DE LA DOCTRINA DE IMÁGENES — una fuente, dos consumidores
   sophie-ui/tools/verificar-doctrina-imagenes.mjs

   sophie-imagenes-doctrina.json es la fuente única de las reglas
   de imágenes de Amazon. La leen:
     · Daniela (Friday para negocios), en tiempo de ejecución desde
       ui.crezcamosonline.com/sophie-imagenes-doctrina.json;
     · Sophie Imágenes, cuyo prompt vive en su chat.js (edge function
       aparte, sin import remoto: mismo criterio que verificar-router).
   Esta guarda valida la forma del JSON y que el prompt de Sophie
   diga lo mismo en lo que no se negocia. Si una regla cambia en un
   lado y no en el otro, FALLA.
   ============================================================ */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const raiz = new URL('..', import.meta.url).pathname;
const estricto = process.argv.includes('--strict');
const d = JSON.parse(readFileSync(join(raiz, 'sophie-imagenes-doctrina.json'), 'utf8'));
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); };

// 1. Forma
ok(Array.isArray(d.sop) && d.sop.length === 7, 'el SOP debe tener 7 imágenes');
ok(d.sop.map((x) => x.pos).join() === '1,2,3,4,5,6,7', 'posiciones 1..7 en orden');
ok(d.sop[1] && d.sop[1].slot === 'index', 'la Index Image va SIEMPRE en la posición 2');
const DECIDE = { principal: 'D', index: 'E', lifestyle1: 'C', medidas: 'I', comparativa: 'D', detalles: 'I', lifestyle2: 'C' };
for (const x of d.sop) ok(x.decide && x.decide.letra === DECIDE[x.slot], `letra DECIDE de ${x.slot} debe ser ${DECIDE[x.slot]}`);
ok(d.evaluar && d.evaluar.letra === 'E', 'Evaluar (E) va después de cada imagen');
ok(d.principal.coberturaMinima === 0.85 && d.principal.lado === 2000 && d.principal.blanco === 255, 'principal: 85%, 2000 px, blanco 255');
ok(d.index.razonesLibres === 3, 'Index: 3 razones libres');
ok(/US-Based Local Business/.test(d.index.razon4.texto), 'razón 4 fija');
ok(/Risk-Free Guarantee/.test(d.index.razon5.texto), 'razón 5 fija');
ok(d.limites.razones === 3 && d.limites.incluye === 4 && d.limites.filasComparativa === 5 && d.limites.bloquesDetalles === 3, 'límites 3/4/5/3');
ok(d.tipografia.minimoPx === 64 && d.tipografia.zonaSegura === 130, 'tipografía 64 px, zona segura 130');
for (const r of d.claimsProhibidos) { try { new RegExp(r, 'i'); } catch { fallos.push('regex inválida: ' + r); } }

// 2. El generador cumple los números
const gen = readFileSync(join(raiz, 'sophie-imagenes-gen.js'), 'utf8');
ok(/var L = 2000, M = 130/.test(gen), 'el generador usa 2000 px y zona segura 130');
ok(/minimo:\s*64/.test(gen), 'el generador usa el piso de 64 px');
ok(gen.includes(d.index.razon4.texto), 'el generador imprime la misma razón 4');
const med = readFileSync(join(raiz, 'sophie-imagenes.js'), 'utf8');
ok(/COBERTURA_MIN:\s*0\.85/.test(med) && /LADO_SOP:\s*2000/.test(med) && /LADO_MIN_ZOOM:\s*1000/.test(med), 'el medidor usa 85% / 2000 / 1000');

// 3. El prompt de Sophie Imágenes dice lo mismo
const chat = join(raiz, '..', 'sophie-imagenes', 'netlify', 'edge-functions', 'chat.js');
if (!existsSync(chat)) {
  if (estricto) fallos.push('falta ../sophie-imagenes');
  else console.warn('⚠ no encuentro ../sophie-imagenes: salto el cruce con su prompt');
} else {
  const p = readFileSync(chat, 'utf8');
  ok(p.includes('VA SIEMPRE EN POSICIÓN 2'), 'Sophie: Index en posición 2');
  ok(p.includes(d.index.razon4.texto), 'Sophie: misma razón 4');
  ok(p.includes('Risk-Free Guarantee'), 'Sophie: misma razón 5');
  ok(/≥85%/.test(p) && /2000x2000/.test(p), 'Sophie: 85% y 2000x2000');
  ok(/Máximo 3 razones en index, 4 items en incluye, 5 filas en comparativa, 3 bloques en detalles/.test(p), 'Sophie: límites 3/4/5/3');
  ok(/NUNCA nombres la marca del competidor/.test(p), 'Sophie: no nombrar competidor');
}

if (fallos.length) { console.error('✗ Doctrina de imágenes:\n  · ' + fallos.join('\n  · ')); process.exit(1); }
console.log(`✓ Doctrina de imágenes ${d.version}: forma, generador, medidor y prompt de Sophie coinciden`);
