# 崩坏三风格 2.5D 宿舍探索游戏 - 设计文档

**文档版本**: 1.0  
**创建日期**: 2026-06-13  
**设计状态**: 已通过 Codex 架构审查，待实施  
**目标平台**: Unity 6000.4.10f1 + URP，Windows/Mac 原生桌面游戏

---

## 执行摘要

这是一个**独立桌面游戏**，玩家操控化身在崩坏三风格的 2.5D 宿舍中自由探索，与 AI 角色对话互动。核心玩法是**对话驱动**：主线剧情使用手写分支剧本（质量保证），日常闲聊通过 LLM 实时生成（玩家自配 OpenAI 格式 API key，离线兜底）。移动系统支持 **WASD 直控 + 点击寻路双模式**，相机采用俯视 2.5D 视角。

**关键约束**：
- 不依赖任何后端服务，完全独立运行
- 美术资源来自网络公开素材，严格登记许可证
- 从 Unity URP 空模板从零搭建（当前工程只有 SampleScene）

**开发周期估算**: 11-12 天（约 2 周），6 个里程碑阶段

---

## 锁定决策（9 条）

以下决策在 brainstorming 阶段已确认，设计基于这些前提：

1. **平台**: Unity 6000.4.10f1 + URP，**原生桌面独立游戏**（早期 Pixi.js/Web 方案已废弃）
2. **范式**: 第三人称探索游戏，玩家有可操控化身
3. **独立运行**，不接任何现有后端
4. **核心玩法**: 对话驱动
5. **对话来源**: 混合 = 手写剧本（主线）+ LLM（闲聊）
6. **LLM 接入**: 玩家自配 OpenAI 格式 key，必须有离线兜底
7. **美术**: 网络公开资源 + 许可证登记
8. **移动**: 点击寻路 + WASD 直控 **双支持**，俯视 2.5D
9. **视觉风格**: 崩坏三（Honkai Impact 3）风格

---

## 第 1 节 / 架构设计

### 1.1 分层架构总览

系统采用 **5 层架构 + 依赖倒置**，每层职责单一、边界清晰：

```
┌────────────────────────────────────────────────────┐
│  Presentation 层  (uGUI - Unity UI)                │
│  对话框、设置面板(LLM key配置)、交互提示            │
│  注意：MVP 统一使用 uGUI，不混用 UI Toolkit        │
├────────────────────────────────────────────────────┤
│  Game Systems 层  (核心玩法逻辑)                    │
│  ├─ DialogueSystem   对话调度(剧本+LLM路由)         │
│  ├─ InteractionSystem 靠近检测/触发                 │
│  ├─ PlayerController  输入(WASD+点击)/移动          │
│  ├─ NpcController     AI角色日程/朝向               │
│  └─ GameStateManager  能力锁状态管理                │
├────────────────────────────────────────────────────┤
│  Services 层  (可替换的外部能力)                    │
│  ├─ ILlmClient        LLM抽象(OpenAI格式实现)       │
│  ├─ IDialogueRepository 剧本数据读取                │
│  └─ ISaveService      存档/设置持久化               │
├────────────────────────────────────────────────────┤
│  Data 层  (ScriptableObject + JSON)                │
│  角色定义、剧本资产、宿舍场景配置                   │
├────────────────────────────────────────────────────┤
│  Engine 层  (Unity 内置)                            │
│  Input System / AI Navigation / Tilemap /          │
│  Cinemachine 相机 / URP 渲染                        │
└────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

**依赖倒置 (Dependency Inversion, SOLID-D)**:
- `DialogueSystem` 依赖 `ILlmClient` 接口，不依赖具体云厂商
- 这让"玩家自配 key"和"离线兜底"成为换实现就行的事
- 测试时可塞 `MockLlmClient` 假实现，无需真实 API

**开闭原则 (Open/Closed, SOLID-O)**:
- 新增 NPC、新剧本 = 新增 ScriptableObject 资产，**不改代码**
- Data 层是内容扩展点，逻辑层封闭修改

**单一职责 (Single Responsibility, SOLID-S)**:
- 输入、移动、交互检测、对话调度各自独立，互不越界
- Scripts 按职责分目录（Player/NPC/Dialogue/Core），不用"Managers"大杂烩

### 1.3 风险点标注

**风险 1: 工程基础缺失**  
当前 `unity/observatory-stage` 缺少 `Packages/` 和 `ProjectSettings/` 目录，正式开工前必须确认 Unity 工程能完整打开。

**风险 2: LLM 是唯一外部依赖**  
必须有"无网络/无 key → 回退到预设闲聊池"的兜底，否则破坏独立性承诺。

---

## 第 2 节 / 数据模型

### 2.1 设计原则

**内容与代码彻底分离**：新增角色/剧本只需创建数据资产，永不改代码（开闭原则）。使用 Unity ScriptableObject 作为"设计师可编辑的资产"，剧本正文通过本地化表支持中英双语。

### 2.2 角色定义 `CharacterDefinition` (ScriptableObject)

```csharp
[CreateAssetMenu(fileName = "Character", menuName = "Game/Character")]
public class CharacterDefinition : ScriptableObject {
    public string CharacterId;        // 稳定唯一ID，剧本/存档引用它
    public string DisplayNameKey;     // i18n key，支持中英
    public Sprite Portrait;           // 对话框立绘
    public GameObject WalkPrefab;     // 场景中可走动的预制体
    public string LlmPersona;         // 喂给LLM的人设描述（闲聊用）
    public DialogueScript[] MainScripts;  // 手写主线剧本集
    public float WalkSpeed = 1.5f;
    // 注意：日程待机点不在 SO 里，在场景 NpcSpawnConfig 里配
}
```

### 2.3 剧本资产 `DialogueScript` (ScriptableObject)

手写主线对话的载体，采用**节点图式结构**，支持分支：

```csharp
[CreateAssetMenu(fileName = "Dialogue", menuName = "Game/Dialogue Script")]
public class DialogueScript : ScriptableObject {
    public string ScriptId;
    public DialogueTrigger Trigger;   // 触发条件
    public DialogueNode[] Nodes;      // 对话节点数组
}

[Serializable]
public class DialogueTrigger {
    public enum TriggerType { FirstMeet, StoryFlag, AffinityLevel }
    public TriggerType Type;
    
    // 条件参数（根据 Type 使用）
    public string RequiredFlagId;      // Type=StoryFlag 时检查此标记
    public int RequiredFlagValue;      // 标记值门槛
    public int RequiredAffinityLevel;  // Type=AffinityLevel 时检查好感度
    
    public bool IsRepeatable;          // 可重复触发？
    public int Priority;               // 多剧本同时满足时，优先级高的先播
    
