module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Report configuration presence only. Never return secret values.
  const checks = {
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    authConfigured: Boolean(
      process.env.CLERK_SECRET_KEY &&
      process.env.CLERK_AUTHORIZED_PARTIES
    ),
    ownerConfigured: Boolean(process.env.LUXE_OWNER_USER_ID)
  };

  return res.status(200).json({
    service: "LUXE STORE API",
    status: "foundation",
    checks,
    liveFeaturesEnabled: false,
    note: "Configuration presence only. This endpoint does not test provider connectivity or enable live features."
  });
};
