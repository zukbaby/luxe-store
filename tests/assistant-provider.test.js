const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getProviderConfig,
  requestAssistantCompletion
} = require("../server/api-handlers/api/_lib/assistant-provider");

const keys = [
  "LUXE_AI_FREE_ONLY",
  "LUXE_AI_PROVIDER_URL",
  "LUXE_AI_PROVIDER_MODEL",
  "LUXE_AI_PROVIDER_API_KEY"
];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

function setConfig(overrides = {}) {
  const values = {
    LUXE_AI_FREE_ONLY: "true",
    LUXE_AI_PROVIDER_URL: "https://api.cloudflare.com/client/v4/accounts/00000000000000000000000000000000/ai/v1/chat/completions",
    LUXE_AI_PROVIDER_MODEL: "@cf/zai-org/glm-4.7-flash",
    LUXE_AI_PROVIDER_API_KEY: "test-only-not-a-real-secret",
    ...overrides
  };
  for (const key of keys) process.env[key] = values[key];
}

test.afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test("provider stays disabled unless free-only is explicitly enabled", () => {
  setConfig({ LUXE_AI_FREE_ONLY: "false" });
  assert.equal(getProviderConfig(), null);
});

test("provider stays disabled when any required setting is missing", () => {
  setConfig({ LUXE_AI_PROVIDER_API_KEY: "" });
  assert.equal(getProviderConfig(), null);
});

test("accepts only the Cloudflare account chat-completions endpoint and allowed model", () => {
  setConfig();
  const config = getProviderConfig();
  assert.ok(config);
  assert.equal(new URL(config.endpoint).hostname, "api.cloudflare.com");
  assert.ok(new URL(config.endpoint).pathname.endsWith("/ai/v1/chat/completions"));
  assert.equal(config.model, "@cf/zai-org/glm-4.7-flash");
});

test("rejects third-party endpoints and unsupported Cloudflare paths", () => {
  setConfig({ LUXE_AI_PROVIDER_URL: "https://api.openai.com/v1/chat/completions" });
  assert.equal(getProviderConfig(), null);

  setConfig({ LUXE_AI_PROVIDER_URL: "https://api.cloudflare.com/client/v4/accounts/00000000000000000000000000000000/ai/run/@cf/zai-org/glm-4.7-flash" });
  assert.equal(getProviderConfig(), null);
});

test("rejects models outside the explicit free-model allowlist", () => {
  setConfig({ LUXE_AI_PROVIDER_MODEL: "@cf/moonshotai/kimi-k2.7-code" });
  assert.equal(getProviderConfig(), null);
  setConfig({ LUXE_AI_PROVIDER_MODEL: "gpt-4o" });
  assert.equal(getProviderConfig(), null);
});

test("rejects malformed or oversized message payloads before making a request", async () => {
  setConfig();
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; throw new Error("fetch should not run"); };
  try {
    const badRole = await requestAssistantCompletion([{ role: "developer", content: "no" }]);
    const tooMany = await requestAssistantCompletion(
      Array.from({ length: 13 }, () => ({ role: "user", content: "hello" }))
    );
    const tooLarge = await requestAssistantCompletion([
      { role: "user", content: "x".repeat(45001) }
    ]);
    assert.equal(badRole.code, "INVALID_AI_REQUEST");
    assert.equal(tooMany.code, "INVALID_AI_REQUEST");
    assert.equal(tooLarge.code, "INVALID_AI_REQUEST");
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("caps completion output at 450 tokens", async () => {
  setConfig();
  const originalFetch = global.fetch;
  let sentBody;
  global.fetch = async (_url, options) => {
    sentBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: " test reply " } }] })
    };
  };
  try {
    const result = await requestAssistantCompletion(
      [{ role: "user", content: "hello" }],
      { maxTokens: 99999 }
    );
    assert.equal(result.ok, true);
    assert.equal(result.answer, "test reply");
    assert.equal(sentBody.max_tokens, 450);
    assert.equal(sentBody.stream, false);
  } finally {
    global.fetch = originalFetch;
  }
});
