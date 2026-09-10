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
  }),
  'cc8d05b92191637d': Object.freeze({
    paperId: 'cc8d05b92191637d',
    stage: 'icas-y4',
    subject: 'Mathematics',
    learnerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2008 questions.pdf',
    learnerSha256: '352ebc1d8cc2a7fd35d6cc894db2a71293c96d5f1b6cc895002f375d11471fd8',
    answerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2008 answers.pdf',
    answerSha256: '7ee1adf0682fc41844bafae988f9c4cbf356ed4edb4f8096525c76295f66b181',
    questionCount: 40,
    responseSchema: Object.freeze({default: 'choice', shortResponse: Object.freeze([])}),
    answers: Object.freeze([
      'C','A','D','C','A','C','B','D','B','B','B','D','C','C','A','A','D','B','C','C',
      'D','C','A','B','B','D','D','A','B','D','C','D','C','C','D','C','B','D','B','B'
    ]),
    review: Object.freeze({
      status: 'verified',
      mappingEvidence: '2008 ICAS Mathematics Answer Keys, exact Paper B column; complete Q1-Q40 mapping independently read twice from the SHA-bound companion resource.',
      answerResourcePagesReviewed: Object.freeze([1]),
      reviewedAt: '2026-09-10',
      reviewedBy: 'OpenAI-assisted independent document QA',
      automaticPromotion: false
    })
  }),
  'c8b34fa6f3fa0da7': Object.freeze({
    paperId: 'c8b34fa6f3fa0da7',
    stage: 'icas-y4',
    subject: 'Mathematics',
    learnerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2017 questions.pdf',
    learnerSha256: '1c669e8c1114491f6a66ede9edab7a590bb6e2ea3432ce091359bd4a850594ff',
    answerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2017 answers.pdf',
    answerSha256: 'd08fafd6207ef2753a7b68317dabb58da85198a317c7962146f12f93fe45f8a6',
    questionCount: 40,
    responseSchema: Object.freeze({default: 'choice', shortResponse: Object.freeze([])}),
    answers: Object.freeze([
      'B','D','C','B','D','A','B','A','C','B','C','A','D','A','B','D','B','C','D','C',
      'B','B','A','C','D','A','C','A','B','C','A','B','D','C','D','A','C','B','C','B'
    ]),
    review: Object.freeze({
      status: 'verified',
      mappingEvidence: '2017 ICAS Mathematics Answer Keys, exact Paper B column across answer-key pages 1-2; complete Q1-Q40 mapping independently reviewed.',
      answerResourcePagesReviewed: Object.freeze([1,2]),
      reviewedAt: '2026-09-10',
      reviewedBy: 'OpenAI-assisted independent document QA',
      automaticPromotion: false
    })
  }),
  '133a3630a64d1ef1': Object.freeze({
    paperId: '133a3630a64d1ef1',
    stage: 'icas-y4',
    subject: 'Mathematics',
    learnerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2018 questions.pdf',
    learnerSha256: 'ba602fc283dffd930295faeb37747b68f8a59ccced8aa18dc0b7df3fbc745f97',
    answerSourcePath: 'source/original-icas/year4/Maths yr4/Maths B 2018 answers.pdf',
    answerSha256: '7ca6c0aeb248d351e4d30322dfff949049647dfa9a5fd017993faafc0293cc7d',
    questionCount: 40,
    responseSchema: Object.freeze({default: 'choice', shortResponse: Object.freeze([])}),
    answers: Object.freeze([
      'B','A','D','B','B','D','B','C','D','B','A','C','A','B','D','A','C','D','C','D',
      'A','A','C','B','B','C','D','C','D','C','A','C','B','D','B','C','B','D','D','A'
    ]),
    review: Object.freeze({
      status: 'verified',
      mappingEvidence: '2018 ICAS Maths Paper B answer report; Paper B-only resource explicitly labels all Q1-Q40 answers and was independently reviewed across both pages.',
      answerResourcePagesReviewed: Object.freeze([1,2]),
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
