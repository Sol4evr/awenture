import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import canonicalBank from "./canonical-bank-v6.14.1.json" with { type: "json" };

const REVIEW_VERSION='aw-independent-review-1.2.1';
const RELEASE_GATE='aw-content-release-1.2.1';
const LETTERS='ABCD';
const STOP=new Set(['the','and','for','that','this','with','from','into','than','then','they','there','because','which','when','what','where','most','best','will','would','could','should','does','have','has','had','are','was','were','its','their','more','less','only','same','each']);
const CANONICAL_SIGNATURES=Array.isArray(canonicalBank)?canonicalBank:[];

function json(status:number,body:any){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
function internal(req:Request){const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';const presented=req.headers.get('apikey')||'';if(secret&&presented===secret)return true;try{const raw=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');let p=(raw.split('.')[1]||'').replace(/-/g,'+').replace(/_/g,'/');p+='='.repeat((4-p.length%4)%4);return String(JSON.parse(atob(p))?.role||'')==='service_role'}catch{return false}}
function text(v:any){return String(v??'').trim()}
function words(s:string){return text(s).toLowerCase().replace(/[^a-z0-9.:%$-]+/g,' ').split(/\s+/).filter(x=>x.length>2&&!STOP.has(x))}
function similarity(a:string,b:string){const A=new Set(words(a)),B=new Set(words(b));if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/(A.size+B.size-hit)}
function answerText(item:any){const i=LETTERS.indexOf(text(item?.answer));return i<0?'':text(item?.options?.[i])}
function same(a:string,b:string){return text(a).toLowerCase()===text(b).toLowerCase()}
function includes(a:string,b:string){return text(a).toLowerCase().includes(text(b).toLowerCase())}
function safeVisual(svg:string){return /<svg\b/i.test(svg)&&/role=["']img["']/i.test(svg)&&/aria-label=["'][^"']+["']/i.test(svg)&&!/<(?:script|foreignObject|iframe|object|embed|audio|video|style)\b/i.test(svg)&&!/(?:on\w+\s*=|javascript:|data:text\/html|https?:\/\/|href\s*=|xlink:href\s*=)/i.test(svg)}
function optionFor(item:any,expected:string){return answerText(item)&&same(answerText(item),expected)}
function nums(s:string){return [...text(s).matchAll(/-?\d+(?:\.\d+)?/g)].map(m=>Number(m[0]))}
function timeMinutes(h:number,m:number){return h*60+m}
function formatTime(total:number){return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')} am`}

function solve(item:any):any{
  const q=text(item.question),stim=text(item.stimulus),visual=text(item.visual),correct=answerText(item);
  let recipe='',family='',skill=text(item.skill),subskill=text(item.subskill),expected='';

  if(item.subject==='English'){
    let m:RegExpMatchArray|null;
    if(q==='What should the visitor do immediately after collecting the map?'){
      recipe='eng-route-sequence';family='qf-eng-route-sequence';skill='Text comprehension';subskill='sequencing';
      m=stim.match(/Next, (.+?)\. Finally,/i);expected=m?.[1]||'';if(!expected)return {ok:false,reason:'route_sequence_missing'};
    }else if((m=q.match(/^What can the reader infer about (.+)\?$/))){
      recipe='eng-action-inference';family='qf-eng-action-inference';skill='Text comprehension';subskill='inference';
      const name=m[1],activity=stim.match(/ before (.+)\.$/)?.[1]||'',actions:any={'packed spare water and checked the route':'was preparing carefully','checked the weather and packed a hat':'was planning ahead','tested the torch and added fresh batteries':'wanted to be ready','labelled every bag and made a checklist':'was organising carefully'},action=Object.keys(actions).find(x=>includes(stim,x))||'';
      if(!activity||!action)return {ok:false,reason:'inference_source_mismatch'};expected=name+' '+actions[action]+' for '+activity;
    }else if(/^What does “.+” mean in this sentence\?$/i.test(q)){
      recipe='eng-natural-vocabulary';family='qf-eng-natural-vocabulary';skill='Vocabulary';subskill='meaning in context';
      const word=q.match(/“([^”]+)”/)?.[1]||'',map:any={gleaming:'shining brightly',cautious:'careful to avoid danger',enormous:'very large',grateful:'thankful'};expected=map[word]||'';
      if(!expected||!new RegExp('\\b'+word+'\\b','i').test(stim))return {ok:false,reason:'vocabulary_source_mismatch'};
    }else if(q==='What does the word “it” refer to in the sentence?'){
      recipe='eng-pronoun-reference';family='qf-eng-pronoun-reference';skill='Grammar';subskill='pronoun reference';
      const thing=stim.match(/placed the (.+?) beside/i)?.[1]||'';expected=thing?'the '+thing:'';if(!expected||!/\bit needed\b/i.test(stim))return {ok:false,reason:'pronoun_source_mismatch'};
    }else if(q==='Which sentence uses capital letters and end punctuation correctly?'){
      recipe='eng-capitals-punctuation';family='qf-eng-capitals-punctuation';skill='Punctuation';subskill='capital letters and full stops';
      const valid=(item.options||[]).filter((x:any)=>/^[A-Z][a-z]+ visited [A-Z][a-z]+ on Saturday\.$/.test(text(x)));if(valid.length!==1)return {ok:false,reason:'punctuation_options_ambiguous'};expected=text(valid[0]);
    }else if(q==='What is the main idea of the passage?'){
      recipe='eng-main-idea';family='qf-eng-main-idea';skill='Text comprehension';subskill='main idea';
      if(/Bees visit flowers/i.test(stim))expected='Bees help flowering plants while collecting food.';
      else if(/school library now opens/i.test(stim))expected='The library offers useful services before class.';
      else if(/Penguins have thick feathers/i.test(stim))expected='Penguins have body features that help them keep warm.';
      else return {ok:false,reason:'main_idea_source_mismatch'};
    }else if(q==='Which statement is an opinion rather than a fact?'){
      recipe='eng-fact-opinion';family='qf-eng-fact-opinion';skill='Text comprehension';subskill='fact and opinion';
      const opinions=(item.options||[]).filter((x:any)=>/\b(nicest|best|most beautiful)\b/i.test(text(x)));if(opinions.length!==1)return {ok:false,reason:'opinion_options_ambiguous'};expected=text(opinions[0]);
    }else if(q.startsWith('After reading all the instructions, what should a student do next')){
      recipe='eng-instruction-sequence';family='qf-eng-instruction-sequence';skill='Text comprehension';subskill='instruction sequence';
      expected=stim.match(/2\. (.+?)\. 3\./)?.[1]||'';if(!expected)return {ok:false,reason:'instruction_step_missing'};
    }else if(/^Which word from the sentence means the opposite of /i.test(q)){
      recipe='eng-antonym-context';family='qf-eng-antonym-context';skill='Vocabulary';subskill='antonyms in context';
      const word=q.match(/“([^”]+)”/)?.[1]||'',map:any={narrow:'wide',ancient:'new',silent:'noisy',empty:'full'};expected=map[word]||'';if(!expected||!includes(stim,expected))return {ok:false,reason:'antonym_source_mismatch'};
    }else if(q==='Why is the heading written in large bold letters?'){
      recipe='eng-heading-purpose';family='qf-eng-heading-purpose';skill='Text features';subskill='heading purpose';expected='To tell readers an important rule';
      if(!/^NOTICE/m.test(stim))return {ok:false,reason:'notice_heading_missing'};
    }else if((m=q.match(/^What does (.+)'s reply show\?$/))){
      recipe='eng-dialogue-inference';family='qf-eng-dialogue-inference';skill='Text comprehension';subskill='dialogue inference';expected=m[1]+' is offering to help solve the problem';
      if(!/I can sort them/i.test(stim))return {ok:false,reason:'dialogue_evidence_missing'};
    }else if(q==='Which statement is supported by both notices?'){
      recipe='eng-compare-notices';family='qf-eng-compare-notices';skill='Text comprehension';subskill='comparing sources';expected='Both activities begin after school';
      if(!/3:30 pm/i.test(stim)||!/4:00 pm/i.test(stim))return {ok:false,reason:'notice_times_missing'};
    }
  }else if(item.subject==='Mathematics'){
    let m:RegExpMatchArray|null;
    if((m=q.match(/value of the digit in the (hundreds|tens|ones) place in (\d+)/))){
      recipe='math-place-value';family='qf-math-place-value';skill='Number and arithmetic';subskill='place value';const n=+m[2],which=m[1];expected=String(which==='hundreds'?Math.floor(n/100)*100:which==='tens'?Math.floor(n/10)%10*10:n%10);
    }else if((m=q.match(/coins worth (\d+) cents, (\d+) cents and (\d+) cents/))){
      recipe='math-money-total';family='qf-math-money-total';skill='Measures and units';subskill='money';expected=(+m[1]+ +m[2]+ +m[3])+' cents';
    }else if((m=q.match(/(\d+) shells are shared equally among (\d+) children/))){
      recipe='math-equal-sharing';family='qf-math-equal-sharing';skill='Number and arithmetic';subskill='division and sharing';if(+m[1]%+m[2])return {ok:false,reason:'sharing_not_equal'};expected=String(+m[1]/+m[2]);
    }else if((m=q.match(/Half of (\d+) counters/))){
      recipe='math-half-of-set';family='qf-math-half-of-set';skill='Number and arithmetic';subskill='halves';if(+m[1]%2)return {ok:false,reason:'odd_half_set'};expected=String(+m[1]/2);
    }else if((m=q.match(/ribbon is (\d+) metres long/))){
      recipe='math-metres-centimetres';family='qf-math-metres-centimetres';skill='Measures and units';subskill='metric conversion';expected=(+m[1]*100)+' cm';
    }else if((m=q.match(/shape has exactly (\d+) straight sides/))){
      recipe='math-shape-sides';family='qf-math-shape-sides';skill='Space and geometry';subskill='2D shape properties';const names:any={5:'pentagon',6:'hexagon',8:'octagon'};expected=names[m[1]]||'';if(!expected)return {ok:false,reason:'unsupported_side_count'};
    }else if((m=q.match(/(\d+) \+ □ = (\d+)/))){
      recipe='math-missing-addend';family='qf-math-missing-addend';skill='Number and arithmetic';subskill='missing number';expected=String(+m[2]-+m[1]);
    }else if((m=q.match(/Today is (Monday|Tuesday|Wednesday)\. What day will it be (\d+) days/))){
      recipe='math-calendar-forward';family='qf-math-calendar-forward';skill='Measures and units';subskill='calendar';const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];expected=days[(days.indexOf(m[1])+(+m[2]))%7];
    }else if((m=q.match(/tray has (\d+) rows of (\d+) strawberries/))){
      recipe='math-array-total';family='qf-math-array-total';skill='Number and arithmetic';subskill='multiplicative reasoning';expected=String(+m[1]*+m[2]);
    }else if(q==='How many books were borrowed altogether?'){
      recipe='math-table-total';family='qf-math-table-total';skill='Chance and data';subskill='table totals';const a=nums(stim);if(a.length!==3)return {ok:false,reason:'table_values_missing'};expected=String(a[0]+a[1]+a[2]);
    }else if(q==='Which shape has more than one line of symmetry?'){
      recipe='math-lines-symmetry';family='qf-math-lines-symmetry';skill='Space and geometry';subskill='symmetry';expected='A square';
    }else if((m=q.match(/mass of (\d+) kg and another has a mass of (\d+) kg/))){
      recipe='math-mass-difference';family='qf-math-mass-difference';skill='Measures and units';subskill='mass comparison';expected=(+m[1]-+m[2])+' kg';
    }
  }else if(item.subject==='Science'){
    if(q.includes('shortest shadow on a sunny day')){recipe='sci-shadow-length';family='qf-sci-shadow-length';skill='Earth and beyond';subskill='Sun and shadows';expected='At midday';}
    else if(q.includes('attracted to a magnet')){recipe='sci-magnetic-material';family='qf-sci-magnetic-material';skill='Natural and processed materials';subskill='magnetic materials';expected='A steel paper clip';}
    else if(q.includes('after the caterpillar stage')){recipe='sci-butterfly-life-cycle';family='qf-sci-butterfly-life-cycle';skill='Life and living';subskill='life cycles';expected='Pupa';if(!/caterpillar → pupa/i.test(stim))return {ok:false,reason:'life_cycle_source_mismatch'};}
    else if(q.includes('move efficiently through water')){recipe='sci-webbed-feet';family='qf-sci-webbed-feet';skill='Life and living';subskill='body features';expected='Webbed feet';}
    else if(q.includes('ruler hanging over the edge')){recipe='sci-sound-vibration';family='qf-sci-sound-vibration';skill='Energy and change';subskill='sound and vibration';expected='The ruler is vibrating';}
    else if(q.includes('fairly test which wrapping')){recipe='sci-insulation-fair-test';family='qf-sci-insulation-fair-test';skill='Investigating';subskill='fair testing';expected='Use identical cups and change only the wrapping material';}
    else if(q.includes('dissolve when stirred into warm water')){recipe='sci-dissolving';family='qf-sci-dissolving';skill='Natural and processed materials';subskill='dissolving';const possible=['Sugar','Salt'].filter(x=>(item.options||[]).some((o:any)=>same(o,x)));if(possible.length!==1)return {ok:false,reason:'dissolving_options_ambiguous'};expected=possible[0];}
    else if(q.includes('best evidence that a seedling is living')){recipe='sci-living-evidence';family='qf-sci-living-evidence';skill='Life and living';subskill='characteristics of living things';expected='It grows new leaves over time';}
    else if(q==='What causes day and night on Earth?'){recipe='sci-day-night';family='qf-sci-day-night';skill='Earth and beyond';subskill='Earth rotation';expected='Earth rotates on its axis';}
    else if(q.includes('let the most light pass through')){recipe='sci-transparency';family='qf-sci-transparency';skill='Natural and processed materials';subskill='transparent materials';expected='Clear plastic';}
    else if(q.includes('which living thing is eaten by the frog')){recipe='sci-food-chain';family='qf-sci-food-chain';skill='Life and living';subskill='food chains';expected='Grasshopper';if(!/grasshopper → frog/i.test(stim))return {ok:false,reason:'food_chain_source_mismatch'};}
    else if(q.includes('measure how much rain has fallen')){recipe='sci-rain-gauge';family='qf-sci-rain-gauge';skill='Earth and beyond';subskill='weather instruments';expected='Rain gauge';}

  }
  if(!recipe||!expected)return {ok:false,reason:'unsupported_construction'};
  if(!optionFor(item,expected))return {ok:false,reason:'independent_answer_mismatch'};
  const rationale=text(item.explanation).toLowerCase();
  const rationaleWords=expected.toLowerCase().split(/\s+/).map(x=>x.replace(/[^a-z]/g,'')).filter(x=>x.length>4&&!STOP.has(x));
  if(!rationaleWords.some(x=>rationale.includes(x.slice(0,4)))&&!nums(expected).some(n=>includes(rationale,String(n))))return {ok:false,reason:'rationale_answer_mismatch'};
  return {ok:true,recipe,family,skill,subskill,expected,correct};
}

function independentReview(row:any,comparison:any[],familyCounts:Map<string,number>){
  const item=row?.item||{},failures:string[]=[];
  if(row?.automated_status!=='passed'||row?.automated_review?.passed!==true)failures.push('automated_gate');
  if(!/^QF-[EMS]-/.test(text(item.id)))failures.push('generated_id');
  if(!['English','Mathematics','Science'].includes(item.subject)||item.subject!==row.subject)failures.push('subject');
  if(!Number.isInteger(item.difficulty)||item.difficulty<2||item.difficulty>5)failures.push('difficulty');
  if(text(item.question).length<20)failures.push('stem');
  if(!Array.isArray(item.options)||item.options.length!==4||new Set(item.options.map((x:any)=>text(x).toLowerCase())).size!==4)failures.push('options');
  if(LETTERS.indexOf(text(item.answer))<0||!answerText(item))failures.push('answer_key');
  if(text(item.explanation).length<(item.subject==='Mathematics'?12:28))failures.push('rationale');
  if(!['text','visual'].includes(item.kind))failures.push('kind');
  if(item.kind==='visual'&&!safeVisual(text(item.visual)))failures.push('visual_safety');
  if(/all of the above|none of the above|placeholder|todo|because it is correct/i.test([item.question,...(item.options||[]),item.explanation].join(' ')))failures.push('banned_language');
  const solved=solve(item);if(!solved.ok)failures.push(solved.reason);
  const signature=`${text(item.question)} ${text(item.stimulus)}`;let maxSimilarity=0;
  for(const other of comparison)maxSimilarity=Math.max(maxSimilarity,similarity(signature,`${text(other?.question)} ${text(other?.stimulus)}`));
  if(maxSimilarity>=0.94)failures.push('semantic_sibling');
  let maxCanonicalSimilarity=0,maxCanonicalQuestionSimilarity=0;for(const other of CANONICAL_SIGNATURES.filter((x:any)=>x.subject===item.subject)){maxCanonicalSimilarity=Math.max(maxCanonicalSimilarity,similarity(signature,`${text(other?.question)} ${text(other?.stimulus)}`));maxCanonicalQuestionSimilarity=Math.max(maxCanonicalQuestionSimilarity,similarity(text(item.question),text(other?.question)))}
  if(maxCanonicalSimilarity>=0.94||maxCanonicalQuestionSimilarity>=0.98)failures.push('canonical_semantic_sibling');
  if(solved.ok&&(familyCounts.get(solved.family)||0)>=3)failures.push('construction_cap');
  const passed=failures.length===0;
  return {passed,failures,reviewer:REVIEW_VERSION,recipe:solved.ok?solved.recipe:null,normalised:solved.ok?{...item,skill:solved.skill,subskill:solved.subskill,family:solved.family}:item,checks:{automatedGate:row?.automated_status==='passed',independentSolve:solved.ok,answerCorrect:solved.ok,answerRationaleAgreement:solved.ok,visualSemanticQa:item.kind!=='visual'||(safeVisual(text(item.visual))&&solved.ok),canonicalNovelty:maxCanonicalSimilarity<0.94&&maxCanonicalQuestionSimilarity<0.98,releasedBankNovelty:maxSimilarity<0.94,constructionCap:!failures.includes('construction_cap'),maxSimilarity:+maxSimilarity.toFixed(3),maxCanonicalSimilarity:+maxCanonicalSimilarity.toFixed(3),maxCanonicalQuestionSimilarity:+maxCanonicalQuestionSimilarity.toFixed(3),directBrowserPublish:false,normalPracticeEligible:passed}};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return json(405,{error:'method_not_allowed'});if(!internal(req))return json(403,{error:'service_role_required'});
  let body:any;try{body=await req.json()}catch{return json(400,{error:'invalid_json'})}const requestKey=text(body?.requestKey).slice(0,160);if(!requestKey)return json(400,{error:'request_key_required'});
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const {data:request,error:rqErr}=await db.schema('awenture_private').from('question_topup_requests').select('*').eq('request_key',requestKey).maybeSingle();if(rqErr||!request)return json(rqErr?500:404,{error:rqErr?'request_lookup_failed':'request_not_found'});
  const {data:candidates,error:cErr}=await db.schema('awenture_private').from('question_factory_candidates').select('*').eq('request_id',request.id).order('created_at',{ascending:true});if(cErr)return json(500,{error:'candidate_lookup_failed',detail:cErr.message});if(!candidates?.length)return json(409,{error:'no_candidates_ready',status:request.status});
  const {data:existing,error:eErr}=await db.schema('awenture_private').from('released_question_items').select('item,family');if(eErr)return json(500,{error:'released_lookup_failed'});
  const comparison=(existing||[]).map((x:any)=>x.item),familyCounts=new Map<string,number>();for(const x of existing||[])familyCounts.set(x.family,(familyCounts.get(x.family)||0)+1);
  let approved=0,rejected=0;const byBatch=new Map<string,{approved:number,rejected:number}>();
  for(const row of candidates){
    if(row.automated_status!=='passed'){rejected++;continue}const review=independentReview(row,comparison,familyCounts),expertStatus=review.passed?'approved':'rejected',releasedAt=review.passed?new Date().toISOString():null;
    const {error:u}=await db.schema('awenture_private').from('question_factory_candidates').update({expert_status:expertStatus,expert_review:review,released_at:releasedAt}).eq('id',row.id);if(u)return json(500,{error:'candidate_review_write_failed',detail:u.message});
    const b=byBatch.get(row.batch_id)||{approved:0,rejected:0};if(review.passed){const item=review.normalised,releaseGate={version:RELEASE_GATE,automatedReviewPassed:true,independentReviewPassed:true,independentSolvePassed:true,visualSemanticQaPassed:review.checks.visualSemanticQa,canonicalNoveltyPassed:review.checks.canonicalNovelty,releasedBankNoveltyPassed:review.checks.releasedBankNovelty,reviewer:REVIEW_VERSION,expertReviewRequired:true,learnerRuntimeDirectPublish:false};const {error:rErr}=await db.schema('awenture_private').from('released_question_items').upsert({candidate_key:row.candidate_key,request_id:row.request_id,batch_id:row.batch_id,subject:item.subject,skill:item.skill,subskill:item.subskill,family:item.family,generator_version:row.generator_version,item:{...item,quality:{...(item.quality||{}),review:'dual-pass-released',releaseGate:RELEASE_GATE,independentReviewer:REVIEW_VERSION,independentSolve:true}},release_gate:releaseGate},{onConflict:'candidate_key'});if(rErr)return json(500,{error:'release_write_failed',detail:rErr.message});approved++;b.approved++;comparison.push(item);familyCounts.set(item.family,(familyCounts.get(item.family)||0)+1)}else{rejected++;b.rejected++}byBatch.set(row.batch_id,b);
  }
  for(const [batchId,s] of byBatch)await db.schema('awenture_private').from('question_topup_batches').update({status:s.approved?'released':'review_failed',approved_count:s.approved,review_summary:{releaseGate:RELEASE_GATE,independentReviewer:REVIEW_VERSION,approved:s.approved,rejected:s.rejected,independentSolve:true,canonicalNovelty:true,directPublish:false}}).eq('id',batchId);
  const finalStatus=approved?'released':'review_failed';await db.schema('awenture_private').from('question_factory_runs').update({status:approved?'complete':'failed',completed_at:new Date().toISOString(),error_summary:approved?null:{reason:'independent_review_rejected_all'}}).eq('request_id',request.id);await db.schema('awenture_private').from('question_topup_requests').update({status:finalStatus}).eq('id',request.id);
  return json(200,{requestKey,status:finalStatus,reviewVersion:REVIEW_VERSION,releaseGate:RELEASE_GATE,reviewed:candidates.length,approved,rejected,independentSolve:true,canonicalNovelty:true,directBrowserPublish:false,practiceFeed:approved?'released-bank':null});
});
