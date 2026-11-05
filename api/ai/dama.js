const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_MESSAGE_CHARS = 1_200;
const buckets = new Map();

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(body);
}

function rateLimit(req) {
  const forwarded = req.headers && req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "unknown";
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || now - current.start >= WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_REQUESTS;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  if (!rateLimit(req)) {
    return json(res, 429, {
      ok: false,
      code: "RATE_LIMITED",
      message: "Too many messages. Please wait a minute and try again."
    });
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const endpoint = process.env.LUXE_AI_PROVIDER_URL;
  const model = process.env.LUXE_AI_PROVIDER_MODEL;
  const freeOnly = process.env.LUXE_AI_FREE_ONLY === "true";

  if (!freeOnly || !token || !endpoint || model !== "@cf/zai-org/glm-4.7-flash") {
    return json(res, 503, {
      ok: false,
      code: "ASSISTANT_NOT_CONFIGURED",
      message: "DAMA's free AI connection is not fully configured yet."
    });
  }

  let target;
  try {
    target = new URL(endpoint);
  } catch {
    return json(res, 503, { ok: false, code: "PROVIDER_NOT_CONFIGURED" });
  }
  if (target.protocol !== "https:" || target.hostname !== "api.cloudflare.com") {
    return json(res, 503, { ok: false, code: "PROVIDER_NOT_ALLOWED" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 10) {
    return json(res, 400, { ok: false, code: "INVALID_MESSAGES" });
  }

  const messages = [];
  for (const item of body.messages) {
    if (!item || !["user", "assistant"].includes(item.role) ||
        typeof item.content !== "string" ||
        item.content.trim().length < 1 ||
        item.content.length > MAX_MESSAGE_CHARS) {
      return json(res, 400, { ok: false, code: "INVALID_MESSAGE" });
    }
    messages.push({ role: item.role, content: item.content.trim() });
  }
  if (messages[messages.length - 1].role !== "user") {
    return json(res, 400, { ok: false, code: "USER_MESSAGE_REQUIRED" });
  }

  const system = {
    role: "system",
    content: "You are DAMA, the helpful support assistant for LUXE STORE, a global third-party marketplace. Be clear, friendly, and honest. Help with general shopping navigation, seller onboarding guidance, platform features, and support directions. You do not have access to live inventory, accounts, orders, payments, seller records, private customer data, or admin controls. Never claim to have placed an order, changed an account, approved a seller, issued a verification badge, or completed a payment. Direct account-specific or order-specific issues to official human support. Do not ask users to send passwords, payment card details, identity documents, or private authentication codes. If unsure, say so. Do not invent prices, stock, shipping dates, or policies."
  };

  try {
    const response = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [system, ...messages],
        max_tokens: 500,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      return json(res, 502, {
        ok: false,
        code: "AI_PROVIDER_ERROR",
        message: "DAMA could not reach its AI service right now. Please try again later."
      });
    }

    const data = await response.json();
    const answer = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return json(res, 502, { ok: false, code: "EMPTY_AI_RESPONSE" });
    }

    return json(res, 200, { ok: true, assistant: "DAMA", reply: answer.trim() });
  } catch {
    return json(res, 502, {
      ok: false,
      code: "AI_CONNECTION_FAILED",
      message: "DAMA's AI connection is temporarily unavailable."
    });
  }
};
