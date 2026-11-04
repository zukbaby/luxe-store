const unavailable = require("../../_lib/unavailable");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  // Vicky is reviewer assistance only. This route must require an authorized
  // human reviewer and private evidence access; it must never issue decisions.
  return unavailable(res, "vicky_review_assistance", ["POST"]);
};
