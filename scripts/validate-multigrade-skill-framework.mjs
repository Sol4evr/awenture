import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'bank','multigrade-skill-framework-v1.json');
const year2Path=path.join(root,'bank','year2-skill-framework-v1.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const year2=JSON.parse(fs.readFileSync(year2Path,'utf8'));
const expectedGrades=['F',...Array.from({length:12},(_,i)=>String(i+1))];
const expectedSubjects=['Mathematics','English','Science','Spelling'];
const expectedStrands={
  Mathematics:['Number','Algebra','Measurement','Space','Statistics','Probability'],
  English:['Language','Literature','Literacy'],
  Science:['Science understanding','Science as a human endeavour','Science inquiry'],
  Spelling:['Word knowledge']
};

function fail(msg){throw new Error(`Multigrade skill framework: ${msg}`)}
if(catalog.schema!=='awenture-multigrade-skill-framework-v1')fail('schema mismatch');
if(!String(catalog.purpose||'').includes('no proprietary exercise content is copied'))fail('provenance safeguard missing');
if(JSON.stringify(catalog.runtime?.activeGrades)!=='[2]')fail('Year 2 must remain the only active runtime grade in this tranche');
if(!catalog.grades||!catalog.bands)fail('grades/bands missing');
if(JSON.stringify(Object.keys(catalog.grades))!==JSON.stringify(expectedGrades))fail('expected Foundation through Year 12');

let totalSkills=0;
for(const gradeKey of expectedGrades){
  const grade=catalog.grades[gradeKey];
  if(!grade?.band||!catalog.bands[grade.band])fail(`${gradeKey} has invalid band`);
  if(gradeKey==='2'&&grade.status!=='active_reference')fail('Year 2 active reference missing');
  if(gradeKey!=='2'&&grade.status!=='framework_only')fail(`${gradeKey} must be framework_only`);
  if(!Array.isArray(grade.emphasis)||grade.emphasis.length<3)fail(`${gradeKey} emphasis incomplete`);
  const band=catalog.bands[grade.band];
  for(const subject of expectedSubjects){
    const subjectData=band[subject];
    if(!subjectData)fail(`${gradeKey}/${subject} missing`);
    const actualStrands=Object.keys(subjectData);
    if(JSON.stringify(actualStrands)!==JSON.stringify(expectedStrands[subject]))fail(`${gradeKey}/${subject} strand mismatch`);
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

console.log(JSON.stringify({frameworkCatalog:'PASS',grades:13,range:'Foundation-Year 12',runtimeActiveGrades:[2],bands:Object.keys(catalog.bands).length,totalResolvedSkillEntries:totalSkills,year2Compatibility:'PASS',proprietaryContentCopied:false}));
