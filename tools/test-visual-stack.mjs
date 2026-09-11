#!/usr/bin/env node
/* Tests del contrato Sophie Visual Stack v2. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { strict as assert } from 'node:assert';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
win.SophieImageIndex = { normalize: (x) => x };
new Function('window','document', readFileSync(resolve(raiz,'sophie-visual-stack.js'),'utf8'))(win, undefined);
const S = win.SophieVisualStack;
let n = 0;
function t(name, fn){ fn(); n++; console.log('  ✓ '+name); }
function index(count=5){
  const fam=['cleaning','compatibility','quality','ease','emotional','size'];
  return {items:Array.from({length:count},(_,i)=>({
    rank:i+1, angleId:'a'+(i+1), family:fam[i], headline:'Angle '+(i+1),
    support:'Support '+(i+1), opportunityScore:90-i*3, claimStatus:'verified'
  }))};
}

t('build crea 7 slots',()=>assert.equal(S.build(index(5)).items.length,7));
t('slot 1 MAIN y slot 2 IMAGE_INDEX',()=>{
  const s=S.build(index(5));
  assert.equal(s.items[0].type,'MAIN');
  assert.equal(s.items[1].type,'IMAGE_INDEX');
});
t('4 razones se rellenan hasta 7 imágenes',()=>assert.equal(S.build(index(4)).items.length,7));
t('6 razones se adaptan a 5 slots de desarrollo',()=>{
  const s=S.build(index(6));
  assert.equal(s.items.length,7);
  assert.equal(s.coverage.linkedIndexItems,5);
  assert.equal(s.coverage.totalIndexItems,6);
});
t('no permite mover MAIN ni INDEX',()=>{
  const s=S.build(index(5));
  assert.equal(S.move(s,1,3,index(5)).items[0].type,'MAIN');
  assert.equal(S.move(s,2,4,index(5)).items[1].type,'IMAGE_INDEX');
});
t('permite cambiar tipo en slots 3–7',()=>{
  const s=S.setType(S.build(index(5)),3,'COMPARISON',index(5));
  assert.equal(s.items[2].type,'COMPARISON');
});
t('validate acepta stack correcto',()=>assert.equal(S.validate(S.build(index(5)),index(5)).ok,true));
t('score se calcula en rango 0–100',()=>{
  const x=S.build(index(5)).score.total;
  assert.ok(x>=0&&x<=100);
});

console.log('\n'+n+' tests OK');
