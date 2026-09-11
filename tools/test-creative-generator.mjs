#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { strict as assert } from 'node:assert';

const raiz=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const win={};
new Function('window','document',readFileSync(resolve(raiz,'sophie-creative-generator.js'),'utf8'))(win,undefined);
const G=win.SophieCreativeGenerator;
let n=0;function t(name,fn){fn();n++;console.log('  ✓ '+name)}
const idx={headline:'5 Reasons You Will Love It',items:[1,2,3,4,5].map(rank=>({rank,headline:'Reason '+rank}))};
const types=['MAIN','IMAGE_INDEX','PROBLEM_SOLUTION','DIMENSIONS','COMPARISON','QUALITY_DETAIL','LIFESTYLE'];
const briefs={status:'approved',items:types.map((type,i)=>({slot:i+1,type,objective:'Objective',primaryMessage:type==='MAIN'?'':'Message '+(i+1),supportingMessage:'Support',visualDirection:'Direction',composition:'Composition',source:{angleId:i>1?'a'+i:null,indexRank:i>1?i-1:null,claimStatus:'verified'},mustAvoid:[]}))};
const ctx={producto:'Shower Lamp',marketplace:'US',imageIndex:idx,hasProductPhotos:true,productTruth:{dimensiones:'10 x 20 cm'}};
const p=G.build(briefs,ctx);
t('crea 7 assets',()=>assert.equal(p.items.length,7));
t('MAIN usa photo_brief',()=>assert.equal(p.items[0].mode,'photo_brief'));
t('IMAGE_INDEX usa canvas',()=>assert.equal(p.items[1].mode,'canvas'));
t('lifestyle usa image_generation',()=>assert.equal(p.items[6].mode,'image_generation'));
t('preserveProduct en todos',()=>assert.ok(p.items.every(x=>x.constraints.preserveProduct)));
t('prompt final incluye restricción anti-invención',()=>assert.ok(p.items[6].prompt.includes('do not add accessories')));
t('comparison queda pendiente sin evidencia específica',()=>assert.ok(p.items[4].missingInputs.includes('verified_comparison')));
t('unsafe claim bloquea validación',()=>{const bad=JSON.parse(JSON.stringify(briefs));bad.items[3].source.claimStatus='unsafe';assert.equal(G.validate(G.build(bad,ctx)).ok,false)});
t('manifest exporta JSON',()=>assert.ok(G.manifest(p).includes('evidence_first')));
console.log('\n'+n+' tests OK');
