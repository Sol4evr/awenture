import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const htmlFile=path.join(dist,'index.html');
let html=fs.readFileSync(htmlFile,'utf8');
const frameworkSrc=path.join(root,'ui','skills-framework.js');
const mappingSrc=path.join(root,'ui','skills-mapping-v2.js');
const parentSrc=path.join(root,'ui','skills-parent.js');
const runtime=fs.readFileSync(frameworkSrc,'utf8');
const mappingRuntime=fs.readFileSync(mappingSrc,'utf8');
const parentRuntime=fs.readFileSync(parentSrc,'utf8');
for(const required of ['awenture-skills-v1','progressionEnabled:false','uncoveredSkillIds','undercoveredSkillIds','safeSkills'])if(!runtime.includes(required))throw new Error(`Skills framework runtime missing ${required}`);
for(const required of ['conservative-v2','metadata-match-or-unmapped','unmappedQuestionIds'])if(!mappingRuntime.includes(required))throw new Error(`Skills mapping runtime missing ${required}`);
for(const required of ['skillsFramework','focusSkillIds','progressionCredit:false','automaticPromotion:false','data-aw-skills-subject','aw:parent-view-ready','parentLifecycleOnly:true'])if(!parentRuntime.includes(required))throw new Error(`Skills parent runtime missing ${required}`);
fs.copyFileSync(frameworkSrc,path.join(dist,'skills-framework.js'));
fs.copyFileSync(mappingSrc,path.join(dist,'skills-mapping-v2.js'));
fs.copyFileSync(parentSrc,path.join(dist,'skills-parent.js'));
const frameworkScript='<script src="/skills-framework.js?v=61900" defer></script>';
const mappingScript='<script src="/skills-mapping-v2.js?v=61901" defer></script>';
const parentScript='<script src="/skills-parent.js?v=61901" defer></script>';
if(!html.includes('/skills-framework.js?v=61900')){
  const insightsRe=/<script src="\/insights\.js\?v=[^\"]+" defer><\/script>/;
  const match=html.match(insightsRe);
  if(!match)throw new Error('Insights script anchor missing');
  html=html.replace(match[0],frameworkScript+mappingScript+match[0]+parentScript);
}
if(!html.includes('/skills-mapping-v2.js?v=61901'))throw new Error('Conservative skills mapping injection missing');
if(!html.includes('/skills-parent.js?v=61901'))throw new Error('Parent skills script injection missing');
const insightsFile=path.join(dist,'insights.js');
let insights=fs.readFileSync(insightsFile,'utf8');
if(!insights.includes("aw:parent-view-ready")){
  const marker="card.dataset.awInsights='1';\n  card.innerHTML=";
  if(!insights.includes(marker))throw new Error('Parent View lifecycle marker missing');
  insights=insights.replace(marker,"card.dataset.awInsights='1';\n  window.dispatchEvent(new CustomEvent('aw:parent-view-ready'));\n  card.innerHTML=");
  fs.writeFileSync(insightsFile,insights);
}
if(!insights.includes("new CustomEvent('aw:parent-view-ready')"))throw new Error('Parent View lifecycle event injection missing');
if(!html.includes('awenture-release\\" content=\\"6.18.3\\"')&&!html.includes('awenture-release" content="6.18.3"'))throw new Error('v6.19.0 requires v6.18.3 release marker');
html=html.replace('awenture-release\\" content=\\"6.18.3\\"','awenture-release\\" content=\\"6.19.0\\"');
html=html.replace('awenture-release" content="6.18.3"','awenture-release" content="6.19.0"');
html=html.replaceAll("RELEASE='6.18.3'","RELEASE='6.19.0'");
fs.writeFileSync(htmlFile,html);
console.log(JSON.stringify({release:'6.19.0',skillsFramework:'awenture-skills-v1',skillsMapping:'conservative-v2',parentSkills:'parent-lifecycle-only',progressionEnabled:false,dailyPracticeMix:'unchanged'}));
