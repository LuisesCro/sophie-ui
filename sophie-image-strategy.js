/* ============================================================
   SOPHIE · IMAGE STRATEGY v2.0 — Motor determinístico
   Crezcamos Online

   Fase 2: convierte research estructurado en sales angles comparables.
   El LLM EXTRAE significado; este motor NORMALIZA, CALCULA y VALIDA.
   ============================================================ */
(function (global) {
  'use strict';

  var PESOS = Object.freeze({
    keywordRelevance: 0.20,
    buyingImpact: 0.20,
    reviewFrequency: 0.15,
    competitiveDifferentiation: 0.15,
    visualStrength: 0.15,
    emotionalPull: 0.10,
    claimSafety: 0.05
  });

  var FAMILIAS = Object.freeze([
    'ease', 'speed', 'comfort', 'quality', 'durability', 'size', 'compatibility',
    'safety', 'cleaning', 'storage', 'aesthetic', 'value', 'emotional', 'performance',
    'portability', 'organization', 'materials', 'other'
  ]);

  var CLAIM_SAFETY = Object.freeze({ verified: 10, user_provided: 8, inferred: 5, unsafe: 0 });
  var MARCADORES = Object.freeze({
    research: 'SOPHIE_IMAGE_RESEARCH', index: 'SOPHIE_IMAGE_INDEX',
    stack: 'SOPHIE_IMAGE_STACK', copy: 'SOPHIE_IMAGE_COPY'
  });

  function esObjeto(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function numero(v, fallback) {
    var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
  }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, numero(v, min))); }
  function redondear(v, dec) { var p = Math.pow(10, dec == null ? 0 : dec); return Math.round(v * p) / p; }
  function texto(v, max) { var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); return max ? s.slice(0, max) : s; }
  function lista(v, max) { var a = Array.isArray(v) ? v : []; return max != null ? a.slice(0, max) : a; }
  function slug(s) {
    return texto(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || 'angle';
  }

  function familia(v) {
    var f = slug(v).replace(/_/g, '-');
    var aliases = {
      usability:'ease', easy:'ease', convenience:'ease', fast:'speed', rapidez:'speed', time:'speed',
      comodidad:'comfort', ergonomic:'comfort', ergonomics:'comfort', calidad:'quality', premium:'quality',
      craftsmanship:'quality', durable:'durability', strength:'durability', resistente:'durability',
      sizing:'size', dimensions:'size', medidas:'size', fit:'compatibility', compatible:'compatibility',
      seguridad:'safety', clean:'cleaning', limpieza:'cleaning', almacenamiento:'storage', compact:'storage',
      design:'aesthetic', estetica:'aesthetic', price:'value', ahorro:'value', emotion:'emotional',
      lifestyle:'emotional', rendimiento:'performance', portable:'portability', organizacion:'organization', material:'materials'
    };
    f = aliases[f] || f;
    return FAMILIAS.indexOf(f) >= 0 ? f : 'other';
  }

  function claimStatus(v) {
    var s = slug(v).toLowerCase();
    return Object.prototype.hasOwnProperty.call(CLAIM_SAFETY, s) ? s : 'inferred';
  }

  function reviewFrequencyScore(menciones, maxMenciones) {
    var m = Math.max(0, numero(menciones, 0)), max = Math.max(0, numero(maxMenciones, 0));
    if (!max || !m) return 0;
    return redondear(10 * Math.sqrt(m / max), 1);
  }
  function competitiveDifferentiationScore(usando, total) {
    var t = Math.max(0, numero(total, 0)), u = Math.max(0, numero(usando, 0));
    if (!t) return 5;
    return redondear(10 * (1 - Math.min(u, t) / t), 1);
  }
  function claimSafetyScore(status) { return CLAIM_SAFETY[claimStatus(status)]; }

  function normalizarEvidence(e) {
    e = esObjeto(e) ? e : {};
    return {
      reviewMentions: Math.max(0, Math.round(numero(e.reviewMentions, e.reviews || 0))),
      keywords: lista(e.keywords, 25).map(function(x){ return texto(x,160); }).filter(Boolean),
      competitorsUsing: Math.max(0, Math.round(numero(e.competitorsUsing, 0))),
      competitorsTotal: Math.max(0, Math.round(numero(e.competitorsTotal, 0))),
      listingRefs: lista(e.listingRefs || e.listing, 10).map(function(x){ return texto(x,120); }).filter(Boolean),
      productRefs: lista(e.productRefs || e.product, 10).map(function(x){ return texto(x,120); }).filter(Boolean),
      reviewClusters: lista(e.reviewClusters, 10).map(function(x){ return texto(x,120); }).filter(Boolean)
    };
  }

  function normalizarModelScores(s) {
    s = esObjeto(s) ? s : {};
    return {
      keywordRelevance: clamp(s.keywordRelevance,0,10), buyingImpact: clamp(s.buyingImpact,0,10),
      visualStrength: clamp(s.visualStrength,0,10), emotionalPull: clamp(s.emotionalPull,0,10)
    };
  }

  function normalizarAngle(a, i) {
    a = esObjeto(a) ? a : {};
    var label = texto(a.label || a.title || a.benefit || ('Angle ' + (i + 1)), 90);
    var status = claimStatus(a.claimStatus || (a.claim && a.claim.status));
    return {
      id: texto(a.id,80) || ('angle_' + slug(label)), family: familia(a.family || a.category), label: label,
      benefit: texto(a.benefit,240), pain: texto(a.pain,240), desire: texto(a.desire,240),
      objection: texto(a.objection,240), visualProof: texto(a.visualProof,300),
      claim: texto(esObjeto(a.claim) ? a.claim.text : a.claim,220), claimStatus: status,
      evidence: normalizarEvidence(a.evidence), modelScores: normalizarModelScores(a.modelScores || a.scores),
      opportunityScore: 0, scores: {}
    };
  }

  function maxReviewMentions(angles) {
    var max = 0;
    lista(angles).forEach(function(a){ var e = esObjeto(a && a.evidence) ? a.evidence : {}; max = Math.max(max, Math.max(0, numero(e.reviewMentions,0))); });
    return max;
  }

  function puntuarAngle(angle, context) {
    var a = normalizarAngle(angle,0); context = esObjeto(context) ? context : {};
    var maxReviews = Math.max(0, numero(context.maxReviewMentions,0));
    if (!maxReviews) maxReviews = a.evidence.reviewMentions;
    var s = {
      keywordRelevance: clamp(a.modelScores.keywordRelevance,0,10),
      buyingImpact: clamp(a.modelScores.buyingImpact,0,10),
      reviewFrequency: reviewFrequencyScore(a.evidence.reviewMentions,maxReviews),
      competitiveDifferentiation: competitiveDifferentiationScore(a.evidence.competitorsUsing,a.evidence.competitorsTotal),
      visualStrength: clamp(a.modelScores.visualStrength,0,10), emotionalPull: clamp(a.modelScores.emotionalPull,0,10),
      claimSafety: claimSafetyScore(a.claimStatus)
    };
    var total10 = 0; Object.keys(PESOS).forEach(function(k){ total10 += s[k] * PESOS[k]; });
    a.scores = s; a.opportunityScore = Math.round(total10 * 10); return a;
  }

  function puntuarAngles(angles) {
    var normal = lista(angles,50).map(normalizarAngle), maxReviews = maxReviewMentions(normal);
    return normal.map(function(a){ return puntuarAngle(a,{maxReviewMentions:maxReviews}); })
      .sort(function(a,b){ return b.opportunityScore - a.opportunityScore; });
  }

  var STOP = {the:1,and:1,for:1,with:1,your:1,our:1,this:1,that:1,more:1,better:1,de:1,la:1,el:1,los:1,las:1,para:1,con:1,que:1,por:1,mas:1,mejor:1,easy:1,easily:1,designed:1,design:1,product:1,producto:1};
  function tokensConcepto(a) {
    var s = [a.label,a.benefit,a.pain,a.desire].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]+/g,' '), seen = {};
    s.split(/\s+/).forEach(function(w){ if(w.length >= 4 && !STOP[w]) seen[w] = 1; }); return Object.keys(seen);
  }
  function similitud(a,b) {
    var A=tokensConcepto(a), B=tokensConcepto(b); if(!A.length || !B.length) return 0;
    var bs={}; B.forEach(function(x){bs[x]=1;}); var inter=A.filter(function(x){return bs[x];}).length;
    return inter / new Set(A.concat(B)).size;
  }

  function seleccionarAngles(angles, opts) {
    opts = esObjeto(opts) ? opts : {};
    var min=Math.max(1,Math.min(6,Math.round(numero(opts.min,4)))), max=Math.max(min,Math.min(6,Math.round(numero(opts.max,5))));
    var maxFamilia=Math.max(1,Math.round(numero(opts.maxPerFamily,1)));
    var threshold=clamp(opts.similarityThreshold == null ? 0.55 : opts.similarityThreshold,0.2,1);
    var scored=puntuarAngles(angles).filter(function(a){return a.claimStatus !== 'unsafe';}), out=[], fam={};
    function cabe(a,familyLimit,simLimit){
      if((fam[a.family]||0)>=familyLimit) return false;
      for(var j=0;j<out.length;j++) if(similitud(a,out[j])>=simLimit) return false;
      return true;
    }
    scored.forEach(function(a){ if(out.length>=max) return; if(cabe(a,maxFamilia,threshold)){out.push(a);fam[a.family]=(fam[a.family]||0)+1;} });
    if(out.length<min) scored.forEach(function(a){
      if(out.length>=min || out.some(function(x){return x.id===a.id;})) return;
      if(cabe(a,Math.max(2,maxFamilia),Math.min(0.82,threshold+0.20))){out.push(a);fam[a.family]=(fam[a.family]||0)+1;}
    });
    return out.slice(0,max);
  }

  function normalizarInsight(x,tipo) {
    if(typeof x==='string') return {type:tipo,label:texto(x,240),mentions:0,importance:0,evidence:[]};
    x=esObjeto(x)?x:{};
    return {type:tipo,id:texto(x.id,80)||slug(x.label||x.theme||x.text),label:texto(x.label||x.theme||x.text,240),
      mentions:Math.max(0,Math.round(numero(x.mentions||x.frequency,0))),importance:clamp(x.importance,0,10),
      evidence:lista(x.evidence||x.examples,6).map(function(e){return texto(e,280);}).filter(Boolean)};
  }
  function normalizarListaInsights(v,tipo,max){return lista(v,max||30).map(function(x){return normalizarInsight(x,tipo);}).filter(function(x){return !!x.label;});}

  function normalizarResearch(raw) {
    raw=esObjeto(raw)?raw:{}; var r=esObjeto(raw.research)?raw.research:raw; var angles=puntuarAngles(raw.angles||r.angles||[]);
    return {schemaVersion:2,research:{
      pains:normalizarListaInsights(r.pains,'pain'),desires:normalizarListaInsights(r.desires,'desire'),
      objections:normalizarListaInsights(r.objections,'objection'),purchaseTriggers:normalizarListaInsights(r.purchaseTriggers,'purchase_trigger'),
      competitorPatterns:normalizarListaInsights(r.competitorPatterns,'competitor_pattern'),marketGaps:normalizarListaInsights(r.marketGaps,'market_gap'),
      saturatedClaims:normalizarListaInsights(r.saturatedClaims,'saturated_claim'),visualOpportunities:normalizarListaInsights(r.visualOpportunities,'visual_opportunity'),
      customerLanguage:lista(r.customerLanguage,30).map(function(x){return texto(x,240);}).filter(Boolean)
    },angles:angles,recommendedAngles:seleccionarAngles(angles),meta:{
      generatedAt:texto(raw.meta&&raw.meta.generatedAt,40),competitorsAnalyzed:Math.max(0,Math.round(numero(raw.meta&&raw.meta.competitorsAnalyzed,0))),
      reviewsAnalyzed:Math.max(0,Math.round(numero(raw.meta&&raw.meta.reviewsAnalyzed,0)))} };
  }

  function extraerMarcador(textoCrudo,nombre){
    var t=String(textoCrudo||''),ini='<!--'+nombre+':',p=t.indexOf(ini); if(p<0)return null;
    var fin=t.indexOf('-->',p+ini.length); if(fin<0)return null;
    try{return JSON.parse(t.slice(p+ini.length,fin).trim());}catch(e){return null;}
  }
  function parseResearch(t){var r=extraerMarcador(t,MARCADORES.research);return r?normalizarResearch(r):null;}
  function parseIndex(t){return extraerMarcador(t,MARCADORES.index);}
  function parseStack(t){return extraerMarcador(t,MARCADORES.stack);}
  function parseCopy(t){return extraerMarcador(t,MARCADORES.copy);}
  function limpiar(t){
    var s=String(t||''); Object.keys(MARCADORES).forEach(function(k){
      var name=MARCADORES[k].replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); s=s.replace(new RegExp('<!--'+name+':[\\s\\S]*?-->','g'),'');
    }); return s.trim();
  }

  global.SophieImageStrategy = {
    version:'2.0',weights:PESOS,families:FAMILIAS,claimSafety:CLAIM_SAFETY,clamp:clamp,slug:slug,familia:familia,
    claimSafetyScore:claimSafetyScore,reviewFrequencyScore:reviewFrequencyScore,competitiveDifferentiationScore:competitiveDifferentiationScore,
    normalizarAngle:normalizarAngle,puntuarAngle:puntuarAngle,puntuarAngles:puntuarAngles,similitud:similitud,seleccionarAngles:seleccionarAngles,
    normalizarResearch:normalizarResearch,parseResearch:parseResearch,parseIndex:parseIndex,parseStack:parseStack,parseCopy:parseCopy,limpiar:limpiar
  };
})(typeof window !== 'undefined' ? window : this);