    // 运行时检查（DialogueSystem 调用）
    public bool CanTrigger(SaveData saveData, string characterId) {
        // 检查已播放记录
        string playedKey = $"{characterId}_{ScriptId}";
        if (!IsRepeatable && saveData.playedScripts.Contains(playedKey))
            return false;
        
        switch (Type) {
            case TriggerType.FirstMeet:
                return !saveData.playedScripts.Contains(playedKey);
            case TriggerType.StoryFlag:
                return saveData.storyFlags.TryGetValue(RequiredFlagId, out int val) 
                       && val >= RequiredFlagValue;
            case TriggerType.AffinityLevel:
                return saveData.affinityFlags.TryGetValue(characterId, out int aff) 
                       && aff >= RequiredAffinityLevel;
        }
        return false;
    }
}

[Serializable]
public class DialogueNode {
    public string NodeId;
    public string SpeakerId;          // 谁在说（CharacterId）
    public string TextKey;            // 对话正文（i18n key，正文存本地化表）
    public DialogueChoice[] Choices;  // 玩家选项（空 = 自动continue）
    public string NextNodeId;         // 无选项时的下一节点
    public DialogueEffect[] Effects;  // 副作用（设标记/加好感/解锁）
}

[Serializable]
public class DialogueChoice {
    public string ChoiceTextKey;      // 选项文本 i18n key
    public string NextNodeId;         // 跳转目标节点
}

[Serializable]
public class DialogueEffect {
    public enum EffectType { SetFlag, ModifyAffinity, UnlockScript }
    public EffectType Type;
    public string TargetId;           // 标记名/角色ID
    public int Value;                 // 设为多少/增减量
}
```

### 2.4 对话来源路由（呼应决策 5/6）

`DialogueSystem` 触发交互时按规则选择来源：

```
触发对话(CharacterDefinition character)
  ├─ 该角色有"可触发的手写剧本"?
  │   └─ 是 ──→ 播放 DialogueScript (主线，质量保证)
  │        ├─ 检查 Trigger 条件（剧情标记/好感度）
  │        └─ 逐节点播放（Choices 分支/Effects 副作用）
  └─ 否（纯闲聊） ──→ ILlmClient
        ├─ IsAvailable + 有效key? 
        │   └─ 是 ──→ LLM 实时生成（流式显示）
        └─ 否 ────→ 预设闲聊池（离线兜底）
```

**为什么接口化**：三种来源（剧本、云端 LLM、离线池）对上层是统一的"给我下一句话"，调用方不关心底下实现（依赖倒置 D）。

### 2.5 场景配置（修正版）

**ScriptableObject 配置（项目级数据）**：

```csharp
[CreateAssetMenu(fileName = "Scene", menuName = "Game/Dorm Scene Config")]
public class DormSceneConfig : ScriptableObject {
    public string SceneId;
    public CharacterDefinition[] ResidentNpcs;  // 这间宿舍住了谁
    // 场景对象引用放在场景内 MonoBehaviour，不放 SO
}
```

**场景内配置（MonoBehaviour，挂在场景 Empty GameObject 上）**：

```csharp
public class SceneSpawnConfig : MonoBehaviour {
    [Header("NPC Spawn Points")]
    public Transform[] NpcSpawnPoints;     // 各 NPC 初始站位
    
    [Header("NPC Idle Points (按 NPC 顺序)")]
    public Transform[][] NpcIdlePoints;    // 每个 NPC 的巡逻点
    
    [Header("Player")]
    public Transform PlayerSpawn;          // 玩家出生点
    
    // 场景启动时自动填充到运行时系统
}
```

**数据流**：
- `DormSceneConfig`（SO）定义"谁住这里"（角色定义引用）
- `SceneSpawnConfig`（场景 MB）定义"站在哪里"（Transform 引用）
- 场景启动时 `SceneBootstrap` 读取两者，初始化角色实例

### 2.6 存档数据 `SaveData`（修正版）

```csharp
[Serializable]
public class SaveData {
    // 使用可序列化的数组包装，因为 JsonUtility 不支持 Dictionary
    public StringIntPair[] storyFlags = Array.Empty<StringIntPair>();
    public StringIntPair[] affinityFlags = Array.Empty<StringIntPair>();
    public List<string> playedScripts = new();  // 已播放的剧本 ID 列表
    
    // LLM 配置不进存档，单独存 PlayerPrefs
    // public string llmApiKey;  // ❌ 移除，见下方 SecureSettings
    
    // 运行时辅助方法
    public Dictionary<string, int> GetStoryFlagsDict() {
        return storyFlags.ToDictionary(p => p.key, p => p.value);
    }
    
    public void SetStoryFlagsDict(Dictionary<string, int> dict) {
        storyFlags = dict.Select(kv => new StringIntPair(kv.Key, kv.Value)).ToArray();
    }
}

[Serializable]
public struct StringIntPair {
    public string key;
    public int value;
    public StringIntPair(string k, int v) { key = k; value = v; }
}

// LLM 设置单独存储（加密）
public static class SecureSettings {
    private const string KEY_API_KEY = "llm_api_key_encrypted";
    private const string KEY_ENDPOINT = "llm_endpoint";
    
    public static void SaveApiKey(string apiKey) {
        var encrypted = SimpleEncrypt(apiKey, SystemInfo.deviceUniqueIdentifier);
        PlayerPrefs.SetString(KEY_API_KEY, encrypted);
        PlayerPrefs.Save();
    }
    
    public static string LoadApiKey() {
        var encrypted = PlayerPrefs.GetString(KEY_API_KEY, "");
        if (string.IsNullOrEmpty(encrypted)) return "";
        return SimpleDecrypt(encrypted, SystemInfo.deviceUniqueIdentifier);
    }
    
    public static void SaveEndpoint(string endpoint) {
        PlayerPrefs.SetString(KEY_ENDPOINT, endpoint);
        PlayerPrefs.Save();
    }
    
    public static string LoadEndpoint() {
        return PlayerPrefs.GetString(KEY_ENDPOINT, "https://api.openai.com/v1/chat/completions");
    }
    
    // XOR 简单加密（设备绑定）
    private static string SimpleEncrypt(string text, string deviceId) {
        var keyBytes = System.Text.Encoding.UTF8.GetBytes(deviceId);
        var textBytes = System.Text.Encoding.UTF8.GetBytes(text);
        for (int i = 0; i < textBytes.Length; i++)
            textBytes[i] ^= keyBytes[i % keyBytes.Length];
        return Convert.ToBase64String(textBytes);
    }
    
