/* ============================================================
   SOPHIE · IMAGE INDEX v2.0 — Motor determinístico
   Construye el índice visual desde los sales angles aprobados.
   No inventa razones: selecciona, valida diversidad y mide calidad.
   ============================================================ */
(function(global){
'use strict';

function obj(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function arr(v){return Array.isArray(v)?v:[]}
function txt(v,n){var s=String(v==null?'':v).replace(/\s+/g,' ').trim();return n?s.slice(0,n):s}
function clamp(v,a,b){v=Number(v);if(!Number.isFinite(v))v=a;return Math.max(a,Math.min(b,v))}
function avg(a){return a.length?a.reduce(function(s,x){return s+x},0)/a.length:0}

function quality(items){
  items=arr(items);
  if(!items.length)return{relevance:0,diversity:0,differentiation:0,visualClarity:0,evidence:0,total:0};
  var fam={},duplicates=0;
  items.forEach(function(x){fam[x.family]=(fam[x.family]||0)+1;if(fam[x.family]>1)duplicates++});
  var relevance=avg(items.map(function(x){return Number(x.scores&&x.scores.keywordRelevance)||0}))*10;
  var differentiation=avg(items.map(function(x){return Number(x.scores&&x.scores.competitiveDifferentiation)||0}))*10;
  var visual=avg(items.map(function(x){return Number(x.scores&&x.scores.visualStrength)||0}))*10;
  var evidence=avg(items.map(function(x){var e=x.evidence||{},n=0;if(e.reviewMentions)n++;if(arr(e.keywords).length)n++;if(e.competitorsTotal)n++;if(arr(e.listingRefs).length)n++;if(arr(e.productRefs).length)n++;return Math.min(5,n)/5*100}));
  var diversity=Math.max(0,100-duplicates*22);
  var total=relevance*.25+diversity*.20+differentiation*.20+visual*.20+evidence*.15;
  return{relevance:Math.round(relevance),diversity:Math.round(diversity),differentiation:Math.round(differentiation),visualClarity:Math.round(visual),evidence:Math.round(evidence),total:Math.round(total)};
}

function toItem(angle,rank){
  angle=obj(angle)?angle:{};
  return{
    rank:rank,
    angleId:txt(angle.id,80),
    family:txt(angle.family,40)||'other',
    headline:txt(angle.label,55),
    support:txt(angle.benefit||angle.visualProof,140),
    opportunityScore:Math.round(Number(angle.opportunityScore)||0),
    claimStatus:txt(angle.claimStatus,30)||'inferred',
    visualProof:txt(angle.visualProof,220),
    scores:obj(angle.scores)?angle.scores:{},
    evidence:obj(angle.evidence)?angle.evidence:{},
    destinationSlot:rank+2
  };
}

function build(angles,product,opts){
  opts=obj(opts)?opts:{};
  if(!global.SophieImageStrategy)return null;
  var count=Math.max(4,Math.min(6,Math.round(Number(opts.count)||5)));
  var selected=global.SophieImageStrategy.seleccionarAngles(angles,{min:Math.min(4,count),max:count,maxPerFamily:1});
  if(selected.length<4)return null;
  var items=selected.map(function(a,i){return toItem(a,i+1)});
  return{
    version:2,
    policy:'evidence_first',
    headline:'Top '+items.length+' Reasons Why Our '+txt(product||'Product',55)+' Is The Best',
    subheadline:'',
    items:items,
    quality:quality(items),
    status:'draft',
    generatedAt:new Date().toISOString()
  };
}

function normalize(index){
  if(!obj(index)||!arr(index.items).length)return null;
  var out={version:2,policy:index.policy||'evidence_first',headline:txt(index.headline,120),subheadline:txt(index.subheadline,160),status:index.status||'draft',generatedAt:index.generatedAt||'',approvedAt:index.approvedAt||'',items:[]};
  out.items=index.items.slice(0,6).map(function(x,i){x=obj(x)?x:{};return Object.assign({},x,{rank:i+1,headline:txt(x.headline,55),support:txt(x.support,140),destinationSlot:x.destinationSlot||i+3})});
  out.quality=quality(out.items);return out;
}

function replace(index,rank,angle){
  var x=normalize(index);if(!x||rank<1||rank>x.items.length)return x;
  x.items[rank-1]=toItem(angle,rank);x.items=x.items.map(function(it,i){it.rank=i+1;it.destinationSlot=i+3;return it});x.quality=quality(x.items);return x;
}
function move(index,from,to){
  var x=normalize(index);if(!x)return null;from=Math.round(from)-1;to=Math.round(to)-1;if(from<0||from>=x.items.length||to<0||to>=x.items.length)return x;
  var item=x.items.splice(from,1)[0];x.items.splice(to,0,item);x.items=x.items.map(function(it,i){it.rank=i+1;it.destinationSlot=i+3;return it});x.quality=quality(x.items);return x;
}
function validate(index){
  var x=normalize(index),errors=[],warnings=[];if(!x)return{ok:false,errors:['Index inválido'],warnings:[]};
  if(x.items.length<4||x.items.length>6)errors.push('El Image Index debe tener entre 4 y 6 razones.');
  var ids={},families={};x.items.forEach(function(it){
    if(!it.angleId)errors.push('Cada razón debe estar vinculada a un sales angle.');
    if(ids[it.angleId])errors.push('Hay razones duplicadas.');ids[it.angleId]=1;
    families[it.family]=(families[it.family]||0)+1;if(it.claimStatus==='unsafe')errors.push('Hay un claim inseguro: '+it.headline);
    if(it.opportunityScore<55)warnings.push('Razón de baja prioridad: '+it.headline+' ('+it.opportunityScore+').');
  });
  Object.keys(families).forEach(function(f){if(families[f]>1)warnings.push('Hay '+families[f]+' razones de la misma familia: '+f+'.');});
  if(x.quality.total<70)warnings.push('La calidad estratégica del Index está por debajo de 70/100.');
  return{ok:errors.length===0,errors:errors,warnings:warnings,index:x};
}

global.SophieImageIndex={version:'2.0',build:build,normalize:normalize,replace:replace,move:move,quality:quality,validate:validate,toItem:toItem};
})(typeof window!=='undefined'?window:this);
