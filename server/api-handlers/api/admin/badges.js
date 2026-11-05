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
      Object.keys(body).length !== 1 || typeof body.command !== "string" ||
      Buffer.byteLength(JSON.stringify(body), "utf8") > 256) {
    return send(res, 400, { ok: false, code: "INVALID_BODY" });
  }

  const command = body.command.trim();
  const match = command.match(/^(verifyVIP|verify|removeV)-([a-z0-9_]{3,24})$/i);
  if (!match) {
    return send(res, 422, {
      ok: false, code: "INVALID_COMMAND",
      message: "Use verify-username, verifyVIP-username, or removeV-username."
    });
  }

  const action = match[1].toLowerCase();
  const username = match[2].toLowerCase();
  const badge = action === "verifyvip" ? "gold" : action === "verify" ? "green" : null;

  try {
    const rows = await query(
      `with target as (
         select id, username, display_name
         from public.profiles
         where lower(username) = $1
           and id <> $2
           and lower(username) <> 'official.dama'
         limit 1
       ),
       changed as (
         update public.profiles p
         set verification_badge = $3,
             updated_at = now()
         from target t
         where p.id = t.id
         returning p.id, p.username, p.display_name, p.verification_badge
       ),
       audit as (
         insert into public.admin_audit_log
           (actor_id, action, target_type, target_id, details)
         select $2,
                case when $3 = 'green' then 'verification_badge_granted'
                     when $3 = 'gold' then 'vip_badge_granted'
                     else 'verification_badge_revoked' end,
                'profile', c.id::text,
                jsonb_build_object('username', c.username, 'badge', c.verification_badge)
         from changed c
         returning id
       ),
       notice as (
         insert into public.notifications
           (user_id, kind, title, body, safe_payload)
         select c.id, 'verification_update', 'LUXE badge updated',
                case when c.verification_badge = 'green'
                     then 'Your LUXE verified badge has been granted.'
                     when c.verification_badge = 'gold'
                     then 'Your LUXE VIP badge has been granted.'
                     else 'Your LUXE badge status has been updated.' end,
                jsonb_build_object('badge', c.verification_badge)
         from changed c
         returning id
       )
       select id, username, display_name, verification_badge from changed`,
      [username, owner.userId, badge]
    );

    if (!rows || rows.length === 0) {
      const found = await query(
        "select id from public.profiles where lower(username) = $1 limit 1",
        [username]
      );
      if (!found || found.length === 0) {
        return send(res, 404, { ok: false, code: "USERNAME_NOT_FOUND" });
      }
      return send(res, 409, {
        ok: false, code: "PROTECTED_ACCOUNT",
        message: "The owner and official DAMA accounts have reserved blue badges and cannot be changed with these commands."
      });
    }

    return send(res, 200, {
      ok: true,
      message: badge ? (badge === "gold" ? "VIP badge granted." : "Verified badge granted.") : "Badge revoked.",
      user: rows[0]
    });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    if (error && error.code === "42703") {
      return send(res, 503, {
        ok: false, code: "BADGE_MIGRATION_REQUIRED",
        message: "Apply the LUXE verification badge database migration first."
      });
    }
    const requestId = randomUUID();
    console.error("LUXE badge command failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