    private static string SimpleDecrypt(string encrypted, string deviceId) {
        var keyBytes = System.Text.Encoding.UTF8.GetBytes(deviceId);
        var textBytes = Convert.FromBase64String(encrypted);
        for (int i = 0; i < textBytes.Length; i++)
            textBytes[i] ^= keyBytes[i % keyBytes.Length];
        return System.Text.Encoding.UTF8.GetString(textBytes);
    }
}
```

**存档文件位置**：  
`Application.persistentDataPath/saves/slot_{id}.json`（JsonUtility 序列化）

### 2.7 设计取舍说明

**为什么对话正文用 i18n key 而非直接写 SO**：  
呼应项目已有的中英双语习惯（见 `src/app/shared/i18n.ts`），剧本正文走本地化表，未来加语言零成本（DRY 原则）。

**为什么不为好感度/物品建复杂系统**：  
当前玩法是对话驱动（决策 4），好感度只需一个 `int` 标记位即可支撑剧本分支——不做养成系统的完整数值框架（YAGNI 原则）。

**存档规则**：  
只存"剧情标记 + 好感度标记 + LLM 配置"，玩家位置等运行态不持久化（KISS 原则）。

---

## 第 3 节 / 运行时流程（经 Codex 审查修正）

本节经过 Codex 子代理对抗性审查，修正了 7 个 CRITICAL 设计缺陷，现可直接指导实现。

### 3.1 PlayerController（双输入移动）

#### 3.1.1 输入监听

Input System Actions:
- `Move` (Vector2)：WASD/方向键
- `PointClick` (Vector2)：鼠标点击地面

#### 3.1.2 仲裁规则（单一驱动源防冲突）

```
每个输入帧（Input System update）:
  1. 检查 Move 输入是否非零
     是 → 进入/保持直控模式
       - 如果之前在寻路：调用 agent.ResetPath() 取消
       - 清零 agent.velocity，忽略任何 pathPending 结果
       - 设 agent.isStopped = false
     否 → Move 空闲，检查 PointClick
       是 → 进入/保持寻路模式
         - 点击位置先用 NavMesh.SamplePosition() 验证可行走
         - agent.SetDestination() 并监控 pathStatus
       否 → 保持当前模式
```

#### 3.1.3 移动实现（修正后）

**❌ 错误做法（初稿）**：
```csharp
// agent.updatePosition = false + 手动 transform.position
// 问题：agent 内部位置和 transform 分离，重启时快照回弹
```

**✅ 正确做法 A（推荐）**：每帧通过 `agent.velocity` 驱动
```csharp
// 直控模式
agent.updatePosition = true;  // 保持启用，无快照问题
agent.updateRotation = false; // top-down 自己控角度
agent.updateUpAxis = false;   // 2.5D 不需要斜坡适应
agent.isStopped = false;
agent.velocity = moveInput.normalized * moveSpeed; // 每帧喂速度
// agent 会自动同步 transform，无快照回弹
```

**✅ 正确做法 B（备选）**：手动 transform + 每帧同步
```csharp
transform.position += moveInput.normalized * moveSpeed * Time.deltaTime;
agent.nextPosition = transform.position; // 每帧同步回 agent
// 或重启前 agent.Warp(transform.position)
```

**寻路模式**：
```csharp
// 点击前验证
if (NavMesh.SamplePosition(clickWorldPos, out NavMeshHit hit, 1f, NavMesh.AllAreas)) {
    if (agent.SetDestination(hit.position)) {
        // 后续帧监控 agent.pathStatus（Success/Partial/Invalid）
    }
}
agent.isStopped = false;
// agent.velocity 由寻路自动控制，不手动覆盖
```

**修正依据**：Codex CRITICAL#1 — `updatePosition=false` 导致快照回弹；SUGGESTIONS — 关闭 `updateRotation/updateUpAxis`、验证 `SamplePosition`、检查 `pathStatus`

---

### 3.2 地图与寻路技术选型

#### 3.2.1 关键决策点

宿舍场景底层是 **Tilemap (2D XY 平面)** 还是 **3D 网格/地面 (XZ 平面)**？

#### 3.2.2 技术路线分叉

**路线 A：Tilemap 2D**  
→ 原生 NavMesh **不兼容**（只认 3D Mesh/Collider），必须选：
- **NavMeshPlus** (社区包，支持 TilemapCollider2D 烘焙)
- **A* Pathfinding Project** (商业/免费版，GridGraph 直接支持 2D)
- 或自建 Grid 寻路（YAGNI 红灯，除非有特殊需求）

**路线 B：2.5D 艺术风格 + XZ 3D 底层（推荐）**  
→ 原生 NavMesh 可用
- 地板/墙用 3D Collider 或 Mesh 烘焙障碍
- 角色在 XZ 平面移动，Z 轴控制视觉前后层次
- 视觉用精灵 + Billboard 或薄 Quad

#### 3.2.3 最终选型

**2.5D 艺术 + XZ 3D 底层 + 原生 NavMesh**（已确定，不再考虑 Tilemap）

**理由**：
- URP 已在工程，原生 NavMesh 零配置成本
- 2.5D 视觉可用精灵 + Billboard，无需 Tilemap 依赖
- 避免引入第三方寻路库（NavMeshPlus/A* 都要学习成本）

**代价**：
- 需要手摆/编辑 3D 碰撞盒作为障碍，不如 Tilemap 编辑器直观
- 接受的理由：MVP 只需一个宿舍房间，障碍物数量可控

**修正依据**：Codex CRITICAL#2 — Tilemap 2D 与原生 NavMesh 不兼容，必须明确技术选型

---

### 3.3 InteractionSystem（修正后优先级）

#### 3.3.1 点击路由优先级

单次点击只触发一个目标，防止"点 NPC 同时触发对话+寻路"：

```
鼠标点击事件
  ├─ UI 层（uGUI/UI Toolkit EventSystem）拦截? 
  │   └─ 是 ──→ 阻断，不传给游戏层
  └─ 否，Raycast 射入游戏场景
      ├─ 击中 NPC/可交互物? 
      │   └─ 是 ──→ 触发交互，阻断寻路
      └─ 否，击中地面 ──→ 寻路点击
```

**实现方式**：
- UI 层：uGUI `EventSystem.IsPointerOverGameObject()` 检查 UI 优先
- NPC/物体层：`Physics.Raycast`（3D）
- 地面层：`NavMesh.SamplePosition` 验证后才算有效点击

#### 3.3.2 Trigger 辅助 + 每帧查询（防高速漏检）

```csharp
// OnTriggerEnter/Exit 提供候选集（hints）
List<Interactable> nearbyInteractables = new();

void OnTriggerEnter(Collider other) {
    if (other.TryGetComponent<Interactable>(out var target))
        nearbyInteractables.Add(target);
}

void OnTriggerExit(Collider other) {
    if (other.TryGetComponent<Interactable>(out var target))
        nearbyInteractables.Remove(target);
}

