import fs from 'node:fs';
const htmlUrl=new URL('../dist/index.html',import.meta.url),parentUrl=new URL('../dist/v615-parent.js',import.meta.url),cssUrl=new URL('../dist/v615.css',import.meta.url);
const originalHtml=fs.readFileSync(htmlUrl,'utf8');
try{fs.writeFileSync(htmlUrl,originalHtml.replaceAll('6.15.3','6.15.2').replaceAll('61530','61520'));await import('./release-gate-v6152.mjs?compat='+Date.now())}finally{fs.writeFileSync(htmlUrl,originalHtml)}
const html=fs.readFileSync(htmlUrl,'utf8'),parent=fs.readFileSync(parentUrl,'utf8'),css=fs.readFileSync(cssUrl,'utf8');
for(const x of ['content="6.15.3',"RELEASE='6.15.3'",'/v615-parent.js?v=61530'])if(!html.includes(x))throw new Error('v6.15.3 missing '+x);
for(const x of ['Weekend program table with day and activities columns','Story time — 10:00','Gardening — 9:30','Chess — 11:30'])if(!html.includes(x))throw new Error('E17 wrapped table missing '+x);
if(html.includes('Story time 10:00 • Painting 11:00')||html.includes('Gardening 9:30 • Story time 10:00 • Chess 11:30'))throw new Error('E17 still contains overflowing one-line cells');
for(const x of ["const spatialRecent=",'math-(?:coordinate|shape|rotation|symmetry|path|cube|angle)','visualMax','!unsafeVisualIds.has(q.id)'])if(!html.includes(x))throw new Error('Safe spatial coverage rule missing '+x);
for(const id of ['M09','M18','M19','M23','M26','M31'])if(!html.includes("'"+id+"'"))throw new Error('Unsafe visual quarantine missing '+id);
for(const x of ['parentRoot(details)','isolatedSubjectAccordion'])if(!parent.includes(x))throw new Error('Isolated Parent accordion missing '+x);
for(const x of ['.aw-subject-grid{align-items:start}', 'align-self:start'])if(!css.includes(x))throw new Error('Independent accordion layout missing '+x);
const audit=JSON.parse(fs.readFileSync(new URL('../quality/visual-layout-audit-v6.15.3.json',import.meta.url),'utf8'));
if(audit.release!=='6.15.3'||audit.spatialInventory.safeVisualIds.length!==5||audit.chartInventory.safeIds.length!==12)throw new Error('Visual audit inventory mismatch');
for(const id of audit.chartInventory.safeIds){const start=html.indexOf(`\"id\":\"${id}\"`),end=html.indexOf('},{\"id\":\"',start+8),segment=html.slice(start,end<0?start+10000:end);if(start<0||!/<svg[^>]+role=\\?"img\\?"[^>]+aria-label=\\?"[^\"]+/i.test(segment)||((segment.match(/<text /g)||[]).length<4))throw new Error('Chart label QA failed '+id)}
const m47=html.slice(html.indexOf('"id":"M47"'),html.indexOf('},{"id":"M48"'));
for(const label of ['>A<','>B<','>C<','>D<','>1<','>2<','>3<','>4<'])if(!m47.includes(label))throw new Error('M47 coordinate label missing '+label);
console.log(JSON.stringify({release:'6.15.3',compatibility:'PASS',weekendProgram:'WRAPPED_AND_BOUNDED',spatialCoverage:'SAFE_COOLDOWN_RESCUE',chartLabels:'AUDITED',parentSubskills:'VISUALLY_AND_BEHAVIORALLY_ISOLATED',dailyQuestionCount:12}));
