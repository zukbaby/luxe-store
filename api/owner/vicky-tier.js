const { requireOwner } = require("../_lib/authorization");
const { query } = require("../_lib/database");

const ALLOWED_TIERS = new Set(["plus", "pro", "gold"]);

function parseBadgeCommand(value) {
  if (typeof value !== "string" || value.length > 100) return null;
  const command = value.trim();
  let match = command.match(/^verify-([a-z0-9_]{3,24})\\s+paid$/i);
  if (match) return { username: match[1].toLowerCase(), badge: "paid_verified", action: "badge.granted.paid_verified" };
  match = command.match(/^verifyVIP-([a-z0-9_]{3,24})\\s+VIP$/i);
  if (match) return { username: match[1].toLowerCase(), badge: "vip", action: "badge.granted.vip" };
  match = command.match(/^removeV-([a-z0-9_]{3,24})$/i);
  if (match) return { username: match[1].toLowerCase(), badge: "none", action: "badge.revoked" };
  return null;
}

function sendError(res, status, code, message) {
  return res.status(status).json({ ok: false, code, message });
}

async function handleBadgeRequest(req, res, owner) {
  if (req.method === "GET") {
    const audit = await query(
      "SELECT id, action, target_id, details, created_at FROM admin_audit_log WHERE target_type = $1 AND action LIKE $2 ORDER BY created_at DESC LIMIT 50",
      ["profile", "badge.%"]
    );
    return res.status(200).json({ ok: true, audit });
  }

  const command = req.body && req.body.command;
  const parsed = parseBadgeCommand(command);
  if (!parsed) {
    return sendError(res, 400, "INVALID_BADGE_COMMAND",
      "Use verify-username paid, verifyVIP-username VIP, or removeV-username. Replace username with the exact account username.");
  }

  const sql = [
    "WITH target AS MATERIALIZED (",
    "SELECT id, username, display_name FROM public.profiles",
    "WHERE lower(username) = $1 ORDER BY id LIMIT 2 FOR UPDATE",
    "), changed AS (",
    "UPDATE public.profiles AS p SET badge_type = $2, updated_at = now()",
    "FROM target AS t WHERE p.id = t.id",
    "AND (SELECT count(*) FROM target) = 1 AND p.id <> $3",
    "RETURNING p.id, p.username, p.display_name, p.badge_type",
    "), logged AS (",
    "INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)",
    "SELECT $3, $4, 'profile', c.id,",
    "jsonb_build_object('username', c.username, 'display_name', c.display_name, 'badge_type', c.badge_type, 'command', $5)",
    "FROM changed AS c RETURNING id, created_at",
    ")",
    "SELECT (SELECT count(*)::int FROM target) AS target_count,",
    "(SELECT count(*)::int FROM changed) AS changed_count,",
    "(SELECT json_build_object('username', c.username, 'display_name', c.display_name, 'badge_type', c.badge_type, 'audit_id', l.id, 'created_at', l.created_at)",
    "FROM changed AS c CROSS JOIN logged AS l LIMIT 1) AS result"
  ].join(" ");

  const rows = await query(sql, [parsed.username, parsed.badge, owner.userId, parsed.action, command.trim()]);
  const row = rows && rows[0];
  if (!row || Number(row.target_count) === 0) return sendError(res, 404, "USER_NOT_FOUND", "No account was found with that exact username.");
  if (Number(row.target_count) > 1) return sendError(res, 409, "USERNAME_NOT_UNIQUE", "More than one account has that username. No badge was changed.");
  if (Number(row.changed_count) === 0) return sendError(res, 403, "PROTECTED_ACCOUNT", "The owner's account is protected from badge changes.");

  return res.status(200).json({
    ok: true,
    message: parsed.badge === "none" ? "Badge revoked." : "Badge updated.",
    account: row.result
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use GET or POST.");
  }

  const owner = await requireOwner(req);
  if (!owner.ok) return sendError(res, owner.status, owner.code, owner.message);

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const badgeResource = req.method === "GET"
    ? Boolean(req.query && req.query.resource === "badges")
    : body.resource === "badges";

  try {
    if (badgeResource) return await handleBadgeRequest(req, res, owner);

    if (req.method === "GET") return res.status(200).json({ ok: true, isOwner: true });

    const tier = typeof body.tier === "string" ? body.tier.trim().toLowerCase() : "";
    if (!ALLOWED_TIERS.has(tier)) {
      return sendError(res, 400, "INVALID_VICKY_TIER", "Choose Plus, Pro, or Gold.");
    }

    // The visual tier remains on the owner's device until persistent preferences are enabled.
    return res.status(200).json({ ok: true, isOwner: true, tier });
  } catch (error) {
    const code = error && error.code === "DATABASE_NOT_CONFIGURED" ? "DATABASE_NOT_CONFIGURED" : "BADGE_OPERATION_FAILED";
    return sendError(res, code === "DATABASE_NOT_CONFIGURED" ? 503 : 500, code,
      code === "DATABASE_NOT_CONFIGURED" ? "The badge database is not configured." : "The badge change could not be completed. No success was recorded.");
  }
};
