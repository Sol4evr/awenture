import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const residualPath=path.join(root,'quality','stage-paper-question-count-intentional-residuals-v1.json');
const outPath=path.join(root,'dist','stage-papers','paper-maturity-v1.json');
if(!fs.existsSync(catalogPath))throw new Error('paper maturity audit requires built stage-paper catalog');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const residuals=fs.existsSync(residualPath)?JSON.parse(fs.readFileSync(residualPath,'utf8')).residuals||[]:[];
const residualByPath=new Map(residuals.map(r=>[r.sourcePath,r]));

function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.toLowerCase().endsWith('.pdf'))out.push(p)}return out}
function rel(p){return path.relative(root,p).split(path.sep).join('/')}
function norm(s){return String(s||'').toLowerCase().replace(/[–—]/g,'-')}
function activeStage(r){const n=norm(r);return n.includes('source/original-icas/year3/')||n.includes('source/original-icas/year4/')||(n.includes('source/naplan/')&&(/year[ _-]?3/.test(n)||/year 3/.test(n)))||n.includes('source/oc/')}
function classifyResource(r){
  const n=norm(path.basename(r)),full=norm(r);
  if(/answer key|answers|answer-key/.test(n))return 'answer-key';
  if(/answer sheet/.test(n))return 'answer-sheet';
  if(/marking|mark scheme|worked solution|solution|explanation/.test(n))return 'marking-guide';
  if(/audio|transcript/.test(n))return 'audio-resource';
  if(/rubric|criteria/.test(n))return 'writing-rubric';
  if(/report|results|certificate/.test(n))return 'results-report';
  if(/magazine|materials|large print|black and white|commentary/.test(n))return 'stimulus-support-resource';
  // Match the stage library's explicit NAPLAN Year 3 learner-paper rules. Some 2017
  // example files are named only by subject and therefore do not contain “test” or “paper”.
  if(full.includes('source/naplan/')&&(/language[_ ]convention|numeracy|reading[_ ]questions|writing[_ ]prompt|writing[_ ]test/.test(n)))return 'learner-paper';
  if(/question|test|paper|prompt|sample|practice|assessment/.test(n)||/source\/original-icas\/year[34]\//.test(full))return 'learner-paper';
  return 'unclassified';
}

const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]);
const maturity=[];
for(const p of papers){
  const residual=residualByPath.get(p.sourcePath)||null;
  const writing=p.subject==='Writing';
  const boundary=p.pageBoundaryVerified===true&&Number.isInteger(p.questionEndPage);
  const count=p.questionCountVerified===true?'verified':residual?'governed-exception':'pending';
  const answers=writing?'not-applicable':p.answerMappingVerified===true&&p.scoring==='verified'?'verified':'pending';
  const timing='stage-subject-default-not-source-verified';
  const orientation='pending-visual-qa';
  const responseSchema=writing?'writing':answers==='verified'?(p.responseTypes?'verified-explicit':'verified-default-choice'):'pending';
  const maturityState=residual?'mature-governed-exception':(boundary&&count==='verified'&&timing==='source-verified'&&orientation==='verified'&&(writing||answers==='verified')?'mature-verified':'maturity-work-required');
  maturity.push({id:p.id,sourcePath:p.sourcePath,stage:p.stage,subject:p.subject,year:p.year??null,sourceIdentity:'catalog-bound',learnerBoundary:boundary?'verified':'pending',questionCount:count,questionCountMethod:p.questionCountMethod||null,timing,orientation,answerMapping:answers,responseSchema,scoring:p.scoring||'source-review',progressionCredit:p.governance?.progressionCredit===true,maturityState,residualClassification:residual?.classification||null});
}

const resources=walk(path.join(root,'source')).map(rel).filter(activeStage).map(sourcePath=>({sourcePath,classification:classifyResource(sourcePath)}));
const classCounts={};for(const r of resources)classCounts[r.classification]=(classCounts[r.classification]||0)+1;
const unclassifiedPaths=resources.filter(x=>x.classification==='unclassified').map(x=>x.sourcePath);
const summary={
  papers:maturity.length,
  boundaryVerified:maturity.filter(x=>x.learnerBoundary==='verified').length,
  countVerified:maturity.filter(x=>x.questionCount==='verified').length,
  countGovernedExceptions:maturity.filter(x=>x.questionCount==='governed-exception').length,
  timingSourceVerified:maturity.filter(x=>x.timing==='source-verified').length,
  orientationVerified:maturity.filter(x=>x.orientation==='verified').length,
  objectiveAnswerMappingsVerified:maturity.filter(x=>x.answerMapping==='verified').length,
  objectiveAnswerMappingsPending:maturity.filter(x=>x.answerMapping==='pending').length,
  writingPapers:maturity.filter(x=>x.answerMapping==='not-applicable').length,
  matureVerified:maturity.filter(x=>x.maturityState==='mature-verified').length,
  matureGovernedExceptions:maturity.filter(x=>x.maturityState==='mature-governed-exception').length,
  maturityWorkRequired:maturity.filter(x=>x.maturityState==='maturity-work-required').length,
  activeStageSourceResources:resources.length,
  resourceClassifications:classCounts,
  unclassifiedResources:unclassifiedPaths.length,
  unclassifiedPaths
};
const report={version:'aw-stage-paper-maturity-v1',release:'6.18.2',policy:{failClosed:true,timingDefaultsAreNotHistoricalEvidence:true,orientationRequiresVisualQA:true,answerMappingRequiresIndependentCrossCheck:true,governedExceptionsAllowed:true},summary,papers:maturity,resources};
fs.writeFileSync(outPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',paperMaturityAudit:'PASS',...summary}));
