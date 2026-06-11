## Phase 1 — 提交记录

### Commit 1: AgentBus + create_agent + AgentManager wiring
**Hash:** `a530552` (dev)
**日期:** 2026-06-09

**新增:**
- `agent/bus.ts` — AgentBus (EventEmitter 消息总线)
- `agent/manager.ts` — AgentManager (Effect Service, 注册/状态/路由)
- `tool/create-agent.ts` — create_agent 工具 (name/role/expertise)

**修改:**
- `effect/app-runtime.ts` — +AgentManager.layer
- `tool/registry.ts` — +CreateAgentTool 注册

### Commit 2: 修复 — 自动注册 Agent + A2A 工具接线 + Prompt 更新
**Hash:** `58b1e64` (dev)
**日期:** 2026-06-09

**修改:**
| 文件 | 改动 |
|------|------|
| `agent/manager.ts` | 启动时自动注册 Alice(A)/Bob(B)/Carol(C)；每个 Agent 注册到 AgentBus |
| `tool/send-message.ts` | AgentManager 获取移到 execute(非 init)；通过 AgentBus 异步投递；非阻塞 |
| `session/prompt/default.txt` | Multi-Agent 区域更新：明确 ID A/B/C，说明 create_agent 场景 |
| `tool/registry.ts` | +send_message 工具注册 |

**删除:**
- `agent/init.ts` (功能合并到 manager.ts)

### Commit 3: register send_message in ToolRegistry
**Hash:** `ebe92d1` (dev)
**日期:** 2026-06-09

| 文件 | 改动 |
|------|------|
| `tool/registry.ts` | +SendMessageTool 导入 + yield 初始化 + Effect.all + builtin 列表 |

**效果:** LLM 现在可以通过 function calling 调用 send_message，不再是纯文本提示。

---

### 架构状态

```
┌──────────────────────────────────────────┐
│  AppRuntime (AppLayer)                   │
│  ├─ AgentManager.layer                   │
│  │   ├─ 自动注册 Alice/Bob/Carol         │
│  │   └─ AgentBus 就绪                    │
│  ├─ ToolRegistry                         │
│  │   ├─ send_message  (异步 A2A)         │
│  │   ├─ create_agent (运行时创建 Agent)   │
│  │   └─ ...其他工具                      │
│  └─ SessionSystem                        │
│      └─ LLM 调用链                       │
└──────────────────────────────────────────┘
```

### 测试指南

**启动:**
```bash
openpurple run --interactive
```

**测试项:**

1. **查看工具列表** — 输入 `What tools do you have?`
   应看到 `send_message` 和 `create_agent` 在列表中

2. **创建新 Agent** — 让 LLM 调用 create_agent:
    ```
    Create a new agent called "Reviewer" who is a code reviewer with expertise in security
    ```

3. **委托任务给 Bob** — 让 LLM 用 send_message:
    ```
    Bob, search for TODOs in the src directory
    ```

**预期:**
- [ ] TUI 正常启动
- [ ] LLM 工具列表包含 send_message 和 create_agent
- [ ] 可创建新 Agent
- [ ] 可委托任务给 Bob/Carol

### 已知问题
1. **Agent 运行时隔离未完成** — 每个 Agent 应有独立 Context Window/compaction
2. **TUI Agent 状态面板未接入** — 状态事件不推送到 UI
3. **Agent 心跳/健康检查** — 无
4. **create_agent 缺少审批流** — 1.9 待办
