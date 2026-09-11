import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlFile=path.join(dist,'index.html');
let html=fs.readFileSync(htmlFile,'utf8');
const frameworkSrc=path.join(root,'ui','skills-framework.js');
const parentSrc=path.join(root,'ui','skills-parent.js');
const runtime=fs.readFileSync(frameworkSrc,'utf8');
const parentRuntime=fs.readFileSync(parentSrc,'utf8');
for(const required of ['awenture-skills-v1','progressionEnabled:false','uncoveredSkillIds','undercoveredSkillIds','safeSkills'])if(!runtime.includes(required))throw new Error(`Skills framework runtime missing ${required}`);
for(const required of ['skillsFramework','focusSkillIds','progressionCredit:false','automaticPromotion:false','data-aw-skills-subject'])if(!parentRuntime.includes(required))throw new Error(`Skills parent runtime missing ${required}`);
fs.copyFileSync(frameworkSrc,path.join(dist,'skills-framework.js'));
fs.copyFileSync(parentSrc,path.join(dist,'skills-parent.js'));
const frameworkScript='<script src="/skills-framework.js?v=61900" defer></script>';
const parentScript='<script src="/skills-parent.js?v=61900" defer></script>';
if(!html.includes('/skills-framework.js?v=61900')){
  const insights='<script src="/insights.js?v=6130" defer></script>';
  if(!html.includes(insights))throw new Error('Insights script marker missing');
  html=html.replace(insights,frameworkScript+insights+parentScript);
}
html=html.replaceAll('6.18.3','6.19.0').replaceAll('61830','61900');
fs.writeFileSync(htmlFile,html);
console.log(JSON.stringify({release:'6.19.0',skillsFramework:'awenture-skills-v1',parentSkills:'lazy-parent-only',progressionEnabled:false,dailyPracticeMix:'unchanged'}));
