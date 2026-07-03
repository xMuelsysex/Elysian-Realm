# Agent Cognitive Loop Core — Implementation Plan

执行顺序为依赖驱动:先建零依赖的 agent-core 端口与循环,再写适配器接进引擎,最后补测试与诊断暴露。每一步结束都要保证 `npm run check` 与相关测试可跑。

## Step 0 — 前置确认(只读,不改代码)

- 重读 `design.md` 的不变量四条 + 接缝定义(`progressAgentRoutines`)。
- 确认现有 `tests/simulationEngine.test.ts` 断言基线:跑一次 `node --test tests/simulationEngine.test.ts`,记录绿色基线作为"行为等价红线"。
- 退出条件:基线测试全绿,接缝点已定位。

## Step 1 — agent-core 端口与类型(`src/agent-core/ports.ts`)

- 定义四个端口接口 + `PlanResult` + `PhaseDiagnostic`,全部用泛型参数化,**零 Elysian import**。
- 定义 `CognitiveLoopDeps<P, MQ, MH, MW, A>` 与 `CognitiveTickResult`。
- 验证:`tsc --noEmit` 通过;grep 确认本文件无 `shared/contracts`、`shared/domain`、`server/simulation` import。

## Step 2 — 循环编排(`src/agent-core/cognitiveLoop.ts` + `diagnostics.ts`)

- `runCognitiveTick`:Perceive → Retrieve → Plan → Act,六 phase 各产一条 `PhaseDiagnostic`(`ran` / `skipped`)。
- Remember/Reflect 本切片标 `skipped`,带 reason,**不静默丢弃**。
- 错误处理:perception/retrieve/plan 抛错时,该 phase 记 `status: "failed"` + 错误信息,**不产出 proposal**,错误冒泡可见。
- `index.ts` 导出端口 + 循环。
- 验证:`tsc --noEmit`。

## Step 3 — agent-core 单测(`src/agent-core/test/cognitiveLoop.test.ts`)

用纯 fake 端口(脱离 Elysian)断言:
- phase 顺序正确,六条诊断齐全;
- skipped phase 在诊断中可见;
- 确定性 plan 命中时 proposal 透传到 ActionSink;
- plan 抛错 / 返回不可解析 → 诊断标 failed,无 proposal,无 ActionSink.submit。
- 验证:`node --test`(agent-core 测试)全绿,无网络。

## Step 4 — Elysian 适配器(`src/server/simulation/agentRuntimeAdapter.ts`)

- 把端口实例化为 Elysian 具体类型:
  - `Perception` = 本 agent 只读投影(status/location/period/邻近 agent),不持引擎引用。
  - `MemoryHit`/`MemoryWrite` = 内存桩(本切片不落 `MemoryRecord`)。
  - `ActionProposal` = `PlanAction`(复用契约)。
  - `PlanningPort.plan` 确定性 fallback = `selectActiveRoutine` + `createRoutineAction`,source 恒 `"deterministic"`,预留 `"llm"` 分支。
- 一个在途操作约束:`inProgressOperationId` 存在时不启动第二个操作(本切片确定性 plan 不启 LLM,验证 hook 留出)。
- 验证:`tsc --noEmit`;适配器单测验证 proposal **不 mutate 输入 snapshot**。

## Step 5 — 引擎接缝改造(`src/server/simulation/engine.ts`)

- `progressAgentRoutines` 改为:对每 agent 调 `runCognitiveTick` 拿 proposal + 诊断,引擎按 proposal apply 状态变更(逻辑等价现有 routine 推进)。
- phase 诊断作为新增 diagnostics 暴露,**不改现有事件序列**。
- **行为等价红线**:`tests/simulationEngine.test.ts` 现有断言必须全绿,不改断言。
- 验证:`node --test tests/simulationEngine.test.ts` 对比 Step 0 基线无回归。

## Step 6 — 错误注入与诊断可见性测试

- fake provider 失败 / 不可解析结构化输出 → 引擎诊断可见,无伪造 proposal。
- phase 诊断在引擎输出可见(对齐 spec "skipped phases must be visible")。
- 验证:`node --test` 相关用例全绿。

## Step 7 — 质量门禁与收尾

- `npm run check`(lint + format + type-check)全绿。
- 全量 `node --test` 全绿。
- 自查 diff:无吞错、无第二事实来源、无 agent-core 反向依赖、无现有断言被悄改。
- 产出:修改文件清单 + 运行的检查 + 剩余风险(留给 Phase B 的 Remember/Reflect/memory store)。

## 验证命令速查

```bash
npm test                  # 行为等价红线 + 全量测试(先 tsc 编译到 dist 再 node --test dist/tests/*.test.js)
npm run typecheck         # tsc --noEmit 类型门禁
```

> 注意:本项目无 `npm run check` / lint 配置,实际质量门禁 = `npm run typecheck` + `npm test`。
> 测试无法用 `node --test tests/*.ts` 直接跑(源码 import `.js`,需先经 tsc 编译到 `dist/`)。
> Step 0 基线已记录:`npm test` = 86 tests pass, 0 fail。

## 依赖关系

Step 1 → 2 → 3(agent-core 自洽,可独立验证)
Step 1 → 4 → 5 → 6(适配器与引擎接缝,依赖 core 已稳定)
Step 7 收口
