const { authenticate } = require("./_lib/auth");
const { query } = require("./_lib/database");

const MAX_BODY_BYTES = 4096;

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(payload);
}

function getBody(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return null;
  const raw = JSON.stringify(req.body);
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return null;
  return req.body;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return send(res, session.status, {
      ok: false,
      code: session.code,
      message: session.message
    });
  }

  try {
    if (req.method === "GET") {
      const rows = await query(
        "select id, display_name, role, verification_status, created_at, updated_at from public.profiles where id = $1 limit 1",
        [session.userId]
      );
      if (!rows || rows.length === 0) {
        return send(res, 404, { ok: false, code: "PROFILE_NOT_FOUND", canCreate: true });
      }
      return send(res, 200, { ok: true, profile: rows[0] });
    }

    const body = getBody(req);
    if (!body) return send(res, 400, { ok: false, code: "INVALID_BODY" });

    const allowedKeys = ["displayName"];
    if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
      return send(res, 400, { ok: false, code: "UNSUPPORTED_FIELDS" });
    }

    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 1 || displayName.length > 60) {
      return send(res, 422, {
        ok: false,
        code: "INVALID_DISPLAY_NAME",
        message: "Display name must be between 1 and 60 characters."
      });
    }

    const rows = await query(
      `insert into public.profiles (id, display_name)
       values ($1, $2)
       on conflict (id) do update
         set display_name = excluded.display_name,
             updated_at = now()
       returning id, display_name, role, verification_status, created_at, updated_at`,
      [session.userId, displayName]
    );
    return send(res, 200, { ok: true, profile: rows[0] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    const requestId = crypto.randomUUID();
    console.error("LUXE profile request failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
