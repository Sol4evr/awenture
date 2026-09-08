import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../ui/skill-engine.js',import.meta.url),'utf8');
const context={window:{AW_BANK:[]},console};vm.createContext(context);vm.runInContext(code,context);
const engine=context.window.__AW_SKILL_ENGINE;
if(!engine||engine.version!=='y2-v1')throw new Error('Skill engine unavailable');
const subjects=[['English',4],['Mathematics',4],['Science',4],['Spelling',3]];
const bank=[],existing=[];
for(const [subject,count] of subjects){for(let i=0;i<8;i++){const q={id:`${subject[0]}${i}`,subject,kind:subject==='Spelling'?'audio':(i===0?'visual':'text'),subskill:i<4?'Mastered skill':'Unexplored skill',family:`${subject}-${i}`};bank.push(q);if(i<count)existing.push(q)}}
const p={seenIds:existing.map(q=>q.id),skillStats:{'English|Mastered skill':{a:8,c:8},'Mathematics|Mastered skill':{a:8,c:8},'Science|Mastered skill':{a:8,c:8},'Spelling|Mastered skill':{a:8,c:8}}};
const out=engine.rebalance(existing,bank,p,1,{familyKey:q=>q.family,recent:new Set()});
if(out.length!==15)throw new Error(`Expected 15 questions, got ${out.length}`);
for(const [subject,count] of subjects)if(out.filter(q=>q.subject===subject).length!==count)throw new Error(`Subject mix changed for ${subject}`);
if(out.filter(q=>q.kind==='visual').length!==existing.filter(q=>q.kind==='visual').length)throw new Error('Visual profile changed');
if(new Set(out.map(q=>q.id)).size!==15)throw new Error('Duplicate question IDs');
if(new Set(out.map(q=>q.family)).size!==15)throw new Error('Duplicate families');
if(!out.some(q=>q.subskill==='Unexplored skill'))throw new Error('Skill prioritisation did not prefer unexplored skills');
const bad=engine.rebalance(existing.slice(0,14),bank,p,1,{familyKey:q=>q.family,recent:new Set()});
if(bad.length!==14||bad.some((q,i)=>q!==existing[i]))throw new Error('Legacy fallback contract failed');

const fnv=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const required={English:6,Mathematics:6,Science:6};
const plan=engine.coveragePlan('aw-topup-10-10-10-10-0',bank,p,required);
if(!/-sg[0-9a-z]+$/.test(plan.requestKey))throw new Error('Coverage request nonce missing');
for(const subject of ['English','Mathematics','Science']){
  const focus=plan.focusSubskills[subject];
  if(focus.length!==6)throw new Error(`Expected 6 coverage targets for ${subject}`);
  const offset=fnv(`${plan.requestKey}|${subject}|recipe`)%12;
  focus.forEach((target,i)=>{const mode=Number(target.match(/\|mode:(\d+)$/)?.[1]);if(mode!==(offset+i)%12)throw new Error(`Recipe alignment failed for ${subject} slot ${i}: ${mode} vs ${(offset+i)%12}`);if(!/^Y2\./.test(target))throw new Error(`Skill ID missing for ${subject}`)});
}
const explicit={subject:'Mathematics',subskill:'legacy label',quality:{focus:plan.focusSubskills.Mathematics[0]}};
if(!engine.skillId(explicit).startsWith('Y2.MATH.'))throw new Error('Explicit coverage skill ID was not recovered from generated metadata');

const patch=fs.readFileSync(new URL('../scripts/patch-v6.18.2-skill-graph.mjs',import.meta.url),'utf8');
for(const marker of ['awLegacyPick','STAGE_WEIGHTED_PLUS_SKILL_BALANCE','dailyQuestionCount:15','historicalPapers:\'UNCHANGED\'','coveragePlan','maxCoverageBatchPerSubject:6','directPublish:false'])if(!patch.includes(marker))throw new Error(`Patch contract missing ${marker}`);
console.log(JSON.stringify({skillEngine:'PASS',dailyCount:15,mix:{English:4,Mathematics:4,Science:4,Spelling:3},legacyFallback:'PASS',visualProfile:'PASS',historicalIsolation:'PASS',coverageRecipeAlignment:'PASS',coverageBatchMaxPerSubject:6,explicitSkillMetadata:'PASS'}));
