# OpenPurple A2A 实施方案

> 最后更新: 2026-06-10
> 状态: 定稿，实施 agent 必须全文理解后再动手

---

## 第一部分：这个项目是什么

### 项目定位

**OpenPurple 不是 Claude Code 类开发助手。**
**OpenPurple 是多 Agent 协作平台——Agent 之间像真人团队一样协作。**

用户（你）是团队主管，通过 CLI/TUI 与 A（领头 Agent）对话。A 可以给 B、C 派任务，B、C 完成后结果回到 A，A 汇总给你。

### 核心概念：Session-to-Session（不是 Tool-to-Agent）

**错误的认知：**
- ❌ A 调一个工具"send_message"，这个工具负责把消息发给 B
- ❌ AgentBus 是消息中心，所有消息经过它路由
- ❌ 需要一个 AgentRunner 后台循环来监听和处理消息

**正确的认知：**
- ✅ 每个 Agent 有自己独立的 session（opencode 的 session 系统）
- ✅ A2A = A 的 session 给 B 的 session 发消息
- ✅ send_message 工具做的事：把消息写进目标 Agent 的 session 历史 + 触发目标处理
- ✅ 不需要中间人，不需要总线，不需要后台循环

---

## 第二部分：系统架构

### 数据存储

每个 Agent 有 3 个存储区：

| 存储 | 说明 | 用户能否看到 |
|------|------|-------------|
| **session** | Agent 的对话历史。A↔B、B↔C 的团队消息都写在这里。**Agent 自己记得所有对话** | ❌ 用户切到 B 也看不到 A↔B 消息 |
| **inbox** | 留言箱。别人发来的**还没处理**的消息，临时放着 | ❌ 后台数据 |
| **当前对话** | 用户正在跟这个 Agent 的对话内容 | ✅ TUI 里用户能看到 |

### Agent 的 session 是全局的

- Alice 有一个 session（ses_alice），Bob 有一个（ses_bob），Carol 有一个（ses_carol）
- **不是** opencode 原有的"一个 session 换不同 Agent 聊"
- 用户 `/talk B` → 切换到 B 的 session
- `/new` 可以新建当前 Agent 的 session（清空对话）

### 关键：区分"用户消息"和"团队消息"

**在 Agent 的 session 里，消息有两种：**

1. **用户消息**（无前缀）— 你跟 Agent 说的话，Agent 回你的话
2. **团队消息** — 别的 Agent 发来的，标记 `[From X (type)]`

**Agent 的 system prompt 会被告知：**
> 你的 session 里有两种消息：无前缀的是用户在跟你说话，带 `[From X]` 前缀的是团队成员发来的消息。你要区分处理。

**用户切到 B 的 session → B 的对话历史里有团队消息，但 TUI 不显示这些。** 用户只知道 B 记得它们。

---

## 第三部分：消息流详解

### send_message 工具的逻辑（核心）

```
A 调 send_message("B", "调研技术栈")
```

**step 1：找目标 Agent**

```
target = AgentManager.get("B")

if target 不存在:
  // 自动创建 B
  session = Session.create({ agent: "B" })
  AgentManager.register({ id: "B", name: "Bob", sessionID: session.id })
  target = AgentManager.get("B")
```

**step 2：消息写进目标 inbox**

```
AgentManager.pushInbox("B", {
  id: ulid(),
  timestamp: Date.now(),
  from: "A",
  type: "task",
  content: "调研一下这个项目的技术栈"
})

setTimeout(10ms, () => {
  drainInbox("B")
})
```

为什么 setTimeout？因为要等 send_message 返回后，再触发 B 处理，不阻塞 A。

**step 3：检查目标状态 + 回复 A**

```
status = AgentManager.getStatus("B")

if status === "busy":
  // B 正在忙，消息放进 inbox 了
  return "B(Alice) 正在忙，消息已进入留言箱，稍后会处理"
else:
  // B 空闲，立即处理
  drainInbox("B")
  // 这里 drainInbox 里会调 session.prompt()
  // 但是不等它完成就返回给 A
  return "消息已发送给 B"
```

