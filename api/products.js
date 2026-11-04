const { query } = require("./_lib/database");

function headers(res) {
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

module.exports = async function handler(req, res) {
  headers(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const rows = await query(
      "select id, title, description, price_amount, currency_code, category, image_url, seller_id, created_at from public.products where status = 'published' order by created_at desc limit 60"
    );
    return res.status(200).json({ ok: true, products: rows || [] });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({
      ok: false, code: "CATALOGUE_UNAVAILABLE",
      message: "The live catalogue is not configured yet."
    });
  }
};
