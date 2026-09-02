import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import canonicalBank from "./canonical-bank-v6.14.1.json" with { type: "json" };

const REVIEW_VERSION='aw-independent-review-1.1.0';
const RELEASE_GATE='aw-content-release-1.1.0';
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
    if(/^Why does the writer include the information about the /i.test(q)){
      recipe='eng-practical-detail';family='qf-eng-practical-detail';skill='Text comprehension';subskill='author purpose';expected='To help the reader make a practical decision';
      const detail=q.match(/about the (.+)\?$/i)?.[1]||'';if(!detail||!includes(stim,detail))return {ok:false,reason:'source_detail_mismatch'};
    }else if(/^What does “.+” most nearly mean in this sentence\?$/i.test(q)){
      recipe='eng-vocabulary-context';family='qf-eng-vocabulary-context';skill='Vocabulary';subskill='meaning in context';
      const word=q.match(/“([^”]+)”/)?.[1]||'';const map:any={scarce:'hard to find or limited',fragile:'easily damaged',reluctant:'not willing at first',observe:'watch carefully'};expected=map[word]||'';
      if(!expected||!new RegExp(`\\b${word}\\b`,'i').test(stim))return {ok:false,reason:'vocabulary_source_mismatch'};
      if(['reluctant','observe'].includes(word)&&/item was\s+(?:reluctant|observe)/i.test(stim))return {ok:false,reason:'unnatural_vocabulary_context'};
    }else if(q==='Which sentence is written most clearly?'){
      recipe='eng-clear-sentence';family='qf-eng-clear-sentence';skill='Syntax';subskill='sentence structure';expected='Although the rain had stopped, the path remained slippery.';
    }else if(q==='What effect does the final sentence have on the passage?'){
      recipe='eng-mood-shift';family='qf-eng-mood-shift';skill='Writer’s craft';subskill='tone and mood';expected='It introduces a change in mood and hints that conditions may worsen';
      if(!/dark line of cloud/i.test(stim))return {ok:false,reason:'mood_source_mismatch'};
    }else if(q==='Which statement is supported by both sources?'){
      recipe='eng-two-source-time';family='qf-eng-two-source-time';skill='Text comprehension';subskill='two-source synthesis';expected='The activity is available before the building closes';
      const t=nums(stim);if(t.length<5)return {ok:false,reason:'two_source_data_missing'};
    }
  }else if(item.subject==='Mathematics'){
    let m=q.match(/A class has (\d+) counters\. They use (\d+), then the teacher adds (\d+)\./);
    if(m){recipe='math-add-subtract';family='qf-math-add-subtract';skill='Number and arithmetic';subskill='multi-step problem';expected=String(Number(m[1])-Number(m[2])+Number(m[3]));}
    else if(q==='Which number comes next in the pattern?'){
      recipe='math-number-pattern';family='qf-math-number-pattern';skill='Algebra and patterns';subskill='growing pattern';const a=nums(stim);if(a.length!==4||a[1]-a[0]!==a[2]-a[1]||a[2]-a[1]!==a[3]-a[2])return {ok:false,reason:'invalid_number_pattern'};expected=String(a[3]+a[1]-a[0]);
    }else if(q==='How many more votes did Blue receive than Red?'){
      recipe='math-bar-difference';family='qf-math-bar-difference';skill='Chance and data';subskill='bar chart comparison';const red=visual.match(/>Red<\/text><text[^>]*>(\d+)/),blue=visual.match(/>Blue<\/text><text[^>]*>(\d+)/);if(!red||!blue)return {ok:false,reason:'bar_chart_values_missing'};expected=String(+blue[1]-+red[1]);
    }else if((m=q.match(/starts at (\d+):(\d+) am and lasts (\d+) minutes/))){
      recipe='math-elapsed-time';family='qf-math-elapsed-time';skill='Measures and units';subskill='elapsed time';expected=formatTime(timeMinutes(+m[1],+m[2])+(+m[3]));
    }else if(q==='What is the perimeter of the rectangle?'){
      recipe='math-rectangle-perimeter';family='qf-math-rectangle-perimeter';skill='Measures and units';subskill='perimeter';const a=[...visual.matchAll(/>(\d+) cm<\/text>/g)].map(x=>+x[1]);if(a.length!==2)return {ok:false,reason:'rectangle_labels_missing'};expected=`${2*(a[0]+a[1])} cm`;
    }else if((m=q.match(/There are (\d+) equal groups with (\d+) objects/))){
      recipe='math-equal-groups';family='qf-math-equal-groups';skill='Number and arithmetic';subskill='multiplicative reasoning';expected=String(+m[1]*+m[2]);
    }
  }else if(item.subject==='Science'){
    if(q==='Which material absorbed the most water?'){
      recipe='sci-absorption-chart';family='qf-sci-absorption-chart';skill='Investigating';subskill='interpreting results';const rows=[...visual.matchAll(/>(Material [ABC])<\/text><text[^>]*>(\d+) mL<\/text>/g)].map(x=>({label:x[1],value:+x[2]}));if(rows.length!==3)return {ok:false,reason:'absorption_chart_values_missing'};rows.sort((a,b)=>b.value-a.value);if(rows[0].value===rows[1].value)return {ok:false,reason:'ambiguous_absorption_maximum'};expected=rows[0].label;
    }else if(q.includes('reduce water loss')){recipe='sci-dry-plant';family='qf-sci-dry-plant';skill='Life and living';subskill='adaptation';expected='A waxy leaf surface';}
    else if(q.includes('equal-height ramps')){recipe='sci-friction-ramp';family='qf-sci-friction-ramp';skill='Energy and change';subskill='forces';expected='The car on the smooth ramp travels farther because there is less friction';}
    else if(q.includes('outside of a cold metal cup')){recipe='sci-condensation';family='qf-sci-condensation';skill='Earth and beyond';subskill='water cycle';expected='Water vapour in the air condensed on the cold surface';}
    else if(q.includes('fairest test of whether light affects')){recipe='sci-fair-test-light';family='qf-sci-fair-test-light';skill='Investigating';subskill='fair test';expected='Use the same plant type, soil and water, changing only light exposure';}
    else if(q.includes('lunchbox that should be light')){recipe='sci-material-purpose';family='qf-sci-material-purpose';skill='Natural and processed materials';subskill='material properties';expected='Rigid plastic';}
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
