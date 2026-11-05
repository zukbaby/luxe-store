// Single Vercel function dispatching the existing /api/* endpoints.
// Handlers live outside /api so Vercel bundles them into this function instead
// of counting each handler as a separate Serverless Function.

const handlers = {
  "health": require("../server/api-handlers/api/health"),
  "auth/config": require("../server/api-handlers/api/auth/config"),
  "me": require("../server/api-handlers/api/me"),
  "seller/applications": require("../server/api-handlers/api/seller/applications"),
  "admin/seller-applications": require("../server/api-handlers/api/admin/seller-applications"),
  "admin/commands": require("../server/api-handlers/api/admin/commands"),
  "admin/badges": require("../server/api-handlers/api/admin/badges"),
  "admin/vicky-plans": require("../server/api-handlers/api/admin/vicky-plans"),
  "admin/audit": require("../server/api-handlers/api/admin/audit"),
  "admin/users": require("../server/api-handlers/api/admin/users"),
  "admin/verification-requests": require("../server/api-handlers/api/admin/verification-requests"),
  "admin/verification-decisions": require("../server/api-handlers/api/admin/verification-decisions"),
  "notifications": require("../server/api-handlers/api/notifications"),
  "products": require("../server/api-handlers/api/products"),
  "cart": require("../server/api-handlers/api/cart"),
  "seller/products": require("../server/api-handlers/api/seller/products"),
  "admin/products": require("../server/api-handlers/api/admin/products"),
  "ai/dama": require("../server/api-handlers/api/ai/dama"),
  "admin/reviews": require("../server/api-handlers/api/admin/reviews")
};

const dynamicHandlers = [
  {
    match: (parts) => parts.length === 2 && parts[0] === "notifications",
    load: () => require("../server/api-handlers/api/notifications/[id]"),
    param: "id"
  },
  {
    match: (parts) => parts.length === 3 && parts[0] === "products" && parts[2] === "reviews",
    load: () => require("../server/api-handlers/api/products/[id]/reviews"),
    param: "id",
    index: 1
  },
  {
    match: (parts) => parts.length === 2 && parts[0] === "products",
    load: () => require("../server/api-handlers/api/products/[id]"),
    param: "id"
  },
  {
    match: (parts) => parts.length === 2 && parts[0] === "sellers",
    load: () => require("../server/api-handlers/api/sellers/[slug]"),
    param: "slug"
  },
  {
    match: (parts) => parts.length === 4 && parts[0] === "seller" && parts[1] === "products" && parts[3] === "submit",
    load: () => require("../server/api-handlers/api/seller/products/[id]/submit"),
    param: "id",
    index: 2
  },
  {
    match: (parts) => parts.length === 3 && parts[0] === "seller" && parts[1] === "products",
    load: () => require("../server/api-handlers/api/seller/products/[id]"),
    param: "id",
    index: 2
  }
];

module.exports = async function handler(req, res) {
  const rawPath = req.query && req.query.path;
  const parts = (Array.isArray(rawPath) ? rawPath : typeof rawPath === "string" ? rawPath.split("/") : [])
    .filter((part) => typeof part === "string" && part.length > 0);
  const route = parts.join("/");

  let selected = handlers[route];
  if (!selected) {
    for (const candidate of dynamicHandlers) {
      if (candidate.match(parts)) {
        const value = parts[candidate.index === undefined ? parts.length - 1 : candidate.index];
        if (!value || value === "." || value === ".." || value.includes("/")) {
          return res.status(400).json({ ok: false, code: "INVALID_ROUTE_PARAMETER" });
        }
        req.query = { ...req.query, [candidate.param]: value };
        selected = candidate.load();
        break;
      }
    }
  }

  if (!selected) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({ ok: false, code: "NOT_FOUND" });
  }

  return selected(req, res);
};
