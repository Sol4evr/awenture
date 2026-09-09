import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlPath=path.join(dist,'index.html');
const cssPath=path.join(dist,'formal-tests.css');
if(!fs.existsSync(htmlPath))throw new Error('v6.18.2 UX cleanup requires built index.html');
let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('/formal-tests.js'))throw new Error('formal tests runtime missing before Year 2 accordion patch');
const scriptTag='<script defer src="/y2-test-accordion.js?v=61822"></script>';
if(!html.includes('/y2-test-accordion.js'))html=html.replace('</head>',scriptTag+'</head>');
fs.writeFileSync(htmlPath,html);
const js=`(()=>{'use strict';
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
function cleanFooter(){for(const el of qsa('footer,.footer,[class*=footer]')){if(!/ICAS Grade 2/i.test(el.textContent||''))continue;for(const n of [...el.childNodes]){if(n.nodeType===3)n.nodeValue=(n.nodeValue||'').replace(/\\s*[·|•-]?\\s*ICAS Grade 2\\s*[·|•-]?\\s*/gi,' ')}for(const n of qsa('*',el)){if(n.children.length===0&&/ICAS Grade 2/i.test(n.textContent||'')){n.textContent=(n.textContent||'').replace(/ICAS Grade 2/gi,'').replace(/^\\s*[·|•-]\\s*|\\s*[·|•-]\\s*$/g,'').trim();if(!n.textContent)n.hidden=true}}}}
function prepare(){cleanFooter();const grid=document.querySelector('.aw-historical-grid,.grid[data-aw-historical="1"]');if(!grid)return;for(const section of qsa('.aw-form-subject',grid)){const head=section.querySelector('.aw-form-heading'),body=section.querySelector('.aw-form-choices');if(!head||!body||head.dataset.awAccordion==='1')continue;head.dataset.awAccordion='1';head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded','false');head.setAttribute('aria-controls','aw-y2-'+Math.random().toString(36).slice(2));body.id=head.getAttribute('aria-controls');body.hidden=true;head.insertAdjacentHTML('beforeend','<span class="aw-test-chevron" aria-hidden="true">⌄</span>')}}
function toggle(head){const body=document.getElementById(head.getAttribute('aria-controls'));if(!body)return;const open=head.getAttribute('aria-expanded')==='true';head.setAttribute('aria-expanded',String(!open));body.hidden=open}
document.addEventListener('click',e=>{const h=e.target.closest('.aw-form-heading[data-aw-accordion="1"]');if(h){e.preventDefault();toggle(h);return}if(e.target.closest('[data-a="tests"],[data-a="home"]'))setTimeout(prepare,0)});
document.addEventListener('keydown',e=>{const h=e.target.closest?.('.aw-form-heading[data-aw-accordion="1"]');if(h&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggle(h)}});
window.addEventListener('awenture:stage-change',()=>setTimeout(prepare,0));
window.addEventListener('awenture:progression-ready',()=>setTimeout(prepare,0));
for(const d of [0,50,140,300,650])setTimeout(prepare,d);
})();\n`;
fs.writeFileSync(path.join(dist,'y2-test-accordion.js'),js);
fs.appendFileSync(cssPath,'\n.aw-form-heading[data-aw-accordion="1"]{cursor:pointer;align-items:center;border-radius:12px;padding:10px 8px;margin:-4px -8px;transition:background .15s ease}.aw-form-heading[data-aw-accordion="1"]:hover{background:rgba(15,23,42,.035)}.aw-form-heading[data-aw-accordion="1"]:focus-visible{outline:2px solid currentColor;outline-offset:2px}.aw-test-chevron{margin-left:auto;font-size:18px;line-height:1;transition:transform .15s ease}.aw-form-heading[aria-expanded="true"] .aw-test-chevron{transform:rotate(180deg)}\n');
console.log(JSON.stringify({release:'6.18.2',ux:'Y2_ACCORDION_AND_FOOTER_CLEANUP'}));
