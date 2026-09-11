/* ============================================================
   SOPHIE · IMÁGENES v2 — Research Client
   Une Contexto + Strategy Engine + Créditos Visuales.
   ============================================================ */
(function (global) {
  'use strict';
  if (typeof document === 'undefined' || !global.fetch) return;

  var API = 'https://sophie-imagenes.crezcamosonline.com/api/strategy';
  var CUENTA_API = 'https://sophie.crezcamosonline.com/api/cuenta';
  var KEY_CLAVE = 'sophie_imagenes_clave';

  function esObjeto(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
  function lista(v,max){ var a=Array.isArray(v)?v:[]; return max==null?a:a.slice(0,max); }
  function leerCookieSesion(){
    try{
      var m=document.cookie.match(/(?:^|; )crz_sesion=([^;]*)/);
      if(!m)return null;
      var s=JSON.parse(decodeURIComponent(m[1]));
      return s&&s.email&&s.token?s:null;
    }catch(e){return null;}
  }
  function codeLocal(){ try{return localStorage.getItem(KEY_CLAVE)||'';}catch(e){return '';} }

  async function resolverCode(){
    var local=codeLocal();
    if(local)return local;
    var ses=leerCookieSesion();
    if(!ses)return '';
    try{
      var r=await fetch(CUENTA_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'llave',email:ses.email,token:ses.token})});
      var d=null; try{d=await r.json();}catch(e){}
      if(r.ok&&d&&d.ok&&d.llave)return String(d.llave);
    }catch(e){}
    return '';
  }

  async function esperarContexto(){
    if(!global.SophieImagenesContext) return null;
    if(global.SophieImagenesContext.listo()) return global.SophieImagenesContext.get();
    try{return await global.SophieImagenesContext.refrescar();}catch(e){return null;}
  }

  function construirInput(base, extra){
    base=esObjeto(base)?base:{}; extra=esObjeto(extra)?extra:{};
    return {
      expedienteId: base.expedienteId || '',
      producto: base.producto || '',
      asin: base.asin || '',
      marketplace: base.marketplace || '',
      categoria: base.categoria || '',
      keywordPrincipal: base.keywordPrincipal || '',
      listing: base.listing || {},
      senalesProducto: base.senalesProducto || {},
      productTruth: extra.productTruth || {},
      keywords: lista(extra.keywords,120),
      competitors: lista(extra.competitors,10),
      reviewClusters: lista(extra.reviewClusters,60)
    };
  }

  async function cobrar(base){
    if(!global.SophieCreditos)return{ok:true,operationId:null,legacy:true};
    var c=await global.SophieCreditos.consume('research',{expedienteId:base.expedienteId||''});
    if(!c.ok)return{ok:false,error:c.error||'creditos',available:c.available,needed:c.needed,wallet:c.wallet};
    return{ok:true,operationId:c.operationId,wallet:c.wallet};
  }
  async function devolver(op){if(op&&global.SophieCreditos)try{await global.SophieCreditos.refundSafe(op,'technical_error')}catch(e){}}

  async function analizar(extra){
    var base=await esperarContexto();
    if(!base) return {ok:false,error:'sin_contexto'};
    if(!global.SophieImageStrategy) return {ok:false,error:'motor_no_cargado'};

    var llave=await resolverCode();
    if(!llave) return {ok:false,error:'sin_acceso'};

    var input=construirInput(base,extra);
    var credit=await cobrar(base);
    if(!credit.ok)return Object.assign({ok:false,error:'creditos_insuficientes'},credit);

    var r;
    try{
      r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'research',code:llave,context:input})});
    }catch(e){await devolver(credit.operationId);return {ok:false,error:'red'};}
    var d=null; try{d=await r.json();}catch(e){}
    if(!(r.ok&&d&&d.ok&&d.result)){await devolver(credit.operationId);return {ok:false,error:(d&&d.error)||('http_'+r.status),detail:d&&d.detail};}

    var normal;
    try{normal=global.SophieImageStrategy.normalizarResearch(d.result);}catch(e){await devolver(credit.operationId);return{ok:false,error:'normalizacion'};}
    normal.meta.generatedAt=new Date().toISOString();

    if(global.SophieImagenesContext && global.SophieImagenesContext.guardar){
      var save=await global.SophieImagenesContext.guardar({
        status:'research_ready',
        sources:{competitors:input.competitors.length>0,reviews:input.reviewClusters.length>0,keywords:!!(input.keywordPrincipal||input.keywords.length)},
        research:normal.research,
        angles:normal.angles,
        recommendedAngles:normal.recommendedAngles,
        researchMeta:normal.meta
      });
      if(!save||!save.ok){await devolver(credit.operationId);return {ok:false,error:'persistencia',research:normal};}
    }

    try{global.dispatchEvent(new CustomEvent('sophie:imagenes-research',{detail:normal}));}catch(e){}
    return {ok:true,research:normal,creditOperationId:credit.operationId};
  }

  global.SophieImagenesResearch={version:'2.0-phase8-credits',analizar:analizar,construirInput:construirInput,resolverCode:resolverCode};
})(typeof window!=='undefined'?window:this);
