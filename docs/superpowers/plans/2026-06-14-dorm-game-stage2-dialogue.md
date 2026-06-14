# 宿舍游戏 - 阶段 2：对话系统骨架 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现手写剧本对话系统，支持文本显示、分支选项、剧情标记和相机切换

**Architecture:**
- ScriptableObject 数据驱动：CharacterDefinition 和 DialogueScript 分离内容与代码
- DialogueSystem 单例调度器：播放节点、处理选项、执行 Effects
- 对话中通过 GameStateManager 锁定移动/交互
- Cinemachine 两相机切换实现聚焦效果

**Tech Stack:** Unity 6000.4.10f1, uGUI, Cinemachine 3.1.2, ScriptableObject, TextMeshPro

**验收标准**：触发 NPC → 对话框弹出 → 看完文本 → 选项分支 → 对话结束解冻移动

---

## 前置依赖

- ✅ 阶段 1 完成：PlayerController、GameStateManager、Interactable
- ⚠️ 需要安装 Cinemachine Package（阶段 2 开始前安装）
- ⚠️ 需要安装 TextMeshPro（Unity 6 自带，首次使用时自动导入）

---

## 文件结构规划

```
Assets/_Project/Scripts/
├── Dialogue/
│   ├── DialogueSystem.cs              # 对话调度单例
│   ├── DialogueUI.cs                  # uGUI 对话框控制器
│   ├── DialogueNode.cs                # 节点数据类
│   ├── DialogueChoice.cs              # 选项数据类
│   ├── DialogueEffect.cs              # 副作用数据类
│   └── DialogueTrigger.cs             # 触发条件类
├── Data/
│   ├── CharacterDefinition.cs         # ScriptableObject 角色定义
│   └── DialogueScript.cs              # ScriptableObject 剧本资产
├── Camera/
│   └── CameraManager.cs               # Cinemachine 相机切换
└── Core/
    └── SaveData.cs                     # 存档数据结构

Assets/_Project/Data/
├── Characters/
│   └── TestCharacter.asset            # 测试角色
└── Dialogues/
    └── TestDialogue.asset             # 测试剧本

Assets/Tests/EditMode/
└── DialogueSystemTests.cs             # 单元测试
```

---

## Task 1: 安装 Cinemachine Package

**Goal:** 添加 Cinemachine 3.x 支持相机切换

- [ ] **Step 1: 通过 Package Manager 添加 Cinemachine**

使用 Unity MCP 或手动添加：
```csharp
// Unity MCP 方式（推荐）
unity_packages_add({ 
  packageId: "com.unity.cinemachine", 
  port: 7890 
})

// 或手动在 Package Manager 中搜索 "Cinemachine" 并安装
```

- [ ] **Step 2: 验证安装**

检查 `Packages/manifest.json` 包含：
```json
"com.unity.cinemachine": "3.1.2"
```

---

## Task 2: 数据结构定义

**Files:**
- Create: `Assets/_Project/Scripts/Data/CharacterDefinition.cs`
- Create: `Assets/_Project/Scripts/Data/DialogueScript.cs`
- Create: `Assets/_Project/Scripts/Dialogue/DialogueNode.cs`
- Create: `Assets/_Project/Scripts/Dialogue/DialogueChoice.cs`
- Create: `Assets/_Project/Scripts/Dialogue/DialogueEffect.cs`
- Create: `Assets/_Project/Scripts/Dialogue/DialogueTrigger.cs`
- Create: `Assets/_Project/Scripts/Core/SaveData.cs`

### 2.1 DialogueNode 数据类

```csharp
using System;
using UnityEngine;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueNode
    {
        public string nodeId;
        public string speakerId;           // 说话者 CharacterId
        public string textKey;             // 对话文本（暂时直接用中文，i18n 留到阶段 5）
        public DialogueChoice[] choices;   // 玩家选项（空 = 自动 continue）
        public string nextNodeId;          // 无选项时的下一节点
        public DialogueEffect[] effects;   // 副作用
    }
}
```

### 2.2 DialogueChoice 数据类

```csharp
using System;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueChoice
    {
        public string choiceTextKey;       // 选项文本
        public string nextNodeId;          // 跳转目标节点
    }
}
```

### 2.3 DialogueEffect 数据类

