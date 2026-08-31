import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html','styles.css','bank-eng.js','bank-math.js','bank-sci.js','app.js'];
const content = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
const release = files.map(f => content[f]).join('\n');

const mustContain = [
  'content="6.9.0"',
  "RELEASE='6.9.0'",
  'oc-ready-progress-v1',
  'My Collection',
  'Made with love by Arthur Wang (daddy), 2026',
  'data-a="parent"',
  'subjectTest(subject)',
  'Confidence Champion',
  'speechSynthesis',
  'window.AW_BANK=[]',
  'legacy-v3.8-static',
  'for(let i=b.length-1;i>0;i--)'
];
for (const marker of mustContain) {
  if (!release.includes(marker)) throw new Error(`Release gate failed: missing ${marker}`);
}
for (const ref of ['styles.css?v=690','bank-eng.js?v=690','bank-math.js?v=690','bank-sci.js?v=690','app.js?v=690']) {
  if (!content['index.html'].includes(ref)) throw new Error(`Index missing required asset: ${ref}`);
}
const ids = [...release.matchAll(/"id":"([EMS]\d+)"/g)].map(m => m[1]);
if (new Set(ids).size !== 126) throw new Error(`Expected 126 unique bank items, got ${new Set(ids).size}`);
const visualCount = (release.match(/legacy-v3\.8-static/g) || []).length;
if (visualCount < 50) throw new Error(`Expected >=50 legacy SVG visual markers, got ${visualCount}`);
if (/DecompressionStream|atob\(parts\.join|Release integrity check failed/.test(release)) {
  throw new Error('Forbidden deployment-envelope transport detected');
}
console.log(JSON.stringify({release:'6.9.0', bank:new Set(ids).size, visualMarkers:visualCount, assets:files.length, featureRegression:'PASS'}));