// 每帧 Update 查最近的（防止高速移动漏检）
void Update() {
    if (Input.GetKeyDown(interactKey)) {
        var closest = nearbyInteractables
            .OrderBy(i => Vector3.Distance(transform.position, i.transform.position))
            .FirstOrDefault();
        if (closest && Vector3.Distance(transform.position, closest.transform.position) < maxInteractDist)
            DialogueSystem.Instance.StartDialogue(closest.CharacterId);
    }
}
```

**修正依据**：Codex CRITICAL#3（点击路由优先级）、WARNINGS（Trigger 在高速/Transform 驱动时会漏检）

---

### 3.4 DialogueSystem（修正后 LLM 接口）

#### 3.4.1 对话来源路由（不变）

1. 查 `CharacterDefinition` → 有可触发手写剧本? → 播放 `DialogueScript`
2. 否 → 闲聊：`ILlmClient` → 在线/离线兜底

#### 3.4.2 LLM 接口重新设计

```csharp
public interface ILlmClient {
    // 流式接口，返回增量 token
    IAsyncEnumerable<string> StreamChatAsync(
        string persona,
        List<Message> history,
        CancellationToken cancellationToken
    );
    
    // 当前是否可用（有 key + endpoint 配置）
    bool IsAvailable { get; }
}

[Serializable]
public class Message {
    public string Role;  // "system" / "user" / "assistant"
    public string Content;
}
```

#### 3.4.3 使用示例（含离线兜底）

```csharp
async void StartSmallTalk(string characterId, CancellationToken ct) {
    if (!llmClient.IsAvailable) {
        // 立即降级到预设池，但显示"未配置 API key"提示
        ShowPresetSmallTalk(characterId);
        ShowWarning("未配置 LLM API，使用预设对话");
        return;
    }
    
    try {
        var persona = GetCharacter(characterId).LlmPersona;
        await foreach (var delta in llmClient.StreamChatAsync(persona, history, ct)) {
            AppendToDialogueBox(delta); // 打字机效果
        }
    } catch (OperationCanceledException) {
        // 用户跳过对话，正常取消
    } catch (HttpRequestException ex) {
        // 网络/API 错误，降级到预设池 + 显示错误原因
        ShowPresetSmallTalk(characterId);
        ShowError($"API 调用失败: {ex.Message}");
    }
}
```

#### 3.4.4 OpenAI SSE 实现要点

**重要说明**：真正的**实时流式显示**需要复杂的异步回调机制。MVP 阶段可以先实现"伪流式"（整体接收后逐字显示），真正的流式作为优化项。

**方案 A：MVP 伪流式（推荐，降低风险）**

```csharp
public class OpenAIClient : ILlmClient {
    public async IAsyncEnumerable<string> StreamChatAsync(
        string persona, 
        List<Message> history, 
        [EnumeratorCancellation] CancellationToken ct
    ) {
        var request = UnityWebRequest.Post(endpoint, jsonBody);
        request.SetRequestHeader("Authorization", $"Bearer {apiKey}");
        
        ct.Register(() => request.Abort());
        
        // 一次性接收完整响应
        await request.SendWebRequest();
        
        if (request.result != UnityWebRequest.Result.Success) {
            throw new HttpRequestException(request.error);
        }
        
        var response = JsonUtility.FromJson<ChatResponse>(request.downloadHandler.text);
        var fullText = response.choices[0].message.content;
        
        // 逐字分割模拟流式（打字机效果）
        foreach (char c in fullText) {
            ct.ThrowIfCancellationRequested();
            yield return c.ToString();
            await Task.Delay(30); // 打字机延迟
        }
    }
}
```

**方案 B：真实 SSE 流式（Stretch Goal）**

```csharp
// 需要自定义 DownloadHandler + 回调队列
// 实现复杂度高，留到优化阶段
public class SseDownloadHandler : DownloadHandlerScript {
    public ConcurrentQueue<string> DeltaQueue = new();
    private StringBuilder buffer = new();
    
    protected override bool ReceiveData(byte[] data, int dataLength) {
        var text = Encoding.UTF8.GetString(data, 0, dataLength);
        buffer.Append(text);
        
        // 解析完整的 SSE 消息
        while (buffer.ToString().Contains("\n\n")) {
            var idx = buffer.ToString().IndexOf("\n\n");
            var line = buffer.ToString().Substring(0, idx).Trim();
            if (line.StartsWith("data: ")) {
                var json = line.Substring(6);
                if (json == "[DONE]") break;
                var delta = JsonUtility.FromJson<Delta>(json);
                DeltaQueue.Enqueue(delta.content);
            }
            buffer.Remove(0, idx + 2);
        }
        return true;
    }
}

// 调用方需要轮询 DeltaQueue
public async IAsyncEnumerable<string> StreamChatAsync(...) {
    var handler = new SseDownloadHandler();
    request.downloadHandler = handler;
    request.SendWebRequest(); // 不 await，立即开始接收
    
    while (!request.isDone || !handler.DeltaQueue.IsEmpty) {
        if (handler.DeltaQueue.TryDequeue(out var delta)) {
            yield return delta;
        }
        await Task.Delay(50);
    }
}
```

**修正依据**：Codex BLOCKER#5 — 原设计的 `await SendWebRequest()` 完成后才遍历不是实时流式；MVP 阶段降级为伪流式，真实流式标记为 Stretch

**修正依据**：Codex CRITICAL#5（LLM 接口要流式 + CancellationToken + SSE 解析）、SUGGESTIONS（区分"无 key"和"API 失败"）

---

### 3.5 存档与剧情标记系统

#### 3.5.1 存档时机规则

```
自动存档触发点：
  ├─ 对话结束时（DialogueScript 播完 / LLM 闲聊结束）
  ├─ 玩家做出选择后（DialogueChoice 分支）
  ├─ DialogueEffect 修改剧情标记后
  └─ 进入 Menu 状态时（暂停菜单）

禁止存档场景：
  └─ LLM 生成进行中（等待 StreamChatAsync 完成）
```

#### 3.5.2 存档内容（最小必须集）

```csharp
[Serializable]
public class SaveData {
    public Dictionary<string, int> storyFlags;     // 剧情标记
    public Dictionary<string, int> affinityFlags;  // 好感度（简单 int）
    public string llmApiKeyEncrypted;              // 加密存储
    public string llmEndpoint;                     // 自定义端点 URL
    // 不存：玩家位置、NPC 位置、对话进度（每次重新触发）
}
```

#### 3.5.3 加密存储 API key

```csharp
// 使用 Unity PlayerPrefs + 简单 XOR / AES 加密
// 或依赖系统 Keychain:
//   - Windows: Credential Manager
//   - macOS: Keychain
// 明确告知玩家：key 本地存储，不上传
public class SecureStorage {
    public static void SaveApiKey(string key) {
        var encrypted = SimpleEncrypt(key, GetDeviceId());
        PlayerPrefs.SetString("llm_key", encrypted);
    }
    
