let parcels = [];
let priceHistory = [];
let currentFilter = 'all';
let currentPickupFilter = 'all';
let currentPage = 1;
let perPage = 20;
let currentModalId = null;
let player = { level: 1, xp: 0, totalXP: 0, gameXP: 0 };
let activeGame = null;

const LEVEL_TITLES = [
  { level: 1, title: "Parcel Novice", subtitle: "Just getting started!" },
  { level: 5, title: "Delivery Scout", subtitle: "Getting the hang of this!" },
  { level: 10, title: "Package Hunter", subtitle: "No parcel escapes you!" },
  { level: 20, title: "Logistics Ranger", subtitle: "Tracking master!" },
  { level: 35, title: "Shipping Warlord", subtitle: "King of supply chain!" },
  { level: 50, title: "Parcel Overlord", subtitle: "Legendary status!" },
  { level: 75, title: "Supply Chain Deity", subtitle: "You ARE logistics." },
  { level: 100, title: "Universal Courier", subtitle: "Transcendent mastery." }
];

const ACHIEVEMENTS = [
  { id: "first", name: "First Steps", desc: "Track 1 parcel", icon: "👣", condition: function(p){return p.length>=1} },
  { id: "ten", name: "Getting Serious", desc: "Track 10 parcels", icon: "📦", condition: function(p){return p.length>=10} },
  { id: "fifty", name: "Hoarder", desc: "Track 50 parcels", icon: "🏚️", condition: function(p){return p.length>=50} },
  { id: "hundred", name: "Centurion", desc: "Track 100 parcels", icon: "💯", condition: function(p){return p.length>=100} },
  { id: "twohundred", name: "Double Century", desc: "Track 200 parcels", icon: "🔥", condition: function(p){return p.length>=200} },
  { id: "delivered50", name: "Delivery Master", desc: "50 delivered", icon: "✅", condition: function(p){return p.filter(function(x){return x.status==="Delivered"}).length>=50} },
  { id: "platforms3", name: "Platform Explorer", desc: "All 3 platforms", icon: "🌐", condition: function(p){return new Set(p.map(function(x){return x.platform})).size>=3} },
  { id: "spender", name: "Big Spender", desc: "RM 5,000+ total", icon: "💸", condition: function(p){return p.reduce(function(s,x){return s+x.price},0)>=5000} },
  { id: "variety", name: "Variety Pack", desc: "5+ categories", icon: "🎨", condition: function(p){return new Set(p.map(function(x){return x.category})).size>=5} },
  { id: "pending20", name: "Patience", desc: "20+ pending", icon: "⏳", condition: function(p){return p.filter(function(x){return x.status==="Pending"}).length>=20} },
  { id: "scheduled20", name: "Planner", desc: "20+ scheduled", icon: "📅", condition: function(p){return p.filter(function(x){return x.status==="Scheduled"}).length>=20} },
  { id: "refund5", name: "Refund Warrior", desc: "5+ refunded", icon: "💰", condition: function(p){return p.filter(function(x){return x.status==="Refunded"}).length>=5} },
  { id: "cancel5", name: "Cancelled Crew", desc: "5+ cancelled", icon: "❌", condition: function(p){return p.filter(function(x){return x.status==="Cancelled"}).length>=5} },
  { id: "health30", name: "Health Guru", desc: "30+ health items", icon: "💊", condition: function(p){return p.filter(function(x){return x.category==="Health Care"}).length>=30} },
  { id: "beauty50", name: "Beauty Queen", desc: "50+ beauty items", icon: "💄", condition: function(p){return p.filter(function(x){return x.category==="Beauty Care"}).length>=50} },
  { id: "fashion20", name: "Fashionista", desc: "20+ fashion items", icon: "👜", condition: function(p){return p.filter(function(x){return x.category==="Fashion Acc"}).length>=20} },
  { id: "tech10", name: "Techie", desc: "10+ electronics", icon: "🔌", condition: function(p){return p.filter(function(x){return x.category==="Elec. Appl."}).length>=10} },
  { id: "lazada50", name: "Lazada Loyal", desc: "50+ Lazada", icon: "🛒", condition: function(p){return p.filter(function(x){return x.platform==="Lazada"}).length>=50} },
  { id: "shopee50", name: "Shopee Squad", desc: "50+ Shopee", icon: "🍊", condition: function(p){return p.filter(function(x){return x.platform==="Shopee"}).length>=50} },
  { id: "tiktok50", name: "TikTok Trend", desc: "50+ TikTok", icon: "🎵", condition: function(p){return p.filter(function(x){return x.platform==="TikTok"}).length>=50} },
  { id: "san20", name: "San's Stash", desc: "20+ for San", icon: "🧑", condition: function(p){return p.filter(function(x){return x.for==="San"}).length>=20} },
  { id: "aisyah50", name: "Aisyah's Empire", desc: "50+ for Aisyah", icon: "👧", condition: function(p){return p.filter(function(x){return x.for==="Aisyah"}).length>=50} },
  { id: "gamer", name: "Quest Master", desc: "Play all 4 mini-games", icon: "🎮", condition: function(p){return player.gameXP>0} }
];

const STATUS_CYCLE = ["Pending","Scheduled","Delivered","Refunded","Cancelled","Consolidated"];
const STATUS_COLORS = {
  "Delivered": "status-delivered", "Pending": "status-pending", "Scheduled": "status-scheduled",
  "Cancelled": "status-cancelled", "Refunded": "status-refunded", "Consolidated": "status-consolidated"
};
const PLATFORM_COLORS = { "Lazada": "#818cf8", "Shopee": "#fb923c", "TikTok": "#f472b6", "Shopee Direct": "#facc15", "Temu": "#2dd4bf" };
const CATEGORY_COLORS = {
  "Health Care": "#ef4444", "Beauty Care": "#ec4899", "Elec. Appl.": "#3b82f6",
  "Fashion Acc": "#8b5cf6", "Others": "#6b7280", "Kitchen": "#f59e0b",
  "Garment": "#10b981", "Home": "#06b6d4", "Printed": "#84cc16"
};

function showSection(name) {
  document.querySelectorAll(".section").forEach(function(s){s.classList.remove("active");});
  document.getElementById("section-" + name).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(function(n){n.classList.remove("active");});
  var nav = document.querySelector('.nav-item[data-section="' + name + '"]');
  if (nav) nav.classList.add("active");
  document.getElementById("sidebar").classList.remove("open");
  if (name === "parcels") renderParcels();
  if (name === "pickup") renderPickup();
  if (name === "prices") renderPriceTracker();
  if (name === "nuj") { calculateEstimate(); renderNUJHistory(); }
  if (name === "settings") renderSettings();
  if (name === "dashboard") renderDashboard();
  if (name === "today" && window.renderToday) renderToday();
  window.scrollTo(0,0);
}
function toggleSidebar() { document.getElementById("sidebar").classList.toggle("open"); }

function getXPForLevel(lvl) { return Math.floor(100 * Math.pow(1.15, lvl - 1)); }
function getLevelTitle(lvl) {
  for (var i = LEVEL_TITLES.length - 1; i >= 0; i--) {
    if (lvl >= LEVEL_TITLES[i].level) return LEVEL_TITLES[i];
  }
  return LEVEL_TITLES[0];
}
function calcXP() {
  var xp = player.gameXP;
  parcels.forEach(function(p) {
    xp += 10;
    if (p.status === "Delivered") xp += 15;
    if (p.status === "Pending") xp += 5;
    if (p.status === "Scheduled") xp += 8;
    if (p.status === "Refunded") xp += 3;
    if (p.status === "Cancelled") xp += 2;
    if (p.status === "Consolidated") xp += 5;
    xp += Math.floor(p.price / 50);
    xp += Math.min(p.qty, 10);
  });
  return xp;
}
var levelBaselined = false; // first run just establishes the level, so a fresh browser does not pop "Level up!"
function updateLevel() {
  var newTotalXP = calcXP();
  var oldLevel = player.level;
  var lvl = 1, xpNeeded = getXPForLevel(1), accumulated = 0;
  while (accumulated + xpNeeded <= newTotalXP) {
    accumulated += xpNeeded;
    lvl++;
    xpNeeded = getXPForLevel(lvl);
  }
  var xpInLevel = newTotalXP - accumulated;
  var pct = Math.min(100, (xpInLevel / xpNeeded) * 100);
  player.level = lvl;
  player.xp = xpInLevel;
  player.totalXP = newTotalXP;
  var elNum = document.getElementById("levelNum");
  if (elNum) elNum.textContent = lvl;
  var title = getLevelTitle(lvl);
  var elTitle = document.getElementById("levelTitle");
  if (elTitle) elTitle.textContent = title.title;
  var elSub = document.getElementById("levelSubtitle");
  if (elSub) elSub.textContent = title.subtitle;
  var elBar = document.getElementById("xpBar");
  if (elBar) elBar.style.width = pct + "%";
  var elCur = document.getElementById("xpCurrent");
  if (elCur) elCur.textContent = xpInLevel + " XP";
  var elNext = document.getElementById("xpNext");
  if (elNext) elNext.textContent = xpNeeded + " XP to Lv." + (lvl + 1);
  var elTotal = document.getElementById("totalXP");
  if (elTotal) elTotal.textContent = newTotalXP.toLocaleString();
  var elSide = document.getElementById("sidebarLevel");
  if (elSide) elSide.textContent = "Lv. " + lvl + " " + title.title;
  if (lvl > oldLevel && levelBaselined) showLevelup(lvl, title.title);
  levelBaselined = true;
}

function triggerImport() { document.getElementById("csvInput").click(); }

function parseCSV(text) {
  var lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  var headers = parseCSVLine(lines[0]);
  var result = [];
  for (var i = 1; i < lines.length; i++) {
    var values = parseCSVLine(lines[i]);
    if (values.length < 3) continue;
    var obj = {};
    headers.forEach(function(h, idx) { obj[h.trim()] = values[idx] !== undefined ? values[idx].trim() : ""; });
    result.push(obj);
  }
  return result;
}
function parseCSVLine(line) {
  var result = [], current = "", inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
function normalizeCSVRow(row) {
  function get(keys) {
    for (var k = 0; k < keys.length; k++) {
      for (var rk in row) {
        if (rk.trim().toLowerCase() === keys[k].toLowerCase()) return row[rk];
      }
    }
    return "";
  }
  var platform = get(["Platform"]).trim();
  var tracking = get(["Tracking"]).trim();
  if (!platform || !tracking) return null;
  return {
    id: parcels.length > 0 ? Math.max.apply(null, parcels.map(function(p){return p.id})) + 1 : 1,
    platform: platform, tracking: tracking,
    category: get(["Category"]).trim() || "Others",
    item: get(["Item Description", "Item"]).trim() || "Unknown Item",
    qty: parseInt(get(["Qty", "Quantity"])) || 1,
    price: parseFloat(get(["Price (RM)", "Price", "Price(RM)"])) || 0,
    pickupCode: get(["Pickup Code", "PickupCode"]).trim(),
    nujCost: parseFloat(get(["NUJ Cost", "NUJCost"])) || 0,
    status: get(["Status"]).trim() || "Pending",
    remark: get(["Remark"]).trim(),
    for: get(["For"]).trim() || "San",
    boughtBy: get(["Bought By", "BoughtBy", "Purchased By"]).trim(),
    ordered: get(["Ordered", "Order Date"]).trim(),
    expected: get(["Expected", "Est Delivery From", "Promise Date"]).trim(),
    expectedEnd: get(["Expected To", "Est Delivery To"]).trim(),
    arrived: get(["Arrived"]).trim(),
    delivered: get(["Delivered Date", "Delivered On"]).trim(),
    reorderDays: get(["Reorder Days"]).trim()
  };
}
function handleFileSelect(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var rows = parseCSV(ev.target.result);
    var added = 0;
    rows.forEach(function(row) {
      var p = normalizeCSVRow(row);
      if (p) { parcels.push(p); added++; }
    });
    if (added > 0) {
      saveData(); renderAll();
      showToast("📁 Imported " + added + " parcels! +" + (added * 10) + " XP", "xp");
    } else {
      showToast("⚠️ No valid parcels found in CSV", "warning");
    }
  };
  reader.onerror = function() { showToast("❌ Error reading file", "danger"); };
  reader.readAsText(file);
  e.target.value = "";
}

