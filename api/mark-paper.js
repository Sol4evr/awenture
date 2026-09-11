'use strict';

const {scorePaper} = require('../server/stage-paper-answer-keys-registry.cjs');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, {ok: false, error: 'method-not-allowed'});
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const paperId = typeof body.paperId === 'string' ? body.paperId.trim() : '';
  const responses = body.responses && typeof body.responses === 'object' && !Array.isArray(body.responses) ? body.responses : null;
  if (!paperId || !responses) return send(res, 400, {ok: false, error: 'invalid-request'});
  const result = scorePaper(paperId, responses);
  if (!result) return send(res, 409, {ok: false, eligible: false, error: 'paper-not-verified'});
  return send(res, 200, {
    ok: true,
    eligible: true,
    verified: true,
    paperId: result.paperId,
    score: result.correct,
    answered: result.answered,
    total: result.total,
    percentage: result.percentage,
    progressionCredit: false
  });
};
