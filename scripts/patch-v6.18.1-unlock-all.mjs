import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlPath=path.join(root,'dist','index.html');
let html=fs.readFileSync(htmlPath,'utf8');

const runtimeMarker="<script>\n(()=>{'use strict';\nconst CFG=";
if(!html.includes(runtimeMarker)) throw new Error('AW progression runtime marker missing');

const preload=`<script>\n(()=>{'use strict';try{const KEY='awenture-learning-progression-v1',all=['icas-y2','icas-y3','naplan-y3','icas-y4','oc-prep'];let p={};try{p=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){p={}}p.unlocked=all;p.current=all.includes(p.current)?p.current:'icas-y2';p.temporaryUnlockAll=true;localStorage.setItem(KEY,JSON.stringify(p))}catch(_){}})();\n</script>\n`;

html=html.replace(runtimeMarker,preload+runtimeMarker);
html=html.replace('awenture-release" content="6.18.0"','awenture-release" content="6.18.1"');
fs.writeFileSync(htmlPath,html);
console.log(JSON.stringify({release:'6.18.1',feature:'temporary-unlock-all-learning-paths',stages:5,productionGatesStoredButBypassed:true}));
