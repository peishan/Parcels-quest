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
  syncTabs("today");
})();
