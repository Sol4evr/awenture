import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const htmlFile=path.join(root,'dist/index.html');
let html=fs.readFileSync(htmlFile,'utf8').replaceAll('6.16.0','6.16.1').replaceAll('61600','61610');
fs.writeFileSync(htmlFile,html);

const formalFile=path.join(root,'dist/formal-tests.js');
let formal=fs.readFileSync(formalFile,'utf8');

const subjectsMarker="const SUBJECTS=['English','Mathematics','Science'],PROGRESS_KEY='oc-ready-progress-v1';";
if(!formal.includes(subjectsMarker))throw new Error('formal subject marker not found');
formal=formal.replace(subjectsMarker,"const SUBJECTS=['English','Mathematics','Science','Spelling'],PROGRESS_KEY='oc-ready-progress-v1';");

const sectionMarker='<section class="aw-form-subject"><div class="aw-form-heading"><b>${subject}</b><span>${c.questions} questions · ${c.minutes} min · ${papers.length} papers</span></div>';
const sectionReplacement='<section class="aw-form-subject${subject===\'Spelling\'?\' aw-spelling-subject\':\'\'}"><div class="aw-form-heading"><b>${subject}</b><span>${c.questions} questions · ${c.minutes} min · ${papers.length} ${papers.length===1?\'paper\':\'papers\'}</span></div>';
if(!formal.includes(sectionMarker))throw new Error('formal subject-section marker not found');
formal=formal.replace(sectionMarker,sectionReplacement);

const instructionStart='function instruction(p){const c=cfg(p.subject);overlay(`';
if(!formal.includes(instructionStart))throw new Error('formal instruction marker not found');
formal=formal.replace(instructionStart,"function instruction(p){const c=cfg(p.subject),sectionNote=p.subject==='Spelling'?'<p><b>Section B only.</b> This paper contains original Questions 16–30. Section A is excluded because the supplied source does not contain the original listening/dictation delivery material.</p>':'';overlay(`");
const instructionBody='<p>This uses the authorised historical Year 2 paper artwork. Once you start, the timer runs continuously. Use Previous and Next, swipe between pages on iPad, and zoom when needed. Answers and analysis are not available until you submit or time expires.</p>';
if(!formal.includes(instructionBody))throw new Error('formal instruction body marker not found');
formal=formal.replace(instructionBody,'${sectionNote}'+instructionBody);

const responseFn="function responseCell(p,n){const type=responseType(p,n);if(type==='text')return `<label class=\"aw-answer-row aw-answer-text\"><span>${n}</span><input inputmode=\"numeric\" autocomplete=\"off\" data-aw-answer-text=\"${n}\" aria-label=\"Question ${n} answer\"></label>`;return `<div class=\"aw-answer-row\" data-aw-answer-row=\"${n}\"><span>${n}</span><div class=\"aw-answer-options\">${['A','B','C','D'].map(x=>`<button type=\"button\" data-aw-answer-choice=\"${n}\" data-value=\"${x}\" aria-pressed=\"false\">${x}</button>`).join('')}</div>${type==='multi'?'<small>Select all that apply</small>':''}</div>`}";
const responseReplacement="function responseCell(p,n){const type=responseType(p,n),displayN=(p.questionNumberStart||1)+n-1;if(type==='text')return `<label class=\"aw-answer-row aw-answer-text\"><span>${displayN}</span><input inputmode=\"numeric\" autocomplete=\"off\" data-aw-answer-text=\"${n}\" aria-label=\"Question ${displayN} answer\"></label>`;return `<div class=\"aw-answer-row\" data-aw-answer-row=\"${n}\"><span>${displayN}</span><div class=\"aw-answer-options\">${['A','B','C','D'].map(x=>`<button type=\"button\" data-aw-answer-choice=\"${n}\" data-value=\"${x}\" aria-pressed=\"false\">${x}</button>`).join('')}</div>${type==='multi'?'<small>Select all that apply</small>':''}</div>`}";
if(!formal.includes(responseFn))throw new Error('formal response-cell marker not found');
formal=formal.replace(responseFn,responseReplacement);
fs.writeFileSync(formalFile,formal);

const cssFile=path.join(root,'dist/home-insights.css');
let css=fs.readFileSync(cssFile,'utf8');
css+=`\n/* v6.16.1: preserve compact rows while allowing long subskill names to roll fully into view */\n.aw-spectrum-copy b.aw-roll-label{position:relative;display:block;max-width:100%;overflow:hidden;text-overflow:clip;white-space:nowrap}\n.aw-spectrum-copy b.aw-roll-label>span{display:inline-block;padding-right:24px;will-change:transform;animation:aw-subskill-roll var(--aw-roll-duration,8s) ease-in-out infinite alternate}\n@keyframes aw-subskill-roll{0%,18%{transform:translateX(0)}82%,100%{transform:translateX(var(--aw-roll-distance,0px))}}\n@media(prefers-reduced-motion:reduce){.aw-spectrum-copy b.aw-roll-label>span{animation:none;white-space:normal;overflow-wrap:anywhere}.aw-spectrum-copy b.aw-roll-label{white-space:normal}}\n`;
fs.writeFileSync(cssFile,css);

const insightsFile=path.join(root,'dist/insights.js');
let insights=fs.readFileSync(insightsFile,'utf8');
const syncMarker="let queued=false;function sync(){transformHome();transformParent()}";
if(!insights.includes(syncMarker))throw new Error('insights sync marker not found');
insights=insights.replace(syncMarker,`function enableRollingSubskills(){requestAnimationFrame(()=>{for(const label of document.querySelectorAll('.aw-subskill-spectrum .aw-spectrum-copy b')){let span=label.querySelector(':scope>span');if(!span){const text=label.textContent||'';label.textContent='';span=document.createElement('span');span.textContent=text;label.appendChild(span)}label.classList.add('aw-roll-label');label.style.setProperty('--aw-roll-distance','0px');label.style.setProperty('--aw-roll-duration','8s');if(label.clientWidth<=0)continue;const overflow=Math.max(0,span.scrollWidth-label.clientWidth);if(overflow>4){label.style.setProperty('--aw-roll-distance',(-overflow-10)+'px');label.style.setProperty('--aw-roll-duration',Math.max(7,Math.min(14,5+overflow/28))+'s')}}})}\ndocument.addEventListener('toggle',e=>{if(e.target?.matches?.('.aw-subskill-details')&&e.target.open)enableRollingSubskills()},true);window.addEventListener('resize',enableRollingSubskills,{passive:true});\nlet queued=false;function sync(){transformHome();transformParent();enableRollingSubskills()}`);
fs.writeFileSync(insightsFile,insights);
console.log(JSON.stringify({release:'6.16.1',spellingSubject:'HISTORICAL_RUNTIME_ENABLED',spelling2016:{section:'B',questions:'16-30',questionCount:15,minutes:25},parentSubskillLabels:'ROLLING_OVERFLOW'}));
