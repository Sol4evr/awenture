import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=path.join(root,'baseline','historical-corpus-v1.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.id!=='aw-historical-corpus-v1'||manifest.locked!==true)throw new Error('Historical corpus baseline v1 is not locked');
let tree='';
try{tree=execFileSync('git',['rev-parse','HEAD:source'],{cwd:root,encoding:'utf8'}).trim()}catch(err){throw new Error('Unable to resolve source Git tree for historical baseline verification')}
if(tree!==manifest.sourceTreeSha){
  throw new Error(`Historical source tree changed: expected ${manifest.sourceTreeSha}, got ${tree}. Create a new historical baseline version rather than rebuilding v1.`);
}
const runtime=JSON.parse(fs.readFileSync(path.join(root,'bank','v6.13.1-original-paper-runtime.json'),'utf8'));
if(runtime.papers.length!==manifest.year2RuntimePapers)throw new Error(`Year 2 runtime inventory drifted: ${runtime.papers.length}/${manifest.year2RuntimePapers}`);
console.log(JSON.stringify({historicalBaseline:manifest.id,status:'PASS',sourceTreeSha:tree,sourcePdfCount:manifest.sourcePdfCount,ordinaryBuild:'FAST_BASELINE_MODE'}));
