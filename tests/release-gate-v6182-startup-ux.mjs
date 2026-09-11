import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const y2=fs.readFileSync(path.join(dist,'formal-tests.js'),'utf8');
const stage=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
const acc=fs.readFileSync(path.join(dist,'y2-test-accordion.js'),'utf8');
const css=fs.readFileSync(path.join(dist,'formal-tests.css'),'utf8');
if(!acc.includes("details.className='aw-form-subject aw-stage-subject aw-stage-subject-details aw-y2-subject-details'"))throw new Error('Y2 does not use same details accordion structure as later stages');
if(!acc.includes("summary.className='aw-stage-subject-summary'"))throw new Error('Y2 does not use same accordion summary styling as later stages');
if(!css.includes('.aw-stage-subject-details')||!css.includes('.aw-stage-subject-summary'))throw new Error('shared accordion styles missing');
if(!y2.includes('function armOriginalTimer()')||!y2.includes('armOriginalTimer();syncViewerControls'))throw new Error('Y2 timer is not armed by successful first-page render');
if(!stage.includes('function armStageTimer()')||!stage.includes('armStageTimer();syncViewerControls'))throw new Error('stage timer is not armed by successful first-page render');
if(y2.includes('timer=setInterval(updateTimer,1000);updateTimer();initPaperViewer(p)'))throw new Error('Y2 timer still starts before paper render');
if(stage.includes('timer=setInterval(updateTimer,1000);updateTimer();initViewer()'))throw new Error('stage timer still starts before paper render');
if(!y2.includes('pdfjs().catch(()=>{});const c=cfg(p.subject)'))throw new Error('Y2 PDF.js warmup missing from instructions');
if(!stage.includes('function instruction(p){pdfjs().catch(()=>{});'))throw new Error('stage PDF.js warmup missing from instructions');

// Regression contracts: the accordion enhancer must not accumulate delayed rescans during
// repeated iPad navigation, and desktop viewer controls must remain subordinate to the coarse-
// pointer touch contract. These guard the exact cross-patch failures found in v6.18.3 QA.
if(acc.includes('for(const d of [0,40,100,220,450,800])'))throw new Error('accordion multi-timeout rescan regression returned');
if(acc.includes('[data-a="tests"],[data-a="home"]'))throw new Error('Home navigation must not schedule formal-test DOM rescans');
if(!acc.includes('requestAnimationFrame')||!acc.includes('setTimeout(prepare,120)'))throw new Error('bounded coalesced accordion scheduling missing');
const desktopControlRule=css.lastIndexOf('.aw-running-exam .aw-zoom-controls{display:inline-flex!important');
const touchContract=css.lastIndexOf('@media(hover:none) and (pointer:coarse){.aw-running-exam .aw-zoom-controls,.aw-running-exam .aw-pan-controls{display:none!important}');
if(desktopControlRule<0)throw new Error('desktop formal viewer controls missing');
if(touchContract<0||touchContract<desktopControlRule)throw new Error('touch-first viewer contract must override desktop controls at final cascade position');

console.log(JSON.stringify({release:'6.18.2',startupUX:'PASS',accordionParity:'EXACT_SHARED_DETAILS',accordionScheduling:'COALESCED_BOUNDED',timerSafety:'START_AFTER_FIRST_PAGE_VISIBLE',moduleWarmup:'PASS',touchViewerContract:'PINCH_PAN_NO_DESKTOP_CONTROLS'}));
