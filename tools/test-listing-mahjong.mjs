// Regresión del 11 nov 2026: sesión real de Sophie Listing con Mahjong Racks.
// 1) el detector de español no reconocía mesa/fichas/accesorios y el bucle de
//    medidas le pedía a Sophie más español turno tras turno;
// 2) "perfect for" en una viñeta solo se veía en el paso 10;
// 3) el relleno de español metía palabras de iluminación (luz, baño).
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {}, TextEncoder };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../sophie-keywords.js', import.meta.url), 'utf8'), ctx);
const K = ctx.SophieKeywords;
let ok = 0, mal = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ✓', n); } else { mal++; console.log('  ✗', n); } };

const L = {
  titulo: 'Mahjong Racks with Pushers Set of 4 - Clear Acrylic Tile Rack - JadeRack',
  itemHighlights: 'Acrylic mahjong rack set, magnetic pushers, holds 19 tiles, fits under 18 in, 4 players, game night',
  vinetas: [
    'CRYSTAL CLEAR VISIBILITY - See every tile at a glance.',
    'COMPLETE SET FOR 4 PLAYERS - Perfect for weekly game nights, travel sets or gifting.',
  ],
  backend: 'mah jong mahjongg mah-jong holder american transparent accessories porta fichas soporte juego mesa regalo accesorios juego de mesa organizer storage tabletop beginner birthday christmas family',
};
const es = K.terminosEspanol(L.backend);
t('reconoce 5+ términos en español en el backend real (' + es.join(', ') + ')', es.length >= 5);
const m = K.medidasParaModelo(L);
t('ya no pide más español cuando hay 5', !/términos en español/.test(m));
t('marca "perfect for" en las viñetas antes del paso 10', /perfect for/.test(m));

const corto = K.medidasParaModelo({ ...L, vinetas: [], backend: 'mah jong mahjongg holder soporte juego' });
t('el aviso de español dice cuáles sí contaron', /\(soporte, juego\)/.test(corto));
t('el aviso de español no sugiere palabras de iluminación', !/luz|baño|lámpara/.test(corto));

const rep = K.repararBackend({ ...L, backend: 'mah jong mahjongg holder american storage tabletop' });
t('el relleno de español no mete luz/baño', !/\b(luz|bano|ambiente)\b/.test(rep.backend));
t('el backend reparado queda con 5+ en español', rep.espanol.length >= 5);

console.log(`\nRESULTADO: ${ok} pasan · ${mal} fallan`);
process.exit(mal ? 1 : 0);
