# Agent Cognitive Loop Core — Design

## 1. 设计目标与边界

把 agent runtime 认知循环实现成一个**端口收敛(port-converged)的独立模块**,在本仓孵化,Elysian Realm 仿真引擎作为第一个消费者。核心循环不依赖任何 Elysian 具体 domain,只依赖抽象端口,为后续抽成通用库铺路。

### 不变量(必须守住)

1. **权威状态单一所有权**:仿真引擎是世界状态唯一所有者。认知循环只能产出 typed action proposal,绝不直接 mutate `WorldSnapshot` / `AgentRuntimeState`。
2. **确定性可 replay**:同一 seed + 同一输入序列 + fake LLM,必须产出相同事件时间线。循环内不得引入隐藏随机性或挂钟依赖。
3. **错误可见**:LLM / parser / 端口失败必须显式记录为 diagnostics,禁止降级成"假成功的 agent 行为"。
4. **每 agent 至多一个在途操作**:遵守 spec 的并发规则。

### 本任务范围(MVP 切片)

- ✅ 定义认知循环端口接口(`ports.ts`)
- ✅ 实现循环骨架:Perceive → Retrieve → Plan → Act(产出 proposal)
- ✅ 实现 fake / 确定性驱动,完全可测
- ✅ Elysian 引擎适配器:把现有 `progressAgentRoutines` 接进循环作为 `Plan` 的确定性 fallback
- ✅ 诊断输出:每个 phase 的决策结果可见(含 skipped)

### 本任务不做(后续切片)

- ❌ 真实 MemoryStore 存储 / embedding 检索打分(本切片 `MemoryPort` 用内存桩)
- ❌ Reflect phase 完整实现(本切片预留接口,标记 skipped)
- ❌ Conversation lifecycle 接入
- ❌ 物理抽离成独立 npm 包 / repo
- ❌ 替换 `openAiCompatible.ts` 为 pi-ai

## 2. 模块位置与依赖方向

```
src/agent-core/                  # 端口收敛模块(未来可抽离)
  ports.ts                       # 所有端口接口 + 循环类型(零 Elysian 依赖)
  cognitiveLoop.ts               # 纯循环编排逻辑
  diagnostics.ts                 # phase 诊断结构
  index.ts
  test/
    cognitiveLoop.test.ts

src/server/simulation/
  agentRuntimeAdapter.ts         # 适配器:把 Elysian 引擎接入 agent-core 端口
  engine.ts                      # progressAgentRoutines 调用适配器
```

依赖方向严格单向:`agent-core` ← `simulation/agentRuntimeAdapter`。`agent-core` 不得 import 任何 `src/server/simulation`、`src/shared/contracts` 的具体类型;它只定义自己的端口泛型/接口,由适配器做类型映射。

## 3. 端口接口(ports.ts)

循环依赖四个端口,全部抽象。类型参数化以避免锁死 Elysian domain。

```ts
// 感知:从环境读取本 tick 的可见上下文
export interface PerceptionPort<Perception> {
  perceive(agentId: string, now: string): Perception;
}

// 记忆:检索与写入(本切片可用内存桩实现)
export interface MemoryPort<MemoryQuery, MemoryHit, MemoryWrite> {
  retrieve(agentId: string, query: MemoryQuery): readonly MemoryHit[];
  remember(agentId: string, write: MemoryWrite): void;
}

// 规划:产出动作意图(可由确定性规则或 LLM 驱动)
export interface PlanningPort<Perception, MemoryHit, ActionProposal> {
  plan(input: {
    agentId: string;
    now: string;
    perception: Perception;
    memories: readonly MemoryHit[];
  }): Promise<PlanResult<ActionProposal>> | PlanResult<ActionProposal>;
}

// 动作汇:提交 typed proposal(绝不直接改世界)
export interface ActionSink<ActionProposal> {
  submit(agentId: string, proposal: ActionProposal): void;
}

export interface PlanResult<ActionProposal> {
  // 确定性规则命中时 source = "deterministic";LLM 命中 = "llm";无动作 = "skipped"
  source: "deterministic" | "llm" | "skipped";
  proposal?: ActionProposal;
  reason: string;
}
```

### 循环编排(cognitiveLoop.ts)

