(function (global) {
  const ns = "http://www.w3.org/2000/svg";
  const tiers = {
    blue: { label: "LUXE Founder / Official badge", className: "blue" },
    green: { label: "LUXE Verified member", className: "green" },
    gold: { label: "LUXE VIP member", className: "gold" }
  };

  function create(tier) {
    const config = tiers[tier];
    if (!config) return null;
    const badge = document.createElement("span");
    badge.className = "luxe-verified-badge luxe-verified-badge--" + config.className;
    badge.setAttribute("role", "img");
    badge.setAttribute("aria-label", config.label);
    badge.title = config.label;

    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS(ns, "path");
    shape.setAttribute("d", "M50 4 63 11 78 10 85 24 97 34 93 50 97 66 85 76 78 90 63 89 50 96 37 89 22 90 15 76 3 66 7 50 3 34 15 24 22 10 37 11Z");
    shape.setAttribute("fill", "currentColor");
    const check = document.createElementNS(ns, "path");
    check.setAttribute("d", "m29 51 14 14 29-31");
    check.setAttribute("fill", "none");
    check.setAttribute("stroke", "#fff");
    check.setAttribute("stroke-width", "8");
    check.setAttribute("stroke-linecap", "round");
    check.setAttribute("stroke-linejoin", "round");
    svg.append(shape, check);
    badge.appendChild(svg);
    return badge;
  }

  function setName(element, name, tier) {
    if (!element) return;
    element.textContent = name || "LUXE Member";
    const badge = create(tier);
    if (badge) element.appendChild(badge);
  }

  global.LUXE_BADGES = Object.freeze({ create, setName });
})(window);
