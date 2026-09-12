import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlFile=path.join(root,'dist','index.html');
let html=fs.readFileSync(htmlFile,'utf8');

const has6190=html.includes('awenture-release\\" content=\\"6.19.0\\"')||html.includes('awenture-release" content="6.19.0"');
if(!has6190)throw new Error('v6.19.1 finalizer requires immutable v6.19.0 output');

html=html.replace('awenture-release\\" content=\\"6.19.0\\"','awenture-release\\" content=\\"6.19.1\\"');
html=html.replace('awenture-release" content="6.19.0"','awenture-release" content="6.19.1"');
html=html.replaceAll("RELEASE='6.19.0'","RELEASE='6.19.1'");

if(!html.includes('6.19.1'))throw new Error('v6.19.1 release marker finalization failed');
fs.writeFileSync(htmlFile,html);

console.log(JSON.stringify({release:'6.19.1',parentRelease:'6.19.0',purpose:'stability-hardening',runtimeFeatureDelta:'none'}));
