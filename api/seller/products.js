const { authenticate } = require("../_lib/auth");
const { query } = require("../_lib/database");

function headers(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

function validateProduct(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const currencyCode = typeof body.currencyCode === "string" ? body.currencyCode.trim().toUpperCase() : "GMD";
  const price = body.price === undefined || body.price === null || body.price === "" ? NaN : Number(body.price);
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;

  if (title.length < 2 || title.length > 120 || description.length > 4000 ||
      category.length < 2 || category.length > 80 ||
      !/^[A-Z]{3}$/.test(currencyCode) ||
      !Number.isFinite(price) || price < 0 || price > 1000000000) return null;

  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    } catch { return null; }
  }
  return { title, description, category, currencyCode, price, imageUrl };
}

module.exports = async function handler(req, res) {
  headers(res);
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) return res.status(session.status).json({ ok: false, code: session.code, message: session.message });

  try {
    const profiles = await query("select role from public.profiles where id = $1 limit 1", [session.userId]);
    if (!profiles || profiles.length === 0 || profiles[0].role !== "seller") {
      return res.status(403).json({ ok: false, code: "SELLER_ACCESS_REQUIRED", message: "An approved seller account is required." });
    }

    if (req.method === "GET") {
      const rows = await query(
        "select id, title, description, price_amount, currency_code, category, image_url, status, created_at, updated_at from public.products where seller_id = $1 order by created_at desc limit 100",
        [session.userId]
      );
      return res.status(200).json({ ok: true, products: rows || [] });
    }

    const contentType = String(req.headers && req.headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("application/json")) return res.status(415).json({ ok: false, code: "JSON_REQUIRED" });
    const product = validateProduct(bodyOf(req));
    if (!product) return res.status(400).json({ ok: false, code: "INVALID_PRODUCT", message: "Check the title, description, category, price, currency and secure image URL." });

    const rows = await query(
      "insert into public.products (seller_id, title, description, price_amount, currency_code, category, image_url, status) values ($1, $2, $3, $4, $5, $6, $7, 'draft') returning id, title, description, price_amount, currency_code, category, image_url, status, created_at",
      [session.userId, product.title, product.description, product.price, product.currencyCode, product.category, product.imageUrl]
    );
    return res.status(201).json({ ok: true, product: rows[0], message: "Draft saved. It is not visible in the public catalogue." });
  } catch {
    return res.status(503).json({ ok: false, code: "SELLER_PRODUCTS_UNAVAILABLE", message: "Seller product management is not configured yet." });
  }
};
