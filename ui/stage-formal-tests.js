(()=>{'use strict';
const PROGRESS_KEY='oc-ready-progress-v1';
const STAGE_LABELS={'icas-y2':'ICAS Year 2','icas-y3':'ICAS Year 3','naplan-y3':'NAPLAN Year 3','icas-y4':'ICAS Year 4','oc-prep':'Opportunity Class'};
const CONDITIONS={
  'icas-y3':{
    English:{minutes:45,questions:45,choices:4,mode:'choice'},
    Mathematics:{minutes:45,questions:40,choices:4,mode:'choice'},
    Science:{minutes:45,questions:30,choices:4,mode:'choice'},
    'Digital Technologies':{minutes:30,questions:30,choices:4,mode:'choice'},
    Spelling:{minutes:40,questions:40,choices:4,mode:'choice'}
  },
  'icas-y4':{
    English:{minutes:45,questions:45,choices:4,mode:'choice'},
    Mathematics:{minutes:45,questions:40,choices:4,mode:'choice'},
    Science:{minutes:45,questions:30,choices:4,mode:'choice'},
    'Digital Technologies':{minutes:30,questions:30,choices:4,mode:'choice'},
    Spelling:{minutes:40,questions:45,choices:4,mode:'choice'}
  },
  'naplan-y3':{
    Reading:{minutes:45,questions:39,choices:4,mode:'mixed'},
    Numeracy:{minutes:45,questions:35,choices:4,mode:'mixed'},
    'Language Conventions':{minutes:45,questions:51,choices:4,mode:'mixed'},
    Writing:{minutes:40,questions:1,choices:0,mode:'writing'}
  },
  'oc-prep':{
    Reading:{minutes:40,questions:33,choices:4,mode:'choice'},
    'Mathematical Reasoning':{minutes:40,questions:35,choices:5,mode:'choice'},
    Mathematics:{minutes:40,questions:35,choices:5,mode:'choice'},
    'Thinking Skills':{minutes:30,questions:30,choices:4,mode:'choice'}
  }
};
const CONDITION_NOTES={
  'icas-y3':'Practice timing follows the current ICAS Level A (Australian Year 3) assessment conditions.',
  'icas-y4':'Practice timing follows the current ICAS Level B (Australian Year 4) assessment conditions.',
  'naplan-y3':'Practice timing follows the Year 3 NAPLAN test duration. Older paper item counts can vary by year; the answer sheet supports both choice and short-response entry.',
  'oc-prep':'Practice timing and answer counts follow the NSW Opportunity Class Placement Test structure.'
};
const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog=null,paperIndex=new Map(),active=null,timer=null,pdfModulePromise=null,renderSerial=0;
function currentStage(){try{return window.AW_PROGRESSION?.model()?.progress?.current||'icas-y2'}catch(_){return'icas-y2'}}
function subjectTestsCard(){const h=qsa('h1').find(x=>(x.textContent||'').trim()==='Subject tests');return h?.closest('.card')||null}
function syncStageIsolation(stage=currentStage()){
  const card=subjectTestsCard();if(!card)return;
  const y2Grid=qs('.aw-historical-grid',card)||qs('.grid[data-aw-historical="1"]',card);
  const y2Note=qs('.aw-form-note',card);
  const later=stage!=='icas-y2';
  if(y2Grid)y2Grid.hidden=later;
  if(y2Note)y2Note.hidden=later;
  card.dataset.awFormalStage=stage;
}
function scheduleIsolation(stage){for(const d of [0,40,120])setTimeout(()=>syncStageIsolation(stage||currentStage()),d)}
function conditionFor(p){return CONDITIONS[p.stage]?.[p.subject]||null}
function closeOverlay(){const el=qs('[data-aw-stage-formal-overlay]');if(el)el.remove();document.body.classList.remove('aw-exam-open');if(timer)clearInterval(timer);timer=null;if(active?.pdfDoc){try{active.pdfDoc.destroy()}catch(_){}}active=null;renderSerial++}
function overlay(html,cls=''){closeOverlay();const el=document.createElement('div');el.className=`aw-exam-overlay ${cls}`;el.dataset.awStageFormalOverlay='1';el.innerHTML=html;document.body.appendChild(el);document.body.classList.add('aw-exam-open');return el}
function timeText(ms){const s=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function remaining(){return Math.max(0,(active?.deadline||0)-Date.now())}
function updateTimer(){if(!active)return;const left=remaining(),el=qs('[data-aw-stage-timer]');if(el){el.textContent=timeText(left);el.classList.toggle('warning',left<=300000&&left>60000);el.classList.toggle('danger',left<=60000)}if(left<=0&&!active.submitted)submit(true)}
function labels(n){return Array.from({length:n},(_,i)=>String.fromCharCode(65+i))}
function responseCell(n,cfg){
  if(cfg.mode==='writing')return `<label class="aw-answer-row aw-answer-text"><span>${n}</span><textarea data-aw-stage-text="${n}" aria-label="Response"></textarea></label>`;
  const opts=labels(cfg.choices||4).map(x=>`<button type="button" data-aw-stage-choice="${n}" data-value="${x}" aria-pressed="false">${x}</button>`).join('');
  const text=cfg.mode==='mixed'?`<input class="aw-stage-short-response" data-aw-stage-text="${n}" aria-label="Question ${n} short response" placeholder="short answer">`:'';
  return `<div class="aw-answer-row" data-aw-stage-answer-row="${n}"><span>${n}</span><div class="aw-answer-options">${opts}</div>${text}</div>`
}
async function pdfjs(){if(!pdfModulePromise)pdfModulePromise=import('/pdf.min.mjs').then(m=>{m.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';return m});return pdfModulePromise}
function viewerStatus(text,error=false){const el=qs('[data-aw-stage-paper-status]');if(el){el.textContent=text;el.classList.toggle('error',error)}}
function syncViewerControls(){if(!active)return;const n=active.page||1,total=active.pageCount||active.paper.pageCount||1;const label=qs('[data-aw-stage-page-label]');if(label)label.textContent=`Page ${n} of ${total}`;const prev=qs('[data-aw-stage-page-prev]'),next=qs('[data-aw-stage-page-next]');if(prev)prev.disabled=n<=1;if(next)next.disabled=n>=total;const zoom=qs('[data-aw-stage-zoom-label]');if(zoom)zoom.textContent=`${Math.round((active.zoom||1)*100)}%`}
async function renderPaperPage(){if(!active?.pdfDoc)return;const serial=++renderSerial,pageNo=active.page||1,stage=qs('[data-aw-stage-paper-frame]'),canvas=qs('[data-aw-stage-paper-canvas]');if(!stage||!canvas)return;viewerStatus(`Loading page ${pageNo}…`);try{const page=await active.pdfDoc.getPage(pageNo);if(serial!==renderSerial||!active)return;const base=page.getViewport({scale:1}),available=Math.max(280,(stage.clientWidth||700)-28),cssScale=Math.max(.45,Math.min(2.2,(available/base.width)*(active.zoom||1))),dpr=Math.min(window.devicePixelRatio||1,2),view=page.getViewport({scale:cssScale*dpr});canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);canvas.style.width=`${Math.round(base.width*cssScale)}px`;canvas.style.height=`${Math.round(base.height*cssScale)}px`;const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:ctx,viewport:view}).promise;if(serial!==renderSerial)return;viewerStatus('');syncViewerControls()}catch(_){if(serial===renderSerial)viewerStatus('Unable to render this page. Exit and reopen the paper.',true)}}
async function initViewer(){try{const lib=await pdfjs();if(!active)return;const task=lib.getDocument({url:active.paper.assetPath,isEvalSupported:false,useSystemFonts:true});const doc=await task.promise;if(!active){doc.destroy();return}active.pdfDoc=doc;active.pageCount=doc.numPages;active.page=1;active.zoom=1;syncViewerControls();await renderPaperPage()}catch(_){viewerStatus('Unable to open this paper on this device. Exit and try again.',true)}}
function changePage(delta){if(!active?.pdfDoc)return;const next=Math.max(1,Math.min(active.pageCount,active.page+delta));if(next===active.page)return;active.page=next;syncViewerControls();renderPaperPage()}
function changeZoom(delta){if(!active?.pdfDoc)return;active.zoom=Math.max(.75,Math.min(2,Math.round(((active.zoom||1)+delta)*100)/100));syncViewerControls();renderPaperPage()}
function instruction(p){const cfg=conditionFor(p);if(!cfg){overlay(`<div class="aw-exam-dialog"><button class="aw-exam-close" data-aw-stage-close aria-label="Close">×</button><div class="ey">${esc(STAGE_LABELS[p.stage]||p.stage)}</div><h1>${esc(p.title)}</h1><p>This paper is linked to the correct learning stage, but its formal timing/response contract still needs verification before a timed attempt can be enabled.</p><button class="primary wide" data-aw-stage-close>Close</button></div>`);return}
  const q=cfg.mode==='writing'?'Writing response':`${cfg.questions} answer${cfg.questions===1?'':'s'}`;
  overlay(`<div class="aw-exam-dialog"><button class="aw-exam-close" data-aw-stage-close aria-label="Close">×</button><div class="ey">${esc(STAGE_LABELS[p.stage]||p.stage)} formal practice</div><h1>${esc(p.title)}</h1><div class="aw-instruction-stats"><b>${q}</b><b>${cfg.minutes} minutes</b></div><p>${esc(CONDITION_NOTES[p.stage]||'')}</p><p>The original PDF is shown in the exam viewer with a separate answer sheet. Because this paper is still classified as source-review, answers are saved but are not auto-marked until its answer key has passed verification.</p><button class="primary wide" data-aw-start-stage-formal="${esc(p.id)}">Start timed paper</button></div>`,'aw-instruction-overlay')}
function start(p){const cfg=conditionFor(p);if(!cfg)return;const startedAt=Date.now();active={paper:p,cfg,answers:{},startedAt,deadline:startedAt+cfg.minutes*60000,submitted:false,page:1,pageCount:p.pageCount||1,zoom:1};overlay(`<div class="aw-exam-shell"><header class="aw-exam-bar"><div><b>${esc(p.title)}</b><span>${esc(STAGE_LABELS[p.stage]||p.stage)} · ${esc(p.subject)}</span></div><div class="aw-timer" data-aw-stage-timer>${timeText(cfg.minutes*60000)}</div><button class="aw-exam-exit" data-aw-stage-exit>Exit</button></header><main class="aw-exam-main"><section class="aw-paper-pane"><div class="aw-paper-toolbar"><button type="button" data-aw-stage-page-prev disabled>← Previous</button><strong data-aw-stage-page-label>Page 1 of ${p.pageCount||1}</strong><button type="button" data-aw-stage-page-next>Next →</button><span class="aw-zoom-controls"><button type="button" data-aw-stage-zoom-out aria-label="Zoom out">−</button><span data-aw-stage-zoom-label>100%</span><button type="button" data-aw-stage-zoom-in aria-label="Zoom in">+</button></span></div><div class="aw-paper-stage" data-aw-stage-paper-frame tabindex="0"><div class="aw-paper-status" data-aw-stage-paper-status>Loading paper…</div><canvas data-aw-stage-paper-canvas aria-label="${esc(p.title)} page"></canvas></div><div class="aw-paper-swipe-hint">Swipe left or right to change pages</div></section><aside class="aw-answer-pane"><div class="aw-answer-head"><b>Answer sheet</b><span>${cfg.mode==='mixed'?'Choice or short response':cfg.questions+' answers'}</span></div><div class="aw-answer-grid">${Array.from({length:cfg.questions},(_,i)=>responseCell(i+1,cfg)).join('')}</div><button class="primary wide" data-aw-stage-submit>Review & submit paper</button></aside></main></div>`,'aw-running-exam');
  const frame=qs('[data-aw-stage-paper-frame]');let sx=null,sy=null;if(frame){frame.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});frame.addEventListener('touchend',e=>{if(sx==null||!active||active.zoom>1.1)return;const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=sy=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.25)changePage(dx<0?1:-1)},{passive:true})}
  timer=setInterval(updateTimer,1000);updateTimer();initViewer()
}
function saveAttempt(timedOut){let P={};try{P=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')||{}}catch(_){P={}}P.attempts=Array.isArray(P.attempts)?P.attempts:[];const a={date:new Date().toISOString(),type:'stage-historical-formal',stage:active.paper.stage,subject:active.paper.subject,sourceYear:active.paper.year||null,sourcePath:active.paper.sourcePath,score:null,verified:false,durationSeconds:Math.max(0,Math.round((Date.now()-active.startedAt)/1000)),timedOut:!!timedOut,responses:active.answers};P.attempts.push(a);try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(P))}catch(_){}return a}
function submit(timedOut=false){if(!active||active.submitted)return;active.submitted=true;if(timer)clearInterval(timer);timer=null;const a=saveAttempt(timedOut),p=active.paper;overlay(`<div class="aw-exam-dialog aw-result-dialog"><div class="ey">${esc(STAGE_LABELS[p.stage]||p.stage)} formal practice</div><h1>Paper submitted</h1><h2>${esc(p.title)}</h2><p>Your responses have been saved. Auto-marking remains disabled until this paper's answer key is independently verified.</p><div class="aw-form-result"><b>${a.timedOut?'Time expired — submitted automatically':'Paper submitted'}</b><span>Time used: ${Math.floor(a.durationSeconds/60)} min ${a.durationSeconds%60} sec</span></div><button class="primary wide" data-aw-stage-done>Done</button></div>`,'aw-result-overlay')}
fetch('/stage-papers/catalog.json?v=61800',{cache:'force-cache'}).then(r=>r.ok?r.json():Promise.reject()).then(x=>{catalog=x;paperIndex=new Map();for(const st of Object.values(x.stages||{}))for(const p of st.papers||[])paperIndex.set(p.id,p);scheduleIsolation()}).catch(()=>{});
document.addEventListener('click',e=>{const tile=e.target.closest('[data-aw-stage-paper]');if(tile){const p=paperIndex.get(tile.dataset.awStagePaper);if(p){e.preventDefault();e.stopImmediatePropagation();instruction(p)}return}},true);
document.addEventListener('click',e=>{if(e.target.closest('[data-a="tests"],[data-a="home"]'))scheduleIsolation();if(e.target.closest('[data-aw-stage-close],[data-aw-stage-done]')){closeOverlay();scheduleIsolation();return}const startBtn=e.target.closest('[data-aw-start-stage-formal]');if(startBtn){const p=paperIndex.get(startBtn.dataset.awStartStageFormal);if(p)start(p);return}if(e.target.closest('[data-aw-stage-exit]')){if(confirm('Exit this timed paper? Your current responses will not be saved.'))closeOverlay();return}if(e.target.closest('[data-aw-stage-page-prev]')){changePage(-1);return}if(e.target.closest('[data-aw-stage-page-next]')){changePage(1);return}if(e.target.closest('[data-aw-stage-zoom-out]')){changeZoom(-.15);return}if(e.target.closest('[data-aw-stage-zoom-in]')){changeZoom(.15);return}if(e.target.closest('[data-aw-stage-submit]')){submit(false);return}const c=e.target.closest('[data-aw-stage-choice]');if(c&&active){const n=Number(c.dataset.awStageChoice),row=c.closest('[data-aw-stage-answer-row]');row?.querySelectorAll('[data-aw-stage-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===c)));active.answers[n]=c.dataset.value;const t=row?.querySelector('[data-aw-stage-text]');if(t)t.value='';return}});
document.addEventListener('input',e=>{const t=e.target.closest('[data-aw-stage-text]');if(!t||!active)return;const n=Number(t.dataset.awStageText);active.answers[n]=t.value;const row=t.closest('[data-aw-stage-answer-row]');row?.querySelectorAll('[data-aw-stage-choice]').forEach(b=>b.setAttribute('aria-pressed','false'))});
window.addEventListener('awenture:stage-change',e=>scheduleIsolation(e.detail?.stage));window.addEventListener('awenture:progression-ready',()=>scheduleIsolation());scheduleIsolation();
})();
