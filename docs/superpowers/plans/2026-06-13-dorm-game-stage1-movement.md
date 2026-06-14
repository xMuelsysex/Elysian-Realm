# 宿舍游戏 - 阶段 1：核心移动+交互 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现玩家双输入移动（WASD 直控 + 点击寻路）和 NPC 交互检测系统

**Architecture:** 
- PlayerController 使用 NavMeshAgent.velocity 驱动直控，避免快照回弹
- 点击路由优先级：UI → NPC → 地面，防止同时触发对话和寻路
- GameStateManager 能力锁管理移动/交互状态

**Tech Stack:** Unity 6000.4.10f1, Input System 1.11.2, AI Navigation 2.0.4, C# async/await

**验收标准**：WASD 走到 NPC 身边，按 E 触发交互（Debug.Log），点击 NPC 不触发寻路

---

## 文件结构规划

```
Assets/_Project/Scripts/
├── Core/
│   └── GameStateManager.cs          # 能力锁状态管理
├── Player/
│   ├── PlayerController.cs          # 双输入移动控制器
│   └── PlayerInput.inputactions     # Input System 配置
└── NPC/
    ├── Interactable.cs               # 可交互物体组件
    └── InteractionTrigger.cs         # 玩家交互检测器

Assets/_Project/Scenes/
└── TestMovement.unity                # 测试场景

Assets/Tests/EditMode/
└── PlayerControllerTests.cs          # 单元测试
```

---

## Task 1: 创建测试场景和基础目录

**Files:**
- Create: `Assets/_Project/Scenes/TestMovement.unity`
- Create: `Assets/_Project/Scripts/Core/` (目录)
- Create: `Assets/_Project/Scripts/Player/` (目录)
- Create: `Assets/_Project/Scripts/NPC/` (目录)

- [ ] **Step 1: 在 Unity 中创建测试场景**

在 Unity Editor 中：
1. File → New Scene → URP Template
2. Save As: `Assets/_Project/Scenes/TestMovement.unity`
3. 创建 3D Plane (地面): GameObject → 3D Object → Plane
   - Position: (0, 0, 0)
   - Scale: (2, 1, 2)  // 20x20 米地面
4. 创建测试 NPC (Capsule): GameObject → 3D Object → Capsule
   - Position: (5, 1, 5)
   - Name: "TestNPC"
5. 创建 Player (Capsule): GameObject → 3D Object → Capsule
   - Position: (0, 1, 0)
   - Name: "Player"
   - Add: NavMeshAgent component

- [ ] **Step 2: 烘焙 NavMesh**

在 Unity Editor 中：
1. 选中 Plane → Inspector → Add Component → NavMeshSurface
2. NavMeshSurface 设置：
   - Agent Type: Humanoid
   - Collect Objects: All
3. 点击 "Bake" 按钮
4. 确认地面出现蓝色 NavMesh 网格

- [ ] **Step 3: 创建脚本目录结构**

在 Unity Project 窗口：
1. Assets/_Project/Scripts/Core (右键 → Create → Folder)
2. Assets/_Project/Scripts/Player
3. Assets/_Project/Scripts/NPC
4. Assets/Tests/EditMode (Unity Test Framework 需要)

验证：场景中有地面、Player Capsule(带 NavMeshAgent)、TestNPC Capsule，NavMesh 已烘焙

---

## Task 2: GameStateManager 能力锁

**Files:**
- Create: `Assets/_Project/Scripts/Core/GameStateManager.cs`

- [ ] **Step 1: 编写 GameStateManager 脚本**

```csharp
using UnityEngine;

namespace DormGame.Core
{
    /// <summary>
    /// 能力锁状态管理器 - 使用计数器处理嵌套锁定
    /// </summary>
    public class GameStateManager : MonoBehaviour
    {
        public static GameStateManager Instance { get; private set; }
        
        private int movementLockCount = 0;
        private int interactionLockCount = 0;
        private int cameraLockCount = 0;
        private int uiModalCount = 0;
        
        public bool IsMovementLocked => movementLockCount > 0;
        public bool IsInteractionLocked => interactionLockCount > 0;
        public bool IsCameraLocked => cameraLockCount > 0;
        public bool IsUIModalActive => uiModalCount > 0;
        
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
        
        public void LockForDialogue()
        {
            movementLockCount++;
            interactionLockCount++;
            cameraLockCount++;
        }
        
        public void UnlockForDialogue()
        {
            movementLockCount = Mathf.Max(0, movementLockCount - 1);
            interactionLockCount = Mathf.Max(0, interactionLockCount - 1);
            cameraLockCount = Mathf.Max(0, cameraLockCount - 1);
        }
        
        public void LockForMenu()
        {
            uiModalCount++;
            movementLockCount++;
        }
        
        public void UnlockForMenu()
        {
            uiModalCount = Mathf.Max(0, uiModalCount - 1);
            movementLockCount = Mathf.Max(0, movementLockCount - 1);
        }
    }
}
```

