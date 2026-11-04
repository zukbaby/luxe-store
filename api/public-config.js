module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }
  // Vercel's Clerk Marketplace integration provisions this exact public key name.
  // Keep the legacy alias as a fallback for manually configured environments.
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY ||
    "";
  return res.status(200).json({
    ok: true,
    configured: Boolean(publishableKey),
    publishableKey: publishableKey || null
  });
};
