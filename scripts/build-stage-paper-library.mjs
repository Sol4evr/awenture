import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=path.join(root,'source');
const outRoot=path.join(root,'dist','stage-papers');
const proxyManifestPath=path.join(root,'api','paper-manifest.json');
fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});

const stageLabels={
  'icas-y3':'ICAS Year 3',
  'naplan-y3':'NAPLAN Year 3',
  'icas-y4':'ICAS Year 4',
  'oc-prep':'Opportunity Class'
};
const requiredSubjects={
  'icas-y3':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'icas-y4':['Digital Technologies','English','Mathematics','Science','Spelling','Writing'],
  'naplan-y3':['Language Conventions','Numeracy','Reading','Writing'],
  'oc-prep':['Reading','Mathematical Reasoning','Thinking Skills']
};
const activeStages=new Set(Object.keys(stageLabels));
const delivery='github-source-proxy-v2-allowlist';

function walk(dir,out=[]){
  if(!fs.existsSync(dir))return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p,out);
    else if(ent.isFile()&&ent.name.toLowerCase().endsWith('.pdf'))out.push(p);
  }
  return out;
}
function rel(p){return path.relative(root,p).split(path.sep).join('/')}
function norm(s){return String(s||'').toLowerCase().replace(/[–—]/g,'-')}
function yearOf(s){const m=String(s).match(/(?:19|20)\d{2}/);return m?Number(m[0]):null}
function stageOf(r){
  const n=norm(r);
  if(n.includes('source/original-icas/year3/'))return 'icas-y3';
  if(n.includes('source/original-icas/year4/'))return 'icas-y4';
  if(n.includes('source/oc/'))return 'oc-prep';
  if(n.includes('source/naplan/')&&(/year[ _-]?3/.test(n)||/year 3/.test(n)))return 'naplan-y3';
  return null;
}
function subjectOf(r){
  const n=norm(r);
  if(n.includes('thinking'))return 'Thinking Skills';
  if(n.includes('mathematical reasoning'))return 'Mathematical Reasoning';
  if(n.includes('language convention'))return 'Language Conventions';
  if(n.includes('numeracy'))return 'Numeracy';
  if(n.includes('reading'))return 'Reading';
  if(n.includes('writing'))return 'Writing';
  if(n.includes('english'))return 'English';
  if(n.includes('math'))return 'Mathematics';
  if(n.includes('science'))return 'Science';
  if(n.includes('spell'))return 'Spelling';
  if(n.includes('digital'))return 'Digital Technologies';
  return 'Other';
}
function provenanceOf(r){
  const n=norm(r);
  if(n.includes('/braintree'))return 'Braintree';
  if(n.includes('/oc/'))return 'Official / sample';
  if(n.includes('/naplan/'))return 'NAPLAN source';
  return 'ICAS source';
}
function isLfsPointer(p){
  const fd=fs.openSync(p,'r');const b=Buffer.alloc(160);const n=fs.readSync(fd,b,0,b.length,0);fs.closeSync(fd);
  return b.subarray(0,n).toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1');
}
function isPdf(p){
  const fd=fs.openSync(p,'r');const b=Buffer.alloc(5);const n=fs.readSync(fd,b,0,5,0);fs.closeSync(fd);
  return n===5&&b.toString('ascii')==='%PDF-';
}
function excludedResource(name){
  const n=norm(name);
  return /answer|solution|explanation|worked|marking|mark scheme|report|magazine|materials|large print|black and white|rubric|criteria|commentary|transcript|audio|certificate|results/.test(n);
}
function explicitQuestion(name){return /question|test|paper|prompt|sample|practice|assessment/.test(norm(name))&&!excludedResource(name)}
function safeQuestionFile(p,stage){
  const name=path.basename(p),r=norm(rel(p));
  if(excludedResource(name))return false;
  if(stage==='icas-y3'||stage==='icas-y4')return subjectOf(r)!=='Other';
  if(stage==='oc-prep')return explicitQuestion(name);
  if(stage==='naplan-y3'){
    if(!/year[ _-]?3|year 3/.test(r))return false;
    return /language convention|numeracy|reading|writing prompt|writing test/.test(norm(name))||explicitQuestion(name);
  }
  return false;
}
function titleFor(p,subject){
  const y=yearOf(path.basename(p));
  const base=path.basename(p,'.pdf').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
  return y?`${y} ${subject}`:`${subject} · ${base}`;
}
function paperId(r){return crypto.createHash('sha1').update(r).digest('hex').slice(0,16)}
function paperUrl(id){return `/api/paper?id=${encodeURIComponent(id)}`}

const files=walk(sourceRoot);
const catalog={release:'6.18.2',mode:'stage-formal-lite-v2',delivery,generatedAtBuild:true,requiredSubjects,stages:{},summary:{sourcePdfs:files.length,activated:0,pending:0,ignoredFuture:0,deployedPdfCopies:0}};
for(const id of activeStages)catalog.stages[id]={id,label:stageLabels[id],papers:[],pending:0,subjects:requiredSubjects[id]};

for(const p of files){
  const r=rel(p),stage=stageOf(r);
  if(!stage||!activeStages.has(stage)){catalog.summary.ignoredFuture++;continue}
  if(isLfsPointer(p))throw new Error(`Git LFS object was not materialized before stage-paper build: ${r}`);
  if(!safeQuestionFile(p,stage)){
    catalog.stages[stage].pending++;catalog.summary.pending++;continue;
  }
  if(!isPdf(p)){
    catalog.stages[stage].pending++;catalog.summary.pending++;continue;
  }
  const subject=subjectOf(r),id=paperId(r);
  catalog.stages[stage].papers.push({
    id,stage,subject,year:yearOf(path.basename(p)),title:titleFor(p,subject),
    sourcePath:r,assetPath:paperUrl(id),pageCount:null,
    delivery,scoring:'source-review',answerReference:false,provenance:provenanceOf(r),viewer:'lite-url-pdfjs'
  });
  catalog.summary.activated++;
}
for(const [stage,st] of Object.entries(catalog.stages)){
  st.papers.sort((a,b)=>(requiredSubjects[stage].indexOf(a.subject)-requiredSubjects[stage].indexOf(b.subject))||((a.year||0)-(b.year||0))||a.sourcePath.localeCompare(b.sourcePath));
  const present=new Set(st.papers.map(p=>p.subject));
  st.missingSubjects=requiredSubjects[stage].filter(s=>!present.has(s));
}
const proxyPapers={};for(const st of Object.values(catalog.stages))for(const p of st.papers)proxyPapers[p.id]=p.sourcePath;
if(Object.keys(proxyPapers).length!==catalog.summary.activated)throw new Error('Paper proxy manifest ID collision detected');
fs.mkdirSync(path.dirname(proxyManifestPath),{recursive:true});
fs.writeFileSync(proxyManifestPath,JSON.stringify({version:'aw-paper-proxy-manifest-v1',delivery,generatedAtBuild:true,papers:proxyPapers},null,2)+'\n');
fs.writeFileSync(path.join(outRoot,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({stagePaperLibrary:'PASS',mode:catalog.mode,delivery,proxyAllowlist:Object.keys(proxyPapers).length,...catalog.summary,stages:Object.fromEntries(Object.entries(catalog.stages).map(([k,v])=>[k,{activated:v.papers.length,pending:v.pending,missingSubjects:v.missingSubjects}]))}));
