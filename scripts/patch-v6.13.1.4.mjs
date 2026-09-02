import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'dist/index.html');
let html=fs.readFileSync(file,'utf8');

const oldBlock=`  const vis=out.map((q,i)=>q.kind==='visual'?i:-1).filter(i=>i>=0);if(vis.length>2){for(const i of vis.slice(2)){const rep=shuffle(BANK.filter(q=>q.subject===out[i].subject&&q.kind!=='visual'&&!seen.has(q.id)&&!out.some((x,j)=>j!==i&&x.id===q.id)&&!used.has(familyKey(q))),sd+i*41)[0];if(rep){used.delete(familyKey(out[i]));out[i]=rep;used.add(familyKey(rep))}}}\n  window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle(out.slice(0,12),sd+173);`;

const newBlock=`  const unsafeVisualIds=new Set(['M09','M18','M19','M23','M26','M31']);\n  for(let i=0;i<out.length;i++){if(out[i].kind==='visual'&&unsafeVisualIds.has(out[i].id)){const rep=shuffle(BANK.filter(q=>q.subject===out[i].subject&&q.kind!=='visual'&&!seen.has(q.id)&&!out.some((x,j)=>j!==i&&x.id===q.id)&&!used.has(familyKey(q))),sd+i*37)[0];if(rep){used.delete(familyKey(out[i]));out[i]=rep;used.add(familyKey(rep))}}}\n  let vis=out.map((q,i)=>q.kind==='visual'?i:-1).filter(i=>i>=0);\n  const visualTarget=3,visualMax=4;\n  if(vis.length<visualTarget){for(let i=0;i<out.length&&vis.length<visualTarget;i++){if(out[i].kind==='visual')continue;const rep=shuffle(BANK.filter(q=>q.subject===out[i].subject&&q.kind==='visual'&&!unsafeVisualIds.has(q.id)&&!seen.has(q.id)&&!out.some((x,j)=>j!==i&&x.id===q.id)&&!used.has(familyKey(q))&&!recent.has(familyKey(q))),sd+i*43)[0]||shuffle(BANK.filter(q=>q.subject===out[i].subject&&q.kind==='visual'&&!unsafeVisualIds.has(q.id)&&!seen.has(q.id)&&!out.some((x,j)=>j!==i&&x.id===q.id)&&!used.has(familyKey(q))),sd+i*47)[0];if(rep){used.delete(familyKey(out[i]));out[i]=rep;used.add(familyKey(rep));vis=out.map((q,j)=>q.kind==='visual'?j:-1).filter(j=>j>=0)}}}\n  if(vis.length>visualMax){for(const i of vis.slice(visualMax)){const rep=shuffle(BANK.filter(q=>q.subject===out[i].subject&&q.kind!=='visual'&&!seen.has(q.id)&&!out.some((x,j)=>j!==i&&x.id===q.id)&&!used.has(familyKey(q))),sd+i*53)[0];if(rep){used.delete(familyKey(out[i]));out[i]=rep;used.add(familyKey(rep))}}}\n  window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle(out.slice(0,12),sd+173);`;

if(!html.includes(oldBlock))throw new Error('Daily visual selector marker not found');
html=html.replace(oldBlock,newBlock);
html=html.replaceAll('6.13.1.3','6.13.1.4').replaceAll('61313','61314');
fs.writeFileSync(file,html);
console.log(JSON.stringify({release:'6.13.1.4',dailyVisualTarget:3,dailyVisualMax:4,quarantinedVisualIds:['M09','M18','M19','M23','M26','M31']}));
