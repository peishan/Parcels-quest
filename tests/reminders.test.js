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
t("estimated delivery (single date): quiet when far, due-soon when near, overdue when missed", () => {
  const f = (o) => R.buildReminders([P(o)], TODAY).filter(r => r.type === "promise");
  assert.strictEqual(f({ expected: "2026-11-30" }).length, 0, "far future is quiet");
  const soon = f({ expected: "2026-11-10" });
  assert.deepStrictEqual([soon.length, soon[0].severity, soon[0].daysLeft], [1, "med", 2]);
  const today = f({ expected: TODAY });
  assert.ok(/^Due today/.test(today[0].title) && today[0].severity === "med");
  const late = f({ expected: "2026-11-05" });
  assert.deepStrictEqual([late[0].severity, late[0].daysLeft], ["high", -3]);
  assert.ok(/^Overdue 3 days/.test(late[0].title));
  assert.strictEqual(f({ expected: "2026-11-05", status: "Delivered" }).length, 0, "delivered parcels never nag");
  assert.strictEqual(f({ expected: "2026-11-05", status: "Cancelled" }).length, 0);
});
t("estimated delivery window (12-18 Nov style): opens low, due when the end nears, overdue only after the END", () => {
  const f = (today, o) => R.buildReminders([P(o)], today).filter(r => r.type === "promise");
  const w = { expected: "2026-11-12", expectedEnd: "2026-11-18" };
  assert.strictEqual(f("2026-11-05", w).length, 0, "7 days before the window opens: quiet");
  const opening = f("2026-11-10", w);
  assert.deepStrictEqual([opening[0].severity, /^Arriving from in 2 days|^Arriving from/.test(opening[0].title)], ["low", true]);
  const inside = f("2026-11-14", w);
  assert.deepStrictEqual([inside[0].severity, inside[0].daysLeft], ["low", 4], "inside the window but end still far: low priority");
  assert.strictEqual(f("2026-11-16", w)[0].severity, "med", "end within 3 days");
  assert.strictEqual(f("2026-11-18", w)[0].severity, "med");
  assert.strictEqual(f("2026-11-19", w)[0].severity, "high", "day after the END is overdue");
  assert.ok(/12 Nov\u201318 Nov/.test(f("2026-11-19", w)[0].detail));
});
t("each estimate state has its own key, so clearing 'due soon' does not hide 'overdue'", () => {
  const k = (today) => R.buildReminders([P({ expected: "2026-11-10" })], today).filter(r => r.type === "promise")[0].key;
  assert.notStrictEqual(k("2026-11-09"), k("2026-11-12"));
  const dm = { dismissed: { [k("2026-11-09")]: "done" } };
  assert.strictEqual(R.applyMeta(R.buildReminders([P({ expected: "2026-11-10" })], "2026-11-12"), dm, "2026-11-12").filter(r => r.type === "promise").length, 1);
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
  assert.strictEqual(f({ ordered: "2026-10-01", expected: "2026-11-01" }), 0, "a missed estimate gets the overdue reminder, not a second stuck one");
  assert.strictEqual(f({ ordered: "2026-10-20" }, { stuckDays: 10 }), 1);
});
t("reorder nudge for consumables (30-day coffee ordered 24 Oct, delivered 7 Nov)", () => {
  const p = P({ status: "Delivered", ordered: "2026-10-24", delivered: "2026-11-07", reorderDays: 30 });
  assert.strictEqual(R.buildReminders([p], TODAY).filter(x => x.type === "reorder").length, 0, "not yet — due 7 Dec");
  const r = R.buildReminders([p], "2026-12-03").filter(x => x.type === "reorder");
  assert.strictEqual(r.length, 1); assert.strictEqual(r[0].due, "2026-12-07");
  assert.strictEqual(R.buildReminders([P({ status: "Delivered", ordered: "2026-10-24", reorderDays: 30 })], "2026-11-25").filter(x => x.type === "reorder").length, 1, "falls back to order date");
});
t("missing-estimate nudge counts only active parcels without an estimated date", () => {
  const r = R.buildReminders([P({ id: 1 }), P({ id: 2, status: "Scheduled" }), P({ id: 3, status: "Delivered" }), P({ id: 4, expected: "2026-12-30" })], TODAY).filter(x => x.type === "noeta");
  assert.strictEqual(r.length, 1); assert.ok(/^2 pending\/scheduled parcels have no estimated delivery date/.test(r[0].title));
});
t("sorted by severity then urgency", () => {
  const list = R.buildReminders([P({ id: 1, expected: "2026-11-10" }), P({ id: 2, expected: "2026-11-01" })], TODAY);
  assert.deepStrictEqual(list.slice(0, 2).map(x => x.parcelId), [2, 1]);
  assert.deepStrictEqual(list.slice(0, 2).map(x => x.severity), ["high", "med"]);
});
t("dismiss forever and snooze until a date", () => {
  const list = R.buildReminders([P({ expected: "2026-11-05" })], TODAY).filter(x => x.type === "promise");
  const key = list[0].key;
  assert.strictEqual(R.applyMeta(list, { dismissed: { [key]: "done" } }, TODAY).length, 0);
  assert.strictEqual(R.applyMeta(list, { dismissed: { [key]: "2026-11-11" } }, TODAY).length, 0);
  assert.strictEqual(R.applyMeta(list, { dismissed: { [key]: "2026-11-11" } }, "2026-11-11").length, 1, "snooze expires");
  // changing the estimate creates a new key, so an old dismissal does not hide it
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
  assert.deepStrictEqual([w.start, w.end, w.ordered, w.landed, w.spend, w.overCap, w.undated], ["2026-11-02", "2026-11-08", 2, 2, 150.5, true, 2]);
});
t("ICS: an estimate window becomes one multi-day event ending the day after the last day", () => {
  const ics = R.buildICS([P({ id: 5, expected: "2026-11-12", expectedEnd: "2026-11-18" }), P({ id: 6, expected: "2026-11-20" })], TODAY, {}, "20261108T000000Z");
  const ev = (id) => ics.split("BEGIN:VEVENT").find(b => b.includes("UID:eta-" + id + "@"));
  assert.ok(ev(5).includes("DTSTART;VALUE=DATE:20261112") && ev(5).includes("DTEND;VALUE=DATE:20261119"));
  assert.ok(ev(6).includes("DTSTART;VALUE=DATE:20261120") && ev(6).includes("DTEND;VALUE=DATE:20261121"));
  // an estimate that started in the past but ends in the future starts the event today
  const mid = R.buildICS([P({ id: 7, expected: "2026-11-02", expectedEnd: "2026-11-12" })], TODAY, {}, "20261108T000000Z").split("BEGIN:VEVENT").find(b => b.includes("UID:eta-7@"));
  assert.ok(mid.includes("DTSTART;VALUE=DATE:20261108") && mid.includes("DTEND;VALUE=DATE:20261113"));
});
t("ICS: valid structure, stable UIDs, weekly review recurrence, no past events, CRLF + folding", () => {
  const ps = [P({ id: 7, expected: "2026-11-15", item: "Coffee; 2 boxes, plus a free shaker and a very long extra name" }),
    P({ id: 8, expected: "2026-11-01" })];
  const ics = R.buildICS(ps, TODAY, {}, "20261108T000000Z");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
  assert.ok(ics.includes("UID:eta-7@parcel-quest"));
  assert.ok(!ics.includes("UID:eta-8@"), "an estimate that already passed is not exported");
  assert.ok(ics.includes("UID:sale-2026-11-11@parcel-quest"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261108") && ics.includes("RRULE:FREQ=WEEKLY;BYDAY=SU"), "today is Sunday");
  const flat = ics.replace(/\r\n /g, "");
  assert.ok(flat.includes("Coffee\\; 2 boxes\\, plus"), "; and , are escaped");
  assert.ok(/\r\n [^\r]/.test(ics), "long lines were folded");
  ics.split("\r\n").forEach(l => assert.ok(Buffer.byteLength(l) <= 75, "line too long: " + l));
  assert.ok(!/[^\r]\n/.test(ics), "bare LF found");
});
console.log("\n" + n + " tests passed");
