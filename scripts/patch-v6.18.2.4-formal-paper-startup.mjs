import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const y2Path=path.join(dist,'formal-tests.js');
const stagePath=path.join(dist,'stage-formal-tests.js');
const cssPath=path.join(dist,'formal-tests.css');
const htmlPath=path.join(dist,'index.html');
for(const p of [y2Path,stagePath,cssPath,htmlPath])if(!fs.existsSync(p))throw new Error(`startup UX input missing: ${p}`);

let y2=fs.readFileSync(y2Path,'utf8');

// Warm the PDF.js module while the learner reads the instructions. This removes the module-import
// penalty from the timed start path without downloading the whole paper in advance.
const y2Instruction='function instruction(p){const c=cfg(p.subject);';
if(!y2.includes(y2Instruction))throw new Error('Y2 instruction anchor missing');
y2=y2.replace(y2Instruction,"function instruction(p){pdfjs().catch(()=>{});const c=cfg(p.subject);");

// The clock must not run while PDF.js/document/page 1 is still loading. Start timing only after
// page 1 has been atomically painted to the visible canvas.
const y2Remaining='function remaining(){return Math.max(0,(active?.deadline||0)-Date.now())}';
if(!y2.includes(y2Remaining))throw new Error('Y2 timer anchor missing');
y2=y2.replace(y2Remaining,`${y2Remaining}\nfunction armOriginalTimer(){if(!active||active.timerStarted)return;const now=Date.now();active.timerStarted=true;active.startedAt=now;active.deadline=now+cfg(active.paper.subject).minutes*60000;if(timer)clearInterval(timer);timer=setInterval(updateTimer,1000);updateTimer()}`);

const y2Paint="visible.drawImage(buffer,0,0);viewerStatus('');syncViewerControls()";
const y2PaintFallback="viewerStatus('');syncViewerControls();";
if(y2.includes(y2Paint))y2=y2.replace(y2Paint,"visible.drawImage(buffer,0,0);viewerStatus('');armOriginalTimer();syncViewerControls()");
else if(y2.includes(y2PaintFallback))y2=y2.replace(y2PaintFallback,"viewerStatus('');armOriginalTimer();syncViewerControls();");
else throw new Error('Y2 first-page paint anchor missing');

const y2State='active={paper:p,answers:{},startedAt,deadline:startedAt+c.minutes*60000,submitted:false,page:1,pageCount:p.questionEndPage,zoom:1}';
if(!y2.includes(y2State))throw new Error('Y2 start state anchor missing');
y2=y2.replace('const c=cfg(p.subject),startedAt=Date.now();'+y2State,'const c=cfg(p.subject);active={paper:p,answers:{},startedAt:null,deadline:null,timerStarted:false,submitted:false,page:1,pageCount:p.questionEndPage,zoom:1}');
const y2Immediate='if(timer)clearInterval(timer);timer=setInterval(updateTimer,1000);updateTimer();initPaperViewer(p);';
if(!y2.includes(y2Immediate))throw new Error('Y2 immediate timer start anchor missing');
y2=y2.replace(y2Immediate,'if(timer)clearInterval(timer);timer=null;initPaperViewer(p);');
fs.writeFileSync(y2Path,y2);

let stage=fs.readFileSync(stagePath,'utf8');
const stageInstruction='function instruction(p){';
if(!stage.includes(stageInstruction))throw new Error('stage instruction anchor missing');
stage=stage.replace(stageInstruction,"function instruction(p){pdfjs().catch(()=>{});");

const stageRemaining='function remaining(){return Math.max(0,(active?.deadline||0)-Date.now())}';
if(!stage.includes(stageRemaining))throw new Error('stage timer anchor missing');
stage=stage.replace(stageRemaining,`${stageRemaining}\nfunction armStageTimer(){if(!active||active.sourceReview||active.timerStarted)return;const now=Date.now();active.timerStarted=true;active.startedAt=now;active.deadline=now+active.cfg.minutes*60000;if(timer)clearInterval(timer);timer=setInterval(updateTimer,1000);updateTimer()}`);
const stagePaint="visible.drawImage(buffer,0,0);viewerStatus('');syncViewerControls()";
if(!stage.includes(stagePaint))throw new Error('stage first-page paint anchor missing');
stage=stage.replace(stagePaint,"visible.drawImage(buffer,0,0);viewerStatus('');armStageTimer();syncViewerControls()");

