import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaPath=path.join(root,'dist/stage-papers/auto-question-count-verification.json');
const manifestPath=path.join(root,'quality/stage-paper-question-count-intentional-residuals-v1.json');
if(!fs.existsSync(qaPath)||!fs.existsSync(manifestPath))throw new Error('question-count residual gate inputs missing');
const qa=JSON.parse(fs.readFileSync(qaPath,'utf8'));
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.version!=='aw-stage-paper-question-count-intentional-residuals-v1')throw new Error('question-count residual manifest version mismatch');
const residuals=manifest.residuals||[];
if(residuals.length!==3)throw new Error(`expected exactly 3 governed residual catalog entries, got ${residuals.length}`);
const sha256=abs=>crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
const expectedUnresolved=Object.entries(qa.papers||{}).filter(([,e])=>!e.questionCountVerified).map(([p])=>p).sort();
const manifestPaths=residuals.map(r=>r.sourcePath).sort();
if(JSON.stringify(expectedUnresolved)!==JSON.stringify(manifestPaths))throw new Error(`unresolved set must exactly match governed residual manifest: qa=${JSON.stringify(expectedUnresolved)} manifest=${JSON.stringify(manifestPaths)}`);
const seen=new Set();
for(const r of residuals){
  if(seen.has(r.sourcePath))throw new Error(`duplicate residual path: ${r.sourcePath}`);seen.add(r.sourcePath);
  const e=qa.papers?.[r.sourcePath];if(!e)throw new Error(`residual missing from QA: ${r.sourcePath}`);
  if(e.questionCountVerified)throw new Error(`residual unexpectedly verified: ${r.sourcePath}`);
  if(r.autoScoring!==false||r.progressionCredit!==false)throw new Error(`residual must forbid scoring and progression: ${r.sourcePath}`);
  const abs=path.join(root,r.sourcePath);if(!fs.existsSync(abs))throw new Error(`residual source missing: ${r.sourcePath}`);
  if(sha256(abs)!==r.sha256)throw new Error(`residual SHA mismatch: ${r.sourcePath}`);
  if(r.classification==='intentional-discontinuous-partial'){
    if(JSON.stringify(r.presentRanges)!==JSON.stringify([[1,12],[26,40]])||JSON.stringify(r.missingRanges)!==JSON.stringify([[13,25]]))throw new Error('partial spelling ranges must remain Q1-12 and Q26-40 with Q13-25 absent');
    if(!r.sourcePath.includes('(Q1-12, Q26-40)'))throw new Error('partial spelling residual must bind the explicitly partial source file');
  }else if(r.classification==='source-binary-no-terminal-evidence'){
    if(r.sha256!=='a75990f4ae06c3617dea403d3cdd759a3ab720f7cf324c948f145ba810c1eb4a')throw new Error(`unexpected Digital 2016 residual binary: ${r.sourcePath}`);
    if(r.binaryAliasGroup!=='y3-digital-ab-2016-a75990f4')throw new Error(`Digital 2016 alias provenance missing: ${r.sourcePath}`);
  }else throw new Error(`unapproved residual classification: ${r.classification}`);
}
const verified=Object.values(qa.papers||{}).filter(e=>e.questionCountVerified).length;
const total=Object.keys(qa.papers||{}).length;
if(total!==187||verified!==184||expectedUnresolved.length!==3)throw new Error(`question-count closure must be 184 exact + 3 governed residual = 187; got verified=${verified}, residual=${expectedUnresolved.length}, total=${total}`);
console.log(JSON.stringify({release:'6.18.2',questionCountResidualClosure:'PASS',verifiedExactCounts:verified,governedResidualEntries:expectedUnresolved.length,uniqueResidualBinaries:2,total,classifications:{digital2016DuplicateBinary:2,intentionalPartialSpelling:1},autoScoring:'FORBIDDEN_FOR_RESIDUALS',progressionCredit:'FORBIDDEN_FOR_RESIDUALS',backlog:'CLOSED_WITHOUT_GUESSED_COUNTS'}));
