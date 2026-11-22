# DraftKerja — AI Proposal Drafter for Indonesian Gig Workers

**DraftKerja** turns a client job brief into a polished proposal draft in about a minute — in Bahasa Indonesia or English. Built for SLAY HACKS 2026.

**Live demo:** https://erwinsp27.github.io/draftkerja/
**Hackathon:** SLAY HACKS 2026 (Devpost) — submission deadline 8 December 2026, 05:00 WIB.

## The problem

Indonesian gig workers (on Upwork, Fiverr, Projects.co.id, WhatsApp groups) lose jobs not because they can't do the work, but because writing a good proposal in a second language, under time pressure, is hard. Most end up copying generic templates that say nothing about the actual brief.

## What DraftKerja does

1. **Paste the brief.** The app analyses it *locally, on the device* — job type (design, writing, coding, data, video, marketing, translation), budget, deadline, platform, and deliverable count — using deterministic keyword/regex matching. No network call, no account.
2. **Fill in your details.** Name, rate, timeline, portfolio link, and your own experience (in your own words).
3. **Get a structured draft.** Greeting, a line that references the actual brief details, a 3-step work plan matched to the job type, your terms, and a call to action — in the tone you pick (friendly / formal / confident).
4. **Check completeness.** A 0–100 score with the exact missing pieces (rate? timeline? portfolio?) so nothing important is forgotten.
5. **Save drafts locally.** A small library in `localStorage` — nothing leaves the device.
6. **Optional AI polish (BYOK).** With your own API key, one button asks an OpenAI-compatible chat model to polish the *language* of the draft only. The default endpoint is the 100milionseek free tier (`deepseek-v4.1-flash-free`); the endpoint and model are editable. No key is bundled, and without a key the button does nothing.

## Honest disclosures

- The brief analysis is **local pattern matching, not AI**. The draft is **template-based, not AI-generated** — until/unless the user enables the optional BYOK polish step.
- The app **never invents** experience, credentials, portfolios, or certificates. If you leave experience empty, no experience claim appears.
- No tracking, no analytics, no server. The only network request the app can ever make is the optional BYOK polish call to the endpoint *you* configure, carrying only the draft text.
- The demo video is a silent screencast of the real app with on-screen captions; no part of it is staged with fake data (sample briefs are labelled as samples in the app).

## Run it

No build step, no dependencies. Any static server works:

```bash
# from this directory
python3 -m http.server 8080
# open http://localhost:8080/
```

Or just open `index.html` in a browser (all features except the optional AI polish work from `file://` too).

## Tests

```bash
node --test tests/     # 21 unit tests for the engine (detection, extraction, drafting, completeness)
node e2e/check.mjs     # 15 Playwright checks: loads, core flow, no console errors, screenshots
```

The E2E script needs `playwright-core` and a Chromium build; it reuses the `playwright-core` package from a sibling workspace directory (see the `createRequire` path in `e2e/check.mjs`).

## Project structure

```
index.html      UI (Indonesian-first, mobile-friendly)
styles.css      Styling
engine.js       Pure logic: detection, extraction, drafting, completeness (browser + Node)
app.js          DOM wiring, localStorage library/settings, BYOK polish call
tests/          Node unit tests for engine.js
e2e/            Playwright end-to-end checks + screenshots
docs/           Screenshots for the Devpost submission
```

## License

MIT — see `LICENSE`.
