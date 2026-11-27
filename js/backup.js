// Parcel Quest — automatic local backups, so a bad sync/import/clear can always be undone.
// Pure helpers are exported for Node tests (`node tests/backup.test.js`); the browser part stores snapshots
// in localStorage ("parcelQuest_backups"), lists them in Settings, and can restore or download them.
(function (root) {
  "use strict";
  var KEY = "parcelQuest_backups";
  var MAX = 8;                       // snapshots kept
  var DAILY_EVERY_HOURS = 20;

  /** Count parcels in a saved JSON string without parsing it (cheap enough to run on every save). */
  function countInRaw(raw) { return raw ? (raw.match(/"tracking"/g) || []).length : 0; }
  /** A save that suddenly loses a lot of parcels is almost never intended. */
  function shrankALot(oldN, newN) { return oldN >= 20 && oldN - newN >= 10 && newN < oldN * 0.8; }

  /** Append a snapshot; when over `max`, evict the oldest *daily* one first so safety snapshots survive longer. */
  function pushSnapshot(list, snap, max) {
    var out = list.concat([snap]);
    while (out.length > max) {
      var i = -1;
      for (var k = 0; k < out.length - 1; k++) if (out[k].kind === "daily") { i = k; break; }
      out.splice(i >= 0 ? i : 0, 1);
    }
    return out;
  }
  function needsDaily(list, nowMs, hours) {
    var last = 0;
    list.forEach(function (s) { if (s.ts > last) last = s.ts; });
    return nowMs - last > (hours || DAILY_EVERY_HOURS) * 3600 * 1000;
  }

  var api = { countInRaw: countInRaw, shrankALot: shrankALot, pushSnapshot: pushSnapshot, needsDaily: needsDaily, MAX: MAX };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  root.ParcelBackup = api;

  // ------------------------------------------------------------------ browser part
  function load() { try { var l = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function store(list) {
    // On quota errors, drop the oldest snapshot and retry, down to a single one.
    for (var tries = 0; tries < MAX; tries++) {
      try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { if (list.length <= 1) return false; list = list.slice(1); }
    }
    return false;
  }
  function snapshotParcels(parcelList, reason, kind) {
    if (!parcelList || !parcelList.length) return false;
    var snap = { ts: Date.now(), kind: kind || "safety", reason: reason, count: parcelList.length, parcels: parcelList };
    return store(pushSnapshot(load(), snap, MAX));
  }
  api.list = load;
  api.snapshotNow = function (reason, kind) { return typeof parcels !== "undefined" && snapshotParcels(parcels, reason, kind); };

  /** Called by saveData() BEFORE it overwrites localStorage: keeps the old copy if the new one is much smaller. */
  api.beforeSave = function (oldRaw, newParcels) {
    var oldN = countInRaw(oldRaw), newN = newParcels ? newParcels.length : 0;
    if (!shrankALot(oldN, newN)) return;
    try { snapshotParcels(JSON.parse(oldRaw), "Saved copy before it shrank from " + oldN + " to " + newN + " parcels", "safety"); } catch (e) {}
  };

  api.restore = function (index) {
    var s = load()[index];
    if (!s) return;
    if (!confirm("Restore the backup from " + new Date(s.ts).toLocaleString() + " (" + s.count + " parcels)?\n\nYour current " + parcels.length + " parcels are backed up first, so you can undo this.")) return;
    snapshotParcels(parcels, "Before restoring a backup", "safety");
    parcels = JSON.parse(JSON.stringify(s.parcels));
    saveData(); renderAll(); api.render();
    showToast("🛟 Restored " + s.count + " parcels", "success");
  };
  function download(name, text) {
    var url = URL.createObjectURL(new Blob([text], { type: "application/json" })), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  api.downloadCurrent = function () {
    download("parcel-quest-backup-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ parcels: parcels, priceHistory: priceHistory, player: player, meta: window.getParcelMeta ? getParcelMeta() : undefined, exportedAt: new Date().toISOString() }, null, 2));
    showToast("💾 Backup file downloaded — keep it somewhere outside this browser", "success");
  };
  api.render = function () {
    var box = document.getElementById("backupList"); if (!box) return;
    box.textContent = "";
    var list = load();
    if (!list.length) { var e = document.createElement("div"); e.className = "imp-note"; e.textContent = "No automatic backups yet — the first is made when the app opens."; box.appendChild(e); return; }
    list.map(function (s, i) { return { s: s, i: i }; }).reverse().forEach(function (x) {
      var row = document.createElement("div"); row.className = "settings-row";
      var left = document.createElement("div");
      var t = document.createElement("div"); t.className = "settings-label"; t.textContent = new Date(x.s.ts).toLocaleString() + " · " + x.s.count + " parcels";
      var d = document.createElement("div"); d.className = "settings-desc"; d.textContent = x.s.reason;
      left.appendChild(t); left.appendChild(d);
      var btns = document.createElement("div"); btns.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
      var r = document.createElement("button"); r.className = "btn btn-primary"; r.textContent = "↩ Restore"; r.onclick = function () { api.restore(x.i); };
      var dl = document.createElement("button"); dl.className = "btn"; dl.textContent = "⬇ File";
      dl.onclick = function () { download("parcel-quest-backup-" + new Date(x.s.ts).toISOString().slice(0, 10) + ".json", JSON.stringify({ parcels: x.s.parcels }, null, 2)); };
      btns.appendChild(r); btns.appendChild(dl); row.appendChild(left); row.appendChild(btns); box.appendChild(row);
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    try { if (typeof parcels !== "undefined" && parcels.length && needsDaily(load(), Date.now())) api.snapshotNow("Automatic daily backup", "daily"); } catch (e) {}
    var rs = window.renderSettings;
    if (typeof rs === "function") window.renderSettings = function () { var r = rs.apply(this, arguments); api.render(); return r; };
    api.render();
  });
})(typeof window !== "undefined" ? window : this);
