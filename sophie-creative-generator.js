/* ============================================================
   SOPHIE · CREATIVE GENERATOR v2.0
   Creative Briefs aprobados -> paquete de producción trazable.
   - Decide modo por slot: canvas | photo_brief | image_generation
   - Construye prompt final + negative prompt + requisitos
   - Renderiza IMAGE_INDEX evidence-first en Canvas 2000x2000
   - Nunca rellena evidencia faltante con invenciones
   ============================================================ */
(function(g){
'use strict';
function A(v){return Array.isArray(v)?v:[]}
function O(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function T(v,n){var s=String(v==null?'':v).replace(/\s+/g,' ').trim();return n?s.slice(0,n):s}
function uniq(a){var seen={};return A(a).map(function(x){return T(x,260)}).filter(function(x){var k=x.toLowerCase();if(!x||seen[k])return false;seen[k]=1;return true})}

var MODE={
  MAIN:'photo_brief', IMAGE_INDEX:'canvas',
  HERO_BENEFIT:'image_generation', PROBLEM_SOLUTION:'image_generation', HOW_IT_WORKS:'image_generation',
  FEATURES:'image_generation', MATERIALS:'image_generation', DIMENSIONS:'image_generation',
  COMPATIBILITY:'image_generation', COMPARISON:'image_generation', QUALITY_DETAIL:'image_generation',
  LIFESTYLE:'image_generation', OUTCOME:'image_generation', SAFETY:'image_generation'
};

var TYPE_RULES={
  MAIN:{scene:'pure white background product photography',need:['product_photos'],negative:['text','badges','props not included','watermarks','extra accessories']},
  IMAGE_INDEX:{scene:'clean editorial infographic, strong mobile hierarchy',need:['image_index'],negative:['unsupported badges','fake awards','tiny text','competitor logos']},
  HERO_BENEFIT:{scene:'single-benefit product hero composition',need:['product_photos'],negative:['multiple competing messages','unverified performance claims']},
  PROBLEM_SOLUTION:{scene:'credible problem-to-solution contrast',need:['product_photos'],negative:['exaggerated before/after','fear-based deception']},
  HOW_IT_WORKS:{scene:'2–3 step usage sequence with consistent product geometry',need:['product_photos'],negative:['invented steps','extra parts','physically impossible use']},
  FEATURES:{scene:'product-centered feature callouts linked to visible components',need:['product_photos'],negative:['invented features','floating labels not tied to visible product']},
  MATERIALS:{scene:'macro material and construction details',need:['product_photos','verified_materials'],negative:['invented materials','certification marks not provided']},
  DIMENSIONS:{scene:'dimension diagram with readable measurement guides',need:['product_photos','verified_dimensions'],negative:['estimated measurements','distorted proportions']},
  COMPATIBILITY:{scene:'compatibility guide with simple validated use cases',need:['product_photos','verified_compatibility'],negative:['unsupported model names','invented compatibility']},
  COMPARISON:{scene:'ours versus typical comparison using verified criteria only',need:['verified_comparison'],negative:['competitor brand names','logos','unsupported superiority claims']},
  QUALITY_DETAIL:{scene:'macro build-quality proof with 1–3 callouts',need:['product_photos'],negative:['invented construction details','fake certification badges']},
  LIFESTYLE:{scene:'natural real-world use scene, product clearly recognizable',need:['product_photos'],negative:['product redesign','impossible scale','unrelated props dominating scene']},
  OUTCOME:{scene:'credible desired outcome with clear causal link to product',need:['product_photos'],negative:['guaranteed results','medical or financial promises','unrealistic transformation']},
  SAFETY:{scene:'restrained trust-building visual with validated proof only',need:['verified_safety'],negative:['unverified safety claims','fake seals','medical claims']}
};

function truth(ctx,key){var t=O(ctx&&ctx.productTruth)?ctx.productTruth:{};var v=t[key];return v!==undefined&&v!==null&&String(v).trim()!==''}
function hasPhotos(ctx){return !!(ctx&&(ctx.hasProductPhotos||A(ctx.productPhotos).length||A(ctx.sourceImages).length))}
function requirementStatus(req,asset,ctx){
  if(req==='product_photos')return hasPhotos(ctx);
  if(req==='image_index')return A(ctx&&ctx.imageIndex&&ctx.imageIndex.items).length>=4;
  if(req==='verified_dimensions')return truth(ctx,'dimensiones')||truth(ctx,'dimensions');
  if(req==='verified_materials')return truth(ctx,'materiales')||truth(ctx,'materials');
  if(req==='verified_compatibility')return truth(ctx,'compatibilidad')||truth(ctx,'compatibility');
  if(req==='verified_comparison')return truth(ctx,'comparacion')||truth(ctx,'comparison')||!!(asset&&asset.source&&asset.source.comparisonVerified===true);
  if(req==='verified_safety')return !!(asset&&asset.source&&(asset.source.claimStatus==='verified'||asset.source.claimStatus==='user_provided'));
  return false;
}
function requiredInputs(type,asset,ctx){var rules=TYPE_RULES[type]||TYPE_RULES.FEATURES,need=A(rules.need),missing=need.filter(function(x){return !requirementStatus(x,asset,ctx)});return{required:need,missing:missing,ready:missing.length===0}}
function negativePrompt(type,brief){var rules=TYPE_RULES[type]||TYPE_RULES.FEATURES;var common=['altered product shape','changed product color','extra product parts','misspelled text','tiny unreadable text','watermark','competitor branding','fake awards','unsupported claims'];return uniq(common.concat(A(rules.negative)).concat(A(brief&&brief.mustAvoid))).join(', ')}
function finalPrompt(brief,ctx){brief=O(brief)?brief:{};ctx=O(ctx)?ctx:{};var type=TYPE_RULES[brief.type]?brief.type:'FEATURES',rules=TYPE_RULES[type];var p=[];
  p.push('Create an Amazon listing image');
  p.push('slot '+(brief.slot||'?'));
  p.push('type '+type);
  if(ctx.producto)p.push('product: '+T(ctx.producto,120));
  if(ctx.marketplace)p.push('marketplace: '+T(ctx.marketplace,40));
  p.push('visual scene: '+rules.scene);
  if(brief.objective)p.push('objective: '+T(brief.objective,180));
  if(brief.primaryMessage)p.push('primary message: '+T(brief.primaryMessage,160));
  if(brief.supportingMessage)p.push('supporting message: '+T(brief.supportingMessage,240));
  if(brief.visualDirection)p.push('visual direction: '+T(brief.visualDirection,300));
  if(brief.composition)p.push('composition: '+T(brief.composition,300));
  p.push('preserve exact product geometry, proportions, colors, branding and visible components from source images');
  p.push('do not add accessories, functions, materials, measurements, certifications or guarantees that are not explicitly verified');
  p.push('mobile-first hierarchy, square 2000x2000');
  if(type==='MAIN')p.push('pure white background, product only, no text');
  if(type==='IMAGE_INDEX')p.push('use only the approved Image Index reasons; do not add filler claims');
  return p.join('. ')+'.';
}
function assetFromBrief(brief,ctx){brief=O(brief)?brief:{};ctx=O(ctx)?ctx:{};var type=MODE[brief.type]?brief.type:'FEATURES',mode=MODE[type],req=requiredInputs(type,brief,ctx),claim=T(brief.source&&brief.source.claimStatus,30)||'verified';var blocked=claim==='unsafe';var reasons=[];if(blocked)reasons.push('unsafe_claim');if(req.missing.length)reasons=reasons.concat(req.missing);return{
  slot:brief.slot,type:type,status:blocked?'blocked':(req.ready?'ready':'needs_input'),mode:mode,
  objective:T(brief.objective,180),primaryMessage:T(brief.primaryMessage,180),supportingMessage:T(brief.supportingMessage,260),visualDirection:T(brief.visualDirection,320),
  prompt:finalPrompt(brief,ctx),negativePrompt:negativePrompt(type,brief),
  source:Object.assign({},brief.source||{}),constraints:{width:2000,height:2000,preserveProduct:true,mobileFirst:true},
  requiredInputs:req.required,missingInputs:req.missing,blockedReasons:uniq(reasons),
  canGenerate:!blocked&&req.ready&&mode==='image_generation',canRender:!blocked&&req.ready&&mode==='canvas',needsPhoto:mode==='photo_brief'
}}
function score(pack){var items=A(pack&&pack.items);if(!items.length)return{total:0,readiness:0,claimSafety:0,traceability:0,preserveProduct:0};var ready=items.filter(function(x){return x.status==='ready'}).length/items.length*100;var safe=items.filter(function(x){return !A(x.blockedReasons).includes('unsafe_claim')}).length/items.length*100;var trace=items.filter(function(x){return x.type==='MAIN'||x.type==='IMAGE_INDEX'||(x.source&&x.source.angleId)}).length/items.length*100;var pp=items.filter(function(x){return x.constraints&&x.constraints.preserveProduct===true}).length/items.length*100;return{readiness:Math.round(ready),claimSafety:Math.round(safe),traceability:Math.round(trace),preserveProduct:Math.round(pp),total:Math.round(ready*.35+safe*.25+trace*.2+pp*.2)}}
function build(briefs,ctx){if(!briefs||!A(briefs.items).length)return null;ctx=O(ctx)?ctx:{};var out={version:2,status:'draft',generatedAt:new Date().toISOString(),policy:'evidence_first',items:A(briefs.items).slice(0,7).map(function(b){return assetFromBrief(b,ctx)})};out.score=score(out);return out}
function normalize(pack){if(!O(pack)||!A(pack.items).length)return null;var out={version:2,status:pack.status||'draft',generatedAt:pack.generatedAt||'',approvedAt:pack.approvedAt||'',policy:pack.policy||'evidence_first',items:pack.items.slice(0,7).map(function(x){x=O(x)?x:{};return Object.assign({},x,{slot:Number(x.slot)||0,type:T(x.type,40),status:T(x.status,30),prompt:T(x.prompt,4000),negativePrompt:T(x.negativePrompt,2000),requiredInputs:uniq(x.requiredInputs),missingInputs:uniq(x.missingInputs),blockedReasons:uniq(x.blockedReasons),constraints:Object.assign({width:2000,height:2000,preserveProduct:true,mobileFirst:true},x.constraints||{})})})};out.score=score(out);return out}
function validate(pack){var p=normalize(pack),e=[],w=[];if(!p)return{ok:false,errors:['Paquete de producción inválido'],warnings:[]};if(p.items.length!==7)e.push('Deben existir 7 assets de producción.');p.items.forEach(function(x){if(x.slot<1||x.slot>7)e.push('Slot inválido.');if(!x.prompt)e.push('Falta prompt en imagen '+x.slot+'.');if(!x.constraints||x.constraints.preserveProduct!==true)e.push('Imagen '+x.slot+' debe preservar el producto.');if(A(x.blockedReasons).includes('unsafe_claim'))e.push('Imagen '+x.slot+' contiene un claim inseguro.');if(x.status==='needs_input')w.push('Imagen '+x.slot+' requiere: '+x.missingInputs.join(', ')+'.');});if(p.score.readiness<70)w.push('Menos del 70% de los assets están listos para producción.');return{ok:e.length===0,errors:e,warnings:w,production:p}}
function manifest(pack){var p=normalize(pack);return p?JSON.stringify(p,null,2):''}

/* ---------- Canvas evidence-first para IMAGE_INDEX ---------- */
function canvasAvailable(){return typeof document!=='undefined'&&document.createElement&&!!document.createElement('canvas').getContext}
function wrap(ctx,text,maxWidth){var words=T(text,300).split(/\s+/),lines=[],line='';words.forEach(function(w){var t=line?line+' '+w:w;if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=w}else line=t});if(line)lines.push(line);return lines}
function renderIndex(index,opts){if(!canvasAvailable())return null;opts=O(opts)?opts:{};var items=A(index&&index.items).slice(0,6);if(items.length<4)return null;var c=document.createElement('canvas');c.width=c.height=2000;var x=c.getContext('2d'),M=130,W=1740;x.fillStyle='#FFFFFF';x.fillRect(0,0,2000,2000);x.textBaseline='top';x.fillStyle='#14171A';x.font='800 96px Helvetica,Arial,sans-serif';var headline=T(index&&index.headline,100)||((items.length)+' Reasons You’ll Love '+T(opts.producto||'This Product',80));var hl=wrap(x,headline,W);hl.slice(0,2).forEach(function(line,i){x.fillText(line,M,M+i*112)});var y=M+hl.slice(0,2).length*112+48;var gap=22,rowH=(2000-M-y-gap*(items.length-1))/items.length;items.forEach(function(it,i){x.fillStyle=i===0?'#EEF3FF':'#F2F4F7';if(x.roundRect){x.beginPath();x.roundRect(M,y,W,rowH,28);x.fill()}else x.fillRect(M,y,W,rowH);x.fillStyle='#1A6BFF';x.beginPath();x.arc(M+95,y+rowH/2,58,0,Math.PI*2);x.fill();x.fillStyle='#FFFFFF';x.font='800 64px Helvetica,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(i+1),M+95,y+rowH/2+2);x.textAlign='left';x.textBaseline='top';x.fillStyle='#14171A';x.font='800 66px Helvetica,Arial,sans-serif';var lines=wrap(x,T(it.headline,70),W-300).slice(0,2),step=78,yy=y+rowH/2-(lines.length*step)/2+5;lines.forEach(function(line,k){x.fillText(line,M+205,yy+k*step)});y+=rowH+gap});return c}
function previewDataUrl(index,opts){var c=renderIndex(index,opts);return c?c.toDataURL('image/png'):''}

var ACTIVE_PROVIDER=null;
function registerProvider(provider){
  if(!provider||typeof provider.generateImage!=='function')throw new Error('Proveedor inválido: generateImage() es requerido.');
  ACTIVE_PROVIDER=provider;return true;
}
function getProvider(){return ACTIVE_PROVIDER}
// opts.quality ('draft' | 'pro') es opcional y llega hasta el proveedor, que es
// quien la traduce a tamaño y a costo. Sin ella el proveedor decide, así que
// quien ya llamaba con dos argumentos sigue funcionando igual.
async function generateAsset(asset,sourceImages,opts){
  asset=O(asset)?asset:{};
  if(asset.status!=='ready')throw new Error('El asset no está listo para generación.');
  if(asset.mode!=='image_generation')throw new Error('Este asset no usa generación externa.');
  if(!ACTIVE_PROVIDER)throw new Error('No hay proveedor de imágenes configurado.');
  return ACTIVE_PROVIDER.generateImage({prompt:asset.prompt,negativePrompt:asset.negativePrompt,sourceImages:A(sourceImages),width:2000,height:2000,mode:asset.type,preserveProduct:true,quality:O(opts)?opts.quality:undefined});
}

g.SophieCreativeGenerator={version:'2.1',modes:MODE,build:build,normalize:normalize,validate:validate,score:score,manifest:manifest,renderIndex:renderIndex,previewDataUrl:previewDataUrl,canvasAvailable:canvasAvailable,registerProvider:registerProvider,getProvider:getProvider,generateAsset:generateAsset};
})(typeof window!=='undefined'?window:this);
