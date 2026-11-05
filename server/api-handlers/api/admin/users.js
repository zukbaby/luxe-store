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

  const q = typeof req.query?.q === "string" ? req.query.q.trim() : "";
  const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";
  if (q.length > 60 || id.length > 128 || (q && id)) {
    return send(res, 422, { ok: false, code: "INVALID_QUERY" });
  }

  try {
    if (id) {
      const profiles = await query(
        `select p.id, p.username, p.display_name, p.role, p.verification_status,
                to_jsonb(p)->>'verification_badge' as verification_badge,
                case when p.id = $2 or lower(p.username) = 'official.dama' then 'blue'
                     when to_jsonb(p)->>'verification_badge' in ('green', 'gold') then to_jsonb(p)->>'verification_badge'
                     else null end as badge_color,
                p.banned_until, p.ban_reason, p.created_at, p.updated_at
         from public.profiles p
         where p.id = $1
         limit 1`,
        [id, process.env.LUXE_OWNER_USER_ID || ""]
      );
      if (!profiles || profiles.length === 0) {
        return send(res, 404, { ok: false, code: "USER_NOT_FOUND" });
      }
      const history = await query(
        `select id, action, created_at
         from public.admin_audit_log
         where target_type = 'profile' and target_id = $1
         order by created_at desc, id desc
         limit 25`,
        [id]
      );
      return send(res, 200, {
        ok: true,
        user: profiles[0],
        moderationHistory: history || []
      });
    }

    const rows = await query(
      `select p.id, p.username, p.display_name, p.role, p.verification_status,
              to_jsonb(p)->>'verification_badge' as verification_badge,
              case when p.id = $2 or lower(p.username) = 'official.dama' then 'blue'
                   when to_jsonb(p)->>'verification_badge' in ('green', 'gold') then to_jsonb(p)->>'verification_badge'
                   else null end as badge_color,
              p.banned_until, p.created_at
       from public.profiles p
       where $1 = ''
          or lower(coalesce(p.username, '')) like '%' || lower($1) || '%'
          or lower(p.display_name) like '%' || lower($1) || '%'
       order by created_at desc
       limit 50`,
      [q, process.env.LUXE_OWNER_USER_ID || ""]
    );
    return send(res, 200, { ok: true, users: rows || [], limit: 50 });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    const requestId = randomUUID();
    console.error("LUXE user directory request failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