- [ ] **Step 2: 在场景中添加 GameStateManager**

在 Unity Editor 中：
1. TestMovement 场景中创建空物体
2. Name: "GameStateManager"
3. Add Component → GameStateManager

- [ ] **Step 3: 手动测试能力锁**

在 Unity Editor Console 执行（通过临时测试脚本或直接在 Inspector 调用）：
```csharp
// 验证锁计数
GameStateManager.Instance.LockForDialogue();
Debug.Assert(GameStateManager.Instance.IsMovementLocked == true);
GameStateManager.Instance.LockForMenu(); // 嵌套锁
Debug.Assert(GameStateManager.Instance.movementLockCount == 2); // 私有字段用反射查看
GameStateManager.Instance.UnlockForMenu();
Debug.Assert(GameStateManager.Instance.IsMovementLocked == true); // 仍锁定
GameStateManager.Instance.UnlockForDialogue();
Debug.Assert(GameStateManager.Instance.IsMovementLocked == false); // 全解锁
```

验证：能力锁计数器正确处理嵌套锁定/解锁

---

## Task 3: Input System Actions 配置

**Files:**
- Create: `Assets/_Project/Scripts/Player/PlayerInput.inputactions`

- [ ] **Step 1: 创建 Input Actions 资产**

在 Unity Editor 中：
1. Project 窗口 → Assets/_Project/Scripts/Player
2. 右键 → Create → Input Actions
3. Name: "PlayerInput"
4. 双击打开 Input Actions 编辑器

- [ ] **Step 2: 配置 Move Action**

在 Input Actions 编辑器：
1. 创建 Action Map: "Player"
2. 添加 Action: "Move"
   - Action Type: Value
   - Control Type: Vector2
3. 添加 Binding: "WASD"
   - Composite: 2D Vector
   - Up: W, Down: S, Left: A, Right: D
4. 添加 Binding: "Arrow Keys"
   - Composite: 2D Vector
   - Up: UpArrow, Down: DownArrow, Left: LeftArrow, Right: RightArrow

- [ ] **Step 3: 配置 PointClick Action**

继续在 Input Actions 编辑器：
1. 添加 Action: "PointClick"
   - Action Type: Button
   - Control Type: Button
2. 添加 Binding: "Mouse Left Button"
   - Path: <Mouse>/leftButton

- [ ] **Step 4: 配置 Interact Action**

继续在 Input Actions 编辑器：
1. 添加 Action: "Interact"
   - Action Type: Button
2. 添加 Binding: "E"
   - Path: <Keyboard>/e

- [ ] **Step 5: 保存并生成 C# 类**

在 Input Actions 编辑器：
1. 点击 "Save Asset"
2. 勾选 "Generate C# Class"
3. Class Name: "PlayerInputActions"
4. 点击 "Apply"

验证：生成了 `PlayerInputActions.cs` 文件

---

## Task 4: PlayerController 双输入移动

**Files:**
- Create: `Assets/_Project/Scripts/Player/PlayerController.cs`

- [ ] **Step 1: 编写 PlayerController 骨架**

