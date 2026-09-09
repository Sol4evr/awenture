import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'dist','stage-papers','catalog.json');
const outPath=path.join(root,'dist','stage-papers','answer-resource-candidates-v1.json');
if(!fs.existsSync(catalogPath))throw new Error('answer-resource diagnostic requires built stage catalog');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]).filter(p=>p.subject!=='Writing');
function walk(dir,out=[]){if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.toLowerCase().endsWith('.pdf'))out.push(p)}return out}
function rel(p){return path.relative(root,p).split(path.sep).join('/')}
function norm(s){return String(s||'').toLowerCase().replace(/[–—]/g,'-').replace(/answers?|questions?|answer key|answer sheet|solutions?|explanations?/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function year(s){return String(s).match(/(?:19|20)\d{2}/)?.[0]||''}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}
const all=walk(path.join(root,'source')).map(abs=>({abs,sourcePath:rel(abs),base:path.basename(abs),dir:path.dirname(rel(abs)),n:norm(path.basename(abs)),year:year(path.basename(abs))}));
const answerish=all.filter(x=>/answer|solution|explanation/i.test(x.base));
const candidates=[];
for(const p of papers){
  const lp={sourcePath:p.sourcePath,base:path.basename(p.sourcePath),dir:path.dirname(p.sourcePath),n:norm(path.basename(p.sourcePath)),year:year(path.basename(p.sourcePath))};
  const matches=answerish.filter(a=>{
    if(a.sourcePath===p.sourcePath)return false;
    if(a.dir===lp.dir&&a.n===lp.n)return true;
    if(p.stage==='oc-prep'&&a.dir===lp.dir&&a.year===lp.year&&a.n===lp.n)return true;
    if(p.stage==='naplan-y3'&&a.year===lp.year&&/year[ _-]?3|year 3/i.test(a.sourcePath)&&a.n===lp.n)return true;
    return false;
  });
  if(matches.length){
    const abs=path.join(root,p.sourcePath);candidates.push({id:p.id,learnerSourcePath:p.sourcePath,learnerSha256:fs.existsSync(abs)?sha(abs):null,stage:p.stage,subject:p.subject,year:p.year??null,matchType:'exact-normalized-companion-candidate',automaticPromotion:false,answerResources:matches.map(a=>({sourcePath:a.sourcePath,sourceSha256:sha(a.abs)}))});
  }
}
fs.writeFileSync(outPath,JSON.stringify({version:'aw-stage-answer-resource-candidates-v1',release:'6.18.2',policy:{candidateOnly:true,automaticPromotion:false,dualShaRequiredForReview:true,independentMappingCrossCheckRequired:true},summary:{objectivePapers:papers.length,papersWithExactCompanionCandidates:candidates.length,totalCandidateResources:candidates.reduce((n,x)=>n+x.answerResources.length,0)},candidates},null,2)+'\n');
console.log(JSON.stringify({release:'6.18.2',answerResourceDiagnostic:'PASS',objectivePapers:papers.length,papersWithExactCompanionCandidates:candidates.length,totalCandidateResources:candidates.reduce((n,x)=>n+x.answerResources.length,0),automaticPromotion:false}));
