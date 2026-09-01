import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file=fileURLToPath(new URL('../bank/v6.11.0-approved.json',import.meta.url));
const items=JSON.parse(fs.readFileSync(file,'utf8'));
const SUBJECTS=['English','Mathematics','Science'];
const LETTERS='ABCD';
const banned=[/all of the above/i,/none of the above/i,/obviously/i,/placeholder/i,/todo/i,/lorem ipsum/i];

function fail(msg){throw new Error(`Expansion quality gate: ${msg}`)}
function tokens(s){return new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>3))}
function jaccard(a,b){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/(A.size+B.size-hit)}

if(!Array.isArray(items)||items.length!==45)fail(`expected 45 approved items, got ${items?.length}`);
const ids=new Set(),families=new Set();
for(const q of items){
  for(const k of ['id','subject','skill','subskill','family','question','options','answer','explanation','stimulus','kind','visual','quality'])if(q[k]===undefined)fail(`${q.id||'unknown'} missing ${k}`);
  if(ids.has(q.id))fail(`duplicate id ${q.id}`); ids.add(q.id);
  if(families.has(`${q.subject}|${q.family}`))fail(`duplicate family ${q.subject}|${q.family}`); families.add(`${q.subject}|${q.family}`);
  if(!SUBJECTS.includes(q.subject))fail(`${q.id} invalid subject`);
  if(!Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4)fail(`${q.id} must have four unique options`);
  if(!LETTERS.includes(q.answer))fail(`${q.id} invalid answer`);
  if(String(q.question).length<18)fail(`${q.id} question stem too thin`);
  if(`${q.question} ${q.stimulus}`.trim().length<42)fail(`${q.id} lacks sufficient assessment context`);
  if(String(q.explanation).length<35)fail(`${q.id} explanation too thin`);
  if(![3,4].includes(q.difficulty))fail(`${q.id} expansion must target difficulty 3–4`);
  if(q.kind==='visual' && (!q.visual.includes('<svg')||!q.visual.includes('role="img"')))fail(`${q.id} visual item missing accessible SVG`);
  if(q.kind!=='visual' && q.visual)fail(`${q.id} text item unexpectedly contains visual payload`);
  if(q.quality?.standard!=='ICAS-style'||q.quality?.review!=='expert-reviewed'||!q.quality?.focus)fail(`${q.id} missing quality provenance`);
  const combined=[q.question,...q.options,q.explanation].join(' ');
  if(banned.some(r=>r.test(combined)))fail(`${q.id} contains low-quality placeholder language`);
}
for(const s of SUBJECTS){
  const rows=items.filter(q=>q.subject===s);
  if(rows.length!==15)fail(`${s} expected 15 items, got ${rows.length}`);
  if(rows.filter(q=>q.kind==='visual').length<3)fail(`${s} needs at least three visual/data items`);
  if(new Set(rows.map(q=>q.skill)).size<4)fail(`${s} lacks skill breadth`);
}
for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  if(items[i].subject!==items[j].subject)continue;
  const sim=jaccard(`${items[i].question} ${items[i].stimulus}`,`${items[j].question} ${items[j].stimulus}`);
  if(sim>.72)fail(`semantic sibling risk ${items[i].id}/${items[j].id} (${sim.toFixed(2)})`);
}
console.log(JSON.stringify({approved:items.length,subjects:Object.fromEntries(SUBJECTS.map(s=>[s,items.filter(q=>q.subject===s).length])),visuals:items.filter(q=>q.kind==='visual').length,semanticSiblingGate:'PASS',schemaGate:'PASS',qualityProvenance:'PASS'}));
