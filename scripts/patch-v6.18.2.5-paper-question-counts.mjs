import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const stagePath=path.join(dist,'stage-formal-tests.js');
const catalogPath=path.join(dist,'stage-papers','catalog.json');
if(!fs.existsSync(stagePath)||!fs.existsSync(catalogPath))throw new Error('paper question-count runtime inputs missing');
let js=fs.readFileSync(stagePath,'utf8');

const conditionOld="function conditionFor(p){return CONDITIONS[p.stage]?.[p.subject]||null}";
if(!js.includes(conditionOld))throw new Error('conditionFor anchor missing');
const conditionNew="function conditionFor(p){const base=CONDITIONS[p.stage]?.[p.subject]||null;if(!base)return null;if(!p?.questionCountVerified||!Number.isInteger(Number(p.questionCount))||Number(p.questionCount)<1)return {...base,questions:null,questionCountVerified:false};return {...base,questions:Number(p.questionCount),questionCountVerified:true}}";
js=js.replace(conditionOld,conditionNew);

const instructionAnchor="function instruction(p){";
if(!js.includes(instructionAnchor))throw new Error('instruction anchor missing after startup patch');
js=js.replace(instructionAnchor,"function instruction(p){if(!p?.questionCountVerified){overlay(`<div class=\"aw-exam-dialog\"><button class=\"aw-exam-close\" data-aw-stage-close>×</button><div class=\"ey\">${esc(STAGE_LABELS[p.stage]||p.stage)}</div><h1>${esc(p.title)}</h1><p>This paper is available for source review, but its exact question count has not yet passed document QA. A timed answer sheet will not be generated until the count is verified.</p><button class=\"primary wide\" data-aw-stage-source-review=\"${esc(p.id)}\">Open paper for QA</button><button class=\"wide\" data-aw-stage-close>Close</button></div>`);return}");

// Defensive guard: never create an answer sheet from a subject-level default count.
const startAnchor="function start(p){const cfg=conditionFor(p);if(!cfg)return;";
if(!js.includes(startAnchor))throw new Error('start anchor missing');
js=js.replace(startAnchor,"function start(p){const cfg=conditionFor(p);if(!cfg||!cfg.questionCountVerified||!Number.isInteger(cfg.questions)||cfg.questions<1)return;");

fs.writeFileSync(stagePath,js);
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]);
const verified=papers.filter(p=>p.questionCountVerified&&Number.isInteger(Number(p.questionCount))&&Number(p.questionCount)>0).length;
const pending=papers.length-verified;
console.log(JSON.stringify({release:'6.18.2',paperSpecificAnswerSheets:'PASS',verified,pending,total:papers.length,subjectDefaultCounts:'DISABLED_FOR_UNVERIFIED_PAPERS'}));
