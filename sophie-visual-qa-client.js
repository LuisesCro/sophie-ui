/* Sophie Imágenes v2 — Visual QA Client */
(function(g){
'use strict';if(typeof document==='undefined'||!g.fetch)return;
var API='https://sophie-imagenes.crezcamosonline.com/api/qa',CUENTA_API='https://sophie.crezcamosonline.com/api/cuenta',KEY='sophie_imagenes_clave';
function cookie(){try{var m=document.cookie.match(/(?:^|; )crz_sesion=([^;]*)/);if(!m)return null;var s=JSON.parse(decodeURIComponent(m[1]));return s&&s.email&&s.token?s:null}catch(e){return null}}
async function code(){if(g.SophieImagenesResearch&&g.SophieImagenesResearch.resolverCode)return g.SophieImagenesResearch.resolverCode();try{var l=localStorage.getItem(KEY)||'';if(l)return l}catch(e){}var s=cookie();if(!s)return'';try{var r=await fetch(CUENTA_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'llave',email:s.email,token:s.token})}),d=await r.json();return r.ok&&d&&d.ok&&d.llave?String(d.llave):''}catch(e){return''}}
async function analyze(images,referenceImage,context){var k=await code();if(!k)return{ok:false,error:'sin_acceso'};var r;try{r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'visual_qa',code:k,images:images||[],referenceImage:referenceImage||null,context:context||{}})})}catch(e){return{ok:false,error:'red'}}var d=null;try{d=await r.json()}catch(e){}if(!(r.ok&&d&&d.ok&&d.result))return{ok:false,error:(d&&d.error)||('http_'+r.status),detail:d&&d.detail};return{ok:true,result:d.result}}
g.SophieVisualQAClient={version:'2.0',analyze:analyze,resolverCode:code};
})(typeof window!=='undefined'?window:this);
