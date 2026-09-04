import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlPath=path.join(dist,'index.html');
const insightsPath=path.join(dist,'insights.js');

let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('awenture-release" content="6.17.0"'))throw new Error('v6.17.1 requires a v6.17.0 dist build');
html=html.replace('awenture-release" content="6.17.0"','awenture-release" content="6.17.1"');
html=html.replace("RELEASE='6.17.0'","RELEASE='6.17.1'");
html=html.replaceAll('?v=61700','?v=61710');
fs.writeFileSync(htmlPath,html);

let insights=fs.readFileSync(insightsPath,'utf8');
const oldTail="window.addEventListener('awenture:progression-ready',renderPath);window.addEventListener('awenture:stage-change',renderPath);new MutationObserver(()=>{if(!document.querySelector('.aw-functional-path'))renderPath()}).observe(document.documentElement,{subtree:true,childList:true});renderPath();";
if(!insights.includes(oldTail))throw new Error('v6.17.0 learning-path observer marker missing');
const newTail=`function homePathHost(){const homeTitle=[...document.querySelectorAll('h1')].find(x=>(x.textContent||'').includes('Hello Alistair'));if(!homeTitle)return null;const cards=[...document.querySelectorAll('.card')];return cards.find(x=>x.querySelector('.aw-learning-line')&&/Learning\\s*path/i.test(x.textContent||''))||cards.find(x=>{const ey=x.querySelector('.ey');return ey&&/Learning\\s*path/i.test(ey.textContent||'')})||null}\nfunction placePath(){const api=window.AW_PROGRESSION;if(!api)return;const host=homePathHost(),all=[...document.querySelectorAll('.aw-functional-path')];if(!host){all.forEach(x=>x.remove());return}let target=host.querySelector('.aw-functional-path');if(!target){target=all[0]||makePath(api);const legacy=host.querySelector('.aw-learning-line');if(legacy)legacy.replaceWith(target);else host.appendChild(target)}for(const x of all)if(x!==target)x.remove()}\nwindow.addEventListener('awenture:progression-ready',placePath);window.addEventListener('awenture:stage-change',()=>{renderPath();queueMicrotask(placePath)});new MutationObserver(()=>queueMicrotask(placePath)).observe(document.getElementById('app')||document.body,{subtree:true,childList:true});renderPath();placePath();`;
insights=insights.replace(oldTail,newTail);
fs.writeFileSync(insightsPath,insights);

console.log(JSON.stringify({release:'6.17.1',feature:'learning-path-dedupe',home:'single-bottom-path',otherScreens:'no-full-path'}));
