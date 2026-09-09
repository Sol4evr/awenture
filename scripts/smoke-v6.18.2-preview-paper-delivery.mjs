const base=String(process.env.AW_PREVIEW_URL||'').replace(/\/$/,'');
const bypass=process.env.AW_PREVIEW_BYPASS_TOKEN||'';
if(!base)throw new Error('AW_PREVIEW_URL is required');
const q=bypass?`?x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=true`:'';
const headers=bypass?{'x-vercel-protection-bypass':bypass}:{};
async function get(path,extra={}){return fetch(`${base}${path}${path.includes('?')?'&':'?'}${bypass?`x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=true`:'aw_smoke=1'}`,{headers:{...headers,...extra},redirect:'manual'})}
function requireStatus(res,allowed,label){if(!allowed.includes(res.status))throw new Error(`${label}: unexpected status ${res.status}`)}
const catalogRes=await get('/stage-papers/catalog.json');
requireStatus(catalogRes,[200],'catalog');
const catalog=await catalogRes.json();
const papers=Object.values(catalog.stages||{}).flatMap(s=>s.papers||[]);
if(papers.length!==187)throw new Error(`catalog paper count mismatch: ${papers.length}`);
const p=papers.find(x=>x?.id&&x?.assetPath)||papers[0];
if(!p)throw new Error('no smoke paper available');
const full=await get(`/api/paper?id=${encodeURIComponent(p.id)}`);
requireStatus(full,[200,206],'valid paper');
const type=String(full.headers.get('content-type')||'').toLowerCase();
if(!type.includes('application/pdf'))throw new Error(`valid paper content-type mismatch: ${type}`);
const head=new Uint8Array(await full.arrayBuffer()).subarray(0,5);
if(String.fromCharCode(...head)!=='%PDF-')throw new Error('valid paper response is not a PDF');
const ranged=await get(`/api/paper?id=${encodeURIComponent(p.id)}`,{Range:'bytes=0-31'});
requireStatus(ranged,[206],'range request');
if(!String(ranged.headers.get('content-range')||'').startsWith('bytes 0-'))throw new Error('range response missing Content-Range');
const missing=await get('/api/paper?id=definitely-not-an-awenture-paper');
if(missing.status<400||missing.status>=500)throw new Error(`unknown id must be denied with 4xx, got ${missing.status}`);
const traversal=await get('/api/paper?id=..%2F..%2Fsource%2Fsecret.pdf');
if(traversal.status<400||traversal.status>=500)throw new Error(`path traversal must be denied with 4xx, got ${traversal.status}`);
console.log(JSON.stringify({release:'6.18.2',previewPaperDeliverySmoke:'PASS',base,paperId:p.id,paperStatus:full.status,rangeStatus:ranged.status,unknownIdStatus:missing.status,pathTraversalStatus:traversal.status,protectionBypass:Boolean(bypass)}));
