const crypto=require('node:crypto');
const {PDFDocument}=require('pdf-lib');
const manifest=require('./paper-manifest.json');

const OWNER='Sol4evr';
const REPO='awenture';
const DELIVERY='github-source-proxy-v2-allowlist';
const MAX_SAFE_PDF_CACHE=2;
const safePdfCache=new Map();

function token(){return process.env.AW_GITHUB_SOURCE_TOKEN||process.env.GITHUB_TOKEN||process.env.GH_TOKEN||''}
function cleanRef(value){const ref=String(value||'');return /^[a-f0-9]{40}$/.test(ref)?ref:null}
function cleanId(value){const id=String(Array.isArray(value)?value[0]:value||'');return /^[a-f0-9]{16}$/.test(id)?id:null}
function entryFor(id){
  const p=manifest?.papers?.[id];
  if(!p||typeof p!=='object')return null;
  if(typeof p.sourcePath!=='string'||!p.sourcePath.startsWith('source/')||!p.sourcePath.toLowerCase().endsWith('.pdf'))return null;
  if(p.pageBoundaryVerified!==true||p.deliveryStartPage!==1||!Number.isInteger(p.deliveryEndPage)||p.deliveryEndPage<1)return null;
  if(p.sourceSha256!==null&&p.sourceSha256!==undefined&&!/^[a-f0-9]{64}$/.test(String(p.sourceSha256)))return null;
  return p;
}
function encodePath(p){return p.split('/').map(encodeURIComponent).join('/')}
function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex')}
function byteRange(value,total){
  if(!value)return null;
  const m=/^bytes=(\d*)-(\d*)$/i.exec(String(value).trim());
  if(!m||(!m[1]&&!m[2])||!Number.isSafeInteger(total)||total<1)return {error:true};
  let start,end;
  if(!m[1]){
    const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<1)return {error:true};
    start=Math.max(0,total-suffix);end=total-1;
  }else{
    start=Number(m[1]);if(!Number.isSafeInteger(start)||start<0||start>=total)return {error:true};
    end=m[2]?Number(m[2]):total-1;
    if(!Number.isSafeInteger(end)||end<start)return {error:true};
    end=Math.min(end,total-1);
  }
  return {start,end};
}
async function learnerPdf(sourceBytes,deliveryEndPage){
  const src=await PDFDocument.load(sourceBytes);
  const sourcePages=src.getPageCount();
  if(!Number.isInteger(deliveryEndPage)||deliveryEndPage<1||deliveryEndPage>sourcePages)throw new Error(`learner boundary ${deliveryEndPage} outside source page count ${sourcePages}`);
  const out=await PDFDocument.create();
  const indexes=Array.from({length:deliveryEndPage},(_,i)=>i);
  const pages=await out.copyPages(src,indexes);for(const page of pages)out.addPage(page);
  return {bytes:Buffer.from(await out.save()),sourcePages,learnerPages:deliveryEndPage};
}
function cacheKey(id,entry,ref){return `${ref}:${id}:${entry.deliveryEndPage}:${entry.sourceSha256||'unreviewed'}`}
function cacheGet(key){
  const v=safePdfCache.get(key);if(!v)return null;
  safePdfCache.delete(key);safePdfCache.set(key,v);return v;
}
function cacheSet(key,value){
  safePdfCache.delete(key);safePdfCache.set(key,value);
  while(safePdfCache.size>MAX_SAFE_PDF_CACHE)safePdfCache.delete(safePdfCache.keys().next().value);
}
async function resolveSafePaper(id,entry,ref,auth){
  const cacheable=ref!=='main';
  const key=cacheKey(id,entry,ref);
  if(cacheable){const hit=cacheGet(key);if(hit)return {...hit,cache:'HIT'}}
  const headers={Accept:'application/octet-stream','User-Agent':'AWenture-paper-resolver'};
  if(auth)headers.Authorization=`Bearer ${auth}`;
  const sourceUrl=`https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${encodePath(entry.sourcePath)}`;
  const upstream=await fetch(sourceUrl,{headers,redirect:'follow'});
  if(!upstream.ok){const e=new Error('Unable to fetch historical paper');e.status=upstream.status===404?404:502;throw e}
  const sourceBytes=Buffer.from(await upstream.arrayBuffer());
  if(entry.sourceSha256&&sha256(sourceBytes)!==entry.sourceSha256){const e=new Error('Historical paper source identity mismatch');e.status=502;throw e}
  const safe=await learnerPdf(sourceBytes,entry.deliveryEndPage);
  const resolved={...safe,etag:`"${sha256(safe.bytes)}"`};
  if(cacheable)cacheSet(key,resolved);
  return {...resolved,cache:'MISS'};
}

module.exports=async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).end('Method not allowed')}
  if(manifest?.version!=='aw-paper-proxy-manifest-v2'||manifest?.delivery!==DELIVERY||manifest?.learnerOnly!==true)return res.status(503).end('Historical paper allowlist is not configured');
  const id=cleanId(req.query?.id),entry=id&&entryFor(id);
  if(!entry){res.setHeader('Cache-Control','no-store');return res.status(404).end('Paper not found')}
  const {sourcePath}=entry;
  const auth=token();
  const ref=cleanRef(process.env.AW_GITHUB_SOURCE_REF||process.env.VERCEL_GIT_COMMIT_SHA);
  if(!ref){res.setHeader('Cache-Control','no-store');console.error('AW_PAPER_PROXY_CONFIG_ERROR','missing immutable source ref');return res.status(503).end('Historical paper source is not configured')}
  try{
    const safe=await resolveSafePaper(id,entry,ref,auth);
    const total=safe.bytes.length;
    const range=byteRange(req.headers.range,total);
    if(range?.error){res.statusCode=416;res.setHeader('Content-Range',`bytes */${total}`);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-store');return res.end()}
    const body=range?safe.bytes.subarray(range.start,range.end+1):safe.bytes;
    res.statusCode=range?206:200;
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`inline; filename="${sourcePath.split('/').pop().replace(/["\r\n]/g,'')}"`);
    res.setHeader('Cache-Control',ref==='main'?'public, max-age=300, s-maxage=3600':'public, max-age=86400, s-maxage=31536000, immutable');
    res.setHeader('Accept-Ranges','bytes');
    res.setHeader('Content-Length',String(body.length));
    if(range)res.setHeader('Content-Range',`bytes ${range.start}-${range.end}/${total}`);
    res.setHeader('ETag',safe.etag);
    res.setHeader('X-AW-Paper-Source','github');
    res.setHeader('X-AW-Paper-Ref',ref);
    res.setHeader('X-AW-Paper-Delivery',DELIVERY);
    res.setHeader('X-AW-Paper-Learner-Pages',String(safe.learnerPages));
    res.setHeader('X-AW-Paper-Source-Pages',String(safe.sourcePages));
    res.setHeader('X-AW-Paper-Safe-Cache',safe.cache);
    if(req.method==='HEAD')return res.end();
    return res.end(body);
  }catch(err){
    console.error('AW_PAPER_PROXY_ERROR',JSON.stringify({paperId:id,ref,status:Number(err?.status)||502,reason:String(err?.message||err)}));
    if(!res.headersSent){res.setHeader('Cache-Control','no-store');res.status(Number(err?.status)||502).end(err?.status===404?'Paper not found':'Unable to fetch historical paper')}
    else try{res.destroy()}catch(_){}
  }
};

module.exports._test={byteRange,learnerPdf,entryFor,cleanRef,resolveSafePaper,cacheKey,cacheGet,cacheSet,safePdfCache,MAX_SAFE_PDF_CACHE};
