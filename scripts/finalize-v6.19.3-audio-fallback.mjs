import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlFile=path.join(root,'dist','index.html');
let html=fs.readFileSync(htmlFile,'utf8');

if(!html.includes('awenture-release" content="6.19.2"'))throw new Error('v6.19.3 audio finalizer requires immutable v6.19.2 output');
html=html.replace('awenture-release" content="6.19.2"','awenture-release" content="6.19.3"');
html=html.replaceAll("RELEASE='6.19.2'","RELEASE='6.19.3'");
if(!html.includes('6.19.3'))throw new Error('v6.19.3 release marker finalization failed');
fs.writeFileSync(htmlFile,html);

console.log(JSON.stringify({release:'6.19.3',parentRelease:'6.19.2',purpose:'device-independent-audio-fallback',runtimeFeatureDelta:'governed-bundled-audio'}));