function exportCSV() {
  if (parcels.length === 0) { showToast("No parcels to export", "warning"); return; }
  var headers = ["#","Platform","Tracking","Category","Item Description","Qty","Price (RM)","Pickup Code","NUJ Cost","Status","Remark","For","Bought By","Ordered","Est Delivery From","Est Delivery To","Arrived","Delivered Date","Reorder Days"];
  function escape(s) { s = String(s || ""); if (s.indexOf(",") >= 0 || s.indexOf('"') >= 0 || s.indexOf("\n") >= 0) return '"' + s.replace(/"/g, '""') + '"'; return s; }
  var csv = headers.map(escape).join(",") + "\n";
  parcels.forEach(function(p) {
    var row = [p.id, p.platform, p.tracking, p.category, p.item, p.qty, p.price, p.pickupCode, p.nujCost, p.status, p.remark, p.for, p.boughtBy, p.ordered, p.expected, p.expectedEnd, p.arrived, p.delivered, p.reorderDays];
    csv += row.map(escape).join(",") + "\n";
  });
  var blob = new Blob([csv], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "parcels_export_" + new Date().toISOString().slice(0,10) + ".csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("💾 CSV exported!", "success");
}
function exportPriceCSV() {
  if (priceHistory.length === 0) { showToast("No price history to export", "warning"); return; }
  var headers = ["Item","Platform","Price (RM)","Date","Notes"];
  function escape(s) { s = String(s || ""); if (s.indexOf(",") >= 0 || s.indexOf('"') >= 0) return '"' + s.replace(/"/g, '""') + '"'; return s; }
  var csv = headers.map(escape).join(",") + "\n";
  priceHistory.forEach(function(p) {
    csv += [escape(p.item), escape(p.platform), p.price, escape(p.date), escape(p.notes)].join(",") + "\n";
  });
  var blob = new Blob([csv], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "price_history_" + new Date().toISOString().slice(0,10) + ".csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("💾 Price history exported!", "success");
}

function dedupParcelIds() {
  var seenIds = {};
  var hasDups = false;
  for (var i = 0; i < parcels.length; i++) {
    if (seenIds[parcels[i].id]) { hasDups = true; break; }
    seenIds[parcels[i].id] = true;
  }
  if (hasDups) {
    for (var i = 0; i < parcels.length; i++) {
      parcels[i].id = i + 1;
    }
    return true;
  }
  return false;
}

function saveData() {
  try { ParcelModel.sanitizeParcels(parcels); } catch(e) {}
  try { localStorage.setItem("parcelQuest_data", JSON.stringify(parcels)); } catch(e) {}
  try { localStorage.setItem("parcelQuest_prices", JSON.stringify(priceHistory)); } catch(e) {}
  try { localStorage.setItem("parcelQuest_player", JSON.stringify(player)); } catch(e) {}
  lastSaveTime = Date.now();
  updateSaveIndicator();
}
function loadData() {
  try {
    var saved = localStorage.getItem("parcelQuest_data");
    if (saved) {
      var parsed = JSON.parse(saved);
      // Guard against empty arrays or corrupted data
      if (Array.isArray(parsed) && parsed.length > 0) {
        parcels = parsed;
        // Fix duplicate IDs from old data (reassign sequential IDs)
        if (dedupParcelIds()) {
          saveData();
          showToast("🔧 Fixed duplicate IDs in saved data", "success");
        }
      } else {
        parcels = JSON.parse(JSON.stringify(INITIAL_PARCELS));
      }
    }
    else { parcels = JSON.parse(JSON.stringify(INITIAL_PARCELS)); }
  } catch(e) { parcels = JSON.parse(JSON.stringify(INITIAL_PARCELS)); }
  try { var sp = localStorage.getItem("parcelQuest_prices"); if (sp) { var pp = JSON.parse(sp); if (Array.isArray(pp)) priceHistory = pp; } } catch(e) {}
  try { var spl = localStorage.getItem("parcelQuest_player"); if (spl) { var pl = JSON.parse(spl); if (pl && typeof pl === "object") player = pl; } } catch(e) {}
}
function clearAll() {
  if (!confirm("Clear ALL parcels? This cannot be undone.")) return;
  parcels = []; priceHistory = []; player = { level: 1, xp: 0, totalXP: 0, gameXP: 0 };
  saveData(); renderAll();
  showToast("🗑️ All data cleared", "danger");
}

function resetToDefault() {
  if (!confirm("Reset to default 214 parcels? This will REPLACE your current data.")) return;
  parcels = JSON.parse(JSON.stringify(INITIAL_PARCELS));
  // Fix any duplicate IDs in the default data
  if (dedupParcelIds()) {
    showToast("🔧 Fixed duplicate IDs in default data", "success");
  }
  priceHistory = [];
  player = { level: 1, xp: 0, totalXP: 0, gameXP: 0 };
  saveData();
  renderAll();
  showToast("🔄 Reset to default 214 parcels!", "success");
}

function countBy(key, arr) {
  var map = {};
  arr.forEach(function(p) { map[p[key]] = (map[p[key]] || 0) + 1; });
  return Object.entries(map).sort(function(a,b){return b[1]-a[1];});
}
function renderBars(data, containerId, colorMap, total) {
  total = total || 1;
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = data.map(function(entry) {
    var label = entry[0], count = entry[1];
    var pct = (count / total * 100).toFixed(1);
    var color = colorMap[label] || "#6b7280";
    return '<div class="bar-row"><span class="bar-label">' + label + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div><span class="bar-value">' + count + '</span></div>';
  }).join("");
}
function renderAchievements(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ACHIEVEMENTS.map(function(ach) {
    var unlocked = ach.condition(parcels);
    return '<div class="achievement ' + (unlocked ? "unlocked" : "locked") + '"><span class="achievement-icon">' + ach.icon + '</span><span><strong>' + ach.name + '</strong> — ' + ach.desc + '</span></div>';
  }).join("");
}

function renderDashboard() {
  updateLevel();
  var counts = {
    all: parcels.length,
    Delivered: parcels.filter(function(p){return p.status==="Delivered"}).length,
    Pending: parcels.filter(function(p){return p.status==="Pending"}).length,
    Scheduled: parcels.filter(function(p){return p.status==="Scheduled"}).length,
    Cancelled: parcels.filter(function(p){return p.status==="Cancelled"}).length,
    Refunded: parcels.filter(function(p){return p.status==="Refunded"}).length,
    Consolidated: parcels.filter(function(p){return p.status==="Consolidated"}).length
  };
  var elDashTotal = document.getElementById("dashTotal");
  if (elDashTotal) elDashTotal.textContent = counts.all;
  var elDashDel = document.getElementById("dashDelivered");
  if (elDashDel) elDashDel.textContent = counts.Delivered;
  var elDashPen = document.getElementById("dashPending");
  if (elDashPen) elDashPen.textContent = counts.Pending;
  var elDashSch = document.getElementById("dashScheduled");
  if (elDashSch) elDashSch.textContent = counts.Scheduled;
  var elDashPick = document.getElementById("dashPickup");
  if (elDashPick) elDashPick.textContent = parcels.filter(function(p){return p.pickupCode && p.pickupCode.trim() !== ""}).length;
  var elDashSpent = document.getElementById("dashSpent");
  if (elDashSpent) elDashSpent.textContent = parcels.reduce(function(s,p){return s+p.price},0).toFixed(0);
  var elNavCount = document.getElementById("navParcelCount");
  if (elNavCount) elNavCount.textContent = counts.all;
  var elNavPick = document.getElementById("navPickupCount");
  if (elNavPick) elNavPick.textContent = parcels.filter(function(p){return p.pickupCode && p.pickupCode.trim() !== "" && p.status !== "Delivered"}).length;

  renderBars(countBy("platform", parcels), "dashPlatformBars", PLATFORM_COLORS, parcels.length);
  renderBars(countBy("category", parcels), "dashCategoryBars", CATEGORY_COLORS, parcels.length);
  var forData = countBy("for", parcels);
  var forColors = {};
  forData.forEach(function(entry, i) { forColors[entry[0]] = ["#7c5cff","#f472b6","#4ade80","#fbbf24","#60a5fa","#a78bfa"][i % 6]; });
  renderBars(forData, "dashForBars", forColors, parcels.length);
  renderAchievements("dashAchievements");
}

function getFiltered() {
  var search = document.getElementById("searchInput").value.toLowerCase();
  var platform = document.getElementById("platformFilter").value;
  var category = document.getElementById("categoryFilter").value;
  var forWho = document.getElementById("forFilter").value;
  var boughtEl = document.getElementById("boughtFilter");
  var boughtBy = boughtEl ? boughtEl.value : "";
  return parcels.filter(function(p) {
    if (currentFilter !== "all" && p.status !== currentFilter) return false;
    if (platform && p.platform !== platform) return false;
    if (category && p.category !== category) return false;
    if (forWho && p.for !== forWho) return false;
    if (boughtBy && (p.boughtBy || "") !== (boughtBy === "(not set)" ? "" : boughtBy)) return false;
    if (search) {
      var hay = (p.tracking + " " + p.item + " " + p.platform + " " + p.status + " " + p.for + " " + (p.boughtBy || "")).toLowerCase();
      return hay.indexOf(search) >= 0;
    }
    return true;
  });
}
function renderParcels() {
  updateLevel();
  var counts = {
    all: parcels.length,
    Delivered: parcels.filter(function(p){return p.status==="Delivered"}).length,
    Pending: parcels.filter(function(p){return p.status==="Pending"}).length,
    Scheduled: parcels.filter(function(p){return p.status==="Scheduled"}).length,
    Cancelled: parcels.filter(function(p){return p.status==="Cancelled"}).length,
    Refunded: parcels.filter(function(p){return p.status==="Refunded"}).length,
    Consolidated: parcels.filter(function(p){return p.status==="Consolidated"}).length
  };
  var elPTotal = document.getElementById("pTotal");
  if (elPTotal) elPTotal.textContent = counts.all;
  var elPDel = document.getElementById("pDelivered");
  if (elPDel) elPDel.textContent = counts.Delivered;
  var elPPen = document.getElementById("pPending");
  if (elPPen) elPPen.textContent = counts.Pending;
  var elPSch = document.getElementById("pScheduled");
  if (elPSch) elPSch.textContent = counts.Scheduled;
  var elPCan = document.getElementById("pCancelled");
  if (elPCan) elPCan.textContent = counts.Cancelled;
  var elPRef = document.getElementById("pRefunded");
  if (elPRef) elPRef.textContent = counts.Refunded;
  document.querySelectorAll("#parcelStats .stat-card").forEach(function(card) {
    card.classList.toggle("active", card.dataset.filter === currentFilter);
  });

  var platforms = [...new Set(parcels.map(function(p){return p.platform}))].sort();
  var categories = [...new Set(parcels.map(function(p){return p.category}))].sort();
  var receivers = ParcelModel.FOR_OPTIONS.slice();
  updateSelect("platformFilter", platforms, "All Platforms");
  updateSelect("categoryFilter", categories, "All Categories");
  updateSelect("forFilter", receivers, "For: everyone");
  if (document.getElementById("boughtFilter")) updateSelect("boughtFilter", ParcelModel.BOUGHT_OPTIONS.concat(["(not set)"]), "Bought by: anyone");

  var filtered = getFiltered();
  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if (currentPage > totalPages) currentPage = totalPages;
  var start = (currentPage - 1) * perPage;
  var pageItems = filtered.slice(start, start + perPage);
  var elCount = document.getElementById("parcelTableCount");
  if (elCount) elCount.textContent = filtered.length + " of " + parcels.length + " parcels";
  var elPage = document.getElementById("pageInfo");
  if (elPage) elPage.textContent = "Page " + currentPage + " of " + totalPages;

  var tbody = document.getElementById("parcelTable");
  if (!tbody) return;
  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">📭</div><div>No parcels found.</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = pageItems.map(function(p) {
    var statusClass = STATUS_COLORS[p.status] || "status-pending";
    var platformColor = PLATFORM_COLORS[p.platform] || "#888";
    var itemEsc = p.item.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return '<tr onclick="openModal(' + p.id + ')"><td class="col-id" style="color:var(--text-muted);font-weight:700;">' + p.id + '</td><td class="col-platform"><span class="platform-tag" style="color:' + platformColor + '">' + p.platform + '</span></td><td><span class="tracking-num">' + p.tracking + '</span></td><td><div class="item-desc" title="' + itemEsc + '">' + p.item + '</div></td><td class="col-qty">' + p.qty + '</td><td class="col-price">' + p.price.toFixed(2) + '</td><td class="col-status"><span class="status-badge ' + statusClass + '">' + p.status + '</span></td><td>' + p.for + '</td><td class="col-actions"><button class="btn" style="padding:4px 10px;font-size:0.7rem;" onclick="event.stopPropagation();cycleStatusId(' + p.id + ')">🔄</button><button class="btn btn-danger" style="padding:4px 10px;font-size:0.7rem;" onclick="event.stopPropagation();deleteId(' + p.id + ')">🗑️</button></td></tr>';
  }).join("");
}
function updateSelect(id, items, defaultLabel) {
  var sel = document.getElementById(id);
  if (!sel) return;
  var oldVal = sel.value;
  sel.innerHTML = '<option value="">' + defaultLabel + '</option>' + items.map(function(v){return '<option value="' + v + '"' + (v===oldVal?' selected':'') + '>' + v + '</option>';}).join("");
  if (oldVal && items.indexOf(oldVal) >= 0) sel.value = oldVal;
}
function setFilter(status) { currentFilter = status; currentPage = 1; renderParcels(); }
function prevPage() { if (currentPage > 1) { currentPage--; renderParcels(); } }
function nextPage() {
  var filtered = getFiltered();
  var totalPages = Math.ceil(filtered.length / perPage);
  if (currentPage < totalPages) { currentPage++; renderParcels(); }
}

function getPickupFiltered() {
  var searchEl = document.getElementById("pickupSearch");
  var search = searchEl ? searchEl.value.toLowerCase() : "";
  var statusEl = document.getElementById("pickupStatusFilter");
  var status = statusEl ? statusEl.value : "";
  return parcels.filter(function(p) {
    var hasCode = p.pickupCode && p.pickupCode.trim() !== "";
    if (currentPickupFilter === "all") { }
    else if (currentPickupFilter === "L-") { if (!hasCode || p.pickupCode.indexOf("L-") !== 0) return false; }
    else if (currentPickupFilter === "S-") { if (!hasCode || p.pickupCode.indexOf("S-") !== 0) return false; }
    else if (currentPickupFilter === "ready") { if (!hasCode || p.status === "Delivered") return false; }
    else if (currentPickupFilter === "queued") { if (hasCode && p.status !== "Delivered") return false; }
    else if (currentPickupFilter === "empty") { if (hasCode) return false; }
    if (status && p.status !== status) return false;
    if (search) {
      var hay = (p.pickupCode + " " + p.tracking + " " + p.item + " " + p.platform).toLowerCase();
      return hay.indexOf(search) >= 0;
    }
    return true;
  });
}
function renderPickup() {
  var allWithCode = parcels.filter(function(p){return p.pickupCode && p.pickupCode.trim() !== "";});
  var lazadaCodes = allWithCode.filter(function(p){return p.pickupCode.indexOf("L-") === 0;});
  var shopeeCodes = allWithCode.filter(function(p){return p.pickupCode.indexOf("S-") === 0;});
  var ready = allWithCode.filter(function(p){return p.status !== "Delivered";});
  var queued = parcels.filter(function(p){return (!p.pickupCode || p.pickupCode.trim() === "") && p.status !== "Delivered";});
  var empty = parcels.filter(function(p){return !p.pickupCode || p.pickupCode.trim() === "";});

  var elPuTotal = document.getElementById("puTotal");
  if (elPuTotal) elPuTotal.textContent = allWithCode.length;
  var elPuL = document.getElementById("puLazada");
  if (elPuL) elPuL.textContent = lazadaCodes.length;
  var elPuS = document.getElementById("puShopee");
  if (elPuS) elPuS.textContent = shopeeCodes.length;
  var elPuReady = document.getElementById("puReady");
  if (elPuReady) elPuReady.textContent = ready.length;
  var elPuQueued = document.getElementById("puQueued");
  if (elPuQueued) elPuQueued.textContent = queued.length;
  var elPuEmpty = document.getElementById("puEmpty");
  if (elPuEmpty) elPuEmpty.textContent = empty.length;

  document.querySelectorAll("#pickupStats .stat-card").forEach(function(card) {
    card.classList.toggle("active", card.dataset.pfilter === currentPickupFilter);
  });

  var filtered = getPickupFiltered();
  var elCount = document.getElementById("pickupTableCount");
  if (elCount) elCount.textContent = filtered.length + " parcels";
  var tbody = document.getElementById("pickupTable");
  if (!tbody) return;
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">📭</div><div>No parcels found.</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(function(p) {
    var codeClass = "pickup-empty";
    if (p.pickupCode) {
      if (p.pickupCode.indexOf("L-") === 0) codeClass = "pickup-l";
      else if (p.pickupCode.indexOf("S-") === 0) codeClass = "pickup-s";
    }
    var statusClass = STATUS_COLORS[p.status] || "status-pending";
    var branch = "—";
    if (p.pickupCode) {
      if (p.pickupCode.indexOf("L-") === 0) branch = "🏠 Lambak (Aisyah)";
      else if (p.pickupCode.indexOf("S-") === 0) branch = "🏠 Sengkurong (San)";
    } else if (p.for === "Aisyah") {
      branch = "📍 Lambak (expected)";
    } else if (p.for === "San") {
      branch = "📍 Sengkurong (expected)";
    } else if (p.for === "Joel") {
      branch = "📍 Branch not set";
    }
    return '<tr onclick="openModal(' + p.id + ')"><td class="col-id">' + p.id + '</td><td><span class="pickup-code ' + codeClass + '">' + (p.pickupCode || "—") + '</span></td><td>' + branch + '</td><td>' + p.platform + '</td><td><span class="tracking-num">' + p.tracking + '</span></td><td><div class="item-desc">' + p.item + '</div></td><td class="col-price">' + p.price.toFixed(2) + '</td><td><span class="status-badge ' + statusClass + '">' + p.status + '</span></td><td>' + p.for + '</td></tr>';
  }).join("");
}
function setPickupFilter(filter) { currentPickupFilter = filter; renderPickup(); }

// ===================== PRICE TRACKER =====================
function renderPriceTracker() {
  if (priceHistory.length === 0) {
    var el = document.getElementById("priceTrackerContent");
    if (el) el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div>Add price entries to track how prices change over time.</div></div>';
  } else {
    // Group by item name (normalized)
    var groups = {};
    priceHistory.forEach(function(p) {
      var key = p.item.toLowerCase().trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    var html = '<div class="price-tracker-grid">';
    for (var key in groups) {
      var entries = groups[key].sort(function(a,b){return new Date(a.date)-new Date(b.date);});
      var latest = entries[entries.length-1];
      var prev = entries.length > 1 ? entries[entries.length-2] : null;
      var trend = prev ? (latest.price > prev.price ? 'up' : latest.price < prev.price ? 'down' : 'same') : 'same';
      var trendIcon = trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '➡️';
      var trendClass = 'trend-' + trend;
      var platformColor = PLATFORM_COLORS[latest.platform] || '#888';
      var maxPrice = Math.max.apply(null, entries.map(function(e){return e.price;}));
      html += '<div class="price-card"><div class="price-card-header"><div><div class="price-card-title">' + latest.item + '</div><div class="price-trend ' + trendClass + '">' + trendIcon + ' RM ' + latest.price.toFixed(2) + (prev ? ' (was RM ' + prev.price.toFixed(2) + ')' : '') + '</div></div><span class="price-card-platform" style="background:' + platformColor + '20;color:' + platformColor + '">' + latest.platform + '</span></div><div class="price-history">' + entries.map(function(e, i) {
        var h = maxPrice > 0 ? (e.price / maxPrice * 100) : 4;
        return '<div class="price-bar ' + (i === entries.length-1 ? 'current' : '') + '" style="height:' + Math.max(4, h) + '%" title="RM ' + e.price.toFixed(2) + ' on ' + e.date + '"></div>';
      }).join('') + '</div></div>';
    }
    html += '</div>';
    var el = document.getElementById("priceTrackerContent");
    if (el) el.innerHTML = html;
  }
  // Cross-platform compare
  var crossHtml = '';
  var itemPlatforms = {};
  parcels.forEach(function(p) {
    var key = p.item.toLowerCase().substring(0, 30);
    if (!itemPlatforms[key]) itemPlatforms[key] = {};
    if (!itemPlatforms[key][p.platform]) itemPlatforms[key][p.platform] = p;
  });
  var hasCompare = false;
  for (var k in itemPlatforms) {
    var platforms = Object.keys(itemPlatforms[k]);
    if (platforms.length > 1) {
      hasCompare = true;
      var prices = platforms.map(function(pl){return {platform: pl, price: itemPlatforms[k][pl].price};});
      prices.sort(function(a,b){return a.price-b.price;});
      var cheapest = prices[0];
      crossHtml += '<div class="price-card" style="margin-bottom:10px;"><div class="price-card-header"><div class="price-card-title">' + itemPlatforms[k][platforms[0]].item.substring(0, 40) + '</div></div>';
      crossHtml += '<div style="font-size:0.8rem;">' + prices.map(function(p) {
        var isBest = p.platform === cheapest.platform;
        var color = PLATFORM_COLORS[p.platform] || '#888';
        return '<div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:' + color + ';font-weight:600;">' + p.platform + '</span><span>' + (isBest ? '✅ ' : '') + 'RM ' + p.price.toFixed(2) + '</span></div>';
      }).join('') + '</div></div>';
    }
  }
  if (!hasCompare) crossHtml = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div>No cross-platform matches found yet. Add more parcels!</div></div>';
  var elCross = document.getElementById("crossPlatformContent");
  if (elCross) elCross.innerHTML = crossHtml;
}
function addPriceEntry() {
  var item = prompt("Item name:");
  if (!item) return;
  var platform = prompt("Platform (Shopee/Shopee Direct/Lazada/TikTok/Temu):", "Shopee");
  var price = parseFloat(prompt("Price (RM):", "0")) || 0;
  var date = prompt("Date (YYYY-MM-DD):", new Date().toISOString().slice(0,10));
  var notes = prompt("Notes (optional):", "");
  priceHistory.push({item: item, platform: platform || "Shopee", price: price, date: date, notes: notes});
  saveData();
  renderPriceTracker();
  showToast("💰 Price entry added!", "success");
}

// ===================== PRICE EXTRACTION FROM PARCELS =====================
function extractPricesFromParcels() {
  var extracted = 0;
  var seenKeys = {};

  // Build existing price keys to avoid duplicates
  priceHistory.forEach(function(ph) {
    var key = (ph.item || "").toLowerCase().trim() + "|" + (ph.platform || "") + "|" + ph.price;
    seenKeys[key] = true;
  });

  parcels.forEach(function(p) {
    if (!p.item || p.price <= 0) return;

    // Extract unit price from item description
    var unitPrice = extractUnitPrice(p.item, p.price, p.qty);
    if (!unitPrice || unitPrice <= 0) return;

    // Normalize item name (remove quantities, prices, variant details)
    var itemName = normalizeItemName(p.item);
    if (!itemName) return;

    var key = itemName.toLowerCase() + "|" + p.platform + "|" + unitPrice;
    if (seenKeys[key]) return;

    // Try to extract date from remark or use a default
    var date = extractDateFromRemark(p.remark) || extractDateFromTracking(p.tracking) || "2026-01-01";

    priceHistory.push({
      item: itemName,
      platform: p.platform,
      price: unitPrice,
      date: date,
      notes: "Auto-extracted from parcel #" + p.id + " (qty " + p.qty + ", total RM" + p.price.toFixed(2) + ")"
    });
    seenKeys[key] = true;
    extracted++;
  });

  if (extracted > 0) {
    saveData();
    renderPriceTracker();
    showToast("💰 Extracted " + extracted + " price entries from parcels!", "success");
  } else {
    showToast("ℹ️ No new price entries found in parcels", "info");
  }
  return extracted;
}

function extractUnitPrice(itemDesc, totalPrice, qty) {
  if (!itemDesc || qty <= 0 || totalPrice <= 0) return 0;

  // Try to find explicit per-unit prices in the description
  // Patterns: "RM15.00 each", "@RM15", "RM15/pc", "15.00 x 5", etc.
  var patterns = [
    /RM?\s*(\d+\.?\d*)\s*(?:each|ea|pc|pcs|piece|unit|set)/i,
    /@\s*RM?\s*(\d+\.?\d*)/i,
    /RM?\s*(\d+\.?\d*)\s*(?:x|\*)/i,
    /(?:price|cost)\s*[:]?\s*RM?\s*(\d+\.?\d*)/i,
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = itemDesc.match(patterns[i]);
    if (match) {
      var price = parseFloat(match[1]);
      if (price > 0 && price <= totalPrice * 2) { // Sanity check
        return Math.round(price * 100) / 100;
      }
    }
  }

  // Fallback: divide total by quantity for a per-unit estimate
  var unitPrice = totalPrice / qty;
  return Math.round(unitPrice * 100) / 100;
}

function normalizeItemName(itemDesc) {
  if (!itemDesc) return "";

  // Remove quantity patterns
  var cleaned = itemDesc
    .replace(/\d+\s*(pcs?|pieces?|units?|sets?|boxes?|packs?|sachets?|bottles?|pcs)\s*/gi, " ")
    .replace(/\d+\s*x\s*\d+/gi, " ")
    .replace(/RM?\s*\d+\.?\d*\s*(each|ea|pc|set)?/gi, " ")
    .replace(/@\s*RM?\s*\d+\.?\d*/gi, " ")
    .replace(/total\s*RM?\s*\d+\.?\d*/gi, " ")
    .replace(/subtotal\s*RM?\s*\d+\.?\d*/gi, " ")
    .replace(/\d+\s*(g|ml|mg|kg|oz|lb)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > 80) cleaned = cleaned.substring(0, 80) + "...";
  return cleaned || itemDesc.substring(0, 60);
}

function extractKeywords(itemDesc) {
  // Extract brand/product keywords for fuzzy matching
  if (!itemDesc) return [];

  var text = itemDesc.toLowerCase();

  // Remove common noise words
  var noise = ["buy","free","percuma","set","combo","pakej","package","bundle","pcs","pieces","units","box","pack","sachet","bottle","total","subtotal","each","pc","set","rm","x","of","the","a","an","and","or","for","with","by","in","on","at","to","from","new","ori","original","live","exclusive","promo","sale","clearance","b1f1","buy 1 free 1"];
  noise.forEach(function(w) {
    text = text.replace(new RegExp("\\b" + w + "\\b", "gi"), " ");
  });

  // Remove numbers (quantities, prices, measurements)
  text = text.replace(/\d+\.?\d*/g, " ");
  text = text.replace(/\b(g|ml|mg|kg|oz|lb|cm|mm|inch)\b/gi, " ");

  // Extract significant words (3+ chars)
  var words = text.split(/\s+/).filter(function(w) {
    return w.length >= 3 && !/^[0-9]+$/.test(w);
  });

  // Deduplicate and sort for consistent comparison
  var unique = [];
  words.forEach(function(w) {
    if (unique.indexOf(w) === -1) unique.push(w);
  });
  return unique.sort();
}

function keywordSimilarity(keywordsA, keywordsB) {
  // Jaccard similarity: intersection / union
  if (keywordsA.length === 0 || keywordsB.length === 0) return 0;

  var intersection = 0;
  keywordsA.forEach(function(w) {
    if (keywordsB.indexOf(w) >= 0) intersection++;
  });

  var union = keywordsA.length + keywordsB.length - intersection;
  return union > 0 ? intersection / union : 0;
}

function findKeywordMatches() {
  // Group parcels by keyword similarity instead of exact name
  var groups = [];
  var assigned = {};

  parcels.forEach(function(p, idx) {
    if (assigned[idx] || !p.item || p.price <= 0) return;

    var keywords = extractKeywords(p.item);
    if (keywords.length === 0) return;

    var group = { items: [p], keywords: keywords, platforms: {}, totalQty: p.qty };
    group.platforms[p.platform] = true;
    assigned[idx] = true;

    // Find similar items
    for (var j = idx + 1; j < parcels.length; j++) {
      if (assigned[j] || !parcels[j].item || parcels[j].price <= 0) continue;

      var otherKeywords = extractKeywords(parcels[j].item);
      if (otherKeywords.length === 0) continue;

      var sim = keywordSimilarity(keywords, otherKeywords);
      // Match if similarity >= 0.35 (35% shared keywords) OR if they share a brand name
      var sharedBrand = hasSharedBrand(p.item, parcels[j].item);

      if (sim >= 0.35 || sharedBrand) {
        group.items.push(parcels[j]);
        group.platforms[parcels[j].platform] = true;
        group.totalQty += parcels[j].qty;
        // Merge keywords
        otherKeywords.forEach(function(w) {
          if (group.keywords.indexOf(w) === -1) group.keywords.push(w);
        });
        group.keywords.sort();
        assigned[j] = true;
      }
    }

    if (group.items.length >= 2) {
      groups.push(group);
    }
  });

  return groups.sort(function(a,b){return b.items.length - a.items.length;});
}

function hasSharedBrand(itemA, itemB) {
  // Check if two items share a known brand name
  var brands = ["glad2glow","g2g","skintific","meryem","teashell","dherbs","kopi che","lipobond","mossdoom","bostanten","kstyle","as new","heymolly","eelhoe","gmeelan","totaria","be bodywise","seapuri","qinqing","cran lite","drontal","nanovet","anker","ugreen","meegoo","lenovo","springo","furvit","pttang","mama oriental","avon","withyoo","baiyaolang","bai fu ling","baiyaulang","putih","meryem","teashell","latte","butterbean","kopi","chelims","pakej","sayang","borong","mantul","jeragat","glowing","madame","mariviyah","marivyah","mariyah","delima","lips","butter","combo","pht","cht","elite","booster","apple","spanish"];

  var a = itemA.toLowerCase();
  var b = itemB.toLowerCase();

  for (var i = 0; i < brands.length; i++) {
    if (a.indexOf(brands[i]) >= 0 && b.indexOf(brands[i]) >= 0) {
      return true;
    }
  }
  return false;
}

function getKeywordMatchPriceRange(group) {
  var prices = group.items.map(function(p){return p.price / p.qty;}).filter(function(p){return p > 0;});
  if (prices.length === 0) return "N/A";
  var min = Math.min.apply(null, prices);
  var max = Math.max.apply(null, prices);
  if (min === max) return "RM " + min.toFixed(2);
  return "RM " + min.toFixed(2) + " - " + max.toFixed(2);
}

function extractDateFromRemark(remark) {
  if (!remark) return null;
  // Look for dates in format DD-MM-YYYY or YYYY-MM-DD in remark
  var match = remark.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  match = remark.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (match) return match[3] + "-" + match[2] + "-" + match[1];
  return null;
}

function extractDateFromTracking(tracking) {
  // Some tracking numbers encode dates, but mostly return null
  // This is a placeholder for future smart extraction
  return null;
}

function showPriceMatches() {
  var matches = findPriceMatches();
  var container = document.getElementById("priceTrackerContent");
  if (!container) return;

  if (matches.length === 0) {
    showToast("ℹ️ No multi-order items found for price comparison", "info");
    return;
  }

  var html = '<div style="margin-bottom:16px;"><strong>🔍 Keyword-matched items with multiple orders:</strong></div>';
  html += '<div style="max-height:300px;overflow-y:auto;">';
  matches.forEach(function(m) {
    html += '<div style="padding:10px;margin-bottom:8px;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:border-color 0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">';
    html += '<div style="font-weight:700;font-size:0.9rem;">' + m.name + '</div>';
    html += '<div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;font-style:italic;">Keywords: ' + m.keywords + '</div>';
    html += '<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:3px;">';
    html += m.count + ' orders across ' + m.platforms + ' | Per-unit: ' + m.priceRange;
    html += '</div></div>';
  });
  html += '</div>';
  html += '<div style="margin-top:10px;font-size:0.78rem;color:var(--text-secondary);">💡 Items are matched by shared brand names & keywords, even with different descriptions. Click "📦 Extract from Parcels" to auto-add to price history.</div>';

  container.innerHTML = html;
  showToast("🔍 Found " + matches.length + " keyword-matched item groups", "success");
}

function findPriceMatches() {
  // Use keyword-based matching for better grouping
  var groups = findKeywordMatches();

  return groups.map(function(g) {
    var platforms = {};
    g.items.forEach(function(p) { platforms[p.platform] = true; });
    return {
      name: g.items[0].item.substring(0, 50),
      count: g.items.length,
      platforms: Object.keys(platforms).join(", "),
      priceRange: getKeywordMatchPriceRange(g),
      keywords: g.keywords.slice(0, 6).join(", ")
    };
  }).slice(0, 15);
}

function getPriceRange(group) {
  var prices = group.map(function(p){return p.price / p.qty;}).filter(function(p){return p > 0;});
  if (prices.length === 0) return "N/A";
  var min = Math.min.apply(null, prices);
  var max = Math.max.apply(null, prices);
  if (min === max) return "RM " + min.toFixed(2);
  return "RM " + min.toFixed(2) + " - " + max.toFixed(2);
}

// ===================== NUJ ESTIMATOR =====================
function calculateEstimate() {
  var platform = document.getElementById("estPlatform").value;
  var qty = parseInt(document.getElementById("estQty").value) || 1;
  var category = document.getElementById("estCategory").value;
  var price = parseFloat(document.getElementById("estPrice").value) || 0;

  // Base cost based on quantity (from data analysis)
  var base = 3;
  if (qty <= 5) base = 3 + (qty - 1) * 0.5;
  else if (qty <= 10) base = 5 + (qty - 5) * 0.8;
  else if (qty <= 20) base = 9 + (qty - 10) * 0.7;
  else if (qty <= 50) base = 16 + (qty - 20) * 0.5;
  else base = 31 + (qty - 50) * 0.3;

  // Platform adjustment
  if (platform === "TikTok") base *= 1.1;
  if (platform === "Lazada") base *= 0.95;

  // Category adjustment
  if (category === "Elec. Appl.") base *= 1.2;
  if (category === "Health Care") base *= 1.1;
  if (category === "Fashion Acc") base *= 0.9;

  // Price adjustment (high value = slightly more)
  if (price > 500) base += 2;
  if (price > 1000) base += 3;

  var estimate = Math.round(base * 100) / 100;
  var elAmt = document.getElementById("estimateAmount");
  if (elAmt) elAmt.textContent = "$" + estimate.toFixed(2);
  var elNote = document.getElementById("estimateNote");
  if (elNote) elNote.textContent = "Estimated NUJ collection cost for " + qty + " " + category + " item(s) from " + platform;
  var elBreak = document.getElementById("estimateBreakdown");
  if (elBreak) {
    elBreak.innerHTML = '<div class="estimate-row"><span class="modal-label">Base cost (qty)</span><span class="modal-value">$' + base.toFixed(2) + '</span></div>' +
      '<div class="estimate-row"><span class="modal-label">Platform</span><span class="modal-value">' + platform + '</span></div>' +
      '<div class="estimate-row"><span class="modal-label">Category</span><span class="modal-value">' + category + '</span></div>' +
      '<div class="estimate-row"><span class="modal-label">Item value</span><span class="modal-value">RM ' + price.toFixed(2) + '</span></div>';
  }
}
function renderNUJHistory() {
  var withCost = parcels.filter(function(p){return p.nujCost > 0;});
  if (withCost.length === 0) {
    var el = document.getElementById("nujHistoryContent");
    if (el) el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>No NUJ cost data available yet.</div></div>';
    return;
  }
  // Average by platform
  var platformCosts = {};
  var platformCounts = {};
  withCost.forEach(function(p) {
    if (!platformCosts[p.platform]) { platformCosts[p.platform] = 0; platformCounts[p.platform] = 0; }
    platformCosts[p.platform] += p.nujCost;
    platformCounts[p.platform]++;
  });
  var html = '<div style="margin-bottom:12px;"><strong>Average NUJ Cost by Platform:</strong></div>';
  for (var pl in platformCosts) {
    var avg = platformCosts[pl] / platformCounts[pl];
    html += '<div class="bar-row"><span class="bar-label">' + pl + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, avg * 5) + '%;background:' + (PLATFORM_COLORS[pl] || '#888') + '"></div></div><span class="bar-value">$' + avg.toFixed(2) + '</span></div>';
  }
  // Average by qty range
  html += '<div style="margin:16px 0 12px;"><strong>Average by Quantity:</strong></div>';
  var ranges = [["1-5",1,5],["6-10",6,10],["11-20",11,20],["21-50",21,50],["51+",51,999]];
  ranges.forEach(function(r) {
    var subset = withCost.filter(function(p){return p.qty >= r[1] && p.qty <= r[2];});
    if (subset.length > 0) {
      var avg = subset.reduce(function(s,p){return s+p.nujCost},0) / subset.length;
      html += '<div class="bar-row"><span class="bar-label">' + r[0] + ' items</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.min(100, avg * 5) + '%;background:var(--accent)"></div></div><span class="bar-value">$' + avg.toFixed(2) + '</span></div>';
    }
  });
  var el = document.getElementById("nujHistoryContent");
  if (el) el.innerHTML = html;
}

// ===================== SIDE QUESTS =====================
function startSortGame() {
  if (activeGame) return;
  activeGame = 'sort';
  document.getElementById('questSorter').classList.add('playing');
  var area = document.getElementById('sortGameArea');
  area.style.display = 'block';

  var statuses = ['Pending', 'Delivered', 'Scheduled'];
  var parcelsToSort = [];
  for (var i = 0; i < 8; i++) {
    var st = statuses[Math.floor(Math.random() * statuses.length)];
    parcelsToSort.push({id: i, name: 'Parcel #' + (i+1), status: st});
  }

  var score = 0;
  var total = parcelsToSort.length;
  area.innerHTML = '<div style="text-align:center;margin-bottom:10px;"><strong>Sort the parcels!</strong> Drag or click to move.</div>' +
    '<div class="sort-game"><div class="sort-belt" id="sortBelt">' + parcelsToSort.map(function(p) {
      return '<div class="sort-parcel" data-status="' + p.status + '" id="sort-' + p.id + '" draggable="true" onclick="moveParcel(this)">' + p.name + '</div>';
    }).join('') + '</div>' +
    '<div style="display:flex;gap:10px;">' +
    '<div class="sort-bin" data-target="Pending"><div class="sort-bin-label">⏳ Pending</div><div class="bin-contents" id="bin-Pending"></div></div>' +
    '<div class="sort-bin" data-target="Delivered"><div class="sort-bin-label">✅ Delivered</div><div class="bin-contents" id="bin-Delivered"></div></div>' +
    '<div class="sort-bin" data-target="Scheduled"><div class="sort-bin-label">📅 Scheduled</div><div class="bin-contents" id="bin-Scheduled"></div></div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:10px;font-size:1.2rem;font-weight:800;" id="sortScore">Score: 0 / ' + total + '</div>' +
    '<div style="text-align:center;"><button class="btn btn-danger" onclick="stopSortGame()">Stop Game</button></div></div>';

  // Drag and drop
  var dragged = null;
  area.querySelectorAll('.sort-parcel').forEach(function(el) {
    el.addEventListener('dragstart', function(e) { dragged = el; });
  });
  area.querySelectorAll('.sort-bin').forEach(function(bin) {
    bin.addEventListener('dragover', function(e) { e.preventDefault(); });
    bin.addEventListener('drop', function(e) {
      e.preventDefault();
      if (dragged) {
        var target = bin.dataset.target;
        var correct = dragged.dataset.status === target;
        if (correct) {
          bin.querySelector('.bin-contents').appendChild(dragged);
          dragged.style.pointerEvents = 'none';
          dragged.style.opacity = '0.6';
          score++;
          document.getElementById('sortScore').textContent = 'Score: ' + score + ' / ' + total;
          if (score === total) {
            player.gameXP += 50;
            saveData(); updateLevel();
            showToast('🎉 Parcel Sorter complete! +50 XP', 'xp');
            setTimeout(stopSortGame, 1500);
          }
        } else {
          bin.classList.add('wrong');
          setTimeout(function(){bin.classList.remove('wrong');}, 500);
        }
        dragged = null;
      }
    });
  });
}
function moveParcel(el) {
  if (!activeGame || activeGame !== 'sort') return;
  var status = el.dataset.status;
  var bin = document.getElementById('bin-' + status);
  if (bin && bin.querySelector('.bin-contents')) {
    bin.querySelector('.bin-contents').appendChild(el);
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.6';
    var scoreEl = document.getElementById('sortScore');
    if (scoreEl) {
      var parts = scoreEl.textContent.match(/\d+/g);
      var score = parseInt(parts[0]) + 1;
      var total = parseInt(parts[1]);
      scoreEl.textContent = 'Score: ' + score + ' / ' + total;
      if (score === total) {
        player.gameXP += 50;
        saveData(); updateLevel();
        showToast('🎉 Parcel Sorter complete! +50 XP', 'xp');
        setTimeout(stopSortGame, 1500);
      }
    }
  }
}
function stopSortGame() {
  activeGame = null;
  document.getElementById('questSorter').classList.remove('playing');
  document.getElementById('sortGameArea').style.display = 'none';
}

function startMemoryGame() {
  if (activeGame) return;
  activeGame = 'memory';
  document.getElementById('questMemory').classList.add('playing');
  var area = document.getElementById('memoryGameArea');
  area.style.display = 'block';

  var platforms = ['📦', '📦', '🛒', '🛒', '🍊', '🍊', '🎵', '🎵', '💄', '💄', '💊', '💊'];
  // Shuffle
  for (var i = platforms.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = platforms[i]; platforms[i] = platforms[j]; platforms[j] = temp;
  }

  var flipped = [];
  var matched = 0;
  var moves = 0;
  var canFlip = true;

  area.innerHTML = '<div style="text-align:center;margin-bottom:10px;"><strong>Match the platforms!</strong></div>' +
    '<div class="memory-grid" id="memoryGrid"></div>' +
    '<div style="text-align:center;margin-top:10px;font-size:1.2rem;font-weight:800;" id="memoryScore">Matches: 0 / 6</div>' +
    '<div style="text-align:center;"><button class="btn btn-danger" onclick="stopMemoryGame()">Stop Game</button></div>';

  var grid = document.getElementById('memoryGrid');
  platforms.forEach(function(icon, idx) {
    var card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.icon = icon;
    card.dataset.idx = idx;
    card.textContent = '❓';
    card.onclick = function() {
      if (!canFlip || card.classList.contains('flipped') || card.classList.contains('matched')) return;
      card.classList.add('flipped');
      card.textContent = icon;
      flipped.push(card);
      if (flipped.length === 2) {
        moves++;
        canFlip = false;
        if (flipped[0].dataset.icon === flipped[1].dataset.icon) {
          flipped[0].classList.add('matched');
          flipped[1].classList.add('matched');
          matched++;
          document.getElementById('memoryScore').textContent = 'Matches: ' + matched + ' / 6';
          flipped = [];
          canFlip = true;
          if (matched === 6) {
            player.gameXP += 30;
            saveData(); updateLevel();
            showToast('🎉 Platform Matcher complete! +30 XP', 'xp');
            setTimeout(stopMemoryGame, 1500);
          }
        } else {
          setTimeout(function() {
            flipped[0].classList.remove('flipped');
            flipped[1].classList.remove('flipped');
            flipped[0].textContent = '❓';
            flipped[1].textContent = '❓';
            flipped = [];
            canFlip = true;
          }, 800);
        }
      }
    };
    grid.appendChild(card);
  });
}
function stopMemoryGame() {
  activeGame = null;
  document.getElementById('questMemory').classList.remove('playing');
  document.getElementById('memoryGameArea').style.display = 'none';
}

function startClickerGame() {
  if (activeGame) return;
  activeGame = 'clicker';
  document.getElementById('questClicker').classList.add('playing');
  var area = document.getElementById('clickerGameArea');
  area.style.display = 'block';

  var score = 0;
  var timeLeft = 15;
  var targets = ['💰', '📦', '💎', '🎁', '🔥'];
  var values = [10, 5, 20, 15, 25];

  area.innerHTML = '<div style="text-align:center;margin-bottom:10px;"><strong>Click the best deals!</strong></div>' +
    '<div class="clicker-score" id="clickerScore">Score: 0</div>' +
    '<div class="clicker-timer" id="clickerTimer">Time: 15s</div>' +
    '<div class="clicker-target" id="clickerTarget">📦</div>' +
    '<div style="text-align:center;"><button class="btn btn-danger" onclick="stopClickerGame()">Stop Game</button></div>';

  var targetEl = document.getElementById('clickerTarget');
  var scoreEl = document.getElementById('clickerScore');
  var timerEl = document.getElementById('clickerTimer');

  function spawnTarget() {
    var idx = Math.floor(Math.random() * targets.length);
    targetEl.textContent = targets[idx];
    targetEl.dataset.value = values[idx];
    targetEl.style.transform = 'scale(' + (0.8 + Math.random() * 0.4) + ')';
    targetEl.style.filter = 'hue-rotate(' + Math.random() * 360 + 'deg)';
  }
  spawnTarget();

  targetEl.onclick = function() {
    score += parseInt(targetEl.dataset.value);
    scoreEl.textContent = 'Score: ' + score;
    spawnTarget();
  };

  var timer = setInterval(function() {
    timeLeft--;
    timerEl.textContent = 'Time: ' + timeLeft + 's';
    if (timeLeft <= 0) {
      clearInterval(timer);
      var bonus = Math.floor(score / 10);
      player.gameXP += bonus;
      saveData(); updateLevel();
      showToast('🎉 Price Hunter complete! +' + bonus + ' XP', 'xp');
      setTimeout(stopClickerGame, 2000);
    }
  }, 1000);
  window.clickTimer = timer;
}
function stopClickerGame() {
  if (window.clickTimer) clearInterval(window.clickTimer);
  activeGame = null;
  document.getElementById('questClicker').classList.remove('playing');
  document.getElementById('clickerGameArea').style.display = 'none';
}

function startDecoderGame() {
  if (activeGame) return;
  activeGame = 'decoder';
  document.getElementById('questDecoder').classList.add('playing');
  var area = document.getElementById('decoderGameArea');
  area.style.display = 'block';

  var trackingSamples = parcels.slice(0, 10).map(function(p){return p.tracking;});
  if (trackingSamples.length === 0) trackingSamples = ['ABC123', 'XYZ789', 'DEF456', 'GHI012'];
  var current = trackingSamples[Math.floor(Math.random() * trackingSamples.length)];
  var scrambled = current.split('').sort(function(){return 0.5 - Math.random();}).join('');
  var timeLeft = 20;
  var solved = false;

  area.innerHTML = '<div style="text-align:center;margin-bottom:10px;"><strong>Unscramble the tracking number!</strong></div>' +
    '<div style="font-family:monospace;font-size:1.5rem;font-weight:800;text-align:center;padding:15px;background:var(--bg);border-radius:10px;letter-spacing:3px;" id="decoderScrambled">' + scrambled + '</div>' +
    '<div style="text-align:center;margin:10px 0;"><input type="text" id="decoderInput" placeholder="Type the tracking number..." style="padding:10px 14px;font-size:1rem;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);width:80%;max-width:300px;" onkeyup="checkDecoder(event)"></div>' +
    '<div class="clicker-timer" id="decoderTimer">Time: 20s</div>' +
    '<div style="text-align:center;"><button class="btn btn-danger" onclick="stopDecoderGame()">Stop Game</button></div>';

  document.getElementById('decoderInput').focus();
  window.decoderAnswer = current;

  var timer = setInterval(function() {
    timeLeft--;
    var elTimer = document.getElementById('decoderTimer');
    if (elTimer) elTimer.textContent = 'Time: ' + timeLeft + 's';
    if (timeLeft <= 0 && !solved) {
      clearInterval(timer);
      showToast('⏰ Time up! Answer was: ' + current, 'danger');
      setTimeout(stopDecoderGame, 2000);
    }
  }, 1000);
  window.decoderTimer = timer;
}
function checkDecoder(e) {
  if (e.key === 'Enter') {
    var input = document.getElementById('decoderInput').value.trim();
    if (input === window.decoderAnswer) {
      if (window.decoderTimer) clearInterval(window.decoderTimer);
      player.gameXP += 25;
      saveData(); updateLevel();
      showToast('🎉 Tracking Decoder complete! +25 XP', 'xp');
      setTimeout(stopDecoderGame, 1500);
    }
  }
}
function stopDecoderGame() {
  if (window.decoderTimer) clearInterval(window.decoderTimer);
  activeGame = null;
  document.getElementById('questDecoder').classList.remove('playing');
  document.getElementById('decoderGameArea').style.display = 'none';
}

// ===================== MODAL ACTIONS =====================
function openModal(id) {
  currentModalId = id;
  var p = parcels.find(function(x){return x.id === id;});
  if (!p) return;
  var content = document.getElementById("modalContent");
  content.innerHTML =
    '<div class="modal-row"><span class="modal-label">Platform</span><span class="modal-value">' + p.platform + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Tracking</span><span class="modal-value" style="font-family:monospace;font-size:0.8rem;">' + p.tracking + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Category</span><span class="modal-value">' + p.category + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Item</span><span class="modal-value">' + p.item + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Quantity</span><span class="modal-value">' + p.qty + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Price (RM)</span><span class="modal-value">' + p.price.toFixed(2) + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Pickup Code</span><span class="modal-value">' + (p.pickupCode || '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">NUJ Cost</span><span class="modal-value">' + (p.nujCost ? p.nujCost.toFixed(2) : '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Status</span><span class="modal-value"><span class="status-badge ' + (STATUS_COLORS[p.status]||'status-pending') + '">' + p.status + '</span></span></div>' +
    '<div class="modal-row"><span class="modal-label">Remark</span><span class="modal-value">' + (p.remark || '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">For</span><span class="modal-value">' + p.for + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Purchased by</span><span class="modal-value">' + (p.boughtBy || '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Ordered</span><span class="modal-value">' + (p.ordered || '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Estimated delivery</span><span class="modal-value">' + (p.expected ? p.expected + (p.expectedEnd ? ' to ' + p.expectedEnd : '') : '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Arrived at branch</span><span class="modal-value">' + (p.arrived || '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Delivered</span><span class="modal-value">' + (p.delivered || '-') + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Reorder after</span><span class="modal-value">' + (p.reorderDays ? p.reorderDays + ' days' : '-') + '</span></div>';
  document.getElementById("modal").classList.add("show");
}
function closeModal() { document.getElementById("modal").classList.remove("show"); currentModalId = null; }
function cycleStatus() {
  if (!currentModalId) return;
  var p = parcels.find(function(x){return x.id === currentModalId;});
  if (!p) return;
  var idx = STATUS_CYCLE.indexOf(p.status);
  p.status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  if (p.status === "Delivered" && !p.delivered) p.delivered = ParcelModel.todayISO();
  saveData(); renderAll(); openModal(currentModalId);
  showToast("Status updated to " + p.status, "success");
}
function cycleStatusId(id) {
  var p = parcels.find(function(x){return x.id === id;});
  if (!p) return;
  var idx = STATUS_CYCLE.indexOf(p.status);
  p.status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  if (p.status === "Delivered" && !p.delivered) p.delivered = ParcelModel.todayISO();
  saveData(); renderAll();
  showToast("#" + id + " → " + p.status, "success");
}
function deleteCurrent() {
  if (!currentModalId) return;
  deleteId(currentModalId);
  closeModal();
}

function editCurrent() {
  if (!currentModalId) { alert("Error: No parcel selected"); return; }
  var editId = currentModalId;
  var p = parcels.find(function(x){return x.id === editId;});
  if (!p) { alert("Error: Parcel #" + editId + " not found in data"); return; }
  closeModal();
  // Populate form
  document.getElementById("apTracking").value = p.tracking;
  document.querySelectorAll('input[name="apFor"]').forEach(function(r){r.checked = r.value === p.for;});
  var catChip = document.querySelector('.cat-chip[data-cat="' + p.category + '"]');
  if (catChip) selectCat(catChip);
  else { document.querySelectorAll('.cat-chip').forEach(function(c){c.classList.remove('active');}); document.getElementById('apCategory').value = p.category; }
  document.getElementById("apItem").value = p.item;
  document.getElementById("apQty").value = p.qty;
  document.getElementById("apPrice").value = p.price;
  document.getElementById("apRemark").value = p.remark || "";
  document.querySelectorAll('input[name="apPlatform"]').forEach(function(r){r.checked = r.value === p.platform;});
  document.getElementById("apStatus").value = p.status;
  document.getElementById("apPickupCode").value = p.pickupCode || "";
  document.getElementById("apNujCost").value = p.nujCost || 0;
  setParcelFormExtras(p);
  // Show edit modal
  document.getElementById("addParcelModal").classList.add("show");
  document.getElementById("addParcelModal").dataset.editId = String(editId);
  document.getElementById("submitParcelBtn").textContent = "💾 Save Changes";
}
function deleteId(id) {
  if (!confirm("Delete parcel #" + id + "?")) return;
  parcels = parcels.filter(function(p){return p.id !== id;});
  saveData(); renderAll();
  showToast("Parcel #" + id + " deleted", "danger");
}
// Fields added with the reminders update: purchased-by, dates, reorder interval.
function setParcelFormExtras(p) {
  var ids = { apOrdered: "ordered", apExpected: "expected", apExpectedEnd: "expectedEnd", apArrived: "arrived", apDelivered: "delivered", apReorder: "reorderDays" };
  Object.keys(ids).forEach(function(id){ var el = document.getElementById(id); if (el) el.value = (p && p[ids[id]]) || ""; });
  document.querySelectorAll('input[name="apBought"]').forEach(function(r){ r.checked = r.value === ((p && p.boughtBy) || "San"); });
}
function readParcelFormExtras() {
  function v(id){ var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  var b = document.querySelector('input[name="apBought"]:checked');
  return { boughtBy: b ? b.value : "San", ordered: v("apOrdered"), expected: v("apExpected"), expectedEnd: v("apExpectedEnd"), arrived: v("apArrived"),
           delivered: v("apDelivered"), reorderDays: parseInt(v("apReorder")) || 0 };
}
function addParcel() {
  document.getElementById("addParcelModal").classList.add("show");
  document.getElementById("addParcelModal").dataset.editId = "";
  // Reset form
  document.getElementById("apTracking").value = "";
  document.getElementById("apItem").value = "";
  document.getElementById("apQty").value = "1";
  document.getElementById("apPrice").value = "0";
  document.getElementById("apRemark").value = "";
  document.getElementById("apStatus").value = "Pending";
  document.getElementById("apPickupCode").value = "";
  document.getElementById("apNujCost").value = "0";
  setParcelFormExtras(null);
  document.querySelectorAll('input[name="apPlatform"]').forEach(function(r){r.checked = r.value === "Shopee";});
  document.querySelectorAll('input[name="apFor"]').forEach(function(r){r.checked = r.value === "Aisyah";});
  selectCat(document.querySelector('.cat-chip[data-cat="OTHERS"]'));
  document.getElementById("apTracking").focus();
  // Reset submit button text
  var submitBtn = document.getElementById("submitParcelBtn");
  if (submitBtn) submitBtn.textContent = "📦 Register Parcel";
}
function closeAddParcelModal() {
  console.log("closeAddParcelModal called");
  document.getElementById("addParcelModal").classList.remove("show");
  document.getElementById("addParcelModal").dataset.editId = "";
  // Reset form
  document.getElementById("apTracking").value = "";
  document.getElementById("apItem").value = "";
  document.getElementById("apQty").value = "1";
  document.getElementById("apPrice").value = "0";
  document.getElementById("apRemark").value = "";
  document.getElementById("apStatus").value = "Pending";
  document.getElementById("apPickupCode").value = "";
  document.getElementById("apNujCost").value = "0";
  setParcelFormExtras(null);
  document.querySelectorAll('input[name="apPlatform"]').forEach(function(r){r.checked = r.value === "Shopee";});
  document.querySelectorAll('input[name="apFor"]').forEach(function(r){r.checked = r.value === "Aisyah";});
  selectCat(document.querySelector('.cat-chip[data-cat="OTHERS"]'));
  // Reset submit button text
  var submitBtn = document.getElementById("submitParcelBtn");
  if (submitBtn) submitBtn.textContent = "📦 Register Parcel";
}
function selectCat(btn) {
  document.querySelectorAll('.cat-chip').forEach(function(c){c.classList.remove('active');});
  btn.classList.add('active');
  document.getElementById('apCategory').value = btn.dataset.cat;
}
function submitAddParcel() {
  var tracking = document.getElementById("apTracking").value.trim();
  if (!tracking) { showToast("Tracking number is required", "danger"); return; }
  var platform = document.querySelector('input[name="apPlatform"]:checked').value;
  var forWho = document.querySelector('input[name="apFor"]:checked').value;
  var category = document.getElementById("apCategory").value;
  var item = document.getElementById("apItem").value.trim() || "New Item";
  var qty = parseInt(document.getElementById("apQty").value) || 1;
  var price = parseFloat(document.getElementById("apPrice").value) || 0;
  var status = document.getElementById("apStatus").value;
  var remark = document.getElementById("apRemark").value.trim();
  var extras = readParcelFormExtras();

  var editIdStr = document.getElementById("addParcelModal").dataset.editId;
  var editId = parseInt(editIdStr);

  if (!isNaN(editId) && editId > 0) {
    // EDIT MODE
    var idx = parcels.findIndex(function(p){return p.id === editId;});
    if (idx >= 0) {
      var pickupCode = document.getElementById("apPickupCode").value.trim();
      var nujCost = parseFloat(document.getElementById("apNujCost").value) || 0;
      parcels[idx].tracking = tracking;
      parcels[idx].platform = platform;
      parcels[idx].for = forWho;
      parcels[idx].category = category;
      parcels[idx].item = item;
      parcels[idx].qty = qty;
      parcels[idx].price = price;
      parcels[idx].pickupCode = pickupCode;
      parcels[idx].nujCost = nujCost;
      parcels[idx].status = status;
      parcels[idx].remark = remark;
      ["boughtBy","ordered","expected","expectedEnd","arrived","delivered","reorderDays"].forEach(function(k){
        if (extras[k]) parcels[idx][k] = extras[k]; else delete parcels[idx][k];
      });
      saveData(); renderAll();
      showToast("💾 Parcel #" + editId + " updated!", "success");
    } else {
      alert("ERROR: Parcel #" + editId + " not found. editIdStr was: '" + editIdStr + "'");
      showToast("❌ Parcel not found", "danger");
    }
    document.getElementById("addParcelModal").dataset.editId = "";
  } else {
    // ADD NEW - check for duplicate tracking number
    var existing = parcels.find(function(p){return p.tracking === tracking;});
    if (existing) {
      showToast("❌ Tracking number already exists! Parcel #" + existing.id + " (" + existing.platform + ")", "danger");
      return;
    }
    var newId = parcels.length > 0 ? Math.max.apply(null, parcels.map(function(p){return p.id;})) + 1 : 1;
    var pickupCode = document.getElementById("apPickupCode").value.trim();
    var nujCost = parseFloat(document.getElementById("apNujCost").value) || 0;
    parcels.push({
      id: newId, platform: platform, tracking: tracking,
      category: category, item: item, qty: qty, price: price,
      pickupCode: pickupCode, nujCost: nujCost, status: status, remark: remark, for: forWho
    });
    ["boughtBy","ordered","expected","expectedEnd","arrived","delivered","reorderDays"].forEach(function(k){
      if (extras[k]) parcels[parcels.length - 1][k] = extras[k];
    });
    saveData(); renderAll();
    showToast("📦 Parcel #" + newId + " registered! +10 XP", "xp");
  }
  closeAddParcelModal();
}

// ===================== SETTINGS =====================
function exportJSON() {
  var data = { parcels: parcels, priceHistory: priceHistory, player: player, meta: (window.getParcelMeta ? getParcelMeta() : undefined), exportedAt: new Date().toISOString() };
  var json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(function() {
    showToast("📋 JSON copied to clipboard! Paste on another device.", "success");
  }).catch(function() {
    // Fallback: create a temporary textarea
    var ta = document.createElement("textarea");
    ta.value = json;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("📋 JSON copied to clipboard! Paste on another device.", "success");
  });
}

function importJSON() {
  var input = prompt("Paste your JSON data here:");
  if (!input || !input.trim()) return;
  try {
    var data = JSON.parse(input.trim());
    if (data.parcels && Array.isArray(data.parcels)) {
      if (confirm("Import " + data.parcels.length + " parcels? This will REPLACE current data.")) {
        parcels = data.parcels;
        // Fix any duplicate IDs from imported JSON
        if (dedupParcelIds()) {
          showToast("🔧 Fixed duplicate IDs in imported JSON", "success");
        }
        if (data.priceHistory) priceHistory = data.priceHistory;
        if (data.player) player = data.player;
        saveData();
        renderAll();
        showToast("📋 JSON imported! " + data.parcels.length + " parcels loaded.", "success");
      }
    } else {
      showToast("❌ Invalid JSON format", "danger");
    }
  } catch(e) {
    showToast("❌ JSON parse error: " + e.message, "danger");
  }
}

var GIST_FILENAME = "parcel_quest_data.json";

function saveGistToken() {
  var token = document.getElementById("gistToken").value.trim();
  try { localStorage.setItem("parcelQuest_gistToken", token); } catch(e) {}
  showToast("Token saved", "success");
}
function saveGistId() {
  var id = document.getElementById("gistId").value.trim();
  try { localStorage.setItem("parcelQuest_gistId", id); } catch(e) {}
  showToast("Gist ID saved", "success");
}
function saveAutoSync() {
  var enabled = document.getElementById("autoSync").checked;
  try { localStorage.setItem("parcelQuest_autoSync", enabled ? "1" : "0"); } catch(e) {}
}
function loadGistSettings() {
  try {
    var token = localStorage.getItem("parcelQuest_gistToken");
    var gistId = localStorage.getItem("parcelQuest_gistId");
    var autoSync = localStorage.getItem("parcelQuest_autoSync");
    if (token) document.getElementById("gistToken").value = token;
    if (gistId) document.getElementById("gistId").value = gistId;
    if (autoSync === "1" && document.getElementById("autoSync")) document.getElementById("autoSync").checked = true;
  } catch(e) {}
}

function uploadToGist() {
  var token = document.getElementById("gistToken").value.trim();
  if (!token) { showToast("❌ Enter your GitHub token first", "danger"); return; }
  var gistId = document.getElementById("gistId").value.trim();
  var data = { parcels: parcels, priceHistory: priceHistory, player: player, meta: (window.getParcelMeta ? getParcelMeta() : undefined), exportedAt: new Date().toISOString() };
  var json = JSON.stringify(data, null, 2);

  var url = gistId ? "https://api.github.com/gists/" + gistId : "https://api.github.com/gists";
  var method = gistId ? "PATCH" : "POST";
  var body = JSON.stringify({
    description: "Parcel Quest data backup",
    public: false,
    files: { "parcel_quest_data.json": { content: json } }
  });

  showToast("☁️ Uploading to Gist...", "info");
  fetch(url, {
    method: method,
    headers: { 
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json"
    },
    body: body
  }).then(function(r) {
    if (!r.ok) {
      return r.text().then(function(text) { throw new Error("HTTP " + r.status + ": " + text.substring(0,200)); });
    }
    return r.json();
  }).then(function(result) {
    var newGistId = result.id;
    document.getElementById("gistId").value = newGistId;
    try { localStorage.setItem("parcelQuest_gistId", newGistId); } catch(e) {}
    showToast("☁️ Uploaded to Gist! ID: " + newGistId, "success");
  }).catch(function(err) {
    showToast("❌ Upload failed: " + err.message, "danger");
    console.error("Gist upload error:", err);
  });
}

function downloadFromGist() {
  var token = document.getElementById("gistToken").value.trim();
  var gistId = document.getElementById("gistId").value.trim();
  if (!gistId) { showToast("❌ Enter a Gist ID first", "danger"); return; }

  var headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10"
  };
  if (token) headers["Authorization"] = "Bearer " + token;

  showToast("☁️ Downloading from Gist...", "info");
  fetch("https://api.github.com/gists/" + gistId, { headers: headers })
    .then(function(r) { 
      if (!r.ok) {
        return r.text().then(function(text) { throw new Error("HTTP " + r.status + ": " + text.substring(0,200)); });
      }
      return r.json(); 
    })
    .then(function(result) {
      var file = result.files && result.files["parcel_quest_data.json"];
      if (!file) { throw new Error("parcel_quest_data.json not found in gist"); }
      var data = JSON.parse(file.content);
      if (data.parcels && Array.isArray(data.parcels) && data.parcels.length > 0) {
        if (confirm("Download " + data.parcels.length + " parcels from Gist? This will REPLACE local data.")) {
          parcels = data.parcels;
          // Fix any duplicate IDs that may exist in Gist data
          if (dedupParcelIds()) {
            showToast("🔧 Fixed duplicate IDs from Gist", "success");
          }
          if (data.priceHistory) priceHistory = data.priceHistory;
          if (data.player) player = data.player;
          if (data.meta && window.setParcelMeta) setParcelMeta(data.meta, false);
          saveData();
          renderAll();
          showToast("☁️ Downloaded " + data.parcels.length + " parcels from Gist!", "success");
        }
      } else {
        throw new Error("Invalid data format");
      }
    }).catch(function(err) {
      showToast("❌ Download failed: " + err.message, "danger");
      console.error("Gist download error:", err);
    });
}

function mergeFromGist() {
  var token = document.getElementById("gistToken").value.trim();
  var gistId = document.getElementById("gistId").value.trim();
  if (!gistId) { showToast("❌ Enter a Gist ID first", "danger"); return; }

  var headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10"
  };
  if (token) headers["Authorization"] = "Bearer " + token;

  showToast("☁️ Downloading from Gist for merge...", "info");
  fetch("https://api.github.com/gists/" + gistId, { headers: headers })
    .then(function(r) { 
      if (!r.ok) {
        return r.text().then(function(text) { throw new Error("HTTP " + r.status + ": " + text.substring(0,200)); });
      }
      return r.json(); 
    })
    .then(function(result) {
      var file = result.files && result.files["parcel_quest_data.json"];
      if (!file) { throw new Error("parcel_quest_data.json not found in gist"); }
      var data = JSON.parse(file.content);
      if (!data.parcels || !Array.isArray(data.parcels)) { throw new Error("Invalid data format"); }

      // Merge logic: add parcels from Gist that don't exist locally (by tracking number)
      var localTrackings = {};
      parcels.forEach(function(p) { localTrackings[p.tracking] = p; });

      var added = 0, updated = 0;
      data.parcels.forEach(function(gistParcel) {
        if (!gistParcel.tracking) return;
        if (!localTrackings[gistParcel.tracking]) {
          // Parcel exists in Gist but not locally - add it
          parcels.push(gistParcel);
          localTrackings[gistParcel.tracking] = gistParcel;
          added++;
        } else {
          // Parcel exists in both - optionally update if Gist is newer
          // For now, keep local version but update if status is more advanced
          var localP = localTrackings[gistParcel.tracking];
          var statusOrder = { "Pending": 0, "Scheduled": 1, "Delivered": 2, "Refunded": 3, "Cancelled": 4, "Consolidated": 5 };
          var gistStatusVal = statusOrder[gistParcel.status] || 0;
          var localStatusVal = statusOrder[localP.status] || 0;
          if (gistStatusVal > localStatusVal) {
            localP.status = gistParcel.status;
            updated++;
          }
        }
      });

      // Also merge price history (deduplicate by item+platform+price+date)
      if (data.priceHistory && Array.isArray(data.priceHistory)) {
        var localPriceKeys = {};
        priceHistory.forEach(function(ph) {
          localPriceKeys[(ph.item || "") + "|" + (ph.platform || "") + "|" + ph.price + "|" + (ph.date || "")] = true;
        });
        data.priceHistory.forEach(function(ph) {
          var key = (ph.item || "") + "|" + (ph.platform || "") + "|" + ph.price + "|" + (ph.date || "");
          if (!localPriceKeys[key]) {
            priceHistory.push(ph);
            localPriceKeys[key] = true;
          }
        });
      }

      // Merge player XP (take the higher of the two)
      if (data.player && data.player.totalXP > player.totalXP) {
        player = data.player;
      }

      if (data.meta && window.setParcelMeta) setParcelMeta(data.meta, true);

      // Fix any duplicate IDs after merge
      if (dedupParcelIds()) {
        showToast("🔧 Fixed duplicate IDs after Gist merge", "success");
      }

      saveData();
      renderAll();
      showToast("🔀 Merged! Added " + added + " new parcels, updated " + updated + " statuses. Total: " + parcels.length, "success");
    }).catch(function(err) {
      showToast("❌ Merge failed: " + err.message, "danger");
      console.error("Gist merge error:", err);
    });
}

function autoSyncFromGist() {
  try {
    var autoSync = localStorage.getItem("parcelQuest_autoSync");
    var gistId = localStorage.getItem("parcelQuest_gistId");
    if (autoSync !== "1" || !gistId) return;
    var token = localStorage.getItem("parcelQuest_gistToken") || "";
    var headers = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10"
    };
    if (token) headers["Authorization"] = "Bearer " + token;
    fetch("https://api.github.com/gists/" + gistId, { headers: headers })
      .then(function(r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function(result) {
        var file = result.files && result.files["parcel_quest_data.json"];
        if (!file) return;
        var data = JSON.parse(file.content);
        if (data.parcels && Array.isArray(data.parcels) && data.parcels.length > 0) {
          parcels = data.parcels;
          // Fix any duplicate IDs from Gist auto-sync
          if (dedupParcelIds()) {
            showToast("🔧 Fixed duplicate IDs from Gist auto-sync", "success");
          }
          if (data.priceHistory && Array.isArray(data.priceHistory)) priceHistory = data.priceHistory;
          if (data.player && typeof data.player === "object") player = data.player;
          if (data.meta && window.setParcelMeta) setParcelMeta(data.meta, false);
          saveData();
          renderAll();
          showToast("☁️ Auto-synced " + data.parcels.length + " parcels from Gist", "success");
        }
      }).catch(function(e) { console.log("Auto-sync skipped:", e.message); });
  } catch(e) {}
}

function findDuplicates() {
  var trackingMap = {};
  var duplicates = [];
  parcels.forEach(function(p) {
    var key = p.tracking;
    if (!key) return;
    if (trackingMap[key]) {
      duplicates.push({ tracking: key, parcels: [trackingMap[key], p] });
    } else {
      trackingMap[key] = p;
    }
  });
  var container = document.getElementById("duplicateCheckerContent");
  if (duplicates.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><div>No duplicates found! All tracking numbers are unique.</div></div>';
    showToast("✅ No duplicate tracking numbers found", "success");
    return;
  }
  var html = '<div style="font-size:0.85rem;margin-bottom:8px;"><strong>' + duplicates.length + ' duplicate tracking number(s) found:</strong></div>';
  html += '<div style="max-height:300px;overflow-y:auto;">';
  duplicates.forEach(function(dup, idx) {
    html += '<div style="padding:10px;margin-bottom:8px;background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-sm);">';
    html += '<div style="font-weight:700;color:var(--danger);margin-bottom:6px;">#' + (idx+1) + '. Tracking: <span style="font-family:monospace;">' + dup.tracking + '</span></div>';
    dup.parcels.forEach(function(p) {
      var statusClass = STATUS_COLORS[p.status] || "status-pending";
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);">';
      html += '<span>Parcel #' + p.id + ' — ' + p.item.substring(0,40) + (p.item.length>40?"...":"") + '</span>';
      html += '<span class="status-badge ' + statusClass + '">' + p.status + '</span>';
      html += '</div>';
    });
    html += '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
  showToast("⚠️ Found " + duplicates.length + " duplicate tracking number(s)", "warning");
}

function removeDuplicatePrompt() {
  var tracking = prompt("Enter the tracking number of the duplicate parcel to remove:");
  if (!tracking || !tracking.trim()) return;
  tracking = tracking.trim();
  var matches = parcels.filter(function(p){return p.tracking === tracking;});
  if (matches.length === 0) { showToast("❌ No parcel found with that tracking number", "danger"); return; }
  if (matches.length === 1) { showToast("ℹ️ Only one parcel found with that tracking number (not a duplicate)", "info"); return; }
  var msg = "Found " + matches.length + " parcels with tracking '" + tracking + "':";
  matches.forEach(function(p) {
    msg += " | #" + p.id + " " + p.platform + " " + p.status;
  });
  msg += " | Enter the Parcel # to DELETE (or Cancel to keep all):";
  var idToDelete = prompt(msg);
  if (!idToDelete || !idToDelete.trim()) return;
  var deleteId = parseInt(idToDelete.trim());
  if (isNaN(deleteId)) { showToast("❌ Invalid parcel number", "danger"); return; }
  var idx = parcels.findIndex(function(p){return p.id === deleteId && p.tracking === tracking;});
  if (idx < 0) { showToast("❌ Parcel #" + deleteId + " not found with that tracking number", "danger"); return; }
  if (confirm("Are you sure you want to delete Parcel #" + deleteId + "?")) {
    parcels.splice(idx, 1);
    saveData(); renderAll();
    showToast("🗑️ Parcel #" + deleteId + " deleted. Remaining with this tracking: " + (matches.length-1), "success");
  }
}

function renderSettings() {
  loadGistSettings();
  var el = document.getElementById("settingsStats");
  if (!el) return;
  var totalSpent = parcels.reduce(function(s,p){return s+p.price},0);
  var totalNUJ = parcels.reduce(function(s,p){return s+p.nujCost},0);
  var avgNUJ = parcels.filter(function(p){return p.nujCost>0}).length > 0 ? totalNUJ / parcels.filter(function(p){return p.nujCost>0}).length : 0;
  el.innerHTML =
    '<div class="modal-row"><span class="modal-label">Total Parcels</span><span class="modal-value">' + parcels.length + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Total Spent</span><span class="modal-value">RM ' + totalSpent.toFixed(2) + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Total NUJ Cost</span><span class="modal-value">$ ' + totalNUJ.toFixed(2) + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Avg NUJ Cost</span><span class="modal-value">$ ' + avgNUJ.toFixed(2) + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Price Entries</span><span class="modal-value">' + priceHistory.length + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Current Level</span><span class="modal-value">Lv. ' + player.level + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Total XP</span><span class="modal-value">' + player.totalXP + '</span></div>' +
    '<div class="modal-row"><span class="modal-label">Game XP</span><span class="modal-value">' + player.gameXP + '</span></div>';
}

// ===================== UI HELPERS =====================
function showToast(msg, type) {
  var container = document.getElementById("toastContainer");
  var toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.animation = "toastOut 0.3s forwards";
    setTimeout(function(){toast.remove();}, 300);
  }, 3000);
}
function showLevelup(lvl, title) {
  document.getElementById("levelupText").textContent = "Level " + lvl + " Reached!";
  document.getElementById("levelupSub").textContent = "You are now a " + title;
  document.getElementById("levelupOverlay").classList.add("show");
}
function closeLevelup() {
  document.getElementById("levelupOverlay").classList.remove("show");
}


function toggleTheme() {
  var body = document.body;
  var btn = document.getElementById("themeToggle");
  body.classList.toggle("light-mode");
  var isLight = body.classList.contains("light-mode");
  btn.textContent = isLight ? "☀️" : "🌙";
  btn.title = isLight ? "Switch to dark mode" : "Switch to light mode";
  try { localStorage.setItem("parcelQuest_theme", isLight ? "light" : "dark"); } catch(e) {}
  showToast(isLight ? "☀️ Light mode enabled" : "🌙 Dark mode enabled", "info");
}
function loadTheme() {
  try {
    var saved = localStorage.getItem("parcelQuest_theme");
    if (saved === "light") {
      document.body.classList.add("light-mode");
      var btn = document.getElementById("themeToggle");
      if (btn) { btn.textContent = "☀️"; btn.title = "Switch to dark mode"; }
    }
  } catch(e) {}
}

function renderAll() {
  if (window.renderToday) renderToday();
  renderDashboard();
  renderParcels();
  renderPickup();
  renderPriceTracker();
  renderSettings();
}

// ===================== AUTO-SAVE =====================
var autoSaveInterval = null;
var lastSaveTime = Date.now();

function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(function() {
    saveData();
    lastSaveTime = Date.now();
    updateSaveIndicator();
  }, 30000); // Save every 30 seconds
}

function updateSaveIndicator() {
  var el = document.getElementById("saveIndicator");
  if (!el) return;
  var seconds = Math.floor((Date.now() - lastSaveTime) / 1000);
  if (seconds < 5) {
    el.textContent = "💾 saved";
    el.style.color = "var(--success)";
    el.style.fontWeight = "600";
  } else if (seconds < 60) {
    el.textContent = "💾 saved " + seconds + "s ago";
    el.style.color = "var(--text-muted)";
    el.style.fontWeight = "400";
  } else {
    el.textContent = "💾 saved " + Math.floor(seconds / 60) + "m ago";
    el.style.color = "var(--warning)";
    el.style.fontWeight = "600";
  }
}

// Save before page refresh/close
window.addEventListener("beforeunload", function() {
  // saveData() writes to localStorage synchronously, so nothing is lost on refresh/close and no
  // "unsaved data" prompt is needed (it used to fire every time, even right after saving).
  saveData();
});

// Also save when page becomes hidden (switching apps on mobile)
document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    saveData();
    lastSaveTime = Date.now();
  }
});

// Update save indicator every 10 seconds
setInterval(updateSaveIndicator, 10000);

// ===================== INIT =====================
try {
  loadData();
} catch(e) {
  console.error("loadData failed:", e);
  parcels = JSON.parse(JSON.stringify(INITIAL_PARCELS));
  priceHistory = [];
  player = { level: 1, xp: 0, totalXP: 0, gameXP: 0 };
}
try {
  if (ParcelModel.sanitizeParcels(parcels)) saveData();
} catch(e) { console.error("sanitize failed:", e); }
try {
  loadTheme();
} catch(e) { console.error("loadTheme failed:", e); }
try {
  renderAll();
} catch(e) { console.error("renderAll failed:", e); }
try {
  startAutoSave();
} catch(e) { console.error("startAutoSave failed:", e); }
try {
  setTimeout(autoSyncFromGist, 1000);
} catch(e) { console.error("autoSync setup failed:", e); }