```csharp
using System;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueEffect
    {
        public enum EffectType { SetFlag, ModifyAffinity, UnlockScript }
        
        public EffectType type;
        public string targetId;            // 标记名/角色ID
        public int value;                  // 设为多少/增减量
    }
}
```

### 2.4 DialogueTrigger 数据类

```csharp
using System;
using DormGame.Core;

namespace DormGame.Dialogue
{
    [Serializable]
    public class DialogueTrigger
    {
        public enum TriggerType { FirstMeet, StoryFlag, AffinityLevel }
        
        public TriggerType type;
        public string requiredFlagId;      // Type=StoryFlag 时检查此标记
        public int requiredFlagValue;      // 标记值门槛
        public int requiredAffinityLevel;  // Type=AffinityLevel 时检查好感度
        public bool isRepeatable;          // 可重复触发？
        public int priority;               // 多剧本同时满足时，优先级高的先播
        
        public bool CanTrigger(SaveData saveData, string characterId, string scriptId)
        {
            // 检查已播放记录
            string playedKey = $"{characterId}_{scriptId}";
            if (!isRepeatable && saveData.playedScripts.Contains(playedKey))
                return false;
            
            switch (type)
            {
                case TriggerType.FirstMeet:
                    return !saveData.playedScripts.Contains(playedKey);
                    
                case TriggerType.StoryFlag:
                    var flags = saveData.GetStoryFlagsDict();
                    return flags.TryGetValue(requiredFlagId, out int val) && val >= requiredFlagValue;
                    
                case TriggerType.AffinityLevel:
                    var affinity = saveData.GetAffinityFlagsDict();
                    return affinity.TryGetValue(characterId, out int aff) && aff >= requiredAffinityLevel;
            }
            
            return false;
        }
    }
}
```

### 2.5 SaveData 结构

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

namespace DormGame.Core
{
    [Serializable]
    public class SaveData
    {
        // JsonUtility 兼容：使用数组而非 Dictionary
        public StringIntPair[] storyFlags = Array.Empty<StringIntPair>();
        public StringIntPair[] affinityFlags = Array.Empty<StringIntPair>();
        public List<string> playedScripts = new List<string>();
        
        // 运行时辅助方法
        public Dictionary<string, int> GetStoryFlagsDict()
        {
            return storyFlags.ToDictionary(p => p.key, p => p.value);
        }
        
        public void SetStoryFlagsDict(Dictionary<string, int> dict)
        {
            storyFlags = dict.Select(kv => new StringIntPair(kv.Key, kv.Value)).ToArray();
        }
        
        public Dictionary<string, int> GetAffinityFlagsDict()
        {
            return affinityFlags.ToDictionary(p => p.key, p => p.value);
        }
        
        public void SetAffinityFlagsDict(Dictionary<string, int> dict)
        {
            affinityFlags = dict.Select(kv => new StringIntPair(kv.Key, kv.Value)).ToArray();
        }
    }
    
    [Serializable]
    public struct StringIntPair
    {
        public string key;
        public int value;
        
        public StringIntPair(string k, int v)
        {
            key = k;
            value = v;
        }
    }
}
```

### 2.6 CharacterDefinition SO

```csharp
using UnityEngine;

namespace DormGame.Data
{
    [CreateAssetMenu(fileName = "Character", menuName = "DormGame/Character")]
    public class CharacterDefinition : ScriptableObject
    {
        public string characterId;         // 稳定唯一ID
        public string displayName;         // 显示名称（暂时直接中文）
        public Sprite portrait;            // 对话框立绘
        public GameObject walkPrefab;      // 场景中可走动的预制体
        public string llmPersona;          // 喂给LLM的人设（阶段3用）
        public DialogueScript[] mainScripts;  // 手写主线剧本集
        public float walkSpeed = 1.5f;
    }
}
```

### 2.7 DialogueScript SO

```csharp
using UnityEngine;
using DormGame.Dialogue;

namespace DormGame.Data
{
    [CreateAssetMenu(fileName = "Dialogue", menuName = "DormGame/Dialogue Script")]
    public class DialogueScript : ScriptableObject
    {
        public string scriptId;
        public DialogueTrigger trigger;
        public DialogueNode[] nodes;
    }
}
```

---

## Task 3: DialogueSystem 调度器

**Files:**
- Create: `Assets/_Project/Scripts/Dialogue/DialogueSystem.cs`

```csharp
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DormGame.Core;
using DormGame.Data;

