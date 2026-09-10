'use strict';

const batch1=require('./stage-paper-answer-keys.cjs');
const batch2=require('./stage-paper-answer-keys-batch2.cjs');

const VERIFIED_PAPERS=Object.freeze({...batch1.VERIFIED_PAPERS,...batch2.VERIFIED_PAPERS});

function scorePaper(paperId,responses){
  return batch1.scorePaper(paperId,responses)||batch2.scorePaper(paperId,responses)||null;
}

module.exports={VERIFIED_PAPERS,scorePaper};
