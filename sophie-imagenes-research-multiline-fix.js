/* ============================================================
   SOPHIE · IMÁGENES · Research multiline compatibility fix v2.1
   Preserva saltos de línea de competitors/reviews/keywords guardados
   sin reescribir el Research UI v2 existente.
   ============================================================ */
(function(g){
'use strict';
if(typeof document==='undefined')return;

function O(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function raw(v,n){var s=String(v==null?'':v).replace(/\r\n?/g,'\n').trim();return n?s.slice(0,n):s}
function exp(){try{return g.SophieImagenesContext&&g.SophieImagenesContext.getExpediente?g.SophieImagenesContext.getExpediente():null}catch(e){return null}}
function saved(){var e=exp(),i=e&&O(e.imagenes)?e.imagenes:{},r=O(i.researchInputs)?i.researchInputs:{};return{competitorsText:raw(r.competitorsText,12000),reviewsText:raw(r.reviewsText,30000),keywordsText:raw(r.keywordsText,12000)}}
function setValue(id,value){var el=document.getElementById(id);if(!el||!value)return false;if(el.value===value)return false;el.value=value;return true}
function restore(){var modal=document.getElementById('sir-modal');if(!modal||modal.dataset.sophieMultilineFixed==='1')return false;var s=saved(),changed=false;changed=setValue('sir-comp',s.competitorsText)||changed;changed=setValue('sir-rev',s.reviewsText)||changed;changed=setValue('sir-kw',s.keywordsText)||changed;modal.dataset.sophieMultilineFixed='1';if(changed){var refresh=document.getElementById('sir-refresh');if(refresh&&typeof refresh.click==='function')refresh.click()}return changed}
function later(){setTimeout(restore,0);setTimeout(restore,60)}

document.addEventListener('click',function(e){var t=e&&e.target;if(t&&(t.id==='sir-open'||(t.closest&&t.closest('#sir-open'))))later()},true);
var obs=new MutationObserver(function(m){for(var i=0;i<m.length;i++){if(m[i].addedNodes&&m[i].addedNodes.length){later();break}}});
function start(){if(document.body)obs.observe(document.body,{childList:true,subtree:true});later()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
g.addEventListener('sophie:imagenes-contexto',later);
g.SophieImagenesResearchMultilineFix={version:'2.1',rawText:raw,restore:restore};
})(typeof window!=='undefined'?window:this);
