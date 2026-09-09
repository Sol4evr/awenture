const crypto=require('node:crypto');
const {PDFDocument}=require('pdf-lib');
const manifest=require('./paper-manifest.json');

const OWNER='Sol4evr';
const REPO='awenture';
const DELIVERY='github-source-proxy-v2-allowlist';

function token(){return process.env.AW_GITHUB_SOURCE_TOKEN||process.env.GITHUB_TOKEN||process.env.GH_TOKEN||''}
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

module.exports=async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).end('Method not allowed')}
  if(manifest?.version!=='aw-paper-proxy-manifest-v2'||manifest?.delivery!==DELIVERY||manifest?.learnerOnly!==true)return res.status(503).end('Historical paper allowlist is not configured');
  const id=cleanId(req.query?.id),entry=id&&entryFor(id);
  if(!entry){res.setHeader('Cache-Control','no-store');return res.status(404).end('Paper not found')}
  const {sourcePath,deliveryEndPage,sourceSha256}=entry;
  const auth=token();
  if(!auth){res.setHeader('Cache-Control','no-store');return res.status(503).end('Historical paper source is not configured')}
  const ref=process.env.AW_GITHUB_SOURCE_REF||process.env.VERCEL_GIT_COMMIT_SHA||'main';
  const headers={Authorization:`Bearer ${auth}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'AWenture-paper-resolver'};
  try{
    const metaUrl=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodePath(sourcePath)}?ref=${encodeURIComponent(ref)}`;
    const metaResp=await fetch(metaUrl,{headers,redirect:'follow'});
    if(!metaResp.ok){res.setHeader('Cache-Control','no-store');return res.status(metaResp.status===404?404:502).end(metaResp.status===404?'Paper not found':'Unable to resolve historical paper')}
    const meta=await metaResp.json();
    if(meta?.type!=='file'||!meta.download_url)return res.status(404).end('Paper not found');
    const upstream=await fetch(meta.download_url,{headers:{Authorization:`Bearer ${auth}`,Accept:'application/octet-stream','User-Agent':'AWenture-paper-resolver'},redirect:'follow'});
    if(!upstream.ok){res.setHeader('Cache-Control','no-store');return res.status(upstream.status===404?404:502).end('Unable to fetch historical paper')}
    const sourceBytes=Buffer.from(await upstream.arrayBuffer());
    if(sourceSha256&&sha256(sourceBytes)!==sourceSha256){res.setHeader('Cache-Control','no-store');return res.status(502).end('Historical paper source identity mismatch')}
    const safe=await learnerPdf(sourceBytes,deliveryEndPage);
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
    res.setHeader('ETag',`"${sha256(safe.bytes)}"`);
    res.setHeader('X-AW-Paper-Source','github');
    res.setHeader('X-AW-Paper-Ref',ref);
    res.setHeader('X-AW-Paper-Delivery',DELIVERY);
    res.setHeader('X-AW-Paper-Learner-Pages',String(safe.learnerPages));
    res.setHeader('X-AW-Paper-Source-Pages',String(safe.sourcePages));
    if(req.method==='HEAD')return res.end();
    return res.end(body);
  }catch(err){
    console.error('AW_PAPER_PROXY_ERROR',id,String(err?.message||err));
    if(!res.headersSent){res.setHeader('Cache-Control','no-store');res.status(502).end('Unable to fetch historical paper')}
    else try{res.destroy()}catch(_){}
  }
};

module.exports._test={byteRange,learnerPdf,entryFor};
