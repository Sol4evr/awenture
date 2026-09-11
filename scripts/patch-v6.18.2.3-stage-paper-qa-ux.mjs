import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const formalPath=path.join(dist,'stage-formal-tests.js');
const libraryPath=path.join(dist,'stage-papers.js');
const cssPath=path.join(dist,'formal-tests.css');
if(!fs.existsSync(formalPath)||!fs.existsSync(libraryPath))throw new Error('v6.18.2.3 stage QA/UX inputs missing');

let formal=fs.readFileSync(formalPath,'utf8');

// Fix the start-state lifecycle: overlay() clears the previous active state, so assign the new
// state only after the overlay has been created. This prevents the formal viewer from losing
// its paper before PDF.js starts.
const badStart="function start(p){const cfg=conditionFor(p);if(!cfg)return;const startedAt=Date.now();active={";
if(formal.includes(badStart)){
  formal=formal.replace(badStart,"function start(p){const cfg=conditionFor(p);if(!cfg)return;const startedAt=Date.now();const state={");
  const attachNeedle=",'aw-running-exam');const frame=qs('[data-aw-stage-paper-frame]');";
  if(!formal.includes(attachNeedle))throw new Error('formal overlay attach anchor missing');
  formal=formal.replace(attachNeedle,",'aw-running-exam');active=state;const frame=qs('[data-aw-stage-paper-frame]');");
}
if(formal.includes("const startedAt=Date.now();active={"))throw new Error('formal active-state ordering regression remains');

// Unverified historical papers must still be inspectable during QA. They are opened in a
// separate read-only, page-at-a-time PDF.js viewer. This is explicitly NOT learner mode and
// therefore does not grant score/progression credit. Full source pages are visible only here so
// a reviewer can establish questionEndPage; learner mode remains gated by verified metadata.
const instructionAnchor='function instruction(p){';
if(!formal.includes(instructionAnchor))throw new Error('formal instruction anchor missing');
const qaViewer=`function openStageSourceReview(p){\n  const state={paper:p,cfg:null,answers:{},startedAt:Date.now(),deadline:0,submitted:false,page:1,pageCount:1,questionEndPage:null,zoom:1,renderTask:null,sourceReview:true};\n  overlay(\`<div class="aw-exam-shell aw-stage-source-review-shell"><header class="aw-exam-bar"><div><b>\${esc(p.title)}</b><span>\${esc(STAGE_LABELS[p.stage]||p.stage)} · QA source review</span></div><button class="aw-exam-exit" data-aw-stage-exit>Exit</button></header><div class="aw-stage-source-review-warning"><b>QA source review</b><span>This is the full source PDF for boundary verification. It is not learner mode and may include answer/support pages. Learner navigation remains blocked until questionEndPage is verified.</span></div><main class="aw-exam-main aw-stage-source-review-main"><section class="aw-paper-pane"><div class="aw-paper-toolbar"><button type="button" data-aw-stage-page-prev disabled>← Previous</button><label class="aw-page-select-wrap"><span>Page</span><select data-aw-stage-page-select disabled><option value="1">1</option></select><strong data-aw-stage-page-label class="aw-page-label-sr">Page 1 of 1</strong></label><button type="button" data-aw-stage-page-next disabled>Next →</button><span class="aw-zoom-controls"><button type="button" data-aw-stage-zoom-out>−</button><span data-aw-stage-zoom-label>100%</span><button type="button" data-aw-stage-zoom-in>+</button></span></div><div class="aw-paper-stage" data-aw-stage-paper-frame tabindex="0"><div class="aw-paper-status" data-aw-stage-paper-status>Opening paper…</div><canvas data-aw-stage-paper-canvas aria-label="\${esc(p.title)} page"></canvas></div></section></main></div>\`,'aw-running-exam aw-stage-source-review-overlay');\n  active=state;\n  initStageSourceReviewViewer();\n}\nasync function initStageSourceReviewViewer(){try{const lib=await pdfjs();if(!active?.sourceReview)return;viewerStatus('Opening paper…');const task=lib.getDocument({url:active.paper.assetPath,isEvalSupported:false,useSystemFonts:true,disableRange:false,disableStream:false,disableAutoFetch:false,rangeChunkSize:65536});const doc=await task.promise;if(!active?.sourceReview){doc.destroy();return}active.pdfDoc=doc;active.pageCount=doc.numPages;active.questionEndPage=doc.numPages;active.page=1;active.zoom=1;syncViewerControls();await renderPaperPage()}catch(err){viewerStatus('Unable to open this source PDF on this device. Exit and try again.',true)}}\n`;
formal=formal.replace(instructionAnchor,qaViewer+instructionAnchor);

