import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlPath=path.join(dist,'index.html');
const catalogPath=path.join(dist,'stage-papers','catalog.json');
if(!fs.existsSync(catalogPath))throw new Error('v6.18.0 requires stage-paper catalog build');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));

let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('awenture-release" content="6.17.2"'))throw new Error('v6.18.0 requires a v6.17.2 dist build');
html=html.replace('awenture-release" content="6.17.2"','awenture-release" content="6.18.0"');
html=html.replace("RELEASE='6.17.2'","RELEASE='6.18.0'");
html=html.replaceAll('?v=61720','?v=61800');
const head='</head>';
if(!html.includes(head))throw new Error('Missing head close marker');
html=html.replace(head,'<script defer src="/stage-papers.js?v=61800"></script>'+head);
fs.writeFileSync(htmlPath,html);

const js=`(()=>{'use strict';
const STAGE_LABELS={'icas-y2':'ICAS Year 2','icas-y3':'ICAS Year 3','naplan-y3':'NAPLAN Year 3','icas-y4':'ICAS Year 4','oc-prep':'Opportunity Class'};
let catalog=null,lastStage=null,lastCard=null,raf=0;
const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function currentStage(){try{return window.AW_PROGRESSION?.model()?.progress?.current||'icas-y2'}catch(_){return'icas-y2'}}
function subjectTestsCard(){const h=qsa('h1').find(x=>(x.textContent||'').trim()==='Subject tests');return h?.closest('.card')||null}
function baseGrid(card){return card?qs('.grid',card):null}
function groupBySubject(papers){const m=new Map();for(const p of papers){if(!m.has(p.subject))m.set(p.subject,[]);m.get(p.subject).push(p)}return [...m.entries()]}
function syncTestTile(stage){const tile=qs('button[data-a="tests"]');if(!tile)return;const b=qs('b',tile),s=qs('span',tile),label=STAGE_LABELS[stage]||stage;if(b)b.textContent='🏁 '+label+' tests';if(s)s.textContent=stage==='icas-y2'?'Full-length subject papers':'Grade-relevant historical papers';tile.dataset.learningStage=stage}
function closeViewer(){qs('[data-aw-stage-paper-overlay]')?.remove();document.body.classList.remove('aw-stage-paper-open')}
function openViewer(p){closeViewer();const el=document.createElement('div');el.className='aw-stage-paper-overlay';el.dataset.awStagePaperOverlay='1';el.innerHTML='<div class="aw-stage-paper-shell"><header><div><b>'+esc(p.title)+'</b><span>'+esc(STAGE_LABELS[p.stage]||p.stage)+' · '+esc(p.provenance)+' · source review</span></div><a href="'+esc(p.assetPath)+'" target="_blank" rel="noopener">Open full PDF</a><button type="button" data-aw-stage-paper-close aria-label="Close">×</button></header><iframe loading="lazy" title="'+esc(p.title)+' historical paper" src="'+esc(p.assetPath)+'#toolbar=1&navpanes=0"></iframe><footer><span>This source-safe paper is available for review. Auto-marking and progression credit stay off until its answer key and timing are verified.</span><button type="button" data-aw-stage-paper-reviewed>Mark reviewed</button></footer></div>';document.body.appendChild(el);document.body.classList.add('aw-stage-paper-open');el.querySelector('[data-aw-stage-paper-reviewed]')?.addEventListener('click',()=>{let P={};try{P=JSON.parse(localStorage.getItem('oc-ready-progress-v1')||'{}')||{}}catch(_){P={}}P.attempts=Array.isArray(P.attempts)?P.attempts:[];P.attempts.push({date:new Date().toISOString(),type:'historical-review',stage:p.stage,subject:p.subject,sourceYear:p.year||null,sourcePath:p.sourcePath,verified:false,score:null});try{localStorage.setItem('oc-ready-progress-v1',JSON.stringify(P))}catch(_){}const btn=el.querySelector('[data-aw-stage-paper-reviewed]');if(btn){btn.textContent='Reviewed ✓';btn.disabled=true}})}
function render(stageOverride,force=false){if(!catalog)return;const stage=stageOverride||currentStage();syncTestTile(stage);const card=subjectTestsCard();if(!card)return;const existing=qs('.aw-stage-library',card);if(!force&&lastStage===stage&&lastCard===card&&((stage==='icas-y2'&&!existing)||(stage!=='icas-y2'&&existing)))return;lastStage=stage;lastCard=card;if(existing)existing.remove();const grid=baseGrid(card);if(grid)grid.hidden=stage!=='icas-y2';if(stage==='icas-y2')return;const data=catalog.stages?.[stage];if(!data)return;const papers=data.papers||[],groups=groupBySubject(papers),box=document.createElement('section');box.className='aw-stage-library';box.dataset.stage=stage;box.innerHTML='<div class="aw-stage-library-head"><div><span class="ey">Learning Path papers</span><h2>'+esc(data.label||STAGE_LABELS[stage]||stage)+'</h2></div><span>'+papers.length+' available · '+Number(data.pending||0)+' awaiting validation</span></div>'+(groups.length?groups.map(([subject,items])=>'<section class="aw-stage-subject"><div class="aw-stage-subject-head"><b>'+esc(subject)+'</b><span>'+items.length+' paper'+(items.length===1?'':'s')+'</span></div><div class="aw-stage-paper-grid">'+items.map(p=>'<button type="button" class="tile aw-stage-paper-tile" data-aw-stage-paper="'+esc(p.id)+'"><b>'+(p.year?esc(p.year)+' ':'')+esc(subject)+'</b><span>'+esc(p.provenance)+' · '+esc(p.pageCount)+' pages</span><small>Source review</small></button>').join('')+'</div></section>').join(''):'<div class="aw-stage-empty"><b>No source-safe papers activated yet.</b><span>The uploaded corpus is linked to this stage, but these files still need question/answer page validation before learner use.</span></div>');card.appendChild(box)}
function schedule(stage,force=false){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;render(stage,force)})}
const paperIndex=new Map();
fetch('/stage-papers/catalog.json?v=61800',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('catalog '+r.status);return r.json()}).then(x=>{catalog=x;for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[])paperIndex.set(p.id,p);schedule(null,true)}).catch(()=>{});
document.addEventListener('click',e=>{const close=e.target.closest('[data-aw-stage-paper-close]');if(close){closeViewer();return}const b=e.target.closest('[data-aw-stage-paper]');if(b&&catalog){const p=paperIndex.get(b.dataset.awStagePaper);if(p)openViewer(p);return}if(e.target.closest('[data-a="tests"],[data-a="home"]'))setTimeout(()=>schedule(null,true),0)});
window.addEventListener('awenture:stage-change',e=>schedule(e.detail?.stage||null,true));
window.addEventListener('awenture:progression-ready',e=>schedule(e.detail?.progress?.current||null,true));
for(const delay of [0,80,180,350,700])setTimeout(()=>schedule(null,false),delay);
})();\n`;
fs.writeFileSync(path.join(dist,'stage-papers.js'),js);

