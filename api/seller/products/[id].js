const { authenticate } = require("../../_lib/auth");
const { query } = require("../../_lib/database");

function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return null; } }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) return res.status(session.status).json({ ok: false, code: session.code, message: session.message });

  const id = req.query && req.query.id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ ok: false, code: "INVALID_PRODUCT_ID" });
  }
  const contentType = String(req.headers && req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) return res.status(415).json({ ok: false, code: "JSON_REQUIRED" });

  const body = bodyOf(req);
  if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ ok: false, code: "INVALID_BODY" });

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const currencyCode = typeof body.currencyCode === "string" ? body.currencyCode.trim().toUpperCase() : "GMD";
  const price = Number(body.price);
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  if (title.length < 2 || title.length > 120 || description.length > 4000 || category.length < 2 || category.length > 80 ||
      !/^[A-Z]{3}$/.test(currencyCode) || !Number.isFinite(price) || price < 0 || price > 1000000000) {
    return res.status(400).json({ ok: false, code: "INVALID_PRODUCT" });
  }
  if (imageUrl) {
    try { const u = new URL(imageUrl); if (u.protocol !== "https:" || u.username || u.password) throw new Error("invalid"); }
    catch { return res.status(400).json({ ok: false, code: "INVALID_IMAGE_URL" }); }
  }

  try {
    const rows = await query(
      "update public.products set title = $1, description = $2, price_amount = $3, currency_code = $4, category = $5, image_url = $6, updated_at = now() where id = $7 and seller_id = $8 and status = 'draft' returning id, title, description, price_amount, currency_code, category, image_url, status, updated_at",
      [title, description, price, currencyCode, category, imageUrl, id, session.userId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ ok: false, code: "DRAFT_NOT_FOUND", message: "Only your own draft listings can be edited." });
    return res.status(200).json({ ok: true, product: rows[0] });
  } catch {
    return res.status(503).json({ ok: false, code: "PRODUCT_UPDATE_UNAVAILABLE", message: "The product service is not configured yet." });
  }
};
