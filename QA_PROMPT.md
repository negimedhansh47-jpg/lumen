# QA prompt: full test, judge pass, harsh-critic pass, then fix

**Run with:** Claude Opus 5.5, effort **xhigh** (use `max` if you have the budget; this is the one session where depth beats speed). Start in a fresh session so the context is clean. If you want parallel testers, say "use a workflow" at the start.

Paste everything below the line.

---

You are the QA lead for "Lumen", a hackathon site (live: https://lumen-learn.lumen-learn.workers.dev, repo in this folder). Judging is on creativity, design, functionality, technical execution and presentation. The deadline is close, so your job is to find every defect a real user, a hackathon judge or a harsh critic could find, then fix them.

## 0. Ground rules (read first)
1. Read CLAUDE.md, CONTEXT.md and SPEC.md first. Do NOT add features. Only fix defects and polish. If something is missing, list it for me instead of building it.
2. Enter plan mode after the test phase and show me the defect list and fix plan before editing. Wait for approval. Then fix in small commits, with `git diff --staged` checked for secrets before each commit.
3. Protect the live budget. The live site allows 30 AI calls per visitor per hour and 1500 per day for everyone. Do NOT stress the AI endpoints on the live URL beyond about 15 calls in total. Stress AI paths only on local `npx wrangler dev --port 8799`. Non-AI endpoints may be hit on live, up to about 300 requests in total. Only ever test my own site and my own repo. Never hit other people's sites.
4. Never print, paste or commit secrets. Secrets live in `.dev.vars` and Cloudflare secrets only.
5. Windows: edit files with the Edit/Write tools, never `Get-Content | Set-Content`.
6. Test local first, then LIVE after each deploy (push to `main` auto-deploys in about 30 s). Read the browser console, network tab and `wrangler tail` for errors. Call a check failed if it failed; do not paper over it.
7. Use the built-in browser for UI work (screenshots, clicks, console). Prefer reading the page as text to confirm content.

## 1. Build the test plan first
Before testing, write a numbered checklist of every page, component and API route (inventory from the code: `public/*.html`, `public/js/**`, `src/index.ts` routes). Tick items off as you test them. Report coverage at the end: tested / not tested and why.

## 2. Test phases (do ALL of them)

### A. Functionality, every feature end to end
- Home: each chooser card, the example link, the rotating word, the typing preview.
- Review a chat: example chat; a real pasted chat in several formats (Me/AI, User/Assistant, plain, ChatGPT export style); the Copy rewrite buttons; concept chips open the concept dialog; "Explain this better" inside the dialog; results scroll into view; What next card links.
- Explain a repo: each example; a live small repo; a mid repo; a huge repo; the map (click every node, close the drawer with the X, Escape and the scrim, keyboard open/close); "See commits touching this"; Explain commit; Track as my project; the Ask panel (starters, typed question, follow-up buttons, Enter vs Shift+Enter, file chips, concept chips).
- Plan an idea: example idea; a live idea; Save as my project; Copy CLAUDE.md.
- My project: empty state; saved plan checklist and meter; tracked repo with new-commit badges; Mark all as seen; concepts explored; rename; Export; Import (valid file, wrong JSON, wrong shape, oversize, empty file); Remove; reload persistence; two tabs open at once.
- Level toggle: "Beginners" vs "Some experience" on every tool, confirming the output and the cache key actually differ and the toggle state persists across pages.
- Ask API: repo + plan, plan only, repo only with no cached map (409 message), no context (400), history of 6 turns, history over the limit.

### B. Input validation and abuse (every input, every API route)
For each route in `src/index.ts`: empty body, invalid JSON, wrong content type, wrong HTTP method, oversized body (>64 KB), missing fields, wrong types, extreme lengths at the limit and limit+1, unicode, emoji, RTL text, zero-width characters, null bytes, very long single words, HTML and `<script>` strings, SQL-looking strings, prompt-injection strings ("ignore previous instructions", fake `</user_content>` tags, fake system messages), repo inputs like `https://evil.com/a/b`, `github.com/../..`, `owner/name/extra`, URLs with query strings, `.git` suffix, upper/lower case, trailing slashes, repo names with dots and dashes, private or non-existent or empty or archived or forked repos, a repo with no commits, a repo with only lockfiles or images.
Confirm every error is a human-readable message with the correct status code, never a stack trace, and the UI shows it in the error state.

### C. Security review
- Search every `innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`, `eval`, `new Function` in `public/`. Model or user text must never reach them.
- Check CSP and other headers (`_headers`) on pages and API responses; check for open redirects, CORS, caching of private data, secrets in client code or git history (`git log -p` search for key patterns), `.dev.vars` not tracked.
- LLM trust: schema validation, evidence path verification, verbatim excerpts, file chips filtered to the real map, injection in chat text / idea text / question / history / repo README content / commit messages / file names.
- Rate limit: per-IP counter, global cap, window cleanup; confirm the 429 message is friendly and points to examples (run locally with a low limit if needed).
- Privacy claims: confirm chats, ideas and questions are never stored or logged (read the code paths and `wrangler tail`), and that only public-repo analyses and concept explanations enter D1. Confirm README and the site copy match what the code really does.

### D. UI/UX, desktop and mobile
- Viewports: 360, 375, 414, 768, 1024, 1280, 1440, 1920 wide. Check for horizontal overflow, clipped text, overlapping elements, unreachable buttons, tiny tap targets (<44 px), sticky header covering content, the drawer and dialog on small screens.
- First-time-user test: for each page, can a stranger tell in 5 seconds what to click and what to type? List anything ambiguous, any dead end, any unlabeled control, any jargon.
- States: every screen needs loading (skeleton), empty, error, success. Force each (offline mode, slow network, blocked API, 500 response, 429, 409).
- Copy: spelling, grammar, tone consistency, one name per tool everywhere, no leftover placeholder or "lorem" text, no em-dash overuse, no broken emoji, correct page titles and meta descriptions.
- Visual polish: alignment, spacing rhythm, typography scale, consistent button styles, hover/focus/active/disabled states, the disabled-until-input button and its hint, the 1-2-3 step pills, the map's look at 1, 5, 15 and 40 modules, long names, long file paths, long commit messages.
- Motion: prefers-reduced-motion respected everywhere; no animation that blocks reading or loops forever on slow devices.

### E. Accessibility
- Keyboard only: tab through every page, visible focus on every control, no focus traps, logical order, Escape closes dialog and drawer, focus returns to the opener.
- Screen reader semantics: headings in order, one h1, landmarks, labels on every input, `aria-live` on results and chat, alt text or `aria-hidden` on decorative items, `aria-current` on nav, dialog roles.
- Contrast: compute AA ratios for all text and UI states (normal, hover, disabled, focus, on dark bands, on tinted map nodes, chips, toasts, error and success panels). Zoom to 200% and text-only 200%.
- Forms: errors announced, required fields clear, autofill not broken.

### F. Performance and robustness
- Lighthouse-style checks (performance, accessibility, best practices, SEO) on every page. Page weight, number of requests, font loading (FOIT/FOUT), layout shift, time to interactive on throttled 3G/slow 4G and 4x CPU slowdown.
- Cold start vs warm response times for each API route; the first-time repo map (target under 30 s) vs cached map.
- Failure injection: block fonts.googleapis.com, block `/api/*`, return 500 and 429, kill the network mid-request, double-click every submit button, submit twice fast, navigate away mid-request, press Back/Forward, reload during loading, open the same page in many tabs.
- Memory and DOM growth: run 30 Ask questions in a row (local), re-render the map 20 times, check for leaks, duplicate listeners (e.g. `document.addEventListener` added on every render), and detached nodes.
- Browser matrix: Chrome and Edge at minimum; Firefox and Safari if you can; check `:has`, `color-mix`, `backdrop-filter`, `dialog`, `requestSubmit` fallbacks and what happens when they are missing.

### G. Stress and scale (local for AI paths, limited live for static and non-AI paths)
- Concurrency: 50 to 100 parallel requests to non-AI routes (health, demo JSON, commits with a cached repo) and confirm no 5xx. On local, 20 parallel AI requests to confirm the rate limiter, D1 writes and the 50-subrequest budget hold.
- Large inputs: a 30,000 character chat; a chat with 2,000 short lines; a repo with 100k files; a repo with huge single files; a repo with thousands of commits; a commit with a 1 MB diff; a repo with non-UTF8 or binary-heavy content; a monorepo.
- D1 behavior: cache read/write races (same repo requested from 5 tabs at once), expired rate-limit rows cleaned, `INSERT OR REPLACE` safety, table growth over time.
- CPU limit (10 ms free plan): look for any hot path that might exceed it (JSON parsing of large payloads, regex on 30 KB text, sorting 350 files).
- Time boundaries: hour/day rollover of the rate limit; what happens at exactly the limit; the daily cap message.

### H. Random user and chaos testing
Write a script (in `scripts/`, gitignored output) or drive the browser to act like 20 different random users, 25 actions each, choosing at random from: open any page, resize the window, toggle the level, paste garbage or empty input, click the example and then change it, spam-click buttons, press random keys and Escape/Tab/Enter, use Back and Forward, reload mid-action, open concept dialogs repeatedly, track and remove projects, import bad files, switch tabs, go offline and online, use the site with JavaScript errors injected, with cookies/localStorage disabled or full, in a private window, with a 320 px screen, with an RTL language, with browser zoom 300%, and with a very slow network. Log every console error, uncaught promise rejection and visible glitch. Include persona runs: a total beginner who has never seen GitHub, a vibecoder who pasted a 20,000 character chat, an impatient user who double-clicks everything, a keyboard-only user, a screen-reader user, a mobile user on a flaky connection, and a malicious user trying injection and abuse.

### I. Data quality and truthfulness (it is a teaching site)
- Read all 30 concept cards for factual errors, overclaims, unclear analogies and inconsistent tone; list each problem with a suggested correction. (A human still must make the final review; mark your list as AI-assisted.)
- Read every demo example output for errors.
- Run 5 different real repos and 5 different chats and judge the AI output: are claims grounded, do evidence files exist, are rewrites sensible, do concept links fit, any hallucinated files, lines or commits, any generic filler? Report a hit rate.
- Check that everything the README, DEVPOST.md and the site claim is actually true. Remove or soften any claim you cannot verify.

### J. Deployment and repo hygiene
- Fresh clone test: clone the repo to a temp folder, follow the README's "Run locally" steps exactly, confirm they work from scratch (missing steps, wrong commands).
- README accuracy: libraries list matches `package.json`, disclosed fonts and AI usage, live link works, license present or noted.
- `AI_USAGE.md` current and honest (it must say the concepts/demos are not human-reviewed until the human does it).
- Git: no large or junk files, no secrets in history, sensible commit messages, `.gitignore` correct.
- Live vs local parity: same behavior; `wrangler.jsonc`, migrations applied remotely, bindings present; health route; 404 pages; favicon; robots/sitemap/Open Graph tags and social share preview.
- Dead links: crawl every internal and external link.

## 3. Two final roleplay passes (do these AFTER A to J, on the live URL, with fresh eyes)

### Pass 1: the hackathon judge
You are a judge with 4 minutes per project and 40 projects to score. Open the live URL cold. Follow only what the site tells you. Try the fastest path to value, then try to break it the way a curious judge would (paste something odd, click fast, resize, open on a phone, try the example flow, read the Devpost text against the product). Score creativity, design, functionality, technical execution and presentation from 1 to 10, with a one-line reason each, the first impression in one sentence, the single thing that would make you remember it, and the single thing that would lose it points.

### Pass 2: the harsh critic
You are a senior engineer and designer who dislikes AI-generated projects and wants to find reasons to rank this lower. Be ruthless and specific: weak or generic UX, template-looking design, unclear value, broken or slow flows, shallow AI output, overclaims, accessibility failures, code smell, security gaps, copy that sounds like marketing filler, features that feel bolted on, inconsistencies, things that only work on the happy path. For each criticism give evidence (a file and line, a screenshot, a reproduction) and a severity (blocker / major / minor / nit).

## 4. Output
1. **Coverage table:** every checklist item with PASS / FAIL / NOT TESTED and a one-line note.
2. **Defect list**, ranked by severity: id, title, severity, where, steps to reproduce, expected vs actual, suspected cause, proposed fix, effort. Merge duplicates. Separate real defects from opinions.
3. **Judge and critic reports** from section 3.
4. Then enter plan mode, wait for my approval, fix all blockers and majors (and minors that are quick), one small commit each, re-test each fix locally and live, rerun `node scripts/smoke.mjs` against live, and extend `scripts/smoke.mjs` with a check for each bug that could regress.
5. Update CONTEXT.md (state, remaining Claude, remaining human) and AI_USAGE.md. Finish with: what was fixed, what was not fixed and why, what only I (the human) can do, and your honest confidence that the site is safe to submit.

Do not stop at the first problems you find. Keep testing until every phase is covered or you are blocked, and say plainly what you could not test.
