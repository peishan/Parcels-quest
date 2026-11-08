// Parcel Quest — parcel data model: allowed people, date helpers, and sanitising of saved data.
// Pure functions (no DOM) so they can be unit-tested in Node: `node tests/model.test.js`.
(function (root) {
  "use strict";

  var FOR_OPTIONS = ["San", "Aisyah", "Joel"];        // who the parcel is for
  var BOUGHT_OPTIONS = ["San", "KW Liang"];            // who purchased it
  var DATE_FIELDS = ["ordered", "expected", "arrived", "delivered"];

  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
                 oct: 10, nov: 11, dec: 12 };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function validYMD(y, m, d) {
    if (!(y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function ymd(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }

  /** Accepts 2026-11-07, 07-11-2026, 7/11/2026, "7 Nov 2026", "24 October 2026, 12:17". Returns ISO or "". */
  function parseDateLoose(v) {
    if (v == null) return "";
    var s = String(v).trim();
    if (!s) return "";
    var m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return validYMD(+m[1], +m[2], +m[3]) ? ymd(+m[1], +m[2], +m[3]) : "";
    if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/.exec(s))) return validYMD(+m[3], +m[2], +m[1]) ? ymd(+m[3], +m[2], +m[1]) : "";
    if ((m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(s))) {
      var mo = MONTHS[m[2].slice(0, 4).toLowerCase()] || MONTHS[m[2].slice(0, 3).toLowerCase()];
      return mo && validYMD(+m[3], mo, +m[1]) ? ymd(+m[3], mo, +m[1]) : "";
    }
    return "";
  }

  function toUTC(iso) { var p = iso.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function addDays(iso, n) {
    var d = new Date(toUTC(iso) + n * 86400000);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  /** Whole days from a to b (b - a). */
  function diffDays(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); }
  function todayISO(now) {
    var d = now || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /**
   * Clean one parcel in place for the current data model:
   *  - drops the old `receiver` name field
   *  - keeps `for` as-is (existing data), `boughtBy` only if a known buyer
   *  - dates must be valid ISO, `reorderDays` a positive whole number
   * Returns true if anything changed.
   */
  function sanitizeParcel(p) {
    var changed = false, k;
    if ("receiver" in p) { delete p.receiver; changed = true; }
    if (p.boughtBy != null && BOUGHT_OPTIONS.indexOf(p.boughtBy) < 0) {
      var norm = /liang|kwl|^kw$/i.test(String(p.boughtBy)) ? "KW Liang" : /^san$/i.test(String(p.boughtBy)) ? "San" : "";
      if (norm) p.boughtBy = norm; else delete p.boughtBy;
      changed = true;
    }
    for (var i = 0; i < DATE_FIELDS.length; i++) {
      k = DATE_FIELDS[i];
      if (p[k] == null) continue;
      if (p[k] === "") { delete p[k]; changed = true; continue; }
      var iso = parseDateLoose(p[k]);
      if (iso !== p[k]) { if (iso) p[k] = iso; else delete p[k]; changed = true; }
    }
    if (p.reorderDays != null) {
      var n = Math.round(Number(p.reorderDays));
      if (!(n > 0)) { delete p.reorderDays; changed = true; }
      else if (n !== p.reorderDays) { p.reorderDays = n; changed = true; }
    }
    return changed;
  }
  function sanitizeParcels(list) {
    var n = 0;
    (list || []).forEach(function (p) { if (sanitizeParcel(p)) n++; });
    return n;
  }

  var api = {
    FOR_OPTIONS: FOR_OPTIONS, BOUGHT_OPTIONS: BOUGHT_OPTIONS, DATE_FIELDS: DATE_FIELDS,
    parseDateLoose: parseDateLoose, addDays: addDays, diffDays: diffDays, todayISO: todayISO,
    sanitizeParcel: sanitizeParcel, sanitizeParcels: sanitizeParcels
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ParcelModel = api;
})(typeof window !== "undefined" ? window : this);
