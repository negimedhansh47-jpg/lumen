# CONTEXT.md — living project state

Read this first in every session, after CLAUDE.md. Update it at the end of any session that changes state.
SPEC.md is the plan. This file is what is *true now*. Keep it short.

## Current state (2026-11-23, night, after the full QA pass)
Submittable. Full QA pass done (report: `scripts/out-qa/QA_REPORT.md`, gitignored, local only). All 6 major and 13 minor defects it found are fixed and deployed; smoke test now 29 checks (28/28 passed live before the last content-type fix, which was then checked live on its own). No known console errors, no secrets in the repo.

- Live: https://lumen-learn.lumen-learn.workers.dev
- Repo: https://github.com/negimedhansh47-jpg/lumen (public, `main`). Last feature commit: "Design v4 (white/ink/cerulean), live step guidance, and Ask about your project chat".
- Worker `lumen-learn`, D1 `lumen-db`. Push to `main` auto-deploys (Cloudflare Workers Builds, about 30 s). `npx wrangler deploy` also works.
- `GITHUB_TOKEN` production secret is set and valid (verified 2026-11-23). The Worker still falls back to anonymous calls on a 401.
- Smoke test: `node scripts/smoke.mjs <base-url>` (default `http://localhost:8799`). Run it after every deploy.
- Full QA prompt for a final test pass: `QA_PROMPT.md`.
- Deadline: Nov 25 2026, 9 PM IST. Internal submit by 3 PM IST.

## MVP progress
- SPEC.md MVP: all of it is built (chat review, repo map + drawer + commit explain, kickoff + CLAUDE.md, 30 concept cards, zero-LLM examples, rate limit, cache, grounding checks). About 100% of the SPEC MVP.
- Added at the human's request, not in SPEC: Explain this better (concept cards), My project (browser-only save/track), Ask about your project (chat), design v4, live step guidance.
- Not done by design: auth, private repos, MCP server, zip upload (see README future work).
- Not done because it needs the human: see "Remaining (human)".

## Remaining (Claude)
Nothing is blocking. Optional, only if asked:
- Nits left from QA (see report): heading level skips, concept dialog labelled "Concept card" instead of its title, `%2F` in `/repo?repo=` URLs, `owner/name.git` without github.com is not stripped, no Open Graph tags.
- The empty-repo message (GitHub 409) is changed but was never exercised: no empty public repo was available to test.
- AI depth: maps of library repos (Express, Flask, Requests) are shallow and concept tags are sometimes wrong; Ask answer text is not verified (only its file chips). Prompt tuning was deliberately not done this close to the deadline.
- Freeze features. No new features before submission.

## Remaining (human)
1. Read and correct `public/concepts/concepts.json` (30 cards) and `public/demo/*`. CLAUDE.md and the hackathon AI rule require a human review; `AI_USAGE.md` still says NOT reviewed. The QA report section 4 lists suggested corrections (database, env-vars, hashing, rate-limiting, oauth cards; demo concept tags such as OAuth on the LLM module and session-cookie on a JWT app). Update the AI_USAGE row when done.
2. Choose and add a LICENSE (there is none).
3. Check the Roxten rules and eligibility (video required? team size? links needed?).
4. Edit `DEVPOST.md` into your own words; take the 7 screenshots listed at the bottom of it (after the QA fixes, so they show the new accent and no stray text).
5. Choose the final name (Lumen is a working title; renaming touches README, DEVPOST, page titles, brand in shell.js, favicon, 404.html).
6. Open the live site on a real phone, and once in Firefox or Safari, and click through each tool once (only Chromium was tested).
7. Submit by 3 PM IST on Nov 25.

