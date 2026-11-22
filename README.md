# Lumen

Understand the code your AI writes. Paste an AI chat or connect a public GitHub repo and get every change explained, the architecture mapped, and your prompts coached.

Built for the Roxten Studios "Build Your Own Website" hackathon. Status: Step 0 (setup). See [SPEC.md](SPEC.md).

## Stack
Cloudflare Workers with static assets, TypeScript API in `/src`, plain HTML/CSS/JS in `/public`, D1 for cache and rate limits.

## Dev dependencies
`wrangler`, `typescript`, `@cloudflare/workers-types`.

## Fonts
Instrument Serif, Inter Tight, JetBrains Mono via Google Fonts (SIL OFL).

## AI disclosure
See [AI_USAGE.md](AI_USAGE.md).