```ts
export interface CognitiveLoopDeps<P, MQ, MH, MW, A> {
  perception: PerceptionPort<P>;
  memory: MemoryPort<MQ, MH, MW>;
  planning: PlanningPort<P, MH, A>;
  actionSink: ActionSink<A>;
  buildMemoryQuery: (perception: P) => MQ;
  buildMemoryWrite?: (perception: P, plan: PlanResult<A>) => MW | undefined;
}

export interface CognitiveTickResult {
  agentId: string;
  phases: PhaseDiagnostic[];   // perceive/retrieve/plan/act/remember/reflect 各一条
}

export async function runCognitiveTick<...>(
  agentId: string,
  now: string,
  deps: CognitiveLoopDeps<...>,
): Promise<CognitiveTickResult>;
```

每个 phase 都产出 `PhaseDiagnostic { phase, status: "ran" | "skipped", detail }`,满足 spec "skipped phases must be visible in diagnostics"。

## 4. Elysian 适配器(agentRuntimeAdapter.ts)

适配器负责把 agent-core 端口实例化为 Elysian 具体类型:

- `Perception` = `{ snapshot 投影:本 agent 的 status / location / period / 邻近 agent }`(只读投影,不持有引擎引用)
- `MemoryHit` / `MemoryWrite` = 内存桩(本切片不落 `MemoryRecord`,与现有 `memory.seeded` event-only 约定一致)
- `ActionProposal` = `PlanAction`(复用现有契约)
- `PlanningPort.plan`:**确定性 fallback = 现有 routine 选择逻辑**(`selectActiveRoutine` + `createRoutineAction`)。本切片 source 恒为 `"deterministic"`,为后续插 LLM planner 预留 `"llm"` 分支。
- `ActionSink.submit`:收集 proposal,**不直接改 snapshot**;由引擎在 tick 末尾按现有方式 apply(产出 `agent.moved` / `agent.continuedRoutine` 事件)。

### 引擎接缝

`progressAgentRoutines` 改为:
1. 对每个 agent 调 `runCognitiveTick`,拿到 proposal + phase 诊断。
2. 引擎按 proposal apply 状态变更(逻辑等价于现有 routine 推进,保证现有测试不回归)。
3. phase 诊断作为 diagnostics 暴露(新增,不破坏现有事件序列)。

**关键约束**:本切片重构后,`simulationEngine.test.ts` 现有断言必须全绿(确定性事件序列不变)。这是"行为等价重构"的验收红线。

## 5. 确定性与测试策略

- `agent-core/test/cognitiveLoop.test.ts`:用纯 fake 端口验证 phase 顺序、skipped 可见、proposal 透传、错误冒泡。完全脱离 Elysian。
- `simulationEngine.test.ts`:不改断言,验证重构行为等价。
- 新增适配器测试:验证确定性 plan 命中现有 routine、proposal 不直接 mutate 输入 snapshot。

## 6. 与"通用库"目标的衔接

- 端口接口零 Elysian 依赖 → 抽离时只需搬 `src/agent-core/**`。
- 适配器留在 Elysian 仓,作为"第一个消费者"的参考实现。
- 第二个消费者(后续任务)接同一组端口,验证通用性后再物理抽包。

## 7. 风险与取舍

| 风险 | 缓解 |
|---|---|
| 重构破坏现有确定性事件序列 | 行为等价红线 + 现有测试不改断言 |
| 端口抽象过度设计(YAGNI) | 本切片只抽 4 个端口,Memory/Reflect 用桩,不预设未验证的扩展点 |
| 适配器泄漏引擎可变引用 | 适配器只传只读投影,proposal apply 仍由引擎单点完成 |
| 泛型过多影响可读性 | index.ts 导出 Elysian 已绑定的具体别名,消费者无需直面泛型 |

## 8. 验收清单

- [ ] `src/agent-core/**` 编译通过,零 Elysian import
- [ ] `agent-core` 单测覆盖 phase 顺序 / skipped / 错误冒泡
- [ ] 适配器把 routine 逻辑接入端口,proposal 不 mutate 输入
- [ ] `simulationEngine.test.ts` 全绿(行为等价)
- [ ] phase 诊断在引擎 diagnostics 可见
- [ ] `npm run check` + 相关测试通过
