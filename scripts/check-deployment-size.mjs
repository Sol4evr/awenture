import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const maxMiB = Number(process.env.AW_MAX_DEPLOY_MIB || 150);
const maxBytes = maxMiB * 1024 * 1024;

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
console.log(`AWenture deployment output: ${files.length} files, ${mib(total)} MiB (limit ${maxMiB} MiB)`);
for (const f of files.slice(0, 15)) console.log(`  ${mib(f.bytes).padStart(8)} MiB  ${f.path}`);
if (total > maxBytes) {
  throw new Error(`Deployment size guard failed: ${mib(total)} MiB exceeds ${maxMiB} MiB. Externalise large immutable assets before deploying.`);
}
