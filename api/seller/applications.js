const { authenticate } = require("../_lib/auth");
const { query } = require("../_lib/database");

function headers(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

module.exports = async function handler(req, res) {
  headers(res);
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return res.status(session.status).json({ ok: false, code: session.code, message: session.message });
  }

  if (req.method === "GET") {
    try {
      const rows = await query(
        "select id, business_name, category, country_code, description, status, submitted_at, reviewed_at, reviewer_note from public.seller_applications where user_id = $1 order by submitted_at desc limit 20",
        [session.userId]
      );
      return res.status(200).json({ ok: true, applications: rows || [] });
    } catch {
      return res.status(503).json({ ok: false, code: "APPLICATIONS_UNAVAILABLE", message: "Seller applications are not configured yet." });
    }
  }

  const contentType = String(req.headers && req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ ok: false, code: "JSON_REQUIRED", message: "Send application details as JSON." });
  }

  const body = readBody(req);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ ok: false, code: "INVALID_BODY", message: "A valid application is required." });
  }

  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const countryCode = typeof body.countryCode === "string" ? body.countryCode.trim().toUpperCase() : "";
  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : null;
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (businessName.length < 2 || businessName.length > 100 ||
      category.length < 2 || category.length > 80 ||
      !/^[A-Z]{2}$/.test(countryCode) ||
      description.length > 1000 ||
      (contactEmail && (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)))) {
    return res.status(400).json({ ok: false, code: "INVALID_APPLICATION", message: "Check the business name, category, country code, email and description." });
  }

  try {
    const rows = await query(
      "insert into public.seller_applications (user_id, business_name, category, country_code, contact_email, description) values ($1, $2, $3, $4, $5, $6) returning id, business_name, category, country_code, status, submitted_at",
      [session.userId, businessName, category, countryCode, contactEmail || null, description]
    );
    return res.status(201).json({ ok: true, application: rows[0], message: "Application submitted for human review. Submission does not grant seller access." });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(409).json({ ok: false, code: "PENDING_APPLICATION_EXISTS", message: "You already have a pending seller application." });
    }
    return res.status(503).json({ ok: false, code: "APPLICATION_SUBMISSION_UNAVAILABLE", message: "The application service is not ready. Please try again later." });
  }
};
