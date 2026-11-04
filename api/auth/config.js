const { json, methodNotAllowed } = require("../_lib/http");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Accept");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return methodNotAllowed(res);
  }

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey || !/^pk_(test|live)_/.test(publishableKey)) {
    return res.status(503).json({
      error: "AUTH_NOT_CONFIGURED",
      message: "Account sign-in is not configured yet."
    });
  }

  return res.status(200).json({ publishableKey });
};
