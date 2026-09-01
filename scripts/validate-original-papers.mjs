import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source/icas-y2-original-papers.json'),'utf8'));
const papers=manifest.papers||[];
if(!papers.length) throw new Error('No authorised original ICAS papers registered');

const folderFor={English:'english',Mathematics:'mathematics',Science:'science'};
const keys=new Set(), hashes=new Set(), sourcePaths=new Set(), resolved=[];
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

  const folder=folderFor[p.subject];
  if(!folder) throw new Error(`Unsupported original-paper subject: ${p.subject}`);
  const dir=path.join(root,'source','original-icas','year2',folder);
  if(!fs.existsSync(dir)) throw new Error(`Missing original-paper directory: ${dir}`);
  const matches=fs.readdirSync(dir).filter(name=>name.toLowerCase().endsWith('.pdf')&&name.startsWith(String(p.year)+' '));
  if(matches.length!==1) throw new Error(`Expected exactly one uploaded PDF for ${key}, found ${matches.length}`);
  const file=path.join(dir,matches[0]);
  const bytes=fs.readFileSync(file);
  const digest=crypto.createHash('sha256').update(bytes).digest('hex');
  if(bytes.length!==p.bytes) throw new Error(`Byte-size mismatch for ${key}: expected ${p.bytes}, got ${bytes.length}`);
  if(digest!==p.sha256) throw new Error(`SHA-256 mismatch for ${key}: expected ${p.sha256}, got ${digest}`);
  resolved.push({subject:p.subject,year:p.year,file:matches[0],bytes:bytes.length,sha256:digest});
}

const bySubject={};
for(const p of papers)(bySubject[p.subject]??=[]).push(p.year);
for(const [subject,years] of Object.entries(bySubject)){
  if(new Set(years).size!==years.length) throw new Error(`Year overlap within ${subject}`);
}
if(papers.length!==21||bySubject.English?.length!==8||bySubject.Mathematics?.length!==8||bySubject.Science?.length!==5) throw new Error('Authorised Year-2 paper inventory must remain 8 English + 8 Mathematics + 5 Science');
if(manifest.rules?.noQuestionOverlapAcrossFormalPapers!==true) throw new Error('Formal no-overlap policy must be enabled');
if(manifest.rules?.noSourceFingerprintReuseAcrossFormalPapers!==true) throw new Error('Source fingerprint reuse gate must be enabled');

console.log(JSON.stringify({
  release:manifest.release,
  originalPapers:papers.length,
  subjects:Object.fromEntries(Object.entries(bySubject).map(([s,ys])=>[s,ys.length])),
  exactBinaryFingerprintsVerified:resolved.length,
  uniqueSourceFingerprints:hashes.size,
  sourceOverlapGate:'PASS',
  formalQuestionOverlapPolicy:'ZERO'
},null,2));
