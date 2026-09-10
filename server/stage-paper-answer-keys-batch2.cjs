'use strict';

const VERIFIED_PAPERS = Object.freeze({
  '40bc74882938492a': Object.freeze({
    paperId: '40bc74882938492a',
    stage: 'icas-y4',
    subject: 'English',
    learnerSourcePath: 'source/original-icas/year4/English yr 4/English B 2007 questions.pdf',
    learnerSha256: 'e213de2a63ccacaa66672bb7a3b17b6e71936497468833fd103c437860fdbfae',
    answerSourcePath: 'source/original-icas/year4/English yr 4/English B 2007 answers.pdf',
    answerSha256: '05c491e983f4302ee271bc6acdc80c3b1deeae523a3aeea9aafb46e7f1eb273b',
    questionCount: 45,
    responseSchema: Object.freeze({default: 'choice', shortResponse: Object.freeze([])}),
    answers: Object.freeze([
      'A','A','D','B','C','B','D','C','A','B','A','C','D','C','B','A','A','D','C','C',
      'A','D','A','A','C','D','C','B','A','D','C','B','A','D','A','B','C','D','C','D',
      'C','B','D','B','B'
    ]),
    review: Object.freeze({
      status: 'verified',
      mappingEvidence: '2007 ICAS English Answer Keys, exact Paper B column; complete Q1-Q45 mapping independently reviewed across both answer-key pages.',
      answerResourcePagesReviewed: Object.freeze([1,2]),
      reviewedAt: '2026-09-10',
      reviewedBy: 'OpenAI-assisted independent document QA',
      automaticPromotion: false
    })
  }),
  'c05b515983bc8614': Object.freeze({
    paperId: 'c05b515983bc8614',
    stage: 'icas-y4',
    subject: 'Digital Technologies',
    learnerSourcePath: 'source/original-icas/year4/Digital yr 4/Digital B 2009 (A) questions.pdf',
    learnerSha256: '960c2827e078e43c5ed8d75efd46cceda2447d42e6f7dde334bd63a52a571e3f',
    answerSourcePath: 'source/original-icas/year4/Digital yr 4/Digital B 2009 (A) answers.pdf',
    answerSha256: '98425fbb49e17b0f59361d03e0f107d42a17069f16b79ba05e8a89424e2a98a9',
    questionCount: 30,
    responseSchema: Object.freeze({default: 'choice', shortResponse: Object.freeze([])}),
    answers: Object.freeze([
      'D','A','C','A','B','D','B','C','B','D','D','C','A','B','C','A','B','C','B','C',
      'C','B','D','C','B','D','D','B','A','D'
    ]),
    review: Object.freeze({
      status: 'verified',
      mappingEvidence: '2009 ICAS Computer Skills Answer Keys; learner is Paper B and official key explicitly combines Papers A & B. Complete Q1-Q30 mapping independently reviewed.',
      answerResourcePagesReviewed: Object.freeze([1]),
      reviewedAt: '2026-09-10',
      reviewedBy: 'OpenAI-assisted independent document QA',
      automaticPromotion: false
    })
  })
});

function normalizeResponse(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ').toUpperCase();
}

function scorePaper(paperId, responses) {
  const paper = VERIFIED_PAPERS[paperId];
  if (!paper) return null;
  const submitted = responses && typeof responses === 'object' && !Array.isArray(responses) ? responses : {};
  let correct = 0;
  let answered = 0;
  for (let i = 0; i < paper.answers.length; i += 1) {
    const response = normalizeResponse(submitted[i + 1] ?? submitted[String(i + 1)]);
    if (response) answered += 1;
    if (response && response === normalizeResponse(paper.answers[i])) correct += 1;
  }
  return Object.freeze({paperId,correct,answered,total:paper.questionCount,percentage:Math.round((correct/paper.questionCount)*100),verified:true,progressionCredit:false});
}

module.exports = {VERIFIED_PAPERS, normalizeResponse, scorePaper};
