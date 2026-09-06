import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const formal=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
const library=fs.readFileSync(path.join(dist,'stage-papers.js'),'utf8');
const css=fs.readFileSync(path.join(dist,'formal-tests.css'),'utf8');

for(const marker of ['openStageSourceReview','data-aw-stage-source-review','QA source review','initStageSourceReviewViewer'])if(!formal.includes(marker))throw new Error(`stage QA source viewer marker missing: ${marker}`);
if(!formal.includes('getDocument({url:active.paper.assetPath'))throw new Error('QA/formal viewer must use Year 2 lite URL/range PDF loading');
if(formal.includes('arrayBuffer()'))throw new Error('whole-file PDF byte preload regression');
if(formal.includes('const startedAt=Date.now();active={'))throw new Error('formal start lifecycle can clear active paper');
if(!formal.includes("const startedAt=Date.now();const state={")||!formal.includes("'aw-running-exam');active=state;const frame="))throw new Error('formal active state must attach after overlay creation');
if(!formal.includes("if(!p?.governance?.learnerReady)"))throw new Error('learner boundary governance gate removed');
if(!formal.includes('active.questionEndPage')||!formal.includes('pageBoundaryVerified'))throw new Error('verified learner page boundary enforcement missing');

for(const marker of ['compactStageSubjects','aw-stage-subject-details','aw-stage-subject-summary'])if(!library.includes(marker)&&!css.includes(marker))throw new Error(`stage subject accordion marker missing: ${marker}`);
if(!library.includes('card.appendChild(box);compactStageSubjects(box)'))throw new Error('stage subject accordion is not applied after render');
if(!css.includes('.aw-stage-subject-details[open]'))throw new Error('accordion open-state styling missing');

console.log(JSON.stringify({release:'6.18.2',unverifiedPaperQA:'PASS',learnerGovernance:'PRESERVED',viewer:'YEAR2_LITE_URL_RANGE',formalStartLifecycle:'PASS',subjectAccordions:'PASS'}));
