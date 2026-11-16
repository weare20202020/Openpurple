<div align="center">
  <pre style="display: inline-block; text-align: left; line-height: 1.15; font-size: 12px; font-family: 'Courier New', Courier, monospace; background: transparent; border: none; padding: 0;">
<span style="color: #64748b;">                   </span> <span style="color: #64748b;">                             </span>
<span style="color: #f1f5f9;">█▀▀█ █▀▀█ █▀▀█ █▀▀▄</span> <span style="color: #a855f7;">█▀▀█ █  █ █▀▀█ █▀▀█ █    █▀▀█</span>
<span style="color: #f1f5f9;">█  █ █  █ █▀▀▀ █  █</span> <span style="color: #c084fc;">█  █ █  █ █▀▀▄ █  █ █    █▀▀▀</span>
<span style="color: #64748b;">▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀</span> <span style="color: #e9d5ff;">█▀▀▀ ▀▀▀▀ ▀  ▀ █▀▀▀ ▀▀▀▀ ▀▀▀▀</span>
  </pre>
</div>

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

Most AI tools give you one assistant. OpenPurple gives you a team.

Three named agents — Alice, Bob, and Carol — share one terminal, each with its own sessions, its own context, and its own job. You talk to Alice, the lead. Alice breaks the work down and delegates to Bob and Carol over `send_message`, the way a real team passes work on Slack. When the work comes back, Alice merges it into one answer for you.

And the agents aren't black boxes you prompt and forget. They are colleagues you can talk to directly: switch to Bob mid-task and ask what he found, or jump to Carol and change her approach. The human stays in the team, not outside it.

大多数 AI 工具给你一个助手，OpenPurple 给你一个团队。

三个有名字的 Agent（Alice、Bob、Carol）共享一个终端，各自有独立的 Session、独立的上下文、独立的分工。你和主管 Alice 对话，Alice 拆任务，用 `send_message` 派给 Bob 和 Carol，像真人团队在 Slack 上交接一样；结果回来后，Alice 合并成一个答案交给你。

而且这些 Agent 不是你发完 prompt 就看不见的黑盒，它们是你能直接对话的同事：任务中途切到 Bob 问他查到了什么，或者切到 Carol 改她的思路。人就在团队里，不是在外面看。

A typical session looks like this:

```
You → Alice: "Compare these three options and give me one table."
Alice → Bob:   "Research options A and B, with sources."
Alice → Carol: "Verify Bob's numbers independently."
Bob → Alice:   "Done — table + sources."
Carol → Alice: "Verified, one correction."
Alice → You:   one merged table.
```

OpenPurple is under active development: everything described on this page is implemented and working, and the roadmap below is what's next.

---

## Why OpenPurple / 为什么选择 OpenPurple

Single-agent tools hit a wall on heavy, multi-stage work: one context window has to hold every stage, and by the last stage the model is skimming instead of thinking. Splitting the work across agents — each with a fresh context for its own stage — is the obvious fix. But most tools make you build that team yourself, or hand you subagents that vanish the moment the call ends.

OpenPurple takes the other path: the team is the product.

| Traditional AI Tool | OpenPurple |
|---|---|
| 单一模型，直接对话 | 三人团队，分工协作 |
| 所有上下文混在一起 | 每个 Agent 独立 Session、独立上下文 |
| 子代理用完即消失 | Agent 有身份、有自己的 Session，人能直接对话 |
| 无委托能力 | Agent 之间 `send_message` 委派任务 |
| 无多视角审查 | Bob 调研、Carol 核查、Alice 把关合并 |
| 人盯屏幕看 AI 跑 | 像 TL 一样设定方向，AI 团队自主推进 |
| 回传漏了没人管 | 有意的回传纪律 + `/heartbeat` 定时兜底 |

---

## Features / 功能

### Core Collaboration / 核心协作

