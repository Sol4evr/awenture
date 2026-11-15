import fs from 'node:fs';
import assert from 'node:assert/strict';
const bank=JSON.parse(fs.readFileSync('bank/thinking-skills-y1.json','utf8'));
assert.equal(bank.questions.length,56);
assert.equal(new Set(bank.questions.map(q=>q.id)).size,56);
assert.equal(bank.topics.length,7);
for(const topic of bank.topics){assert.equal(bank.questions.filter(q=>q.topic===topic&&q.pool==='skills').length,6);assert.equal(bank.questions.filter(q=>q.topic===topic&&q.pool==='mixed').length,2)}
for(const q of bank.questions){assert(q.question.length>12);assert(q.explanation.length>10);assert(q.options.includes(q.answer));assert.equal(new Set(q.options).size,q.options.length);assert(q.options.length>=2&&q.options.length<=4)}
// Independent expected results for the diagram and edge-case puzzles.
for(const [n,answer] of [[9,'6'],[18,'No'],[19,'C'],[20,'5'],[21,'5'],[22,'Triangle'],[23,'2'],[24,'8'],[27,'B'],[36,'5'],[39,'6'],[40,'Day 3'],[41,'4 coins'],[49,'14'],[51,'East'],[54,'4'],[56,'9']])assert.equal(bank.questions[n-1].answer,answer);
assert.equal(bank.questions.filter(q=>q.visual).length,9);
const html=fs.readFileSync('dist/index.html','utf8');assert(html.includes('/thinking-skills.js?v=1'));assert(html.includes('/thinking-skills.css?v=1'));assert(html.includes("new CustomEvent('aw:render')"));
const originalBank=fs.readFileSync('bank/thinking-skills-y1.json','utf8');assert.equal(originalBank,fs.readFileSync('dist/thinking-skills-y1.json','utf8'));
console.log('PASS: 56 Thinking Skills questions, 7 topics, 9 visuals, separate practice bank and render lifecycle.');