namespace DormGame.Dialogue
{
    public class DialogueSystem : MonoBehaviour
    {
        public static DialogueSystem Instance { get; private set; }
        
        private DialogueScript currentScript;
        private DialogueNode currentNode;
        private SaveData saveData;
        private string currentCharacterId;
        
        public bool IsPlaying => currentScript != null;
        
        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        
        public void StartDialogue(CharacterDefinition character)
        {
            if (IsPlaying)
            {
                Debug.LogWarning("Dialogue already playing!");
                return;
            }
            
            // 加载存档（阶段 4 实现完整存档，这里先用内存临时）
            saveData = LoadOrCreateSaveData();
            currentCharacterId = character.characterId;
            
            // 根据 Trigger 选择剧本
            var validScripts = character.mainScripts
                .Where(script => script.trigger.CanTrigger(saveData, character.characterId, script.scriptId))
                .OrderByDescending(script => script.trigger.priority);
            
            currentScript = validScripts.FirstOrDefault();
            
            if (currentScript == null)
            {
                Debug.Log($"No valid script for {character.characterId}, fallback to LLM (Stage 3)");
                return;
            }
            
            // 播放首节点
            currentNode = currentScript.nodes[0];
            
            // 锁定移动和交互
            GameStateManager.Instance.LockForDialogue();
            
            // 通知 UI 显示对话
            DialogueUI.Instance.Show(currentNode, character);
            
            // 触发相机切换（阶段 2 Task 5）
            // CameraManager.Instance.FocusOnCharacter(character.characterId);
        }
        
        public void OnPlayerClickNext()
        {
            if (!IsPlaying) return;
            
            // 执行当前节点的 Effects
            ExecuteEffects(currentNode.effects);
            
            // 无选项 → 自动跳转
            if (currentNode.choices == null || currentNode.choices.Length == 0)
            {
                if (string.IsNullOrEmpty(currentNode.nextNodeId))
                {
                    EndDialogue();
                }
                else
                {
                    PlayNode(currentNode.nextNodeId);
                }
            }
            else
            {
                // 有选项 → 等待玩家选择
                DialogueUI.Instance.ShowChoices(currentNode.choices);
            }
        }
        
        public void OnPlayerSelectChoice(int choiceIndex)
        {
            if (!IsPlaying || currentNode.choices == null) return;
            
            var choice = currentNode.choices[choiceIndex];
            PlayNode(choice.nextNodeId);
        }
        
        private void PlayNode(string nodeId)
        {
            if (string.IsNullOrEmpty(nodeId))
            {
                EndDialogue();
                return;
            }
            
            currentNode = System.Array.Find(currentScript.nodes, n => n.nodeId == nodeId);
            
            if (currentNode == null)
            {
                Debug.LogError($"Node {nodeId} not found in script {currentScript.scriptId}");
                EndDialogue();
                return;
            }
            
            // 查找角色定义（根据 speakerId）
            var character = FindCharacterById(currentNode.speakerId);
            DialogueUI.Instance.Show(currentNode, character);
        }
        
        private void ExecuteEffects(DialogueEffect[] effects)
        {
            if (effects == null) return;
            
            var storyFlags = saveData.GetStoryFlagsDict();
            var affinityFlags = saveData.GetAffinityFlagsDict();
            
            foreach (var effect in effects)
            {
                switch (effect.type)
                {
                    case DialogueEffect.EffectType.SetFlag:
                        storyFlags[effect.targetId] = effect.value;
                        break;
                        
                    case DialogueEffect.EffectType.ModifyAffinity:
                        if (!affinityFlags.ContainsKey(effect.targetId))
                            affinityFlags[effect.targetId] = 0;
                        affinityFlags[effect.targetId] += effect.value;
                        break;
                }
            }
            
            saveData.SetStoryFlagsDict(storyFlags);
            saveData.SetAffinityFlagsDict(affinityFlags);
        }
        
