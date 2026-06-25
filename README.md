# aether-trainer

An interactive trainer for learning the [Aether](https://github.com/andrewbaldock/aether)
codebase as if it were a steampunk machine. The whole architecture — frontend,
contract, backend, planner, agent loop, providers, persistence — is drawn as one
big contraption of zones and parts. You study it, then play five game modes that
drill recall, diagnosis, and out-loud explanation until you can rebuild the system
from memory.

Built as interview prep: know every station of the machine and what breaks where.

<img width="1645" height="1160" alt="image" src="https://github.com/user-attachments/assets/a8e3dae5-9f54-44d9-9f04-b2195d9eb4f7" />


## The machine

13 **zones** laid out left-to-right along the real data flow:

```
YOU type → Frontend → Chat Pipe → Contract / SSE → Backend → Planner
  → Agent Loop → Providers / Tools → SSE back → Widgets → Bigsail
  → Persistence,  with Deploy / Ops underneath it all
```

Each zone contains individual **parts** (one node per knowledge card), rendered
with [@xyflow/react](https://reactflow.dev). 110 cards in total, tagged `file`,
`concept`, or `gotcha` — the gold gotcha cards are the ones that bite in an
interview.

## Game modes

| Mode | What it drills |
|------|----------------|
| **Recall** | Flashcards with spaced repetition (SRS). The `⟳ Due` button surfaces everything due right now. |
| **Diagnose** | A symptom appears — pick which station is responsible. |
| **Explain** | Interview simulator: explain a part out loud, self-grade against the model answer. |
| **Watch** | Guided walk-through of one live turn flowing through the machine. |
| **Repair** | The machine is torn down — reassemble it from memory (CPTRK). |

A **Readiness** meter in the HUD tracks overall mastery, plus a gold counter for
gotcha cards mastered.

## Run it

Uses [Bun](https://bun.sh).

```bash
bun install
bun dev        # http://localhost:5177
```

```bash
bun test       # vitest
bun run build  # tests + typecheck + production build
```

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · @xyflow/react · vitest. Progress
(SRS state) persists to `localStorage` — no backend.

## Layout

- `src/machine/` — React Flow nodes (zones, parts, bands) + layout
- `src/data/` — cards, stations, mechanics, narratives (the knowledge base)
- `src/game/` — the five modes + SRS engine + progress provider
- `src/ai/` — answer grading for Explain mode
