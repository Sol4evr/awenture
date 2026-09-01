import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source/icas-y2-original-papers.json'),'utf8'));
const papers=manifest.papers||[];
if(!papers.length) throw new Error('No authorised original ICAS papers registered');

const keys=new Set(), hashes=new Set(), sourcePaths=new Set();
for(const p of papers){
  const key=`${p.subject}|${p.year}`;
  if(keys.has(key)) throw new Error(`Duplicate subject/year paper: ${key}`);
  keys.add(key);
  if(!/^[a-f0-9]{64}$/.test(p.sha256||'')) throw new Error(`Missing/invalid SHA-256: ${key}`);
  if(hashes.has(p.sha256)) throw new Error(`Duplicate source fingerprint reused: ${key}`);
  hashes.add(p.sha256);
  if(sourcePaths.has(p.sourcePath)) throw new Error(`Duplicate source path reused: ${p.sourcePath}`);
  sourcePaths.add(p.sourcePath);
  if(!Number.isInteger(p.pages)||p.pages<1) throw new Error(`Invalid page count: ${key}`);
}

const bySubject={};
for(const p of papers)(bySubject[p.subject]??=[]).push(p.year);
for(const [subject,years] of Object.entries(bySubject)){
  if(new Set(years).size!==years.length) throw new Error(`Year overlap within ${subject}`);
}

if(manifest.rules?.noQuestionOverlapAcrossFormalPapers!==true) throw new Error('Formal no-overlap policy must be enabled');
if(manifest.rules?.noSourceFingerprintReuseAcrossFormalPapers!==true) throw new Error('Source fingerprint reuse gate must be enabled');

console.log(JSON.stringify({
  release:manifest.release,
  originalPapers:papers.length,
  subjects:Object.fromEntries(Object.entries(bySubject).map(([s,ys])=>[s,ys.length])),
  uniqueSourceFingerprints:hashes.size,
  sourceOverlapGate:'PASS',
  formalQuestionOverlapPolicy:'ZERO'
},null,2));
