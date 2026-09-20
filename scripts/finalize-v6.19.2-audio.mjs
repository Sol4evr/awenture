import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlFile=path.join(root,'dist','index.html');
let html=fs.readFileSync(htmlFile,'utf8');

if(!html.includes('awenture-release" content="6.19.1"'))throw new Error('v6.19.2 audio finalizer requires immutable v6.19.1 output');
html=html.replace('awenture-release" content="6.19.1"','awenture-release" content="6.19.2"');
html=html.replaceAll("RELEASE='6.19.1'","RELEASE='6.19.2'");
if(!html.includes('6.19.2'))throw new Error('v6.19.2 release marker finalization failed');
fs.writeFileSync(htmlFile,html);

console.log(JSON.stringify({release:'6.19.2',parentRelease:'6.19.1',purpose:'speech-audio-hardening',runtimeFeatureDelta:'speech-runtime-only'}));
