import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlFile=path.join(dist,'index.html');
let html=fs.readFileSync(htmlFile,'utf8');
const src=path.join(root,'ui','skills-framework.js');
const runtime=fs.readFileSync(src,'utf8');
for(const required of ['awenture-skills-v1','progressionEnabled:false','uncoveredSkillIds','undercoveredSkillIds','safeSkills'])if(!runtime.includes(required))throw new Error(`Skills framework runtime missing ${required}`);
fs.copyFileSync(src,path.join(dist,'skills-framework.js'));
const script='<script src="/skills-framework.js?v=61900" defer></script>';
if(!html.includes('/skills-framework.js?v=61900')){
  const insights='<script src="/insights.js?v=6130" defer></script>';
  if(!html.includes(insights))throw new Error('Insights script marker missing');
  html=html.replace(insights,script+insights);
}
html=html.replaceAll('6.18.3','6.19.0').replaceAll('61830','61900');
fs.writeFileSync(htmlFile,html);
console.log(JSON.stringify({release:'6.19.0',skillsFramework:'awenture-skills-v1',progressionEnabled:false,dailyPracticeMix:'unchanged'}));
