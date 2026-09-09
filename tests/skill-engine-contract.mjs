import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../ui/skill-engine.js',import.meta.url),'utf8');
const context={window:{AW_BANK:[]},console};vm.createContext(context);vm.runInContext(code,context);
const engine=context.window.__AW_SKILL_ENGINE;
if(!engine||engine.version!=='y2-y4-v1')throw new Error('Stage-aware skill engine unavailable');
const expectedActiveStages=['icas-y2','icas-y3','naplan-y3','icas-y4'];
if(JSON.stringify(engine.activeStages)!==JSON.stringify(expectedActiveStages))throw new Error(`Unexpected active stages: ${JSON.stringify(engine.activeStages)}`);
if(engine.activeStages.includes('oc-prep'))throw new Error('OC native stage must not be active');

const subjects=[['English',4,'ENG'],['Mathematics',4,'MATH'],['Science',4,'SCI'],['Spelling',3,'SPELL']];
function makeSet(stage='icas-y2',tag='base'){
  const bank=[],existing=[];
  for(const [subject,count,prefix] of subjects){
    for(let i=0;i<8;i++){
      const q={id:`${tag}-${prefix}-${i}`,subject,kind:subject==='Spelling'?'audio':(i===0?'visual':'text'),subskill:i<count?'Mastered skill':'Unexplored skill',family:`${tag}-${prefix}-${i}`,stage};
      bank.push(q);if(i<count)existing.push(q);
    }
  }
  return {bank,existing};
}
function subjectMix(out){return Object.fromEntries(subjects.map(([subject])=>[subject,out.filter(q=>q.subject===subject).length]))}
function stageProfile(out){const p={};for(const q of out){const s=engine.stageOf(q);p[s]=(p[s]||0)+1}return p}
function assertCore(existing,out,label){
  if(out.length!==15)throw new Error(`${label}: expected 15 questions, got ${out.length}`);
  const mix=subjectMix(out);for(const [subject,count] of subjects)if(mix[subject]!==count)throw new Error(`${label}: subject mix changed for ${subject}`);
  if(out.filter(q=>q.kind==='visual').length!==existing.filter(q=>q.kind==='visual').length)throw new Error(`${label}: visual profile changed`);
  if(new Set(out.map(q=>q.id)).size!==15)throw new Error(`${label}: duplicate question IDs`);
  if(new Set(out.map(q=>q.family)).size!==15)throw new Error(`${label}: duplicate families`);
}
function rebalanceSet(stage,tag){
  const {bank,existing}=makeSet(stage,tag),p={seenIds:existing.map(q=>q.id),skillStats:{}};
  const out=engine.rebalance(existing,bank,p,1,{familyKey:q=>q.family,recent:new Set()});
  assertCore(existing,out,tag);
  if(JSON.stringify(stageProfile(out))!==JSON.stringify(stageProfile(existing)))throw new Error(`${tag}: stage profile changed`);
  if(!out.some(q=>q.subskill==='Unexplored skill'))throw new Error(`${tag}: skill prioritisation did not prefer unexplored skills`);
  return {bank,existing,out};
}

const y2=rebalanceSet('icas-y2','y2');
const y3=rebalanceSet('icas-y3','y3');
const n3=rebalanceSet('naplan-y3','n3');
const y4=rebalanceSet('icas-y4','y4');
if(!engine.skillId(y2.out[0]).startsWith('Y2.'))throw new Error('Year 2 skill ID incorrect');
if(!engine.skillId(y3.out[0]).startsWith('Y3.'))throw new Error('ICAS Year 3 skill ID incorrect');
if(!engine.skillId(n3.out[0]).startsWith('Y3.'))throw new Error('NAPLAN Year 3 skill ID incorrect');
if(!engine.skillId(y4.out[0]).startsWith('Y4.'))throw new Error('ICAS Year 4 skill ID incorrect');

const mixedBase=makeSet('icas-y2','mixed');
const cycle=['icas-y2','icas-y3','naplan-y3','icas-y4'];
const mixedExisting=mixedBase.existing.map((q,i)=>({...q,stage:cycle[i%cycle.length],family:`mix-slot-${i}`,id:`mix-slot-${i}`}));
const mixedBank=[...mixedExisting];
for(let i=0;i<mixedExisting.length;i++){
  const slot=mixedExisting[i];
  mixedBank.push({...slot,id:`mix-alt-${i}`,family:`mix-alt-${i}`,subskill:'Unexplored skill'});
  const wrongStage=cycle[(cycle.indexOf(slot.stage)+1)%cycle.length];
  mixedBank.push({...slot,id:`mix-wrong-${i}`,family:`mix-wrong-${i}`,stage:wrongStage,subskill:'Unexplored skill'});
}
const mixedProgress={seenIds:mixedExisting.map(q=>q.id),skillStats:{}};
const mixedOut=engine.rebalance(mixedExisting,mixedBank,mixedProgress,2,{familyKey:q=>q.family,recent:new Set()});
assertCore(mixedExisting,mixedOut,'mixed-stage');
const beforeProfile=stageProfile(mixedExisting),afterProfile=stageProfile(mixedOut);
if(JSON.stringify(beforeProfile)!==JSON.stringify(afterProfile))throw new Error(`Mixed-stage quotas changed: ${JSON.stringify(beforeProfile)} -> ${JSON.stringify(afterProfile)}`);
for(let i=0;i<mixedOut.length;i++)if(engine.stageOf(mixedOut[i])!==engine.stageOf(mixedExisting[i]))throw new Error(`Slot ${i} crossed learning stages`);