```csharp
using UnityEngine;
using UnityEngine.AI;
using DormGame.Core;

namespace DormGame.Player
{
    [RequireComponent(typeof(NavMeshAgent))]
    public class PlayerController : MonoBehaviour
    {
        private NavMeshAgent agent;
        private PlayerInputActions inputActions;
        private Camera mainCamera;
        
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private LayerMask groundLayer;
        [SerializeField] private LayerMask npcLayer;
        
        private enum MovementMode { None, DirectControl, Pathfinding }
        private MovementMode currentMode = MovementMode.None;
        
        void Awake()
        {
            agent = GetComponent<NavMeshAgent>();
            inputActions = new PlayerInputActions();
            mainCamera = Camera.main;
            
            // NavMeshAgent 配置（2.5D top-down）
            agent.updateRotation = false;
            agent.updateUpAxis = false;
        }
        
        void OnEnable()
        {
            inputActions.Enable();
            inputActions.Player.PointClick.performed += OnPointClick;
        }
        
        void OnDisable()
        {
            inputActions.Player.PointClick.performed -= OnPointClick;
            inputActions.Disable();
        }
        
        void Update()
        {
            if (GameStateManager.Instance.IsMovementLocked) return;
            
            ProcessMovementInput();
        }
        
        private void ProcessMovementInput()
        {
            // 占位，下一步实现
        }
        
        private void OnPointClick(UnityEngine.InputSystem.InputAction.CallbackContext context)
        {
            // 占位，下一步实现
        }
    }
}
```

- [ ] **Step 2: 实现 WASD 直控逻辑**

在 `ProcessMovementInput()` 中添加：

```csharp
private void ProcessMovementInput()
{
    Vector2 moveInput = inputActions.Player.Move.ReadValue<Vector2>();
    
    if (moveInput.sqrMagnitude > 0.01f)
    {
        // WASD 有输入 → 直控模式
        if (currentMode == MovementMode.Pathfinding)
        {
            // 打断寻路
            agent.ResetPath();
            agent.velocity = Vector3.zero;
        }
        
        currentMode = MovementMode.DirectControl;
        agent.isStopped = false;
        
        // 通过 agent.velocity 驱动移动（避免快照回弹）
        Vector3 moveDir = new Vector3(moveInput.x, 0, moveInput.y).normalized;
        agent.velocity = moveDir * moveSpeed;
    }
    else if (currentMode == MovementMode.DirectControl)
    {
        // WASD 松开 → 停止
        agent.velocity = Vector3.zero;
        currentMode = MovementMode.None;
    }
}
```

- [ ] **Step 3: 实现点击寻路逻辑**

在 `OnPointClick()` 中添加：

```csharp
private void OnPointClick(UnityEngine.InputSystem.InputAction.CallbackContext context)
{
    if (GameStateManager.Instance.IsMovementLocked) return;
    
    // 优先级 1: UI 层拦截
    if (UnityEngine.EventSystems.EventSystem.current.IsPointerOverGameObject())
        return;
    
    Ray ray = mainCamera.ScreenPointToRay(UnityEngine.Input.mousePosition);
    
    // 优先级 2: NPC/可交互物
    if (Physics.Raycast(ray, out RaycastHit npcHit, 100f, npcLayer))
    {
        // 触发交互，阻断寻路
        Debug.Log($"Clicked NPC: {npcHit.collider.name}");
        return;
    }
    
    // 优先级 3: 地面寻路
    if (Physics.Raycast(ray, out RaycastHit groundHit, 100f, groundLayer))
    {
        Vector3 targetPos = groundHit.point;
        
        // 验证可行走
        if (NavMesh.SamplePosition(targetPos, out NavMeshHit navHit, 1f, NavMesh.AllAreas))
        {
            if (agent.SetDestination(navHit.position))
            {
                currentMode = MovementMode.Pathfinding;
                agent.isStopped = false;
            }
        }
    }
}
```

- [ ] **Step 4: 在场景中配置 Player**

在 Unity Editor 中：
1. 选中 Player GameObject
2. Add Component → PlayerController
3. 设置参数：
   - Move Speed: 5
   - Ground Layer: 选择 "Default" 层
   - Npc Layer: 新建 Layer "NPC"，选中
4. 将 TestNPC 的 Layer 设为 "NPC"

- [ ] **Step 5: 测试双输入移动**

在 Unity Editor 中按 Play：
1. WASD 移动 → Player 应该移动
2. 点击地面 → Player 应该寻路过去
3. 寻路途中按 WASD → 应该打断寻路，切换直控

验证：双输入移动工作正常，无快照回弹

---

## Task 5: Interactable 组件

**Files:**
- Create: `Assets/_Project/Scripts/NPC/Interactable.cs`

