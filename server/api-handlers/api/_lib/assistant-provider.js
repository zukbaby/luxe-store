const { randomUUID } = require("node:crypto");

// Keep this allowlist narrow: a Cloudflare model ID alone does not prove it
// is available on the Workers Free plan. Re-check Cloudflare pricing before
// changing this list.
const FREE_MODELS = new Set(["@cf/zai-org/glm-4.7-flash"]);

function getProviderConfig() {
  const endpoint = process.env.LUXE_AI_PROVIDER_URL;
  const model = process.env.LUXE_AI_PROVIDER_MODEL;
  const apiKey = process.env.LUXE_AI_PROVIDER_API_KEY;
  if (process.env.LUXE_AI_FREE_ONLY !== "true" || !endpoint || !model || !apiKey) return null;

  let parsed;
  try { parsed = new URL(endpoint); } catch { return null; }

  // Only the Cloudflare direct chat-completions endpoint is accepted.
  const cloudflarePath = /^\/client\/v4\/accounts\/[a-f0-9]{32}\/ai\/v1\/chat\/completions$/i;
  if (parsed.protocol !== "https:" || parsed.hostname !== "api.cloudflare.com" ||
      parsed.username || parsed.password || parsed.search || parsed.hash ||
      !cloudflarePath.test(parsed.pathname) || !FREE_MODELS.has(model)) return null;

  return { endpoint: parsed.toString(), model, apiKey };
}

async function requestAssistantCompletion(messages, options = {}) {
  const config = getProviderConfig();
  if (!config) return { ok: false, code: "AI_PROVIDER_NOT_CONFIGURED" };
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: options.maxTokens || 450,
        stream: false
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      const requestId = randomUUID();
      console.error("LUXE Workers AI request returned an error", { requestId, status: response.status });
      return { ok: false, code: "AI_PROVIDER_UNAVAILABLE", requestId };
    }
    const result = await response.json();
    const answer = result && result.choices && result.choices[0] &&
      result.choices[0].message && result.choices[0].message.content;
    if (typeof answer !== "string" || !answer.trim()) return { ok: false, code: "EMPTY_AI_RESPONSE" };
    return { ok: true, answer: answer.trim() };
  } catch {
    const requestId = randomUUID();
    console.error("LUXE Workers AI request failed", { requestId });
    return { ok: false, code: "AI_PROVIDER_UNAVAILABLE", requestId };
  }
}

module.exports = { getProviderConfig, requestAssistantCompletion };
