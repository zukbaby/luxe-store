const { requireOwner } = require("../_lib/authorization");
const { query } = require("../_lib/database");
const { randomUUID } = require("node:crypto");

const MAX_BODY_BYTES = 4096;

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

function parseBody(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return null;
  if (Buffer.byteLength(JSON.stringify(req.body), "utf8") > MAX_BODY_BYTES) return null;
  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const owner = await requireOwner(req);
  if (!owner.ok) {
    return send(res, owner.status, {
      ok: false, code: owner.code, message: owner.message
    });
  }

  try {
    if (req.method === "GET") {
      const rows = await query(
        "select id, user_id, store_name, store_slug, description, submitted_at from public.seller_applications where status = 'pending' order by submitted_at asc limit 100",
        []
      );
      return send(res, 200, { ok: true, applications: rows || [] });
    }

    const body = parseBody(req);
    if (!body) return send(res, 400, { ok: false, code: "INVALID_BODY" });
    const allowed = ["applicationId", "decision", "reviewerNote"];
    if (Object.keys(body).some((key) => !allowed.includes(key))) {
      return send(res, 400, { ok: false, code: "UNSUPPORTED_FIELDS" });
    }

    const applicationId = typeof body.applicationId === "string" ? body.applicationId.trim() : "";
    const decision = body.decision;
    const reviewerNote = typeof body.reviewerNote === "string" ? body.reviewerNote.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
      return send(res, 422, { ok: false, code: "INVALID_APPLICATION_ID" });
    }
    if (decision !== "approved" && decision !== "rejected") {
      return send(res, 422, { ok: false, code: "INVALID_DECISION" });
    }
    if (reviewerNote.length > 1000) {
      return send(res, 422, { ok: false, code: "REVIEWER_NOTE_TOO_LONG" });
    }

    // One SQL statement keeps the decision, role promotion, storefront creation,
    // and audit entry atomic. A uniqueness/FK failure rolls the whole statement back.
    const rows = await query(
      `with decided as (
         update public.seller_applications
         set status = $2::public.seller_application_status,
             reviewed_at = now(),
             reviewed_by = $3,
             reviewer_note = $4
         where id = $1 and status = 'pending'
         returning id, user_id, store_name, store_slug, description, status
       ),
       promoted as (
         update public.profiles p
         set role = 'seller', updated_at = now()
         from decided d
         where d.status = 'approved' and p.id = d.user_id
         returning p.id
       ),
       storefront as (
         insert into public.seller_storefronts
           (seller_id, store_name, store_slug, description, is_public)
         select d.user_id, d.store_name, d.store_slug, d.description, false
         from decided d
         join promoted p on p.id = d.user_id
         where d.status = 'approved'
         on conflict (seller_id) do update
           set store_name = excluded.store_name,
               store_slug = excluded.store_slug,
               description = excluded.description,
               is_public = false,
               updated_at = now()
         returning seller_id
       ),
       audit as (
         insert into public.admin_audit_log
           (actor_id, action, target_type, target_id, details)
         select $3, 'seller_application_' || d.status::text,
                'seller_application', d.id::text,
                jsonb_build_object('userId', d.user_id, 'storeSlug', d.store_slug)
         from decided d
         returning id
       )
       select d.id, d.user_id, d.store_name, d.store_slug, d.status
       from decided d`,
      [applicationId, decision, owner.userId, reviewerNote]
    );

    if (!rows || rows.length === 0) {
      return send(res, 404, {
        ok: false, code: "APPLICATION_NOT_PENDING",
        message: "The application was not found or has already been reviewed."
      });
    }
    return send(res, 200, { ok: true, application: rows[0] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    if (error && error.code === "23505") {
      return send(res, 409, {
        ok: false, code: "STORE_URL_CONFLICT",
        message: "That store URL is already in use. The decision was not saved."
      });
    }
    const requestId = randomUUID();
    console.error("LUXE seller review failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
