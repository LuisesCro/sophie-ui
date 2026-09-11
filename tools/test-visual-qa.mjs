#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { strict as assert } from 'node:assert';

const raiz=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const win={};
new Function('window',readFileSync(resolve(raiz,'sophie-visual-qa.js'),'utf8'))(win);
const Q=win.SophieVisualQA;
let n=0;function t(name,fn){fn();n++;console.log('  ✓ '+name)}

t('1000px pasa umbral técnico',()=>assert.equal(Q.technical({slot:2,width:1000,height:1000}).pass,true));
t('menos de 1000 bloquea',()=>assert.equal(Q.technical({slot:2,width:900,height:900}).pass,false));
t('MAIN exige blanco',()=>assert.equal(Q.technical({slot:1,width:2000,height:2000,whiteBorderPct:80,productFillPct:90}).pass,false));
t('MAIN exige fill 85',()=>assert.equal(Q.technical({slot:1,width:2000,height:2000,whiteBorderPct:100,productFillPct:70}).pass,false));
t('MAIN correcta pasa',()=>assert.equal(Q.technical({slot:1,width:2000,height:2000,whiteBorderPct:100,productFillPct:90}).pass,true));
t('texto en MAIN bloquea merge',()=>{const r=Q.mergeSlot(Q.technical({slot:1,width:2000,height:2000,whiteBorderPct:100,productFillPct:90}),{slot:1,pass:true,score:95,textPresent:true},{type:'MAIN'});assert.equal(r.status,'blocked')});
t('mismatch producto bloquea',()=>{const r=Q.mergeSlot(Q.technical({slot:3,width:2000,height:2000}),{slot:3,pass:true,score:95,productMatch:'fail'},{type:'LIFESTYLE'});assert.equal(r.status,'blocked')});
t('build resume 7 aprobadas',()=>{const tech=Array.from({length:7},(_,i)=>Q.technical({slot:i+1,width:2000,height:2000,whiteBorderPct:100,productFillPct:90}));const vision={items:tech.map(x=>({slot:x.slot,pass:true,score:95,productMatch:'pass',briefAlignment:'pass',claimRisk:'low'}))};const p=Q.build(tech,vision,{items:tech.map(x=>({slot:x.slot,type:x.slot===1?'MAIN':'FEATURES'}))});assert.equal(p.summary.allPassed,true)});
t('validate requiere allPassed',()=>{const r={items:[{slot:1,status:'blocked'}],summary:{allPassed:false}};assert.equal(Q.validate(r).ok,false)});
console.log('\n'+n+' tests OK');
