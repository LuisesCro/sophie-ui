/* ============================================================
   SOPHIE · IMÁGENES v2 — Research Client
   Une Contexto (Fase 1) + Strategy Engine (Fase 2).
   ============================================================ */
(function (global) {
  'use strict';
  if (typeof document === 'undefined' || !global.fetch) return;

  var API = 'https://sophie-imagenes.crezcamosonline.com/api/strategy';
  var KEY_CLAVE = 'sophie_imagenes_clave';

  function esObjeto(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }
  function lista(v,max){ var a=Array.isArray(v)?v:[]; return max==null?a:a.slice(0,max); }
  function code(){ try{return localStorage.getItem(KEY_CLAVE)||'';}catch(e){return '';} }

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

  async function analizar(extra){
    var base=await esperarContexto();
    if(!base) return {ok:false,error:'sin_contexto'};
    if(!global.SophieImageStrategy) return {ok:false,error:'motor_no_cargado'};

    var llave=code();
    if(!llave && global.SophieImagenesContext){
      try{await global.SophieImagenesContext.refrescar(); llave=code();}catch(e){}
    }
    if(!llave) return {ok:false,error:'sin_acceso'};

    var input=construirInput(base,extra);
    var r;
    try{
      r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'research',code:llave,context:input})});
    }catch(e){return {ok:false,error:'red'};}
    var d=null; try{d=await r.json();}catch(e){}
    if(!(r.ok&&d&&d.ok&&d.result)) return {ok:false,error:(d&&d.error)||('http_'+r.status),detail:d&&d.detail};

    var normal=global.SophieImageStrategy.normalizarResearch(d.result);
    normal.meta.generatedAt=new Date().toISOString();

    if(global.SophieImagenesContext && global.SophieImagenesContext.guardar){
      var g=await global.SophieImagenesContext.guardar({
        status:'research_ready',
        sources:{
          competitors:input.competitors.length>0,
          reviews:input.reviewClusters.length>0,
          keywords:!!(input.keywordPrincipal||input.keywords.length)
        },
        research:normal.research,
        angles:normal.angles,
        recommendedAngles:normal.recommendedAngles,
        researchMeta:normal.meta
      });
      if(!g||!g.ok) return {ok:false,error:'persistencia',research:normal};
    }

    try{global.dispatchEvent(new CustomEvent('sophie:imagenes-research',{detail:normal}));}catch(e){}
    return {ok:true,research:normal};
  }

  global.SophieImagenesResearch={
    version:'2.0-phase2',
    analizar:analizar,
    construirInput:construirInput
  };
})(typeof window!=='undefined'?window:this);
