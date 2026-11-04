const unavailable = require('../_lib/unavailable');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  }
  // Seller ownership and role must come from a verified server-side session.
  // Never accept seller_id, role, or publication status from the browser.
  return unavailable(res, 'seller_product_management', ['GET', 'POST']);
};