const blockedPattern=/if\(!p\?\.governance\?\.learnerReady\)\{overlay\(`([\s\S]*?)`\);return\}/;
const match=formal.match(blockedPattern);
if(!match)throw new Error('learnerReady block anchor missing');
const replacement=`if(!p?.governance?.learnerReady){overlay(\`<div class="aw-exam-dialog"><button class="aw-exam-close" data-aw-stage-close>×</button><div class="ey">\${esc(STAGE_LABELS[p.stage]||p.stage)}</div><h1>\${esc(p.title)}</h1><p>This paper is awaiting learner-page boundary verification, so the timed learner attempt is still protected.</p><p>You can open the full source now in the lightweight QA viewer to verify the last question page. This QA view does not score or grant progression credit.</p><button class="primary wide" data-aw-stage-source-review="\${esc(p.id)}">Open paper for QA</button><button class="wide" data-aw-stage-close>Close</button></div>\`);return}`;
formal=formal.replace(blockedPattern,replacement);

const endAnchor='fetch(\'/stage-papers/catalog.json';
// Add a dedicated capture handler without disturbing the existing formal click router.
const handler=`document.addEventListener('click',e=>{const b=e.target.closest('[data-aw-stage-source-review]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const p=paperIndex.get(b.dataset.awStageSourceReview);if(p)openStageSourceReview(p)},true);\n`;
const fetchIndex=formal.indexOf("fetch('/stage-papers/catalog.json");
if(fetchIndex<0)throw new Error('stage catalog fetch anchor missing');
formal=formal.slice(0,fetchIndex)+handler+formal.slice(fetchIndex);

if(!formal.includes('openStageSourceReview')||!formal.includes('QA source review'))throw new Error('QA source viewer injection failed');
if(!formal.includes('getDocument({url:active.paper.assetPath'))throw new Error('Year 2 lite URL/range loader missing');
if(formal.includes('arrayBuffer()'))throw new Error('whole-file PDF preload regression detected');
fs.writeFileSync(formalPath,formal);

let library=fs.readFileSync(libraryPath,'utf8');
const renderAnchor='function render(stageOverride,force=false){';
if(!library.includes(renderAnchor))throw new Error('stage library render anchor missing');
const accordionHelper=`function compactStageSubjects(box){for(const section of qsa('.aw-stage-subject',box)){const head=qs('.aw-stage-subject-head',section),grid=qs('.aw-stage-paper-grid',section);if(!head||!grid)continue;const details=document.createElement('details');details.className='aw-stage-subject aw-stage-subject-details';const summary=document.createElement('summary');summary.className='aw-stage-subject-summary';summary.innerHTML=head.innerHTML;details.appendChild(summary);details.appendChild(grid);section.replaceWith(details)}}\n`;
library=library.replace(renderAnchor,accordionHelper+renderAnchor);
const appendAnchor='card.appendChild(box)}';
if(!library.includes(appendAnchor))throw new Error('stage library append anchor missing');
library=library.replace(appendAnchor,'card.appendChild(box);compactStageSubjects(box)}');
if(!library.includes('compactStageSubjects(box)'))throw new Error('stage accordion injection failed');
fs.writeFileSync(libraryPath,library);

fs.appendFileSync(cssPath,`\n/* v6.18.2.3 compact stage-paper library + QA source viewer */\n.aw-stage-subject-details{margin-top:10px;border:1px solid #e4e7ec;border-radius:14px;background:#fff;overflow:hidden}\n.aw-stage-subject-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;cursor:pointer;list-style:none;font-weight:750;min-height:48px}\n.aw-stage-subject-summary::-webkit-details-marker{display:none}\n.aw-stage-subject-summary:after{content:'⌄';font-size:18px;color:#667085;transition:transform .15s ease}\n.aw-stage-subject-details[open]>.aw-stage-subject-summary:after{transform:rotate(180deg)}\n.aw-stage-subject-details>.aw-stage-paper-grid{margin:0;padding:0 12px 12px}\n.aw-stage-source-review-warning{display:flex;gap:10px;align-items:flex-start;padding:10px 16px;background:#fffaeb;border-bottom:1px solid #fedf89;font-size:12px;color:#7a2e0e}\n.aw-stage-source-review-warning span{flex:1}\n.aw-stage-source-review-main{grid-template-columns:1fr!important}\n.aw-stage-source-review-main .aw-paper-pane{min-width:0}\n@media(max-width:700px){.aw-stage-subject-summary{padding:13px 14px}.aw-stage-source-review-warning{flex-direction:column;gap:3px}}\n`);

console.log(JSON.stringify({release:'6.18.2',hotfix:'stage-paper-qa-and-accordion',unverifiedPaperAccess:'LITE_QA_VIEWER',learnerBoundaryGate:'PRESERVED',library:'COLLAPSED_BY_SUBJECT',formalStartLifecycle:'FIXED'}));
