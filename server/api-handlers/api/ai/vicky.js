const { authenticate } = require("../_lib/auth");
const { query } = require("../_lib/database");
const { getProviderConfig, requestAssistantCompletion } = require("../_lib/assistant-provider");

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const session = await authenticate(req);
  if (!session.ok) return send(res, session.status, { ok: false, code: session.code, message: session.message });

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 1 || typeof body.message !== "string" ||
      body.message.trim().length < 1 || body.message.trim().length > 1000) {
    return send(res, 422, { ok: false, code: "INVALID_MESSAGE" });
  }

  if (!getProviderConfig()) {
    return send(res, 503, {
      ok: false,
      code: "VICKY_NOT_CONFIGURED",
      message: "Vicky AI's shared free-only provider has not been configured yet."
    });
  }

  try {
    const limits = await query(
      `insert into public.assistant_usage(user_id,window_started_at,request_count)
       values($1,date_trunc('minute',now()),1)
       on conflict(user_id) do update set
         request_count=case when public.assistant_usage.window_started_at < date_trunc('minute',now())
           then 1 else public.assistant_usage.request_count+1 end,
         window_started_at=date_trunc('minute',now())
       where public.assistant_usage.window_started_at < date_trunc('minute',now())
          or public.assistant_usage.request_count < 12
       returning request_count`,
      [session.userId]
    );
    if (!limits || !limits.length) {
      return send(res, 429, { ok: false, code: "RATE_LIMITED", message: "Please wait a minute before sending another message." });
    }

    const system = [
      "You are Vicky AI, the personal assistant for LUXE STORE users.",
      "You are separate from DAMA. DAMA handles marketplace shopping and platform guidance; you provide general personal assistance.",
      "Be friendly, clear, respectful, and age-appropriate. Help with learning, writing, brainstorming, planning, and everyday questions.",
      "Do not claim access to a user's account, private messages, purchases, payment records, or personal files.",
      "Never request passwords, OTPs, payment card details, identity documents, precise location, or other sensitive secrets.",
      "Do not provide medical, legal, or financial decisions; offer general information and encourage a trusted adult or qualified professional for important matters.",
      "Do not help with dangerous, illegal, exploitative, or age-restricted activities.",
      "Do not claim to have completed actions outside this chat. Keep answers concise."
    ].join("\n");

    const completion = await requestAssistantCompletion([
      { role: "system", content: system },
      { role: "user", content: body.message.trim() }
    ], { maxTokens: 450 });

    if (!completion.ok) {
      return send(res, 502, { ok: false, code: completion.code, requestId: completion.requestId });
    }
    return send(res, 200, { ok: true, answer: completion.answer });
  } catch (error) {
    if (error && error.code === "DATABASE_NOT_CONFIGURED") {
      return send(res, 503, { ok: false, code: "DATABASE_NOT_CONFIGURED" });
    }
    return send(res, 500, { ok: false, code: "INTERNAL_ERROR" });
  }
};
