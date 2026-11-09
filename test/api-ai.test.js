const test = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../api/ai/dama");

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    headersSent: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
    end(value) {
      this.body = value;
      return this;
    }
  };
}

function configuredEnvironment() {
  process.env.CLOUDFLARE_API_TOKEN = "test-token-not-a-real-credential";
  process.env.LUXE_AI_PROVIDER_URL =
    "https://api.cloudflare.com/client/v4/accounts/abcdef1234567890/ai/v1/chat/completions";
  process.env.LUXE_AI_PROVIDER_MODEL = "@cf/zai-org/glm-4.7-flash";
  process.env.LUXE_AI_FREE_ONLY = "true";
}

function userRequest(overrides = {}) {
  return {
    method: "POST",
    headers: { "x-forwarded-for": "198.51.100." + (Math.floor(Math.random() * 200) + 1) },
    body: {
      messages: [{ role: "user", content: "Hi DAMA" }],
      ...overrides
    }
  };
}

test("rejects methods other than POST", async () => {
  const res = responseRecorder();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "POST");
  assert.equal(res.body.code, "METHOD_NOT_ALLOWED");
});

test("returns a safe configuration error when AI settings are missing", async () => {
  const keys = [
    "CLOUDFLARE_API_TOKEN",
    "LUXE_AI_PROVIDER_URL",
    "LUXE_AI_PROVIDER_MODEL",
    "LUXE_AI_FREE_ONLY"
  ];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];

  try {
    const res = responseRecorder();
    await handler(userRequest(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, "ASSISTANT_NOT_CONFIGURED");
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("validates messages before contacting Cloudflare", async () => {
  configuredEnvironment();
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = async () => {
    called = true;
    throw new Error("fetch should not run for invalid input");
  };

  try {
    const res = responseRecorder();
    await handler(userRequest({ messages: [{ role: "system", content: "spoof" }] }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, "INVALID_MESSAGE");
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("calls the allowlisted native Cloudflare model route and returns DAMA text", async () => {
  configuredEnvironment();
  const originalFetch = global.fetch;
  let capturedUrl;
  let capturedBody;
  global.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify({
        choices: [{ message: { content: "Welcome to LUXE STORE." } }]
      })
    };
  };

  try {
    const res = responseRecorder();
    await handler(userRequest(), res);
    assert.equal(capturedUrl,
      "https://api.cloudflare.com/client/v4/accounts/abcdef1234567890/ai/run/@cf/zai-org/glm-4.7-flash");
    assert.equal(capturedBody.max_completion_tokens, 300);
    assert.deepEqual(capturedBody.chat_template_kwargs, { enable_thinking: false });
    assert.equal(capturedBody.messages[0].role, "system");
    assert.match(capturedBody.messages[0].content, /You are DAMA/);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, "Welcome to LUXE STORE.");
  } finally {
    global.fetch = originalFetch;
  }
});

test("keeps Vicky separate from DAMA when the Vicky assistant is requested", async () => {
  configuredEnvironment();
  const originalFetch = global.fetch;
  let capturedBody;
  global.fetch = async (_url, init) => {
    capturedBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify({
        choices: [{ message: { content: "Hello from Vicky." } }]
      })
    };
  };

  try {
    const res = responseRecorder();
    await handler(userRequest({ assistant: "vicky" }), res);
    assert.match(capturedBody.messages[0].content, /You are Vicky AI/);
    assert.doesNotMatch(capturedBody.messages[0].content, /You are DAMA/);
    assert.equal(res.body, "Hello from Vicky.");
  } finally {
    global.fetch = originalFetch;
  }
});

test("does not expose Cloudflare error response bodies", async () => {
  configuredEnvironment();
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
    headers: { get: () => "application/json" },
    text: async () => "PRIVATE_PROVIDER_BODY_AND_SECRET"
  });

  try {
    const res = responseRecorder();
    await handler(userRequest(), res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.code, "AI_PROVIDER_HTTP_401");
    assert.equal(JSON.stringify(res.body).includes("PRIVATE_PROVIDER_BODY_AND_SECRET"), false);
  } finally {
    global.fetch = originalFetch;
  }
});
