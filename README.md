<p align="center">
  <img src="https://raw.githubusercontent.com/weare20202020/Openpurple/main/docs/banner.svg" alt="OpenPurple" width="800" />
</p>

<p align="center">
  <strong>Multi-Agent Collaboration Platform</strong><br>
  多 Agent 协作平台 — Agent 之间像真人团队一样协作
</p>

<p align="center">
  <a href="#what-is-openpurple--openpurple-是什么">What is OpenPurple</a> ·
  <a href="#why-openpurple--为什么选择-openpurple">Why</a> ·
  <a href="#features--功能">Features</a> ·
  <a href="#agents--agent-系统">Agents</a> ·
  <a href="#buildplan-mode--buildplan-模式">Mode</a> ·
  <a href="#quick-start--快速开始">Quick Start</a> ·
  <a href="#architecture--架构">Architecture</a>
</p>

---

## What is OpenPurple / OpenPurple 是什么

> **OpenPurple is not a Claude Code clone. It's a team OS.**
> **不是开发助手，是团队操作系统。**

Three AI agents — Alice, Bob, and Carol — collaborate in real-time through a TUI.  
You are the lead. You talk to Alice. Alice delegates to Bob and Carol.  
Each agent has its own memory, its own session, its own context window.  
They talk to each other via `send_message`, just like a real team on Slack.

三个 AI Agent（Alice/Bob/Carol）通过 TUI 实时协作。  
你是主管，和 Alice 对话。Alice 委托任务给 Bob 和 Carol。  
每个 Agent 有独立的记忆、独立的 Session、独立的 Context Window。  
彼此通过 `send_message` 沟通，像真人员工在 Slack 上一样。

---

## Why OpenPurple / 为什么选择 OpenPurple

| Traditional AI Tool | OpenPurple |
|---|---|
| 单一模型，直接对话 | 三人团队，分工协作 |
| 所有上下文混在一起 | 每个 Agent 独立 Session，信息隔离 |
| 无委托能力 | Agent 之间 `send_message` 委派任务 |
| 无多视角审查 | Bob 调研、Carol 开发、Alice 把关 |
| 人盯屏幕看 AI 跑 | 像 TL 一样设定方向，AI 团队自主推进 |

---

## Features / 功能

### Core Collaboration / 核心协作

- **3 Named Agents** — Alice (Lead/Coordinator), Bob (Researcher/Analyst), Carol (Engineer/Architect)
- **Agent-to-Agent (A2A)** — `send_message` tool for inter-agent task delegation, like Slack/Skype for AI
- **Isolated Sessions** — Each agent has independent context window, memory, and conversation history
- **Async Non-blocking** — A delegates to B, finishes current turn; B works independently; results flow back automatically

### Mode System / 模式系统

- **Build mode** — Full tool access (read, write, edit, bash, task, skill, etc.)
- **Plan mode** — Read-only (all edit tools removed from tool dictionary; LLM literally cannot call them)
- **Per-agent** — Each agent (A/B/C) has its own mode, independently toggleable
- **TAB switch** — Press `TAB` to toggle Build ↔ Plan; `Shift+TAB` reverse
- **Persistent** — Mode saved to SQLite, survives disconnects and restarts

### TUI Experience / 终端体验

- **SolidJS + OpenTUI** — Reactive terminal UI with 30+ themes
- **Animated Logo** — Interactive particle-shimmer ASCII art logo (click to burst!)
- **Real-time Agent Status** — Idle ○ / Busy spinner per agent in status bar
- **ESC interrupt** — Interrupt LLM output mid-stream
- **Keyboard-driven** — Full keybind system, Vim-like modal editing

### Technical Foundation / 技术底座

- **20+ LLM Providers** — OpenAI, Anthropic, Google, DeepSeek, GitHub Copilot, and more
- **SQLite + Drizzle** — Local-first storage, no cloud dependency
- **Effect-TS Architecture** — Type-safe dependency injection, composable services
- **Single Binary** — `bun build` into one `openpurple.exe` (~140MB)
- **Windows-first** — Cross-platform support planned

### Innovation / 创新点

1. **Session-to-Session A2A** — Not tool-to-agent. Each agent has an independent session. Communication is session writing into another session's history. No message bus needed.
2. **Per-agent Mode** — Build/Plan isn't global. A can be planning while B is building. This reflects how real teams work.
3. **Dictionary-level Tool Removal** — Plan mode doesn't just "tell" the LLM not to edit. It removes the edit tool definition from the AI's function calling dictionary entirely. The model cannot call what it cannot see.
4. **Team OS Paradigm** — You're not pair-programming with AI. You're the lead of a 3-person AI team. You set direction; they execute autonomously.

---

## Agents / Agent 系统

```
┌─────────────────────────────────────────────┐
│  Alice (A)      Lead / Coordinator         │
│  Plans, delegates, reviews, reports to you  │
├─────────────────────────────────────────────┤
│  Bob (B)        Researcher / Analyst       │
│  Searches, reads, analyzes, investigates   │
├─────────────────────────────────────────────┤
│  Carol (C)      Engineer / Architect       │
│  Codes, debugs, refactors, builds          │
└─────────────────────────────────────────────┘
```

