// Run: node tests/model.test.js
const assert = require("assert");
const fs = require("fs");
const M = require("../js/model.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("people options", () => {
  assert.deepStrictEqual(M.FOR_OPTIONS, ["San", "Aisyah", "Joel"]);
  assert.deepStrictEqual(M.BOUGHT_OPTIONS, ["San", "KW Liang"]);
});
t("loose date parsing (receipt formats)", () => {
  assert.strictEqual(M.parseDateLoose("2026-11-07"), "2026-11-07");
  assert.strictEqual(M.parseDateLoose("07-11-2026 14:15"), "2026-11-07");
  assert.strictEqual(M.parseDateLoose("7/11/2026"), "2026-11-07");
  assert.strictEqual(M.parseDateLoose("24 October 2026, 12:17"), "2026-10-24");
  assert.strictEqual(M.parseDateLoose("8 November 2026, 16:45"), "2026-11-08");
  assert.strictEqual(M.parseDateLoose("7 Nov 2026"), "2026-11-07");
  assert.strictEqual(M.parseDateLoose("31-02-2026"), "");
  assert.strictEqual(M.parseDateLoose("7 Nov"), "");     // no year -> never guess
  assert.strictEqual(M.parseDateLoose(""), "");
});
t("date arithmetic across month/year ends", () => {
  assert.strictEqual(M.addDays("2026-12-30", 5), "2027-01-04");
  assert.strictEqual(M.diffDays("2026-11-08", "2026-11-15"), 7);
  assert.strictEqual(M.diffDays("2026-11-08", "2026-11-01"), -7);
  assert.strictEqual(M.todayISO(new Date(2026, 10, 8)), "2026-11-08");
});
t("sanitize removes receiver, validates buyer/dates/reorder", () => {
  const p = { id: 1, receiver: "GOH PAU SAN", boughtBy: "kwl", ordered: "24 October 2026", delivered: "garbage", reorderDays: "30", for: "San" };
  assert.strictEqual(M.sanitizeParcel(p), true);
  assert.ok(!("receiver" in p));
  assert.strictEqual(p.boughtBy, "KW Liang");
  assert.strictEqual(p.ordered, "2026-10-24");
  assert.ok(!("delivered" in p));
  assert.strictEqual(p.reorderDays, 30);
  assert.strictEqual(M.sanitizeParcel(p), false, "idempotent");
});
t("estimate window is kept in order and collapsed when redundant", () => {
  const swap = { expected: "2026-11-18", expectedEnd: "2026-11-12" }; M.sanitizeParcel(swap);
  assert.deepStrictEqual([swap.expected, swap.expectedEnd], ["2026-11-12", "2026-11-18"]);
  const same = { expected: "2026-11-12", expectedEnd: "2026-11-12" }; M.sanitizeParcel(same);
  assert.ok(!("expectedEnd" in same));
  const onlyEnd = { expectedEnd: "2026-11-12" }; M.sanitizeParcel(onlyEnd);
  assert.deepStrictEqual(onlyEnd, { expected: "2026-11-12" });
});
t("sanitize leaves clean parcels alone and does not invent a buyer", () => {
  const p = { id: 2, for: "Aisyah", status: "Pending" };
  assert.strictEqual(M.sanitizeParcel(p), false);
  assert.ok(!("boughtBy" in p));
});
t("seed data has no receiver names left", () => {
  const src = fs.readFileSync(__dirname + "/../js/seed.js", "utf8");
  assert.ok(!/"receiver"/.test(src), "receiver key still in seed");
  assert.ok(!/GOH PAU SAN|Goh Pau San|NUR AISYAH/i.test(src), "real name still in seed");
  const parcels = JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
  assert.strictEqual(parcels.length, 214);
  assert.strictEqual(M.sanitizeParcels(parcels), 0);
  parcels.forEach(p => assert.ok(["San", "Aisyah"].includes(p.for), "for id " + p.id));
});
console.log("\n" + n + " tests passed");