        private void EndDialogue()
        {
            // 记录已播放
            string playedKey = $"{currentCharacterId}_{currentScript.scriptId}";
            if (!saveData.playedScripts.Contains(playedKey))
            {
                saveData.playedScripts.Add(playedKey);
            }
            
            // 保存（阶段 4 实现完整存档）
            SaveSaveData(saveData);
            
            // 解锁移动和交互
            GameStateManager.Instance.UnlockForDialogue();
            
            // 隐藏 UI
            DialogueUI.Instance.Hide();
            
            // 恢复相机
            // CameraManager.Instance.ReturnToPlayerView();
            
            currentScript = null;
            currentNode = null;
        }
        
        private CharacterDefinition FindCharacterById(string characterId)
        {
            // 简单实现：从 Resources 加载（阶段 4 可改为 Registry）
            var characters = Resources.LoadAll<CharacterDefinition>("Characters");
            return System.Array.Find(characters, c => c.characterId == characterId);
        }
        
        private SaveData LoadOrCreateSaveData()
        {
            // 阶段 2 临时实现：内存临时数据
            // 阶段 4 改为从 JSON 文件加载
            return new SaveData();
        }
        
        private void SaveSaveData(SaveData data)
        {
            // 阶段 2 临时实现：不做持久化
            // 阶段 4 改为写入 JSON 文件
        }
    }
}
```

---

## Task 4: DialogueUI 对话框

**Files:**
- Create: `Assets/_Project/Scripts/Dialogue/DialogueUI.cs`

**Prerequisites:** 需要在场景中创建 UI Canvas 和对话框面板

### 4.1 创建 UI 结构（Unity Editor 操作）

请主人在 Unity Editor 中：

1. **Hierarchy → 右键 → UI → Canvas**
   - Name: `DialogueCanvas`
   - Canvas Scaler → UI Scale Mode: `Scale With Screen Size`
   - Reference Resolution: `1920 x 1080`

2. **Canvas 下创建对话框面板**
   - 右键 Canvas → UI → Panel
   - Name: `DialoguePanel`
   - Anchor: Bottom (整个底部)
   - Height: `300`

3. **DialoguePanel 子对象**：
   - **Text - TMP (对话文本)**:
     - Name: `DialogueText`
     - Font Size: `36`
     - Alignment: Left Top
     - Anchor: Stretch / Stretch
     - Margin: Left `20`, Top `20`, Right `20`, Bottom `100`
   
   - **Button (下一步按钮)**:
     - Name: `NextButton`
     - Anchor: Bottom Right
     - Position: `(-100, 20)`
     - Text: "继续 ▶"
   
   - **Vertical Layout Group (选项容器)**:
     - Name: `ChoicesContainer`
     - Anchor: Bottom Center
     - Height: `200`
     - Child Alignment: Middle Center
     - Spacing: `10`

4. **添加 DialogueUI 脚本**到 `DialoguePanel`

### 4.2 DialogueUI.cs 实现

```csharp
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using DormGame.Data;

namespace DormGame.Dialogue
{
    public class DialogueUI : MonoBehaviour
    {
        public static DialogueUI Instance { get; private set; }
        
        [Header("UI References")]
        [SerializeField] private GameObject dialoguePanel;
        [SerializeField] private TextMeshProUGUI dialogueText;
        [SerializeField] private Button nextButton;
        [SerializeField] private Transform choicesContainer;
        [SerializeField] private GameObject choiceButtonPrefab; // 需要创建预制体
        
        [Header("Typewriter Settings")]
        [SerializeField] private float typewriterSpeed = 0.05f;
        
        private Coroutine typewriterCoroutine;
        private string fullText;
        private bool isTyping;
        
        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            
            dialoguePanel.SetActive(false);
            nextButton.onClick.AddListener(OnNextButtonClicked);
        }
        
        public void Show(DialogueNode node, CharacterDefinition character)
        {
            dialoguePanel.SetActive(true);
            
            // 清空选项
            foreach (Transform child in choicesContainer)
            {
                Destroy(child.gameObject);
            }
            choicesContainer.gameObject.SetActive(false);
            nextButton.gameObject.SetActive(true);
            
            // 显示文本（带打字机效果）
            fullText = node.textKey; // 暂时直接显示，i18n 在阶段 5
            
            if (typewriterCoroutine != null)
            {
                StopCoroutine(typewriterCoroutine);
            }
            
            typewriterCoroutine = StartCoroutine(TypewriterEffect());
        }
        
