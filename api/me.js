const { authenticate } = require("./_lib/auth");
const { query } = require("./_lib/database");
const { sameOrigin, bodyWithinLimit } = require("./_lib/request-security");

function jsonHeaders(res) {
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
  jsonHeaders(res);
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return res.status(session.status).json({
      ok: false, code: session.code, message: session.message
    });
  }

  if (req.method === "PATCH") {
    if (!sameOrigin(req)) return res.status(403).json({ ok: false, code: "ORIGIN_NOT_ALLOWED" });
    const contentType = String(req.headers && req.headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      return res.status(415).json({ ok: false, code: "JSON_REQUIRED" });
    }
    const body = readBody(req);
    if (!bodyWithinLimit(req, body)) return res.status(413).json({ ok: false, code: "BODY_TOO_LARGE" });
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "displayName")) {
      return res.status(400).json({ ok: false, code: "INVALID_PROFILE_FIELDS", message: "Only displayName can be updated." });
    }
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 1 || displayName.length > 60) {
      return res.status(400).json({ ok: false, code: "INVALID_DISPLAY_NAME", message: "Display name must be 1–60 characters." });
    }
    try {
      const rows = await query(
        "insert into public.profiles (id, display_name) values ($1, $2) on conflict (id) do update set display_name = excluded.display_name, updated_at = now() returning id, display_name, role, verification_status, created_at",
        [session.userId, displayName]
      );
      return res.status(200).json({ ok: true, profile: rows[0] });
    } catch {
      return res.status(503).json({ ok: false, code: "PROFILE_UPDATE_UNAVAILABLE", message: "The account service is not configured yet." });
    }
  }

  try {
    const rows = await query(
      "select id, display_name, role, verification_status, created_at from public.profiles where id = $1 limit 1",
      [session.userId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        ok: false, code: "PROFILE_NOT_FOUND",
        message: "Your account profile has not been created yet."
      });
    }
    return res.status(200).json({ ok: true, profile: rows[0] });
  } catch {
    return res.status(503).json({
      ok: false, code: "PROFILE_UNAVAILABLE",
      message: "The account service is not ready. Please try again later."
    });
  }
};
