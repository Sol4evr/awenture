import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {PDFDocument} from 'pdf-lib';
import {materialize,cacheRoot} from './materialize-year2-question-delivery.mjs';
const require=createRequire(import.meta.url);const {manifest,verify}=require('../lib/year2-question-delivery.js');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');await materialize();
let saved=0;
for(const a of manifest.assets){const bytes=fs.readFileSync(path.join(cacheRoot,a.path));verify(bytes,a);const doc=await PDFDocument.load(bytes);if(doc.getPageCount()!==a.pages)throw Error('External learner page count mismatch');
  const original=path.join(root,'dist',a.path);if(!fs.existsSync(original))throw Error('Missing previously gated question asset '+a.path);const gated=await PDFDocument.load(fs.readFileSync(original));if(gated.getPageCount()!==a.pages)throw Error('Gated learner page count mismatch');for(let i=0;i<a.pages;i++){const x=gated.getPage(i),y=doc.getPage(i);if(x.getWidth()!==y.getWidth()||x.getHeight()!==y.getHeight()||x.getRotation().angle!==y.getRotation().angle)throw Error('External page geometry/orientation regression '+a.path)}saved+=fs.statSync(original).size;fs.unlinkSync(original);
}
const report={schemaVersion:1,assets:22,removedBytes:saved,externalQuestionBytes:manifest.assets.reduce((n,a)=>n+a.size,0),repository:manifest.repository,commit:manifest.commit,questionUrlsUnchanged:true,answerReferencesExternalized:false,audioExternalized:false};
fs.mkdirSync(path.join(root,'dist','release-audit'),{recursive:true});fs.writeFileSync(path.join(root,'dist','release-audit','year2-question-delivery.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