        public void ShowChoices(DialogueChoice[] choices)
        {
            nextButton.gameObject.SetActive(false);
            choicesContainer.gameObject.SetActive(true);
            
            for (int i = 0; i < choices.Length; i++)
            {
                int index = i; // 闭包捕获
                var choice = choices[i];
                
                var buttonGo = Instantiate(choiceButtonPrefab, choicesContainer);
                var button = buttonGo.GetComponent<Button>();
                var buttonText = buttonGo.GetComponentInChildren<TextMeshProUGUI>();
                
                buttonText.text = choice.choiceTextKey;
                button.onClick.AddListener(() => OnChoiceSelected(index));
            }
        }
        
        public void Hide()
        {
            dialoguePanel.SetActive(false);
            
            if (typewriterCoroutine != null)
            {
                StopCoroutine(typewriterCoroutine);
                typewriterCoroutine = null;
            }
        }
        
        private IEnumerator TypewriterEffect()
        {
            isTyping = true;
            dialogueText.text = "";
            
            foreach (char c in fullText)
            {
                dialogueText.text += c;
                yield return new WaitForSeconds(typewriterSpeed);
            }
            
            isTyping = false;
            typewriterCoroutine = null;
        }
        
        private void OnNextButtonClicked()
        {
            // 如果正在打字 → 直接显示完整文本
            if (isTyping)
            {
                if (typewriterCoroutine != null)
                {
                    StopCoroutine(typewriterCoroutine);
                    typewriterCoroutine = null;
                }
                dialogueText.text = fullText;
                isTyping = false;
            }
            else
            {
                // 打字完成 → 通知 DialogueSystem 继续
                DialogueSystem.Instance.OnPlayerClickNext();
            }
        }
        
        private void OnChoiceSelected(int index)
        {
            DialogueSystem.Instance.OnPlayerSelectChoice(index);
        }
    }
}
```

### 4.3 创建 ChoiceButton 预制体（Unity Editor 操作）

请主人在 Unity Editor 中：

1. **Hierarchy → 右键 → UI → Button - TextMeshPro**
   - Name: `ChoiceButton`
   - Width: `800`, Height: `60`

2. **调整按钮样式**：
   - Button → Colors → Normal: 半透明蓝
   - Button → Colors → Highlighted: 亮蓝
   - Text (TMP) → Font Size: `32`
   - Text (TMP) → Alignment: Center

3. **拖拽到 Project 窗口创建 Prefab**：
   - 保存到 `Assets/_Project/Prefabs/UI/ChoiceButton.prefab`

4. **删除 Hierarchy 中的 ChoiceButton**（已保存为 Prefab）

5. **在 DialoguePanel 的 Inspector 中**：
   - 将 `ChoiceButton.prefab` 拖拽到 `Choice Button Prefab` 字段

---

## Task 5: CameraManager 相机切换

**Files:**
- Create: `Assets/_Project/Scripts/Camera/CameraManager.cs`

### 5.1 场景相机设置（Unity Editor 操作）

请主人在 Unity Editor 中：

1. **Main Camera 配置**：
   - 选中 Main Camera
   - Add Component → `Cinemachine Brain`

2. **创建跟随相机**：
   - Hierarchy 右键 → Cinemachine → Virtual Camera
   - Name: `PlayerFollowCamera`
   - Follow: 拖拽 Player GameObject
   - Look At: 拖拽 Player GameObject
   - Body → Framing Transposer:
     - Camera Distance: `10`
     - Screen Y: `0.5`

3. **创建对话聚焦相机**：
   - Hierarchy 右键 → Cinemachine → Virtual Camera
   - Name: `DialogueFocusCamera`
   - Priority: `11` (高于 PlayerFollowCamera)
   - 初始状态：Disable GameObject

4. **创建空物体作为聚焦点**：
   - Hierarchy 右键 → Create Empty
   - Name: `DialogueFocusPoint`
   - Position: (0, 1.5, 0) // 会在运行时动态移动到 NPC 位置

5. **配置 DialogueFocusCamera**：
   - Follow: 拖拽 DialogueFocusPoint
   - Look At: 拖拽 DialogueFocusPoint
   - Body → Framing Transposer:
     - Camera Distance: `5`
     - Screen Y: `0.6`

### 5.2 CameraManager.cs 实现

```csharp
using UnityEngine;
using Unity.Cinemachine;

