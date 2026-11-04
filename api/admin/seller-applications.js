const { requireOwner } = require("../_lib/authorization");
const { query } = require("../_lib/database");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const owner = await requireOwner(req);
  if (!owner.ok) {
    return res.status(owner.status).json({ ok: false, code: owner.code, message: owner.message });
  }

  try {
    const rows = await query(
      "select id, user_id, business_name, category, country_code, contact_email, description, status, submitted_at from public.seller_applications where status = 'pending' order by submitted_at asc limit 100"
    );
    return res.status(200).json({ ok: true, applications: rows || [] });
  } catch {
    return res.status(503).json({ ok: false, code: "REVIEW_QUEUE_UNAVAILABLE", message: "The seller review queue is not configured yet." });
  }
};
