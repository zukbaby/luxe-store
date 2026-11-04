const { authenticate } = require("./_lib/auth");
const { query } = require("./_lib/database");
const { randomUUID } = require("node:crypto");

const MAX_BODY_BYTES = 4096;
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

function getBody(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return null;
  if (Buffer.byteLength(JSON.stringify(req.body), "utf8") > MAX_BODY_BYTES) return null;
  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return send(res, session.status, {
      ok: false, code: session.code, message: session.message
    });
  }

  try {
    if (req.method === "GET") {
      const rows = await query(
        "select id, display_name, username, role, verification_status, banned_until, created_at, updated_at from public.profiles where id = $1 limit 1",
        [session.userId]
      );
      if (!rows || rows.length === 0) {
        return send(res, 404, { ok: false, code: "PROFILE_NOT_FOUND", canCreate: true });
      }
      return send(res, 200, { ok: true, profile: rows[0] });
    }

    const body = getBody(req);
    if (!body) return send(res, 400, { ok: false, code: "INVALID_BODY" });

    const allowedKeys = ["displayName", "username"];
    if (Object.keys(body).length === 0 ||
        Object.keys(body).some((key) => !allowedKeys.includes(key))) {
      return send(res, 400, { ok: false, code: "UNSUPPORTED_FIELDS" });
    }

    const hasDisplayName = Object.prototype.hasOwnProperty.call(body, "displayName");
    const hasUsername = Object.prototype.hasOwnProperty.call(body, "username");
    const displayName = hasDisplayName && typeof body.displayName === "string"
      ? body.displayName.trim() : null;
    const username = hasUsername && typeof body.username === "string"
      ? body.username.trim().toLowerCase() : null;

    if (hasDisplayName && (!displayName || displayName.length > 60)) {
      return send(res, 422, {
        ok: false, code: "INVALID_DISPLAY_NAME",
        message: "Display name must be between 1 and 60 characters."
      });
    }
    if (hasUsername && (!username || !USERNAME_PATTERN.test(username))) {
      return send(res, 422, {
        ok: false, code: "INVALID_USERNAME",
        message: "Username must be 3–24 characters using letters, numbers or underscores."
      });
    }

    const rows = await query(
      `insert into public.profiles (id, display_name, username)
       values ($1, $2, $3)
       on conflict (id) do update
         set display_name = coalesce(excluded.display_name, public.profiles.display_name),
             username = coalesce(excluded.username, public.profiles.username),
             updated_at = now()
       returning id, display_name, username, role, verification_status, banned_until, created_at, updated_at`,
      [session.userId, displayName || "LUXE Member", username]
    );
    return send(res, 200, { ok: true, profile: rows[0] });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    if (error && error.code === "23505") {
      return send(res, 409, {
        ok: false, code: "USERNAME_TAKEN",
        message: "That username is already in use."
      });
    }
    const requestId = randomUUID();
    console.error("LUXE profile request failed", { requestId });
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR", requestId });
  }
};
