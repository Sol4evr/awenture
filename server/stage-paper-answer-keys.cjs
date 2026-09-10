'use strict';

const VERIFIED_PAPERS = Object.freeze({
  '5d634c70edf0b6cd': Object.freeze({
    paperId: '5d634c70edf0b6cd',
    stage: 'naplan-y3',
    subject: 'Numeracy',
    learnerSourcePath: 'source/naplan/2017/Year 3/Example_Yr_3_Numeracy.pdf',
    learnerSha256: '72c84d1b0bf8f625ac5d31a72929bc64d0c8ba95c594a41266156d97ec226083',
    answerSourcePath: 'source/naplan/2017/Year 3/Example_Yr_3_Numeracy_Answers.pdf',
    answerSha256: '5d90edde0543cfbf61b805b452545a43691669762a21b6110bba2210f8d74457',
    questionCount: 35,
    responseSchema: Object.freeze({
      default: 'choice',
      shortResponse: Object.freeze([11, 25, 29, 32, 33, 34, 35])
    }),
    answers: Object.freeze([
      'C','A','D','A','D','A','D','A','A','A','16','A','D','C','D','C','C','A',
      'B','B','C','D','C','D','9','A','A','B','5.15','C','C','8','23','305','18'
    ]),
    review: Object.freeze({
      status: 'verified',
      mappingEvidence: 'Official NAPLAN Numeracy Example Test - Year 3 answer-key sheet; complete Q1-Q35 mapping visually reviewed against exact companion resource.',
      answerResourcePagesReviewed: Object.freeze([1]),
      reviewedAt: '2026-09-10',
      reviewedBy: 'OpenAI-assisted independent document QA',
      automaticPromotion: false
    })
  }),
  'c7b97767539d3dd9': Object.freeze({
    paperId: 'c7b97767539d3dd9',
    stage: 'icas-y4',
    subject: 'Mathematics',
    learnerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2007 questions.pdf',
    learnerSha256: '0e878a600e66cea45b63332233ed3b5b7aad71b165411e6fc63b20b344c61e87',
    answerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2007 answers.pdf',
    answerSha256: 'de85fe365f13b96baad3f7569687adadd72547087ca63dacf19e8a8f4df54130',
    questionCount: 40,
    responseSchema: Object.freeze({default: 'choice', shortResponse: Object.freeze([])}),
    answers: Object.freeze([
      'D','B','D','B','C','C','D','A','B','A','C','B','C','B','A','B','B','D','D','B',
      'A','C','B','D','D','A','D','A','B','A','C','B','C','D','A','B','B','C','D','A'
    ]),
    review: Object.freeze({
      status: 'verified',
      mappingEvidence: '2007 ICAS Mathematics Answer Keys, exact Paper B column; Q1-Q40 mapping visually reviewed against exact companion resource.',
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
  return Object.freeze({
    paperId,
    correct,
    answered,
    total: paper.questionCount,
    percentage: Math.round((correct / paper.questionCount) * 100),
    verified: true,
    progressionCredit: false
  });
}

module.exports = {VERIFIED_PAPERS, normalizeResponse, scorePaper};
