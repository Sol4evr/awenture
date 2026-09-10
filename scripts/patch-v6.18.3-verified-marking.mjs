import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const runtimePath=path.join(dist,'stage-formal-tests.js');
const htmlPath=path.join(dist,'index.html');
if(!fs.existsSync(runtimePath))throw new Error('v6.18.3 requires stage-formal-tests.js');
let js=fs.readFileSync(runtimePath,'utf8');
let lines=js.split('\n');

const saveIndex=lines.findIndex(line=>line.startsWith('function saveAttempt(timedOut)'));
if(saveIndex<0)throw new Error('v6.18.3 marking patch could not locate final saveAttempt contract');
lines.splice(saveIndex,1,
`async function requestVerifiedMarking(p,responses){try{const r=await fetch('/api/mark-paper',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({paperId:p.id,responses})});if(r.status===409)return null;if(!r.ok)return null;const x=await r.json();if(!x||x.eligible!==true||x.verified!==true||!Number.isInteger(x.score)||!Number.isInteger(x.total)||x.total<1)return null;return x}catch(_){return null}}`,
`function saveAttempt(timedOut,marking=null){let P={};try{P=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')||{}}catch(_){P={}}P.attempts=Array.isArray(P.attempts)?P.attempts:[];const verified=!!marking?.verified,a={date:new Date().toISOString(),type:'stage-historical-formal',stage:active.paper.stage,subject:active.paper.subject,sourceYear:active.paper.year||null,sourcePath:active.paper.sourcePath,score:verified?marking.score:null,total:verified?marking.total:null,percentage:verified?marking.percentage:null,answered:verified?marking.answered:null,verified,progressionCredit:false,durationSeconds:Math.max(0,Math.round((Date.now()-active.startedAt)/1000)),timedOut:!!timedOut,responses:{...active.answers}};P.attempts.push(a);try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(P))}catch(_){}return a}`
);

const submitIndex=lines.findIndex(line=>line.startsWith('function submit(timedOut=false)'));
if(submitIndex<0)throw new Error('v6.18.3 marking patch could not locate final submit contract');
lines[submitIndex]=`async function submit(timedOut=false){if(!active||active.submitted)return;active.submitted=true;if(timer)clearInterval(timer);timer=null;const p=active.paper,responses={...active.answers},marking=await requestVerifiedMarking(p,responses);if(!active)return;const a=saveAttempt(timedOut,marking),result=marking?.verified?\`<p>This paper uses an independently verified answer mapping and was marked automatically.</p><div class="aw-form-result"><b>Score: \${marking.score} / \${marking.total} (\${marking.percentage}%)</b><span>Answered: \${marking.answered} / \${marking.total} · Time used: \${Math.floor(a.durationSeconds/60)} min \${a.durationSeconds%60} sec</span></div>\`:\`<p>Your responses have been saved. Auto-marking remains disabled until this paper's answer key is independently verified.</p><div class="aw-form-result"><b>\${a.timedOut?'Time expired — submitted automatically':'Paper submitted'}</b><span>Time used: \${Math.floor(a.durationSeconds/60)} min \${a.durationSeconds%60} sec</span></div>\`;overlay(\`<div class="aw-exam-dialog aw-result-dialog"><div class="ey">\${esc(STAGE_LABELS[p.stage]||p.stage)} formal practice</div><h1>Paper submitted</h1><h2>\${esc(p.title)}</h2>\${result}<button class="primary wide" data-aw-stage-done>Done</button></div>\`,'aw-result-overlay')}`;

js=lines.join('\n');
const instructionCopy='Responses are saved but are not auto-marked until the answer key is verified.';
if(!js.includes(instructionCopy))throw new Error('v6.18.3 marking patch could not locate instruction copy');
js=js.replace(instructionCopy,'Responses are saved. Papers with independently verified answer mappings are marked automatically; all others remain safely unmarked.');
if(js.includes('const grade=gradeAttempt(active.paper'))throw new Error('Client-side scoring path must be removed from active saveAttempt');
if(!js.includes("fetch('/api/mark-paper'"))throw new Error('Server-side marking endpoint not wired');
fs.writeFileSync(runtimePath,js);

let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('awenture-release\" content=\"6.18.2\"'))throw new Error('v6.18.3 requires v6.18.2 release marker');
html=html.replace('awenture-release\" content=\"6.18.2\"','awenture-release\" content=\"6.18.3\"');
html=html.replaceAll("RELEASE='6.18.2'","RELEASE='6.18.3'");
fs.writeFileSync(htmlPath,html);
console.log(JSON.stringify({release:'6.18.3',feature:'verified-past-paper-marking',marking:'SERVER_SIDE_VERIFIED_ONLY',progressionCredit:false,answerKeyExposure:false}));
