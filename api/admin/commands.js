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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const owner = await requireOwner(req);
  if (!owner.ok) {
    return send(res, owner.status, {
      ok: false, code: owner.code, message: owner.message
    });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Buffer.byteLength(JSON.stringify(body), "utf8") > 1024) {
    return send(res, 400, { ok: false, code: "INVALID_BODY" });
  }
  if (Object.keys(body).length !== 1 || typeof body.command !== "string") {
    return send(res, 400, { ok: false, code: "UNSUPPORTED_FIELDS" });
  }

  const command = body.command.trim();
  const match = command.match(/^1weekban-([a-z0-9_]{3,24})$/i);
  if (!match) {
    return send(res, 422, {
      ok: false, code: "INVALID_COMMAND",
      message: "Use the exact format: 1weekban-username (3–24 letters, numbers or underscores)."
    });
  }

  const username = match[1].toLowerCase();
  try {
    const rows = await query(
      `with target as (
         select id, username, role
         from public.profiles
         where lower(username) = $1
         limit 1
       ),
       banned as (
         update public.profiles p
         set banned_until = now() + interval '7 days',
             ban_reason = '1weekban command',
             updated_at = now()
         from target t
         where p.id = t.id
           and p.id <> $2
           and p.role <> 'admin'
         returning p.id, p.username, p.banned_until
       ),
       audit as (
         insert into public.admin_audit_log
           (actor_id, action, target_type, target_id, details)
         select $2, 'user_banned_7_days', 'profile', b.id,
                jsonb_build_object('username', b.username, 'expiresAt', b.banned_until)
         from banned b
         returning id
       )
       select id, username, banned_until from banned`,
      [username, owner.userId]
    );

    if (!rows || rows.length === 0) {
      const found = await query(
        "select id, role from public.profiles where lower(username) = $1 limit 1",
        [username]
      );
      if (!found || found.length === 0) {
        return send(res, 404, { ok: false, code: "USERNAME_NOT_FOUND" });
      }
      return send(res, 409, {
        ok: false, code: "ACCOUNT_PROTECTED",
        message: "The owner account and administrator accounts cannot be banned with this command."
      });
    }

    return send(res, 200, {
      ok: true,
      message: "Seven-day ban recorded.",
      ban: rows[0]
    });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    const requestId = randomUUID();
    console.error("LUXE moderation command failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
