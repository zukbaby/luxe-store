const { authenticate } = require("./auth");

async function requireOwner(req) {
  const session = await authenticate(req);
  if (!session.ok) return session;

  const ownerId = process.env.LUXE_OWNER_USER_ID;
  if (!ownerId) {
    return {
      ok: false,
      status: 503,
      code: "OWNER_NOT_CONFIGURED",
      message: "Owner access is not configured."
    };
  }

  if (session.userId !== ownerId) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "This action is restricted to the store owner."
    };
  }

  return { ...session, isOwner: true };
}

module.exports = { requireOwner };
