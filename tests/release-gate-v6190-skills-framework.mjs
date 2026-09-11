import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frameworkSource=fs.readFileSync(path.join(root,'ui/skills-framework.js'),'utf8');
const parentSource=fs.readFileSync(path.join(root,'ui/skills-parent.js'),'utf8');
const context={window:{},console};context.window.window=context.window;
vm.runInNewContext(frameworkSource,context,{filename:'skills-framework.js'});
const fw=context.window.__AW_SKILLS_FRAMEWORK;
if(!fw)throw new Error('Skills framework did not initialise');
const expectedGrades=['F','1','2','3','4','5','6','7','8','9','10','11','12'];
const expectedSubjects=['English','Mathematics','Science'];
if(JSON.stringify(fw.grades)!==JSON.stringify(expectedGrades))throw new Error(`F-12 grade spine mismatch: ${JSON.stringify(fw.grades)}`);
if(JSON.stringify(fw.subjects)!==JSON.stringify(expectedSubjects))throw new Error(`Subject spine mismatch: ${JSON.stringify(fw.subjects)}`);
if(fw.progressionEnabled!==false)throw new Error('Skills framework must never enable progression');
if(!Array.isArray(fw.skills)||fw.skills.length<300)throw new Error(`Skills framework unexpectedly shallow: ${fw.skills?.length}`);
const ids=fw.skills.map(s=>s.id);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate skill IDs found');
for(const grade of expectedGrades)for(const subject of expectedSubjects){const rows=fw.skills.filter(s=>s.grade===grade&&s.subject===subject);if(!rows.length)throw new Error(`Missing framework skills for ${grade}/${subject}`)}
const forbidden=['answer','answers','answerKey','correct','correctAnswer','solution','solutions','supportMaterial','markingGuide','progressionCredit','automaticPromotion'];
for(const skill of fw.skills)for(const key of forbidden)if(Object.prototype.hasOwnProperty.call(skill,key))throw new Error(`Forbidden field ${key} leaked into ${skill.id}`);
const samples=[
 {id:'gate-e1',subject:'English',grade:'2',subskill:'reading inference'},
 {id:'gate-m1',subject:'Mathematics',grade:'2',subskill:'fractions and number'},
 {id:'gate-s1',subject:'Science',grade:'2',subskill:'materials observation'},
 {id:'gate-sp1',subject:'Spelling',grade:'2',subskill:'phonics spelling'}
];
for(const q of samples){const a=fw.mapQuestion(q),b=fw.mapQuestion({...q});if(!a||a!==b)throw new Error(`Non-deterministic/unmapped sample ${q.id}`);if(!fw.safeSkill(a))throw new Error(`Mapped sample has unknown skill ${a}`)}
if(fw.mapQuestion({id:'unknown',subject:'History',grade:'2'})!==null)throw new Error('Unknown subject must fail closed');
if(fw.safeSkills(['not-a-skill']).length!==0)throw new Error('Unknown skill IDs must fail closed');
const c=fw.coverage(samples,'2');
if(c.grade!=='2'||c.totalSkills<=0||!Array.isArray(c.uncoveredSkillIds)||!Array.isArray(c.undercoveredSkillIds))throw new Error('Coverage contract incomplete');
for(const required of ['skillsFramework','focusSkillIds','focusSkills','progressionCredit:false','automaticPromotion:false','loads only in Parent View','data-aw-skills-subject'])if(!parentSource.includes(required))throw new Error(`Parent skills runtime missing invariant: ${required}`);
for(const forbiddenRuntime of ['finishBonus','function start(','sess.items=','AW_BANK.splice'])if(parentSource.includes(forbiddenRuntime))throw new Error(`Parent skills runtime may not mutate practice engine: ${forbiddenRuntime}`);
const packageJson=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(packageJson.version!=='6.19.0')throw new Error(`Package release marker is ${packageJson.version}`);
if(!packageJson.scripts.build.includes('patch-v6.19.0-skills-framework.mjs'))throw new Error('v6.19 runtime patch missing from build');
if(!packageJson.scripts['test:release'].includes('release-gate-v6190-skills-framework.mjs'))throw new Error('v6.19 release gate missing from test:release');
console.log(JSON.stringify({release:'6.19.0',framework:fw.version,grades:fw.grades.length,subjects:fw.subjects.length,skills:fw.skills.length,progressionEnabled:fw.progressionEnabled,gate:'PASS'}));
