import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const ALLOWED=new Set(['https://awenture.vercel.app']);
function cors(req:Request){const o=req.headers.get('origin')||'';const allow=ALLOWED.has(o)||/^https:\/\/[^/]+\.vercel\.app$/.test(o)?o:'https://awenture.vercel.app';return {'Access-Control-Allow-Origin':allow,'Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'content-type,authorization,apikey','Vary':'Origin','Cache-Control':'public, max-age=60, stale-while-revalidate=300','Content-Type':'application/json'}}
Deno.serve(async(req:Request)=>{
 const h=cors(req);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h});if(req.method!=='GET')return new Response(JSON.stringify({error:'method_not_allowed'}),{status:405,headers:h});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data,error}=await db.schema('awenture_private').from('released_question_items').select('candidate_key,subject,item,released_at,release_gate').order('released_at',{ascending:true}).limit(360);
 if(error)return new Response(JSON.stringify({error:'released_bank_unavailable'}),{status:500,headers:h});
 const rows=data||[];const items=rows.filter((r:any)=>r?.release_gate?.automatedReviewPassed===true&&r?.release_gate?.independentReviewPassed===true&&r?.release_gate?.independentSolvePassed===true&&r?.release_gate?.visualSemanticQaPassed===true&&r?.release_gate?.canonicalNoveltyPassed===true&&r?.release_gate?.releasedBankNoveltyPassed===true&&r?.release_gate?.learnerRuntimeDirectPublish===false).map((r:any)=>r.item);
 return new Response(JSON.stringify({release:'aw-dynamic-bank-1',count:items.length,updatedAt:rows.length?rows[rows.length-1].released_at:null,items}),{status:200,headers:h});
});