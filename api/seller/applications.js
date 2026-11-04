const { authenticate } = require("../_lib/auth");
const { query } = require("../_lib/database");
const { randomUUID } = require("node:crypto");

const MAX_BODY_BYTES = 8192;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

function parseBody(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return null;
  if (Buffer.byteLength(JSON.stringify(req.body), "utf8") > MAX_BODY_BYTES) return null;
  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return send(res, session.status, {
      ok: false, code: session.code, message: session.message
    });
  }

  try {
    if (req.method === "GET") {
      const rows = await query(
        "select id, store_name, store_slug, description, status, submitted_at, reviewed_at, reviewer_note from public.seller_applications where user_id = $1 order by submitted_at desc limit 20",
        [session.userId]
      );
      return send(res, 200, { ok: true, applications: rows || [] });
    }

    const body = parseBody(req);
    if (!body) return send(res, 400, { ok: false, code: "INVALID_BODY" });
    const allowed = ["storeName", "storeSlug", "description"];
    if (Object.keys(body).some((key) => !allowed.includes(key))) {
      return send(res, 400, { ok: false, code: "UNSUPPORTED_FIELDS" });
    }

    const storeName = typeof body.storeName === "string" ? body.storeName.trim() : "";
    const storeSlug = typeof body.storeSlug === "string" ? body.storeSlug.trim().toLowerCase() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (storeName.length < 2 || storeName.length > 80) {
      return send(res, 422, { ok: false, code: "INVALID_STORE_NAME" });
    }
    if (storeSlug.length < 3 || storeSlug.length > 48 || !SLUG_PATTERN.test(storeSlug)) {
      return send(res, 422, {
        ok: false, code: "INVALID_STORE_SLUG",
        message: "Use 3–48 lowercase letters, numbers, and single hyphens."
      });
    }
    if (description.length > 1000) {
      return send(res, 422, { ok: false, code: "DESCRIPTION_TOO_LONG" });
    }

    const profile = await query(
      "select id, role from public.profiles where id = $1 limit 1",
      [session.userId]
    );
    if (!profile || profile.length === 0) {
      return send(res, 409, {
        ok: false, code: "PROFILE_REQUIRED",
        message: "Create your LUXE profile before applying to sell."
      });
    }
    if (profile[0].role !== "customer" && profile[0].role !== "seller") {
      return send(res, 403, { ok: false, code: "ACCOUNT_NOT_ELIGIBLE" });
    }

    const rows = await query(
      "insert into public.seller_applications (user_id, store_name, store_slug, description) values ($1, $2, $3, $4) returning id, store_name, store_slug, description, status, submitted_at",
      [session.userId, storeName, storeSlug, description]
    );
    return send(res, 201, { ok: true, application: rows[0] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    if (error && error.code === "23505") {
      return send(res, 409, {
        ok: false, code: "APPLICATION_CONFLICT",
        message: "A pending application already exists for this account, or that store URL is already reserved."
      });
    }
    const requestId = randomUUID();
    console.error("LUXE seller application request failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
