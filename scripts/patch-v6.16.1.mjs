import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const htmlFile=path.join(root,'dist/index.html');
let html=fs.readFileSync(htmlFile,'utf8').replaceAll('6.16.0','6.16.1').replaceAll('61600','61610');
fs.writeFileSync(htmlFile,html);

const formalFile=path.join(root,'dist/formal-tests.js');
let formal=fs.readFileSync(formalFile,'utf8');
const gridMarker="grid.innerHTML=SUBJECTS.map(subject=>{const c=cfg(subject),papers=papersFor(subject);return `<section class=\"aw-form-subject\"><div class=\"aw-form-heading\"><b>${subject}</b><span>${c.questions} questions · ${c.minutes} min · ${papers.length} papers</span></div><div class=\"aw-form-choices\">${papers.map(p=>`<button class=\"tile aw-form-tile aw-year-tile\" data-aw-original-subject=\"${esc(subject)}\" data-aw-original-year=\"${p.year}\"><b>${p.year} paper</b><span>${p.scoring==='verified'?'Verified auto-marking':'Source-paper review'}</span></button>`).join('')}</div></section>`}).join('');";
if(!formal.includes(gridMarker))throw new Error('formal test grid marker not found');
formal=formal.replace(gridMarker,gridMarker+`\n  grid.insertAdjacentHTML('beforeend',\`<section class="aw-form-subject aw-spelling-subject"><div class="aw-form-heading"><b>Spelling</b><span>Audio practice · 1 historical paper</span></div><div class="aw-form-choices"><button class="tile aw-form-tile aw-year-tile" data-aw-spelling-paper="2016"><b>2016 paper</b><span>Authorised source · asset restore pending</span></button></div></section>\`);`);
const clickMarker="document.addEventListener('click',e=>{const year=e.target.closest('[data-aw-original-year]');";
if(!formal.includes(clickMarker))throw new Error('formal click marker not found');
formal=formal.replace(clickMarker,"document.addEventListener('click',e=>{const spelling=e.target.closest('[data-aw-spelling-paper]');if(spelling){e.preventDefault();e.stopPropagation();overlay(`<div class=\"aw-exam-dialog\"><button class=\"aw-exam-close\" data-aw-exam-close aria-label=\"Close\">×</button><div class=\"ey\">Historical ICAS paper</div><h1>2016 Spelling</h1><p>The authorised Year 2 source is registered in AWenture, but the original PDF binary is not yet bundled in the production repository. It is deliberately not reconstructed or substituted. Generated audio spelling remains available in Daily Practice.</p><button class=\"primary wide\" data-aw-exam-close>Back</button></div>`,'aw-instruction-overlay');return}const year=e.target.closest('[data-aw-original-year]');");
fs.writeFileSync(formalFile,formal);

const cssFile=path.join(root,'dist/home-insights.css');
let css=fs.readFileSync(cssFile,'utf8');
css+=`\n/* v6.16.1: preserve compact rows while allowing long subskill names to roll fully into view */\n.aw-spectrum-copy b.aw-roll-label{position:relative;display:block;max-width:100%;overflow:hidden;text-overflow:clip;white-space:nowrap}\n.aw-spectrum-copy b.aw-roll-label>span{display:inline-block;padding-right:24px;will-change:transform;animation:aw-subskill-roll var(--aw-roll-duration,8s) ease-in-out infinite alternate}\n@keyframes aw-subskill-roll{0%,18%{transform:translateX(0)}82%,100%{transform:translateX(var(--aw-roll-distance,0px))}}\n@media(prefers-reduced-motion:reduce){.aw-spectrum-copy b.aw-roll-label>span{animation:none;white-space:normal;overflow-wrap:anywhere}.aw-spectrum-copy b.aw-roll-label{white-space:normal}}\n`;
fs.writeFileSync(cssFile,css);

const insightsFile=path.join(root,'dist/insights.js');
let insights=fs.readFileSync(insightsFile,'utf8');
const syncMarker="let queued=false;function sync(){transformHome();transformParent()}";
if(!insights.includes(syncMarker))throw new Error('insights sync marker not found');
insights=insights.replace(syncMarker,`function enableRollingSubskills(){requestAnimationFrame(()=>{for(const label of document.querySelectorAll('.aw-subskill-spectrum .aw-spectrum-copy b')){if(label.dataset.awRoll==='1')continue;const text=label.textContent||'';label.textContent='';const span=document.createElement('span');span.textContent=text;label.appendChild(span);label.dataset.awRoll='1';const overflow=Math.max(0,span.scrollWidth-label.clientWidth);if(overflow>4){label.classList.add('aw-roll-label');label.style.setProperty('--aw-roll-distance',(-overflow-10)+'px');label.style.setProperty('--aw-roll-duration',Math.max(7,Math.min(14,5+overflow/28))+'s')}}})}\nlet queued=false;function sync(){transformHome();transformParent();enableRollingSubskills()}`);
fs.writeFileSync(insightsFile,insights);
console.log(JSON.stringify({release:'6.16.1',spellingSubjectCard:'VISIBLE',spelling2016SourceState:'REGISTERED_BINARY_PENDING',parentSubskillLabels:'ROLLING_OVERFLOW'}));
