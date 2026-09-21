import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'dist/index.html');
const spelling=JSON.parse(fs.readFileSync(path.join(root,'bank/v6.16.0-spelling.json'),'utf8'));
if(spelling.length<30)throw new Error('Spelling bank unexpectedly small');
for(const q of spelling){
  if(q.subject!=='Spelling'||q.kind!=='audio'||!q.audioWord||!q.audioSentence||!Array.isArray(q.options)||q.options.length!==4||!'ABCD'.includes(q.answer))throw new Error('Invalid spelling question '+q.id);
  if(q.options['ABCD'.indexOf(q.answer)]!==q.audioWord)throw new Error('Spelling answer/audio mismatch '+q.id);
  if(new Set(q.options.map(x=>x.toLowerCase())).size!==4)throw new Error('Duplicate spelling options '+q.id);
}
let html=fs.readFileSync(file,'utf8').replaceAll('6.15.3','6.16.0').replaceAll('61530','61600');
const runtimeMarker="\n\n(()=>{'use strict';\nconst A=";
if(!html.includes(runtimeMarker))throw new Error('Core runtime injection marker not found');
html=html.replace(runtimeMarker,`\n\n/* v6.16.0 AWenture-generated audio spelling bank, calibrated to ICAS Year 2 level; not an original ICAS question set */\nwindow.AW_BANK.push(...${JSON.stringify(spelling)});${runtimeMarker}`);
const readMarker="const q=sess.items[sess.i],u=new SpeechSynthesisUtterance([q.stimulus,q.question,...q.options.map((o,i)=>L[i]+'. '+o)].filter(Boolean).join('. ')),vs=";
const readReplacement="const q=sess.items[sess.i],spoken=q.subject==='Spelling'&&q.audioWord?[q.audioWord,q.audioSentence,q.audioWord]:[q.stimulus,q.question,...q.options.map((o,i)=>L[i]+'. '+o)],u=new SpeechSynthesisUtterance(spoken.filter(Boolean).join('. ')),vs=";
if(!html.includes(readMarker))throw new Error('Speech synthesis marker not found');
html=html.replace(readMarker,readReplacement);
if(!html.includes('u.rate=.92;u.pitch=1.04;'))throw new Error('Speech rate marker not found');
html=html.replace('u.rate=.92;u.pitch=1.04;',"u.rate=q.subject==='Spelling'?.82:.92;u.pitch=1.04;");
const speechMarker="function stopRead(){if('speechSynthesis'in window)speechSynthesis.cancel();speaking=false;}\nfunction read(){if(!('speechSynthesis'in window)||!sess)return;if(speaking){stopRead();return render()}const q=sess.items[sess.i],spoken=q.subject==='Spelling'&&q.audioWord?[q.audioWord,q.audioSentence,q.audioWord]:[q.stimulus,q.question,...q.options.map((o,i)=>L[i]+'. '+o)],u=new SpeechSynthesisUtterance(spoken.filter(Boolean).join('. ')),vs=speechSynthesis.getVoices(),v=vs.find(v=>/Karen|Matilda|Samantha/.test(v.name))||vs.find(v=>/^en-AU/.test(v.lang))||vs.find(v=>/^en-/.test(v.lang))||vs[0];if(v)u.voice=v;u.rate=q.subject==='Spelling'?.82:.92;u.pitch=1.04;u.onend=()=>{speaking=false;render()};u.onerror=()=>{speaking=false};speaking=true;speechSynthesis.cancel();speechSynthesis.speak(u);render();}";
const speechReplacement="let speechUtterance=null,speechAudio=null,audioNotice='',audioToken=0;window.__AW_AUDIO_HEALTH={mode:'idle',state:'idle',questionId:null,error:null};\nfunction stopRead(){audioToken++;if(speechAudio){speechAudio.onplaying=speechAudio.onended=speechAudio.onerror=null;speechAudio.pause();speechAudio.removeAttribute('src');speechAudio.load();speechAudio=null}if('speechSynthesis'in window)try{speechSynthesis.cancel()}catch(_){}speechUtterance=null;speaking=false;audioNotice='';window.__AW_AUDIO_HEALTH={...window.__AW_AUDIO_HEALTH,state:'stopped'};}\nfunction speechFallback(q,spoken,token){if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return false;try{const synth=window.speechSynthesis,u=new SpeechSynthesisUtterance(spoken.filter(Boolean).join('. ')),vs=synth.getVoices(),v=vs.find(v=>/Karen|Matilda|Samantha/i.test(v.name))||vs.find(v=>/^en-AU/i.test(v.lang))||vs.find(v=>/^en-/i.test(v.lang))||vs[0];u.lang='en-AU';if(v)u.voice=v;u.rate=q.subject==='Spelling'?.82:.92;u.pitch=1.04;const done=()=>{if(token!==audioToken||speechUtterance!==u)return;speechUtterance=null;speaking=false;window.__AW_AUDIO_HEALTH={mode:'speech-synthesis',state:'ended',questionId:q.id,error:null};render()};u.onend=done;u.onerror=()=>{if(token!==audioToken)return;speechUtterance=null;speaking=false;audioNotice='Audio is unavailable on this device.';window.__AW_AUDIO_HEALTH={mode:'speech-synthesis',state:'error',questionId:q.id,error:'speech-error'};render()};speechUtterance=u;speaking=true;if(synth.paused)synth.resume();synth.speak(u);window.__AW_AUDIO_HEALTH={mode:'speech-synthesis',state:'playing',questionId:q.id,error:null};return true}catch(_){return false}}\nfunction read(){if(!sess)return;if(speaking){stopRead();return render()}const q=sess.items[sess.i],spoken=q.subject==='Spelling'&&q.audioWord?[q.audioWord,q.audioSentence,q.audioWord]:[q.stimulus,q.question,...q.options.map((o,i)=>L[i]+'. '+o)],token=++audioToken;audioNotice='';if(typeof Audio!=='function'){if(!speechFallback(q,spoken,token)){audioNotice='Audio is unavailable on this device.';window.__AW_AUDIO_HEALTH={mode:'none',state:'error',questionId:q.id,error:'no-audio-api'}}return render()}const audio=new Audio('/audio/tts-v1/'+encodeURIComponent(q.id)+'.mp3?v=1');speechAudio=audio;audio.preload='auto';audio.playsInline=true;speaking=true;window.__AW_AUDIO_HEALTH={mode:'bundled-media',state:'starting',questionId:q.id,error:null};audio.onplaying=()=>{if(token===audioToken)window.__AW_AUDIO_HEALTH={mode:'bundled-media',state:'playing',questionId:q.id,error:null}};audio.onended=()=>{if(token!==audioToken||speechAudio!==audio)return;speechAudio=null;speaking=false;window.__AW_AUDIO_HEALTH={mode:'bundled-media',state:'ended',questionId:q.id,error:null};render()};const failed=()=>{if(token!==audioToken||speechAudio!==audio)return;speechAudio=null;audio.pause();audio.removeAttribute('src');if(!speechFallback(q,spoken,token)){speaking=false;audioNotice='Audio is unavailable on this device.';window.__AW_AUDIO_HEALTH={mode:'none',state:'error',questionId:q.id,error:'media-and-speech-unavailable'};render()}};audio.onerror=failed;const started=audio.play();if(started&&typeof started.catch==='function')started.catch(failed);render();}";
if(!html.includes(speechMarker))throw new Error('Canonical speech runtime marker not found');
html=html.replace(speechMarker,speechReplacement);
const stimulusMarker='function stimulus(q){const text=';
if(!html.includes(stimulusMarker))throw new Error('Stimulus marker not found');
html=html.replace(stimulusMarker,"function stimulus(q){if(q.subject==='Spelling'&&q.audioWord)return '<div class=\"stimulus-empty aw-spelling-listen\"><span>🔊 Tap “Listen to word” above, then choose the correct spelling.</span></div>';const text=");
const readButton="<button class=\"iconbtn\" data-a=\"read\">${speaking?'■ Stop':'🔊 Read'}</button>";
const spellingButton="<button class=\"iconbtn\" data-a=\"read\">${speaking?'■ Stop':q.subject==='Spelling'?'🔊 Listen to word':'🔊 Read'}</button>";
if(!html.includes(readButton))throw new Error('Read button marker not found');
html=html.replace(readButton,spellingButton);
const readStatusMarker=spellingButton;
const readStatusReplacement=spellingButton+'${audioNotice?`<span class="aw-audio-status" role="status">${esc(audioNotice)}</span>`:\'\'}';
if(!html.includes(readStatusMarker))throw new Error('Audio status marker not found');
html=html.replace(readStatusMarker,readStatusReplacement);
const dailyMarker='window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle(out.slice(0,12),sd+173);';
const dailyReplacement=`const spellingPool=BANK.filter(q=>q.subject==='Spelling'&&q.kind==='audio');
  const spellingCandidates=[...shuffle(spellingPool.filter(q=>!seen.has(q.id)&&!recent.has(familyKey(q))),sd+211),...shuffle(spellingPool.filter(q=>!seen.has(q.id)&&recent.has(familyKey(q))),sd+223),...shuffle(spellingPool.filter(q=>seen.has(q.id)),sd+227)];
  for(const q of spellingCandidates){if(out.filter(x=>x.subject==='Spelling').length===3)break;const f=familyKey(q);if(out.some(x=>x.id===q.id)||used.has(f))continue;out.push(q);used.add(f)}
  if(out.filter(x=>x.subject==='Spelling').length!==3)throw new Error('AWenture spelling pool could not supply 3 Daily Practice questions');
  window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle(out.slice(0,15),sd+173);`;
