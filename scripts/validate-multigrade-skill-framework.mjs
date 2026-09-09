import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'bank','multigrade-skill-framework-v1.json');
const year2Path=path.join(root,'bank','year2-skill-framework-v1.json');
const stageMapPath=path.join(root,'bank','stage-skill-framework-map-v1.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const year2=JSON.parse(fs.readFileSync(year2Path,'utf8'));
const stageMap=JSON.parse(fs.readFileSync(stageMapPath,'utf8'));
const expectedGrades=['F',...Array.from({length:12},(_,i)=>String(i+1))];
const expectedSubjects=['Mathematics','English','Science','Spelling'];
const expectedStrands={
  Mathematics:['Number','Algebra','Measurement','Space','Statistics','Probability'],
  English:['Language','Literature','Literacy'],
  Science:['Science understanding','Science as a human endeavour','Science inquiry'],
  Spelling:['Word knowledge']
};
const expectedStages=['icas-y2','icas-y3','naplan-y3','icas-y4','oc-prep'];
const expectedActiveStages=['icas-y2','icas-y3','naplan-y3','icas-y4'];

function fail(msg){throw new Error(`Multigrade skill framework: ${msg}`)}
function sameMembers(a,b){return Array.isArray(a)&&a.length===b.length&&b.every(x=>a.includes(x))&&a.every(x=>b.includes(x))}
if(catalog.schema!=='awenture-multigrade-skill-framework-v1')fail('schema mismatch');
if(!String(catalog.purpose||'').includes('no proprietary exercise content is copied'))fail('provenance safeguard missing');
if(!catalog.grades||!catalog.bands)fail('grades/bands missing');
const actualGrades=Object.keys(catalog.grades);
if(!sameMembers(actualGrades,expectedGrades))fail('expected Foundation through Year 12');

let totalSkills=0;
for(const gradeKey of expectedGrades){
  const grade=catalog.grades[gradeKey];
  if(!grade?.band||!catalog.bands[grade.band])fail(`${gradeKey} has invalid band`);
  if(gradeKey==='2'&&grade.status!=='active_reference')fail('Year 2 active reference missing');
  if(gradeKey!=='2'&&grade.status!=='framework_only')fail(`${gradeKey} catalog entry must remain framework_only; runtime activation belongs in stage map`);
  if(!Array.isArray(grade.emphasis)||grade.emphasis.length<3)fail(`${gradeKey} emphasis incomplete`);
  const band=catalog.bands[grade.band];
  for(const subject of expectedSubjects){
    const subjectData=band[subject];
    if(!subjectData)fail(`${gradeKey}/${subject} missing`);
    const actualStrands=Object.keys(subjectData);
    if(!sameMembers(actualStrands,expectedStrands[subject]))fail(`${gradeKey}/${subject} strand mismatch`);
    for(const [strand,skills] of Object.entries(subjectData)){
      if(!Array.isArray(skills)||skills.length===0)fail(`${gradeKey}/${subject}/${strand} empty`);
      if(new Set(skills).size!==skills.length)fail(`${gradeKey}/${subject}/${strand} duplicate skill`);
      for(const skill of skills){if(!/^[a-z0-9][a-z0-9-]*$/.test(skill))fail(`${gradeKey}/${subject}/${strand} invalid skill slug ${skill}`)}
      totalSkills+=skills.length;
    }
  }
}

if(year2.schema!=='awenture-skill-framework-v1'||year2.grade!==2)fail('existing Year 2 framework unavailable');
const y2Band=catalog.bands[catalog.grades['2'].band];
for(const subject of expectedSubjects){
  if(!year2.subjects?.[subject])fail(`existing Year 2 ${subject} missing`);
  const existingSkills=new Set(year2.subjects[subject].strands.flatMap(s=>s.skills||[]));
  const catalogSkills=new Set(Object.values(y2Band[subject]).flat());
  const overlap=[...existingSkills].filter(x=>catalogSkills.has(x)).length;
  if(overlap<Math.min(3,existingSkills.size))fail(`Year 2 ${subject} reference drifted from live framework`);
}

if(stageMap.schema!=='awenture-stage-skill-framework-map-v1'||stageMap.activation!=='stage_gated')fail('stage map must use stage_gated activation');
if(!sameMembers(Object.keys(stageMap.stages||{}),expectedStages))fail('learning-stage framework map incomplete');
if(!sameMembers(stageMap.activeStages,expectedActiveStages))fail('active stage set must be Year 2, Year 3 and Year 4 stages only');
for(const [stage,entry] of Object.entries(stageMap.stages)){
  if(!Array.isArray(entry.frameworkGrades)||entry.frameworkGrades.length===0)fail(`${stage} has no framework grades`);
  if(!entry.frameworkGrades.includes(entry.primaryGrade))fail(`${stage} primary grade missing from frameworkGrades`);
  for(const grade of entry.frameworkGrades){if(!catalog.grades[String(grade)])fail(`${stage} references unknown grade ${grade}`)}
  const shouldBeActive=expectedActiveStages.includes(stage);
  if(shouldBeActive&&entry.status!=='active')fail(`${stage} must be active`);
  if(!shouldBeActive&&entry.status!=='framework_only')fail(`${stage} must remain framework_only`);
}
if(stageMap.stages['icas-y2'].primaryGrade!==2||stageMap.stages['icas-y3'].primaryGrade!==3||stageMap.stages['naplan-y3'].primaryGrade!==3||stageMap.stages['icas-y4'].primaryGrade!==4)fail('stage-to-grade alignment incorrect');
if(JSON.stringify(stageMap.stages['oc-prep'].frameworkGrades)!=='[3,4]')fail('OC framework must blend Years 3 and 4');
const activeGrades=[...new Set(stageMap.activeStages.map(stage=>stageMap.stages[stage].primaryGrade))].sort((a,b)=>a-b);
if(JSON.stringify(activeGrades)!=='[2,3,4]')fail('runtime active grades must be Years 2, 3 and 4');
if(stageMap.activeStages.includes('oc-prep'))fail('OC native stage must remain inactive in this tranche');

console.log(JSON.stringify({frameworkCatalog:'PASS',grades:13,range:'Foundation-Year 12',catalogReferenceGrades:[2],runtimeActiveGrades:activeGrades,activeStages:stageMap.activeStages,bands:Object.keys(catalog.bands).length,totalResolvedSkillEntries:totalSkills,year2Compatibility:'PASS',stageFrameworkMap:'PASS',mappedStages:expectedStages.length,ocNativeStage:'FRAMEWORK_ONLY',proprietaryContentCopied:false}));