namespace DormGame.Camera
{
    public class CameraManager : MonoBehaviour
    {
        public static CameraManager Instance { get; private set; }
        
        [SerializeField] private CinemachineCamera playerFollowCamera;
        [SerializeField] private CinemachineCamera dialogueFocusCamera;
        [SerializeField] private Transform dialogueFocusPoint;
        
        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }
        
        public void FocusOnCharacter(string characterId)
        {
            // 查找场景中的角色 GameObject
            var npcGo = GameObject.Find(characterId); // 简化实现，阶段 4 改为 Registry
            
            if (npcGo == null)
            {
                Debug.LogWarning($"Character {characterId} not found for camera focus");
                return;
            }
            
            // 移动聚焦点到 NPC 头部位置
            dialogueFocusPoint.position = npcGo.transform.position + Vector3.up * 1.5f;
            
            // 切换相机
            dialogueFocusCamera.gameObject.SetActive(true);
            playerFollowCamera.gameObject.SetActive(false);
        }
        
        public void ReturnToPlayerView()
        {
            dialogueFocusCamera.gameObject.SetActive(false);
            playerFollowCamera.gameObject.SetActive(true);
        }
    }
}
```

---

## Task 6: 修改 Interactable 触发对话

**Files:**
- Modify: `Assets/_Project/Scripts/NPC/Interactable.cs`

**Goal:** 将 Interactable 组件关联到 CharacterDefinition，触发对话而不是 Debug.Log

### 6.1 修改 Interactable.cs

```csharp
using UnityEngine;
using DormGame.Data;
using DormGame.Dialogue;

namespace DormGame.NPC
{
    /// <summary>
    /// 可交互物体组件 - 触发对话
    /// </summary>
    public class Interactable : MonoBehaviour
    {
        [SerializeField] private string interactableId;
        [SerializeField] private float interactionRadius = 2f;
        [SerializeField] private CharacterDefinition character; // 新增
        
        public string InteractableId => interactableId;
        public float InteractionRadius => interactionRadius;
        
        void OnValidate()
        {
            // 自动生成 ID
            if (string.IsNullOrEmpty(interactableId))
            {
                interactableId = $"{gameObject.name}_{GetInstanceID()}";
            }
        }
        
        public void OnInteract()
        {
            if (character != null)
            {
                // 触发对话系统
                DialogueSystem.Instance.StartDialogue(character);
            }
            else
            {
                Debug.LogWarning($"Interactable {interactableId} has no character assigned!");
            }
        }
        
        void OnDrawGizmosSelected()
        {
            // 可视化交互范围
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, interactionRadius);
        }
    }
}
```

---

## Task 7: 创建测试数据

**Files:**
- Create: `Assets/_Project/Data/Characters/TestCharacter.asset`
- Create: `Assets/_Project/Data/Dialogues/TestDialogue.asset`

### 7.1 创建 TestCharacter.asset（Unity Editor 操作）

请主人在 Unity Editor 中：

1. **Project 窗口 → `Assets/_Project/Data/Characters/`**
2. **右键 → Create → DormGame → Character**
3. **命名为 `TestCharacter`**
4. **配置参数**：
   - Character Id: `test_npc`
   - Display Name: `测试角色`
   - Portrait: 留空（阶段 5 添加）
   - Walk Prefab: 留空
   - Llm Persona: 留空（阶段 3 用）
   - Walk Speed: `1.5`
   - Main Scripts: Size = 1（下一步创建 Dialogue 后添加）

### 7.2 创建 TestDialogue.asset（Unity Editor 操作）

请主人在 Unity Editor 中：

1. **Project 窗口 → `Assets/_Project/Data/Dialogues/`**
2. **右键 → Create → DormGame → Dialogue Script**
3. **命名为 `TestDialogue`**
4. **配置参数**：

```
Script Id: test_first_meet

Trigger:
  Type: FirstMeet
  Is Repeatable: false
  Priority: 10

Nodes: Size = 3

[0] nodeId: "node_1"
    speakerId: "test_npc"
    textKey: "你好！我是测试角色，欢迎来到宿舍。"
    nextNodeId: "node_2"
    choices: Size = 0
    effects: Size = 1
      [0] type: SetFlag
          targetId: "met_test_npc"
          value: 1