const oc=makeSet('oc-prep','oc');
const ocBank=[...oc.bank,...oc.existing.map((q,i)=>({...q,id:`oc-alt-${i}`,family:`oc-alt-${i}`,subskill:'Unexplored skill'}))];
const ocOut=engine.rebalance(oc.existing,ocBank,{seenIds:oc.existing.map(q=>q.id),skillStats:{}},3,{familyKey:q=>q.family,recent:new Set()});
if(ocOut.some((q,i)=>q.id!==oc.existing[i].id))throw new Error('OC native slots changed before OC activation');

const bad=engine.rebalance(y2.existing.slice(0,14),y2.bank,{seenIds:[],skillStats:{}},1,{familyKey:q=>q.family,recent:new Set()});
if(bad.length!==14||bad.some((q,i)=>q!==y2.existing[i]))throw new Error('Legacy fallback contract failed');

const fnv=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const required={English:6,Mathematics:6,Science:6};
const plan=engine.coveragePlan('aw-topup-10-10-10-10-0',y2.bank,{skillStats:{}},required);
if(!/-sg[0-9a-z]+$/.test(plan.requestKey))throw new Error('Coverage request nonce missing');
for(const subject of ['English','Mathematics','Science']){
  const focus=plan.focusSubskills[subject];
  if(focus.length!==6)throw new Error(`Expected 6 Year 2 coverage targets for ${subject}`);
  const offset=fnv(`${plan.requestKey}|${subject}|recipe`)%12;
  focus.forEach((target,i)=>{const mode=Number(target.match(/\|mode:(\d+)$/)?.[1]);if(mode!==(offset+i)%12)throw new Error(`Recipe alignment failed for ${subject} slot ${i}`);if(!/^Y2\./.test(target))throw new Error(`Year 2 coverage skill ID missing for ${subject}`)});
}
const explicitY2={subject:'Mathematics',stage:'icas-y2',subskill:'legacy label',quality:{focus:plan.focusSubskills.Mathematics[0]}};
if(!engine.skillId(explicitY2).startsWith('Y2.MATH.'))throw new Error('Explicit Year 2 coverage skill ID was not recovered');
if(!engine.skillId({subject:'Mathematics',stage:'icas-y3',subskill:'fractions'}).startsWith('Y3.MATH.'))throw new Error('Derived Year 3 skill ID failed');
if(!engine.skillId({subject:'Mathematics',stage:'icas-y4',subskill:'fractions'}).startsWith('Y4.MATH.'))throw new Error('Derived Year 4 skill ID failed');

const stageMap=JSON.parse(fs.readFileSync(new URL('../bank/stage-skill-framework-map-v1.json',import.meta.url),'utf8'));
if(stageMap.activation!=='stage_gated'||JSON.stringify(stageMap.activeStages)!==JSON.stringify(expectedActiveStages))throw new Error('Stage activation map mismatch');
if(stageMap.stages['oc-prep'].status!=='framework_only')throw new Error('OC stage activation leaked');

const patch=fs.readFileSync(new URL('../scripts/patch-v6.18.2-skill-graph.mjs',import.meta.url),'utf8');
for(const marker of ['awLegacyPick','__AW_SKILL_BALANCE_READY=true','__AW_SKILL_BALANCE_READY===true',"selector:'STAGE_WEIGHTED_THEN_SKILL_AWARE'",'dailyQuestionCount:15',"historicalPapers:'UNCHANGED'",'COVERAGE_PLANNER_WIRED_EXISTING_RECIPES_ONLY',"supabaseFunctions:'UNCHANGED'",'directPublish:false'])if(!patch.includes(marker))throw new Error(`Patch contract missing ${marker}`);
if(!patch.includes('awSkillReady?')||!patch.includes(':awLegacyPick'))throw new Error('Skill-aware selector must retain legacy fail-safe fallback');
if(!patch.includes('req.coverageFocusSubskills||Object.fromEntries'))throw new Error('Governed Year 2 coverage focus must flow into existing Question Factory payload');
if(!code.includes("stageOf(q)!==stageOf(slot)"))throw new Error('Same-stage replacement guard missing');
if(!code.includes('sameProfile(originalStages,stageProfile(chosen))'))throw new Error('Stage quota preservation guard missing');
if(!code.includes("stageOf(q)==='icas-y2'"))throw new Error('Question Factory coverage planner must remain scoped to Year 2 recipes');
if(patch.includes('service_role')||patch.includes('SUPABASE_SERVICE_ROLE'))throw new Error('Privileged Supabase credentials must not enter browser/runtime patch');
console.log(JSON.stringify({skillEngine:'PASS',version:engine.version,dailyCount:15,mix:{English:4,Mathematics:4,Science:4,Spelling:3},runtimeActiveGrades:[2,3,4],activeStages:engine.activeStages,stageQuotaPreservation:'PASS',sameStageReplacement:'PASS',ocNativeStage:'UNCHANGED',legacyFallback:'PASS',visualProfile:'PASS',historicalIsolation:'PASS',year2CoveragePlanner:'WIRED_EXISTING_RECIPES_ONLY',year3Year4QuestionFactory:'NOT_ACTIVATED',supabaseFunctions:'UNCHANGED'}));
