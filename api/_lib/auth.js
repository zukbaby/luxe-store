const COOKIE_NAME = "__session";

function readCookie(req, name) {
  const header = req.headers && req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

function getToken(req) {
  const authorization = req.headers && req.headers.authorization;
  if (typeof authorization === "string") {
    const match = authorization.match(/^Bearer\\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  return readCookie(req, COOKIE_NAME);
}

function getAuthorizedParties() {
  const configured = (process.env.CLERK_AUTHORIZED_PARTIES || "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const deploymentHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ].filter(Boolean);
  const deploymentOrigins = deploymentHosts.map((host) => {
    const url = host.startsWith("http://") || host.startsWith("https://") ? host : "https://" + host;
    try { return new URL(url).origin; } catch { return null; }
  }).filter(Boolean);
  return Array.from(new Set([...configured, ...deploymentOrigins]));
}

async function authenticate(req) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const authorizedParties = getAuthorizedParties();
  if (!secretKey || authorizedParties.length === 0) {
    return { ok: false, status: 503, code: "AUTH_NOT_CONFIGURED", message: "Authentication is not configured." };
  }
  const token = getToken(req);
  if (!token) {
    return { ok: false, status: 401, code: "AUTH_REQUIRED", message: "Sign-in is required." };
  }
  try {
    const { verifyToken } = await import("@clerk/backend");
    const payload = await verifyToken(token, { secretKey, authorizedParties });
    if (!payload || typeof payload.sub !== "string" || !payload.sub) {
      return { ok: false, status: 401, code: "INVALID_SESSION", message: "The session could not be verified." };
    }
    return { ok: true, userId: payload.sub, sessionId: payload.sid || null };
  } catch {
    return { ok: false, status: 401, code: "INVALID_SESSION", message: "The session could not be verified." };
  }
}

module.exports = { authenticate };
