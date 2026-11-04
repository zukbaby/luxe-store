const { authenticate } = require("../_lib/auth");
const { query } = require("../_lib/database");
const { randomUUID } = require("node:crypto");

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return send(res, session.status, {
      ok: false, code: session.code, message: session.message
    });
  }

  const rawLimit = req.query && req.query.limit;
  const limit = rawLimit === undefined ? 30 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return send(res, 422, { ok: false, code: "INVALID_LIMIT" });
  }

  try {
    const rows = await query(
      `select id, kind, title, body, safe_payload, read_at, created_at
       from public.notifications
       where user_id = $1
       order by created_at desc, id desc
       limit $2`,
      [session.userId, limit]
    );
    const counts = await query(
      `select count(*)::int as unread_count
       from public.notifications
       where user_id = $1 and read_at is null`,
      [session.userId]
    );
    return send(res, 200, {
      ok: true,
      notifications: rows || [],
      unreadCount: counts && counts[0] ? counts[0].unread_count : 0
    });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    const requestId = randomUUID();
    console.error("LUXE notification inbox failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