- [ ] **Step 1: 编写 Interactable 组件**

```csharp
using UnityEngine;

namespace DormGame.NPC
{
    /// <summary>
    /// 可交互物体组件 - 标识该物体可被玩家交互
    /// </summary>
    public class Interactable : MonoBehaviour
    {
        [SerializeField] private string interactableId;
        [SerializeField] private float interactionRadius = 2f;
        
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
            Debug.Log($"Interacted with: {interactableId}");
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

- [ ] **Step 2: 给 TestNPC 添加 Interactable**

在 Unity Editor 中：
1. 选中 TestNPC GameObject
2. Add Component → Interactable
3. 参数自动填充：
   - Interactable Id: TestNPC_xxxxx
   - Interaction Radius: 2

- [ ] **Step 3: 给 TestNPC 添加 Trigger Collider**

继续在 TestNPC Inspector：
1. Add Component → Sphere Collider
2. 设置：
   - Is Trigger: ✓（勾选）
   - Radius: 2（与 Interaction Radius 一致）

验证：选中 TestNPC 时，Scene 视图显示黄色交互范围 Gizmo

---

## Task 6: InteractionTrigger 检测器

**Files:**
- Create: `Assets/_Project/Scripts/NPC/InteractionTrigger.cs`
- Modify: `Assets/_Project/Scripts/Player/PlayerController.cs`

- [ ] **Step 1: 编写 InteractionTrigger 脚本**

```csharp
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using DormGame.Core;

namespace DormGame.NPC
{
    /// <summary>
    /// 玩家交互检测器 - Trigger 辅助 + 每帧距离查询
    /// </summary>
    public class InteractionTrigger : MonoBehaviour
    {
        private List<Interactable> nearbyInteractables = new();
        private PlayerInputActions inputActions;
        
        [SerializeField] private float maxInteractDistance = 3f;
        
        void Awake()
        {
            inputActions = new PlayerInputActions();
        }
        
        void OnEnable()
        {
            inputActions.Enable();
            inputActions.Player.Interact.performed += OnInteract;
        }
        
        void OnDisable()
        {
            inputActions.Player.Interact.performed -= OnInteract;
            inputActions.Disable();
        }
        
        void OnTriggerEnter(Collider other)
        {
            if (other.TryGetComponent<Interactable>(out var interactable))
            {
                if (!nearbyInteractables.Contains(interactable))
                {
                    nearbyInteractables.Add(interactable);
                }
            }
        }
        
        void OnTriggerExit(Collider other)
        {
            if (other.TryGetComponent<Interactable>(out var interactable))
            {
                nearbyInteractables.Remove(interactable);
            }
        }
        
        private void OnInteract(UnityEngine.InputSystem.InputAction.CallbackContext context)
        {
            if (GameStateManager.Instance.IsInteractionLocked) return;
            
            // 找最近的可交互物
            var closest = nearbyInteractables
                .OrderBy(i => Vector3.Distance(transform.position, i.transform.position))
                .FirstOrDefault();
            
            if (closest != null)
            {
                float distance = Vector3.Distance(transform.position, closest.transform.position);
                if (distance <= maxInteractDistance)
                {
                    closest.OnInteract();
                }
            }
        }
    }
}
```

- [ ] **Step 2: 给 Player 添加 InteractionTrigger**

在 Unity Editor 中：
1. 选中 Player GameObject
2. Add Component → InteractionTrigger
3. 设置参数：
   - Max Interact Distance: 3

- [ ] **Step 3: 给 Player 添加 Trigger Collider**

继续在 Player Inspector：
1. Add Component → Sphere Collider
2. 设置：
   - Is Trigger: ✓（勾选）
   - Radius: 3（检测范围）

- [ ] **Step 4: 测试交互检测**

在 Unity Editor 按 Play：
1. WASD 走近 TestNPC
2. 按 E 键
3. Console 应显示："Interacted with: TestNPC_xxxxx"
4. 走远后按 E → 无反应

验证：交互检测工作正常，按 E 触发 Debug.Log

---

## Task 7: 单元测试

**Files:**
- Create: `Assets/Tests/EditMode/PlayerControllerTests.cs`

- [ ] **Step 1: 创建测试文件**

```csharp
using NUnit.Framework;
using UnityEngine;
using DormGame.Core;

