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
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ),
    ownerConfigured: Boolean(process.env.LUXE_OWNER_USER_ID)
  };

  return res.status(200).json({
    service: "LUXE STORE API",
    status: "foundation",
    checks,
    liveFeaturesEnabled: false,
    note: "Configuration checks only. Authentication, database operations, and admin actions are not enabled."
  });
};
