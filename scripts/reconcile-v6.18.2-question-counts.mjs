import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const verifyPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const catalogPath=path.join(root,'dist/stage-papers/catalog.json');
if(!fs.existsSync(verifyPath)||!fs.existsSync(catalogPath))throw new Error('strict count reconciliation requires verification + catalog');
const qa=JSON.parse(fs.readFileSync(verifyPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const papers=[];for(const st of Object.values(catalog.stages||{}))for(const p of st.papers||[])papers.push(p);
const meta=new Map(papers.map(p=>[p.sourcePath,p]));
function norm(s){return String(s||'').toLowerCase().replace(/[–—]/g,'-').replace(/[^a-z0-9]+/g,' ').trim()}
function subjectTokens(subject){const s=norm(subject);if(s==='digital technologies')return ['digital'];if(s==='mathematics'||s==='mathematical reasoning')return ['math'];if(s==='language conventions')return ['language'];if(s==='thinking skills')return ['thinking'];return s.split(' ').filter(Boolean)}
function filenameCount(sourcePath){const base=path.basename(sourcePath);const nums=[];for(const m of base.matchAll(/q(?:uestion)?s?\s*(\d{1,3})\s*[-–—]\s*(\d{1,3})/ig)){const a=Number(m[1]),b=Number(m[2]);if(Number.isInteger(a)&&Number.isInteger(b)&&b>=a&&b<=100)nums.push({a,b,text:m[0]})}if(!nums.length)return null;const startsAtOne=nums.some(x=>x.a===1),max=Math.max(...nums.map(x=>x.b));if(startsAtOne&&max>=10)return {count:max,evidence:nums};return null}
function supportMatchesSubject(sourcePath,supportPath,p){if(!supportPath)return true;const n=norm(supportPath),tokens=subjectTokens(p.subject);if(tokens.some(t=>n.includes(t)))return true;const srcStem=norm(path.basename(sourcePath,'.pdf')).replace(/\b(?:answers?|solutions?|questions?|paper|test|practice|sample|with|without|no)\b/g,'').trim();const supStem=norm(path.basename(supportPath,'.pdf')).replace(/\b(?:answers?|solutions?|questions?|paper|test|practice|sample|with|without|no)\b/g,'').trim();return !!(srcStem&&supStem&&(srcStem.includes(supStem)||supStem.includes(srcStem)))}
function sequenceCoverage(e){if(typeof e?.evidence?.coverage==='number')return e.evidence.coverage;if(typeof e?.evidence?.evidence?.coverage==='number')return e.evidence.evidence.coverage;return null}
function reset(e,reason){e.questionCount=null;e.questionCountVerified=false;e.method=null;e.evidence=`question-count QA pending: ${reason}`}
let revokedCrossSubject=0,revokedWeakSequence=0,revokedWeakTail=0,filenameVerified=0,sourceIdentityVerified=0;
for(const [src,e] of Object.entries(qa.papers||{})){
  const p=meta.get(src);if(!p)continue;
  const supportPath=e?.evidence?.supportPath;
  if(e.questionCountVerified&&supportPath&&!supportMatchesSubject(src,supportPath,p)){
    reset(e,'rejected cross-subject support evidence');revokedCrossSubject++;continue;
  }
  if(e.questionCountVerified&&['learner-numbered-sequence','embedded-answer-sequence','support-answer-sequence','support-numbered-sequence'].includes(e.method)){
    const cov=sequenceCoverage(e);if(cov===null||cov<.95){reset(e,`sequence evidence below 95% completeness (${cov??'unknown'})`);revokedWeakSequence++;continue}
  }
  if(e.questionCountVerified&&e.method==='learner-strong-tail'){
    const cov=sequenceCoverage(e);if(cov===null||cov<.8){reset(e,`terminal-sequence evidence below 80% completeness (${cov??'unknown'})`);revokedWeakTail++;continue}
  }
  if(!e.questionCountVerified){const f=filenameCount(src);if(f){e.questionCount=f.count;e.questionCountVerified=true;e.method='filename-explicit-question-range';e.evidence=f.evidence;filenameVerified++}}
}
// Same source identity can appear in duplicate collection folders with different binary packaging.
// Promote only exact same stage + subject + year + normalized filename when at least one independently
// verified copy exists and every verified copy agrees. Question-page boundaries must also agree.
const boundaryPath=path.join(root,'dist/stage-papers/auto-boundary-verification.json');
const bounds=fs.existsSync(boundaryPath)?JSON.parse(fs.readFileSync(boundaryPath,'utf8')):{papers:{}};
const groups=new Map();
for(const p of papers){const b=bounds.papers?.[p.sourcePath];const base=norm(path.basename(p.sourcePath,'.pdf'));const key=[p.stage,p.subject,p.year||'',base,b?.questionEndPage||''].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p.sourcePath)}
for(const srcs of groups.values()){
  if(srcs.length<2)continue;const verified=[...new Set(srcs.map(s=>qa.papers?.[s]).filter(e=>e?.questionCountVerified).map(e=>e.questionCount))];if(verified.length!==1)continue;const count=verified[0],ref=srcs.find(s=>qa.papers?.[s]?.questionCountVerified);for(const s of srcs){const e=qa.papers?.[s];if(!e||e.questionCountVerified)continue;e.questionCount=count;e.questionCountVerified=true;e.method='same-source-identity-match';e.evidence={matchingSourcePath:ref};sourceIdentityVerified++}}
qa.version='aw-stage-question-count-6-strict';qa.policy={...(qa.policy||{}),crossSubjectSupportForbidden:true,weakSequenceForbidden:true,minimumSequenceCoverage:.95,minimumStrongTailCoverage:.8,filenameExplicitRangeAllowed:true,sameSourceIdentityPropagation:true,subjectDefaultForbidden:true};qa.summary={...(qa.summary||{}),revokedCrossSubject,revokedWeakSequence,revokedWeakTail,filenameVerified,sourceIdentityVerified};qa.summary.verified=Object.values(qa.papers||{}).filter(e=>e.questionCountVerified).length;qa.summary.total=papers.length;qa.summary.pending=qa.summary.total-qa.summary.verified;qa.unresolved=[];for(const p of papers){const e=qa.papers?.[p.sourcePath];if(!e?.questionCountVerified)qa.unresolved.push({sourcePath:p.sourcePath,stage:p.stage,subject:p.subject,year:p.year,reason:e?.evidence||'question-count QA pending'})}
fs.writeFileSync(verifyPath,JSON.stringify(qa,null,2)+'\n');
const unresolvedByStageSubject={};for(const u of qa.unresolved){const k=`${u.stage}|${u.subject}`;unresolvedByStageSubject[k]=(unresolvedByStageSubject[k]||0)+1}
console.log(JSON.stringify({release:'6.18.2',strictQuestionCountReconciliation:'PASS',verified:qa.summary.verified,pending:qa.summary.pending,revokedCrossSubject,revokedWeakSequence,revokedWeakTail,filenameVerified,sourceIdentityVerified,unresolvedByStageSubject}));
