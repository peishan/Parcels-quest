# Parcel Quest

Gamified Malaysian parcel tracker (Shopee / TikTok Shop / Lazada). Static site — deployed to GitHub Pages.

## Layout
- `index.html` – markup
- `css/style.css` – styles
- `js/app.js` – app logic, gamification, Gist sync
- `js/seed.js` – starter parcels for a browser with no saved data (live data lives in `localStorage` / your Gist)
- `js/parse.js` – tracking-number parsing + import helpers (pure functions, unit-tested)
- `js/importer.js` – Import modal: paste tracking numbers or read screenshots/receipts with Claude
- `tests/parse.test.js` – `node tests/parse.test.js`

## Tracking number rules (Shopee SPX)
- `SPXMY…` is already the full tracking number — kept whole.
- `MY<digits>[letter]` followed by `SPX…` (e.g. `MY265518180161USPXLM102…`) → tracking is `MY265518180161U`; the `SPX…` tail is a courier label and is dropped.
- TikTok: 15 digits starting `680`. Lazada: 12 digits starting `648`/`649`.

## AI import
Settings → *AI Import* → paste an Anthropic API key. It is stored only in this browser's `localStorage` and sent only to `api.anthropic.com`; it is never part of exports or the Gist.
