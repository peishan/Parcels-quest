// Run: node tests/parse.test.js
const assert = require("assert");
const fs = require("fs");
const P = require("../js/parse.js");

let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("SPXMY… is already the full tracking", () => {
  const r = P.normalizeTracking("SPXMY069928741046");
  assert.deepStrictEqual([r.tracking, r.platform, r.complete], ["SPXMY069928741046", "Shopee", true]);
});
t("MY…U followed by SPX tail is trimmed to MY…U (screenshot example)", () => {
  const r = P.normalizeTracking("MY265518180161USPXLM102...");
  assert.deepStrictEqual([r.tracking, r.platform, r.complete, r.cut], ["MY265518180161U", "Shopee", true, true]);
});
t("trailing letter varies and is kept", () => {
  assert.strictEqual(P.normalizeTracking("MY264522628156TSPXLM10152651").tracking, "MY264522628156T");
  assert.strictEqual(P.normalizeTracking("MY260988669442N").tracking, "MY260988669442N");
});
t("MY…digits followed directly by SPX does not swallow the S", () => {
  assert.strictEqual(P.normalizeTracking("MY2655181801610SPXLM102").tracking, "MY2655181801610");
});
t("bare truncated MY number is flagged incomplete", () => {
  assert.strictEqual(P.normalizeTracking("MY26551818…").complete, false);
});
t("TikTok and Lazada formats", () => {
  assert.strictEqual(P.normalizeTracking("680053989206318").platform, "TikTok");
  assert.strictEqual(P.normalizeTracking("649149555250").platform, "Lazada");
});
t("extract from messy pasted text", () => {
  const txt = "ship: MY265518180161USPXLM102…\n680053989206318, 680053989206318 and spxmy069928741046; 649149555250";
  assert.deepStrictEqual(P.extractTrackingNumbers(txt).map(x => x.tracking),
    ["MY265518180161U", "680053989206318", "SPXMY069928741046", "649149555250"]);
});
t("SPXMY is not also extracted as MY…", () => {
  assert.deepStrictEqual(P.extractTrackingNumbers("SPXMY069928741046").map(x => x.tracking), ["SPXMY069928741046"]);
});
t("draft: Shopee screenshot example", () => {
  const d = P.makeDraft({ tracking: "MY265518180161USPXLM102...", platform: "Shopee",
    item: "PUTEH EDITION LUXE 1KG - PE LUXE 1 BOTOL", qty: 10, price: "RM504.60",
    category: "Health Care", status: "Delivered", boughtBy: "San", order_date: "", delivered_date: "07-11-2026 14:15", promise_date: "15-11-2026" }, []);
  assert.strictEqual(d.tracking, "MY265518180161U");
  assert.strictEqual(d.price, 504.6);
  assert.strictEqual(d.status, "Delivered");
  assert.strictEqual(d.delivered, "2026-11-07");
  assert.strictEqual(d.expected, "2026-11-15");
  assert.strictEqual(d.boughtBy, "San");
  assert.ok(!("receiver" in d));
  assert.strictEqual(d.dupOf, null);
});
t("draft: TikTok receipt example, duplicate detection", () => {
  const existing = [{ id: 7, tracking: "680053989206318" }];
  const d = P.makeDraft({ tracking: "680053989206318", item: "5pek Latte Hazelnut (30hari) HELLOFIT Coffee",
    qty: 2, price: 236.3, boughtBy: "KW Liang", order_date: "24 October 2026, 12:17", "for": "Joel" }, existing);
  assert.strictEqual(d.platform, "TikTok");
  assert.strictEqual(d.category, "Health Care");
  assert.strictEqual(d.status, "Pending");
  assert.strictEqual(d.dupOf, 7);
  assert.strictEqual(d.ordered, "2026-10-24");
  assert.strictEqual(d.boughtBy, "KW Liang");
  assert.strictEqual(d["for"], "Joel");
  const p = P.toParcel(d, 99);
  assert.ok(!("receiver" in p) && p.ordered === "2026-10-24" && p.boughtBy === "KW Liang" && !("arrived" in p));
});
t("unknown buyer/for fall back to defaults (never invented names)", () => {
  const d = P.makeDraft({ tracking: "680053989206318", boughtBy: "someone", "for": "x" }, []);
  assert.strictEqual(d.boughtBy, "San"); assert.strictEqual(d["for"], "Aisyah");
});
t("SPXMY and MY…U are never treated as the same parcel", () => {
  const d = P.makeDraft({ tracking: "MY069928741046" }, [{ id: 1, tracking: "SPXMY069928741046" }]);
  assert.strictEqual(d.dupOf, null);
});
t("findTrackingFixes trims stray SPX tails on Shopee rows only", () => {
  const f = P.findTrackingFixes([
    { id: 1, platform: "Shopee", tracking: "MY264522628156TSPXLM10152651" },
    { id: 2, platform: "Shopee", tracking: "SPXMY069928741046" },
    { id: 3, platform: "Shopee", tracking: "MY260988669442N" },
    { id: 4, platform: "TikTok", tracking: "680053989206318" }]);
  assert.deepStrictEqual(f.map(x => [x.id, x.to]), [[1, "MY264522628156T"]]);
});
t("existing seed data is clean and every number round-trips with the right platform", () => {
  const src = fs.readFileSync(__dirname + "/../js/seed.js", "utf8");
  const parcels = JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
  assert.strictEqual(parcels.length, 214);
  assert.deepStrictEqual(P.findTrackingFixes(parcels), []);
  assert.ok(!/_x0080_/.test(src), "garbled em dash still present");
  parcels.forEach(p => {
    const r = P.normalizeTracking(p.tracking);
    assert.strictEqual(r.tracking, p.tracking, "id " + p.id);
    if (r.platform) assert.strictEqual(r.platform, p.platform, "platform id " + p.id);
  });
});
console.log("\n" + n + " tests passed");
