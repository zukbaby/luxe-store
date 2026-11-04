function sameOrigin(req) {
  const origin = req.headers && req.headers.origin;
  const host = req.headers && req.headers.host;
  if (typeof origin !== "string" || typeof host !== "string" || !host) return false;
  try {
    const parsed = new URL(origin);
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
    const expected = (local ? "http://" : "https://") + host;
    return parsed.origin === expected;
  } catch {
    return false;
  }
}

function bodyWithinLimit(req, body, maxBytes = 16384) {
  const headerLength = Number(req.headers && req.headers["content-length"]);
  if (Number.isFinite(headerLength) && headerLength > maxBytes) return false;
  try {
    return JSON.stringify(body).length <= maxBytes;
  } catch {
    return false;
  }
}

module.exports = { sameOrigin, bodyWithinLimit };
