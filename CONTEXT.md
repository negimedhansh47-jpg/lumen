# CONTEXT.md — living project state

Read this first in every session, after CLAUDE.md. Update it at the end of any session that changes state.
SPEC.md is the plan. This file is what is *true now*. Keep it short.

## Current state (2026-11-24, evening: Jarvis-idea test pass)
Tested Plan an idea with the human's idea "an agent harness with a Jarvis feel that can be set up on any device with onboarding" (outputs: `scripts/out-qa/jarvis.json`, script `scripts/out-qa/jarvis.mjs`, both local only). Found and fixed:
- Decisions were a generic web-app template (frontend, DB, sign-in, deploy) and ignored the idea's core (model, voice, actions). Kickoff prompt v3: find what makes the idea special, at least half the decisions about it and first, skip sign-in for single-user tools, picks must meet the idea's constraints, stack/structure only from what the decisions picked.
- One `concepts: null` in a model answer failed the whole schema and dropped to the weaker Workers AI fallback, which wrote a vague plan. `conceptList` now accepts null (all endpoints).
- A plan could keep an AI key in a static site. Fixed in the fixed AGENTS.md template (keys only on a server or serverless function), not in the prompt: a prompt rule made the model put key storage first and drop voice.
- No concept cards for AI agents: added 5 (`llm-api`, `tool-calling`, `prompt-injection`, `speech-io`, `streaming`), now 35. NOT human-reviewed.
- New: Ask on Plan an idea. An Ask panel under the decisions sends the plan with its decisions (`plan.decisions`, max 6) and offers per-decision suggested questions. For plan questions the model may use general engineering knowledge; repo facts stay grounded.
Still open: the same idea gives a different plan on each run (temperature is already 0.2); Ask is the user's way to question a pick. The kickoff example (gym leaderboard) was made with prompt v2 and was not regenerated.

## Earlier state (2026-11-24, interactive pass)
Submittable. On 2026-11-24 the human asked for a less static, step-by-step site; built: Plan an idea and Review a chat reveal one item at a time with a guess first, Explain a repo has a tour and a "follow the arrows" question, concept cards slide in when an answer uses one you have not opened, `/concepts` lists all 30, the kickoff file is now AGENTS.md (not CLAUDE.md), and the home hero has a "Try a 1-minute example" button. Smoke test: 31 checks.
Before that (2026-11-23): full QA pass (report: `scripts/out-qa/QA_REPORT.md`, gitignored, local only); all 6 major and 13 minor defects fixed and deployed. Readable copy of the concept cards for review: `scripts/out-qa/concepts-readable.md` (local only, generated from concepts.json).

- Live: https://lumen-learn.lumen-learn.workers.dev
- Repo: https://github.com/negimedhansh47-jpg/lumen (public, `main`). Last feature commit: "Design v4 (white/ink/cerulean), live step guidance, and Ask about your project chat".
- Worker `lumen-learn`, D1 `lumen-db`. Push to `main` auto-deploys (Cloudflare Workers Builds, about 30 s). `npx wrangler deploy` also works.
- `GITHUB_TOKEN` production secret is set and valid (verified 2026-11-23). The Worker still falls back to anonymous calls on a 401.
- Smoke test: `node scripts/smoke.mjs <base-url>` (default `http://localhost:8799`). Run it after every deploy.
- Full QA prompt for a final test pass: `QA_PROMPT.md`.
- Deadline: Nov 25 2026, 9 PM IST. Internal submit by 3 PM IST.

## MVP progress
- SPEC.md MVP: all of it is built (chat review, repo map + drawer + commit explain, kickoff + CLAUDE.md, 30 concept cards, zero-LLM examples, rate limit, cache, grounding checks). About 100% of the SPEC MVP.
- Added at the human's request, not in SPEC: Explain this better (concept cards), My project (browser-only save/track), Ask about your project (chat), design v4, live step guidance, step-by-step quizzes, concept slide-in, `/concepts` page, AGENTS.md instead of CLAUDE.md.
- Not done by design: auth, private repos, MCP server, zip upload (see README future work).
- Not done because it needs the human: see "Remaining (human)".

## Remaining (Claude)
Nothing is blocking. Optional, only if asked:
- Nits left from QA (see report): heading level skips, concept dialog labelled "Concept card" instead of its title, `%2F` in `/repo?repo=` URLs, `owner/name.git` without github.com is not stripped, no Open Graph tags.
- The empty-repo message (GitHub 409) is changed but was never exercised: no empty public repo was available to test.
- AI depth: maps of library repos (Express, Flask, Requests) are shallow and concept tags are sometimes wrong; Ask answer text is not verified (only its file chips). Prompt tuning was deliberately not done this close to the deadline.
- Freeze features. No new features before submission.

## Remaining (human)
1. Read and correct `public/concepts/concepts.json` (35 cards; 31 to 35 on AI agents are new on 2026-11-24; readable copy in `scripts/out-qa/concepts-readable.md`) and `public/demo/*`. CLAUDE.md and the hackathon AI rule require a human review; `AI_USAGE.md` still says NOT reviewed. The QA report section 4 lists suggested corrections (database, env-vars, hashing, rate-limiting, oauth cards; demo concept tags such as OAuth on the LLM module and session-cookie on a JWT app). Update the AI_USAGE row when done.
2. Choose and add a LICENSE (there is none).
3. Check the Roxten rules and eligibility (video required? team size? links needed?).
4. Edit `DEVPOST.md` into your own words; take the 7 screenshots listed at the bottom of it (after the 2026-11-24 interactive pass, so they show the quizzes). The kickoff example (`public/demo/kickoff.json`) was regenerated on 2026-11-24 and needs the same human read as the other demos.
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
- Step-by-step results (`public/js/steps.js`): `quiz()` asks before it reveals, `stepper()` shows one item at a time with Next and "Show everything". Kickoff is framed as "What would you pick?" (no score: the model's choice is a recommendation, not a fact), chat as "What would make this clearer?" using the model's problem tag. The kickoff schema has a short `pick` and alternatives as `{name, betterWhen}`; the server drops alternatives that repeat the pick. Old plain-string alternatives still parse.
- Repo tour: the most-connected box pulses; Ask, Track, commits and What next appear after the first box opens (or "Show everything"). The drawer asks "which box does X send its work to?" (one real arrow target + 2 unconnected boxes) once per box, not a layer quiz, because column headings already show the layer.
- Concept slide-in (`announceConcepts` in `concepts.js`): only concepts not yet opened, max 3, never takes focus, hidden while the repo drawer or a card is open.
- Kickoff file is AGENTS.md (the human chose AGENTS.md only). Saved plans keep working: the store reads the old `claudeMd` field.
- Examples ship explanations for only some commits; the others show "Not in this example" (`canExplain` on the demo source) instead of an Explain button.
- Examples (`public/demo/*.json`) are generated by `scripts/make-demo.mjs` against a local `wrangler dev` on :8799. Stop any preview server on 8799 first.

## Verified
- Interactive pass 2026-11-24: see the AI_USAGE row for exactly what was checked locally and live. Live AI calls used across both QA sessions: 12 (budget guidance about 15).
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
