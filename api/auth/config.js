module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  // A Clerk publishable key is designed for browser use. Never expose the secret key here.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey || !/^pk_(test|live)_/.test(publishableKey)) {
    return res.status(503).json({
      error: "AUTH_NOT_CONFIGURED",
      message: "Account sign-in is not configured yet."
    });
  }

  return res.status(200).json({ publishableKey });
};
