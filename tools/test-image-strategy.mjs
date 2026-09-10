#!/usr/bin/env node
/* Tests del contrato Sophie Image Strategy v2. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { strict as assert } from 'node:assert';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
new Function('window','document', readFileSync(resolve(raiz,'sophie-image-strategy.js'),'utf8'))(win, undefined);
const S = win.SophieImageStrategy;
let n = 0;
function t(name,fn){ fn(); n++; console.log('  ✓ '+name); }

t('score exacto con pesos',()=>{
  const a=S.puntuarAngle({label:'Easy Cleaning',family:'cleaning',claimStatus:'verified',
    evidence:{reviewMentions:100,competitorsUsing:2,competitorsTotal:10},
    modelScores:{keywordRelevance:8,buyingImpact:9,visualStrength:10,emotionalPull:7}},
    {maxReviewMentions:100});
  assert.equal(a.scores.reviewFrequency,10);
  assert.equal(a.scores.competitiveDifferentiation,8);
  assert.equal(a.scores.claimSafety,10);
  assert.equal(a.opportunityScore,88);
});

t('sin competencia medida usa score neutral',()=>assert.equal(S.competitiveDifferentiationScore(0,0),5));

t('review frequency usa escala relativa',()=>{
  assert.equal(S.reviewFrequencyScore(100,100),10);
  assert.equal(S.reviewFrequencyScore(25,100),5);
});

t('claim unsafe queda fuera de recommendedAngles',()=>{
  const a=S.seleccionarAngles([
    {label:'#1 Best Seller',family:'value',claimStatus:'unsafe',evidence:{reviewMentions:100,competitorsTotal:10},modelScores:{keywordRelevance:10,buyingImpact:10,visualStrength:10,emotionalPull:10}},
    {label:'Easy Cleaning',family:'cleaning',claimStatus:'verified',evidence:{reviewMentions:80,competitorsTotal:10},modelScores:{keywordRelevance:9,buyingImpact:9,visualStrength:9,emotionalPull:7}},
    {label:'Fast Setup',family:'speed',claimStatus:'verified',evidence:{reviewMentions:70,competitorsTotal:10},modelScores:{keywordRelevance:8,buyingImpact:8,visualStrength:9,emotionalPull:6}},
    {label:'Comfort Grip',family:'comfort',claimStatus:'verified',evidence:{reviewMentions:60,competitorsTotal:10},modelScores:{keywordRelevance:8,buyingImpact:8,visualStrength:9,emotionalPull:8}},
    {label:'Compact Storage',family:'storage',claimStatus:'verified',evidence:{reviewMentions:50,competitorsTotal:10},modelScores:{keywordRelevance:7,buyingImpact:7,visualStrength:8,emotionalPull:6}}
  ],{min:4,max:5});
  assert.equal(a.some(x=>x.claimStatus==='unsafe'),false);
  assert.equal(a.length,4);
});

t('diversity guard evita repetición por familia',()=>{
  const items=['Built to Last','Heavy Duty','Strong Construction','Long Lasting'].map((label,i)=>({
    label,family:'durability',claimStatus:'verified',evidence:{reviewMentions:100-i*5,competitorsUsing:1,competitorsTotal:10},
    modelScores:{keywordRelevance:9,buyingImpact:9,visualStrength:9,emotionalPull:7}
  }));
  items.push(
    {label:'Easy Cleaning',family:'cleaning',claimStatus:'verified',evidence:{reviewMentions:60,competitorsUsing:1,competitorsTotal:10},modelScores:{keywordRelevance:8,buyingImpact:8,visualStrength:9,emotionalPull:6}},
    {label:'Quick Setup',family:'speed',claimStatus:'verified',evidence:{reviewMentions:55,competitorsUsing:1,competitorsTotal:10},modelScores:{keywordRelevance:8,buyingImpact:8,visualStrength:9,emotionalPull:6}},
    {label:'Compact Storage',family:'storage',claimStatus:'verified',evidence:{reviewMentions:50,competitorsUsing:1,competitorsTotal:10},modelScores:{keywordRelevance:8,buyingImpact:8,visualStrength:9,emotionalPull:6}}
  );
  const a=S.seleccionarAngles(items,{min:4,max:5,maxPerFamily:1});
  assert.ok(a.filter(x=>x.family==='durability').length<=1);
  assert.ok(a.length>=4);
});

t('parser research normaliza y puntúa',()=>{
  const payload={research:{pains:[{label:'Difícil de limpiar',mentions:22}],desires:['Más rápido']},angles:[{
    label:'Easy Cleaning',family:'cleaning',claimStatus:'verified',evidence:{reviewMentions:22,competitorsUsing:2,competitorsTotal:10},
    modelScores:{keywordRelevance:9,buyingImpact:9,visualStrength:10,emotionalPull:7}
  }]};
  const p=S.parseResearch('hola <!--SOPHIE_IMAGE_RESEARCH:'+JSON.stringify(payload)+'--> fin');
  assert.ok(p); assert.equal(p.research.pains[0].mentions,22); assert.ok(p.angles[0].opportunityScore>0);
});

t('marcador truncado degrada a null',()=>assert.equal(S.parseResearch('<!--SOPHIE_IMAGE_RESEARCH:{"research":{}'),null));

t('limpiar quita marcadores',()=>assert.equal(S.limpiar('A<!--SOPHIE_IMAGE_RESEARCH:{"research":{}}-->B'),'AB'));

console.log('\n'+n+' tests OK');