## Decisions that are not obvious from the code
- Concept cards are static text. "Explain this better" asks the model to re-teach a card; it takes no user text, so results are cached in D1 per concept and level.
- "My project" is localStorage only (`public/js/project-store.js`, shape-checked on load and import). It tracks a repo + last-seen sha, a saved kickoff plan with a checklist, and opened concepts. Export/import JSON moves it between devices. No server storage, so no auth needed.
- Ask about your project: `POST /api/project/ask`. Repo facts come from the newest cached overview in D1, preferring the current level and falling back to the other one (no GitHub calls; 409 only if the repo was never mapped), the plan comes from the browser. Question and history are user content (fenced, never stored). Cited files are filtered to ones in the map. Chat history is in memory only. UI: `public/js/ask.js` on My project and Explain a repo (live repos only, not the demo).
- Design v4 (palette picked by the human): white/sky-white + ink black #00171F, deep space blue #003459 for dark bands, ONE accent cerulean, now #00739A (one shade deeper than the original #007EA7, chosen by the human at QA so accent text passes AA), used only for things you click to move forward. Fresh Sky #00A7E1 is decoration only (too light for text). Red/green soft panels only for before/after. Fonts: Instrument Serif display, Space Grotesk headings, Inter Tight body, JetBrains Mono labels. Motion respects prefers-reduced-motion.
- Clarity rules: one name per tool everywhere (Plan an idea /kickoff, Review a chat /chat, Explain a repo /repo, My project /project). Home leads with "What do you have right now?". Every tool page shows 1-2-3 steps that light up (`guide()` in `shell.js`), a primary button that stays off with a stated reason until there is input, an example button, scrolls to results, and ends with a "What next?" card. Level toggle reads "Explain for: Beginners / Some experience".
- Auth: deliberately none. Nothing user-specific is stored, and a login wall would slow judges down. Revisit only for private repos (GitHub OAuth).
- Model: NVIDIA NIM `nvidia/nemotron-3.5-super-vl-120b-a12b`, sent with `enable_thinking:false`. Fallback Workers AI Llama 3.3 70B. Chain: NIM, NIM retry (skipped if the first try took over 15 s), Workers AI, friendly error. Timeout 30 s. Test results: `AI_USAGE.md`.
- Trust model: LLM output is untrusted. Evidence paths are checked against the repo tree, chat excerpts must be verbatim substrings, duplicate excerpts are dropped, unknown concept ids become null, strongest/weakest prompt only shown if a real user line.
- `/api/repo/commits` returns no `filesChanged` (would cost 15+ GitHub subrequests). It takes `?path=` instead, which powers the drawer's commit list.
- Free-plan limits drive design: 50 subrequests per request, 10 ms CPU, 100k requests/day. Rate limit: 30 LLM calls per IP per hour, global daily cap 1500 (stress tests must not burn this on the live site). The per-IP counter is checked first and only allowed calls bump the global one, so one visitor cannot use up everyone's cap.
- JSON API routes require `content-type: application/json` (415 otherwise): that forces a CORS preflight, so other sites cannot make visitors' browsers spend the AI budget.
- Unknown pages get `public/404.html` (wrangler `not_found_handling: 404-page`); unknown `/api/*` routes still answer JSON.
- Examples ship explanations for only some commits; the others show "Not in this example" (`canExplain` on the demo source) instead of an Explain button.
- Examples (`public/demo/*.json`) are generated by `scripts/make-demo.mjs` against a local `wrangler dev` on :8799. Stop any preview server on 8799 first.

## Verified
- QA pass 2026-11-23 (Claude Code, Opus 5.5): 71 validation/abuse probes identical local and live; 100 parallel live non-AI requests, 0 errors; 21 random-user chaos runs (Playwright, AI mocked), 0 JS errors after fixes; viewports 320-1920 with no horizontal overflow (results included); AA contrast 0 failures after the accent change; 404 page; 429/503 paths forced locally; global cap no longer moved by refused calls; fresh clone + README steps work; D1 on live holds only public-repo analyses and concept explanations.
- Earlier: prompt injection ignored (chat review and Ask), Workers AI fallback works, large repos map live (`torvalds/linux`, `facebook/react`, `expressjs/express`). CSP and nosniff on all pages.

## Known gaps / risks
- Concepts and demo outputs not human-reviewed (see Remaining, human).
- Untested: real phone, Firefox, Safari, Lighthouse, `wrangler tail` on live, empty/binary-heavy repos and 1 MB diffs.
- Evidence checks prove a file exists, not that the claim about it is right (see Remaining, Claude: AI depth).
- NVIDIA NIM free tier can be slow; the Workers AI fallback covers failures, examples need no AI call.
- Product name is still "Lumen" (working title).

## Windows gotchas
- Never `Get-Content | Set-Content` on source files: it corrupts UTF-8. Use the Edit/Write tools or .NET UTF-8 writes.
- Editing `public/` restarts `wrangler dev`.
- Local dev log goes to `scripts/out-dev.log` (gitignored via `scripts/out*`).
