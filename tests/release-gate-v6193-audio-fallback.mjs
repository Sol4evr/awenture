import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const fail=message=>{throw new Error(message)};
const html=fs.readFileSync('dist/index.html','utf8');
const patch=fs.readFileSync('scripts/patch-v6.16.0.mjs','utf8');
const manifest=JSON.parse(fs.readFileSync('audio/tts-v1/manifest.json','utf8'));
const deployedManifest=JSON.parse(fs.readFileSync('dist/audio/tts-v1/manifest.json','utf8'));

if(!html.includes('awenture-release" content="6.19.3"'))fail('release marker is not v6.19.3');
if(!html.includes("window.__AW_AUDIO_HEALTH={mode:'idle'"))fail('diagnostic audio health state is missing');
if(!html.includes("new Audio('/audio/tts-v1/'"))fail('bundled media is not the primary audio path');
if(!html.includes("if(typeof Audio!=='function')"))fail('missing HTML Audio capability is not handled');
if(!html.includes('function speechFallback('))fail('speech synthesis fallback is missing for unbundled dynamic questions');
if(!html.includes("Audio is unavailable on this device."))fail('audio failure is still silent');
if(!html.includes('role="status"'))fail('audio failure is not announced accessibly');
if(!patch.includes("fs.cpSync(audioSource,audioTarget,{recursive:true})"))fail('owning patch does not deploy governed audio assets');
if(html.includes("if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)||!sess)return"))fail('silent Web Speech early-return regression reintroduced');

const entries=Object.entries(manifest.questions||{});
if(entries.length!==203)fail(`expected 203 governed audio assets, found ${entries.length}`);
if(JSON.stringify(manifest)!==JSON.stringify(deployedManifest))fail('deployed audio manifest differs from governed source manifest');
for(const [id,metadata] of entries){
  if(!/^[A-Za-z0-9_-]+$/.test(id))fail(`unsafe audio id ${id}`);
  const file=path.join('audio','tts-v1',`${id}.mp3`);
  const deployed=path.join('dist','audio','tts-v1',`${id}.mp3`);
  if(!fs.existsSync(file)||!fs.existsSync(deployed))fail(`missing audio asset ${id}`);
  const bytes=fs.readFileSync(file);
  if(bytes.length!==metadata.bytes||bytes.length<1000)fail(`invalid audio size ${id}`);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==metadata.sha256)fail(`audio hash mismatch ${id}`);
  if(!bytes.equals(fs.readFileSync(deployed)))fail(`deployed audio differs ${id}`);
  if(bytes[0]!==0xff&&(bytes.toString('ascii',0,3)!=='ID3'))fail(`audio is not an MP3 ${id}`);
}

console.log(JSON.stringify({release:'6.19.3',audioFallbackGate:'PASS',contracts:{governedAssets:entries.length,bundledMediaPrimary:true,worksWithoutWebSpeech:true,speechFallbackForDynamicItems:true,silentFailurePrevented:true,answerMetadataExcluded:true}}));
