#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { strict as assert } from 'node:assert';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
new Function('window','document', readFileSync(resolve(raiz,'sophie-creative-brief.js'),'utf8'))(win, undefined);
const B = win.SophieCreativeBrief;
let n = 0;
function t(name, fn){ fn(); n++; console.log('  ✓ '+name); }

const index = { headline:'5 Reasons You Will Love It', items:[1,2,3,4,5].map((rank)=>({
  rank, angleId:'a'+rank, headline:'Reason '+rank, claimStatus:'verified', opportunityScore:90-rank, visualProof:'Proof '+rank
})) };
const types = ['PROBLEM_SOLUTION','COMPATIBILITY','QUALITY_DETAIL','HOW_IT_WORKS','LIFESTYLE'];
const stack = { items:[
  {slot:1,type:'MAIN'},
  {slot:2,type:'IMAGE_INDEX'},
  ...index.items.map((a,i)=>({slot:i+3,type:types[i],angleId:a.angleId,linkedIndexRank:a.rank,opportunityScore:a.opportunityScore,claimStatus:'verified',support:a.headline,visualDirection:a.visualProof,question:'Q'}))
] };

const p = B.build(stack,index,{producto:'Shower Lamp',marketplace:'US'});
t('crea 7 briefs',()=>assert.equal(p.items.length,7));
t('main no permite copy',()=>assert.equal(p.items[0].copy.maxWords,0));
t('main exige fondo blanco',()=>assert.ok(p.items[0].mustInclude.includes('fondo blanco puro')));
t('index incorpora razones',()=>assert.ok(p.items[1].supportingMessage.includes('Reason 5')));
t('preserveProduct en todos',()=>assert.ok(p.items.every(x=>x.production.preserveProduct)));
t('update edita mensaje',()=>assert.equal(B.update(p,3,{primaryMessage:'Nuevo'}).items[2].primaryMessage,'Nuevo'));
t('validate aprueba pack',()=>assert.equal(B.validate(p).ok,true));
t('score alto',()=>assert.ok(p.score.total>=85));

console.log('\n'+n+' tests OK');
