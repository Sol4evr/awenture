import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const invariants = JSON.parse(fs.readFileSync(path.join(root, 'quality/production-invariants-v1.json'), 'utf8'));
const governed = invariants.delivery;
const maxMiB = Number(process.env.AW_MAX_DEPLOY_MIB || governed.maxDeploymentMiB);
const maxBytes = maxMiB * 1024 * 1024;
const baselineMiB = Number(governed.baselineDeploymentMiB);
const growthLimitMiB = Number(governed.maxUnexplainedGrowthMiB);

if (!fs.existsSync(out)) throw new Error('Deployment size guard: dist/ does not exist after build');

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile()) files.push({ path: path.relative(out, p), bytes: fs.statSync(p).size });
  }
}
walk(out);
files.sort((a, b) => b.bytes - a.bytes);
const total = files.reduce((n, f) => n + f.bytes, 0);
const mib = n => (n / 1024 / 1024).toFixed(2);
const totalMiB=total/1024/1024;
const growthMiB=totalMiB-baselineMiB;
console.log(`AWenture deployment output: ${files.length} files, ${mib(total)} MiB (baseline ${baselineMiB} MiB; delta ${growthMiB.toFixed(2)} MiB; limit ${maxMiB} MiB)`);
for (const f of files.slice(0, 15)) console.log(`  ${mib(f.bytes).padStart(8)} MiB  ${f.path}`);
if (total > maxBytes) {
  throw new Error(`Deployment size guard failed: ${mib(total)} MiB exceeds ${maxMiB} MiB. Externalise large immutable assets before deploying.`);
}
if (growthMiB > growthLimitMiB) {
  throw new Error(`Deployment growth guard failed: ${growthMiB.toFixed(2)} MiB growth exceeds the governed ${growthLimitMiB} MiB allowance. Explain or remove unexpected assets; do not raise the ceiling.`);
}
const groups=new Map();
for(const file of files){const group=file.path.includes('/')?file.path.split('/')[0]:'root';groups.set(group,(groups.get(group)||0)+file.bytes)}
const report={schemaVersion:1,release:invariants.release,totalBytes:total,totalMiB:Number(totalMiB.toFixed(2)),baselineMiB,deltaMiB:Number(growthMiB.toFixed(2)),maxMiB,growthLimitMiB,largestGroups:[...groups].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([group,bytes])=>({group,bytes,mib:Number((bytes/1024/1024).toFixed(2))})),largestFiles:files.slice(0,15)};
const reportDir=path.join(out,'release-audit');
fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'deployment-size.json'),JSON.stringify(report,null,2)+'\n');
