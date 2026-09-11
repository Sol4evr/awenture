(()=>{
'use strict';
const fw=window.__AW_SKILLS_FRAMEWORK;if(!fw)return;
const STOP=new Set(['and','the','a','an','of','to','in','for','with','using','use','simple','appropriate','everyday','from','or','by','into','across','where','how','what','their','its','on','as']);
const SYN={
  infer:['infer','inference','implicit','evidence'],inference:['infer','inference','implicit','evidence'],
  comprehend:['read','reading','meaning','text'],comprehension:['read','reading','meaning','text'],
  purpose:['purpose','audience','writer','author'],author:['author','writer','purpose'],writer:['writer','author','purpose'],
  morphology:['morphology','word','prefix','suffix','meaning'],vocabulary:['vocabulary','word','meaning','context'],
  punctuation:['punctuation','capital','comma','stop','question'],syntax:['sentence','grammar','syntax'],grammar:['grammar','sentence','syntax'],
  spell:['spell','spelling','word','pattern'],spelling:['spell','spelling','word','pattern'],phonics:['sound','phonics','spell'],
  fraction:['fraction','fractions','number'],fractions:['fraction','fractions','number'],decimal:['decimal','number'],percent:['percentage','percent','number'],percentage:['percentage','percent','number'],
  add:['addition','add','number'],addition:['addition','add','number'],subtract:['subtraction','subtract','number'],subtraction:['subtraction','subtract','number'],multiply:['multiplication','multiply','number'],multiplication:['multiplication','multiply','number'],division:['division','sharing','number'],
  geometry:['geometric','geometry','shape','space'],coordinate:['coordinate','coordinates','space'],coordinates:['coordinate','coordinates','space'],angle:['angle','angles','geometry'],angles:['angle','angles','geometry'],
  measure:['measure','measurement','unit'],measurement:['measure','measurement','unit'],area:['area','measurement'],perimeter:['perimeter','measurement'],volume:['volume','measurement'],time:['time','clock','calendar'],
  probability:['probability','chance','outcome'],chance:['probability','chance','outcome'],statistics:['statistics','data','graph'],data:['data','graph','table','statistics'],graph:['data','graph','plot'],
  material:['material','materials','matter','property'],materials:['material','materials','matter','property'],living:['living','organism','life'],plant:['plant','living'],animal:['animal','living'],
  force:['force','motion','push','pull'],energy:['energy','heat','light','electricity'],electricity:['electricity','electric','circuit'],weather:['weather','earth','sky'],space:['space','earth','planet','solar'],experiment:['experiment','investigation','inquiry'],investigation:['experiment','investigation','inquiry'],observation:['observation','observe','inquiry']
};
function stem(t){return t.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean).map(x=>x.endsWith('ies')?x.slice(0,-3)+'y':x.endsWith('ing')&&x.length>5?x.slice(0,-3):x.endsWith('ed')&&x.length>4?x.slice(0,-2):x.endsWith('s')&&x.length>4?x.slice(0,-1):x)}
function tokens(value){const out=new Set;for(const raw of stem(String(value||''))){if(STOP.has(raw))continue;out.add(raw);for(const x of SYN[raw]||[])for(const y of stem(x))out.add(y)}return out}
function metadata(q){return `${q?.skill||''} ${q?.subskill||''} ${q?.topic||''} ${q?.quality?.focus||''}`.trim()}
function subject(q){const s=String(q?.subject||'');if(/^math/i.test(s))return'Mathematics';if(/^science/i.test(s))return'Science';if(/^spell/i.test(s)||/^english/i.test(s))return'English';return fw.subjects.includes(s)?s:null}
function grade(q){const explicit=String(q?.grade||q?.yearLevel||'').match(/(?:Y|YEAR\s*)?(F|[1-9]|1[0-2])/i);return explicit?explicit[1].toUpperCase():'2'}
function candidateDomain(q,subj,yr){const legacy=fw.mapQuestion(q);if(legacy){const s=fw.safeSkill(legacy);if(s?.subject===subj&&s?.grade===yr)return s.domain}return null}
function conservativeMap(q){
  if(!q?.id)return null;const subj=subject(q),yr=grade(q);if(!subj)return null;
  const text=tokens(metadata(q));if(!text.size)return null;
  const domain=candidateDomain(q,subj,yr);const pool=fw.skills.filter(s=>s.subject===subj&&s.grade===yr&&(!domain||s.domain===domain));
  let best=null,bestScore=0,bestDirect=0;
  for(const skill of pool){const label=tokens(`${skill.domain} ${skill.label}`);let score=0,direct=0;for(const t of text)if(label.has(t)){score+=1;if(String(skill.label).toLowerCase().includes(t))direct+=1}if(score>bestScore||(score===bestScore&&direct>bestDirect)){best=skill;bestScore=score;bestDirect=direct}}
  const minScore=text.size<=2?1:2;if(!best||bestScore<minScore)return null;
  return best.id;
}
function coverage(bank,yr='2'){
  const target=fw.skills.filter(s=>s.grade===String(yr)),counts=new Map(target.map(s=>[s.id,0])),unmapped=[];
  for(const q of Array.isArray(bank)?bank:[]){if(grade(q)!==String(yr))continue;const id=conservativeMap(q);if(id&&counts.has(id))counts.set(id,counts.get(id)+1);else unmapped.push(String(q?.id||'unknown'))}
  const rows=target.map(skill=>({...skill,questionCount:counts.get(skill.id)||0}));
  return {framework:fw.version,mappingVersion:'conservative-v2',mappingPolicy:'metadata-match-or-unmapped',grade:String(yr),skills:rows,totalSkills:rows.length,coveredSkills:rows.filter(x=>x.questionCount>0).length,uncoveredSkillIds:rows.filter(x=>x.questionCount===0).map(x=>x.id),undercoveredSkillIds:rows.filter(x=>x.questionCount>0&&x.questionCount<3).map(x=>x.id),unmappedQuestionIds:unmapped};
}
fw.mapQuestion=conservativeMap;fw.coverage=coverage;fw.mappingVersion='conservative-v2';fw.mappingPolicy='metadata-match-or-unmapped';
})();
