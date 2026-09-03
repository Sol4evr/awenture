import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'dist/index.html');
let html=fs.readFileSync(file,'utf8').replaceAll('6.15.3','6.16.0').replaceAll('61530','61600');

const spelling=[
{id:'SP01',subject:'Spelling',skill:'Spelling',subskill:'short vowels',family:'spell-short-vowel-a',difficulty:1,question:'Which word is spelled correctly?',options:['plann','plan','plaen','plaan'],answer:'B',explanation:'Plan has one n at the end in this word.',stimulus:'Choose the correctly spelled word.',kind:'text',visual:''},
{id:'SP02',subject:'Spelling',skill:'Spelling',subskill:'consonant blends',family:'spell-blend-br',difficulty:1,question:'Which word is spelled correctly?',options:['brik','brick','brrick','bric'],answer:'B',explanation:'Brick is spelled b-r-i-c-k.',stimulus:'Choose the correctly spelled word.',kind:'text',visual:''},
{id:'SP03',subject:'Spelling',skill:'Spelling',subskill:'vowel teams',family:'spell-vowel-team-ee',difficulty:2,question:'Which word correctly completes the sentence?',options:['grean','green','grene','greeen'],answer:'B',explanation:'Green uses the vowel team ee.',stimulus:'The frog sat on a ___ leaf.',kind:'text',visual:''},
{id:'SP04',subject:'Spelling',skill:'Spelling',subskill:'silent e',family:'spell-silent-e',difficulty:2,question:'Which word is spelled correctly?',options:['hop','hope','hoap','hoppe'],answer:'B',explanation:'Hope uses silent e to make the long o sound.',stimulus:'Choose the word meaning “to wish for something”.',kind:'text',visual:''},
{id:'SP05',subject:'Spelling',skill:'Spelling',subskill:'double consonants',family:'spell-double-consonant',difficulty:2,question:'Which word is spelled correctly?',options:['runing','running','runnning','runinng'],answer:'B',explanation:'Running doubles the final n before adding -ing.',stimulus:'Choose the correctly spelled word.',kind:'text',visual:''},
{id:'SP06',subject:'Spelling',skill:'Spelling',subskill:'suffix ing',family:'spell-suffix-ing',difficulty:2,question:'Which word correctly completes the sentence?',options:['jumpng','jumping','jumpping','jumpin'],answer:'B',explanation:'Jumping is jump + ing.',stimulus:'The kangaroo is ___ over the log.',kind:'text',visual:''},
{id:'SP07',subject:'Spelling',skill:'Spelling',subskill:'suffix ed',family:'spell-suffix-ed',difficulty:2,question:'Which word is spelled correctly?',options:['lookt','looked','lookked','loocked'],answer:'B',explanation:'Looked is formed by adding -ed to look.',stimulus:'Choose the past-tense word.',kind:'text',visual:''},
{id:'SP08',subject:'Spelling',skill:'Spelling',subskill:'plural es',family:'spell-plural-es',difficulty:2,question:'Which is the correct plural of “box”?',options:['boxs','boxes','boxies','boxeses'],answer:'B',explanation:'Words ending in x usually add -es to make the plural.',stimulus:'There are three ___ on the shelf.',kind:'text',visual:''},
{id:'SP09',subject:'Spelling',skill:'Spelling',subskill:'common homophones',family:'spell-homophone-there',difficulty:3,question:'Which word correctly completes the sentence?',options:['their','there','theyre','thare'],answer:'B',explanation:'There refers to a place.',stimulus:'Please put your bag over ___.',kind:'text',visual:''},
{id:'SP10',subject:'Spelling',skill:'Spelling',subskill:'compound words',family:'spell-compound-rainbow',difficulty:2,question:'Which word is spelled correctly?',options:['rain bow','rainboe','rainbow','raynbow'],answer:'C',explanation:'Rainbow is written as one compound word.',stimulus:'Choose the correctly spelled compound word.',kind:'text',visual:''},
{id:'SP11',subject:'Spelling',skill:'Spelling',subskill:'contractions',family:'spell-contraction-cant',difficulty:3,question:'Which spelling correctly shows “cannot” as a contraction?',options:["cant","can't","can,t","cann't"],answer:'B',explanation:"Can't uses an apostrophe to replace the missing letters from cannot.",stimulus:'Choose the correctly written contraction.',kind:'text',visual:''},
{id:'SP12',subject:'Spelling',skill:'Spelling',subskill:'prefix re',family:'spell-prefix-re',difficulty:2,question:'Which word is spelled correctly?',options:['reeplay','replay','replaay','repaly'],answer:'B',explanation:'Replay is formed with the prefix re- and the base word play.',stimulus:'Choose the word meaning “play again”.',kind:'text',visual:''},
{id:'SP13',subject:'Spelling',skill:'Spelling',subskill:'prefix un',family:'spell-prefix-un',difficulty:2,question:'Which word is spelled correctly?',options:['unhappy','unhapy','unnappy','unhappey'],answer:'A',explanation:'Unhappy is un- + happy.',stimulus:'Choose the correctly spelled word.',kind:'text',visual:''},
{id:'SP14',subject:'Spelling',skill:'Spelling',subskill:'high frequency words',family:'spell-highfreq-because',difficulty:3,question:'Which word is spelled correctly?',options:['becos','because','becuase','beacause'],answer:'B',explanation:'Because is spelled b-e-c-a-u-s-e.',stimulus:'Choose the correctly spelled word.',kind:'text',visual:''},
{id:'SP15',subject:'Spelling',skill:'Spelling',subskill:'vowel teams',family:'spell-vowel-team-ai',difficulty:2,question:'Which word correctly completes the sentence?',options:['trayne','train','trane','trayn'],answer:'B',explanation:'Train uses the vowel team ai.',stimulus:'We travelled by ___ to the city.',kind:'text',visual:''},
{id:'SP16',subject:'Spelling',skill:'Spelling',subskill:'soft c',family:'spell-soft-c',difficulty:3,question:'Which word is spelled correctly?',options:['sity','city','citty','citie'],answer:'B',explanation:'City begins with c even though the c makes an s sound.',stimulus:'Choose the correctly spelled word.',kind:'text',visual:''},
{id:'SP17',subject:'Spelling',skill:'Spelling',subskill:'word endings',family:'spell-ending-ck',difficulty:2,question:'Which word is spelled correctly?',options:['dukk','duck','duc','ducke'],answer:'B',explanation:'Duck ends with ck after the short vowel sound.',stimulus:'Choose the correctly spelled animal name.',kind:'text',visual:''},
{id:'SP18',subject:'Spelling',skill:'Spelling',subskill:'syllables',family:'spell-two-syllable',difficulty:3,question:'Which word is spelled correctly?',options:['picnik','picnic','picknic','picnick'],answer:'B',explanation:'Picnic is spelled p-i-c-n-i-c.',stimulus:'Choose the correctly spelled two-syllable word.',kind:'text',visual:''}
];
const runtimeMarker="(()=>{'use strict';";
if(!html.includes(runtimeMarker))throw new Error('Runtime marker not found');
html=html.replace(runtimeMarker,`window.AW_BANK.push(...${JSON.stringify(spelling)});\n${runtimeMarker}`);

