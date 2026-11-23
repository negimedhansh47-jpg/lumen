# CONTEXT.md — living project state

Read this first in every session, after CLAUDE.md. Update it at the end of any session that changes state.
SPEC.md is the plan. This file is what is *true now*. Keep it short.

## Current state (2026-11-23, evening)
Submittable. Live, smoke test 22/22 passing live, no known console errors, no secrets in the repo.

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
Nothing is blocking. Optional, only if asked or time allows:
- Run the full QA pass in `QA_PROMPT.md`, fix what it finds.
- Click through Ask chat, My project and Explain this better on the LIVE URL (only tested locally and by API live).
- Check the "Some experience" level in the UI, the live 429 message, and a real narrow phone viewport beyond emulation.
- Ask answers can be thin on some repos (quality depends on the cached map).
- Freeze features. No new features before submission.

## Remaining (human)
1. Read and correct `public/concepts/concepts.json` (30 cards) and `public/demo/*`. CLAUDE.md and the hackathon AI rule require a human review; `AI_USAGE.md` still says NOT reviewed. Update that row when done.
2. Check the Roxten rules and eligibility (video required? team size? links needed?).
3. Edit `DEVPOST.md` into your own words; take the 7 screenshots listed at the bottom of it.
4. Choose the final name (Lumen is a working title; renaming touches README, DEVPOST, page titles, brand in shell.js, favicon).
5. Open the live site on a real phone and click through each tool once.
6. Submit by 3 PM IST on Nov 25.

## Decisions that are not obvious from the code
- Concept cards are static text. "Explain this better" asks the model to re-teach a card; it takes no user text, so results are cached in D1 per concept and level.
- "My project" is localStorage only (`public/js/project-store.js`, shape-checked on load and import). It tracks a repo + last-seen sha, a saved kickoff plan with a checklist, and opened concepts. Export/import JSON moves it between devices. No server storage, so no auth needed.
- Ask about your project: `POST /api/project/ask`. Repo facts come from the cached overview in D1 (no GitHub calls; 409 if the map was never opened), the plan comes from the browser. Question and history are user content (fenced, never stored). Cited files are filtered to ones in the map. Chat history is in memory only. UI: `public/js/ask.js` on My project and Explain a repo (live repos only, not the demo).
- Design v4 (palette picked by the human): white/sky-white + ink black #00171F, deep space blue #003459 for dark bands, ONE accent cerulean #007EA7 used only for things you click to move forward. Fresh Sky #00A7E1 is decoration only (too light for text). Red/green soft panels only for before/after. Fonts: Instrument Serif display, Space Grotesk headings, Inter Tight body, JetBrains Mono labels. Motion respects prefers-reduced-motion.
- Clarity rules: one name per tool everywhere (Plan an idea /kickoff, Review a chat /chat, Explain a repo /repo, My project /project). Home leads with "What do you have right now?". Every tool page shows 1-2-3 steps that light up (`guide()` in `shell.js`), a primary button that stays off with a stated reason until there is input, an example button, scrolls to results, and ends with a "What next?" card. Level toggle reads "Explain for: Beginners / Some experience".
- Auth: deliberately none. Nothing user-specific is stored, and a login wall would slow judges down. Revisit only for private repos (GitHub OAuth).
- Model: NVIDIA NIM `nvidia/nemotron-3.5-super-vl-120b-a12b`, sent with `enable_thinking:false`. Fallback Workers AI Llama 3.3 70B. Chain: NIM, NIM retry (skipped if the first try took over 15 s), Workers AI, friendly error. Timeout 30 s. Test results: `AI_USAGE.md`.
- Trust model: LLM output is untrusted. Evidence paths are checked against the repo tree, chat excerpts must be verbatim substrings, duplicate excerpts are dropped, unknown concept ids become null, strongest/weakest prompt only shown if a real user line.
- `/api/repo/commits` returns no `filesChanged` (would cost 15+ GitHub subrequests). It takes `?path=` instead, which powers the drawer's commit list.
- Free-plan limits drive design: 50 subrequests per request, 10 ms CPU, 100k requests/day. Rate limit: 30 LLM calls per IP per hour, global daily cap 1500 (stress tests must not burn this on the live site).
- Examples (`public/demo/*.json`) are generated by `scripts/make-demo.mjs` against a local `wrangler dev` on :8799. Stop any preview server on 8799 first.

## Verified
- Live smoke test 22/22 (2026-11-23). Prompt injection ignored (chat review and Ask). Workers AI fallback works (forced with a bogus NIM model). Local 429 path returns the friendly message. Large repos map live (`torvalds/linux`, `facebook/react`, `expressjs/express`). AA contrast: 0 failures on home, chat results and My project. CSP and nosniff on all pages. No horizontal overflow at 375 px.

## Known gaps / risks
- Concepts and demo outputs not human-reviewed (see Remaining, human).
- Untested: real phone, Intermediate level in the UI, live 429 path, Ask on the live UI, My project end to end live.
- NVIDIA NIM free tier can be slow; the Workers AI fallback covers failures, examples need no AI call.
- Product name is still "Lumen" (working title).

## Windows gotchas
- Never `Get-Content | Set-Content` on source files: it corrupts UTF-8. Use the Edit/Write tools or .NET UTF-8 writes.
- Editing `public/` restarts `wrangler dev`.
- Local dev log goes to `scripts/out-dev.log` (gitignored via `scripts/out*`).
