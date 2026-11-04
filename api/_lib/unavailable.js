module.exports = function unavailable(res, feature, allowedMethods) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  return res.status(503).json({
    ok: false,
    code: "FEATURE_NOT_CONFIGURED",
    feature,
    message: "This feature is not available until authentication, database access, and authorization are configured and tested."
  });
};
