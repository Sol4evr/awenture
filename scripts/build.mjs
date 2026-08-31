import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(fs.readFileSync(path.join(root,'baseline/manifest.json'),'utf8'));
let b64=''; for(let i=1;i<=m.parts;i++) b64+=fs.readFileSync(path.join(root,`baseline/v6.9.0.part${String(i).padStart(2,'0')}`),'utf8').trim();
const baseline=zlib.gunzipSync(Buffer.from(b64,'base64'));
const sha=crypto.createHash('sha256').update(baseline).digest('hex');
if(sha!==m.sha256) throw new Error(`AWenture baseline integrity failure: ${sha}`);
if(baseline.length!==m.decodedBytes) throw new Error(`AWenture baseline size mismatch: ${baseline.length}`);

const release='6.10.2';
let html=baseline.toString('utf8');
html=html.replace('content="6.9.0"',`content="${release}"`);
html=html.replace("RELEASE='6.9.0'",`RELEASE='${release}'`);
html=html.replace('</head>','<link rel="stylesheet" href="/premium.css?v=6102"><link rel="stylesheet" href="/practice-flow.css?v=6102"><link rel="stylesheet" href="/home-insights.css?v=6102"></head>');
html=html.replace('</body>','<script src="/premium.js?v=6102" defer></script><script src="/insights.js?v=6102" defer></script></body>');

fs.rmSync(path.join(root,'dist'),{recursive:true,force:true});
fs.mkdirSync(path.join(root,'dist'));
fs.writeFileSync(path.join(root,'dist/index.html'),html);
fs.copyFileSync(path.join(root,'ui/premium.css'),path.join(root,'dist/premium.css'));
fs.copyFileSync(path.join(root,'ui/practice-flow.css'),path.join(root,'dist/practice-flow.css'));
fs.copyFileSync(path.join(root,'ui/home-insights.css'),path.join(root,'dist/home-insights.css'));
fs.copyFileSync(path.join(root,'ui/premium.js'),path.join(root,'dist/premium.js'));
fs.copyFileSync(path.join(root,'ui/insights.js'),path.join(root,'dist/insights.js'));
console.log(JSON.stringify({release,baselineRelease:m.release,baselineSha256:sha,baselineBytes:baseline.length,uiModules:['premium-v1','practice-flow-v1','home-insights-v1'],output:'dist'}));
