import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const catalog=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','catalog.json'),'utf8'));
const qa=JSON.parse(fs.readFileSync(path.join(dist,'stage-papers','auto-question-count-verification.json'),'utf8'));
const js=fs.readFileSync(path.join(dist,'stage-formal-tests.js'),'utf8');
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]);
if(!papers.length)throw new Error('no later-stage papers found');
for(const p of papers){
  const q=qa.papers?.[p.sourcePath];if(!q)throw new Error(`question-count QA missing for ${p.sourcePath}`);
  if(p.questionCountVerified!==!!q.questionCountVerified)throw new Error(`question-count verification mismatch: ${p.sourcePath}`);
  if(p.questionCountVerified&&Number(p.questionCount)!==Number(q.questionCount))throw new Error(`question-count value mismatch: ${p.sourcePath}`);
}
if(!js.includes('questions:Number(p.questionCount)'))throw new Error('formal runtime does not use paper-specific question count');
if(!js.includes('subject-level default count')&&!js.includes('questionCountVerified'))throw new Error('unverified count protection missing');
if(!js.includes('!cfg.questionCountVerified'))throw new Error('timed start does not enforce verified question count');
const naplanReading=papers.filter(p=>p.stage==='naplan-y3'&&p.subject==='Reading');
const distinct=[...new Set(naplanReading.filter(p=>p.questionCountVerified).map(p=>Number(p.questionCount)))].sort((a,b)=>a-b);
console.log(JSON.stringify({release:'6.18.2',questionCountGate:'PASS',papers:papers.length,verified:papers.filter(p=>p.questionCountVerified).length,pending:papers.filter(p=>!p.questionCountVerified).length,naplanYear3ReadingPapers:naplanReading.length,naplanYear3ReadingVerifiedCounts:distinct,answerSheet:'PAPER_SPECIFIC_ONLY'}));
