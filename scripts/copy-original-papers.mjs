import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'source','original-icas','year2');
const dest=path.join(root,'dist','original-icas','year2');
if(!fs.existsSync(source)) throw new Error('Original ICAS source directory missing');
fs.mkdirSync(dest,{recursive:true});
fs.cpSync(source,dest,{recursive:true});
fs.copyFileSync(path.join(root,'source','icas-y2-original-papers.json'),path.join(root,'dist','original-icas','icas-y2-original-papers.json'));
console.log(JSON.stringify({originalPaperAssets:'COPIED',destination:'dist/original-icas/year2'}));