    private static string SimpleEncrypt(string text, string deviceId) {
        // XOR with device-specific salt
        // 或使用 System.Security.Cryptography.Aes
    }
}
```

**修正依据**：Codex CRITICAL#6（存档规则必须明确，否则重复触发/丢失分支）

---

### 3.6 游戏状态管理（能力锁，修正版）

#### 3.6.1 原设计问题

`Exploring / Dialogue / Menu` 三平级状态，无法表达"暂停菜单叠在对话上"。

#### 3.6.2 修正方案：按来源计数的锁

```csharp
public class GameStateManager : MonoBehaviour {
    public static GameStateManager Instance { get; private set; }
    
    private int movementLockCount = 0;
    private int interactionLockCount = 0;
    private int cameraLockCount = 0;
    private int uiModalCount = 0;
    
    public bool IsMovementLocked => movementLockCount > 0;
    public bool IsInteractionLocked => interactionLockCount > 0;
    public bool IsCameraLocked => cameraLockCount > 0;
    public bool IsUIModalActive => uiModalCount > 0;
    
    // 对话系统调用
    public void LockForDialogue() {
        movementLockCount++;
        interactionLockCount++;
        cameraLockCount++;
    }
    
    public void UnlockForDialogue() {
        movementLockCount = Mathf.Max(0, movementLockCount - 1);
        interactionLockCount = Mathf.Max(0, interactionLockCount - 1);
        cameraLockCount = Mathf.Max(0, cameraLockCount - 1);
    }
    
    // 菜单系统调用
    public void LockForMenu() {
        uiModalCount++;
        movementLockCount++;
    }
    
    public void UnlockForMenu() {
        uiModalCount = Mathf.Max(0, uiModalCount - 1);
        movementLockCount = Mathf.Max(0, movementLockCount - 1);
    }
}
```

**工作原理**：
- 对话开始：`LockForDialogue()` → 移动/交互/相机三锁 +1
- 对话中打开菜单：`LockForMenu()` → UI模态/移动两锁 +1（移动锁变成 2）
- 关闭菜单：`UnlockForMenu()` → 两锁 -1（移动锁变成 1，仍锁定）
- 对话结束：`UnlockForDialogue()` → 三锁 -1（移动锁变成 0，全解锁）

**修正依据**：Codex BLOCKER#4 — 原设计的 `ExitDialogue()` 和 `CloseMenu()` 会因判断逻辑错误导致提前解锁；计数器方案能正确处理嵌套锁定

#### 3.6.3 各系统响应锁

```csharp
// PlayerController
void Update() {
    if (GameStateManager.Instance.IsMovementLocked) return;
    ProcessMovementInput();
}

// InteractionSystem
void Update() {
    if (GameStateManager.Instance.IsInteractionLocked) return;
    CheckNearbyInteractables();
}

// CameraManager
void LateUpdate() {
    if (GameStateManager.Instance.IsCameraLocked) return;
    FollowPlayer();
}
```

**修正依据**：Codex CRITICAL#7（三平级状态机不够，Menu 和 Dialogue 冲突；应用能力锁或状态栈）

---

### 3.7 NpcController（微调）

```csharp
public class NpcController : MonoBehaviour {
    private NavMeshAgent agent;
    private DailySchedule schedule;
    private int currentPointIndex = 0;
    
    void Start() {
        agent = GetComponent<NavMeshAgent>();
        agent.updateRotation = false; // 自己控朝向
        MoveToNextIdlePoint();
    }
    
    void Update() {
        if (!agent.pathPending && agent.remainingDistance < 0.5f) {
            MoveToNextIdlePoint();
        }
    }
    
    void MoveToNextIdlePoint() {
        currentPointIndex = (currentPointIndex + 1) % schedule.IdlePoints.Length;
        agent.SetDestination(schedule.IdlePoints[currentPointIndex].position);
    }
    
    // 对话开始
    public void OnDialogueStart(Transform player) {
        agent.isStopped = true;          // 暂停，保留当前路径
        agent.velocity = Vector3.zero;   // 清零惯性
        FaceTowards(player.position);
    }
    
    // 对话结束
    public void OnDialogueEnd() {
        agent.isStopped = false;         // 恢复，继续走向原目标
        // 不调用 ResetPath()，除非要放弃当前 schedule 点
    }
    
    void FaceTowards(Vector3 target) {
        var dir = (target - transform.position).normalized;
        transform.rotation = Quaternion.LookRotation(new Vector3(dir.x, 0, dir.z));
    }
}
```

**修正依据**：Codex WARNINGS（暂停用 `isStopped`，取消才用 `ResetPath()`）

---

### 3.8 Cinemachine 相机

#### 3.8.1 方案：两个独立 Virtual Camera

```
VCam_Explore (Priority 10):
  - Follow: Player Transform
  - LookAt: Player Transform
  - 俯视角度 (Transposer offset)

VCam_Dialogue (Priority 0 默认):
  - Follow: 动态设置为当前对话 NPC
  - LookAt: 同上
  - 轻微拉近 (Transposer offset 调整)
```

#### 3.8.2 实现

```csharp
public class CameraManager : MonoBehaviour {
    public CinemachineCamera vCamExplore;   // Cinemachine 3.x 使用 CinemachineCamera
    public CinemachineCamera vCamDialogue;
    
    public void FocusOnNpc(Transform npcTransform) {
        vCamDialogue.Follow = npcTransform;
        vCamDialogue.LookAt = npcTransform;
        vCamDialogue.Priority = 20; // 自动切换（CinemachineBrain 处理混合）
    }
    
