const unavailable = require("../_lib/unavailable");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  // DAMA must not call a model until rate limits, trusted catalogue retrieval,
  // input validation, and server-side provider credentials are configured.
  return unavailable(res, "dama_assistant", ["POST"]);
};
