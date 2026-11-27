// Parcel Quest — reminders, sale radar, weekly review/streak and calendar (.ics) export.
// Pure functions (no DOM, no storage): dates are ISO "YYYY-MM-DD" strings, `today` is always passed in.
// Unit-tested in Node: `node tests/reminders.test.js`.
(function (root) {
  "use strict";
  var M = root.ParcelModel || (typeof require === "function" ? require("./model.js") : null);

  var DEFAULTS = { holdDays: 7, stuckDays: 14, reorderLeadDays: 5, promiseLeadDays: 3, pickupLeadDays: 3,
                   weeklyCap: 0, saleLeadDays: 7 };
  var ACTIVE = { Pending: 1, Scheduled: 1 };
  var CLOSED = { Delivered: 1, Cancelled: 1, Refunded: 1, Consolidated: 1 };
  var SEV = { high: 0, med: 1, low: 2 };

  function settingsWith(s) {
    var out = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    if (s) for (k in DEFAULTS) if (s[k] != null && isFinite(Number(s[k])) && Number(s[k]) >= 0) out[k] = Number(s[k]);
    return out;
  }
  function shortItem(p) {
    var s = String(p.item || "Parcel").replace(/\s+/g, " ").trim();
    return s.length > 46 ? s.slice(0, 44) + "\u2026" : s;
  }
  function fmtDay(iso) {
    var p = iso.split("-"), mn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return +p[2] + " " + mn[+p[1] - 1];
  }
  function rel(days) {
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days === -1) return "yesterday";
    return days > 0 ? "in " + days + " days" : Math.abs(days) + " days ago";
  }

  // ------------------------------------------------------------------ weeks & streak
  /** Monday of the week containing `iso` — used as the week's key. */
  function weekStart(iso) {
    var dow = new Date(Date.UTC.apply(null, [+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)])).getUTCDay();
    return M.addDays(iso, -((dow + 6) % 7));
  }
  function streak(activityWeeks, today) {
    var set = {}, keys = (activityWeeks || []).slice().sort();
    keys.forEach(function (k) { set[k] = true; });
    var w = weekStart(today);
    // The current week still counts as "in progress": the streak only breaks once a full week passes empty.
    if (!set[w]) w = M.addDays(w, -7);
    var current = 0;
    while (set[w]) { current++; w = M.addDays(w, -7); }
    var best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      run = prev && M.diffDays(prev, k) === 7 ? run + 1 : 1;
      if (run > best) best = run;
      prev = k;
    });
    return { current: current, best: best, thisWeekDone: !!set[weekStart(today)] };
  }

  // ------------------------------------------------------------------ reminders
  /**
   * Reminders derived from parcel dates. Each has a stable `key` (type + parcel + due date) so a dismissal
   * sticks until the underlying date changes.
   */
  function buildReminders(parcels, today, settings) {
    var s = settingsWith(settings), out = [];
    (parcels || []).forEach(function (p) {
      var active = !!ACTIVE[p.status];

      // 1) Estimated delivery (from the order page). `expected` = earliest, `expectedEnd` = latest (optional).
      if (active && p.expected) {
        var from = p.expected, to = p.expectedEnd || p.expected;
        var dFrom = M.diffDays(today, from), dTo = M.diffDays(today, to);
        var win = from === to ? fmtDay(to) : fmtDay(from) + "\u2013" + fmtDay(to);
        if (dTo < 0) out.push(mk("promise", p, to, dTo, "high", "\uD83D\uDCE3",
          "Overdue " + (-dTo) + " day" + (dTo === -1 ? "" : "s") + " \u2014 " + shortItem(p),
          "Estimated " + win + ". Check with the seller or courier, and claim the on-time voucher if one was offered.", "late"));
        else if (dTo <= s.promiseLeadDays) out.push(mk("promise", p, to, dTo, "med", "\uD83D\uDCC5",
          (dTo === 0 ? "Due today" : "Due " + rel(dTo)) + " \u2014 " + shortItem(p),
          "Estimated " + win + (from !== to && dFrom > 0 ? " (window opens " + rel(dFrom) + ")" : "") + ".", "due"));
        else if (dFrom <= s.promiseLeadDays) out.push(mk("promise", p, to, dTo, "low", "\uD83D\uDCE6",
          (dFrom > 0 ? "Arriving from " + rel(dFrom) : "Arriving by " + fmtDay(to)) + " \u2014 " + shortItem(p),
          "Estimated " + win + ".", "soon"));
      }

      // 2) Pickup deadline = arrived at branch + hold days (still not collected)
      if (!CLOSED[p.status] && p.arrived) {
        var due = M.addDays(p.arrived, s.holdDays), dl = M.diffDays(today, due);
        if (dl <= s.pickupLeadDays) out.push(mk("pickup", p, due, dl, dl < 0 ? "high" : "med", "\uD83D\uDD11",
          (dl < 0 ? "Pickup overdue \u2014 " : "Collect " + rel(dl) + " \u2014 ") + shortItem(p),
          "Arrived " + fmtDay(p.arrived) + (p.pickupCode ? " \u00b7 code " + p.pickupCode : "") + ". Collect by " + fmtDay(due) +
          (dl < 0 ? " \u2014 it may be returned to the seller." : ".")));
      }

      // 3) Stuck: still Pending/Scheduled long after ordering, with no arrival and no estimate (estimates have their own reminder)
      if (active && p.ordered && !p.arrived) {
        var age = M.diffDays(p.ordered, today);
        // An estimated date (live or already missed) has its own reminder, so don't double up with "stuck".
        if (age > s.stuckDays && !p.expected) out.push(mk("stuck", p, M.addDays(p.ordered, s.stuckDays), -(age - s.stuckDays), "med", "\uD83D\uDC0C",
          "Stuck " + age + " days \u2014 " + shortItem(p),
          "Ordered " + fmtDay(p.ordered) + " and still " + p.status + ". Check the tracking page or ask the seller."));
      }

      // 4) Reorder nudge for consumables
      if (p.status === "Delivered" && p.reorderDays > 0) {
        var base = p.delivered || p.ordered;
        if (base) {
          var rd = M.addDays(base, p.reorderDays), rl = M.diffDays(today, rd);
          if (rl <= s.reorderLeadDays) out.push(mk("reorder", p, rd, rl, rl < 0 ? "med" : "low", "\uD83D\uDD01",
            (rl < 0 ? "Reorder overdue by " + (-rl) + " day" + (rl === -1 ? "" : "s") : "Reorder " + rel(rl)) + " \u2014 " + shortItem(p),
            "Lasts about " + p.reorderDays + " days from " + fmtDay(base) + " \u2192 runs out around " + fmtDay(rd) + "."));
        }
      }
    });

    // 5) Upcoming sales close enough to plan for
    saleCalendar(today, 6).forEach(function (sale) {
      if (sale.daysLeft <= s.saleLeadDays) out.push({
        key: "sale:" + sale.date, type: "sale", parcelId: null, due: sale.date, daysLeft: sale.daysLeft,
        severity: "low", icon: "\uD83D\uDECD\uFE0F", title: sale.name + " " + rel(sale.daysLeft),
        detail: "Set a spend cap and decide what is worth waiting for."
      });
    });

    // 6) Data-quality nudge: active parcels with no estimated delivery date can never remind you
    var noEta = (parcels || []).filter(function (p) { return ACTIVE[p.status] && !p.expected; }).length;
    if (noEta) out.push({
      key: "noeta:" + noEta, type: "noeta", parcelId: null, due: today, daysLeft: 0, severity: "low", icon: "\uD83D\uDDD3\uFE0F",
      title: noEta + " pending/scheduled parcel" + (noEta === 1 ? " has" : "s have") + " no estimated delivery date",
      detail: "Add the estimate from the order page (edit a parcel, or import its screenshot) so you get reminders."
    });

    out.sort(function (a, b) { return SEV[a.severity] - SEV[b.severity] || a.daysLeft - b.daysLeft; });
    return out;

    function mk(type, p, dueISO, daysLeft, sev, icon, title, detail, state) {
      return { key: type + ":" + p.id + ":" + dueISO + (state ? ":" + state : ""), type: type, parcelId: p.id, due: dueISO, daysLeft: daysLeft,
               severity: sev, icon: icon, title: title, detail: detail };
    }
  }

  /** Hide reminders the user marked done, or snoozed to a later date. meta.dismissed[key] = "done" | "YYYY-MM-DD". */
  function applyMeta(list, meta, today) {
    var dm = (meta && meta.dismissed) || {};
    return list.filter(function (r) {
      var v = dm[r.key];
      if (!v) return true;
      if (v === "done") return false;
      return M.diffDays(today, v) <= 0; // snooze expired
    });
  }

  // ------------------------------------------------------------------ sales
  /** Typical Malaysian platform sale days: M.M double days plus a payday sale on the 25th. */
  function saleCalendar(today, count) {
    var y = +today.slice(0, 4), list = [], yr, mo, date;
    for (yr = y; yr <= y + 1; yr++) {
      for (mo = 1; mo <= 12; mo++) {
        date = yr + "-" + (mo < 10 ? "0" : "") + mo + "-" + (mo < 10 ? "0" : "") + mo;
        list.push({ date: date, name: mo + "." + mo + " Sale", mega: mo >= 9 });
        date = yr + "-" + (mo < 10 ? "0" : "") + mo + "-25";
        list.push({ date: date, name: "Payday Sale (25th)", mega: false });
      }
    }
    return list.filter(function (s) { return s.date >= today; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
      .slice(0, count || 5)
      .map(function (s) { s.daysLeft = M.diffDays(today, s.date); return s; });
  }
  /** Spend on orders placed on the sale day or the day after. */
  function saleSpend(parcels, date) {
    var end = M.addDays(date, 1), n = 0, total = 0;
    (parcels || []).forEach(function (p) {
      if (p.ordered && p.ordered >= date && p.ordered <= end && p.status !== "Cancelled" && p.status !== "Refunded") { n++; total += +p.price || 0; }
    });
    return { count: n, total: Math.round(total * 100) / 100 };
  }

  // ------------------------------------------------------------------ weekly review
  function weeklyReview(parcels, today, settings) {
    var s = settingsWith(settings), start = weekStart(today), end = M.addDays(start, 6);
    function inWeek(d) { return d && d >= start && d <= end; }
    var ordered = 0, spend = 0, landed = 0, undated = 0;
    (parcels || []).forEach(function (p) {
      if (inWeek(p.ordered) && p.status !== "Cancelled" && p.status !== "Refunded") { ordered++; spend += +p.price || 0; }
      if (inWeek(p.delivered) && p.status === "Delivered") landed++;
      if (ACTIVE[p.status] && !p.expected) undated++;
    });
    spend = Math.round(spend * 100) / 100;
    var stuck = buildReminders(parcels, today, settings).filter(function (r) { return r.type === "stuck"; }).length;
    return { start: start, end: end, ordered: ordered, landed: landed, spend: spend, cap: s.weeklyCap,
             overCap: s.weeklyCap > 0 && spend > s.weeklyCap, stuck: stuck, undated: undated };
  }

  // ------------------------------------------------------------------ calendar export
  function icsEscape(t) { return String(t == null ? "" : t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function fold(line) {
    var out = "", bytes = 0, ch, b;
    for (ch of line) {
      b = ch.charCodeAt(0) < 0x80 ? 1 : ch.codePointAt(0) < 0x800 ? 2 : ch.codePointAt(0) < 0x10000 ? 3 : 4;
      if (bytes + b > 73) { out += "\r\n "; bytes = 1; }
      out += ch; bytes += b;
    }
    return out;
  }
  function ymdCompact(iso) { return iso.replace(/-/g, ""); }

  /**
   * iCalendar text with one all-day event per dated reminder, upcoming sales, and a weekly Sunday review.
   * UIDs are stable, so re-importing the file updates events instead of duplicating them.
   */
  function buildICS(parcels, today, settings, nowStamp) {
    var stamp = nowStamp || (today.replace(/-/g, "") + "T000000Z");
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Parcel Quest//Reminders//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Parcel Quest"];
    function event(uid, dateISO, summary, desc, rrule, endExclusiveISO) {
      lines.push("BEGIN:VEVENT", "UID:" + uid + "@parcel-quest", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + ymdCompact(dateISO), "DTEND;VALUE=DATE:" + ymdCompact(endExclusiveISO || M.addDays(dateISO, 1)),
        "SUMMARY:" + icsEscape(summary), "DESCRIPTION:" + icsEscape(desc));
      if (rrule) lines.push("RRULE:" + rrule);
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEscape(summary), "TRIGGER;RELATED=START:PT9H", "END:VALARM", "END:VEVENT");
    }
    var s = settingsWith(settings);
    // Estimated-delivery windows: one all-day (multi-day) event per active parcel, alarm at 9am on the first day.
    (parcels || []).forEach(function (p) {
      if (!ACTIVE[p.status] || !p.expected) return;
      var to = p.expectedEnd || p.expected;
      if (to < today) return;
      var start = p.expected < today ? today : p.expected;
      event("eta-" + p.id, start, "Expected: " + shortItem(p),
        "Estimated delivery " + (p.expectedEnd ? fmtDay(p.expected) + " to " + fmtDay(to) : fmtDay(to)) + ". Mark it received in Parcel Quest when it arrives.", null, M.addDays(to, 1));
    });
    // Pickup deadlines and reorder dates, looking ahead regardless of lead times.
    var wide = {}; for (var k in s) wide[k] = s[k];
    wide.pickupLeadDays = wide.reorderLeadDays = 365;
    buildReminders(parcels, today, wide).forEach(function (r) {
      if (r.type === "pickup" || r.type === "reorder") {
        if (r.due >= today) event(r.type + "-" + r.parcelId + "-" + r.due, r.due, r.title.replace(/^[^\w]+/, ""), r.detail);
      }
    });
    saleCalendar(today, 14).forEach(function (sl) {
      if (sl.daysLeft <= 120) event("sale-" + sl.date, sl.date, sl.name, "Plan your spend before the sale.");
    });
    var d = today; while (new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)).getDay() !== 0) d = M.addDays(d, 1);
    event("weekly-review", d, "Parcel Quest weekly review", "Check what landed, what is stuck, and this week's spend.", "FREQ=WEEKLY;BYDAY=SU");
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  }

  var api = {
    DEFAULTS: DEFAULTS, settingsWith: settingsWith, weekStart: weekStart, streak: streak,
    buildReminders: buildReminders, applyMeta: applyMeta, saleCalendar: saleCalendar, saleSpend: saleSpend,
    weeklyReview: weeklyReview, buildICS: buildICS
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ParcelReminders = api;
})(typeof window !== "undefined" ? window : this);