    public void ResetToExplore() {
        vCamDialogue.Priority = 0;  // 切回 Explore 相机
    }
}
```

**注意**：Unity 6 + Cinemachine 3.1 使用 `CinemachineCamera` 组件（v3 新命名），替代旧版的 `CinemachineVirtualCamera`。参考官方文档核对 API。

**修正依据**：Codex WARNINGS（Cinemachine 3 API 命名变更）

**修正依据**：Codex WARNINGS（Cinemachine 切换不是性能瓶颈，用独立相机干净；避免频繁改 targets 导致 damping/history 混乱）

---

## 第 4 节 / 项目结构、测试与开发里程碑

### 4.1 Unity 工程目录结构

```
unity/observatory-stage/
├── Assets/
│   ├── _Project/                    # 游戏核心代码和资源（下划线置顶）
│   │   ├── Scripts/
│   │   │   ├── Core/
│   │   │   │   ├── GameStateManager.cs      # 能力锁状态管理
│   │   │   │   ├── SaveSystem.cs            # 存档/加载
│   │   │   │   └── SceneBootstrap.cs        # 场景初始化
│   │   │   ├── Player/
│   │   │   │   ├── PlayerController.cs      # 双输入移动
│   │   │   │   └── PlayerInput.inputactions # Input System 配置
│   │   │   ├── NPC/
│   │   │   │   ├── NpcController.cs         # NPC 日程巡逻
│   │   │   │   └── InteractionTrigger.cs    # 交互检测
│   │   │   ├── Dialogue/
│   │   │   │   ├── DialogueSystem.cs        # 对话调度
│   │   │   │   ├── DialogueUI.cs            # 对话框 UI
│   │   │   │   └── Services/
│   │   │   │       ├── ILlmClient.cs        # LLM 抽象接口
│   │   │   │       ├── OpenAIClient.cs      # OpenAI 格式实现
│   │   │   │       ├── IDialogueRepository.cs
│   │   │   │       └── DialogueRepository.cs
│   │   │   ├── Camera/
│   │   │   │   └── CameraManager.cs         # Cinemachine 相机切换
│   │   │   └── UI/
│   │   │       ├── SettingsPanel.cs         # LLM key 配置
│   │   │       ├── InteractionPrompt.cs     # "按 E 对话"提示
│   │   │       └── MenuController.cs        # 暂停菜单
│   │   │
│   │   ├── Data/                            # ScriptableObject 资产
│   │   │   ├── Characters/
│   │   │   │   └── [CharacterDefinition].asset
│   │   │   ├── Dialogues/
│   │   │   │   └── [DialogueScript].asset
│   │   │   └── Scenes/
│   │   │       └── [DormSceneConfig].asset
│   │   │
│   │   ├── Art/                             # 美术资源（网络公开素材）
│   │   │   ├── Characters/
│   │   │   │   ├── Portraits/              # 对话立绘
│   │   │   │   └── Sprites/                # 场景精灵/模型
│   │   │   ├── Environment/
│   │   │   │   ├── Models/                 # 3D 地板/墙/道具
│   │   │   │   └── Props/                  # 家具装饰
│   │   │   └── UI/
│   │   │       └── DialogueBox.png
│   │   │
│   │   ├── Localization/                    # i18n 本地化表
│   │   │   ├── Strings_EN.csv
│   │   │   └── Strings_ZH.csv
│   │   │
│   │   ├── Scenes/
│   │   │   ├── Bootstrap.unity              # 启动场景（加载管理）
│   │   │   └── Dorm01.unity                 # 宿舍场景
│   │   │
│   │   └── Licenses/                        # 资源许可证登记
│   │       └── ASSET_LICENSES.md            # 每个外部素材的来源+许可
│   │
│   ├── Tests/                                # 单元测试 + 集成测试
│   │   ├── EditMode/                         # 编辑器模式测试
│   │   │   ├── DialogueSystemTests.cs
│   │   │   ├── SaveSystemTests.cs
│   │   │   └── MockLlmClient.cs             # 测试用假实现
│   │   └── PlayMode/                         # 运行时测试
│   │       ├── PlayerMovementTests.cs
│   │       └── InteractionTests.cs
│   │
│   ├── Settings/                             # URP/Input/NavMesh 配置
│   ├── Scenes/                               # Unity 自带场景（保留）
│   └── TutorialInfo/                         # 可删除
│
├── Packages/
│   └── manifest.json                         # 依赖清单
├── ProjectSettings/
│   ├── InputManager.asset
│   ├── NavMeshAreas.asset
│   └── ...
└── README.md                                 # 工程说明
```

**组织原则**：
- **单一职责 (S)**：Scripts 按职责分目录（Player/NPC/Dialogue/Core），不按"Managers"大杂烩
- **依赖倒置 (D)**：Services/ 目录放接口 + 实现，方便替换和测试
- **开闭原则 (O)**：Data/ 目录的 ScriptableObject 是内容扩展点，永不改代码

---

### 4.2 外部依赖与许可证管理

#### 4.2.1 核心依赖（Packages/manifest.json）

```json
{
  "dependencies": {
    "com.unity.inputsystem": "1.11.2",
    "com.unity.ai.navigation": "2.0.4",
    "com.unity.cinemachine": "3.1.2",
    "com.unity.render-pipelines.universal": "17.0.3",
    "com.unity.test-framework": "2.0.1",
    "com.unity.localization": "1.5.3"
  }
}
```

#### 4.2.2 网络公开资源许可证登记

**文件位置**：`Assets/_Project/Licenses/ASSET_LICENSES.md`

```markdown
# Asset License Registry

每个外部素材必须登记：来源、作者、许可证、使用范围

## Characters
- `Art/Characters/Portraits/girl_01.png`
  - Source: https://opengameart.org/content/...
  - Author: Artist Name
  - License: CC0 (Public Domain)
  - Usage: Dialogue portrait

## Environment
- `Art/Environment/Models/dorm_floor.fbx`
  - Source: itch.io/...
  - Author: Creator Name
  - License: CC-BY 4.0 (Attribution required)
  - Attribution: "Dorm Assets by Creator Name"
```

**强制规则**：
- 引入新资源 = 立即更新 `ASSET_LICENSES.md`
- 优先选 CC0 / MIT / 可商用许可
- 禁商用/禁二改的素材打 `[NonCommercial]` 标签，发布前全部替换

---

### 4.3 测试策略

#### 4.3.1 测试金字塔

```
         /\
        /UI\        少量 PlayMode 集成测试
       /────\
      /Logic \      中量 EditMode 单元测试
     /────────\
    / Manual   \    基础 手动测试（移动/对话/存档）
   /────────────\
```

#### 4.3.2 单元测试（EditMode）

```csharp
// DialogueSystemTests.cs
[Test]
public void GivenTriggerableScript_WhenStartDialogue_ShouldUseScript() {
    var mockRepo = new MockDialogueRepository();
    var mockLlm = new MockLlmClient();
    var system = new DialogueSystem(mockRepo, mockLlm);
    
    system.StartDialogue("npc_001");
    
    Assert.That(mockRepo.WasQueried, Is.True);
    Assert.That(mockLlm.WasCalled, Is.False); // 不该降级到 LLM
}

// SaveSystemTests.cs
[Test]
public void SaveAndLoad_PreservesStoryFlags() {
    var saveSystem = new SaveSystem();
    var originalData = new SaveData { 
        storyFlags = new() { ["met_alice"] = 1 } 
    };
    
    saveSystem.Save(originalData, "test_slot");
    var loadedData = saveSystem.Load("test_slot");
    
    Assert.That(loadedData.storyFlags["met_alice"], Is.EqualTo(1));
}
```

**Mock 实现**（隔离外部依赖）：
```csharp
public class MockLlmClient : ILlmClient {
    public bool WasCalled { get; private set; }
    public bool IsAvailable => true;
    
