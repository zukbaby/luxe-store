/**
 * Vicky AI verification API scaffold.
 *
 * Vicky must never approve, reject, or grant a verification badge by itself.
 * Final decisions belong to authenticated, authorized administrators.
 */
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
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

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(503).json({
    error: "Vicky is not configured yet.",
    code: "ASSISTANT_NOT_CONFIGURED"
  });
}
