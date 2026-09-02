(()=>{
'use strict';
const SRC='/awenture-logo.png';
function mark(button,compact=false){if(!button||button.dataset.awBrand==='1')return;button.dataset.awBrand='1';button.classList.add('aw-brand-control');const text=(button.textContent||'AWenture').trim()||'AWenture';button.innerHTML=`<img class="aw-brand-logo${compact?' compact':''}" src="${SRC}" alt=""><span class="aw-brand-word">${text}</span>`;button.setAttribute('aria-label',text)}
function sync(){document.querySelectorAll('.brand').forEach(x=>mark(x,false));document.querySelectorAll('.test-home').forEach(x=>mark(x,true));document.querySelectorAll('.testbrand').forEach(x=>{if(x.querySelector('.aw-brand-logo'))return;const b=x.querySelector('button');if(b)mark(b,true);else{x.insertAdjacentHTML('afterbegin',`<img class="aw-brand-logo compact aw-brand-static" src="${SRC}" alt="AWenture">`)}})}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});sync();
window.__AW_BRAND={asset:SRC,version:'aw-brand-1'};
})();