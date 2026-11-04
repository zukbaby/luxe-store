const unavailable = require("../_lib/unavailable");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  // Do not expose a verification queue without authenticated reviewer
  // identity, server-side admin authorization, and private evidence controls.
  return unavailable(res, "admin_verification_queue", ["GET"]);
};
