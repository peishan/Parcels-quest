// Parcel Quest — "Import & merge" and "Restore from Gist history".
// Merge never removes anything you have; Replace is available but always snapshots first (see js/backup.js).
// Depends on: js/model.js, js/backup.js and globals from js/app.js (parcels, saveData, renderAll, showToast, setParcelMeta).
(function () {
  "use strict";
  var M = window.ParcelModel;
  var FILE = "parcel_quest_data.json";
  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "text") n.textContent = props[k]; else if (k === "class") n.className = props[k];
      else if (k === "style") n.setAttribute("style", props[k]); else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), props[k]); else n[k] = props[k];
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  window.openRestore = function () {
    $("restoreModal").classList.add("show");
    $("rsGistId").value = lsGet("parcelQuest_gistId");
    $("rsToken").value = lsGet("parcelQuest_gistToken");
    $("rsStatus").textContent = "";
  };
  window.closeRestore = function () { $("restoreModal").classList.remove("show"); };

  // ---------------------------------------------------------------- parsing
  /** Accepts a full export ({parcels:[…]}) or a bare array. Throws a readable error otherwise. */
  function parseBackup(text) {
    var t = String(text || "").replace(/^﻿/, "").trim();
    if (!t) throw new Error("Nothing to import — paste the JSON or choose a file");
    var data;
    try { data = JSON.parse(t); } catch (e) { throw new Error("That isn't valid JSON (" + e.message + "). Copy the whole file, from { to }."); }
    var list = Array.isArray(data) ? data : data && data.parcels;
    if (!Array.isArray(list)) throw new Error("No parcels found in that data");
    return { parcels: list.filter(function (p) { return p && typeof p === "object"; }), meta: data && data.meta };
  }

  // ---------------------------------------------------------------- applying (merge / replace)
  function apply(mode, label, data) {
    var remote = data.parcels;
    if (!remote.length) { showToast("That backup has no parcels", "warning"); return; }
    if (mode === "merge") {
      var plan = M.planMerge(parcels, remote, { exact: true });
      var msg = "Merge " + remote.length + " parcels from " + label + " into your " + parcels.length + "?\n\n" +
        "• " + plan.added + " parcels will be added\n• " + plan.updated + " existing parcels get a more advanced status or filled-in blanks\n" +
        "• Everything you have now is kept as it is\n" +
        (plan.sharedTracking ? "• " + plan.sharedTracking + " added parcels share a tracking number with one you already have (kept separate — check Settings → Find Duplicates)\n" : "") +
        "\nA backup of your current data is saved first.";
      if (!plan.added && !plan.updated) { showToast("Nothing new — everything in that backup is already here", "info"); return; }
      if (!confirm(msg)) return;
      if (window.ParcelBackup) ParcelBackup.snapshotNow("Before merging " + label, "safety");
      var r = M.mergeParcels(parcels, remote, { exact: true });
      if (data.meta && window.setParcelMeta) setParcelMeta(data.meta, true);
      finish("🛟 Merged: " + r.added + " added, " + r.updated + " updated — you now have " + parcels.length + " parcels");
    } else {
      var warn = remote.length < parcels.length ? "\n\n⚠️ That backup has FEWER parcels than you have now." : "";
      if (!confirm("REPLACE your " + parcels.length + " parcels with the " + remote.length + " from " + label + "?" + warn + "\n\nMerge is safer. A backup of your current data is saved first.")) return;
      if (window.ParcelBackup) ParcelBackup.snapshotNow("Before replacing with " + label, "safety");
      parcels = JSON.parse(JSON.stringify(remote));
      if (data.meta && window.setParcelMeta) setParcelMeta(data.meta, true);
      finish("🛟 Replaced with " + remote.length + " parcels");
    }
  }
  function finish(msg) {
    try { if (window.fixTrackingTails) fixTrackingTails(true); } catch (e) {}
    saveData(); renderAll(); if (window.ParcelBackup) ParcelBackup.render();
    showToast(msg, "success"); closeRestore();
  }

  // ---------------------------------------------------------------- file / pasted JSON
  function fromText(mode, label) {
    try { apply(mode, label, parseBackup($("rsText").value)); } catch (e) { showToast("❌ " + e.message, "danger"); }
  }
  window.restoreFromText = function (mode) { fromText(mode, "pasted data"); };
  window.restoreFileChosen = function (input) {
    var f = input.files && input.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { $("rsText").value = String(rd.result); showToast("Loaded " + f.name + " — choose Merge or Replace", "info"); };
    rd.onerror = function () { showToast("Couldn't read that file", "danger"); };
    rd.readAsText(f); input.value = "";
  };

  // ---------------------------------------------------------------- Gist history
  function ghHeaders(token) {
    var h = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10" };
    if (token) h["Authorization"] = "Bearer " + token;
    return h;
  }
  function ghJson(url, token) {
    return fetch(url, { headers: ghHeaders(token) }).then(function (r) {
      if (r.status === 401) throw new Error("GitHub rejected the token (401) — create a new one with the 'gist' scope");
      if (r.status === 404) throw new Error("Gist not found (404) — check the ID, and that the token belongs to the account that owns it");
      if (r.status === 403) throw new Error("GitHub says forbidden/rate-limited (403) — add a token, or wait a bit");
      if (!r.ok) throw new Error("GitHub error " + r.status);
      return r.json();
    });
  }
  function revisionData(id, sha, token) {
    return ghJson("https://api.github.com/gists/" + id + "/" + sha, token).then(function (g) {
      var f = g.files && g.files[FILE];
      if (!f) throw new Error("no " + FILE + " in this revision");
      if (f.truncated && f.raw_url) return fetch(f.raw_url).then(function (r) { return r.text(); });
      return f.content;
    });
  }

  window.loadGistHistory = function () {
    var id = $("rsGistId").value.trim(), token = $("rsToken").value.trim(), st = $("rsStatus"), box = $("rsRevisions");
    if (!id) { st.textContent = "Enter your Gist ID first (Settings → Gist Sync shows it)."; return; }
    lsSet("parcelQuest_gistId", id); if (token) lsSet("parcelQuest_gistToken", token);
    box.textContent = ""; st.textContent = "Loading revisions…";
    ghJson("https://api.github.com/gists/" + id + "/commits?per_page=20", token).then(function (commits) {
      if (!Array.isArray(commits) || !commits.length) { st.textContent = "No revisions found."; return; }
      st.textContent = commits.length + " revisions found — reading each one…";
      var rows = [], chain = Promise.resolve();
      commits.forEach(function (c, i) {
        var row = { sha: c.version, when: c.committed_at, stat: c.change_status || {}, count: null, text: null, err: null };
        rows.push(row);
        chain = chain.then(function () {
          st.textContent = "Reading revision " + (i + 1) + " of " + commits.length + "…";
          return revisionData(id, c.version, token).then(function (text) {
            row.text = text;
            try { row.count = parseBackup(text).parcels.length; } catch (e) { row.err = e.message; }
          }).catch(function (e) { row.err = e.message; });
        });
      });
      return chain.then(function () { st.textContent = ""; renderRevisions(rows); });
    }).catch(function (e) { st.textContent = "❌ " + e.message; });
  };

  function renderRevisions(rows) {
    var box = $("rsRevisions"); box.textContent = "";
    var best = 0; rows.forEach(function (r) { if (r.count > best) best = r.count; });
    rows.forEach(function (r) {
      var d = new Date(r.when), label = "Gist revision of " + d.toLocaleString();
      var info = el("div", {}, [
        el("div", { "class": "settings-label", text: d.toLocaleString() + (r.count === best && best > 0 ? "  ★ most parcels" : "") }),
        el("div", { "class": "settings-desc", text: r.err ? "⚠️ " + r.err : (r.count + " parcels" + (r.stat.additions != null ? " · +" + r.stat.additions + " / −" + r.stat.deletions + " lines" : "")) })
      ]);
      var btns = el("div", { style: "display:flex;gap:6px;flex-wrap:wrap;" });
      if (!r.err) {
        btns.appendChild(el("button", { "class": "btn btn-primary", text: "Merge", onclick: function () { try { apply("merge", label, parseBackup(r.text)); } catch (e) { showToast("❌ " + e.message, "danger"); } } }));
        btns.appendChild(el("button", { "class": "btn", text: "Replace", onclick: function () { try { apply("replace", label, parseBackup(r.text)); } catch (e) { showToast("❌ " + e.message, "danger"); } } }));
      }
      box.appendChild(el("div", { "class": "settings-row" + (r.count === best && best > 0 ? " rs-best" : "") }, [info, btns]));
    });
  }
})();
