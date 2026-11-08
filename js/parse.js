// Parcel Quest — tracking-number parsing and import helpers.
// Pure functions (no DOM) so they can be unit-tested in Node: `node tests/parse.test.js`.
(function (root) {
  "use strict";

  var M = root.ParcelModel || (typeof require === "function" ? require("./model.js") : null);
  var CATEGORIES = ["Beauty Care", "Health Care", "Fashion Acc", "Elec. Appl.", "Garment",
                    "Kitchen", "Home", "Printed", "Others"];
  var STATUSES = ["Pending", "Scheduled", "Delivered", "Refunded", "Cancelled", "Consolidated"];
  var PLATFORMS = ["Shopee", "TikTok", "Lazada", "Shopee Direct", "Temu"];

  var ELLIPSIS = /(…|\.{2,})\s*$/;

  // Token finder for free text. Shopee tokens are grabbed loosely (letters/digits) and
  // then cleaned by normalizeTracking(). (?<![A-Z0-9]) stops matches inside longer words.
  var TOKEN_RE = /(?<![A-Z0-9])(?:SPXMY\d+|MY\d+[A-Z0-9]*|680\d{12}|64\d{10}|LAZ[A-Z0-9]{8,}|NLMY[A-Z0-9]{6,})(?![A-Z0-9])/g;

  /**
   * Clean one raw tracking string.
   * Shopee SPX rules:
   *   - starts with SPXMY  -> already the full tracking; keep it all.
   *   - starts with MY     -> tracking is MY + digits + optional single trailing letter;
   *                           anything from "SPX" onwards (e.g. SPXLM102…) is a courier
   *                           label and is cut off.
   * Returns { tracking, platform, complete, cut } or null for empty input.
   *   complete=false means the string looks truncated (ends in "…") and was not cut at
   *   a known SPX boundary, so the user should paste the full number.
   */
  function normalizeTracking(raw) {
    if (raw == null) return null;
    var s = String(raw).replace(/\s+/g, "").toUpperCase();
    if (!s) return null;
    var truncated = ELLIPSIS.test(s);
    s = s.replace(ELLIPSIS, "");
    if (!s) return null;

    var m;
    if (/^SPXMY\d+$/.test(s)) {
      return { tracking: s, platform: "Shopee", complete: !truncated, cut: false };
    }
    if (/^MY\d/.test(s)) {
      var cut = false;
      var i = s.indexOf("SPX", 2);
      if (i > 0) { s = s.slice(0, i); cut = true; }
      if ((m = /^(MY\d+[A-Z]?)/.exec(s))) {
        // Anything left after MY+digits+letter that isn't an SPX tail is junk.
        return { tracking: m[1], platform: "Shopee", complete: cut || !truncated, cut: cut };
      }
    }
    if (/^680\d{12}$/.test(s)) return { tracking: s, platform: "TikTok", complete: !truncated, cut: false };
    if (/^64\d{10}$/.test(s) || /^LAZ[A-Z0-9]+$/.test(s) || /^NLMY[A-Z0-9]+$/.test(s)) {
      return { tracking: s, platform: "Lazada", complete: !truncated, cut: false };
    }
    return { tracking: s, platform: null, complete: !truncated, cut: false };
  }

  /** Find every tracking number in pasted text. Order preserved, duplicates removed. */
  function extractTrackingNumbers(text) {
    var out = [], seen = {};
    var up = String(text || "").toUpperCase();
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(up))) {
      var n = normalizeTracking(m[0]);
      if (n && !seen[n.tracking]) { seen[n.tracking] = true; out.push(n); }
    }
    return out;
  }

  var CATEGORY_KEYWORDS = [
    ["Health Care", /coffee|kopi|collagen|vitamin|supplement|slimming|pill|capsule|herbal|minuman|drink|tea\b|probiotic|health|sachet/i],
    ["Beauty Care", /serum|cream|lotion|skin|facial|mask|spray|perfume|lipstick|cleanser|sunscreen|shampoo|beauty|niacinamide|salmon/i],
    ["Fashion Acc", /bag|watch|wallet|belt|scarf|tudung|jewel|ring|earring|necklace|glasses|hijab/i],
    ["Elec. Appl.", /charger|power ?bank|cable|usb|earbud|speaker|fan|blender|kettle|cooker|fryer|appliance|lamp|phone/i],
    ["Garment", /shirt|dress|baju|pants|skirt|jacket|blouse|garment|clothing|kurung/i],
    ["Kitchen", /pot|pan|knife|container|bottle|tumbler|shaker|kitchen/i],
    ["Home", /pillow|towel|curtain|bedsheet|mat\b|home|storage|organizer/i],
    ["Printed", /book|print|sticker|poster|label/i]
  ];
  function guessCategory(text) {
    for (var i = 0; i < CATEGORY_KEYWORDS.length; i++) {
      if (CATEGORY_KEYWORDS[i][1].test(text || "")) return CATEGORY_KEYWORDS[i][0];
    }
    return "Others";
  }

  function oneOf(v, list, dflt) {
    var s = String(v == null ? "" : v).trim().toLowerCase();
    for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === s) return list[i];
    return dflt;
  }
  function num(v, dflt) {
    var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : dflt;
  }

  /**
   * Turn a raw record (from the AI extractor or a paste) into an import draft.
   * `existing` is the current parcels array, used to flag duplicates by exact tracking number.
   */
  function makeDraft(rec, existing) {
    rec = rec || {};
    var t = normalizeTracking(rec.tracking != null ? rec.tracking : rec.tracking_raw);
    var platform = oneOf(rec.platform, PLATFORMS, t && t.platform) || (t && t.platform) || "Shopee";
    var item = String(rec.item || "").trim();
    var draft = {
      tracking: t ? t.tracking : "",
      platform: platform,
      item: item || "New Item",
      qty: Math.max(1, Math.round(num(rec.qty, 1))),
      price: Math.round(num(rec.price, 0) * 100) / 100,
      category: oneOf(rec.category, CATEGORIES, null) || guessCategory(item),
      status: oneOf(rec.status, STATUSES, "Pending"),
      "for": oneOf(rec["for"], M.FOR_OPTIONS, "Aisyah"),
      boughtBy: oneOf(rec.boughtBy, M.BOUGHT_OPTIONS, "San"),
      ordered: M.parseDateLoose(rec.order_date || rec.ordered),
      expected: M.parseDateLoose(rec.promise_date || rec.expected),
      delivered: M.parseDateLoose(rec.delivered_date || rec.delivered),
      arrived: "",
      reorderDays: Math.max(0, Math.round(num(rec.reorderDays, 0))),
      pickupCode: String(rec.pickupCode || "").trim(),
      nujCost: num(rec.nujCost, 0),
      remark: String(rec.remark || platform).trim(),
      warnings: [],
      dupOf: null
    };
    if (!t) draft.warnings.push("No tracking number found");
    else {
      if (!t.complete) draft.warnings.push("Tracking looks cut off — paste the full number");
      if (t.cut) draft.warnings.push("Trimmed courier suffix (SPX…)");
      var given = oneOf(rec.platform, PLATFORMS, null);
      // Shopee Direct parcels can carry Shopee/SPX-format numbers, so that pairing is not a mismatch.
      var compatible = given === t.platform || (t.platform === "Shopee" && given === "Shopee Direct");
      if (given && t.platform && !compatible) {
        draft.warnings.push("Platform changed to " + t.platform + " from tracking format");
        draft.platform = t.platform;
      }
    }
    if (!draft.price) draft.warnings.push("Price is 0 — check amount paid");
    if (existing && draft.tracking) {
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].tracking === draft.tracking) { draft.dupOf = existing[i].id; break; }
      }
    }
    return draft;
  }

  /** Full parcel object (matches the shape saved in localStorage). Optional fields only when set. */
  function toParcel(draft, id) {
    var p = {
      id: id, tracking: draft.tracking, platform: draft.platform,
      category: draft.category, item: draft.item, qty: draft.qty, price: draft.price,
      pickupCode: draft.pickupCode || "", nujCost: draft.nujCost || 0, status: draft.status,
      remark: draft.remark || draft.platform, "for": draft["for"], boughtBy: draft.boughtBy
    };
    ["ordered", "expected", "arrived", "delivered"].forEach(function (k) { if (draft[k]) p[k] = draft[k]; });
    if (draft.reorderDays > 0) p.reorderDays = draft.reorderDays;
    if (p.status === "Delivered" && !p.delivered && draft.ordered) { /* leave blank; never guess a delivery date */ }
    return p;
  }

  /** Find rows whose stored tracking has a stray SPX tail / ellipsis. Returns [{id, from, to}]. */
  function findTrackingFixes(parcels) {
    var fixes = [];
    (parcels || []).forEach(function (p) {
      if (!p.tracking || /^SPXMY/i.test(p.tracking)) return;
      var n = normalizeTracking(p.tracking);
      if (n && n.tracking !== p.tracking && p.platform === "Shopee") {
        fixes.push({ id: p.id, from: p.tracking, to: n.tracking });
      }
    });
    return fixes;
  }

  var api = {
    CATEGORIES: CATEGORIES, STATUSES: STATUSES, PLATFORMS: PLATFORMS,
    normalizeTracking: normalizeTracking, extractTrackingNumbers: extractTrackingNumbers,
    guessCategory: guessCategory, makeDraft: makeDraft,
    toParcel: toParcel, findTrackingFixes: findTrackingFixes
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ParcelParse = api;
})(typeof window !== "undefined" ? window : this);
