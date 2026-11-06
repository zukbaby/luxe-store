const { requireOwner } = require("../_lib/authorization");

const ALLOWED_TIERS = new Set(["plus", "pro", "gold"]);

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const owner = await requireOwner(req);
  if (!owner.ok) {
    return res.status(owner.status).json({
      ok: false,
      code: owner.code,
      message: owner.message
    });
  }

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, isOwner: true });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const tier = typeof body.tier === "string" ? body.tier.trim().toLowerCase() : "";
  if (!ALLOWED_TIERS.has(tier)) {
    return res.status(400).json({
      ok: false,
      code: "INVALID_VICKY_TIER",
      message: "Choose Plus, Pro, or Gold."
    });
  }

  // This endpoint authorizes the owner-only selection. The selected visual tier
  // is kept on the owner's device until persistent account preferences are enabled.
  return res.status(200).json({ ok: true, isOwner: true, tier });
};