const cssPath=path.join(dist,'formal-tests.css');
fs.appendFileSync(cssPath,`\n.aw-stage-library{margin-top:16px}.aw-stage-library-head,.aw-stage-subject-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.aw-stage-library-head h2{margin:2px 0 0}.aw-stage-library-head>span,.aw-stage-subject-head>span{font-size:12px;color:#667085}.aw-stage-subject{margin-top:18px}.aw-stage-paper-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:8px}.aw-stage-paper-tile{text-align:left}.aw-stage-paper-tile small{display:block;margin-top:5px;color:#667085}.aw-stage-empty{display:grid;gap:5px;padding:18px;border:1px dashed #cdd5df;border-radius:14px;margin-top:12px}.aw-stage-paper-overlay{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.72);padding:16px}.aw-stage-paper-shell{width:min(1180px,100%);height:calc(100dvh - 32px);margin:auto;background:#fff;border-radius:18px;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto}.aw-stage-paper-shell header{display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid #e5e7eb}.aw-stage-paper-shell header>div{display:grid;flex:1}.aw-stage-paper-shell header span{font-size:12px;color:#667085}.aw-stage-paper-shell header a{font-weight:750}.aw-stage-paper-shell header button{border:0;background:transparent;font-size:28px}.aw-stage-paper-shell iframe{width:100%;height:100%;border:0;background:#f2f4f7}.aw-stage-paper-shell footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;border-top:1px solid #e5e7eb;font-size:12px;color:#475467}.aw-stage-paper-shell footer button{white-space:nowrap}.aw-stage-paper-open{overflow:hidden}@media(max-width:700px){.aw-stage-library-head,.aw-stage-subject-head{align-items:flex-start;flex-direction:column;gap:4px}.aw-stage-paper-overlay{padding:0}.aw-stage-paper-shell{height:100dvh;border-radius:0}.aw-stage-paper-shell header{gap:8px;padding:10px}.aw-stage-paper-shell header a{display:none}.aw-stage-paper-shell footer{align-items:flex-start;flex-direction:column}.aw-stage-paper-shell footer button{width:100%}}\n`);
console.log(JSON.stringify({release:'6.18.0',feature:'stage-linked-historical-paper-library',runtime:'lite-event-driven',activated:catalog.summary.activated,pending:catalog.summary.pending,stages:Object.keys(catalog.stages)}));
