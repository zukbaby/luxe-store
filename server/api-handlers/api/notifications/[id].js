const { authenticate } = require("../../_lib/auth");
const { query } = require("../../_lib/database");
const { randomUUID } = require("node:crypto");

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return send(res, session.status, {
      ok: false, code: session.code, message: session.message
    });
  }

  const id = req.query && typeof req.query.id === "string" ? req.query.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return send(res, 422, { ok: false, code: "INVALID_NOTIFICATION_ID" });
  }
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) ||
      Object.keys(req.body).length !== 1 || req.body.read !== true) {
    return send(res, 400, { ok: false, code: "INVALID_BODY" });
  }

  try {
    const rows = await query(
      `update public.notifications
       set read_at = coalesce(read_at, now())
       where id = $1 and user_id = $2
       returning id, read_at`,
      [id, session.userId]
    );
    if (!rows || rows.length === 0) {
      return send(res, 404, { ok: false, code: "NOTIFICATION_NOT_FOUND" });
    }
    return send(res, 200, { ok: true, notification: rows[0] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    const requestId = randomUUID();
    console.error("LUXE notification read update failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
