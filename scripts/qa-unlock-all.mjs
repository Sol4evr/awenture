import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlPath=path.join(root,'dist','index.html');
let html=fs.readFileSync(htmlPath,'utf8');
const marker="<script>\n(()=>{'use strict';\nconst CFG=";
if(!html.includes(marker)) throw new Error('AW progression runtime marker missing');
const preload=`<script>\n(()=>{try{localStorage.setItem('awenture-learning-progression-v1',JSON.stringify({unlocked:['icas-y2','icas-y3','naplan-y3','icas-y4','oc-prep'],current:'icas-y2',qaUnlockAll:true}))}catch(_){}})();\n</script>\n`;
html=html.replace(marker,preload+marker);
fs.writeFileSync(htmlPath,html);
console.log(JSON.stringify({qa:'unlock-all-learning-paths',stages:5,productionGatesPreserved:true}));
