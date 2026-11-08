// Run: node tests/reminders.test.js
const assert = require("assert");
const R = require("../js/reminders.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };
const TODAY = "2026-11-08"; // a Sunday
const P = (o) => Object.assign({ id: 1, item: "Item", price: 10, status: "Pending" }, o);

t("weeks start on Monday", () => {
  assert.strictEqual(R.weekStart("2026-11-08"), "2026-11-02"); // Sunday -> Monday before
  assert.strictEqual(R.weekStart("2026-11-09"), "2026-11-09");
  assert.strictEqual(R.weekStart("2026-11-03"), "2026-11-02");
});
t("weekly streak: consecutive weeks, grace for the current week, breaks after a gap", () => {
  const s1 = R.streak(["2026-10-19", "2026-10-26", "2026-11-02"], TODAY);
  assert.deepStrictEqual([s1.current, s1.best, s1.thisWeekDone], [3, 3, true]);
  // nothing yet this week (Mon 9 Nov) but last week was active -> streak alive, not yet extended
  const s2 = R.streak(["2026-10-26", "2026-11-02"], "2026-11-09");
  assert.deepStrictEqual([s2.current, s2.thisWeekDone], [2, false]);
  // a full empty week in between breaks it
  const s3 = R.streak(["2026-10-19", "2026-10-26"], "2026-11-12");
  assert.strictEqual(s3.current, 0);
  assert.strictEqual(s3.best, 2);
  assert.strictEqual(R.streak([], TODAY).current, 0);
});
t("promise date: upcoming is a heads-up, past is high severity (the 15-11 voucher case)", () => {
  const soon = R.buildReminders([P({ expected: "2026-11-10" })], TODAY).filter(r => r.type === "promise");
  assert.strictEqual(soon.length, 1); assert.strictEqual(soon[0].severity, "med"); assert.strictEqual(soon[0].daysLeft, 2);
  const late = R.buildReminders([P({ expected: "2026-11-05" })], TODAY).filter(r => r.type === "promise");
  assert.strictEqual(late[0].severity, "high"); assert.strictEqual(late[0].daysLeft, -3);
  assert.strictEqual(R.buildReminders([P({ expected: "2026-11-30" })], TODAY).filter(r => r.type === "promise").length, 0, "far future is quiet");
  assert.strictEqual(R.buildReminders([P({ expected: "2026-11-05", status: "Delivered" })], TODAY).filter(r => r.type === "promise").length, 0, "delivered parcels never nag");
});
t("pickup deadline = arrived + hold days (default 7)", () => {
  const r = R.buildReminders([P({ arrived: "2026-11-02", pickupCode: "L-1" })], TODAY).filter(x => x.type === "pickup");
  assert.strictEqual(r[0].due, "2026-11-09"); assert.strictEqual(r[0].daysLeft, 1);
  const od = R.buildReminders([P({ arrived: "2026-10-20" })], TODAY).filter(x => x.type === "pickup");
  assert.strictEqual(od[0].severity, "high");
  const custom = R.buildReminders([P({ arrived: "2026-11-02" })], TODAY, { holdDays: 14 }).filter(x => x.type === "pickup");
  assert.strictEqual(custom.length, 0);
  assert.strictEqual(R.buildReminders([P({ arrived: "2026-10-20", status: "Delivered" })], TODAY).filter(x => x.type === "pickup").length, 0);
});
t("stuck: old pending parcel flagged; fresh, arrived or live-promise ones are not", () => {
  const f = (o, s) => R.buildReminders([P(o)], TODAY, s).filter(x => x.type === "stuck").length;
  assert.strictEqual(f({ ordered: "2026-10-01" }), 1);
  assert.strictEqual(f({ ordered: "2026-10-30" }), 0);
  assert.strictEqual(f({ ordered: "2026-10-01", arrived: "2026-11-01" }), 0);
  assert.strictEqual(f({ ordered: "2026-10-01", expected: "2026-11-15" }), 0);
  assert.strictEqual(f({ ordered: "2026-10-01", expected: "2026-11-01" }), 0, "missed promise gets the promise reminder, not a second stuck one");
  assert.strictEqual(f({ ordered: "2026-10-20" }, { stuckDays: 10 }), 1);
});
t("reorder nudge for consumables (30-day coffee ordered 24 Oct, delivered 7 Nov)", () => {
  const p = P({ status: "Delivered", ordered: "2026-10-24", delivered: "2026-11-07", reorderDays: 30 });
  assert.strictEqual(R.buildReminders([p], TODAY).filter(x => x.type === "reorder").length, 0, "not yet — due 7 Dec");
  const r = R.buildReminders([p], "2026-12-03").filter(x => x.type === "reorder");
  assert.strictEqual(r.length, 1); assert.strictEqual(r[0].due, "2026-12-07");
  assert.strictEqual(R.buildReminders([P({ status: "Delivered", ordered: "2026-10-24", reorderDays: 30 })], "2026-11-25").filter(x => x.type === "reorder").length, 1, "falls back to order date");
});
t("undated nudge counts only active parcels without an order date", () => {
  const r = R.buildReminders([P({ id: 1 }), P({ id: 2, status: "Scheduled" }), P({ id: 3, status: "Delivered" }), P({ id: 4, ordered: "2026-11-01" })], TODAY).filter(x => x.type === "nodates");
  assert.strictEqual(r.length, 1); assert.ok(/^2 /.test(r[0].title));
});
t("sorted by severity then urgency", () => {
  const list = R.buildReminders([P({ id: 1, expected: "2026-11-10" }), P({ id: 2, expected: "2026-11-01" })], TODAY);
  assert.deepStrictEqual(list.slice(0, 2).map(x => x.parcelId), [2, 1]);
});
t("dismiss forever and snooze until a date", () => {
  const list = R.buildReminders([P({ expected: "2026-11-05" })], TODAY).filter(x => x.type === "promise");
  const key = list[0].key;
  assert.strictEqual(R.applyMeta(list, { dismissed: { [key]: "done" } }, TODAY).length, 0);
  assert.strictEqual(R.applyMeta(list, { dismissed: { [key]: "2026-11-11" } }, TODAY).length, 0);
  assert.strictEqual(R.applyMeta(list, { dismissed: { [key]: "2026-11-11" } }, "2026-11-11").length, 1, "snooze expires");
  // changing the promise date creates a new key, so an old dismissal does not hide it
  const moved = R.buildReminders([P({ expected: "2026-11-06" })], TODAY).filter(x => x.type === "promise");
  assert.strictEqual(R.applyMeta(moved, { dismissed: { [key]: "done" } }, TODAY).length, 1);
});
t("sale calendar: 11.11 is 3 days away; payday on the 25th; year rollover", () => {
  const s = R.saleCalendar(TODAY, 4);
  assert.deepStrictEqual(s.map(x => x.date), ["2026-11-11", "2026-11-25", "2026-12-12", "2026-12-25"]);
  assert.strictEqual(s[0].daysLeft, 3); assert.strictEqual(s[0].name, "11.11 Sale");
  assert.strictEqual(R.saleCalendar("2026-12-30", 2)[0].date, "2027-01-01");
  const r = R.buildReminders([], TODAY).filter(x => x.type === "sale");
  assert.strictEqual(r.length, 1, "only 11.11 is within the 7-day lead"); assert.strictEqual(r[0].daysLeft, 3);
});
t("sale spend counts orders on the sale day and the day after, excluding cancelled", () => {
  const sp = R.saleSpend([P({ ordered: "2026-11-11", price: 50 }), P({ ordered: "2026-11-12", price: 25.5 }), P({ ordered: "2026-11-13", price: 99 }),
    P({ ordered: "2026-11-11", price: 70, status: "Cancelled" })], "2026-11-11");
  assert.deepStrictEqual(sp, { count: 2, total: 75.5 });
});
t("weekly review (Mon 2 – Sun 8 Nov)", () => {
  const ps = [P({ id: 1, ordered: "2026-11-03", price: 100 }), P({ id: 2, ordered: "2026-11-08", price: 50.5, status: "Delivered", delivered: "2026-11-08" }),
    P({ id: 3, ordered: "2026-10-30", status: "Delivered", delivered: "2026-11-02" }), P({ id: 4, status: "Pending" })];
  const w = R.weeklyReview(ps, TODAY, { weeklyCap: 120 });
  assert.deepStrictEqual([w.start, w.end, w.ordered, w.landed, w.spend, w.overCap, w.undated], ["2026-11-02", "2026-11-08", 2, 2, 150.5, true, 1]);
});
t("ICS: valid structure, stable UIDs, weekly review recurrence, no past events, CRLF + folding", () => {
  const ps = [P({ id: 7, expected: "2026-11-15", item: "Coffee; 2 boxes, plus a free shaker and a very long extra name" }),
    P({ id: 8, expected: "2026-11-01" })];
  const ics = R.buildICS(ps, TODAY, {}, "20261108T000000Z");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
  assert.ok(ics.includes("UID:promise-7-2026-11-15@parcel-quest"));
  assert.ok(!ics.includes("promise-8-"), "past promise date is not exported");
  assert.ok(ics.includes("UID:sale-2026-11-11@parcel-quest"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261108") && ics.includes("RRULE:FREQ=WEEKLY;BYDAY=SU"), "today is Sunday");
  const flat = ics.replace(/\r\n /g, "");
  assert.ok(flat.includes("Coffee\\; 2 boxes\\, plus"), "; and , are escaped");
  assert.ok(/\r\n [^\r]/.test(ics), "long lines were folded");
  ics.split("\r\n").forEach(l => assert.ok(Buffer.byteLength(l) <= 75, "line too long: " + l));
  assert.ok(!/[^\r]\n/.test(ics), "bare LF found");
});
console.log("\n" + n + " tests passed");
