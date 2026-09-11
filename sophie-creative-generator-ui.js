/* ============================================================
   SOPHIE · CREATIVE GENERATOR v2.0 — UI
   Requiere Creative Briefs aprobados.
   Prepara prompts finales, readiness y preview Canvas del Image Index.
   ============================================================ */
(function(g){
'use strict';if(typeof document==='undefined')return;
var S={pack:null,busy:false,preview:null,generadas:{}};
function O(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function A(v){return Array.isArray(v)?v:[]}
function T(v,n){var s=String(v==null?'':v).replace(/\s+/g,' ').trim();return n?s.slice(0,n):s}
function E(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]})}
function exp(){try{return g.SophieImagenesContext&&g.SophieImagenesContext.getExpediente?g.SophieImagenesContext.getExpediente():null}catch(e){return null}}
function base(){try{return g.SophieImagenesContext&&g.SophieImagenesContext.get?g.SophieImagenesContext.get():{}}catch(e){return{}}}
function img(){var e=exp();return e&&O(e.imagenes)?e.imagenes:{}}
function ready(){var i=img();return !!(i.creativeBriefs&&i.creativeBriefs.status==='approved')||!!i.briefsApprovedAt}
function approved(){var i=img();return !!(i.creativeProduction&&i.creativeProduction.status==='approved')}
function first(o,keys){for(var i=0;i<keys.length;i++){var v=o&&o[keys[i]];if(v!==undefined&&v!==null&&v!=='')return v}return''}
function context(){var e=exp()||{},b=base()||{},i=img(),truth={};var map={materiales:['materiales','materials'],dimensiones:['dimensiones','dimensions'],compatibilidad:['compatibilidad','compatibility'],comparacion:['comparacion','comparison'],certificaciones:['certificaciones','certifications'],garantia:['garantia','warranty']};Object.keys(map).forEach(function(k){var v=first(e,map[k]);if(v!=='')truth[k]=v});var photos=[];['productPhotos','fotosProducto','imagenesProducto','sourceImages','imagenesFuente'].forEach(function(k){if(A(e[k]).length)photos=photos.concat(e[k])});return{producto:b.producto||e.producto||'',marketplace:b.marketplace||e.marketplace||'',categoria:b.categoria||e.categoria||'',imageIndex:i.imageIndex||null,productTruth:truth,productPhotos:photos,hasProductPhotos:photos.length>0}}
function ensure(){var i=img();if(!g.SophieCreativeGenerator||!i.creativeBriefs)return false;S.pack=i.creativeProduction&&A(i.creativeProduction.items).length?g.SophieCreativeGenerator.normalize(i.creativeProduction):g.SophieCreativeGenerator.build(i.creativeBriefs,context());return!!S.pack}
function css(){if(document.getElementById('scg-style'))return;var s=document.createElement('style');s.id='scg-style';s.textContent='#scg-launch{flex:none;background:#fff;border-bottom:1px solid #E6E8EC;padding:10px 16px}.scg-in{max-width:820px;margin:0 auto;display:flex;gap:10px;align-items:center}.scg-grow{flex:1}.scg-title{font-size:13px;font-weight:800}.scg-sub{font-size:12px;color:#5F6B7A}.scg-btn{border:0;border-radius:9px;padding:9px 13px;background:#1F5FA5;color:#fff;font:700 12px inherit;cursor:pointer}.scg-btn.sec{background:#fff;color:#1F5FA5;border:1px solid #E6E8EC}.scg-btn:disabled{opacity:.5}.scg-badge{font-size:11px;font-weight:800;padding:4px 8px;border-radius:999px;background:#ECFDF3;color:#1A7A4E;border:1px solid #C6EAD6}#scg-modal{position:fixed;inset:0;z-index:2147483800;background:rgba(12,22,44,.6);display:flex;align-items:center;justify-content:center;padding:20px}.scg-sheet{width:min(1160px,100%);max-height:92vh;overflow:auto;background:#F5F6F8;border-radius:18px}.scg-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #E6E8EC;padding:16px 20px;display:flex;align-items:center;gap:12px}.scg-head h2{margin:0;font-size:18px}.scg-x{margin-left:auto;border:0;background:transparent;font-size:20px;cursor:pointer}.scg-body{padding:18px}.scg-hero{display:grid;grid-template-columns:1fr 250px;gap:12px}.scg-card,.scg-row{background:#fff;border:1px solid #E6E8EC;border-radius:13px;padding:13px}.scg-note{font-size:12.3px;line-height:1.45;color:#5F6B7A}.scg-q{font-size:34px;font-weight:900}.scg-list{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}.scg-top{display:flex;gap:10px;align-items:flex-start}.scg-slot{width:40px;height:40px;border-radius:11px;background:#EAF2FB;color:#1F5FA5;display:flex;align-items:center;justify-content:center;font-weight:900;flex:none}.scg-main{flex:1;min-width:0}.scg-main b{font-size:13.8px}.scg-tag{display:inline-flex;font-size:10.5px;font-weight:700;padding:4px 6px;border-radius:999px;background:#F0F3F7;color:#4D5B6B;margin:4px 5px 0 0}.scg-tag.ok{background:#ECFDF3;color:#1A7A4E}.scg-tag.warn{background:#FFF8EC;color:#8B631A}.scg-tag.bad{background:#FDECEC;color:#A03636}.scg-prompt{width:100%;box-sizing:border-box;min-height:120px;border:1px solid #E6E8EC;border-radius:9px;padding:9px;font:11.5px/1.45 ui-monospace,monospace;background:#F8FAFC;margin-top:10px;resize:vertical}.scg-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.scg-mini{border:1px solid #E6E8EC;background:#fff;border-radius:8px;padding:7px 9px;font:700 11px inherit;cursor:pointer}.scg-missing{font-size:11.7px;color:#8B631A;margin-top:7px}.scg-negative{font-size:11.5px;color:#5F6B7A;margin-top:8px}.scg-preview{margin-top:10px}.scg-preview canvas{width:min(420px,100%);height:auto;border:1px solid #E6E8EC;border-radius:12px;display:block}.scg-foot{display:flex;gap:9px;align-items:center;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}.scg-status{margin-right:auto;font-size:12px;color:#5F6B7A}.scg-warn{background:#FFF8EC;border:1px solid #F3E3C2;color:#8B631A;border-radius:10px;padding:10px;font-size:12px;margin-top:10px}@media(max-width:760px){#scg-modal{padding:0;align-items:flex-end}.scg-sheet{border-radius:18px 18px 0 0;max-height:94vh}.scg-hero{grid-template-columns:1fr}.scg-sub{display:none}}';document.head.appendChild(s)}
function mount(){css();estilosGeneracion();var app=document.getElementById('app');if(!app)return;var old=document.getElementById('scg-launch');if(old)old.remove();var lock=!ready(),el=document.createElement('div');el.id='scg-launch';el.innerHTML='<div class="scg-in"><div class="scg-grow"><div class="scg-title">✨ Producción Creativa</div><div class="scg-sub">Prompts finales, readiness y render seguro del Image Index.</div></div>'+(approved()?'<span class="scg-badge">✓ Producción preparada</span>':'')+'<button class="scg-btn" id="scg-open" '+(lock?'disabled':'')+'>'+(approved()?'Revisar Producción':'Preparar Producción')+'</button></div>';var after=document.getElementById('scb-launch')||document.getElementById('svs-launch');if(after&&after.parentNode===app)app.insertBefore(el,after.nextSibling);else app.insertBefore(el,app.firstChild);var b=el.querySelector('#scg-open');if(!lock)b.onclick=open}
function open(){if(document.getElementById('scg-modal')||!ready()||!ensure())return;var m=document.createElement('div');m.id='scg-modal';m.innerHTML='<div class="scg-sheet"><div class="scg-head"><div><h2>Prompt & Creative Generator</h2><div class="scg-note">Sophie decide qué está listo para producir y qué necesita evidencia adicional.</div></div><button class="scg-x" id="scg-close">✕</button></div><div class="scg-body" id="scg-body"></div></div>';document.body.appendChild(m);m.querySelector('#scg-close').onclick=close;m.onclick=function(e){if(e.target===m)close()};render()}
function close(){var m=document.getElementById('scg-modal');if(m)m.remove();S.preview=null;mount()}
function statusTag(a){var cls=a.status==='ready'?'ok':a.status==='blocked'?'bad':'warn';var label=a.status==='ready'?'Listo':a.status==='blocked'?'Bloqueado':'Falta input';return'<span class="scg-tag '+cls+'">'+label+'</span>'}
function row(a){return'<div class="scg-row"><div class="scg-top"><div class="scg-slot">'+E(a.slot)+'</div><div class="scg-main"><b>'+E(a.type.replace(/_/g,' '))+'</b><div>'+statusTag(a)+'<span class="scg-tag">'+E(a.mode)+'</span><span class="scg-tag">2000×2000</span><span class="scg-tag">preserveProduct</span></div><p class="scg-note">'+E(a.objective||'')+'</p></div></div>'+(a.missingInputs&&a.missingInputs.length?'<div class="scg-missing"><b>Falta:</b> '+a.missingInputs.map(E).join(' · ')+'</div>':'')+'<textarea class="scg-prompt" readonly data-prompt="'+E(a.slot)+'">'+E(a.prompt)+'</textarea><div class="scg-negative"><b>Negative prompt:</b> '+E(a.negativePrompt)+'</div><div class="scg-actions"><button class="scg-mini" data-copy="'+E(a.slot)+'">Copiar prompt</button>'+(a.type==='IMAGE_INDEX'&&a.canRender?'<button class="scg-mini" data-preview="'+E(a.slot)+'">Previsualizar Index</button>':'')+(a.canGenerate?'<button class="scg-mini" data-generar="'+E(a.slot)+'" data-calidad="draft">Borrador · 1 cr.</button><button class="scg-mini scg-pro" data-generar="'+E(a.slot)+'" data-calidad="pro">Producción · 2 cr.</button>':'')+'</div><div class="scg-preview" id="scg-preview-'+E(a.slot)+'"></div></div>'}
function render(){var body=document.getElementById('scg-body');if(!body||!S.pack)return;var v=g.SophieCreativeGenerator.validate(S.pack),q=S.pack.score||{},w=v.warnings||[],readyCount=S.pack.items.filter(function(x){return x.status==='ready'}).length;body.innerHTML='<div class="scg-hero"><div class="scg-card"><h3>Producción evidence-first</h3><p class="scg-note">'+readyCount+' de '+S.pack.items.length+' assets están listos con los datos actuales. Los demás muestran exactamente qué falta antes de generar.</p><p class="scg-note"><b>Regla dura:</b> preservar geometría, proporciones, color, branding y componentes visibles del producto; nunca completar datos faltantes con imaginación.</p></div><div class="scg-card"><div class="scg-q">'+(q.total||0)+'<small>/100</small></div><h3>Production Score</h3><p class="scg-note">Readiness '+(q.readiness||0)+' · Claim '+(q.claimSafety||0)+' · Trace '+(q.traceability||0)+' · Product '+(q.preserveProduct||0)+'</p></div></div>'+(w.length?'<div class="scg-warn">'+w.map(E).join('<br>')+'</div>':'')+'<div class="scg-list">'+S.pack.items.map(row).join('')+'</div><div class="scg-foot"><span class="scg-status" id="scg-status">Preparar producción no genera imágenes externas automáticamente.</span><button class="scg-btn sec" id="scg-manifest">Descargar manifest JSON</button><button class="scg-btn" id="scg-approve">Aprobar Production Pack</button></div>';bind()}
function bind(){Object.keys(S.generadas).forEach(function(k){pintarGenerada(Number(k))});document.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){var a=S.pack.items[Number(b.dataset.copy)-1];copy(a&&a.prompt,b)}});document.querySelectorAll('[data-preview]').forEach(function(b){b.onclick=function(){preview(Number(b.dataset.preview))}});document.querySelectorAll('[data-generar]').forEach(function(b){b.onclick=function(){confirmar(Number(b.dataset.generar),b.dataset.calidad)}});var man=document.getElementById('scg-manifest');if(man)man.onclick=downloadManifest;var ap=document.getElementById('scg-approve');if(ap)ap.onclick=approve}
function copy(t,b){if(!t)return;function done(){var old=b.textContent;b.textContent='✓ Copiado';setTimeout(function(){b.textContent=old},900)}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done).catch(function(){});else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){}ta.remove()}}
function preview(slot){var i=img(),box=document.getElementById('scg-preview-'+slot);if(!box||!i.imageIndex)return;box.innerHTML='';var c=g.SophieCreativeGenerator.renderIndex(i.imageIndex,{producto:(base()||{}).producto||''});if(!c){box.innerHTML='<div class="scg-missing">No hay suficientes razones aprobadas para renderizar.</div>';return}c.id='scg-index-canvas';box.appendChild(c);var d=document.createElement('button');d.className='scg-mini';d.textContent='Descargar PNG';d.style.marginTop='8px';d.onclick=function(){c.toBlob(function(blob){if(!blob)return;var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sophie-image-index.png';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)},'image/png')};box.appendChild(d)}
/* ---------------- Generación de imagen ----------------
   Cada clic aquí cuesta dinero real: fal.ai cobra por ejecución. Por eso no se
   genera al primer clic —primero se dice qué cuesta y cuánto queda— y por eso
   S.busy bloquea mientras hay una imagen en vuelo: un doble clic serían dos
   cobros. La llave de fal y el descuento de créditos viven en /api/imagen;
   aquí solo se pide y se pinta. */
var CALIDADES={draft:{creditos:1,etiqueta:'Borrador',medida:'1024×1024'},pro:{creditos:2,etiqueta:'Producción',medida:'2000×2000'}};
function cajaDe(slot){return document.getElementById('scg-preview-'+slot)}
function aviso(slot,html){var b=cajaDe(slot);if(b)b.innerHTML=html}
async function confirmar(slot,calidad){
  var c=CALIDADES[calidad];if(!c)return;
  if(S.busy){aviso(slot,'<div class="scg-missing">Espera a que termine la imagen anterior.</div>');return}
  var saldo=null;
  if(g.SophieCreditos&&g.SophieCreditos.estimate){
    try{var e=await g.SophieCreditos.estimate([calidad]);if(e&&e.ok&&e.wallet)saldo=e.wallet.total}catch(err){}
  }
  aviso(slot,'<div class="scg-cost"><b>'+E(c.etiqueta)+' · '+E(c.medida)+'</b><p class="scg-note">Cuesta '+c.creditos+' crédito'+(c.creditos>1?'s':'')+(saldo===null?'.':'. Te quedan '+saldo+'.')+'</p><div class="scg-actions"><button class="scg-mini scg-pro" id="scg-go-'+slot+'">Generar</button><button class="scg-mini" id="scg-no-'+slot+'">Cancelar</button></div></div>');
  var go=document.getElementById('scg-go-'+slot),no=document.getElementById('scg-no-'+slot);
  if(go)go.onclick=function(){generar(slot,calidad)};
  if(no)no.onclick=function(){aviso(slot,'')};
}
async function generar(slot,calidad){
  if(S.busy)return;
  var a=S.pack&&S.pack.items[slot-1];
  if(!a||!a.canGenerate)return;
  S.busy=true;
  aviso(slot,'<div class="scg-cost">Generando la imagen… puede tardar unos segundos.</div>');
  try{
    var r=await g.SophieCreativeGenerator.generateAsset(a,context().productPhotos,{quality:calidad});
    S.generadas[slot]={url:r.url,calidad:calidad};
    pintarGenerada(slot);
    // El saldo cambió: que la barra lo refleje sin recargar la página. Se pide a
    // la UI del wallet, no a SophieCreditos.balance(), porque balance() solo trae
    // el número: quien repinta la barra es su propio refresh().
    if(g.SophieCreditosUI&&g.SophieCreditosUI.refresh)g.SophieCreditosUI.refresh();
  }catch(e){
    pintarFallo(slot,e,calidad);
  }finally{S.busy=false}
}
function pintarGenerada(slot){
  var guardada=S.generadas[slot],b=cajaDe(slot);
  if(!guardada||!b)return;
  b.innerHTML='';
  var im=document.createElement('img');
  im.className='scg-gen';im.alt='Creativo generado para la imagen '+slot;im.src=guardada.url;
  b.appendChild(im);
  var pie=document.createElement('div');pie.className='scg-actions';
  var d=document.createElement('button');d.className='scg-mini scg-pro';d.textContent='Descargar PNG';
  d.onclick=function(){var a2=document.createElement('a');a2.href=guardada.url;a2.download='sophie-imagen-'+slot+'.png';document.body.appendChild(a2);a2.click();setTimeout(function(){a2.remove()},1000)};
  var otra=document.createElement('button');otra.className='scg-mini';otra.textContent='Generar otra';
  otra.onclick=function(){confirmar(slot,guardada.calidad)};
  pie.appendChild(d);pie.appendChild(otra);b.appendChild(pie);
  var nota=document.createElement('p');nota.className='scg-note';
  nota.textContent='Pásala por QA Visual antes de subirla a Amazon.';
  b.appendChild(nota);
}
function pintarFallo(slot,e,calidad){
  var status=e&&e.status,texto,accion;
  if(status===402){
    texto='No te alcanzan los créditos'+(e.available!=null?' (tienes '+e.available+' y hacen falta '+e.needed+')':'')+'.';
    accion='<button class="scg-mini scg-pro" id="scg-cr-'+slot+'">Ver créditos</button>';
  }else if(status===403){
    texto='Los Créditos Visuales necesitan un plan Premium activo.';
    accion='<button class="scg-mini scg-pro" id="scg-cr-'+slot+'">Ver créditos</button>';
  }else{
    // 502 del endpoint ya viene con el crédito devuelto; el mensaje lo dice.
    texto=T(e&&e.message||e,200);
    accion='<button class="scg-mini" id="scg-re-'+slot+'">Reintentar</button>';
  }
  aviso(slot,'<div class="scg-missing"><b>No se pudo generar.</b> '+E(texto)+'</div><div class="scg-actions">'+accion+'</div>');
  var cr=document.getElementById('scg-cr-'+slot);
  if(cr)cr.onclick=function(){if(g.SophieCreditosUI&&g.SophieCreditosUI.open)g.SophieCreditosUI.open()};
  var re=document.getElementById('scg-re-'+slot);
  if(re)re.onclick=function(){confirmar(slot,calidad)};
}
function estilosGeneracion(){
  if(document.getElementById('scg-style-gen'))return;
  var s=document.createElement('style');s.id='scg-style-gen';
  s.textContent='.scg-pro{background:#1F5FA5!important;color:#fff!important;border-color:#1F5FA5!important}'+
    '.scg-cost{background:#FFF8EC;border:1px solid #F3E3C2;border-radius:11px;padding:12px;margin-top:10px;font-size:12.5px;color:#8B631A}'+
    '.scg-cost .scg-note{color:#8B631A;margin:4px 0 9px}'+
    '.scg-cost .scg-actions{margin:0}'+
    '.scg-gen{display:block;width:100%;max-width:420px;height:auto;border-radius:12px;border:1px solid #E6E8EC;margin-top:10px}';
  document.head.appendChild(s);
}
function downloadManifest(){var data=g.SophieCreativeGenerator.manifest(S.pack);if(!data)return;var blob=new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sophie-creative-production.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000)}
async function approve(){var v=g.SophieCreativeGenerator.validate(S.pack),st=document.getElementById('scg-status'),btn=document.getElementById('scg-approve');if(!v.ok){if(st)st.textContent='⚠️ '+v.errors.join(' ');return}if(S.busy)return;S.busy=true;if(btn){btn.disabled=true;btn.textContent='Guardando…'}try{S.pack=v.production;S.pack.status='approved';S.pack.approvedAt=new Date().toISOString();var r=await g.SophieImagenesContext.guardar({status:'stack_approved',creativeProduction:S.pack,productionPreparedAt:S.pack.approvedAt});if(!r||!r.ok)throw new Error('No se pudo guardar');if(st)st.textContent='✓ Production Pack aprobado y guardado.';if(btn)btn.textContent='✓ Aprobado';setTimeout(close,700)}catch(e){if(st)st.textContent='⚠️ '+T(e&&e.message||e,140);if(btn){btn.disabled=false;btn.textContent='Reintentar aprobación'}}finally{S.busy=false}}
g.addEventListener('sophie:imagenes-contexto',mount);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else setTimeout(mount,0);g.SophieCreativeGeneratorUI={version:'2.0',open:open,refresh:mount};
})(typeof window!=='undefined'?window:this);