namespace DormGame.Tests
{
    public class GameStateManagerTests
    {
        private GameStateManager manager;
        
        [SetUp]
        public void Setup()
        {
            var go = new GameObject("TestManager");
            manager = go.AddComponent<GameStateManager>();
        }
        
        [TearDown]
        public void Teardown()
        {
            Object.DestroyImmediate(manager.gameObject);
        }
        
        [Test]
        public void LockForDialogue_LocksMovementInteractionCamera()
        {
            manager.LockForDialogue();
            
            Assert.IsTrue(manager.IsMovementLocked);
            Assert.IsTrue(manager.IsInteractionLocked);
            Assert.IsTrue(manager.IsCameraLocked);
        }
        
        [Test]
        public void NestedLocks_CountCorrectly()
        {
            manager.LockForDialogue();
            manager.LockForMenu();
            
            // 移动锁计数应为 2
            Assert.IsTrue(manager.IsMovementLocked);
            
            manager.UnlockForMenu();
            
            // 移动锁计数应为 1，仍锁定
            Assert.IsTrue(manager.IsMovementLocked);
            
            manager.UnlockForDialogue();
            
            // 移动锁计数应为 0，全解锁
            Assert.IsFalse(manager.IsMovementLocked);
            Assert.IsFalse(manager.IsInteractionLocked);
        }
        
        [Test]
        public void UnlockBelowZero_ClampsToZero()
        {
            manager.UnlockForDialogue(); // 无锁时解锁
            
            Assert.IsFalse(manager.IsMovementLocked);
        }
    }
}
```

- [ ] **Step 2: 在 Unity Test Runner 中运行测试**

在 Unity Editor 中：
1. Window → General → Test Runner
2. 选择 EditMode 标签
3. 点击 "Run All"
4. 所有测试应显示绿色 ✓

验证：3 个单元测试全部通过

---

## Task 8: 提交阶段 1 代码

**Files:**
- All files created in this plan

- [ ] **Step 1: 确认功能完整**

手动测试清单：
- [ ] WASD 移动流畅
- [ ] 点击地面寻路
- [ ] 点击 NPC 不触发寻路（只打印日志）
- [ ] 寻路途中按 WASD 打断寻路
- [ ] 按 E 靠近 NPC 触发交互
- [ ] 单元测试全部通过

- [ ] **Step 2: Git 提交**

```bash
git add Assets/_Project/Scripts/Core/GameStateManager.cs
git add Assets/_Project/Scripts/Player/PlayerController.cs
git add Assets/_Project/Scripts/Player/PlayerInput.inputactions
git add Assets/_Project/Scripts/Player/PlayerInputActions.cs
git add Assets/_Project/Scripts/NPC/Interactable.cs
git add Assets/_Project/Scripts/NPC/InteractionTrigger.cs
git add Assets/_Project/Scenes/TestMovement.unity
git add Assets/Tests/EditMode/PlayerControllerTests.cs
git commit -m "feat(stage1): 实现玩家双输入移动和NPC交互检测

- PlayerController 支持 WASD 直控 + 点击寻路
- 点击路由优先级：UI → NPC → 地面
- GameStateManager 能力锁（嵌套锁定支持）
- InteractionTrigger 近距离交互检测
- 单元测试覆盖能力锁逻辑

验收：WASD 走到 NPC 按 E 触发交互，点击 NPC 不触发寻路"
```

验证：代码已提交到 git

---

## 阶段 1 完成总结

**已实现功能**：
✅ 玩家 WASD 直控移动（通过 NavMeshAgent.velocity）
✅ 玩家点击寻路（NavMesh.SamplePosition 验证）
✅ 双输入仲裁（WASD 打断寻路）
✅ 点击路由优先级（UI → NPC → 地面）
✅ NPC 交互检测（Trigger + 距离查询）
✅ GameStateManager 能力锁（支持嵌套锁定）
✅ 单元测试（能力锁逻辑）

**验收标准达成**：
✓ WASD 走到 NPC 身边，按 E 触发交互（Debug.Log 输出）
✓ 点击 NPC 不触发寻路（优先级正确）

**下一阶段**：阶段 2 - 对话系统骨架（DialogueSystem + ScriptableObject 剧本）

---

**实施计划结束**
