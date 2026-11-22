# AI usage log

| Date | What was generated | Tool / model | Human review |
|---|---|---|---|
| 2026-11-22 | Step 0 setup: `wrangler.jsonc`, `tsconfig.json`, `src/index.ts` (router + `/api/health`), placeholder `public/index.html`, `migrations/0001_init.sql`, README stub, this file | Claude Code, Claude Sonnet 5.5 | Pending human review |

## Step 1: LLM feasibility (2026-11-22)

Tool: Claude Code (Claude Sonnet 5.5) wrote `src/llm.ts`, `src/prompts/*`, `scripts/llm-test.ts`. Human review of model output quality: pending, see decision below.

Test set: 3 vague chats (login, todo, deploy) + 1 real diff (this repo, commit d6e6350). Level: beginner. Cache/store: none.

| Model | Result | Latency | Notes |
|---|---|---|---|
| `nvidia/nemotron-3.5-super-vl-120b-a12b` (**chosen**) | 4/4 valid | 3.5-5.4 s | Verbatim excerpts, all evidence paths real. Concept lists padded on commits. Rewrites invent example details (fake file path/error text). |
| `poolside/laguna-xs-2.1` | 4/4 valid | 4-23 s (one 22.9 s run, one transient `fetch failed`) | Richest commit explanation, line-level evidence, spotted missing TTL cleanup. Slower and less consistent. Wrongly listed `validation`. |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | 3/4 valid | 2.4-4.2 s | Invented `problem` value in one run (strict enum rejected it). |
| `mistralai/mistral-large-4-1t-a52b` | 0/4 | timeout (25 s) | Too slow on the free NIM queue. |
| `z-ai/glm-5.3-flash` | 0/4 | timeout (25-60 s) | Hangs even on a trivial prompt. |
| Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (fallback) | 3/3 valid | 4.4-6.4 s | Works, but shallower `why` text and invents example errors. |

Findings that changed the code: reasoning models spend the token budget thinking and return empty content, so requests send `chat_template_kwargs.enable_thinking=false`; the JSON extractor is brace-balanced (models add trailing text); invented concept ids become null instead of failing; Workers AI can return an object instead of text; `\'` escapes are repaired.

Open: concept lists are over-filled (tune prompt in Step 6: "max 3, only if directly shown"). Rewrites should be told not to invent specifics (Step 3). Mistral/GLM may be worth retrying when the NIM queue is quieter.
