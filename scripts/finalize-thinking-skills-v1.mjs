import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'dist/index.html');let html=fs.readFileSync(file,'utf8');
if(!html.includes('/thinking-skills.js?v=1')){
 const anchor="S==='collection'?collection():results();}";
 if(!html.includes(anchor))throw Error('Thinking Skills requires the canonical render lifecycle');
 html=html.replace(anchor,"S==='collection'?collection():results();window.dispatchEvent(new CustomEvent('aw:render'));}");
 html=html.replace('</head>','<link rel="stylesheet" href="/thinking-skills.css?v=1"></head>');
 html=html.replace('</body>','<script src="/thinking-skills.js?v=1" defer></script></body>');
 fs.writeFileSync(file,html);
}
for(const name of ['thinking-skills.js','thinking-skills.css'])fs.copyFileSync(path.join(root,'ui',name),path.join(root,'dist',name));
fs.copyFileSync(path.join(root,'bank/thinking-skills-y1.json'),path.join(root,'dist/thinking-skills-y1.json'));
console.log('Thinking Skills: 56 original questions, dedicated section and 3-puzzle daily activity.');
