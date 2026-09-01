(()=>{'use strict';
const SUBJECTS=['English','Mathematics','Science'],PROGRESS_KEY='oc-ready-progress-v1';
const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const runtime=()=>window.__AW_ORIGINAL_PAPERS;
const papersFor=s=>(runtime()?.papers||[]).filter(p=>p.subject===s).sort((a,b)=>a.year-b.year);
const cfg=s=>runtime()?.conditions?.[s];
const pathFor=(p,kind='questions')=>`/original-icas/year2/${cfg(p.subject).folder}/${p.year}-${kind}.pdf`;
let active=null,timer=null;

function transformTests(){
  const h1=qsa('h1').find(x=>(x.textContent||'').trim()==='Subject tests');
  if(!h1||!runtime())return;
  const card=h1.closest('.card'),grid=card&&qs('.grid',card);if(!grid||grid.dataset.awHistorical==='1')return;
  grid.dataset.awHistorical='1';grid.classList.add('aw-form-grid','aw-historical-grid');
  grid.innerHTML=SUBJECTS.map(subject=>{const c=cfg(subject),papers=papersFor(subject);return `<section class="aw-form-subject"><div class="aw-form-heading"><b>${subject}</b><span>${c.questions} questions · ${c.minutes} min · ${papers.length} papers</span></div><div class="aw-form-choices">${papers.map(p=>`<button class="tile aw-form-tile aw-year-tile" data-aw-original-subject="${esc(subject)}" data-aw-original-year="${p.year}"><b>${p.year} paper</b><span>${p.scoring==='verified'?'Verified auto-marking':'Source-paper review'}</span></button>`).join('')}</div></section>`}).join('');
  let note=qs('.aw-form-note',card);if(!note){note=document.createElement('p');note.className='aw-form-note';h1.insertAdjacentElement('afterend',note)}
  note.textContent='Authorised historical Year 2 papers. The timed paper contains question pages only; answer and analysis pages are unavailable until submission.';
}

function paper(subject,year){return papersFor(subject).find(p=>p.year===Number(year))}
function overlay(html,cls=''){closeOverlay(false);const el=document.createElement('div');el.className=`aw-exam-overlay ${cls}`;el.dataset.awExamOverlay='1';el.innerHTML=html;document.body.appendChild(el);document.body.classList.add('aw-exam-open');return el}
function closeOverlay(clear=true){const el=qs('[data-aw-exam-overlay]');if(el)el.remove();document.body.classList.remove('aw-exam-open');if(clear){if(timer)clearInterval(timer);timer=null;active=null}}
function instruction(p){const c=cfg(p.subject);overlay(`<div class="aw-exam-dialog"><button class="aw-exam-close" data-aw-exam-close aria-label="Close">×</button><div class="ey">Historical ICAS paper</div><h1>${p.year} ${esc(p.subject)}</h1><div class="aw-instruction-stats"><b>${c.questions} questions</b><b>${c.minutes} minutes</b></div><p>This uses the authorised historical Year 2 paper artwork. Once you start, the timer runs continuously. Answers and analysis are not available until you submit or time expires.</p><p>${p.scoring==='verified'?'This paper has a fully verified answer key and will be marked automatically.':'Your responses will be saved. This scanned edition will use its source answer/analysis pages for review after submission rather than guessing from uncertain OCR.'}</p><button class="primary wide" data-aw-start-original data-subject="${esc(p.subject)}" data-year="${p.year}">Start timed paper</button></div>`,'aw-instruction-overlay')}
function remaining(){return Math.max(0,(active?.deadline||0)-Date.now())}
function timeText(ms){const s=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function updateTimer(){if(!active)return;const left=remaining(),el=qs('[data-aw-original-timer]');if(el){el.textContent=timeText(left);el.classList.toggle('warning',left<=300000&&left>60000);el.classList.toggle('danger',left<=60000)}if(left<=0&&!active.submitted)submit(true)}
function responseType(p,n){return p.responseTypes?.[String(n)]||'choice'}
function responseCell(p,n){const type=responseType(p,n);if(type==='text')return `<label class="aw-answer-row aw-answer-text"><span>${n}</span><input inputmode="numeric" autocomplete="off" data-aw-answer-text="${n}" aria-label="Question ${n} answer"></label>`;return `<div class="aw-answer-row" data-aw-answer-row="${n}"><span>${n}</span><div class="aw-answer-options">${['A','B','C','D'].map(x=>`<button type="button" data-aw-answer-choice="${n}" data-value="${x}" aria-pressed="false">${x}</button>`).join('')}</div>${type==='multi'?'<small>Select all that apply</small>':''}</div>`}
function start(p){const c=cfg(p.subject),startedAt=Date.now();active={paper:p,answers:{},startedAt,deadline:startedAt+c.minutes*60000,submitted:false};overlay(`<div class="aw-exam-shell"><header class="aw-exam-bar"><div><b>${p.year} ${esc(p.subject)}</b><span>Year 2 historical paper</span></div><div class="aw-timer" data-aw-original-timer>${timeText(c.minutes*60000)}</div><button class="aw-exam-exit" data-aw-exam-exit>Exit</button></header><main class="aw-exam-main"><section class="aw-paper-pane"><iframe title="${p.year} ${esc(p.subject)} question paper" src="${pathFor(p)}#toolbar=1&navpanes=0" data-aw-paper-frame></iframe></section><aside class="aw-answer-pane"><div class="aw-answer-head"><b>Answer sheet</b><span>${c.questions} questions</span></div><div class="aw-answer-grid">${Array.from({length:c.questions},(_,i)=>responseCell(p,i+1)).join('')}</div><button class="primary wide" data-aw-submit-original>Submit paper</button></aside></main></div>`,'aw-running-exam');
  if(timer)clearInterval(timer);timer=setInterval(updateTimer,1000);updateTimer();
}
function normalize(v){if(Array.isArray(v))return [...v].map(String).sort().join(',');return String(v??'').trim().toUpperCase().replace(/\s+/g,'')}
function mark(p){if(p.scoring!=='verified'||!Array.isArray(p.answers))return null;let correct=0;for(let i=0;i<p.answers.length;i++)if(normalize(active.answers[i+1])===normalize(p.answers[i]))correct++;return {correct,total:p.answers.length,score:Math.round(correct/p.answers.length*100)}}
function saveAttempt(result,timedOut){let P={};try{P=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')||{}}catch(_){P={}};P.attempts=Array.isArray(P.attempts)?P.attempts:[];const attempt={date:new Date().toISOString(),subject:active.paper.subject,type:'icas-original',sourceYear:active.paper.year,score:result?.score??null,correct:result?.correct??null,total:cfg(active.paper.subject).questions,verified:active.paper.scoring==='verified',durationSeconds:Math.max(0,Math.round((Date.now()-active.startedAt)/1000)),timedOut:!!timedOut,responses:active.answers};P.attempts.push(attempt);try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(P))}catch(_){}return attempt}
function resultView(attempt,result){const p=active.paper,ref=p.answerReference?`<a class="secondary wide aw-answer-reference" href="${pathFor(p,'answers')}" target="_blank" rel="noopener">Open source answer / analysis pages</a>`:'';const summary=result?`<h1>${result.score}%</h1><h2>${result.correct} of ${result.total} correct</h2><p>The verified source key was applied only after submission.</p>`:`<h1>Paper submitted</h1><h2>${esc(p.subject)} · ${p.year}</h2><p>This edition is deliberately not auto-scored because its scanned answer table has not yet met AWenture's verification standard. Review against the source answer/analysis pages below.</p><div class="aw-manual-score"><label>Correct answers <input type="number" min="0" max="${cfg(p.subject).questions}" data-aw-reviewed-correct></label><button class="secondary" data-aw-save-reviewed>Save reviewed score</button></div>`;overlay(`<div class="aw-exam-dialog aw-result-dialog"><div class="ey">Historical formal test</div>${summary}<div class="aw-form-result"><b>${attempt.timedOut?'Time expired — submitted automatically':'Paper submitted'}</b><span>Time used: ${Math.floor(attempt.durationSeconds/60)} min ${attempt.durationSeconds%60} sec</span></div>${ref}<button class="primary wide" data-aw-result-done>Done</button></div>`,'aw-result-overlay')}
function submit(timedOut=false){if(!active||active.submitted)return;active.submitted=true;if(timer)clearInterval(timer);timer=null;const result=mark(active.paper),attempt=saveAttempt(result,timedOut);resultView(attempt,result)}
function saveReviewed(){if(!active)return;const input=qs('[data-aw-reviewed-correct]'),n=Number(input?.value),total=cfg(active.paper.subject).questions;if(!Number.isInteger(n)||n<0||n>total)return;let P={};try{P=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')||{}}catch(_){return}const attempts=Array.isArray(P.attempts)?P.attempts:[],a=[...attempts].reverse().find(x=>x.type==='icas-original'&&x.sourceYear===active.paper.year&&x.subject===active.paper.subject&&x.score==null);if(!a)return;a.correct=n;a.score=Math.round(n/total*100);a.reviewed=true;localStorage.setItem(PROGRESS_KEY,JSON.stringify(P));const box=qs('.aw-manual-score');if(box)box.innerHTML=`<b>Reviewed score saved: ${n}/${total} (${a.score}%)</b>`}
function sync(){transformTests()}

document.addEventListener('click',e=>{
  const year=e.target.closest('[data-aw-original-year]');if(year){e.preventDefault();e.stopPropagation();const p=paper(year.dataset.awOriginalSubject,year.dataset.awOriginalYear);if(p)instruction(p);return}
  const start=e.target.closest('[data-aw-start-original]');if(start){const p=paper(start.dataset.subject,start.dataset.year);if(p)startPaper(p);return}
  if(e.target.closest('[data-aw-exam-close]')){closeOverlay();return}
  if(e.target.closest('[data-aw-exam-exit]')){if(confirm('Exit this timed paper? Your current responses will not be saved.'))closeOverlay();return}
  if(e.target.closest('[data-aw-submit-original]')){submit(false);return}
  if(e.target.closest('[data-aw-result-done]')){closeOverlay();sync();return}
  if(e.target.closest('[data-aw-save-reviewed]')){saveReviewed();return}
  const choice=e.target.closest('[data-aw-answer-choice]');if(choice&&active){const n=Number(choice.dataset.awAnswerChoice),type=responseType(active.paper,n),row=choice.closest('[data-aw-answer-row]');if(type==='multi'){const on=choice.getAttribute('aria-pressed')!=='true';choice.setAttribute('aria-pressed',String(on));choice.classList.toggle('selected',on);active.answers[n]=qsa('[data-aw-answer-choice].selected',row).map(b=>b.dataset.value).sort()}else{qsa('[data-aw-answer-choice]',row).forEach(b=>{const on=b===choice;b.setAttribute('aria-pressed',String(on));b.classList.toggle('selected',on)});active.answers[n]=choice.dataset.value}return}
},true);
document.addEventListener('input',e=>{const input=e.target.closest('[data-aw-answer-text]');if(input&&active)active.answers[Number(input.dataset.awAnswerText)]=input.value},true);
function startPaper(p){start(p)}
new MutationObserver(()=>queueMicrotask(sync)).observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
})();
