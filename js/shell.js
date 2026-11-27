// Parcel Quest — app shell: bottom tab bar, "add" sheet, and the More drawer.
// Loaded last; wraps showSection/toggleSidebar from js/app.js.
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var PRIMARY = { today: 1, parcels: 1, pickup: 1 };   // sections that have their own tab

  function syncTabs(name) {
    var items = document.querySelectorAll("#bottomNav .bn-item");
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var on = it.dataset.more ? !PRIMARY[name] : it.dataset.section === name;
      it.classList.toggle("active", on);
      if (on) it.setAttribute("aria-current", "page"); else it.removeAttribute("aria-current");
    }
  }
  var origShow = window.showSection;
  window.showSection = function (name) {
    var r = origShow.apply(this, arguments);
    syncTabs(name);
    closeAddSheet();
    return r;
  };

  window.toggleSidebar = function () { $("sidebar").classList.toggle("open"); };
  window.openAddSheet = function () { $("addSheet").classList.add("show"); };
  window.closeAddSheet = function () { var s = $("addSheet"); if (s) s.classList.remove("show"); };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeAddSheet(); $("sidebar").classList.remove("open"); }
  });

  // ---- text size (per device) ----
  var SIZES = ["sm", "md", "lg", "xl"], LABELS = { sm: "Small", md: "Normal", lg: "Large", xl: "Extra large" };
  function currentSize() { return document.documentElement.getAttribute("data-text") || "md"; }
  function syncTextButtons() {
    var cur = currentSize(), bs = document.querySelectorAll(".text-size-btn");
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("active", bs[i].dataset.size === cur);
  }
  window.setTextSize = function (k) {
    if (SIZES.indexOf(k) < 0) return;
    if (k === "md") document.documentElement.removeAttribute("data-text"); else document.documentElement.setAttribute("data-text", k);
    try { if (k === "md") localStorage.removeItem("parcelQuest_textSize"); else localStorage.setItem("parcelQuest_textSize", k); } catch (e) {}
    syncTextButtons();
    if (window.showToast) showToast("🔠 Text size: " + LABELS[k], "info");
  };
  window.bumpTextSize = function (d) {
    var i = Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(currentSize()) + d));
    setTextSize(SIZES[i]);
  };
  syncTextButtons();
  syncTabs("today");
})();
