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
  if (!owner.ok) return send(res, owner.status, { ok: false, code: owner.code, message: owner.message });

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 1 || typeof body.command !== "string" ||
      Buffer.byteLength(JSON.stringify(body), "utf8") > 256) {
    return send(res, 400, { ok: false, code: "INVALID_BODY" });
  }

  const match = body.command.trim().match(/^vicky(Plus|Pro|Gold|Free)-([a-z0-9_]{3,24})$/i);
  if (!match) {
    return send(res, 422, {
      ok: false, code: "INVALID_COMMAND",
      message: "Use vickyPlus-username, vickyPro-username, vickyGold-username, or vickyFree-username."
    });
  }

  const plan = match[1].toLowerCase();
  const username = match[2].toLowerCase();
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
         set vicky_plan = $3, updated_at = now()
         from target t
         where p.id = t.id
         returning p.id, p.username, p.display_name, p.vicky_plan
       ),
       audit as (
         insert into public.admin_audit_log
           (actor_id, action, target_type, target_id, details)
         select $2, 'vicky_ai_plan_changed', 'profile', c.id::text,
                jsonb_build_object('username', c.username, 'plan', c.vicky_plan)
         from changed c
         returning id
       ),
       notice as (
         insert into public.notifications
           (user_id, kind, title, body, safe_payload)
         select c.id, 'account_update', 'Vicky AI plan updated',
                case c.vicky_plan
                  when 'plus' then 'Your Vicky AI Plus plan is now active.'
                  when 'pro' then 'Your Vicky AI Pro plan is now active.'
                  when 'gold' then 'Your Vicky AI Gold plan is now active.'
                  else 'Your Vicky AI plan has been reset to Free.'
                end,
                jsonb_build_object('vickyPlan', c.vicky_plan)
         from changed c
         returning id
       )
       select id, username, display_name, vicky_plan from changed`,
      [username, owner.userId, plan]
    );

    if (!rows || rows.length === 0) {
      const found = await query("select id from public.profiles where lower(username) = $1 limit 1", [username]);
      if (!found || !found.length) return send(res, 404, { ok: false, code: "USERNAME_NOT_FOUND" });
      return send(res, 409, { ok: false, code: "PROTECTED_ACCOUNT", message: "Owner and official DAMA accounts cannot have their Vicky plan changed." });
    }
    return send(res, 200, { ok: true, message: "Vicky AI plan updated. The matching badge colour will appear on the next profile load.", user: rows[0] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    if (error && error.code === "42703") return send(res, 503, { ok: false, code: "VICKY_PLAN_MIGRATION_REQUIRED", message: "Apply the Vicky AI tier database migration first." });
    const requestId = randomUUID();
    console.error("LUXE Vicky plan command failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
