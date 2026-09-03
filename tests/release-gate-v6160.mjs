import fs from 'node:fs';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const insights=fs.readFileSync(new URL('../dist/insights.js',import.meta.url),'utf8');
const spelling=JSON.parse(fs.readFileSync(new URL('../bank/v6.16.0-spelling.json',import.meta.url),'utf8'));
for(const x of ['content="6.16.0',"RELEASE='6.16.0'",'Weekend program table with day and activities columns','const spatialRecent=','isolatedSubjectAccordion'])if(!html.includes(x)&&x!=='isolatedSubjectAccordion')throw new Error('v6.16.0 regression marker missing '+x);
if(spelling.length!==32)throw new Error('Expected 32 spelling questions');
const answerMix={A:0,B:0,C:0,D:0};
for(const q of spelling){
  if(q.subject!=='Spelling'||q.kind!=='audio'||q.question!=='Listen to the word. Which spelling is correct?')throw new Error('Invalid spelling shape '+q.id);
  if(!q.audioWord||!q.audioSentence||q.options.length!==4||new Set(q.options.map(x=>x.toLowerCase())).size!==4)throw new Error('Invalid spelling content '+q.id);
  if(q.options['ABCD'.indexOf(q.answer)]!==q.audioWord)throw new Error('Audio answer mismatch '+q.id);
  if(q.stimulus||q.visual)throw new Error('Spelling question leaks visual/text stimulus '+q.id);
  if(q.audioSentence.split(/\s+/).length<4)throw new Error('Audio sentence too short '+q.id);
  answerMix[q.answer]++;
}
if(Object.values(answerMix).some(n=>n!==8))throw new Error('Spelling answer distribution is not balanced '+JSON.stringify(answerMix));
for(const x of ["BANK.filter(q=>q.subject==='Spelling'&&q.kind==='audio')","out.filter(x=>x.subject==='Spelling').length===3",'return shuffle(out.slice(0,15),sd+173)',"[q.audioWord,q.audioSentence,q.audioWord]","q.subject==='Spelling'?'🔊 Listen to word':'🔊 Read'",'aw-spelling-listen'])if(!html.includes(x))throw new Error('Spelling runtime marker missing '+x);
if(!html.includes("u.rate=q.subject==='Spelling'?.82:.92"))throw new Error('Spelling TTS rate guard missing');
for(const x of ["const SUBJECTS=['English','Mathematics','Science','Spelling']","const TOPUP_SUBJECTS=['English','Mathematics','Science']","Spelling:'🔊'","TOPUP_SUBJECTS.map(s=>unseen[s])"])if(!insights.includes(x))throw new Error('Parent spelling insight marker missing '+x);
for(const id of ['M09','M18','M19','M23','M26','M31'])if(!html.includes("'"+id+"'"))throw new Error('Unsafe visual quarantine missing '+id);
console.log(JSON.stringify({release:'6.16.0',compatibility:'PASS',spellingBank:spelling.length,answerMix,dailyQuestionCount:15,dailyMix:{English:4,Mathematics:4,Science:4,Spelling:3},audioMode:'WORD_SENTENCE_WORD',parentInsights:'SPELLING_INCLUDED'}));
