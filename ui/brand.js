(()=>{
'use strict';
const SRC='/awenture-logo-192.png?v=61510';
function mark(button,compact=false){if(!button||button.dataset.awBrand==='1')return;button.dataset.awBrand='1';button.classList.add('aw-brand-control');const label=(button.textContent||'AWenture').trim()||'AWenture';button.innerHTML=`<img class="aw-brand-logo${compact?' compact':''}" src="${SRC}" alt="" width="${compact?28:38}" height="${compact?28:38}" decoding="async">`;button.setAttribute('aria-label',label);button.setAttribute('title','AWenture')}
function sync(){document.querySelectorAll('.brand').forEach(x=>mark(x,false));document.querySelectorAll('.test-home').forEach(x=>mark(x,true));document.querySelectorAll('.testbrand').forEach(x=>{if(x.querySelector('.aw-brand-logo'))return;const b=x.querySelector('button');if(b)mark(b,true);else{x.insertAdjacentHTML('afterbegin',`<img class="aw-brand-logo compact aw-brand-static" src="${SRC}" alt="AWenture" width="28" height="28" decoding="async">`)}})}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
window.__AW_BRAND={asset:SRC,version:'aw-brand-1.2'};
})();