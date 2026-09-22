import fs from 'node:fs';

const fail=message=>{throw new Error(message)};
const patch=fs.readFileSync('scripts/patch-v6.16.0.mjs','utf8');
const html=fs.readFileSync('dist/index.html','utf8');

if(!html.includes('awenture-release" content="6.19.2"'))fail('release marker is not v6.19.2');
if(html.includes('speechSynthesis.cancel();speechSynthesis.speak('))fail('cancel-then-speak race reintroduced');
if(html.includes('synth.cancel();synth.speak('))fail('canonical speech queue is cancelled immediately before speak');
if(!patch.includes('const speechReplacement='))fail('owning speech patch replacement is missing');
for(const required of [
  'let speechUtterance=null',
  "u.lang='en-AU'",
  'if(synth.paused)synth.resume()',
  'speechUtterance=u',
  'synth.speak(u)',
  "q.subject==='Spelling'&&q.audioWord?[q.audioWord,q.audioSentence,q.audioWord]"
])if(!html.includes(required))fail('speech runtime contract missing: '+required);
if(!html.includes("if(a==='read')return read()"))fail('Read/Listen button is not connected to the speech runtime');
if(!html.includes("q.subject==='Spelling'?'🔊 Listen to word':'🔊 Read'"))fail('Read/Listen button labels missing');
if(!html.includes("start(subjectTest(ss.dataset.s),'icas-test',ss.dataset.s)"))fail('subject-test sessions no longer use the shared practice runtime');
if((html.match(/function read\(\)\{/g)||[]).length!==1)fail('speech runtime ownership must remain singular');

console.log(JSON.stringify({release:'6.19.2',audioGate:'PASS',contracts:{directUserGesture:true,cancelBeforeSpeak:false,utteranceRetained:true,pausedEngineResumed:true,australianEnglish:true,spellingSequence:'WORD_SENTENCE_WORD',sharedPracticeAndSubjectTestRuntime:true}}));
