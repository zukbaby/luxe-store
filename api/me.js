const unavailable = require("./_lib/unavailable");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  // Never return or mutate a profile until a verified server-side session
  // and database ownership checks are available.
  return unavailable(res, "account_profile", ["GET", "PATCH"]);
};
