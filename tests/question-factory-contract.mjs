import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(new URL('../quality/question-factory-contract.json',import.meta.url),'utf8'));
function fail(m){throw new Error(`Question Factory contract: ${m}`)}
if(c.version!=='aw-qf-1.1.2')fail('unexpected generator version');
if(c.projectRef!=='yvvwjdnazxzhzrfhudwx')fail('wrong Supabase project');
if(c.privateSchema!=='awenture_private')fail('factory must remain in private schema');
for(const key of ['requests','batches','runs','candidates','released'])if(!c.tables?.[key])fail(`missing ${key} table`);
for(const [k,v] of Object.entries({expertReviewRequired:true,visualQaRequired:true,noveltyCheckRequired:true,releaseGateRequired:true,dualPassServerRelease:true,learnerRuntimeDirectPublish:false}))if(c.mandatoryPolicy?.[k]!==v)fail(`mandatory policy ${k}`);
for(const x of ['metadata','thin_stem','four_distinct_options','answer_key','rationale','accessible_visual','banned_language','within_batch_semantic_sibling'])if(!c.automatedChecks?.includes(x))fail(`missing automated check ${x}`);
if(!c.states?.request?.includes('released')||!c.states?.expertCandidate?.includes('approved'))fail('release lifecycle incomplete');
if(c.generation?.providerCost!==0||c.generation?.mode!=='governed-parameterised-recipes')fail('unexpected generation mode/cost');
if(c.generation?.maxCandidatesPerSubjectPerRun>40)fail('run cap weakened');
if(c.generation?.recipeFamiliesPerSubject!==12||c.generation?.recipeOrder!=='request-key-rotated')fail('recipe breadth/rotation missing');
if(c.release?.independentReviewer!=='aw-independent-review-1.2.1'||c.release?.releaseGate!=='aw-content-release-1.2.1')fail('deployed independent review contract mismatch');
if(c.generation?.correctOptionTracking!=='post-shuffle-index')fail('correct option must be tracked after shuffle');
if(c.release?.mode!=='dual-pass-server-release'||c.release?.browserWriteAccess!==false||c.release?.practiceAutoSync!==true)fail('governed release mode weakened');
if(c.release?.feed!=='aw-dynamic-bank-1'||!c.releaseFunction||!c.releasedBankFunction)fail('released bank feed incomplete');
if(!/learner browser has no publish/i.test(c.releaseBoundary)||!/read-only dual-pass released feed/i.test(c.releaseBoundary))fail('release boundary weakened');
console.log(JSON.stringify({questionFactoryContract:'PASS',version:c.version,privateSchema:c.privateSchema,directPublish:false,dualPassRelease:true,practiceAutoSync:true,providerCost:0,correctOptionTracking:c.generation.correctOptionTracking,subjects:c.generation.subjects}));
