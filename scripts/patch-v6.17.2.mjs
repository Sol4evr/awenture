import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlPath=path.join(dist,'index.html');
const insightsPath=path.join(dist,'insights.js');
const cssPath=path.join(dist,'home-insights.css');

let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('awenture-release" content="6.17.1"'))throw new Error('v6.17.2 requires a v6.17.1 dist build');
html=html.replace('awenture-release" content="6.17.1"','awenture-release" content="6.17.2"');
html=html.replace("RELEASE='6.17.1'","RELEASE='6.17.2'");
html=html.replaceAll('?v=61710','?v=61720');
fs.writeFileSync(htmlPath,html);

let insights=fs.readFileSync(insightsPath,'utf8');
const oldMakePath="function makePath(api){const m=api.model(),wrap=document.createElement('div');wrap.className='aw-functional-path';wrap.dataset.awLearningPath='1';for(const s of m.config.stages){const on=m.progress.unlocked.includes(s.id),cur=m.progress.current===s.id,b=document.createElement('button');b.type='button';b.className='aw-stage-step'+(on?' unlocked':' locked')+(cur?' current':'');b.disabled=!on;b.dataset.stage=s.id;b.setAttribute('aria-current',cur?'step':'false');b.innerHTML='<span>'+(on?(cur?'●':'✓'):'🔒')+'</span><b>'+s.label+'</b>';if(on)b.addEventListener('click',()=>{api.setCurrent(s.id);renderPath()});wrap.appendChild(b)}return wrap}";
if(!insights.includes(oldMakePath))throw new Error('v6.17.1 button learning-path renderer missing');
const newMakePath=`function makePath(api){const m=api.model(),wrap=document.createElement('div');wrap.className='aw-functional-path';wrap.dataset.awLearningPath='1';const labels={'icas-y2':'ICAS Y2','icas-y3':'ICAS Y3','naplan-y3':'NAPLAN Y3','icas-y4':'ICAS Y4','oc-prep':'OC'};for(const [i,s] of m.config.stages.entries()){const on=m.progress.unlocked.includes(s.id),cur=m.progress.current===s.id,b=document.createElement('button'),short=labels[s.id]||s.label;b.type='button';b.className='aw-path-step aw-stage-step'+(on?' unlocked':' locked')+(cur?' active current':'');b.disabled=!on;b.dataset.stage=s.id;b.setAttribute('aria-current',cur?'step':'false');b.setAttribute('aria-label',s.label+(cur?' current stage':on?' unlocked':' locked'));b.innerHTML='<span class="aw-path-dot" aria-hidden="true">'+(on?(cur?'●':'✓'):'🔒')+'</span><span class="aw-path-label" aria-hidden="true">'+short+'</span><span class="aw-path-full-label">'+s.label+'</span>'+(i<m.config.stages.length-1?'<span class="aw-path-rail" aria-hidden="true"></span>':'');if(on)b.addEventListener('click',()=>{api.setCurrent(s.id);renderPath()});wrap.appendChild(b)}return wrap}`;
insights=insights.replace(oldMakePath,newMakePath);
fs.writeFileSync(insightsPath,insights);

let css=fs.readFileSync(cssPath,'utf8');
const oldCss='.aw-functional-path{display:flex;gap:10px;overflow-x:auto;padding:4px 0 10px;scroll-snap-type:x proximity}.aw-stage-step{min-width:150px;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:#fff;scroll-snap-align:start}.aw-stage-step.locked{opacity:.48}.aw-stage-step.current{box-shadow:0 0 0 2px currentColor inset}.aw-stage-step b{white-space:nowrap}@media (max-width:720px){.aw-stage-step{min-width:138px;padding:10px 12px}}';
if(!css.includes(oldCss))throw new Error('v6.17.0 button learning-path CSS missing');
const newCss=`.aw-functional-path{display:flex;align-items:flex-start;gap:0;overflow-x:auto;padding:8px 4px 12px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}.aw-functional-path .aw-path-step{position:relative;flex:1 0 112px;min-width:112px;display:flex;flex-direction:column;align-items:center;gap:7px;padding:0 8px;border:0;background:transparent;color:inherit;overflow:visible;scroll-snap-align:center}.aw-functional-path .aw-path-dot{position:relative;z-index:2;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid #c9d1df;font-size:15px;line-height:1}.aw-functional-path .aw-path-step.unlocked .aw-path-dot{border-color:var(--primary);color:var(--primary);background:#eef2ff}.aw-functional-path .aw-path-step.current .aw-path-dot{background:var(--primary);color:#fff;border-color:var(--primary)}.aw-functional-path .aw-path-step.locked{opacity:.58}.aw-functional-path .aw-path-label{max-width:108px;text-align:center;font-size:12px;font-weight:800;line-height:1.2;white-space:normal}.aw-functional-path .aw-path-full-label{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.aw-functional-path .aw-path-rail{position:absolute;z-index:1;top:16px;left:calc(50% + 17px);width:calc(100% - 34px);height:2px;background:#d8dee8}.aw-functional-path .aw-path-step.unlocked .aw-path-rail{background:linear-gradient(90deg,var(--primary),#d8dee8)}.aw-functional-path .aw-path-step:enabled{cursor:pointer}.aw-functional-path .aw-path-step:enabled:focus-visible .aw-path-dot{outline:3px solid rgba(49,88,212,.25);outline-offset:3px}@media(max-width:620px){.aw-functional-path .aw-path-step{flex-basis:102px;min-width:102px;padding:0 5px}.aw-functional-path .aw-path-label{max-width:98px;font-size:11px}}`;
css=css.replace(oldCss,newCss);
fs.writeFileSync(cssPath,css);

console.log(JSON.stringify({release:'6.17.2',feature:'learning-path-line-locks',visual:'horizontal-line-with-locks',progression:'preserved'}));
