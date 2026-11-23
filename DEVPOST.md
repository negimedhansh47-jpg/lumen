# Devpost draft (edit before submitting)

Name: **Lumen** (working title, not final). Live: https://lumen-learn.lumen-learn.workers.dev. Code: https://github.com/negimedhansh47-jpg/lumen

## Tagline
Understand the code your AI writes.

## Inspiration
Millions of people now build software by prompting an AI. The code works, until it does not, and then they cannot tell what the AI built, why, or how to ask better. Tutorials teach syntax. Nobody teaches the engineering judgment behind the code the AI just wrote for you.

## What it does
- **Review a chat:** paste a conversation with an AI. Lumen finds the vague prompts, shows each one beside a better rewrite, names the problem and links the engineering concept you were missing. Every quoted excerpt is checked to really exist in your chat.
- **Explain a repo:** point it at a public GitHub repo. It draws an interactive architecture map (modules, layers, connections). Click a box for its role, why it exists, evidence files and the commits that touched it. Any commit can be explained: what changed, why it matters, the trade-offs.
- **Plan an idea:** describe an idea and get the key decisions (stack, data, auth, hosting) explained with trade-offs, first steps, and a ready-to-use CLAUDE.md for your AI tool.
- **30 concept cards** open from any chip, each with an analogy, when to use it and the trade-offs. If a card does not click, "Explain this better" re-teaches it another way with an example and a self-check question.
- **My project: learn as you build.** Save your plan or track your repo (stored only in your browser). Each time you come back, Lumen shows the commits that are new since your last visit, ready to explain, plus your plan checklist and the concepts you have explored.
- Every page has a one-click example that needs no AI call.

## How we built it
Cloudflare Workers with static assets (plain HTML, CSS and ES modules, no framework or bundler), D1 for cache and rate limits only, NVIDIA NIM (Nemotron 3.5 Super) as the model with a Workers AI fallback. One runtime dependency: zod.

## Technical choices worth knowing
- **The model is untrusted.** Output is schema-validated. Evidence file paths are verified against the repo's real file tree, line ranges against the text actually fetched, chat excerpts must be verbatim substrings, and unknown concepts are dropped. Ungrounded claims are removed rather than shown.
- **Prompt injection:** user content is fenced and treated as data. We tested a chat that told the model to ignore its instructions; it was ignored.
- **Privacy:** chats and ideas are never stored. Only public-repo analyses are cached.
- **Free-plan engineering:** the whole thing runs inside Workers' free limits (subrequest, CPU, D1 budgets); the design avoids per-commit GitHub calls for that reason.
- **Abuse protection:** per-visitor hourly limit (hashed IP) and a global daily cap, with friendly messages that point to the examples.

## Challenges
Reasoning models spent the whole token budget "thinking" and returned nothing, so we turn thinking off. Model JSON was often wrapped in text or had invalid escapes, so we parse the first balanced object and validate. Big repos needed key-file selection to stay inside limits.

## Accomplishments
A grounded, verifiable explanation layer: what Lumen shows can be traced to files and quotes, not vibes.

## What we learned
Choosing the model from measured runs (validity, latency) beat choosing by reputation. Most of the quality came from validating and grounding the output, not from the prompt.

## What's next
GitHub login for private repos, an in-editor extension, more concepts reviewed by teachers, and "explain this diff before you accept it" for AI pull requests.

## AI disclosure
Built with Claude Code (Claude Sonnet) as a coding assistant, with the human directing and reviewing. The concept library and example outputs were AI-drafted and are marked for human review. Full log: `AI_USAGE.md`. Runtime AI: NVIDIA NIM and Cloudflare Workers AI.

## Built with
Cloudflare Workers, Cloudflare D1, Workers AI, NVIDIA NIM, TypeScript, zod, HTML, CSS, JavaScript.

## Screenshots to take (human)
1. Landing hero with before/after card. 2. Chat review result. 3. Architecture map with the drawer open. 4. Commit explanation. 5. Kickoff with the CLAUDE.md block. 6. A concept card. 7. Mobile view.
