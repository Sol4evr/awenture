import fs from 'node:fs';
const blueprint=JSON.parse(fs.readFileSync(new URL('../quality/icas-g2-blueprint.json',import.meta.url),'utf8'));
const expansion=JSON.parse(fs.readFileSync(new URL('../bank/v6.11.0-approved.json',import.meta.url),'utf8'));
const corrections=JSON.parse(fs.readFileSync(new URL('../bank/v6.11.0-corrections.json',import.meta.url),'utf8'));
const bonus=JSON.parse(fs.readFileSync(new URL('../bank/v6.12.0-bonus.json',import.meta.url),'utf8'));
const corrected=expansion.map(q=>({...q,...(corrections[q.id]||{})}));
const subjects=['English','Mathematics','Science'];
const letters=new Set(['A','B','C','D']);
function fail(msg){throw new Error(`Assessment quality gate: ${msg}`)}
function explanationAdequate(q,bonusItem){
  const text=String(q.explanation||'').trim();
  if(!text)return false;
  if(bonusItem)return text.length>=80;
  if(text.length>=28)return true;
  return /\d/.test(text)&&/[=+\-×÷]/.test(text)&&text.length>=16;
}
function common(q,{bonusItem=false}={}){
  if(!q.id||!q.subject||!q.skill||!q.subskill||!q.family)fail(`missing metadata on ${q.id||'unknown'}`);
  if(!subjects.includes(q.subject))fail(`invalid subject ${q.id}`);
  if(!Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4)fail(`four distinct options required: ${q.id}`);
  if(!letters.has(q.answer))fail(`invalid answer key: ${q.id}`);
  if(!q.question||q.question.length<20)fail(`thin stem: ${q.id}`);
  if(!explanationAdequate(q,bonusItem))fail(`inadequate reasoning explanation: ${q.id}`);
  if(q.kind==='visual'&&(!q.visual||!q.visual.includes('<svg')||!q.visual.includes('role="img"')||!q.visual.includes('aria-label=')))fail(`accessible functional SVG required: ${q.id}`);
  if(/10:60|11:60|12:60|13:00\s*(am|pm)|14:00\s*(am|pm)/i.test(q.options.join(' ')))fail(`invalid clock distractor: ${q.id}`);
  if(!q.quality||q.quality.review!=='expert-reviewed'||!q.quality.focus)fail(`expert-review metadata missing: ${q.id}`);
  if(bonusItem&&q.difficulty!==blueprint.bonusChallenge.difficulty)fail(`bonus difficulty must be 5: ${q.id}`);
}
corrected.forEach(q=>common(q));bonus.forEach(q=>common(q,{bonusItem:true}));
if(new Set(corrected.map(q=>q.family)).size!==corrected.length)fail('duplicate construction families in core expansion');
if(new Set(bonus.map(q=>q.family)).size!==bonus.length)fail('duplicate construction families in bonus bank');
for(const s of subjects){
  if(corrected.filter(q=>q.subject===s).length<blueprint.coreExpansion.minimumQuestionsPerSubject)fail(`insufficient ${s} core expansion`);
  if(bonus.filter(q=>q.subject===s).length!==blueprint.bonusChallenge.questionsPerSubject)fail(`bonus bank must contain exactly ${blueprint.bonusChallenge.questionsPerSubject} ${s} items`);
}
const coreVisual=corrected.filter(q=>q.kind==='visual').length;if(coreVisual<blueprint.coreExpansion.minimumVisualQuestions)fail(`core expansion visual count ${coreVisual}`);
const bonusVisual=bonus.filter(q=>q.kind==='visual').length;if(bonusVisual<blueprint.bonusChallenge.minimumVisualQuestions)fail(`bonus visual count ${bonusVisual}`);
const higher=corrected.filter(q=>(q.difficulty||0)>=3).length/corrected.length;if(higher<blueprint.coreExpansion.minimumHigherOrderShare)fail(`higher-order share ${higher.toFixed(2)}`);
for(const q of [...corrected,...bonus])for(const phrase of ['all of the above','none of the above'])if(q.options.some(o=>String(o).toLowerCase().includes(phrase)))fail(`non-diagnostic option “${phrase}” in ${q.id}`);
console.log(JSON.stringify({release:blueprint.release,blueprint:blueprint.benchmark,coreExpansion:corrected.length,coreVisual,bonus:bonus.length,bonusVisual,higherOrderShare:+higher.toFixed(2),subjects:Object.fromEntries(subjects.map(s=>[s,{core:corrected.filter(q=>q.subject===s).length,bonus:bonus.filter(q=>q.subject===s).length}])),assessmentQuality:'PASS'}));
