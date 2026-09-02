import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'dist/index.html');
let html=fs.readFileSync(file,'utf8');
html=html.replaceAll('6.13.2.0','6.14.0').replaceAll('61320','61400');
for(const forbidden of ['window.__AW_FORMAL_FORMS','window.__AW_FORMAL_API','function startFormal(','formalForms:9','Formal ICAS-style test'])if(html.includes(forbidden))throw new Error(`Superseded generated formal runtime remains: ${forbidden}`);
fs.writeFileSync(file,html);
// Hardened release sentinel: this build file intentionally triggers the exact Vercel candidate used for promotion.
console.log(JSON.stringify({release:'6.14.0',baseline:'HARDENED',legacyGeneratedFormal:'ABSENT'}));
