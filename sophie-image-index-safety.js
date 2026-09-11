/* Sophie Image Index v2 — safety compatibility layer */
(function(g){
'use strict';
function T(v,n){var s=String(v==null?'':v).replace(/\s+/g,' ').trim();return n?s.slice(0,n):s}
function safeHeadline(index,product){if(!index)return index;var n=Array.isArray(index.items)?index.items.length:5;var h=T(index.headline,120);if(!h||/\bis the best\b/i.test(h)||/\b#?1\b/i.test(h)||/\bbest seller\b/i.test(h)){index.headline=n+' Reasons You’ll Love '+T(product||'This Product',55)}return index}
function patch(){var I=g.SophieImageIndex;if(!I||I.__sophieSafetyPatched)return false;var build=I.build,normalize=I.normalize;I.build=function(angles,product,opts){return safeHeadline(build.call(I,angles,product,opts),product)};I.normalize=function(index){return safeHeadline(normalize.call(I,index),'This Product')};I.safeHeadline=safeHeadline;I.__sophieSafetyPatched=true;return true}
if(!patch())setTimeout(patch,0);
g.SophieImageIndexSafety={version:'2.0',patch:patch,safeHeadline:safeHeadline};
})(typeof window!=='undefined'?window:this);
