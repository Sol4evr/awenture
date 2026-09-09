import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlPath=path.join(root,'dist/index.html');
const insightsPath=path.join(root,'dist/insights.js');
const engineSource=path.join(root,'ui/skill-engine.js');
const engineDest=path.join(root,'dist/skill-engine.js');
if(!fs.existsSync(engineSource))throw new Error('Skill engine source missing');
if(!fs.existsSync(insightsPath))throw new Error('Parent insights runtime missing');
let html=fs.readFileSync(htmlPath,'utf8');
let insights=fs.readFileSync(insightsPath,'utf8');
const replaceOne=(src,from,to,label)=>{if(!src.includes(from))throw new Error(`${label} marker missing`);if(src.indexOf(from)!==src.lastIndexOf(from))throw new Error(`${label} marker not unique`);return src.replace(from,to)};
const marker="window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle((window.AW_PROGRESSION?window.AW_PROGRESSION.rebalanceDaily(out.slice(0,15),BANK,P.seenIds,sd):out.slice(0,15)),sd+173);";
const replacement=`const awLegacyPick=(window.AW_PROGRESSION?window.AW_PROGRESSION.rebalanceDaily(out.slice(0,15),BANK,P.seenIds,sd):out.slice(0,15));\n  const awSkillReady=window.__AW_SKILL_BALANCE_READY===true;\n  const awSkillPick=awSkillReady?(window.__AW_SKILL_ENGINE?.rebalance?.(awLegacyPick,BANK,P,sd,{familyKey,recent})||awLegacyPick):awLegacyPick;\n  window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle(awSkillPick.slice(0,15),sd+173);`;
html=replaceOne(html,marker,replacement,'v6.18.2 stage-weighted Daily Practice selector');
html=html.replaceAll('6.18.1','6.18.2').replaceAll('61810','61820');
const scriptAnchor='<script src="/premium.js';
if(!html.includes(scriptAnchor))throw new Error('UI script anchor missing');
html=html.replace(scriptAnchor,'<script>window.__AW_SKILL_BALANCE_READY=true;</script><script src="/skill-engine.js?v=61820" defer></script><script src="/premium.js');

const requestIdMarker="function requestId(unseen,seenCount){const key=SUBJECTS.map(s=>unseen[s]).join('-');return `aw-topup-${key}-${seenCount}`}";
const requestHelpers=`${requestIdMarker}\nfunction requestedCounts(unseen){const deficits=Object.fromEntries(SUBJECTS.map(s=>[s,Math.max(0,TOPUP_TARGET-unseen[s])]));return Object.values(deficits).some(Boolean)?deficits:Object.fromEntries(SUBJECTS.map(s=>[s,10]))}\nfunction coveragePlan(p,unseen,requested){const base=requestId(unseen,Array.isArray(p?.seenIds)?p.seenIds.length:0),engine=window.__AW_SKILL_ENGINE;try{return engine?.coveragePlan?.(base,bank(),p,requested)||{requestKey:base,focusSubskills:null}}catch(_){return{requestKey:base,focusSubskills:null}}}\nfunction currentRequestMatches(req,p,unseen){if(!req)return false;const base=requestId(unseen,Array.isArray(p?.seenIds)?p.seenIds.length:0);return (req.baseRequestId||String(req.requestId||'').replace(/-sg[0-9a-z]+$/,''))===base}`;
insights=replaceOne(insights,requestIdMarker,requestHelpers,'Parent Top Up request helpers');

const makeTopupOld="  const deficits=Object.fromEntries(SUBJECTS.map(s=>[s,Math.max(0,TOPUP_TARGET-unseen[s])]));\n  const requested=Object.values(deficits).some(Boolean)?deficits:Object.fromEntries(SUBJECTS.map(s=>[s,10]));\n  return {schema:'awenture-topup-v2',requestId:requestId(unseen,seenCount),requestedAt:new Date().toISOString(),release:release(),source:'parent-view',bankSize:bank().length,seenCount,unseen,requested,weakest:Object.fromEntries(SUBJECTS.map(s=>[s,weakest(rows,s)])),qualityPolicy:{freshQuestionsOnly:true,noBankMutationInLearnerRuntime:true,expertReviewRequired:true,visualQaRequired:true,noveltyCheckRequired:true,releaseGateRequired:true},backendStatus:'prepared'};";
const makeTopupNew="  const requested=requestedCounts(unseen),baseRequestId=requestId(unseen,seenCount),plan=coveragePlan(p,unseen,requested);\n  return {schema:'awenture-topup-v2',requestId:plan.requestKey||baseRequestId,baseRequestId,requestedAt:new Date().toISOString(),release:release(),source:'parent-view',bankSize:bank().length,seenCount,unseen,requested,weakest:Object.fromEntries(SUBJECTS.map(s=>[s,weakest(rows,s)])),coverageFocusSubskills:plan.focusSubskills||null,coveragePlanner:'y2-v1',qualityPolicy:{freshQuestionsOnly:true,noBankMutationInLearnerRuntime:true,expertReviewRequired:true,visualQaRequired:true,noveltyCheckRequired:true,releaseGateRequired:true},backendStatus:'prepared'};";
insights=replaceOne(insights,makeTopupOld,makeTopupNew,'governed Parent Top Up request');

const payloadOld="focusSubskills:Object.fromEntries(SUBJECTS.map(s=>[s,req.weakest[s].map(x=>x.skill)]))";
const payloadNew="focusSubskills:req.coverageFocusSubskills||Object.fromEntries(SUBJECTS.map(s=>[s,req.weakest[s].map(x=>x.skill)]))";
insights=replaceOne(insights,payloadOld,payloadNew,'Question Factory coverage focus payload');

const parentCurrentOld="  const currentId=requestId(unseen,Array.isArray(p.seenIds)?p.seenIds.length:0),requestCurrent=request&&request.requestId===currentId;";
const parentCurrentNew="  const requestCurrent=currentRequestMatches(request,p,unseen);";
insights=replaceOne(insights,parentCurrentOld,parentCurrentNew,'Parent Top Up current request match');

const requestTopupOld="  const p=progress(),unseen=unseenBySubject(p),currentId=requestId(unseen,Array.isArray(p.seenIds)?p.seenIds.length:0),existing=topupRequest();\n  let req=existing&&existing.requestId===currentId?existing:makeTopupRequest();";
const requestTopupNew="  const p=progress(),unseen=unseenBySubject(p),existing=topupRequest();\n  let req=currentRequestMatches(existing,p,unseen)?existing:makeTopupRequest();";
insights=replaceOne(insights,requestTopupOld,requestTopupNew,'Parent Top Up submit request match');

fs.copyFileSync(engineSource,engineDest);
fs.writeFileSync(htmlPath,html);
fs.writeFileSync(insightsPath,insights);
console.log(JSON.stringify({release:'6.18.2',uiChange:'NONE',dailyQuestionCount:15,dailyMix:{English:4,Mathematics:4,Science:4,Spelling:3},selector:'STAGE_WEIGHTED_THEN_SKILL_AWARE',skillBalanceActivation:'ENABLED_WITH_FAIL_SAFE_FALLBACK',fallback:'STAGE_WEIGHTED_LEGACY_PICK',visualProfile:'PRESERVED',historicalPapers:'UNCHANGED',parentTopUpRuntime:'GOVERNED_COVERAGE_TARGETING',questionFactory:'COVERAGE_PLANNER_WIRED_EXISTING_RECIPES_ONLY',supabaseFunctions:'UNCHANGED',directPublish:false}));
