import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const ALLOWED=new Set(['https://awenture.vercel.app']);
const SUBJECTS=['English','Mathematics','Science'];
function headers(req:Request){const o=req.headers.get('origin')||'';const allow=ALLOWED.has(o)||/^https:\/\/[^/]+\.vercel\.app$/.test(o)?o:'https://awenture.vercel.app';return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'content-type,authorization,apikey,x-aw-client','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'}}
function out(req:Request,status:number,body:any){return new Response(JSON.stringify(body),{status,headers:headers(req)})}
function obj(v:any){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function counts(v:any){const x=obj(v);return Object.fromEntries(SUBJECTS.map(s=>[s,Math.max(0,Math.min(40,Math.floor(Number(x[s]||0))))]))}
function focus(v:any){const x=obj(v);return Object.fromEntries(SUBJECTS.map(s=>[s,Array.isArray(x[s])?x[s].map((z:any)=>String(z).slice(0,120)).filter(Boolean).slice(0,6):[]]))}
async function pipeline(requestKey:string,url:string,key:string){
 const auth={'Content-Type':'application/json','Authorization':`Bearer ${key}`,'apikey':key};
 try{
   const f=await fetch(`${url}/functions/v1/question-factory`,{method:'POST',headers:auth,body:JSON.stringify({requestKey})});
   const fb=await f.json().catch(()=>({}));
   if(!f.ok)throw new Error(`factory_${f.status}_${fb?.error||'failed'}`);
   const r=await fetch(`${url}/functions/v1/question-release`,{method:'POST',headers:auth,body:JSON.stringify({requestKey})});
   const rb=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(`release_${r.status}_${rb?.error||'failed'}`);
 }catch(e){console.error('AW_TOPUP_PIPELINE',requestKey,String(e))}
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(!['GET','POST'].includes(req.method))return out(req,405,{error:'method_not_allowed'});
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const db=createClient(url,key,{auth:{persistSession:false}});
 if(req.method==='GET'){
   const u=new URL(req.url),requestKey=String(u.searchParams.get('request_key')||'').slice(0,160);if(!requestKey)return out(req,400,{error:'request_key_required'});
   const {data:request,error}=await db.schema('awenture_private').from('question_topup_requests').select('*').eq('request_key',requestKey).maybeSingle();if(error)return out(req,500,{error:'request_lookup_failed'});if(!request)return out(req,404,{error:'request_not_found'});
   const {data:run}=await db.schema('awenture_private').from('question_factory_runs').select('status,generator_version,requested_count,generated_count,passed_automated_count,rejected_automated_count,completed_at').eq('request_id',request.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
   const {count:releasedCount}=await db.schema('awenture_private').from('released_question_items').select('*',{count:'exact',head:true}).eq('request_id',request.id);
   return out(req,200,{request,run:run||null,releasedCount:releasedCount||0});
 }
 let body:any;try{body=await req.json()}catch{return out(req,400,{error:'invalid_json'})}
 const requestKey=String(body?.requestKey||'').slice(0,160);if(!/^aw-topup-[a-zA-Z0-9_-]{3,140}$/.test(requestKey))return out(req,400,{error:'invalid_request_key'});
 const unseen=counts(body?.unseenBySubject),required=counts(body?.requiredBySubject),focusSubskills=focus(body?.focusSubskills);
 const mandatory={freshQuestionsOnly:true,noBankMutationInLearnerRuntime:true,expertReviewRequired:true,visualQaRequired:true,noveltyCheckRequired:true,releaseGateRequired:true,learnerRuntimeDirectPublish:false,dualPassServerRelease:true};
 const row={request_key:requestKey,source_release:String(body?.sourceRelease||'unknown').slice(0,40),bank_size:Math.max(0,Math.floor(Number(body?.bankSize||0))),target_unseen_per_subject:Math.max(1,Math.min(60,Math.floor(Number(body?.targetUnseenPerSubject||30)))),unseen_by_subject:unseen,required_by_subject:required,focus_subskills:focusSubskills,qa_policy:mandatory,client_fingerprint:String(req.headers.get('x-aw-client')||'anonymous').slice(0,100),status:'queued'};
 const {data:existing}=await db.schema('awenture_private').from('question_topup_requests').select('*').eq('request_key',requestKey).maybeSingle();
 let request:any=existing;
 if(!existing){const {data,error}=await db.schema('awenture_private').from('question_topup_requests').insert(row).select().single();if(error)return out(req,500,{error:'request_create_failed',detail:error.message});request=data}
 else if(['review_failed','rejected','cancelled','failed'].includes(existing.status)){const {data,error}=await db.schema('awenture_private').from('question_topup_requests').update({...row,status:'queued'}).eq('id',existing.id).select().single();if(error)return out(req,500,{error:'request_reset_failed'});request=data}
 if(request.status==='queued'){EdgeRuntime.waitUntil(pipeline(requestKey,url,key))}
 return out(req,202,{request,processingScheduled:request.status==='queued',pipeline:'factory→independent-review→released-bank',directBrowserPublish:false});
});