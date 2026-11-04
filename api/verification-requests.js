const unavailable = require('./_lib/unavailable');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  }
  // Do not accept identity documents or sensitive evidence through this placeholder.
  return unavailable(res, 'verification_submission', ['POST']);
};
