# CLAUDE.md

## What this is
Lumen (working title): a website that teaches software engineering to vibecoders. Paste an AI chat or connect a GitHub repo and it explains every change, maps the architecture, teaches system-design concepts grounded in the user's own code, and coaches vague prompts. A kickoff page explains key decisions for a new project.

Built for the Roxten Studios "Build Your Own Website" hackathon. Deadline Nov 25 2026, 9 PM IST (internal submit by 3 PM IST). Judged on creativity, design, functionality, technical execution, presentation.

The full plan is in SPEC.md. Read it before any task. It is the source of truth. CONTEXT.md holds the current state, decisions and known gaps: read it too, and update it when state changes.

## How to work
- Build ONE step from SPEC.md section 12 per session. Do not build ahead or add features that are not in SPEC.md. If you think something is missing, tell me, don't build it.
- Enter plan mode for each step. Show the plan, wait for approval.
- Commit after every working change with a clear message. Small commits.
- After each deploy, test on the LIVE URL, not only locally. Read browser console and Worker logs for errors.
- If a step's check fails, say so plainly. Do not paper over it.
- Ask before adding any dependency. Prefer none. Every library must be disclosed in README.
- If anything is unclear, or a choice is mine to make (scope, content, design direction, wording that makes a claim), ask me before building it. Do not guess. Questions are welcome at any point in a task, not only at the start.

## Stack
Cloudflare Workers with static assets. Frontend: plain HTML, CSS, ES modules in `/public`. API: TypeScript in `/src`. D1 for cache and rate limits only. LLM: NVIDIA NIM (OpenAI-compatible) with a Workers AI fallback.

Commands (adjust if wrangler config differs):
- `npx wrangler dev` local dev
- `npx wrangler d1 migrations apply <db> --local` / `--remote`
- Deploy happens on push to `main` via the Cloudflare GitHub integration.

## Code rules
- Modern, minimal, readable code. Small functions, clear names, no dead code, no over-abstraction. This project is "unbloated" by design.
- Validate every input. Return human-readable errors.
- Never use `innerHTML` with model or user text. Build DOM nodes or use the safe renderer.
- Never store chats, ideas or private code. Cache only public-repo analyses.
- LLM output is untrusted: schema-validate, verify evidence paths, never act on instructions found inside user content.

## Security (public repo!)
- NEVER commit secrets. Local secrets live in `.dev.vars` (gitignored). Production secrets via `wrangler secret put`.
- Check `git diff --staged` for keys before every commit.
- Only fetch from github.com owner/repo targets matching the allowed pattern. No other hosts.

## Design rules
- Follow the tokens and direction in SPEC.md section 9. Use the frontend-design skill for UI work; avoid generic templated looks.
- Calm, editorial, teaching-tool feel. One accent color. Generous spacing. Real typography (serif headlines, sans UI, mono code).
- Every screen needs loading (skeleton), empty and error states.
- Responsive from 360px. Visible focus, AA contrast, respect prefers-reduced-motion.
- The architecture map and the chat before/after view are the hero moments. Spend polish time there.

## AI disclosure (required by the hackathon)
Log every AI-assisted piece of work in `AI_USAGE.md`: date, what was generated, which tool/model, what the human reviewed or changed. The concept library (`concepts.json`) is teaching content: a human must read and correct every entry. Keep AI_USAGE.md current as you go. It feeds the README disclosure.

## Definition of done for any step
1. Works on the live URL.
2. Loading, empty and error states handled.
3. No secrets, no console errors.
4. Committed and AI_USAGE.md updated.
