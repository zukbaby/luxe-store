/**
 * DAMA AI API scaffold.
 *
 * This endpoint deliberately does not call an AI provider until server-side
 * credentials, rate limits, authentication, and data-access rules are configured.
 */
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
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

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(503).json({
    error: "DAMA is not configured yet.",
    code: "ASSISTANT_NOT_CONFIGURED"
  });
}