// patch-v6.18.2.3 changes the local start state variable to `state`.
const stateNeedle='const startedAt=Date.now();const state={paper:p,cfg,answers:{},startedAt,deadline:startedAt+cfg.minutes*60000,submitted:false,';
if(!stage.includes(stateNeedle))throw new Error('stage start state anchor missing');
stage=stage.replace(stateNeedle,"const state={paper:p,cfg,answers:{},startedAt:null,deadline:null,timerStarted:false,submitted:false,");
const stageImmediate='timer=setInterval(updateTimer,1000);updateTimer();initViewer()';
if(!stage.includes(stageImmediate))throw new Error('stage immediate timer start anchor missing');
stage=stage.replace(stageImmediate,'if(timer)clearInterval(timer);timer=null;initViewer()');
fs.writeFileSync(stagePath,stage);

// Replace the bespoke Y2 accordion enhancer with the same native <details>/<summary> structure and
// class names used by later-stage subject categories. This makes the interaction and visual styling
// identical rather than merely "collapsed".
const y2AccordionPath=path.join(dist,'y2-test-accordion.js');
if(!fs.existsSync(y2AccordionPath))throw new Error('Y2 accordion runtime missing');
const accordion=`(()=>{'use strict';\nconst qsa=(s,r=document)=>[...r.querySelectorAll(s)];\nfunction cleanFooter(){for(const el of qsa('footer,.footer,[class*=footer]')){if(!/ICAS Grade 2/i.test(el.textContent||''))continue;for(const n of [...el.childNodes])if(n.nodeType===3)n.nodeValue=(n.nodeValue||'').replace(/\\s*[·|•-]?\\s*ICAS Grade 2\\s*[·|•-]?\\s*/gi,' ');for(const n of qsa('*',el)){if(n.children.length===0&&/ICAS Grade 2/i.test(n.textContent||'')){n.textContent=(n.textContent||'').replace(/ICAS Grade 2/gi,'').replace(/^\\s*[·|•-]\\s*|\\s*[·|•-]\\s*$/g,'').trim();if(!n.textContent)n.hidden=true}}}}\nfunction prepare(){cleanFooter();const grid=document.querySelector('.aw-historical-grid');if(!grid)return;for(const section of qsa('.aw-form-subject',grid)){if(section.matches('details.aw-stage-subject-details'))continue;const head=section.querySelector('.aw-form-heading'),body=section.querySelector('.aw-form-choices');if(!head||!body)continue;const details=document.createElement('details');details.className='aw-form-subject aw-stage-subject aw-stage-subject-details aw-y2-subject-details';const summary=document.createElement('summary');summary.className='aw-stage-subject-summary';summary.innerHTML=head.innerHTML;body.classList.add('aw-stage-paper-grid');details.appendChild(summary);details.appendChild(body);section.replaceWith(details)}}\ndocument.addEventListener('click',e=>{if(e.target.closest('[data-a="tests"],[data-a="home"]'))setTimeout(prepare,0)});\nwindow.addEventListener('awenture:stage-change',()=>setTimeout(prepare,0));window.addEventListener('awenture:progression-ready',()=>setTimeout(prepare,0));for(const d of [0,50,140,300,650])setTimeout(prepare,d);\n})();\n`;
fs.writeFileSync(y2AccordionPath,accordion);

fs.appendFileSync(cssPath,`\n/* v6.18.2.4 exact Y2/later-stage accordion parity + loading-safe timer */\n.aw-y2-subject-details>.aw-stage-paper-grid{margin:0;padding:0 12px 12px}\n.aw-y2-subject-details .aw-form-heading{display:none!important}\n.aw-paper-status:not(:empty):before{content:' ';display:inline-block;width:10px;height:10px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;margin-right:7px;vertical-align:-1px;animation:awPaperSpin .7s linear infinite}\n.aw-paper-status.error:before{display:none}\n@keyframes awPaperSpin{to{transform:rotate(360deg)}}\n`);

const html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('/y2-test-accordion.js'))throw new Error('Y2 accordion script not wired');
if(!y2.includes('armOriginalTimer()')||!stage.includes('armStageTimer()'))throw new Error('loading-safe timer patch missing');
if(y2.includes('timer=setInterval(updateTimer,1000);updateTimer();initPaperViewer(p)'))throw new Error('Y2 timer still starts before PDF');
if(stage.includes('timer=setInterval(updateTimer,1000);updateTimer();initViewer()'))throw new Error('stage timer still starts before PDF');
console.log(JSON.stringify({release:'6.18.2',startupUX:'PASS',y2Accordion:'EXACT_STAGE_DETAILS_PARITY',timerStarts:'AFTER_FIRST_PAGE_VISIBLE',pdfModuleWarmup:'INSTRUCTION_SCREEN'}));
