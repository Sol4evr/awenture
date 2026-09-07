const {Readable}=require('node:stream');
const manifest=require('./paper-manifest.json');

const OWNER='Sol4evr';
const REPO='awenture';
const DELIVERY='github-source-proxy-v2-allowlist';

function token(){return process.env.AW_GITHUB_SOURCE_TOKEN||process.env.GITHUB_TOKEN||process.env.GH_TOKEN||''}
function cleanId(value){const id=String(Array.isArray(value)?value[0]:value||'');return /^[a-f0-9]{16}$/.test(id)?id:null}
function sourceFor(id){const p=manifest?.papers?.[id];return typeof p==='string'&&p.startsWith('source/')&&p.toLowerCase().endsWith('.pdf')?p:null}
function encodePath(p){return p.split('/').map(encodeURIComponent).join('/')}
function copyHeader(upstream,res,name){const v=upstream.headers.get(name);if(v)res.setHeader(name,v)}

module.exports=async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).end('Method not allowed')}
  if(manifest?.version!=='aw-paper-proxy-manifest-v1'||manifest?.delivery!==DELIVERY)return res.status(503).end('Historical paper allowlist is not configured');
  const id=cleanId(req.query?.id),sourcePath=id&&sourceFor(id);
  if(!sourcePath){res.setHeader('Cache-Control','no-store');return res.status(404).end('Paper not found')}
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
    const fileHeaders={Authorization:`Bearer ${auth}`,Accept:'application/octet-stream','User-Agent':'AWenture-paper-resolver'};
    if(req.headers.range)fileHeaders.Range=req.headers.range;
    const upstream=await fetch(meta.download_url,{headers:fileHeaders,redirect:'follow'});
    if(!upstream.ok&&upstream.status!==206){res.setHeader('Cache-Control','no-store');return res.status(upstream.status===404?404:502).end('Unable to fetch historical paper')}
    res.statusCode=upstream.status;
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`inline; filename="${sourcePath.split('/').pop().replace(/["\r\n]/g,'')}"`);
    res.setHeader('Cache-Control',ref==='main'?'public, max-age=300, s-maxage=3600':'public, max-age=86400, s-maxage=31536000, immutable');
    res.setHeader('X-AW-Paper-Source','github');
    res.setHeader('X-AW-Paper-Ref',ref);
    res.setHeader('X-AW-Paper-Delivery',DELIVERY);
    for(const h of ['accept-ranges','content-length','content-range','etag','last-modified'])copyHeader(upstream,res,h);
    if(req.method==='HEAD'||!upstream.body)return res.end();
    Readable.fromWeb(upstream.body).on('error',()=>{try{res.destroy()}catch(_){}}).pipe(res);
  }catch(err){
    console.error('AW_PAPER_PROXY_ERROR',id,String(err?.message||err));
    if(!res.headersSent){res.setHeader('Cache-Control','no-store');res.status(502).end('Unable to fetch historical paper')}
    else try{res.destroy()}catch(_){}
  }
};
