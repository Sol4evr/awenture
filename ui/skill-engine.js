(()=>{
'use strict';
/* v6.18.2 invisible skill-aware selector + generation-safe coverage targeting. No child-facing UI. */
const SUBJECT_PREFIX={English:'ENG',Mathematics:'MATH',Science:'SCI',Spelling:'SPELL'};
const UNSAFE_VISUAL_IDS=new Set(['M09','M18','M19','M23','M26','M31']);
const TARGETS={
English:[
['Y2.ENG.LITERACY.SEQUENCE_AND_RETELL','Sequence and retell',0,['sequence','order','route','procedure']],
['Y2.ENG.LITERACY.INFERENCE','Inference from evidence',1,['infer','inference','evidence','feeling']],
['Y2.ENG.LANGUAGE.VOCABULARY_IN_CONTEXT','Vocabulary in context',2,['vocab','meaning','context','synonym']],
['Y2.ENG.LANGUAGE.PRONOUNS_AND_REFERENCE','Pronouns and reference',3,['pronoun','reference']],
['Y2.ENG.LANGUAGE.PUNCTUATION_AND_CAPITALISATION','Punctuation and capitalisation',4,['punctuation','capital']],
['Y2.ENG.LITERACY.MAIN_IDEA_AND_KEY_DETAILS','Main idea and key details',5,['main idea','key detail']],
['Y2.ENG.LITERACY.FACT_AND_OPINION','Fact and opinion',6,['fact','opinion']],
['Y2.ENG.LITERACY.PROCEDURAL_TEXTS','Procedural texts',7,['procedure','instruction']],
['Y2.ENG.LANGUAGE.WORD_RELATIONSHIPS','Word relationships',8,['antonym','opposite','word relationship']],
['Y2.ENG.LITERACY.TEXT_PURPOSE_AND_AUDIENCE','Text purpose and audience',9,['purpose','audience','heading']],
['Y2.ENG.LITERACY.DIALOGUE_INFERENCE','Dialogue inference',10,['dialogue','reply']],
['Y2.ENG.LITERACY.COMPARE_SOURCES','Compare sources',11,['compare','two source','both notices']]
],
Mathematics:[
['Y2.MATH.NUMBER.PLACE_VALUE','Place value',0,['place value','number representation']],
['Y2.MATH.NUMBER.MONEY_VALUES_AND_COMBINATIONS','Money values and combinations',1,['money','coin']],
['Y2.MATH.NUMBER.DIVISION_AS_SHARING','Division as sharing',2,['division','sharing']],
['Y2.MATH.NUMBER.FRACTIONS_OF_WHOLES_AND_COLLECTIONS','Fractions of collections',3,['fraction','half','quarter']],
['Y2.MATH.MEASUREMENT.COMPARE_AND_MEASURE_LENGTH','Length and metric units',4,['length','metre','centimetre','ruler']],
['Y2.MATH.SPACE.2D_SHAPES_AND_PROPERTIES','2D shapes and properties',5,['shape','2d']],
['Y2.MATH.ALGEBRA.NUMBER_SENTENCES_AND_MISSING_VALUES','Number sentences and missing values',6,['missing','inverse','number sentence']],
['Y2.MATH.MEASUREMENT.DURATION_AND_CALENDARS','Calendars and duration',7,['calendar','day','date','time']],
['Y2.MATH.NUMBER.MULTIPLICATION_AS_GROUPS','Multiplication as groups',8,['multiplication','array','groups']],
['Y2.MATH.STATISTICS.READ_TABLES_AND_PICTURE_GRAPHS','Read tables and data displays',9,['table','graph','data']],
['Y2.MATH.SPACE.SYMMETRY_AND_TRANSFORMATIONS','Symmetry and transformations',10,['symmetry','turn','rotation']],
['Y2.MATH.MEASUREMENT.COMPARE_MASS','Compare mass',11,['mass','weight','balance']]
],
Science:[
['Y2.SCI.UNDERSTANDING.EARTH_SKY_AND_WEATHER_PATTERNS','Earth, sky and weather patterns',0,['shadow','sun','weather','earth']],
['Y2.SCI.UNDERSTANDING.MATERIALS_AND_PROPERTIES','Materials and properties',1,['material','magnet','magnetic']],
['Y2.SCI.UNDERSTANDING.LIFE_CYCLES_AND_CHANGE','Life cycles and change',2,['life cycle','cycle']],
['Y2.SCI.UNDERSTANDING.LIVING_THINGS_NEEDS_AND_FEATURES','Living things: features and needs',3,['body feature','adaptation','living']],
['Y2.SCI.UNDERSTANDING.LIGHT_SOUND_AND_HEAT_OBSERVATIONS','Sound and vibration',4,['sound','vibration']],
['Y2.SCI.INQUIRY.COMPARE_RESULTS_WITH_PREDICTIONS','Fair testing',5,['fair test','variable','investigat']],
['Y2.SCI.UNDERSTANDING.CHANGES_TO_MATERIALS','Changes to materials',6,['dissolv','change material']],
['Y2.SCI.INQUIRY.OBSERVE_AND_MEASURE','Observations as evidence',7,['observation','evidence']],
['Y2.SCI.UNDERSTANDING.EARTH_ROTATION_DAY_NIGHT','Day and night',8,['day and night','earth rotation']],
['Y2.SCI.UNDERSTANDING.LIGHT_TRANSPARENCY','Light and transparency',9,['transparent','light pass']],
['Y2.SCI.UNDERSTANDING.FOOD_CHAINS','Food chains',10,['food chain']],
['Y2.SCI.INQUIRY.OBSERVE_AND_MEASURE_WEATHER','Weather measurement',11,['rain gauge','weather instrument']]
]
};
const norm=x=>String(x??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'other';
const skillName=q=>String(q?.subskill||q?.skill||q?.strand||'Other').trim()||'Other';
const skillId=q=>String(q?.skillId||q?.quality?.skillId||`Y2.${SUBJECT_PREFIX[q?.subject]||'GEN'}.${norm(skillName(q)).toUpperCase().replaceAll('-','_')}`);
const family=(q,helpers)=>{try{return helpers?.familyKey?helpers.familyKey(q):String(q?.family||q?.id||'')}catch(_){return String(q?.family||q?.id||'')}};
const searchText=q=>`${q?.skill||''} ${q?.subskill||''} ${q?.family||''} ${q?.question||''}`.toLowerCase();
function statFor(q,p){const stats=p?.skillStats&&typeof p.skillStats==='object'?p.skillStats:{};const raw=stats[`${q.subject}|${skillName(q)}`]||stats[skillId(q)]||null;const a=Number(raw?.a)||0,c=Number(raw?.c)||0;return {a,c,accuracy:a?c/a:null}}
function score(q,p,seen,recent,helpers){const s=statFor(q,p),f=family(q,helpers);let n=0;if(!seen.has(q.id))n+=120;else n-=35;if(s.a===0)n+=70;else{n+=(1-s.accuracy)*65;n+=Math.max(0,18-Math.min(18,s.a*3))}if(recent.has(f))n-=55;if(q.kind==='visual')n+=2;return n}
function eligible(q,slot,chosenFamilies,chosenIds,seen,recent,helpers){if(!q||q.subject!==slot.subject||q.kind!==slot.kind)return false;if(UNSAFE_VISUAL_IDS.has(q.id)||chosenIds.has(q.id))return false;if(!seen.has(slot.id)&&seen.has(q.id))return false;const f=family(q,helpers),slotFamily=family(slot,helpers);if(chosenFamilies.has(f))return false;if(!recent.has(slotFamily)&&recent.has(f))return false;return true}
function rebalance(existing,bank,p,sd,helpers={}){try{if(!Array.isArray(existing)||existing.length!==15||!Array.isArray(bank))return existing;const expected={English:4,Mathematics:4,Science:4,Spelling:3};for(const [subject,count] of Object.entries(expected))if(existing.filter(q=>q?.subject===subject).length!==count)return existing;const seen=new Set(Array.isArray(p?.seenIds)?p.seenIds:[]),recent=helpers?.recent instanceof Set?helpers.recent:new Set(),chosen=[],chosenIds=new Set(),chosenFamilies=new Set();for(const slot of existing){const pool=bank.filter(q=>eligible(q,slot,chosenFamilies,chosenIds,seen,recent,helpers));pool.sort((a,b)=>score(b,p,seen,recent,helpers)-score(a,p,seen,recent,helpers)||String(a.id).localeCompare(String(b.id)));const best=pool[0]||slot;if(!best||chosenIds.has(best.id)||chosenFamilies.has(family(best,helpers)))return existing;chosen.push(best);chosenIds.add(best.id);chosenFamilies.add(family(best,helpers))}if(existing.filter(q=>q?.kind==='visual').length!==chosen.filter(q=>q?.kind==='visual').length)return existing;for(const [subject,count] of Object.entries(expected))if(chosen.filter(q=>q.subject===subject).length!==count)return existing;return chosen}catch(_){return existing}}
function graph(bank=window.AW_BANK){const out=new Map();for(const q of Array.isArray(bank)?bank:[]){const id=skillId(q);if(!out.has(id))out.set(id,{id,grade:2,subject:q.subject,name:skillName(q),questionCount:0});out.get(id).questionCount++}return [...out.values()].sort((a,b)=>a.subject.localeCompare(b.subject)||a.name.localeCompare(b.name))}
function coverageTargets(bank=window.AW_BANK,p={},limit=6){const result={English:[],Mathematics:[],Science:[]};for(const subject of Object.keys(result)){const qs=(Array.isArray(bank)?bank:[]).filter(q=>q.subject===subject);const scored=(TARGETS[subject]||[]).map(([id,label,mode,aliases])=>{const direct=qs.filter(q=>skillId(q)===id).length;const inferred=qs.filter(q=>aliases.some(a=>searchText(q).includes(a))).length;const count=Math.max(direct,inferred);const stats=p?.skillStats||{};const candidates=Object.entries(stats).filter(([k])=>k.startsWith(subject+'|')&&aliases.some(a=>k.toLowerCase().includes(a)));let a=0,c=0;for(const [,v] of candidates){a+=Number(v?.a)||0;c+=Number(v?.c)||0}const acc=a?c/a:null;return{id,label,mode,count,attempts:a,accuracy:acc,priority:(count===0?1000:300/Math.max(1,count))+(acc==null?80:(1-acc)*100)}}).sort((a,b)=>b.priority-a.priority||a.count-b.count||a.label.localeCompare(b.label));result[subject]=scored.slice(0,limit).map(x=>`${x.id}|${x.label}|mode:${x.mode}`)}return result}
window.__AW_SKILL_ENGINE={version:'y2-v1',skillId,skillName,graph,rebalance,coverageTargets,generationTargets:TARGETS};
})();
