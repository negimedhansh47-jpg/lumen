# Devpost submission text

Name: **Lumen**. Live: https://lumen-learn.lumen-learn.workers.dev. Code: https://github.com/negimedhansh47-jpg/lumen

## Elevator pitch
A tutor for people who build with AI. Paste a chat, a GitHub repo or an idea, and it explains what your AI made and why, using your own code as the example.

## About the project
Built by Medhansh Negi.

### Why I built this
A lot of people now build apps by asking an AI to write the code. It usually works, but when something breaks it's hard to tell what the AI actually did or why it chose that setup. Tutorials explain general examples, not your own project. I wanted a tool that explains the code you already have, and also tells you when your prompts were the problem.

### What it does
There are three main tools. Each one has a ready-made example, so you can try it without typing anything.

- Plan an idea: describe a project idea and it goes through the big decisions one by one (database, hosting, sign-in and so on). You guess first, then see what it recommends and when another option would be better. At the end you get first steps and an AGENTS.md file to give your coding AI.
- Review a chat: paste a conversation you had with an AI. It points out the prompts that were too vague, explains what was missing, and shows a clearer version.
- Explain a repo: paste a public GitHub link and you get a map of how the project is split up. Click a box to see what it does, why it's there, which files it comes from and which commits changed it. Any commit can be explained in plain English.

Also:
- 35 short concept cards (caching, auth, APIs, prompt injection and more). If an explanation uses an idea you haven't opened yet, a card pops up.
- My project: save a plan or a repo in your browser, and next time it shows what changed since your last visit.
- Ask: follow-up questions about your repo or plan.
- A switch to explain things for beginners or for people with some experience.

### How I built it
It runs on Cloudflare Workers. The frontend is plain HTML, CSS and JavaScript with no framework. The backend is TypeScript, and Cloudflare D1 is only used for caching and rate limits. The AI model is NVIDIA NIM (Nemotron), with Workers AI as a backup if it fails.

I didn't want the site to make things up, so the server checks the model's answer before showing it: file paths have to exist in the repo, quotes from a chat have to really be in the chat, and anything that fails is dropped. Chats and ideas are never saved.

### Challenges
- Some models spent all their tokens "thinking" and returned empty answers, so I turned thinking off.
- The model's JSON was often broken or had extra text around it, so it has to be parsed carefully and every field validated.
- The free Cloudflare plan only allows a small number of network calls per request, so big repos needed a way to pick only the important files.

### What I learned
Checking the AI's output mattered more than writing a clever prompt.

### What's next
Private repos with a GitHub login, and an editor extension that explains a change before you accept it.

### AI use and credits
I used Claude Code (Claude Sonnet, then Claude Opus) as a coding assistant. I decided what to build, reviewed the changes and tested the site. The concept cards were drafted with AI and reviewed by me. The live explanations come from NVIDIA NIM and Cloudflare Workers AI. Library: zod. Fonts: Instrument Serif, Space Grotesk, Inter Tight and JetBrains Mono (Google Fonts). The full AI log is AI_USAGE.md in the repo. License: MIT.

## Built with
cloudflare-workers, cloudflare-d1, workers-ai, nvidia-nim, typescript, javascript, html5, css3, zod
