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
  // Use Cloudflare's native Workers AI REST route. The configured URL is
  // retained as the trusted source of the account ID, while the model remains
  // restricted by the allowlist above.
  const accountMatch = target.pathname.match(/^\/client\/v4\/accounts\/([a-f0-9]+)\/ai\/v1\/chat\/completions\/?$/i);
  if (!accountMatch) {
    return json(res, 503, { ok: false, code: "PROVIDER_NOT_CONFIGURED" });
  }
  const nativeEndpoint = new URL(
    "/client/v4/accounts/" + accountMatch[1] + "/ai/run/" + encodeURIComponent(model),
    target.origin
  );

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
    const response = await fetch(nativeEndpoint.toString(), {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [system, ...messages],
        max_tokens: 300,
        temperature: 0.4
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

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream") && response.body && response.body.getReader) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let started = false;
      let answerLength = 0;

      function extractStreamText(event) {
        const choice = event && event.choices && event.choices[0];
        const candidate = (choice && choice.delta && choice.delta.content) ||
          (choice && choice.message && choice.message.content) ||
          (choice && choice.text) ||
          (event && event.result && event.result.response) ||
          (event && event.response) || "";
        if (typeof candidate === "string") return candidate;
        if (Array.isArray(candidate)) {
          return candidate.map(part => part && typeof part.text === "string" ? part.text : "").join("");
        }
        return "";
      }

      function writeStreamText(piece) {
        if (!piece) return;
        if (!started) {
          res.setHeader("Cache-Control", "no-store, no-transform");
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("X-Accel-Buffering", "no");
          res.status(200);
          if (typeof res.flushHeaders === "function") res.flushHeaders();
          started = true;
        }
        answerLength += piece.length;
        res.write(piece);
      }

      function processSseLine(line) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) return;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") return;
        try {
          writeStreamText(extractStreamText(JSON.parse(data)));
        } catch {
          // Ignore malformed keepalive or metadata events.
        }
      }

      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true });
          let newline;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            processSseLine(buffer.slice(0, newline).replace(/\r$/, ""));
            buffer = buffer.slice(newline + 1);
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) processSseLine(buffer);
      } catch (streamError) {
        if (!started) throw streamError;
        // Once text has reached the browser, end the partial reply cleanly.
        return res.end();
      }

      if (!answerLength) {
        return json(res, 502, {
          ok: false,
          code: "EMPTY_AI_RESPONSE",
          message: "The AI provider returned no readable reply. Please try again shortly."
        });
      }
      return res.end();
    }

    // Compatibility fallback for providers that return a complete JSON response.
    const raw = await response.text();
    let answer = "";
    let shape = {};
    try {
      const inspected = JSON.parse(raw);
      const firstChoice = Array.isArray(inspected && inspected.choices) ? inspected.choices[0] : null;
      shape = {
        topLevelKeys: Object.keys(inspected || {}),
        resultKeys: Object.keys((inspected && inspected.result) || {}),
        choicesCount: Array.isArray(inspected && inspected.choices) ? inspected.choices.length : 0,
        firstChoiceKeys: Object.keys(firstChoice || {}),
        messageContentType: typeof (firstChoice && firstChoice.message && firstChoice.message.content),
        resultResponseType: typeof (inspected && inspected.result && inspected.result.response),
        responseType: typeof (inspected && inspected.response),
        outputTextType: typeof (inspected && inspected.output_text)
      };
    } catch {
      shape = { parseableJson: false };
    }
    console.info("[luxe-ai] provider response shape", JSON.stringify({
      contentType,
      bodyLength: raw.length,
      ...shape
    }));
    if (raw.trim()) {
      try {
        const payload = JSON.parse(raw);
        const choice = payload && payload.choices && payload.choices[0];
        const candidate = (choice && choice.message && choice.message.content) ||
          (payload && payload.result && payload.result.response) ||
          (payload && payload.response) ||
          (payload && payload.output_text) ||
          (choice && choice.text) || "";
        if (typeof candidate === "string") answer = candidate;
        else if (Array.isArray(candidate)) {
          answer = candidate.map(part => part && typeof part.text === "string" ? part.text : "").join("");
        }
      } catch {
        if (!raw.trimStart().startsWith("data:")) answer = raw;
        else {
          for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const event = JSON.parse(data);
              const choice = event && event.choices && event.choices[0];
              const piece = (choice && choice.delta && choice.delta.content) ||
                (choice && choice.message && choice.message.content) || "";
              if (typeof piece === "string") answer += piece;
            } catch {
              // Ignore malformed keepalive or metadata events.
            }
          }
        }
      }
    }

    if (!answer.trim()) {
      return json(res, 502, {
        ok: false,
        code: "EMPTY_AI_RESPONSE",
        message: "The AI provider returned no readable reply. Please try again shortly."
      });
    }

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(answer.trim());
  } catch {
    return json(res, 502, {
      ok: false,
      code: "AI_CONNECTION_FAILED",
      message: "The AI connection is temporarily unavailable."
    });
  }
};
