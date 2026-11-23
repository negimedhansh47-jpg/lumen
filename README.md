# Lumen

**Understand the code your AI writes.**

Built for the Roxten Studios "Build Your Own Website" hackathon. Live: https://lumen-learn.lumen-learn.workers.dev

Lumen teaches software engineering to people who build with AI ("vibecoders"). It does not just document code. It teaches at the reader's level, per change, grounded in evidence from their own code, and it coaches the prompts that produced it.

## What it does
| Page | What you get |
|---|---|
| **Review a chat** | Paste an AI conversation. Lumen flags vague prompts, shows each one beside a rewrite (before/after), and names the concept you were missing. |
| **Explain a repo** | Paste a public GitHub URL. An interactive architecture map: modules laid out by layer, click one for its role, why it exists, evidence (real file paths and lines) and commits that touched it. |
| **Commit timeline** | Recent commits, each explainable in plain English with design reasoning, trade-offs and alternatives. |
| **Plan an idea** | Describe an idea. Get 4 to 6 key decisions explained and a ready-made `CLAUDE.md` for your AI. |
| **Concept cards** | 30 concept cards (analogy, when to use, trade-offs) open from any chip. "Explain this better" asks the AI to re-teach a card another way, with an example and a self-check question. |
| **My project** | Learn as you build: save a plan or track a repo in your browser. Each visit shows commits that are new since last time (explainable), a checklist of your plan, and the concepts you have explored. Export/import as a file. |
| **Ask about your project** | Chat with the AI about one project (a tracked repo or a saved plan). Answers use only what Lumen has seen; cited files are checked against the repo map. The conversation is never saved. |
| **Examples** | Every page has an example that runs with zero model calls. |

The "Explain for" switch (Beginners / Some experience) changes explanation depth.

## How it avoids made-up answers
- Every module must cite evidence. The server checks each cited path exists in the repo's file tree and drops modules it cannot ground.
- Line ranges are kept only if they fall inside text the server actually fetched.
- Chat excerpts must appear verbatim in the pasted chat, otherwise the item is dropped.
- Model output is schema-validated; unknown concept ids are dropped. Content from users and repos is wrapped as data and never treated as instructions.
- The UI never uses `innerHTML` for model or user text.

## Privacy
Chats and ideas are processed in memory and never stored or logged. Only analyses of **public** repositories are cached (keyed by commit sha). Only `github.com` owner/name targets are accepted. "My project" is stored only in your browser's localStorage and is never sent to the server.

## Stack
Cloudflare Workers with static assets. Frontend is plain HTML, CSS and ES modules (no framework, no build step). API is TypeScript in `/src`. D1 stores the cache and rate-limit counters only. LLM: NVIDIA NIM (`nvidia/nemotron-3.5-super-vl-120b-a12b`), with a Workers AI fallback (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).

### Libraries
| Library | Why |
|---|---|
| `zod` | Validates requests and model output |
| `wrangler`, `typescript`, `@cloudflare/workers-types` | Dev tooling |

### Fonts
Instrument Serif (display), Space Grotesk (headings), Inter Tight (body), JetBrains Mono (labels and code). All Google Fonts, SIL Open Font License.

## AI disclosure
- **Claude Code (Claude Sonnet 5.5)** wrote the code, the concept library drafts and the example data under human direction.
- **NVIDIA NIM** (Nemotron 3.5 Super) powers the live explanations; **Workers AI** is the fallback.
- A human must review the concept library (`public/concepts/concepts.json`) because it is teaching content.
- Full log with dates and what was reviewed: [AI_USAGE.md](AI_USAGE.md). Model comparison results are there too.

## Run locally
```
npm install
# create .dev.vars (gitignored) with NVIDIA_API_KEY=..., IP_SALT=..., optional GITHUB_TOKEN=...
npx wrangler d1 migrations apply lumen-db --local
npx wrangler dev
```
Check a running instance (local or deployed) with `node scripts/smoke.mjs <base-url>`. Regenerate the examples with `node scripts/make-demo.mjs` while `wrangler dev` is running on port 8799.

## Platform limits it is designed around (Workers free plan)
50 subrequests and 10 ms CPU per request. D1 queries count as subrequests. Analysis is split into small endpoints and the client orchestrates them. See [SPEC.md](SPEC.md).

## Future work
- MCP server so an AI assistant can ask Lumen to explain its own changes.
- Private repos via a read-only GitHub App.
- Folder or zip upload.
- Linking chat messages to the commits they produced.
- Live agent hooks that explain changes as they happen.
