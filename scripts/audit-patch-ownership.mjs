import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const scriptsDir=path.join(root,'scripts');
const files=fs.readdirSync(scriptsDir).filter(name=>name.endsWith('.mjs')).sort();
const buildCommands=[String(pkg.scripts?.['build:legacy']||''),String(pkg.scripts?.build||''),String(pkg.scripts?.postbuild||'')].join(' && ');
const classify=(name,source)=>{
  if(/^patch-/.test(name))return 'release-overlay';
  if(/^finalize-/.test(name))return 'release-finalizer';
  if(/^harden-/.test(name))return 'canonical-contract-hardening';
  if(/^(apply|reconcile|promote)-/.test(name))return 'data-migration';
  if(/^(render|diagnose|audit|export|review|validate|verify|auto-verify|check)-/.test(name))return 'release-only';
  if(/^build-/.test(name)||name==='build.mjs')return 'canonical-build';
  if(/document\.querySelector|querySelectorAll|insertAdjacentHTML/.test(source))return 'dom-mutation';
  return 'support';
};
const entries=files.map(name=>{
  const source=fs.readFileSync(path.join(scriptsDir,name),'utf8');
  const invokedByBuild=buildCommands.includes(`scripts/${name}`);
  return {
    file:`scripts/${name}`,
    classification:classify(name,source),
    invokedByBuild,
    mutations:{css:/\.css|<style|style\./.test(source),dom:/querySelector|insertAdjacentHTML|innerHTML/.test(source),data:/JSON\.(parse|stringify)|writeFileSync/.test(source)}
  };
});
const buildMutators=entries.filter(x=>x.invokedByBuild&&['release-overlay','release-finalizer','canonical-contract-hardening'].includes(x.classification));
for(const [scriptName,command] of Object.entries({'build:legacy':pkg.scripts?.['build:legacy'],build:pkg.scripts?.build,postbuild:pkg.scripts?.postbuild})){
  const invokedNames=[...String(command||'').matchAll(/scripts\/((?:patch|harden|finalize)-[^ &]+\.mjs)/g)].map(m=>m[1]);
  if(invokedNames.length!==new Set(invokedNames).size)throw new Error(`Patch ownership audit: duplicate script invocation within ${scriptName}`);
}
const report={schemaVersion:1,release:pkg.version,generatedDeterministically:true,summary:{scripts:entries.length,buildMutators:buildMutators.length},ownershipPolicy:{releaseOverlay:'owns only its named release',releaseFinalizer:'may stamp only its named release',canonicalRuntime:'must not be overwritten by later release overlays'},entries};
const outDir=path.join(root,'dist','release-audit');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'patch-ownership.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({patchOwnership:'PASS',scripts:entries.length,buildMutators:buildMutators.length,output:'dist/release-audit/patch-ownership.json'}));