Each agent has:
- Independent session & context window
- Independent memory & conversation history
- Independent Build/Plan mode
- The ability to `send_message` to any other agent
- The ability to `create_agent` (spawn new team members at runtime)

---

## Build/Plan Mode / Build/Plan 模式

| Aspect | Build | Plan |
|---|---|---|
| Read | ✅ | ✅ |
| Search / Grep / Glob | ✅ | ✅ |
| Bash | ✅ | ✅ |
| **Edit / Write / Patch** | ✅ | ❌ blocked |
| LLM perception | All tools visible | Edit tools removed from dictionary |
| Use case | Implementation | Discussion, design, review |
| Switch | `TAB` | `TAB` |

Each agent independently toggles. A can be in Plan (thinking) while C is in Build (coding).  
The system prompt is dynamically injected; tool definitions are filtered at the AI SDK layer.

---

## Quick Start / 快速开始

### Prerequisites

- **Windows** (primary platform)
- **Bun** ≥ 1.3.14

### Build

```bash
cd packages/opencode
bun run build -- --single
```

### Run

```bash
openpurple run --interactive    # launch TUI
openpurple                      # CLI help
```

### Development

```bash
# After modifying source:
cd packages/opencode
bun run build -- --single
# Close all TUI instances first (exe file lock)
```

---

## Architecture / 架构

```
┌─────────────────────────────────────┐
│  TUI (SolidJS + OpenTUI)           │
│  ├─ Prompt Input                   │
│  ├─ Agent Status Bar               │
│  ├─ Mode Label (Build · A)         │
│  └─ Keybind System                 │
├─────────────────────────────────────┤
│  Session System                    │
│  ├─ Session CRUD (SQLite)          │
│  ├─ LLM Loop / Context Compaction │
│  └─ Permission / Mode System       │
├─────────────────────────────────────┤
│  Agent System                      │
│  ├─ Alice / Bob / Carol            │
│  ├─ AgentManager (status/inbox)    │
│  └─ send_message / create_agent    │
├─────────────────────────────────────┤
│  Tool Registry                     │
│  ├─ edit / write / apply_patch     │
│  ├─ bash / read / glob / grep      │
│  ├─ task / skill / websearch       │
│  └─ lsp / todo / question          │
├─────────────────────────────────────┤
│  Effect-TS Layer Stack             │
│  ├─ Config / Auth / Provider       │
│  ├─ Plugin / Skill / MCP           │
│  └─ Database / Event / FSUtil      │
└─────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Language | TypeScript (Bun) |
| Framework | Effect-TS (Context/Layer/Schema) |
| TUI | SolidJS + OpenTUI |
| Storage | SQLite + Drizzle ORM |
| Build | Bun.build → single binary |
| Platform | Windows (cross-platform planned) |

---

## Project Structure / 项目结构

```
openpurple/
├── packages/
│   ├── opencode/            # Core package
│   │   ├── src/
│   │   │   ├── agent/       # Agent definitions & manager
│   │   │   ├── session/     # Session engine, LLM loop
│   │   │   ├── tool/        # Tool registry & implementations
│   │   │   ├── cli/cmd/tui/ # Terminal UI
│   │   │   ├── server/      # HTTP API handlers
│   │   │   └── effect/      # Effect layer wiring
│   │   ├── script/build.ts  # Build pipeline
│   │   └── dist/            # Build output (exe)
│   ├── app/                 # Web UI (upstream, unchanged)
│   ├── core/                # Shared schemas & utilities
│   └── llm/                 # LLM provider integrations
├── docs/                    # Implementation docs
├── openpurple.cmd           # Launcher
├── PLAN.md                  # Development roadmap
├── STATUS.md                # Current project status
└── README.md                # This file
```

---

## Roadmap / 路线图

- [x] Agent definitions (Alice/Bob/Carol)
- [x] Build/Plan mode toggle (per-agent)
- [x] Independent agent sessions
- [x] `send_message` / `create_agent` tools
- [x] Agent status bar (idle/busy spinner)
- [ ] AgentBus — A2A message routing
- [ ] Async AgentRunner — background event loop
- [ ] Multi-agent TUI panels
- [ ] Task DAG orchestration engine
- [ ] Agent heartbeat & deadlock detection
- [ ] Cross-session persistent memory

See [PLAN.md](./PLAN.md) and [STATUS.md](./STATUS.md) for details.

---

## Credits / 致谢

OpenPurple is a fork of [OpenCode](https://github.com/anthropics/opencode) v1.16.0 by Anthropic.  
Rebuilt with a new identity: **from single-agent tool to multi-agent team platform**.

---

<p align="center">
  <sub>Built with Effect-TS · SolidJS · Bun · SQLite · 💜</sub>
</p>