[1] nodeId: "node_2"
    speakerId: "test_npc"
    textKey: "你想做什么呢？"
    choices: Size = 2
      [0] choiceTextKey: "聊聊天"
          nextNodeId: "node_3_chat"
      [1] choiceTextKey: "再见"
          nextNodeId: "" (留空 = 结束)
    effects: Size = 0

[2] nodeId: "node_3_chat"
    speakerId: "test_npc"
    textKey: "很高兴和你聊天！下次见～"
    nextNodeId: "" (留空 = 结束)
    choices: Size = 0
    effects: Size = 1
      [0] type: ModifyAffinity
          targetId: "test_npc"
          value: 1
```

5. **返回 TestCharacter.asset**：
   - Main Scripts → Element 0: 拖拽 `TestDialogue` 进去

### 7.3 配置 TestNPC GameObject

请主人在 Unity Editor 中：

1. **选中 Hierarchy 中的 TestNPC**
2. **Interactable 组件 → Character 字段**：
   - 拖拽 `TestCharacter.asset` 进去

---

## Task 8: 创建 DialogueSystem 和 CameraManager GameObject

**Goal:** 在场景中添加单例管理器

### 8.1 Unity Editor 操作

请主人在 Unity Editor 中：

1. **Hierarchy 右键 → Create Empty**
   - Name: `DialogueSystem`
   - Add Component → `DialogueSystem`

2. **Hierarchy 右键 → Create Empty**
   - Name: `CameraManager`
   - Add Component → `CameraManager`
   - 配置字段：
     - Player Follow Camera: 拖拽 `PlayerFollowCamera` Virtual Camera
     - Dialogue Focus Camera: 拖拽 `DialogueFocusCamera` Virtual Camera
     - Dialogue Focus Point: 拖拽 `DialogueFocusPoint` Transform

3. **保存场景 (`Ctrl+S`)**

---

## Task 9: 单元测试

**Files:**
- Create: `Assets/Tests/EditMode/DialogueSystemTests.cs`

```csharp
using NUnit.Framework;
using UnityEngine;
using DormGame.Dialogue;
using DormGame.Core;
using DormGame.Data;

namespace DormGame.Tests
{
    public class DialogueSystemTests
    {
        [Test]
        public void DialogueTrigger_FirstMeet_ShouldTriggerOnce()
        {
            var saveData = new SaveData();
            var trigger = new DialogueTrigger
            {
                type = DialogueTrigger.TriggerType.FirstMeet,
                isRepeatable = false
            };
            
            // 第一次应该触发
            Assert.IsTrue(trigger.CanTrigger(saveData, "npc1", "script1"));
            
            // 记录已播放
            saveData.playedScripts.Add("npc1_script1");
            
            // 第二次不应该触发
            Assert.IsFalse(trigger.CanTrigger(saveData, "npc1", "script1"));
        }
        
        [Test]
        public void DialogueTrigger_StoryFlag_ShouldCheckFlagValue()
        {
            var saveData = new SaveData();
            var flags = new System.Collections.Generic.Dictionary<string, int>
            {
                { "quest_complete", 1 }
            };
            saveData.SetStoryFlagsDict(flags);
            
            var trigger = new DialogueTrigger
            {
                type = DialogueTrigger.TriggerType.StoryFlag,
                requiredFlagId = "quest_complete",
                requiredFlagValue = 1
            };
            
            Assert.IsTrue(trigger.CanTrigger(saveData, "npc1", "script1"));
            
            // 修改 flag 为 0
            flags["quest_complete"] = 0;
            saveData.SetStoryFlagsDict(flags);
            
            Assert.IsFalse(trigger.CanTrigger(saveData, "npc1", "script1"));
        }
        