- **3 Named Agents** — Alice (Lead/Coordinator), Bob (Researcher/Analyst), Carol (Engineer/Architect). Each has a dedicated system prompt: role, team conventions, and reply discipline.
- **Agents as colleagues** — every agent has a persistent identity, its own sessions, and its own context. Switch to any agent in the TUI and talk to it directly; it remembers its own work.
- **Dynamic agents** — `create_agent` lets a calling agent define a new team member (name, role, system prompt, model); the definition is registered at runtime and persisted, so the new agent survives restarts.
- **Agent-to-Agent (A2A) messaging** — `send_message` for inter-agent task delegation, like Slack for AI: direct session-to-session delivery, in-process, no external protocol, with a SQLite-backed inbox that survives restarts.
- **Task-scoped sessions** — delegations land in fresh sessions dedicated to that task, so work never pollutes an agent's old conversations; replies route back to the session that delegated.
- **Independent Sessions** — each agent runs its own sessions, each with an independent context window and conversation history.
- **Deliberate replies** — A delegates to B and finishes its turn; B works independently and replies via `send_message` only when the result warrants it. No automatic acknowledgments: each agent judges whether a reply is needed, so two agents never fall into an endless "ok / ok" loop.
- **`/heartbeat` fallback** — a periodic safety net for the event-driven design. Run `/heartbeat` and choose Pure Time (fire on a fixed interval, ignoring the task list) or Task Time (check the task list on every tick, and stop itself once everything is complete). On each tick, the agent checks its tasks, follows up on delegated work that hasn't come back, and checks the working directory for progress. No defaults: nothing runs until you choose.

### Mode System / 模式系统

- **Build mode** — Full tool access (read, write, edit, bash, task, skill, etc.)
- **Plan mode** — Read-only (all edit tools removed from tool dictionary; LLM literally cannot call them)
- **Per-agent** — Each agent (A/B/C) has its own mode, independently toggleable
- **TAB switch** — Press `TAB` to toggle Build ↔ Plan for the current agent
- **Persistent** — Mode saved to SQLite, survives disconnects and restarts

### TUI Experience / 终端体验

- **SolidJS + OpenTUI** — Reactive terminal UI with 30+ themes
- **Animated Logo** — Interactive particle-shimmer ASCII art logo (click to burst!)
- **Real-time Agent Status** — Idle ○ / Busy spinner per agent in status bar
- **ESC interrupt** — Interrupt LLM output mid-stream
- **Keyboard-driven** — Full keybind system, modal prompt editing

### Technical Foundation / 技术底座

- **Broad provider support** — OpenAI, Anthropic, Google, DeepSeek, GitHub Copilot, OpenRouter, and any OpenAI-compatible endpoint
- **SQLite + Drizzle** — Local-first storage, no cloud dependency
- **Effect-TS Architecture** — Type-safe dependency injection, composable services
- **Single Binary** — One self-contained binary per platform, built with `bun build`
- **Cross-platform builds** — Windows, macOS, and Linux targets from a single build script

### Innovation / 创新点

1. **Session-to-Session A2A** — Each agent runs its own sessions, each with an independent context window. `send_message` delivers straight into the target agent's session, which picks the message up and works on it in its own context — delegation that reads like a real team handoff.
2. **Per-agent Mode** — Build/Plan isn't global. A can be planning while B is building. This reflects how real teams work.
3. **Dictionary-level Tool Removal** — Plan mode doesn't just "tell" the LLM not to edit. It removes the edit tool definition from the AI's function calling dictionary entirely. The model cannot call what it cannot see.
4. **Event-driven delivery, heartbeat fallback** — Messages arrive the moment they're sent, with no polling; the heartbeat only guards against the case where a reply never comes. Delivery is event-driven, liveness is heartbeat-guarded.
5. **Team OS Paradigm** — You're not pair-programming with AI. You're the lead of a 3-person AI team. You set direction; they execute autonomously.

---

## Agents / Agent 系统

```
┌─────────────────────────────────────────────┐
│  Alice (A)      Lead / Coordinator          │
│  Plans, delegates, reviews, reports to you  │
├─────────────────────────────────────────────┤
│  Bob (B)        Researcher / Analyst        │
│  Searches, reads, analyzes, investigates    │
├─────────────────────────────────────────────┤
│  Carol (C)      Engineer / Architect        │
│  Codes, debugs, refactors, builds           │
└─────────────────────────────────────────────┘
```

Each agent has:
- Independent sessions & context windows
- A dedicated system prompt — role, team conventions, and reply discipline
- Independent conversation history
- Independent Build/Plan mode
- The ability to `send_message` to any other agent
- A human who can switch to it and talk to it directly

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
Tool definitions are filtered by the session's permission rules before the model ever sees them.

---

## Quick Start / 快速开始

### Download / 下载

