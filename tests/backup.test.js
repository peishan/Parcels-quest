// Run: node tests/backup.test.js
const assert = require("assert");
const B = require("../js/backup.js");
const M = require("../js/model.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };
const raw = (k) => JSON.stringify(Array.from({ length: k }, (_, i) => ({ id: i + 1, tracking: "T" + i })));

t("counts parcels in saved JSON without parsing", () => { assert.strictEqual(B.countInRaw(raw(600)), 600); assert.strictEqual(B.countInRaw(null), 0); });
t("shrink guard: 600 -> 214 triggers, normal edits do not", () => {
  assert.strictEqual(B.shrankALot(600, 214), true);
  assert.strictEqual(B.shrankALot(600, 590), false, "deleting a few is fine");
  assert.strictEqual(B.shrankALot(600, 599), false);
  assert.strictEqual(B.shrankALot(10, 0), false, "tiny lists are not guarded");
  assert.strictEqual(B.shrankALot(100, 79), true);
});
t("ring keeps the newest 8 and evicts daily snapshots before safety ones", () => {
  let list = [];
  for (let i = 0; i < 3; i++) list = B.pushSnapshot(list, { ts: i, kind: "safety" }, 8);
  for (let i = 3; i < 12; i++) list = B.pushSnapshot(list, { ts: i, kind: "daily" }, 8);
  assert.strictEqual(list.length, 8);
  assert.deepStrictEqual(list.filter(s => s.kind === "safety").map(s => s.ts), [0, 1, 2], "safety copies survive");
  assert.strictEqual(list[list.length - 1].ts, 11, "newest is kept");
});
t("daily snapshot is due after ~20h", () => {
  assert.strictEqual(B.needsDaily([], 1e12), true);
  assert.strictEqual(B.needsDaily([{ ts: 1e12 - 3600e3 }], 1e12), false);
  assert.strictEqual(B.needsDaily([{ ts: 1e12 - 21 * 3600e3 }], 1e12), true);
});
t("merge never removes or overwrites local parcels (the auto-sync bug)", () => {
  const local = Array.from({ length: 600 }, (_, i) => ({ id: i + 1, tracking: "T" + i, status: i < 5 ? "Delivered" : "Pending", item: "mine" + i }));
  const gist = Array.from({ length: 214 }, (_, i) => ({ id: i + 1, tracking: "T" + i, status: "Pending", item: "OLD" + i }));
  const r = M.mergeParcels(local, gist);
  assert.deepStrictEqual(r, { added: 0, updated: 0, sharedTracking: 0 });
  assert.strictEqual(local.length, 600);
  assert.strictEqual(local[0].item, "mine0"); assert.strictEqual(local[0].status, "Delivered", "status never regresses");
});
t("merge adds parcels that exist only remotely, with safe fresh ids, and fills empty fields", () => {
  const local = [{ id: 5, tracking: "A", status: "Pending" }];
  const remote = [{ id: 1, tracking: "A", status: "Delivered", delivered: "2026-11-07", boughtBy: "KW Liang" }, { id: 5, tracking: "B", status: "Pending" }, { tracking: "" }];
  const r = M.mergeParcels(local, remote);
  assert.deepStrictEqual(r, { added: 1, updated: 1, sharedTracking: 0 });
  assert.deepStrictEqual(local.map(p => p.id), [5, 6], "no id collision");
  assert.deepStrictEqual([local[0].status, local[0].delivered, local[0].boughtBy], ["Delivered", "2026-11-07", "KW Liang"]);
});
t("exact merge (restore mode): keeps rows that share a tracking number, keeps rows with no tracking, never duplicates the same parcel", () => {
  const local = [{ id: 1, tracking: "A", platform: "Lazada", item: "Power bank (typo fixed locally)", qty: 1, price: 87.06, status: "Pending" }];
  const remote = [
    { id: 1, tracking: "A", platform: "Lazada", item: "Power bank", qty: 1, price: 87.06, status: "Delivered" },          // same parcel, item text differs -> matched
    { id: 2, tracking: "A", platform: "Lazada", item: "Placeholder", qty: 1, price: 0, status: "Cancelled" },              // shares tracking, different parcel -> added
    { id: 3, tracking: "", platform: "Shopee", item: "Cash purchase", qty: 2, price: 30, status: "Delivered" },            // no tracking -> kept
    { id: 4, tracking: "B", platform: "Shopee", item: "Tote", qty: 12, price: 718.8, status: "Pending" }];
  const plan = M.planMerge(local, remote, { exact: true });
  assert.deepStrictEqual(plan, { added: 3, updated: 1, sharedTracking: 1 });
  assert.strictEqual(local.length, 1, "planMerge must not touch the real list");
  const r = M.mergeParcels(local, remote, { exact: true });
  assert.deepStrictEqual(r, plan);
  assert.strictEqual(local.length, 4);
  assert.strictEqual(local[0].item, "Power bank (typo fixed locally)", "local text wins");
  assert.strictEqual(local[0].status, "Delivered", "but a more advanced status is taken");
  assert.deepStrictEqual(local.map(p => p.id), [1, 2, 3, 4]);
  // idempotent: merging the same file again adds nothing
  assert.deepStrictEqual(M.mergeParcels(local, remote, { exact: true }), { added: 0, updated: 0, sharedTracking: 0 });
});
t("restoring 600 into a 214 subset adds exactly the missing 386", () => {
  const all = Array.from({ length: 600 }, (_, i) => ({ id: i + 1, tracking: "T" + i, platform: "Shopee", item: "i" + i, qty: 1 + (i % 3), price: i + 0.5, status: "Pending" }));
  const local = all.slice(0, 214).map(p => Object.assign({}, p, { item: p.item + " edited" }));
  const r = M.mergeParcels(local, all, { exact: true });
  assert.deepStrictEqual([r.added, r.updated, local.length], [386, 0, 600]);
});
console.log("\n" + n + " tests passed");