const returnMarker='window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle(out.slice(0,12),sd+173);';
const daily15=`const spellBase=BANK.filter(q=>q.subject==='Spelling'&&!seen.has(q.id));
  const spellPreferred=spellBase.filter(q=>!recent.has(familyKey(q)));
  const spellPool=[...shuffle(spellPreferred,sd+211),...shuffle(spellBase.filter(q=>recent.has(familyKey(q))),sd+223)];
  const spelling=[];const spellFamilies=new Set();
  for(const q of spellPool){const f=familyKey(q);if(spellFamilies.has(f))continue;spellFamilies.add(f);spelling.push(q);if(spelling.length===3)break}
  if(spelling.length<3){for(const q of shuffle(BANK.filter(q=>q.subject==='Spelling'&&!spelling.some(x=>x.id===q.id)),sd+227)){spelling.push(q);if(spelling.length===3)break}}
  if(spelling.length<3)window.__AW_SPELLING_EXHAUSTED=true;
  window.__AW_LAST_PICK_MS=Math.round((performance.now()-t0)*100)/100;return shuffle([...out.slice(0,12),...spelling.slice(0,3)],sd+173);`;
if(!html.includes(returnMarker))throw new Error('v6.15.3 Daily Practice return marker not found');
html=html.replace(returnMarker,daily15);

const bodyMarker='</body>';
if(!html.includes(bodyMarker))throw new Error('Body marker not found');
html=html.replace(bodyMarker,'<script src="/spelling.js?v=61600" defer></script></body>');
fs.copyFileSync(path.join(root,'ui','spelling.js'),path.join(root,'dist','spelling.js'));
fs.writeFileSync(file,html);
console.log(JSON.stringify({release:'6.16.0',dailyQuestionCount:15,dailyMix:{English:4,Mathematics:4,Science:4,Spelling:3},generatedSpelling:spelling.length,originalSpellingSource:{year:2016,registered:true,assetReady:false}}));
