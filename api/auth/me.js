const { authenticate } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) {
    return res.status(session.status).json({
      authenticated: false,
      error: session.code,
      message: session.message
    });
  }

  return res.status(200).json({
    authenticated: true,
    userId: session.userId
  });
};
