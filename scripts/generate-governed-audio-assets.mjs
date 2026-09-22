import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const htmlFile=path.join(root,'dist','index.html');
const outputDir=path.join(root,'audio','tts-v1');
const html=fs.readFileSync(htmlFile,'utf8');

function readArrays(source){
  const marker='window.AW_BANK.push(...';
  const questions=[];
  let cursor=0;
  while((cursor=source.indexOf(marker,cursor))>=0){
    const start=cursor+marker.length;
    let depth=0,inString=false,escaped=false,end=-1;
    for(let i=start;i<source.length;i++){
      const char=source[i];
      if(inString){
        if(escaped)escaped=false;
        else if(char==='\\')escaped=true;
        else if(char==='"')inString=false;
        continue;
      }
      if(char==='"'){inString=true;continue}
      if(char==='[')depth++;
      if(char===']'&&--depth===0){end=i+1;break}
    }
    if(end<0)throw new Error('Unterminated AW_BANK array');
    questions.push(...JSON.parse(source.slice(start,end)));
    cursor=end;
  }
  return questions;
}

function clean(value){
  return String(value||'')
    .replace(/<[^>]*>/g,' ')
    .replace(/&amp;/g,' and ')
    .replace(/&lt;/g,' less than ')
    .replace(/&gt;/g,' greater than ')
    .replace(/[×]/g,' times ')
    .replace(/[÷]/g,' divided by ')
    .replace(/[–—]/g,'-')
    .replace(/[^\x20-\x7E]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function transcript(question){
  if(question.subject==='Spelling'&&question.audioWord){
    return [question.audioWord,question.audioSentence,question.audioWord].map(clean).filter(Boolean).join('. ')+'.';
  }
  const parts=[question.stimulus,question.question,...question.options.map((option,index)=>`${'ABCD'[index]}. ${option}`)];
  return parts.map(clean).filter(Boolean).join('. ')+'.';
}

const questions=readArrays(html);
if(questions.length!==203||new Set(questions.map(q=>q.id)).size!==questions.length){
  throw new Error(`Governed audio source bank mismatch: ${questions.length} questions`);
}
fs.rmSync(outputDir,{recursive:true,force:true});
fs.mkdirSync(outputDir,{recursive:true});
const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'awenture-audio-'));
const manifest={version:1,format:'audio/mpeg',voice:'flite-slt',questions:{}};
try{
  for(const question of questions){
    if(!/^[A-Za-z0-9_-]+$/.test(question.id))throw new Error(`Unsafe audio id: ${question.id}`);
    const text=transcript(question);
    const textFile=path.join(tempDir,`${question.id}.txt`);
    const generatedFile=path.join(tempDir,`${question.id}.mp3`);
    const outputFile=path.join(outputDir,`${question.id}.mp3`);
    fs.writeFileSync(textFile,text);
    const tempo=question.subject==='Spelling'?'0.90':'1.0';
    const run=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`flite=textfile=${textFile}:voice=slt`,'-af',`atempo=${tempo}`,'-ac','1','-ar','24000','-c:a','libmp3lame','-b:a','32k','-write_xing','0','-map_metadata','-1','-fflags','+bitexact','-flags:a','+bitexact','-y',generatedFile],{encoding:'utf8'});
    if(run.status!==0)throw new Error(`Audio generation failed for ${question.id}: ${run.stderr}`);
    const media=fs.readFileSync(generatedFile);
    if(media.length<1000)throw new Error(`Audio asset unexpectedly small: ${question.id}`);
    fs.writeFileSync(outputFile,media);
    manifest.questions[question.id]={sha256:crypto.createHash('sha256').update(media).digest('hex'),transcriptSha256:crypto.createHash('sha256').update(text).digest('hex'),bytes:media.length};
  }
}finally{
  fs.rmSync(tempDir,{recursive:true,force:true});
}
fs.writeFileSync(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
for(const [id,metadata] of Object.entries(manifest.questions)){
  const bytes=fs.readFileSync(path.join(outputDir,`${id}.mp3`));
  if(bytes.length!==metadata.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==metadata.sha256)throw new Error(`Post-generation audio verification failed: ${id}`);
}
const totalBytes=Object.values(manifest.questions).reduce((sum,item)=>sum+item.bytes,0);
console.log(JSON.stringify({audioAssets:questions.length,totalBytes,format:manifest.format,voice:manifest.voice,answersIncluded:false}));
