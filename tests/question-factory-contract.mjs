import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(new URL('../quality/question-factory-contract.json',import.meta.url),'utf8'));
function fail(m){throw new Error(`Question Factory contract: ${m}`)}
if(c.version!=='aw-qf-1.0.1')fail('unexpected generator version');
if(c.projectRef!=='yvvwjdnazxzhzrfhudwx')fail('wrong Supabase project');
if(c.privateSchema!=='awenture_private')fail('factory must remain in private schema');
for(const key of ['requests','batches','runs','candidates'])if(!c.tables?.[key])fail(`missing ${key} table`);
for(const [k,v] of Object.entries({expertReviewRequired:true,visualQaRequired:true,noveltyCheckRequired:true,releaseGateRequired:true,learnerRuntimeDirectPublish:false}))if(c.mandatoryPolicy?.[k]!==v)fail(`mandatory policy ${k}`);
for(const x of ['metadata','thin_stem','four_distinct_options','answer_key','rationale','accessible_visual','banned_language','within_batch_semantic_sibling'])if(!c.automatedChecks?.includes(x))fail(`missing automated check ${x}`);
if(!c.states?.request?.includes('expert_review')||!c.states?.expertCandidate?.includes('approved'))fail('review lifecycle incomplete');
if(c.generation?.providerCost!==0||c.generation?.mode!=='governed-parameterised-recipes')fail('unexpected generation mode/cost');
if(c.generation?.maxCandidatesPerSubjectPerRun>40)fail('run cap weakened');
if(c.generation?.correctOptionTracking!=='post-shuffle-index')fail('correct option must be tracked after shuffle');
if(!/candidate-only/i.test(c.releaseBoundary)||!/normal governed bank release/i.test(c.releaseBoundary))fail('release boundary weakened');
console.log(JSON.stringify({questionFactoryContract:'PASS',version:c.version,privateSchema:c.privateSchema,directPublish:false,expertReview:true,providerCost:0,correctOptionTracking:c.generation.correctOptionTracking,subjects:c.generation.subjects}));
