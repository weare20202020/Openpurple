# OpenPurple — 项目状态

> 最后更新: 2026-06-15

---

## 项目定位

基于 opencode v1.16.0 fork 的多 Agent 协作平台。
不是 Claude Code 类开发助手，而是 agent 间自主协作 + 人类监督的群组操作系统。

---

## 仓库结构

```
D:\桌面\Purple-AI\
├── opencode-fork/          # 主工作目录（实际代码 + 编译产出）
│   ├── openpurple.cmd      # 启动命令
│   └── packages/opencode/  # 核心包
│       ├── src/            # 源代码
│       ├── dist/           # 编译产出（exe 143MB）
│       └── script/         # 构建脚本
├── openpurple/             # 文档仓库（PLAN.md, STATUS.md, changelog）
├── purpleai/               # 旧原型（Ink替代试验田，非我们项目）
├── other/                  # 历史设计文档（v1.5~1.9 架构文档）
└── app/                    # opencode web UI（不动）
```

---

## 当前状态

**`openpurple` 命令可用** — 指向 exe 在 `packages/opencode/dist/openpurple-windows-x64/bin/openpurple.exe`

### 已完成

#### Mode 切换（Build / Plan）
- **TAB** 切换当前 Agent（A/B/C）的 mode：Build ↔ Plan
- Build mode：正常模式，所有工具可用
- Plan mode：只读模式，edit / write / apply_patch 被禁止
  - System prompt 注入 Plan 提示词
  - 工具字典层面删除 edit 工具定义（LLM 看不到，不会调用）
  - Session permission 持久化到 SQLite，断线重建不丢失
- Shift+TAB 反向切换
- 状态标签实时反映在左下角
- Per-agent 独立 mode（A 在 Plan，B 仍在 Build）
- KV 存储（`~/.local/state/openpurple/kv.json`）

### 已完成（属于 opencode 上游自带 + 本地 branding）
- 完整的 CLI 框架（yargs, 20+ 子命令）
- 完整的 Session 系统（SQLite + Drizzle ORM, LLM 循环, context 压缩）
- 多 Provider 支持（OpenAI, Anthropic, Google, DeepSeek 等 20+）
- TUI（SolidJS + OpenTUI, 30+ 主题）
- Agent 定义（Alice/Bob/Carol 已配置）
- 工具系统（bash, read, write, edit, glob, grep, task, skill 等）
- 紫色主题 + openpurple branding

### 未完成（需要开发的多 Agent 能力）
> 详见 PLAN.md

#### Phase 1 — 多 Agent 运行时基础（未开始）
1. AgentBus 独立模块（EventEmitter 消息总线）
2. Agent 运行时隔离（独立 Context Window / Session）
3. 异步 A2A 通信（非阻塞消息投递 + 回调）
4. Agent 状态 → TUI（实时显示 Online/Working/Idle）
5. create_agent 工具（运行时动态创建 Agent）

#### Phase 2 — 任务编排引擎
- Task 定义 & DAG 依赖图
- 调度器（任务排队、并行度控制）
- 结果总线（任务输出自动转为下游输入）

#### Phase 3 — 系统韧性
- Agent 心跳/超时/死锁检测
- API Rate Limiting
- 工具权限隔离
- 审批流
- 跨 Session 记忆

#### Phase 4 — 产品化
- TUI 多 Agent 体验（面板、混流、切换）
- CLI 命令（agent list/create/kill, task list）
- 文档 & 发布

---

## 技术栈

| 层 | 选型 |
|------|------|
| 语言 | TypeScript (Bun) |
| 架构 | Effect-TS (Context/Layer/Schema) |
| TUI | SolidJS + OpenTUI (@opentui/solid) |
| 存储 | SQLite + Drizzle ORM |
| 构建 | Bun.build → 单文件 exe |
| 平台 | Windows 优先（跨平台支持） |

## 关键文件

| 文件 | 说明 |
|------|------|
| `packages/opencode/src/agent/agent.ts` | Agent 定义（Alice/Bob/Carol） |
| `packages/opencode/src/agent/manager.ts` | 未实现（需重写） |
| `packages/opencode/src/tool/registry.ts` | 工具注册中心 |
| `packages/opencode/src/tool/send-message.ts` | 未实现（需重写） |
| `packages/opencode/src/tool/create-agent.ts` | 未实现（需重写） |
| `packages/opencode/src/session/prompt/default.txt` | LLM 系统提示词（含多 Agent 协作段落） |
| `packages/opencode/src/effect/app-runtime.ts` | AppLayer 启动链 |
| `packages/opencode/script/build.ts` | 构建脚本 |
| `packages/opencode/package.json` | 包配置（name: openpurple） |

---

## 已知约束

- `openpurple.cmd` 指向 dist 中 exe，修改源码后需重新编译
- 构建命令: `cd packages/opencode && bun run build -- --single --skip-install`
- 备份在 `D:\桌面\opencode-fork-backup`
- 项目没有 `.gitignore`，git init 后需注意忽略 `node_modules/` `dist/` 等
