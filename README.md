# Parcel Quest

Gamified Malaysian parcel tracker (Shopee / TikTok Shop / Lazada). Static site — deployed to GitHub Pages.

## Layout
- `index.html` – markup
- `css/style.css` – styles
- `js/app.js` – app logic, gamification, Gist sync
- `js/seed.js` – starter parcels for a browser with no saved data (live data lives in `localStorage` / your Gist)
- `js/model.js` – people options (For: San/Aisyah/Joel; Purchased by: San/KW Liang), date helpers, data sanitising (pure, tested)
- `js/parse.js` – tracking-number parsing + import helpers (pure functions, unit-tested)
- `js/reminders.js` – reminder rules, sale calendar, weekly review/streak, .ics export (pure, tested)
- `js/today.js` – the Today page
- `js/importer.js` – Import modal: paste tracking numbers or read screenshots/receipts with Claude
- `tests/*.test.js` – run all: `for t in tests/*.test.js; do node $t; done`

## Tracking number rules (Shopee SPX)
- `SPXMY…` is already the full tracking number — kept whole.
- `MY<digits>[letter]` followed by `SPX…` (e.g. `MY265518180161USPXLM102…`) → tracking is `MY265518180161U`; the `SPX…` tail is a courier label and is dropped.
- TikTok: 15 digits starting `680`. Lazada: 12 digits starting `648`/`649`.

## AI import
Settings → *AI Import* → paste an Anthropic API key. It is stored only in this browser's `localStorage` and sent only to `api.anthropic.com`; it is never part of exports or the Gist.

## Reminders (Today page)
Driven by optional dates on each parcel: **ordered**, **estimated delivery (from / to)**, **arrived at branch**, **delivered**, and **reorder after (days)**.
- *Estimated delivery* (the date/range shown when you buy): quiet until the window nears, **Due** when the end is within the heads-up days (default 3), **Overdue** the day after the end. Each state is its own reminder. Actions: **Got it** (marks Delivered today) and **New ETA** (the seller moved the date).
- *Pickup deadline*: arrived + hold days (default 7, configurable).
- *Stuck*: Pending/Scheduled longer than N days after ordering (default 14).
- *Reorder*: delivered (or ordered) + reorder days, for consumables.
- *Sale radar*: M.M double-day sales and the 25th payday sale, with an optional spend cap per sale.
- *Weekly review* and a **weekly tide streak** (any week with a logged action; the current week is never counted as a miss).
- Reminders cannot push while the app is closed (static site). Use **Add to calendar (.ics)** for real alerts; UIDs are stable so re-importing updates events.

## Privacy
No receiver names or phone numbers are stored. People are just `For` (San / Aisyah / Joel) and `Purchased by` (San / KW Liang). Note: this repo is public and earlier commits contain the old receiver names.
