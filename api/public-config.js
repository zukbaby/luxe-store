module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || "";
  return res.status(200).json({
    ok: true,
    configured: Boolean(publishableKey),
    publishableKey: publishableKey || null
  });
};
