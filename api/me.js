const { authenticate } = require("./_lib/auth");
const { query } = require("./_lib/database");

function jsonHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
}

module.exports = async function handler(req, res) {
  jsonHeaders(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return res.status(session.status).json({
      ok: false, code: session.code, message: session.message
    });
  }

  try {
    const rows = await query(
      "select id, display_name, role, verification_status, created_at from public.profiles where id = $1 limit 1",
      [session.userId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        ok: false, code: "PROFILE_NOT_FOUND",
        message: "Your account profile has not been created yet."
      });
    }
    return res.status(200).json({ ok: true, profile: rows[0] });
  } catch {
    return res.status(503).json({
      ok: false, code: "PROFILE_UNAVAILABLE",
      message: "The account service is not ready. Please try again later."
    });
  }
};
