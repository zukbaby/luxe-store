const unavailable = require("./_lib/unavailable");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const assistantName = req.query && req.query.assistant;
  const mode = req.query && req.query.mode;

  if (mode === "status" && (assistantName === "dama" || assistantName === "vicky")) {
    if (req.method === "GET") {
      if (assistantName === "dama") {
        return res.status(200).json({
          assistant: "DAMA",
          status: "scaffold",
          live: false,
          capabilities: {
            aiResponses: false,
            storeDataAccess: false,
            customerActions: false
          },
          message: "DAMA is not connected to an AI provider yet."
        });
      }
      return res.status(200).json({
        assistant: "Vicky",
        status: "scaffold",
        live: false,
        capabilities: {
          submissionReview: false,
          identityDocumentAccess: false,
          verificationDecisions: false
        },
        policy: "Vicky may assist with review after secure setup; authorized admins retain final approval."
      });
    }
    if (req.method === "POST") {
      return res.status(503).json({
        error: assistantName === "dama" ? "DAMA is not configured yet." : "Vicky is not configured yet.",
        code: "ASSISTANT_NOT_CONFIGURED"
      });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (mode === "ai" && assistantName === "dama") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
    }
    return unavailable(res, "dama_assistant", ["POST"]);
  }

  if (mode === "review" && assistantName === "vicky") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
    }
    return unavailable(res, "vicky_review_assistance", ["POST"]);
  }

  return res.status(404).json({ ok: false, code: "NOT_FOUND" });
};