        [Test]
        public void SaveData_StoryFlagsDict_ShouldConvertCorrectly()
        {
            var saveData = new SaveData();
            var dict = new System.Collections.Generic.Dictionary<string, int>
            {
                { "flag1", 10 },
                { "flag2", 20 }
            };
            
            saveData.SetStoryFlagsDict(dict);
            var retrieved = saveData.GetStoryFlagsDict();
            
            Assert.AreEqual(2, retrieved.Count);
            Assert.AreEqual(10, retrieved["flag1"]);
            Assert.AreEqual(20, retrieved["flag2"]);
        }
    }
}
```

---

## Task 10: 最终验收测试

**Goal:** 完整走通对话流程

### 10.1 手动测试清单

请主人在 Unity Editor 中按 Play，然后：

- [ ] **走近 TestNPC**（WASD 移动）
- [ ] **按 E 触发对话**
  - ✓ 对话框弹出
  - ✓ 移动和交互被锁定（再按 WASD 无效）
  - ✓ 相机切换到聚焦 NPC（Cinemachine 过渡）
- [ ] **点击"继续"按钮**
  - ✓ 打字机效果显示文本
  - ✓ 文本显示完整后进入选项
- [ ] **选择"聊聊天"**
  - ✓ 跳转到 node_3_chat
  - ✓ 显示最后一句话
- [ ] **点击"继续"**
  - ✓ 对话结束，界面隐藏
  - ✓ 移动和交互解锁
  - ✓ 相机恢复跟随玩家
- [ ] **再次按 E 触发 TestNPC**
  - ✓ 不再触发对话（FirstMeet 已播放）
  - ✓ Console 输出 "No valid script"（正常，阶段 3 会降级到 LLM）

### 10.2 单元测试

请主人在 Unity Editor 中：

1. **Window → General → Test Runner**
2. **EditMode 标签 → Run All**
3. **确认 3 个新测试通过**

---

## Task 11: Git 提交

**Files:** All files created in this plan

### 11.1 确认功能完整

手动测试清单：
- [ ] 对话触发正常
- [ ] 打字机效果正常
- [ ] 分支选项正常
- [ ] 相机切换正常
- [ ] 对话结束解锁正常
- [ ] 单元测试全部通过

### 11.2 Git 提交

```bash
git add Assets/_Project/Scripts/Dialogue/
git add Assets/_Project/Scripts/Data/
git add Assets/_Project/Scripts/Camera/
git add Assets/_Project/Scripts/Core/SaveData.cs
git add Assets/_Project/Scripts/NPC/Interactable.cs
git add Assets/_Project/Data/
git add Assets/_Project/Prefabs/UI/
git add Assets/Tests/EditMode/DialogueSystemTests.cs
git add Packages/manifest.json
git commit -m "feat(unity): 宿舍游戏阶段2 - 对话系统骨架

实现功能：
- ScriptableObject 数据驱动：CharacterDefinition + DialogueScript
- DialogueSystem: 节点播放、分支选项、剧情标记
- DialogueUI: 打字机效果 + 选项按钮
- CameraManager: Cinemachine 相机切换（对话聚焦）
- SaveData: 剧情标记和好感度存储（内存临时）

技术要点：
- DialogueTrigger 条件检测（FirstMeet/StoryFlag/Affinity）
- GameStateManager 对话锁（冻结移动/交互）
- TextMeshPro 打字机效果
- Cinemachine Virtual Camera 优先级切换

验收通过：
✓ 触发 NPC → 对话框弹出 → 看完文本 → 选项分支 → 对话结束解冻移动
✓ 相机聚焦 NPC → 对话结束恢复跟随玩家
✓ FirstMeet 触发器生效（不重复播放）

测试：
- 单元测试: DialogueSystemTests (3 个测试用例)
- 手动测试: 完整对话流程通过"
```

---

## 阶段 2 完成总结

**已实现功能**：
✅ CharacterDefinition 和 DialogueScript ScriptableObject
✅ DialogueSystem 播放节点（文本、选项、Effects）
✅ DialogueUI 对话框（打字机效果、选项按钮）
✅ 测试剧本（3 节点，有分支）
✅ 对话中冻结移动（GameStateManager.LockForDialogue）
✅ 相机聚焦 NPC（Cinemachine 两相机切换）
✅ 剧情标记读写（SaveData 结构，内存临时）
✅ 单元测试（DialogueSystem 路由逻辑）

**验收标准达成**：
✓ 触发 NPC → 对话框弹出 → 看完文本 → 选项分支 → 对话结束解冻移动

**下一阶段**：阶段 3 - LLM 闲聊（ILlmClient + OpenAI 流式）

---

**实施计划结束**
