const { requireOwner } = require("../../../_lib/authorization");
const { query } = require("../../../_lib/database");
const { sameOrigin, bodyWithinLimit } = require("../../../_lib/request-security");

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const owner = await requireOwner(req);
  if (!owner.ok) {
    return res.status(owner.status).json({ ok: false, code: owner.code, message: owner.message });
  }

  const id = req.query && req.query.id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ ok: false, code: "INVALID_APPLICATION_ID" });
  }

  if (!sameOrigin(req)) return res.status(403).json({ ok: false, code: "ORIGIN_NOT_ALLOWED" });
  const contentType = String(req.headers && req.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ ok: false, code: "JSON_REQUIRED" });
  }

  const body = readBody(req);
  if (!bodyWithinLimit(req, body)) return res.status(413).json({ ok: false, code: "BODY_TOO_LARGE" });
  const decision = body && body.decision;
  const note = body && typeof body.note === "string" ? body.note.trim() : "";
  if (!body || !["approved", "rejected"].includes(decision) || note.length > 500) {
    return res.status(400).json({ ok: false, code: "INVALID_DECISION", message: "Choose approved or rejected and provide an optional note of up to 500 characters." });
  }

  try {
    const rows = await query(
      "with changed as (update public.seller_applications set status = $1, reviewed_at = now(), reviewed_by = $2, reviewer_note = nullif($3, '') where id = $4 and status = 'pending' returning id, user_id, business_name, status), profile_update as (update public.profiles p set role = case when $1 = 'approved' then 'seller'::public.account_role else p.role end, updated_at = now() from changed c where p.id = c.user_id returning p.id), audit as (insert into public.admin_audit_log (actor_id, action, target_type, target_id, details) select $2, 'seller_application_' || $1, 'seller_application', c.id::text, jsonb_build_object('user_id', c.user_id, 'business_name', c.business_name, 'reviewer_note', nullif($3, '')) from changed c join profile_update p on p.id = c.user_id returning id) select c.id, c.user_id, c.business_name, c.status from changed c join audit a on true",
      [decision, owner.userId, note, id]
    );

    if (!rows || rows.length === 0) {
      return res.status(409).json({ ok: false, code: "APPLICATION_ALREADY_REVIEWED_OR_MISSING", message: "This application is no longer pending or does not exist." });
    }
    return res.status(200).json({ ok: true, application: rows[0], message: decision === "approved" ? "Seller application approved. Seller role assigned." : "Seller application rejected." });
  } catch {
    return res.status(503).json({ ok: false, code: "DECISION_UNAVAILABLE", message: "The review service is not ready. No approval was confirmed." });
  }
};
