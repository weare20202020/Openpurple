## 黑屏/卡死 Debug 经验总结

### 现象
编译后的 exe 144MB，能进入 TUI（标题变 OpenPurple），但屏幕全黑无内容，Ctrl+C 出不来，只能删终端。

### 根因
**Effect Layer 的依赖解析死锁。**

opencode 使用 Effect 的 `Layer` 系统做依赖注入。每个 Service 需要注册到 `Layer.mergeAll` 或通过 `Layer.provide` 链提供。

```
AppLayer = Layer.mergeAll(A, B, C, ToolRegistry, ...)
                         ↑
                  这里提供全局 Service
```

```
ToolRegistry.defaultLayer = Layer.suspend(() =>
  layer.pipe(Layer.provide(D), Layer.provide(E), ...)
                              ↑
                     这里是 ToolRegistry 自己的 provide 链
```

**死锁条件：** 如果一个 Service（如 `SessionPrompt`）同时出现在两个地方：
1. `app-runtime.ts` 的 mergeAll 里
2. `tool/registry.ts` 的 defaultLayer provide 链里

Effect v4 在 `ManagedRuntime.make()` 时解析依赖图，发现同一个 identity 出现在两个 scope，产生循环依赖推断，启动卡死（不是崩溃，无日志，无错误）。

**更隐蔽的是：** `SessionPrompt.defaultLayer` 自身依赖十几个下层 Service（SessionRunState、SessionProcessor、SessionCompaction 等），这些 Service 只在 AppLayer 的 scope 里存在。如果在 ToolRegistry 的 provide 链里 provide SessionPrompt，底层依赖解析不到，也会死锁。

### 正确做法

```
app-runtime.ts（mergeAll）:
  ✅ Agent.defaultLayer
  ✅ AgentManager.defaultLayer    ← 放这里
  ✅ SessionPrompt.defaultLayer    ← 放这里
  ✅ Skill.defaultLayer
  ✅ ToolRegistry.defaultLayer

tool/registry.ts（provide 链）:
  ❌ 不 provide AgentManager.defaultLayer
  ❌ 不 provide SessionPrompt.defaultLayer
  ✅ 保留 R 类型声明（AgentManager.Service | SessionPrompt.Service）
```

规则：**所有 Service 只在 mergeAll 注册一次，不在下级 provide 链重复提供。**

### 判断方法
- 备份旧 exe（没加新 layer）能进 → 新加的 layer 导致死锁
- `--version` 能正常输出 → 二进制本身没问题
- 标题变 OpenPurple 但黑屏 → 渲染卡死，非崩溃

### 预防
- 后期新增 Effect Service 时，只在 `app-runtime.ts` 的 mergeAll 加 `XXX.defaultLayer`
- 不要在 `registry.ts` 的 provide 链里重复 provide
- 如果下级的 `R` 类型依赖某个 Service，靠 mergeAll 提供就行，不需要重复 provide