if(!html.includes(dailyMarker))throw new Error('Daily Practice completion marker not found');
html=html.replace(dailyMarker,dailyReplacement);
html=html.replaceAll("Object.fromEntries(SUB.map(s=>[s,BANK.filter(q=>q.subject===s).length]))","Object.fromEntries([...SUB,'Spelling'].map(s=>[s,BANK.filter(q=>q.subject===s).length]))");
fs.writeFileSync(file,html);

const audioSource=path.join(root,'audio/tts-v1');
const audioTarget=path.join(root,'dist/audio/tts-v1');
if(!fs.existsSync(path.join(audioSource,'manifest.json')))throw new Error('Governed audio assets are missing');
fs.mkdirSync(path.dirname(audioTarget),{recursive:true});
fs.cpSync(audioSource,audioTarget,{recursive:true});
const practiceCss=path.join(root,'dist/practice-flow.css');
fs.appendFileSync(practiceCss,'\n.aw-audio-status{font-size:.78rem;color:#8b1e1e;max-width:14rem}\n');

const insightsFile=path.join(root,'dist/insights.js');
let insights=fs.readFileSync(insightsFile,'utf8');
const insightReplacements=[
  ["const SUBJECTS=['English','Mathematics','Science'];","const SUBJECTS=['English','Mathematics','Science','Spelling'];\nconst TOPUP_SUBJECTS=['English','Mathematics','Science'];"],
  ["const key=SUBJECTS.map(s=>unseen[s]).join('-');","const key=TOPUP_SUBJECTS.map(s=>unseen[s]).join('-');"],
  ["const icons={English:'Aa',Mathematics:'×',Science:'✦'};","const icons={English:'Aa',Mathematics:'×',Science:'✦',Spelling:'🔊'};"],
  ["const deficits=Object.fromEntries(SUBJECTS.map(s=>[s,Math.max(0,TOPUP_TARGET-unseen[s])]));","const deficits=Object.fromEntries(TOPUP_SUBJECTS.map(s=>[s,Math.max(0,TOPUP_TARGET-unseen[s])]));"],
  ["const requested=Object.values(deficits).some(Boolean)?deficits:Object.fromEntries(SUBJECTS.map(s=>[s,10]));","const requested=Object.values(deficits).some(Boolean)?deficits:Object.fromEntries(TOPUP_SUBJECTS.map(s=>[s,10]));"],
  ["weakest:Object.fromEntries(SUBJECTS.map(s=>[s,weakest(rows,s)]))","weakest:Object.fromEntries(TOPUP_SUBJECTS.map(s=>[s,weakest(rows,s)]))"],
  ["function backendPayload(req){return {requestKey:req.requestId,sourceRelease:req.release,bankSize:req.bankSize,targetUnseenPerSubject:TOPUP_TARGET,unseenBySubject:req.unseen,requiredBySubject:req.requested,focusSubskills:Object.fromEntries(SUBJECTS.map(s=>[s,req.weakest[s].map(x=>x.skill)])),qaPolicy:req.qualityPolicy}}","function backendPayload(req){return {requestKey:req.requestId,sourceRelease:req.release,bankSize:req.bankSize,targetUnseenPerSubject:TOPUP_TARGET,unseenBySubject:Object.fromEntries(TOPUP_SUBJECTS.map(s=>[s,req.unseen[s]])),requiredBySubject:req.requested,focusSubskills:Object.fromEntries(TOPUP_SUBJECTS.map(s=>[s,req.weakest[s].map(x=>x.skill)])),qaPolicy:req.qualityPolicy}}"],
  ["minimum=Math.min(...Object.values(unseen))","minimum=Math.min(...TOPUP_SUBJECTS.map(s=>unseen[s]))"]
];
for(const [from,to] of insightReplacements){if(!insights.includes(from))throw new Error('Parent spelling insight marker not found: '+from);insights=insights.replace(from,to)}
fs.writeFileSync(insightsFile,insights);
console.log(JSON.stringify({release:'6.16.0',spellingBank:spelling.length,dailyQuestionCount:15,dailyMix:{English:4,Mathematics:4,Science:4,Spelling:3},audioMode:'WORD_SENTENCE_WORD',tts:'BUNDLED_MEDIA_WITH_SPEECH_FALLBACK',parentInsights:'SPELLING_INCLUDED',topupSubjects:['English','Mathematics','Science'],provenance:'AWENTURE_GENERATED_ICAS_Y2_CALIBRATED'}));
