// Parcel Quest — "Today" page: reminders, sale radar, weekly review + weekly streak, calendar export.
// Depends on: js/model.js, js/reminders.js and globals from js/app.js (parcels, player, saveData, updateLevel, showToast, openModal).
(function () {
  "use strict";
  var M = window.ParcelModel, R = window.ParcelReminders;
  var META_KEY = "parcelQuest_meta";
  var DONE_XP = 5, REVIEW_XP = 10;
  var meta = { settings: {}, dismissed: {}, activityWeeks: [], reviewedWeeks: [], saleCaps: {}, notify: false, notifiedOn: "" };

  function $(id) { return document.getElementById(id); }
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "text") n.textContent = props[k];
      else if (k === "class") n.className = props[k];
      else if (k === "style") n.setAttribute("style", props[k]);
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), props[k]);
      else n[k] = props[k];
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function today() { return M.todayISO(); }
  function money(n) { return "RM" + (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ---------------------------------------------------------------- meta persistence
  function loadMeta() {
    try {
      var raw = localStorage.getItem(META_KEY);
      if (raw) { var m = JSON.parse(raw); if (m && typeof m === "object") for (var k in meta) if (m[k] != null) meta[k] = m[k]; }
    } catch (e) {}
  }
  function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
  function union(a, b) { var s = {}; (a || []).concat(b || []).forEach(function (x) { s[x] = 1; }); return Object.keys(s).sort(); }

  // Shared with Gist sync / JSON export (see app.js). Never includes API keys.
  window.getParcelMeta = function () {
    return { settings: meta.settings, activityWeeks: meta.activityWeeks, reviewedWeeks: meta.reviewedWeeks, saleCaps: meta.saleCaps, dismissed: meta.dismissed };
  };
  window.setParcelMeta = function (m, mergeOnly) {
    if (!m || typeof m !== "object") return;
    meta.activityWeeks = union(meta.activityWeeks, m.activityWeeks);
    meta.reviewedWeeks = union(meta.reviewedWeeks, m.reviewedWeeks);
    meta.dismissed = Object.assign({}, m.dismissed || {}, meta.dismissed);
    if (!mergeOnly) {
      meta.settings = Object.assign({}, meta.settings, m.settings || {});
      meta.saleCaps = Object.assign({}, meta.saleCaps, m.saleCaps || {});
    }
    saveMeta();
  };

  // ---------------------------------------------------------------- weekly streak
  window.logActivity = function () {
    var w = R.weekStart(today());
    if (meta.activityWeeks.indexOf(w) < 0) { meta.activityWeeks.push(w); meta.activityWeeks.sort(); saveMeta(); }
  };
  // Count a week when the user really changes something (add / import / status change / delete / done).
  function wrapAction(name) {
    var orig = window[name];
    if (typeof orig !== "function") return;
    window[name] = function () {
      var before = JSON.stringify(parcels);
      var r = orig.apply(this, arguments);
      if (JSON.stringify(parcels) !== before) { logActivity(); if ($("section-today") && $("section-today").classList.contains("active")) renderToday(); }
      return r;
    };
  }

  // ---------------------------------------------------------------- reminder actions
  function giveXP(n, msg) {
    try { player.gameXP = (player.gameXP || 0) + n; saveData(); updateLevel(); } catch (e) {}
    showToast(msg + " +" + n + " XP", "xp");
  }
  function markDone(r) {
    meta.dismissed[r.key] = "done"; logActivity(); saveMeta();
    giveXP(DONE_XP, "✅ Cleared");
    renderToday();
  }
  // The parcel arrived: mark it Delivered today, which also ends its estimate reminders.
  function gotIt(r) {
    var p = parcels.filter(function (x) { return x.id === r.parcelId; })[0];
    if (!p) return;
    p.status = "Delivered"; p.delivered = today();
    logActivity(); saveMeta(); saveData(); renderAll();
    giveXP(DONE_XP + 10, "📦 Received");
  }
  // The seller moved the estimate: replace it with a single new date.
  function newEta(r) {
    var p = parcels.filter(function (x) { return x.id === r.parcelId; })[0];
    if (!p) return;
    var v = prompt("New estimated delivery date (e.g. 2026-11-20 or 20-11-2026):", p.expectedEnd || p.expected || "");
    if (v === null) return;
    var iso = M.parseDateLoose(v);
    if (!iso) { showToast("Couldn't read that date — use YYYY-MM-DD or DD-MM-YYYY", "danger"); return; }
    p.expected = iso; delete p.expectedEnd;
    logActivity(); saveMeta(); saveData(); renderAll();
    showToast("📅 Estimate moved to " + iso, "success");
  }
  function snooze(r, days) {
    meta.dismissed[r.key] = M.addDays(today(), days); saveMeta();
    showToast("💤 Snoozed " + days + " days", "info");
    renderToday();
  }

  // ---------------------------------------------------------------- rendering
  function stat(icon, label, value, sub, cls) {
    return el("div", { "class": "td-stat " + (cls || "") }, [
      el("div", { "class": "td-stat-icon", text: icon }),
      el("div", {}, [el("div", { "class": "td-stat-value", text: value }), el("div", { "class": "td-stat-label", text: label }), sub ? el("div", { "class": "td-stat-sub", text: sub }) : null])
    ]);
  }
  function chip(r) {
    var t = r.daysLeft < 0 ? Math.abs(r.daysLeft) + "d late" : r.daysLeft === 0 ? "today" : "in " + r.daysLeft + "d";
    return el("span", { "class": "td-chip sev-" + r.severity, text: r.type === "noeta" ? "info" : t });
  }

  window.renderToday = function () {
    if (!$("section-today") || typeof parcels === "undefined") return;
    var td = today(), s = R.settingsWith(meta.settings);
    var all = R.applyMeta(R.buildReminders(parcels, td, meta.settings), meta, td);
    var urgent = all.filter(function (r) { return r.severity !== "low"; });
    var st = R.streak(meta.activityWeeks, td);
    var wk = R.weeklyReview(parcels, td, meta.settings);

    // subtitle + nav badge
    var d = new Date();
    $("todaySubtitle").textContent = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }) + " · Old World ledger — the days before Daybreak";
    var nb = $("navTodayCount");
    if (nb) { nb.textContent = urgent.length; nb.style.display = urgent.length ? "" : "none"; }

    // stat tiles
    var tiles = $("todayStats"); tiles.textContent = "";
    tiles.appendChild(stat("🌊", "Weekly tide streak", st.current + (st.current === 1 ? " week" : " weeks"),
      st.thisWeekDone ? "This week ✓ · best " + st.best : "Log something this week to keep it · best " + st.best, st.thisWeekDone ? "ok" : ""));
    tiles.appendChild(stat("⚡", "Needs attention", String(urgent.length), all.length - urgent.length ? (all.length - urgent.length) + " lower-priority notes" : "", urgent.length ? "warn" : "ok"));
    tiles.appendChild(stat("💸", "Spent this week", money(wk.spend), wk.cap ? "of " + money(wk.cap) + " cap" : "no weekly cap set", wk.overCap ? "bad" : ""));

    // reminder list
    var list = $("todayList"); list.textContent = "";
    $("todayCount").textContent = all.length ? all.length + " item" + (all.length === 1 ? "" : "s") : "";
    if (!all.length) {
      list.appendChild(el("div", { "class": "empty-state" }, [el("div", { "class": "empty-state-icon", text: "🌤️" }), el("div", { text: "All clear. Nothing needs you today." })]));
    }
    all.forEach(function (r) {
      var actions = el("div", { "class": "td-actions" });
      if (r.parcelId) actions.appendChild(el("button", { "class": "btn", text: "Open", onclick: function () { openModal(r.parcelId); } }));
      if (r.type === "noeta") actions.appendChild(el("button", { "class": "btn", text: "Show parcels", onclick: function () { showSection("parcels"); } }));
      if (r.type === "promise" && r.parcelId) {
        actions.appendChild(el("button", { "class": "btn", text: "📅 New ETA", title: "The seller gave a new estimated date", onclick: function () { newEta(r); } }));
        actions.appendChild(el("button", { "class": "btn btn-primary", text: "📦 Got it", title: "Mark as received today", onclick: function () { gotIt(r); } }));
      }
      if (r.type !== "noeta") {
        actions.appendChild(el("button", { "class": "btn", text: "💤 3d", title: "Snooze 3 days", onclick: function () { snooze(r, 3); } }));
        if (r.type !== "promise") actions.appendChild(el("button", { "class": "btn btn-primary", text: "✓ Done", onclick: function () { markDone(r); } }));
      }
      list.appendChild(el("div", { "class": "td-item sev-" + r.severity }, [
        el("div", { "class": "td-item-icon", text: r.icon }),
        el("div", { "class": "td-item-body" }, [el("div", { "class": "td-item-title", text: r.title }), el("div", { "class": "td-item-detail", text: r.detail })]),
        chip(r), actions
      ]));
    });

    renderSales(td);
    renderWeekly(wk, td);
    renderSettingsCard(s);
    updateNotifyBtn();
  };

  function renderSales(td) {
    var box = $("saleRadar"); box.textContent = "";
    R.saleCalendar(td, 3).forEach(function (sl) {
      var cap = Number(meta.saleCaps[sl.date]) || 0, sp = R.saleSpend(parcels, sl.date);
      var pct = cap ? Math.min(100, Math.round(sp.total / cap * 100)) : 0;
      var capInput = el("input", { type: "number", min: 0, step: "10", value: cap || "", placeholder: "cap RM", "class": "imp-input", style: "width:100px",
        onchange: function () { meta.saleCaps[sl.date] = Math.max(0, parseFloat(this.value) || 0); saveMeta(); renderToday(); } });
      box.appendChild(el("div", { "class": "td-sale" }, [
        el("div", { "class": "td-sale-head" }, [
          el("div", {}, [el("strong", { text: (sl.mega ? "🔥 " : "🛍️ ") + sl.name }), el("div", { "class": "imp-note", text: sl.date + " · " + (sl.daysLeft === 0 ? "today" : "in " + sl.daysLeft + " days") })]),
          capInput]),
        cap ? el("div", { "class": "td-bar" }, [el("div", { "class": "td-bar-fill" + (sp.total > cap ? " over" : ""), style: "width:" + pct + "%" })]) : null,
        cap || sp.count ? el("div", { "class": "imp-note", text: sp.count + " order" + (sp.count === 1 ? "" : "s") + " · " + money(sp.total) + (cap ? " of " + money(cap) : "") }) : null
      ]));
    });
    box.appendChild(el("div", { "class": "imp-hint", text: "Typical M.M double-day sales and the 25th payday sale. Set a cap, then log orders with their order date to track spend." }));
  }

  function renderWeekly(wk, td) {
    var box = $("weeklyReview"); box.textContent = "";
    function row(label, val, bad) { return el("div", { "class": "modal-row" }, [el("span", { "class": "modal-label", text: label }), el("span", { "class": "modal-value" + (bad ? " td-bad" : ""), text: val })]); }
    box.appendChild(el("div", { "class": "imp-note", text: wk.start + " → " + wk.end }));
    box.appendChild(row("Ordered", wk.ordered + " parcels · " + money(wk.spend) + (wk.cap ? " / " + money(wk.cap) : ""), wk.overCap));
    box.appendChild(row("Landed (delivered)", String(wk.landed)));
    box.appendChild(row("Stuck", String(wk.stuck), wk.stuck > 0));
    box.appendChild(row("No estimated date", String(wk.undated)));
    var reviewed = meta.reviewedWeeks.indexOf(wk.start) >= 0;
    var isRevDay = new Date().getDay() === 0 || new Date().getDay() === 1;
    box.appendChild(el("div", { "class": "imp-actions" }, [
      el("button", { "class": "btn " + (reviewed ? "" : "btn-primary"), text: reviewed ? "✓ Week reviewed" : "✅ Mark week reviewed", disabled: reviewed,
        onclick: function () { meta.reviewedWeeks.push(wk.start); logActivity(); saveMeta(); giveXP(REVIEW_XP, "📊 Week reviewed"); renderToday(); } }),
      isRevDay && !reviewed ? el("span", { "class": "imp-note", text: "Good day for a review." }) : null
    ]));
  }

  function renderSettingsCard(s) {
    var box = $("reminderSettings");
    if (box.dataset.built === "1") return;     // keep typed values while the page re-renders
    box.dataset.built = "1"; box.textContent = "";
    var fields = [
      ["holdDays", "Pickup hold (days)", "How long a branch keeps a parcel after it arrives"],
      ["stuckDays", "Stuck after (days)", "Pending/Scheduled this long after ordering = stuck"],
      ["promiseLeadDays", "Estimate heads-up (days)", "Remind this many days before the estimated delivery date (and when the window opens)"],
      ["reorderLeadDays", "Reorder heads-up (days)", "Warn this many days before a consumable runs out"],
      ["weeklyCap", "Weekly spend cap (RM)", "0 = no cap"]
    ];
    var inputs = {};
    fields.forEach(function (f) {
      inputs[f[0]] = el("input", { type: "number", min: 0, value: s[f[0]], "class": "imp-input" });
      box.appendChild(el("div", { "class": "settings-row" }, [el("div", {}, [el("div", { "class": "settings-label", text: f[1] }), el("div", { "class": "settings-desc", text: f[2] })]), inputs[f[0]]]));
    });
    box.appendChild(el("div", { "class": "imp-actions" }, [
      el("button", { "class": "btn btn-primary", text: "💾 Save reminder settings", onclick: function () {
        fields.forEach(function (f) { var v = parseFloat(inputs[f[0]].value); if (isFinite(v) && v >= 0) meta.settings[f[0]] = v; });
        saveMeta(); showToast("Reminder settings saved", "success"); renderToday();
      } }),
      el("button", { "class": "btn", text: "Reset snoozed & cleared", onclick: function () {
        if (!confirm("Bring back every reminder you cleared or snoozed?")) return;
        meta.dismissed = {}; saveMeta(); renderToday();
      } })
    ]));
  }

  // ---------------------------------------------------------------- calendar export
  window.exportReminderCalendar = function () {
    var ics = R.buildICS(parcels, today(), meta.settings);
    var n = (ics.match(/BEGIN:VEVENT/g) || []).length;
    var blob = new Blob([ics], { type: "text/calendar" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "parcel-quest-reminders.ics";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("📅 " + n + " calendar events exported — open the file to add them", "success");
  };

  // ---------------------------------------------------------------- notifications (only while the app is open)
  function updateNotifyBtn() {
    var b = $("notifyBtn"); if (!b) return;
    if (!("Notification" in window)) { b.style.display = "none"; return; }
    b.textContent = meta.notify && Notification.permission === "granted" ? "🔔 Notifications on" : "🔔 Notify me";
  }
  window.toggleNotifications = function () {
    if (!("Notification" in window)) return;
    if (meta.notify) { meta.notify = false; saveMeta(); updateNotifyBtn(); showToast("Notifications off", "info"); return; }
    Notification.requestPermission().then(function (p) {
      meta.notify = p === "granted"; saveMeta(); updateNotifyBtn();
      showToast(meta.notify ? "🔔 You'll get a note when you open the app. Use the calendar export for alerts while it's closed." : "Notifications blocked in the browser", meta.notify ? "success" : "warning");
    });
  };
  function maybeNotify() {
    try {
      if (!meta.notify || !("Notification" in window) || Notification.permission !== "granted") return;
      var td = today(); if (meta.notifiedOn === td) return;
      var urgent = R.applyMeta(R.buildReminders(parcels, td, meta.settings), meta, td).filter(function (r) { return r.severity !== "low"; });
      if (!urgent.length) return;
      meta.notifiedOn = td; saveMeta();
      new Notification("Parcel Quest", { body: urgent.length + " thing" + (urgent.length === 1 ? "" : "s") + " need attention: " + urgent[0].title, icon: "icon-192.png" });
    } catch (e) {}
  }

  // ---------------------------------------------------------------- init
  loadMeta();
  ["submitAddParcel", "importConfirm", "cycleStatus", "cycleStatusId", "deleteId"].forEach(wrapAction);
  try { renderToday(); maybeNotify(); } catch (e) { console.error("renderToday failed:", e); }
})();
