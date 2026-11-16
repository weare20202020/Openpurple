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
| 所有上下文混在一起 | 每个 Agent 独立 Session、独立上下文 |
| 无委托能力 | Agent 之间 `send_message` 委派任务 |
| 无多视角审查 | Bob 调研、Carol 开发、Alice 把关 |
| 人盯屏幕看 AI 跑 | 像 TL 一样设定方向，AI 团队自主推进 |

---

## Features / 功能

### Core Collaboration / 核心协作

- **3 Named Agents** — Alice (Lead/Coordinator), Bob (Researcher/Analyst), Carol (Engineer/Architect)
- **Agent-to-Agent (A2A) messaging** — `send_message` for inter-agent task delegation, like Slack for AI: direct session-to-session delivery, in-process, no external protocol
- **Independent Sessions** — Each agent has its own context window, memory, and conversation history
- **Async, deliberate replies** — A delegates to B and finishes its turn; B works independently and replies via `send_message` only when the result warrants it. No automatic acknowledgments: each agent judges whether a reply is needed, so two agents never fall into an endless 'ok / ok' loop.

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
- **Single Binary** — `bun build` into one `openpurple.exe` (~140MB)
- **Cross-platform builds** — Windows, macOS, and Linux targets from a single build script

### Innovation / 创新点

1. **Session-to-Session A2A** — Each agent runs an independent session with its own context window. `send_message` delivers straight into the target agent's session, which picks the message up and works on it in its own context — delegation that reads like a real team handoff.
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

### Prerequisites

- **Windows** (primary), or Linux/macOS
- **Bun** ≥ 1.3.14
- **Git**

### Clone & Build

OpenPurple 是单文件二进制发布，先 clone 后本地构建：

```bash
git clone https://github.com/weare20202020/Openpurple.git
cd Openpurple/packages/opencode
bun install
bun run build -- --single
```

构建产物在 `dist/openpurple-<平台>-<架构>/bin/`，Windows 上是 `openpurple.exe`。

### Run / 启动

```bash
# 在 repo 根目录
.\openpurple.cmd

# 或手动：
.\packages\opencode\dist\openpurple-windows-x64\bin\openpurple.exe run --interactive
```

Linux/macOS 上直接运行对应平台的二进制：

```bash
./packages/opencode/dist/openpurple-linux-x64/bin/openpurple
```

### Rebuild after changes / 修改源码后重建

```bash
cd packages/opencode
bun run build -- --single
# ⚠️ 构建前关闭所有 TUI 实例，否则 exe 被锁 EPERM
```

### Distribution / 分发

两种方式：

**源码构建** — 按上面的 Clone & Build 步骤本地构建（推荐，Windows/macOS/Linux 都可）  
**npm** — `npm install -g openpurple`（发布流程有待修复，暂不可用）

```bash
# 发布到 npm（maintainer 操作）
cd packages/opencode
npm publish
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

- [x] Agent definitions (Alice/Bob/Carol)
- [x] Build/Plan mode toggle (per-agent)
- [x] Independent agent sessions
- [x] `send_message` tool
- [x] Agent status bar (idle/busy spinner)
- [ ] `create_agent` — a calling agent defines a new team member (name, role, system prompt) and the definition is registered at runtime
- [ ] Session isolation
- [ ] 发布流程修复 — npm 平台包（linux/darwin）与安装链
- [ ] Async AgentRunner — background event loop
- [ ] Multi-agent TUI panels
- [ ] Task DAG orchestration engine
- [ ] Agent heartbeat & deadlock detection
- [ ] Cross-session persistent memory


---

## Credits / 致谢

OpenPurple is a fork of [OpenCode](https://github.com/anomalyco/opencode) v1.16.0 by Anomaly.  
Rebuilt with a new identity: **from single-agent tool to multi-agent team platform**.

---

<p align="center">
  <sub>Built with Effect-TS · SolidJS · Bun · SQLite · 💜</sub>
</p>
