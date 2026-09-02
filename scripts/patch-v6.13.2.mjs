import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'dist/index.html');
let html=fs.readFileSync(file,'utf8');
html=html.replaceAll('6.13.1.4','6.13.2.0').replaceAll('61314','61320');
fs.writeFileSync(file,html);
console.log(JSON.stringify({release:'6.13.2.0',parentView:'PERFORMANCE_SPECTRUM',progressTile:'REMOVED'}));
