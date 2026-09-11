/* SOPHIE · CRÉDITOS VISUALES v1.0 — cliente wallet */
(function(g){
'use strict';if(typeof document==='undefined'||!g.fetch)return;
var API='https://sophie.crezcamosonline.com/api/creditos',PENDING='sophie_creditos_refunds_pending_v1';
function session(){try{var m=document.cookie.match(/(?:^|; )crz_sesion=([^;]*)/);if(m){var s=JSON.parse(decodeURIComponent(m[1]));if(s&&s.email&&s.token)return s}}catch(e){}try{var l=JSON.parse(localStorage.getItem('crezcamos_sso')||'null');if(l&&l.email&&l.token)return l}catch(e){}return null}
async function post(payload){var s=session();if(!s)return{ok:false,error:'sin_sesion'};var r;try{r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({email:s.email,token:s.token},payload||{}))})}catch(e){return{ok:false,error:'red'}}var d=null;try{d=await r.json()}catch(e){}if(!(r.ok&&d&&d.ok))return Object.assign({ok:false,error:d&&d.error||('http_'+r.status),status:r.status},d||{});return d}
function op(prefix,exp){var rand='';try{rand=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)}catch(e){rand=Math.random().toString(36).slice(2)+Date.now().toString(36)}return String(prefix||'op')+':'+String(exp||'global').replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,60)+':'+rand}
async function balance(){var d=await post({action:'balance'});if(d.ok)event('balance',d.wallet);return d}
async function estimate(keys){return post({action:'estimate',costKeys:Array.isArray(keys)?keys:[keys]})}
async function consume(costKey,opts){opts=opts||{};var id=opts.operationId||op(costKey,opts.expedienteId);var d=await post({action:'consume',costKey:costKey,operationId:id,expedienteId:opts.expedienteId||''});if(d.ok)event('spent',d.wallet,{costKey:costKey,operationId:id,credits:d.operation&&d.operation.credits});return Object.assign({operationId:id},d)}
function readPending(){try{return JSON.parse(localStorage.getItem(PENDING)||'[]')||[]}catch(e){return[]}}
function writePending(v){try{localStorage.setItem(PENDING,JSON.stringify((v||[]).slice(-20)))}catch(e){}}
async function refund(operationId,reason){var d=await post({action:'refund',operationId:operationId,reason:reason||'technical_error'});if(d.ok){event('refund',d.wallet,{operationId:operationId});var q=readPending().filter(function(x){return x.operationId!==operationId});writePending(q)}return d}
async function refundSafe(operationId,reason){var d=await refund(operationId,reason);if(!d.ok){var q=readPending();if(!q.some(function(x){return x.operationId===operationId}))q.push({operationId:operationId,reason:reason||'technical_error',at:new Date().toISOString()});writePending(q)}return d}
async function flushRefunds(){var q=readPending();for(var i=0;i<q.length;i++){var d=await refund(q[i].operationId,q[i].reason);if(!d.ok)break}}
async function checkout(pack){var d=await post({action:'checkout_pack',pack:pack});if(d.ok&&d.url)location.href=d.url;return d}
async function claim(sessionId){var d=await post({action:'claim_checkout',sessionId:sessionId});if(d.ok)event('purchase',d.wallet,{credits:d.operation&&d.operation.credits});return d}
function event(type,wallet,detail){try{g.dispatchEvent(new CustomEvent('sophie:creditos',{detail:Object.assign({type:type,wallet:wallet||null},detail||{})}))}catch(e){}}
async function claimFromUrl(){try{var u=new URL(location.href),sid=u.searchParams.get('session_id'),ok=u.searchParams.get('creditos');if(ok==='ok'&&sid){var d=await claim(sid);if(d.ok){u.searchParams.delete('session_id');u.searchParams.delete('creditos');history.replaceState({},'',u.pathname+(u.search?u.search:'')+u.hash)}return d}}catch(e){}return null}
setTimeout(function(){flushRefunds();claimFromUrl()},50);
g.SophieCreditos={version:'1.0',balance:balance,estimate:estimate,consume:consume,refund:refund,refundSafe:refundSafe,flushRefunds:flushRefunds,checkout:checkout,claim:claim,session:session,operationId:op};
})(typeof window!=='undefined'?window:this);
