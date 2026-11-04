const { requireOwner } = require("../_lib/authorization");
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

  const owner = await requireOwner(req);
  if (!owner.ok) {
    return send(res, owner.status, {
      ok: false, code: owner.code, message: owner.message
    });
  }

  const rawLimit = req.query && req.query.limit;
  const parsedLimit = rawLimit === undefined ? 50 : Number(rawLimit);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return send(res, 422, {
      ok: false, code: "INVALID_LIMIT",
      message: "Limit must be a whole number between 1 and 100."
    });
  }

  try {
    const rows = await query(
      `select a.id, a.action, a.target_type, a.target_id, a.created_at,
              p.display_name as actor_display_name, p.username as actor_username
       from public.admin_audit_log a
       left join public.profiles p on p.id = a.actor_id
       order by a.created_at desc, a.id desc
       limit $1`,
      [parsedLimit]
    );
    return send(res, 200, { ok: true, events: rows || [] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    const requestId = randomUUID();
    console.error("LUXE audit log request failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