    public async IAsyncEnumerable<string> StreamChatAsync(
        string persona, 
        List<Message> history, 
        CancellationToken ct
    ) {
        WasCalled = true;
        yield return "Mock response";
    }
}
```

#### 4.3.3 集成测试（PlayMode）

```csharp
[UnityTest]
public IEnumerator PlayerClickGround_ShouldMoveToDestination() {
    // Arrange
    yield return SceneManager.LoadSceneAsync("TestScene_Empty");
    var player = CreatePlayerWithNavMesh();
    
    // Act
    var clickPos = new Vector3(5, 0, 5);
    player.GetComponent<PlayerController>().OnPointClick(clickPos);
    
    // Wait（有超时防卡死）
    float elapsed = 0f;
    while (Vector3.Distance(player.transform.position, clickPos) > 0.5f) {
        yield return null;
        elapsed += Time.deltaTime;
        if (elapsed > 5f) Assert.Fail("Movement timeout");
    }
    
    // Assert
    Assert.That(player.transform.position, Is.EqualTo(clickPos).Within(0.5f));
}
```

#### 4.3.4 手动测试检查清单

```
MVP 验证清单：
[ ] WASD 移动流畅、无卡顿
[ ] 点击地面寻路、点击 NPC 优先级正确（不同时触发）
[ ] 对话中无法移动、相机聚焦 NPC
[ ] 手写剧本分支选择正常跳转、Effects 生效
[ ] LLM 闲聊流式显示、跳过取消请求
[ ] 无 API key 时降级到预设闲聊池 + 提示
[ ] 暂停菜单叠加在对话上、ESC 关闭
[ ] 存档/读档恢复剧情标记、好感度
[ ] 分辨率缩放、全屏/窗口切换正常
[ ] 构建 exe 在干净环境启动无报错
```

---

### 4.4 开发里程碑（MVP 优先、YAGNI 严守）

**总共 6 个阶段**（阶段 1-6），阶段 0 是 Preflight 检查项，不计入正式开发周期。

#### Preflight：工程基础检查（开工前完成）

**目标**：确认 Unity 工程可用

**检查清单**：
- [ ] `Packages/` 和 `ProjectSettings/` 目录完整（当前缺失，阻塞项）
- [ ] Unity 6000.4.10f1 能正常打开工程
- [ ] URP、Input System、AI Navigation、Cinemachine 包已安装

**如果 Preflight 失败**：无法进入阶段 1，需修复工程结构。

---

#### 阶段 1：核心移动 + 交互（2 天）

**目标**：玩家能走、能触发交互（但还没对话内容）

**任务清单**：
- [ ] PlayerController 双输入移动（WASD 直控 + 点击寻路）
- [ ] 点击路由优先级（UI → NPC → 地面）
- [ ] InteractionTrigger + 每帧最近可交互物查询
- [ ] 交互提示 UI（"按 E 对话"）
- [ ] GameStateManager 能力锁（移动锁、交互锁）
- [ ] 放一个测试 NPC（占位 Capsule + Trigger），点击显示 Debug.Log
- [ ] 单元测试：PlayerController 输入仲裁逻辑

**验收标准**：  
WASD 走到 NPC 身边，按 E，日志输出 "Triggered: NPC_TEST"；点击 NPC 不触发寻路。

---

#### 阶段 2：对话系统骨架（2 天）

**目标**：手写剧本能播放、有分支

**任务清单**：
- [ ] CharacterDefinition 和 DialogueScript ScriptableObject 定义
- [ ] DialogueSystem 播放节点（文本、选项、Effects）
- [ ] DialogueUI 对话框（占位美术、打字机效果）
- [ ] 创建一个 2-3 节点的测试剧本（有分支选项）
- [ ] 对话中冻结移动（GameStateManager.EnterDialogue）
- [ ] 相机聚焦 NPC（Cinemachine 两相机切换）
- [ ] 剧情标记读写（SaveData 结构）
- [ ] 单元测试：DialogueSystem 路由逻辑

**验收标准**：  
触发 NPC → 对话框弹出 → 看完文本 → 选项分支 → 对话结束解冻移动。

---

#### 阶段 3：LLM 闲聊（2 天，含调试）

**目标**：无手写剧本时，能调 OpenAI 格式 API 生成对话

**任务清单**：
- [ ] ILlmClient 接口 + OpenAIClient 实现（SSE 流式）
- [ ] SettingsPanel UI（输入 API key + endpoint）
- [ ] CancellationToken 取消机制 + 超时处理
- [ ] 预设闲聊池（5-10 条通用回复，离线兜底）
- [ ] 区分"无 key"和"API 失败"提示 UI
- [ ] MockLlmClient 测试用假实现
- [ ] 单元测试：ILlmClient Mock + 降级逻辑

**验收标准**：  
- 填入真实 API key → NPC 闲聊生成实时对话（流式显示）
- 清空 key → 降级到预设池 + Toast 提示"未配置 LLM API"
- 对话中按 ESC → 请求取消、界面关闭、无报错

---

#### 阶段 4：存档 + NPC 日程（1 天）

**目标**：存档恢复剧情标记、NPC 有简单巡逻

**任务清单**：
- [ ] SaveSystem 存/读 JSON（剧情标记 + API key 加密）
- [ ] 自动存档触发点（对话结束、选项后、Menu 进入）
- [ ] NpcController DailySchedule 巡逻（NavMesh 在 idle 点间游走）
- [ ] 对话时 NPC 停止（isStopped）+ 转向玩家
- [ ] 对话结束 NPC 恢复巡逻
- [ ] 单元测试：SaveSystem 持久化逻辑

**验收标准**：  
- 触发剧情 → 设置标记 → 退出游戏 → 重新加载 → 标记保留
- NPC 在场景里缓慢游走，对话时停下面向玩家，结束后继续

---

#### 阶段 5：场景与美术（2-3 天，并行）

**目标**：替换占位资源、搭一个真实宿舍场景

**任务清单**：
- [ ] 搜索网络公开资源包（角色/地板/家具/UI）
  - 推荐站点：OpenGameArt.org、itch.io、Kenney.nl
  - 筛选条件：CC0 或 CC-BY 许可、崩坏三风格/二次元风格
- [ ] 登记到 `ASSET_LICENSES.md`（每个素材来源+许可证）
- [ ] 搭建 Dorm01 场景：
  - 3D 地板/墙体 + NavMesh 烘焙
  - 家具摆放（床/桌子/椅子）
  - 光照设置（URP）
- [ ] 替换角色占位为精灵/模型
- [ ] 对话框 UI 美化（窗口背景、字体、头像框）
- [ ] i18n 本地化表接入（中英切换，Localization Package）

**验收标准**：  
场景看起来像宿舍、角色有形象、对话框不是白框、能切换中英文。

---

#### 阶段 6：完整性与优化（1 天）

**目标**：补齐细节、优化体验、跑通完整流程

**任务清单**：
- [ ] 音效（可选）：脚步声、对话提示音、UI 点击音
- [ ] 暂停菜单完整功能（继续/设置/退出）
- [ ] 性能检查：
  - 60 FPS 稳定（桌面端）
  - 无 GC Alloc 抖动（Profiler 检查）
  - NavMesh 烘焙优化
- [ ] 手动测试检查清单全部通过
- [ ] 构建 Windows exe，在干净环境测试启动
- [ ] README.md 编写（安装/运行/配置 API key 说明）

**验收标准**：  
完整流程——启动游戏 → 走到 NPC → 对话（手写+LLM）→ 存档 → 退出 → 再启动读档 → 剧情保留、无崩溃。

---

### 4.5 总时间估算与风险

**核心开发周期**：**10 天**（6 个阶段，Preflight 不计入）

**Preflight 风险**：  
如果 `Packages/` 和 `ProjectSettings/` 缺失严重，修复可能需要 +0.5-1 天。

**阶段风险缓冲**：
- **阶段 3（LLM）**：SSE 流式实现复杂，MVP 降级为伪流式，预留 +0.5 天调试
- **阶段 5（美术）**：依赖外部资源质量，找不到合适素材就用占位，不阻塞功能验收

**三大风险与缓解措施**（来自 Codex 审查）：

1. **最大风险：2 周范围过大**  
   真实 LLM 流式、存档、测试、双语、美术 polish 同时推进会超期。  
   **缓解**：MVP 严格锁定——1 个房间、1 个 NPC、1 条手写剧本、占位美术；双语本地化和美术 polish **不进主路径**，作为 Stretch Goal。

2. **LLM 兼容性风险**  
   "OpenAI 格式兼容"不同 endpoint 的 schema/流式格式可能不同。  
   **缓解**：只支持标准 OpenAI chat-completions 协议，先用 MockLlmClient 打通流程，真实 API 放阶段 3 第一天验证。

3. **"崩坏三风格" IP 和素材风险**  
   使用 Honkai 原资产/商标有法律风险，且难找到完全匹配的公开素材。  
   **缓解**：定义为"原创二次元科幻宿舍风格"，禁止使用 Honkai 原资产；资源找不到就用 CC0/Kenney.nl 占位，不阻塞功能验收。

**YAGNI 已砍掉的功能**（不在 MVP 内）：
- ❌ 好感度数值系统（只有简单标记位 `int`）
- ❌ 物品/背包/送礼互动
- ❌ 多房间探索（先做一个宿舍房间）
- ❌ NPC 之间互动/社交模拟
- ❌ 复杂 AI 行为树
- ❌ 多语言配音（只有文本 i18n，且 i18n 作为 Stretch）
- ❌ 成就系统
- ❌ 角色自定义/捏脸
- ❌ 真正的实时 SSE 流式（MVP 用伪流式）

---

## 附录 A：Codex 审查关键修正点

本设计经 Codex 子代理（后端工程视角）对抗性审查，修正了以下 7 个 CRITICAL 缺陷：

1. **NavMeshAgent + 手动控制实现错误**  
   原设计 `updatePosition=false` 导致快照回弹，改用 `agent.velocity` 每帧驱动。

2. **Tilemap 2D 与 NavMesh 不兼容**  
   明确技术选型：推荐 2.5D 艺术 + XZ 3D 底层 + 原生 NavMesh。

3. **点击路由缺失优先级**  
   增加 UI → NPC → 地面的优先级逻辑，防止同时触发对话+寻路。

4. **WASD/点击仲裁处理异步寻路**  
   取消时调用 `ResetPath()` + 清零 velocity + 忽略 `pathPending` 结果。

5. **LLM 接口过于简陋**  
   改用 `IAsyncEnumerable<string>` + `CancellationToken` + SSE 增量解析。

6. **存档规则未明确**  
   定义自动存档触发点、禁止存档场景、API key 加密存储。

7. **状态机不足以支持 Menu 叠加**  
   改用能力锁（Capability Locks）替代三平级状态。

---

## 附录 B：技术参考

- **Unity 6 官方文档**：https://docs.unity3d.com/6000.4/Documentation/Manual/
- **AI Navigation Package**：https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/
- **Input System**：https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/
- **Cinemachine**：https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/
- **Unity Localization**：https://docs.unity3d.com/Packages/com.unity.localization@1.5/
- **OpenAI API SSE 流式**：https://platform.openai.com/docs/api-reference/streaming

---

## 结语

本设计文档经过完整的 brainstorming 流程：
1. **探索项目上下文**：确认 Unity 6000.4.10f1 + URP 空模板工程、现有 ViewModel 数据结构
2. **澄清 9 条决策**：平台/范式/玩法/对话来源/LLM 接入/美术/移动方式/视觉风格
3. **分节呈现设计**：架构 → 数据模型 → 运行时流程 → 项目结构
4. **Codex 两轮审查**：
   - 第一轮修正运行时流程的 7 个 CRITICAL 缺陷
   - 第二轮修正全文档的 5 个 BLOCKERS + 调整风险范围
5. **用户确认**：主人审查通过

**关键修正汇总**：
- ✅ ScriptableObject 不再引用 Transform，改用场景内 MonoBehaviour
- ✅ DialogueTrigger 完整实现触发条件判断逻辑
- ✅ SaveData 使用 JsonUtility 兼容的数组结构，LLM 配置单独加密存储
- ✅ 状态锁改用计数器，正确处理嵌套锁定
- ✅ LLM 流式降级为 MVP 伪流式，真实 SSE 标记为 Stretch Goal
- ✅ 明确技术选型（XZ 3D + 原生 NavMesh，移除 Tilemap 歧义）
- ✅ UI 统一使用 uGUI，移除 UI Toolkit 混用
- ✅ 里程碑调整为 Preflight + 6 阶段（10 天核心开发）
- ✅ Cinemachine 3.x API 更新为 `CinemachineCamera`
- ✅ 风险范围调整：双语本地化和美术 polish 不进 MVP 主路径

**设计状态**：✅ **已通过 Codex 最终审查，可进入实施计划阶段**

**下一步**：调用 `writing-plans` skill 生成可执行的实施计划。

---

**文档结束**