The fastest way: download the binary for your platform from [GitHub Releases](https://github.com/weare20202020/Openpurple/releases) and run it. No install step.

最快的方式：从 [GitHub Releases](https://github.com/weare20202020/Openpurple/releases) 下载对应平台的二进制，直接运行，不用安装。

### Build from source / 源码构建

Prerequisites: **Bun** ≥ 1.3.14 and **Git**. Windows, Linux, and macOS are all supported.

```bash
git clone https://github.com/weare20202020/Openpurple.git
cd Openpurple
bun install
bun run build -- --single
```

The binary lands in `packages/opencode/dist/openpurple-<platform>-<arch>/bin/`.

### Run / 启动

```bash
# Linux / macOS
./packages/opencode/dist/openpurple-linux-x64/bin/openpurple

# Windows (PowerShell)
.\packages\opencode\dist\openpurple-windows-x64\bin\openpurple.exe
```

Running the binary with no arguments opens the TUI. Talk to Alice; press `Ctrl+P` → Switch agent to talk to Bob or Carol directly; `TAB` toggles Build/Plan; `/heartbeat` sets up the fallback timer; `/new` starts a fresh session.

不带参数运行即打开 TUI。和 Alice 对话；`Ctrl+P` → Switch agent 可直接和 Bob、Carol 对话；`TAB` 切换 Build/Plan；`/heartbeat` 设置兜底定时器；`/new` 开新 Session。

### Rebuild after changes / 修改源码后重建

```bash
cd packages/opencode
bun run build -- --single
# ⚠️ 构建前关闭所有 TUI 实例，否则 exe 被锁 EPERM (Windows)
```

---

## Architecture / 架构

```
┌─────────────────────────────────────┐
│  TUI (SolidJS + OpenTUI)            │
│  ├─ Prompt Input                    │
│  ├─ Agent Status Bar                │
│  ├─ Mode Label (Build · A)          │
│  └─ Keybind System                  │
├─────────────────────────────────────┤
│  Session System                     │
│  ├─ Session CRUD (SQLite)           │
│  ├─ LLM Loop / Context Compaction   │
│  └─ Permission / Mode System        │
├─────────────────────────────────────┤
│  Agent System                       │
│  ├─ Alice / Bob / Carol             │
│  ├─ AgentManager (status/inbox)     │
│  ├─ send_message / create_agent     │
│  └─ /heartbeat fallback timer       │
├─────────────────────────────────────┤
│  Tool Registry                      │
│  ├─ edit / write / apply_patch      │
│  ├─ bash / read / glob / grep       │
│  ├─ task / skill / webfetch         │
│  └─ lsp / todo / question           │
├─────────────────────────────────────┤
│  Effect-TS Layer Stack              │
│  ├─ Config / Auth / Provider        │
│  ├─ Plugin / Skill / MCP            │
│  └─ Database / Event / FSUtil       │
└─────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Language | TypeScript (Bun) |
| Framework | Effect-TS (Context/Layer/Schema) |
| TUI | SolidJS + OpenTUI |
| Storage | SQLite + Drizzle ORM |
| Build | Bun.build → single binary |
| Platform | Windows, macOS, Linux |

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
│   ├── llm/                 # LLM provider integrations
│   ├── sdk/                 # SDK
│   ├── server/              # Server
│   ├── ui/                  # UI
│   ├── plugin/              # Plugin system
│   ├── script/              # Scripts
│   ├── http-recorder/       # HTTP recorder
│   ├── effect-drizzle-sqlite/ # Effect + Drizzle + SQLite
│   └── effect-sqlite-node/  # Effect + SQLite (Node)
├── docs/                    # Debug notes & banners
├── openpurple.cmd           # Launcher
└── README.md                # This file
```

---

## Roadmap / 路线图

- [x] Agent definitions (Alice/Bob/Carol) with per-agent prompts
- [x] Build/Plan mode toggle (per-agent)
- [x] Independent agent sessions + session isolation
- [x] `send_message` tool + SQLite-backed A2A inbox
- [x] Task-scoped sessions — delegations never pollute old sessions
- [x] Agent status bar (idle/busy spinner)
- [x] `create_agent` — a calling agent defines a new team member (name, role, system prompt) and the definition is registered at runtime and persisted
- [x] `/heartbeat` fallback timer — Pure Time / Task Time, stops itself when all tasks complete
- [ ] Peer-to-peer agent links — direct agent-to-agent channels
- [ ] Async AgentRunner — background event loop
- [ ] Multi-agent TUI panels
- [ ] Task DAG orchestration engine
- [ ] Deadlock detection
- [ ] Cross-session persistent memory

---

## Credits / 致谢

OpenPurple is a fork of [OpenCode](https://github.com/anomalyco/opencode) v1.16.0 by Anomaly.  
Rebuilt with a new identity: **from single-agent tool to multi-agent team platform**.  
The team layer — named agents, A2A messaging, the SQLite-backed inbox, task-scoped sessions, and the heartbeat — is OpenPurple's own work on top of that foundation.

---

<p align="center">
  <sub>Built with Effect-TS · SolidJS · Bun · SQLite · 💜</sub>
</p>
