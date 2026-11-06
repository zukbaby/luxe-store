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
      message: "The AI connection is not fully configured yet."
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

  const requestedAssistant = req.body && req.body.assistant === "vicky" ? "vicky" : "dama";
  const system = {
    role: "system",
    content: requestedAssistant === "vicky"
      ? "You are Vicky AI, the personal AI assistant inside LUXE STORE. You are separate from DAMA, who handles official marketplace support. Help with general questions, brainstorming, writing, learning, planning, and everyday productivity. Be warm, thoughtful, clear, and honest. Keep replies concise by default, but explain more when the user asks. Use a few natural, relevant emojis when they improve warmth or clarity; never overuse them. You cannot access the user's private files, accounts, messages, purchases, live store records, or device. Never claim to remember information that is not in the current conversation or actually available to you. Never ask for passwords, payment details, identity documents, or private authentication codes. Do not claim to perform actions outside this chat. If unsure, say so."
      : "You are DAMA, the helpful support assistant for LUXE STORE, a global third-party marketplace. Be clear, friendly, and honest. Help with general shopping navigation, seller onboarding guidance, platform features, and support directions. Keep replies concise by default (usually 1–3 short sentences) and avoid long introductions. Use a few natural, relevant emojis when they improve warmth or clarity, but do not overuse them or put them in every sentence. You do not have access to live inventory, accounts, orders, payments, seller records, private customer data, or admin controls. Never claim to have placed an order, changed an account, approved a seller, issued a verification badge, or completed a payment. Direct account-specific or order-specific issues to official human support. Do not ask users to send passwords, payment card details, identity documents, or private authentication codes. If unsure, say so. Do not invent prices, stock, shipping dates, or policies."
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
        max_tokens: 300,
        temperature: 0.4,
        stream: false
      }),
      signal: AbortSignal.timeout(25_000)
    });

    if (!response.ok) {
      // Expose only the provider HTTP status, never response bodies or credentials.
      const providerStatus = response.status;
      let message = "The AI provider is temporarily unavailable. Please try again shortly.";
      if (providerStatus === 401 || providerStatus === 403) {
        message = "The AI provider rejected its server credentials (HTTP " + providerStatus + "). The site owner needs to check the Cloudflare API token permissions.";
      } else if (providerStatus === 404) {
        message = "The AI provider endpoint or selected model was not found (HTTP 404). The site owner needs to check the model configuration.";
      } else if (providerStatus === 429) {
        message = "The AI provider is rate-limiting requests (HTTP 429). Please wait and try again.";
      } else if (providerStatus >= 500) {
        message = "The AI provider returned a server error (HTTP " + providerStatus + "). Please try again shortly.";
      }
      return json(res, 502, {
        ok: false,
        code: "AI_PROVIDER_HTTP_" + providerStatus,
        providerStatus,
        message
      });
    }

    if (!response.body) {
      return json(res, 502, { ok: false, code: "EMPTY_AI_RESPONSE",
        message: "DAMA received an empty response. Please try again." });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      const answer =
        (payload && payload.result && typeof payload.result.response === "string" && payload.result.response) ||
        (payload && payload.choices && payload.choices[0] &&
          payload.choices[0].message && payload.choices[0].message.content) ||
        (payload && payload.response && typeof payload.response === "string" && payload.response) ||
        "";
      if (!answer.trim()) {
        return json(res, 502, { ok: false, code: "EMPTY_AI_RESPONSE",
          message: "DAMA received an empty response. Please try again." });
      }
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(answer.trim());
    }

    res.statusCode = 200;
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let finished = false;

    while (!finished) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          finished = true;
          break;
        }
        try {
          const event = JSON.parse(payload);
          const piece = event && event.choices && event.choices[0] &&
            event.choices[0].delta && event.choices[0].delta.content;
          if (typeof piece === "string" && piece) {
            answer += piece;
            res.write(piece);
          }
        } catch {
          // Ignore non-JSON keepalive or metadata events.
        }
      }
    }

    const finalText = decoder.decode();
    if (finalText) buffer += finalText;
    if (buffer.trim().startsWith("data:")) {
      const payload = buffer.trim().slice(5).trim();
      if (payload && payload !== "[DONE]") {
        try {
          const event = JSON.parse(payload);
          const piece = event && event.choices && event.choices[0] &&
            event.choices[0].delta && event.choices[0].delta.content;
          if (typeof piece === "string" && piece) {
            answer += piece;
            res.write(piece);
          }
        } catch {
          // Ignore an incomplete final event.
        }
      }
    }

    if (!answer.trim()) {
      res.write("I couldn't generate a reply just now. Please try again.");
    }
    return res.end();
  } catch {
    return json(res, 502, {
      ok: false,
      code: "AI_CONNECTION_FAILED",
      message: "The AI connection is temporarily unavailable."
    });
  }
};