为什么不等 drainInbox 完成？因为 **A 不阻塞**。

### drainInbox 的逻辑（核心）

```
function drainInbox(agentId):
  // 取走 inbox 里所有消息
  msgs = AgentManager.drainAll(agentId)
  if msgs.length === 0:
    // inbox 空了，把 Agent 状态改回 idle
    AgentManager.setStatus(agentId, "idle")
    return

  // 标记为 busy
  AgentManager.setStatus(agentId, "busy")

  // 把留言格式化成 LLM 输入
  const parts = msgs.map(msg => ({
    type: "text",
    text: `[From ${msg.from} (${msg.type})]: ${msg.content}`
  }))

  // 推给 session → 触发 LLM 处理
  yield* Session.prompt({
    sessionID: agent.sessionID,
    parts: parts
  })

  // prompt 完成后，继续 drain inbox
  // 因为处理过程中可能又有新消息进来了（比如 C 也发了消息）
  drainInbox(agentId)
```

### B 处理完 → 回复 A

```
B 在处理过程中，LLM 决定回复 A：
  → LLM 调 send_message("A", "技术栈是 React+TypeScript", "result")
  → 消息进 A 的 inbox
  → A 如果在忙 → 消息在 inbox 等着
  → A 如果空闲 → setTimeout(10ms, () => drainInbox("A"))
  → A 自动处理 → 输出给用户
```

### 用户切到 B 说话

```
用户: /talk B
→ 切到 B 的 session（不是 opencode 的 session 切换）
→ B 记得之前的团队消息（[From A (task)]）
→ B 看到新的用户输入
→ B 在 A→B 的对话基础上继续处理
→ 不会串
```

---

## 第四部分：当前代码状态（git 上的已有文件）

**已有的（不要重复创建，直接复用）：**

| 文件 | 是否完整 | 说明 |
|------|---------|------|
| `agent/agent.ts` | ✅ 上游已有，不要动 | Agent 定义（Alice/Bob/Carol） |
| `agent/bus.ts` | ⚠️ 有内容但可能不需要 | 轻量消息路由，留扩展用 |
| `agent/manager.ts` | ⚠️ 有内容需检查 | AgentManager（注册/状态/映射） |
| `tool/send-message.ts` | ⚠️ 有内容需重写 | send_message 工具，核心逻辑要改 |
| `tool/create-agent.ts` | ⚠️ 有内容需检查 | create_agent 工具 |
| `tool/registry.ts` | ✅ 已有 | 工具注册中心，新增工具要注册 |
| `effect/app-runtime.ts` | ✅ 已有 | AppLayer，新服务注册在这里 |
| `session/session.ts` | ✅ 上游已有 | Session CRUD（create/get/fork等） |
| `session/prompt.ts` | ✅ 上游已有 | session.prompt() 是 LLM 调用的引擎 |
| `session/llm/` | ✅ 上游已有 | LLM provider 集成 |

**需要新建的：**

| 文件 | 说明 |
|------|------|
| `agent/types.ts` | 存放 inbox/status 等类型定义 |

---

## 第五部分：需要改什么

### 1. AgentManager 加入 inbox 和状态

AgentManager 现有 `Interface` 要扩展：

```typescript
export interface Interface {
  // 已有的
  readonly register: (info) => Effect.Effect<void>
  readonly get: (id) => Effect.Effect<AgentStatus | undefined>
  readonly list: () => Effect.Effect<AgentStatus[]>
  readonly setActive: (id) => Effect.Effect<void>
  readonly setWorking: (id, working) => Effect.Effect<void>
  readonly isOnline: (id) => Effect.Effect<boolean>

  // 新增
  readonly pushInbox: (id, msg) => Effect.Effect<void>
  readonly drainInbox: (id) => Effect.Effect<void>
  readonly setStatus: (id, status) => Effect.Effect<void>
  readonly getStatus: (id) => Effect.Effect<"idle" | "busy">
}
```

内部数据结构：

```typescript
type AgentEntry = {
  id, name, role, sessionID
  active, working, running    // 已有
  status: "idle" | "busy"     
  inbox: AgentMessage[]       // 留言箱
}
```

