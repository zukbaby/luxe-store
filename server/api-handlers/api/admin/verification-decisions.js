const { requireOwner } = require("../_lib/authorization");
const { query } = require("../_lib/database");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }
  const owner = await requireOwner(req);
  if (!owner.ok) return res.status(owner.status).json({ ok: false, code: owner.code });
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(k => !["requestId","decision","reviewerNote"].includes(k)) ||
      typeof body.requestId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.requestId) ||
      !["approved","rejected"].includes(body.decision) ||
      (body.reviewerNote !== undefined && (typeof body.reviewerNote !== "string" || body.reviewerNote.length > 1000))) {
    return res.status(422).json({ ok: false, code: "INVALID_DECISION" });
  }
  try {
    const rows = await query(
      `with changed as (
         update public.verification_requests
         set status = $2::public.verification_status,
             reviewed_at = now(), reviewed_by = $3, reviewer_note = $4
         where id = $1 and status = 'pending'
         returning id, user_id, status
       ),
       profile_change as (
         update public.profiles p
         set verification_status = c.status,
             verification_badge = case
               when p.verification_badge = 'gold' then 'gold'
               when c.status = 'approved' then 'green'
               else null
             end,
             updated_at = now()
         from changed c where p.id = c.user_id returning p.id
       ),
       audit as (
         insert into public.admin_audit_log(actor_id,action,target_type,target_id,details)
         select $3,'verification_' || c.status::text,'verification_request',c.id::text,
                jsonb_build_object('userId',c.user_id)
         from changed c returning id
       ),
       notice as (
         insert into public.notifications(user_id,kind,title,body,safe_payload)
         select c.user_id,'verification_update','Verification status updated',
                case when c.status='approved'
                     then 'Your LUXE verification request has been approved.'
                     else 'Your LUXE verification request has been reviewed. Check your account for the latest status.' end,
                jsonb_build_object('status',c.status)
         from changed c returning id
       )
       select id,user_id,status from changed`,
      [body.requestId, body.decision, owner.userId, (body.reviewerNote || "").trim()]
    );
    if (!rows || !rows.length) return res.status(404).json({ ok: false, code: "REQUEST_NOT_PENDING" });
    return res.status(200).json({ ok: true, request: rows[0] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return res.status(503).json({ ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    return res.status(500).json({ ok: false, code: "INTERNAL_ERROR" });
  }
};
