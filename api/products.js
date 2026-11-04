const unavailable = require('./_lib/unavailable');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  }
  // Do not substitute demo records for a live catalogue.
  return unavailable(res, 'published_product_catalogue', ['GET']);
};