`drainInbox` 方法：

```
1. 取出 inbox 所有消息
2. 如果为空，status = idle，返回
3. status = busy
4. 把消息格式化成 prompt 的 parts
5. 调 Session.prompt({ sessionID, parts })
6. prompt 完成后 → 继续 drainInbox（while）
```

### 2. send_message 工具重写

```
execute(params, ctx):
  1. const manager = yield* AgentManager.Service
  2. const session = yield* Session.Service

  3. let target = yield* manager.get(params.to)
  
  4. if !target:
      const info = yield* session.create({ agent: params.to })
      yield* manager.register({ id: params.to, name: params.to, sessionID: info.id })
      target = yield* manager.get(params.to)
  
  5. yield* manager.pushInbox(params.to, {
      from: ctx.agent,
      type: params.type,
      content: params.content
    })
  
  6. const status = yield* manager.getStatus(params.to)
  
  7. if status === "idle":
      // 不阻塞，fork 后台处理
      yield* Effect.fork(manager.drainInbox(params.to))
  
  8. return { output: `消息已发送给 ${params.to}，他空闲时会处理` }
```

### 3. create_agent 工具

```
execute(params, ctx):
  1. const manager = yield* AgentManager.Service
  2. const session = yield* Session.Service
  
  3. const id = params.name.toLowerCase().replace(/\s+/g, "-")
  
  4. const existing = yield* manager.get(id)
  if existing: 返回已存在
  
  5. const info = yield* session.create({ title: params.name, agent: id })
  
  6. yield* manager.register({ id, name: params.name, role: params.role, sessionID: info.id })
  
  7. return { output: "创建成功，可以用 send_message 联系了" }
```

---

## 第六部分：实施规则

### 第一条：理解需求再动手

实施前必须读完：
- `PLAN.md` — 项目全局
- `docs/A2A-SESSION2SESSION.md` — A2A 架构设计
- `docs/changelog-phase1.md` — 之前做了什么
- `other/ARCHITECTURE-QNA1.8.md` — 原始需求
- `other/FIgurev1-2.md` — 核心需求定义

### 第二条：理解不了就问

遇到以下情况**必须停下来问**：
- 不确定某个模块的定位
- 发现代码里的逻辑和文档不一致
- 发现实施方案走不通（Effect API 限制等）
- 不确定用户的意图

问之前先自己分析清楚，带上方案，不要甩一句"怎么办"。

### 第三条：不改不该改的

- 不改 `agent/agent.ts`（上游的 Agent 定义）
- 不改 `session/` 下的文件（opencode 的 Session 系统是成熟的，别碰）
- 不改 `llm/` 下的文件
- 不改 `tool/registry.ts` 的注册机制（只注册新工具）
- 不改 `effect/app-runtime.ts` 的结构
- 不是该改的一个字不要动

### 第四条：每步验证

每改完一个步骤：
1. `tsgo --noEmit` 类型检查
2. 如果改的是 send_message → 手动过一遍逻辑
3. 如果涉及编译 → 通知用户

### 第五条：不跳步

按这个顺序来：
1. 先改 AgentManager（加 inbox/status）
2. 再改 send_message 工具
3. 再改 create_agent 工具
4. 验证流程
5. 如果 exe 需要重新编译 → 通知用户

---

## 第七部分：验证清单

实施完后，用户会这样测试：

```
openpurple 进入 TUI

1. 查工具列表：看 send_message 和 create_agent 在不在
2. create_agent 创建一个 "Reviewer"
3. 跟 A 说："Bob 调研技术栈"
   → A 调 send_message("B", "调研技术栈")
   → B 自动启动，开始处理
4. 等一会，B 完成后
   → B 的回复进 A 的 inbox
   → A 空闲就自动处理
   → 输出给用户
5. 让 A 再派个任务给 C
   → 同上
6. 切到 B 的 session
   → B 记得之前的团队消息
7. 跟 B 正常对话
   → 不会串
```

在用户测试之前，实施 agent 自己先过一遍逻辑，确认每一步走得通。
