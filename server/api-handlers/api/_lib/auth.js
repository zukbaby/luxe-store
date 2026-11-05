const { query } = require("./database");
const COOKIE_NAME = "__session";

function readCookie(req, name) {
  const header = req.headers && req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (key === name) return part.slice(index + 1).trim();
  }
  return null;
}

function getToken(req) {
  const authorization = req.headers && req.headers.authorization;
  if (typeof authorization === "string") {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  return readCookie(req, COOKIE_NAME);
}

function getAuthorizedParties() {
  return (process.env.CLERK_AUTHORIZED_PARTIES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function authenticate(req) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const authorizedParties = getAuthorizedParties();

  if (!secretKey || authorizedParties.length === 0) {
    return {
      ok: false,
      status: 503,
      code: "AUTH_NOT_CONFIGURED",
      message: "Authentication is not configured."
    };
  }

  const token = getToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "AUTH_REQUIRED",
      message: "Sign-in is required."
    };
  }

  let identity;
  try {
    const { verifyToken } = await import("@clerk/backend");
    const result = await verifyToken(token, {
      secretKey,
      authorizedParties
    });

    if (!result || (result.errors && result.errors.length > 0) || !result.data || !result.data.sub) {
      return {
        ok: false,
        status: 401,
        code: "INVALID_SESSION",
        message: "The session could not be verified."
      };
    }
    identity = {
      userId: result.data.sub,
      sessionId: result.data.sid || null
    };
  } catch {
    return {
      ok: false,
      status: 401,
      code: "INVALID_SESSION",
      message: "The session could not be verified."
    };
  }

  // Central enforcement: every API using authenticate() checks timed account bans.
  try {
    const rows = await query(
      "select banned_until from public.profiles where id = $1 limit 1",
      [identity.userId]
    );
    const bannedUntil = rows && rows[0] && rows[0].banned_until;
    if (bannedUntil && new Date(bannedUntil).getTime() > Date.now()) {
      return {
        ok: false,
        status: 403,
        code: "ACCOUNT_BANNED",
        message: "This account is temporarily restricted.",
        bannedUntil
      };
    }
  } catch (error) {
    return {
      ok: false,
      status: 503,
      code: error && error.code === "DATABASE_NOT_CONFIGURED"
        ? "DATABASE_NOT_CONFIGURED" : "ACCOUNT_STATUS_UNAVAILABLE",
      message: "Account status could not be checked. Please try again later."
    };
  }

  return { ok: true, ...identity };
}

module.exports = { authenticate };
