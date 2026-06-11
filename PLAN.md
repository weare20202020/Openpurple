# OpenPurple 行动方案

> 目标：多 Agent 协作平台
> Agent 之间像真人团队一样，通过私聊式消息自然协作
> 基于 opencode v1.16.0 上游

---

## A2A 核心消息流

```
用户 ──→ A（领头 Agent）
         │
         ├─ send_message("B", "调研X") ──→ B 独立处理
         │   └─ A 立即结束本轮，不阻塞        │
         │                                    ├─ B 处理中 → 状态栏 B=working
         │                                    │
         │                              B 处理完成
         │                                    │
         ├─ (B 完成 → 自动唤醒 A) ←───────────┘
         │   ├─ A 在 idle → 立即处理
         │   └─ A 在忙 → 排队，A 完成后自动处理
         │
         ├─ A 输出给用户："B那边完成了，我来处理"
         └─ A 回复 B（内部，用户不可见）
```

### 关键规则

| 规则 | 说明 |
|------|------|
| 纯消息驱动 | 任意 Agent 发消息 → 接收方自然唤醒处理 → 回复 |
| 异步不阻塞 | A 发消息后本轮结束，不等待 B |
| 自动唤醒 | B 完成后主动通知 A，A 自动处理（类似收到新 user 消息） |
| 用户优先 | A 在回复用户时，A2A 消息排队等待 |
| 同一会话框 | 所有 A2A 结果最终回到用户当前对话框 |
| 状态实时 | ABC 状态栏显示 idle/working，用户通过状态栏了解 Agent 活动 |

---

## Phase 1 — 多 Agent 运行时基础

### Step 1: AgentBus（消息路由）
EventEmitter 轻量消息路由。只负责 A→B 消息传递，不做状态管理。

### Step 2: AgentManager（状态管理）
Agent 运行时状态跟踪（idle/working）。启动时自动注册 Alice/Bob/Carol。

### Step 3: AgentRunner（核心 — 后台事件循环）
监听 AgentBus → 自动触发 LLM 调用 → 处理结果回写。
- 目标 idle → 立即调 session.prompt()
- 目标 busy → 进队列等待
- 状态变更 → debounce 推送到 TUI

### Step 4: send_message / create_agent 工具
- send_message：非阻塞派发，立即返回
- create_agent：运行时动态创建 Agent

### Step 5: TUI 状态栏
ABC 状态实时显示（idle/working/processing），debounce 控制刷新频率。

---

## Phase 2 — 任务编排引擎

（待定）

---

## Phase 3 — 系统韧性

（待定）

---

## Phase 4 — 产品化

（待定）

---

## 架构决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 通信方式 | 进程内 EventEmitter | 不走 HTTP，不走 Inbox 文件，利用 opencode Effect + Session 系统 |
| 唤醒机制 | AgentRunner 监听 → Effect.fork → session.prompt | 不轮询，事件驱动 |
| 状态推送 | debounce(100ms) → TUI signal | 防止高频重渲染卡顿 |
| Layer 注册 | 只放 AppLayer.mergeAll | 避免 Effect v4 层解析死锁 |
| 服务写法 | Effect Service (Interface + Service + layer) | 与 opencode codebase 一致 |
